import assert from "node:assert/strict";
import { test } from "node:test";
import { CRM_GROEI, algemenePlek, optinNaam } from "@/lib/kpi2027crm/definities";
import { berekenStand, crmOverzicht, metHuidigeStand, telCrm } from "@/lib/kpi2027crm/rekenen";
import { bouwTabel } from "@/lib/selligent/tabel";

const META = { pad: "test.csv", bytes: 0, gewijzigdOp: null, etag: null };

/** Vier rijen, drie e-mailadressen: a@x heeft twee auto's, één rij zonder adres. */
function proeftabel() {
  return bouwTabel(
    [
      '"ID";"MAIL";"PREFERENCES_VW";"PREFERENCES_AUDI";"PREFERENCES_SEAT";"VDUVEHICLES_BRAND"',
      '"1";"a@x.nl";"True";"False";"";"Volkswagen"',
      '"1";"a@x.nl";"False";"true ";"";"Audi"',
      '"2";"b@x.nl";"False";"False";"False";"Seat"',
      '"3";"c@x.nl";"True";"";"";"Volkswagen"',
      '"4";"";"True";"True";"True";""',
    ].join("\n") + "\n",
    META,
  );
}

test("contacten = unieke e-mailadressen; een rij zonder adres telt niet", () => {
  const t = telCrm(proeftabel());
  assert.equal(t.mailKolom, "MAIL");
  assert.equal(t.tellingen[0].naam, "Contacten");
  assert.equal(t.tellingen[0].aantal, 3);
  assert.equal(t.rijenZonderMail, 1);
});

test("een opt-in telt unieke e-mailadressen met ergens True, ongeacht schrijfwijze", () => {
  const t = telCrm(proeftabel());
  const per = Object.fromEntries(t.tellingen.map((r) => [r.naam, r.aantal]));
  // a@x telt één keer bij VW ondanks een False-rij; de rij zonder adres telt nergens.
  assert.equal(per["Opt-in Volkswagen"], 2);
  // "true " (kleine letter, spatie) telt mee.
  assert.equal(per["Opt-in Audi"], 1);
  assert.equal(per["Opt-in SEAT"], 0);
  // a@x en c@x hebben ergens True; b@x nergens; de rij zonder adres telt niet.
  assert.equal(per["Contacten met opt-in"], 2);
  // Alleen booleaanse kolommen zijn een opt-in (plus Contacten en Contacten met opt-in).
  assert.equal(t.tellingen.length, 5);
});

test("namen: bekende merken voluit, onbekende kolommen op hun eigen naam", () => {
  assert.equal(optinNaam("PREFERENCES_VW"), "Opt-in Volkswagen");
  assert.equal(optinNaam("PREFERENCES_AUDI"), "Opt-in Audi");
  assert.equal(optinNaam("PREFERENCES_NIEUWSBRIEF_ALGEMEEN"), "Opt-in Nieuwsbrief algemeen");
});

test("zonder MAIL-kolom geen KPI's in plaats van nullen", () => {
  const t = telCrm(bouwTabel('"ID";"PREFERENCES_VW"\n"1";"True"\n', META));
  assert.equal(t.mailKolom, null);
  assert.deepEqual(t.tellingen, []);
});

test("één meting: vóór de meting aangenomen, daarna doorgetrokken, target +10%", () => {
  const u = berekenStand({ "2026-11-20": 1000 })!;
  assert.equal(u.verwacht, 1000);
  assert.equal(u.target, 1000 * (1 + CRM_GROEI));
  assert.equal(u.targetPerMaand, u.target);
  assert.deepEqual(
    u.maanden.map((m) => m.soort),
    [...Array(10).fill("bijgeschat"), "gerealiseerd", "verwachting"],
  );
  // Een rechte lijn: elke maand dezelfde stand.
  assert.ok(u.maanden.every((m) => m.verwacht === 1000));
  assert.equal(u.maanden[10].gerealiseerd, 1000);
  assert.equal(u.definitief, false);
  assert.equal(u.eersteDatum, "2026-11-20");
});

test("met historie: per maand de laatste stand, eind 2026 = de laatste meting van 2026", () => {
  const u = berekenStand({
    "2026-11-20": 1000,
    "2026-11-30": 1010,
    "2026-12-15": 1030,
    "2026-12-31": 1050,
    // Metingen uit 2027 tellen niet mee in de basis van 2026.
    "2027-02-01": 1100,
  })!;
  assert.equal(u.verwacht, 1050);
  assert.equal(u.standDatum, "2026-12-31");
  assert.equal(u.metingen, 4);
  assert.equal(u.maanden[10].gerealiseerd, 1010);
  assert.equal(u.maanden[11].gerealiseerd, 1050);
  assert.equal(u.maanden[11].soort, "gerealiseerd");
  // Vóór de eerste meting: de eerste stand, aangenomen.
  assert.equal(u.maanden[0].verwacht, 1000);
  assert.equal(u.maanden[0].soort, "bijgeschat");
  assert.equal(u.target, 1050 * (1 + CRM_GROEI));
  assert.equal(u.definitief, true);
});

test("een maand zonder meting tussen twee metingen krijgt de vorige stand, gestippeld", () => {
  const u = berekenStand({ "2026-09-10": 500, "2026-11-05": 600 })!;
  assert.equal(u.maanden[9].soort, "bijgeschat");
  assert.equal(u.maanden[9].verwacht, 500);
  assert.equal(u.maanden[11].soort, "verwachting");
  assert.equal(u.maanden[11].verwacht, 600);
});

test("het jaar is voorbij: definitief, ook als de laatste meting vóór 31 december ligt", () => {
  const reeks = { "2026-12-29": 900 };
  assert.equal(berekenStand(reeks, { vandaag: "2026-12-30" })!.definitief, false);
  assert.equal(berekenStand(reeks, { vandaag: "2027-01-02" })!.definitief, true);
});

test("in februari 2027: basis uit de bewaarde stand van 2026, realisatie uit de export van nu", () => {
  // De export van nu is van 2027; de stand van 2026 komt uit de bewaarde dagstanden.
  const historie = { contacten: { "2026-12-31": 2 }, "optin:PREFERENCES_VW": { "2026-12-31": 1 } };
  const groepen = crmOverzicht(telCrm(proeftabel()), "2027-02-01", { historie, vandaag: "2027-02-01" });
  const per = Object.fromEntries(groepen.flatMap((g) => g.kpis).map((k) => [k.naam, k]));
  assert.equal(per["Contacten"].uitkomst!.verwacht, 2);
  assert.equal(per["Contacten"].uitkomst!.definitief, true);
  assert.deepEqual(per["Contacten"].realisatie, { waarde: 3, peildatum: "2027-02-01" });
  assert.equal(per["Opt-in Volkswagen"].uitkomst!.verwacht, 1);
  // Een KPI zonder bewaarde stand in 2026 heeft geen basis, wel een realisatie.
  assert.equal(per["Opt-in Audi"].uitkomst, null);
  assert.deepEqual(per["Opt-in Audi"].realisatie, { waarde: 1, peildatum: "2027-02-01" });
});

test("zonder historie en met een export uit 2027: geen basis, wel realisatie", () => {
  assert.equal(berekenStand({ "2027-02-01": 1000 }), null);
  const groepen = crmOverzicht(telCrm(proeftabel()), "2027-02-01");
  assert.equal(groepen[0].kpis[0].uitkomst, null);
  assert.deepEqual(groepen[0].kpis[0].realisatie, { waarde: 3, peildatum: "2027-02-01" });
});

test("de export van nu gaat voor op een eerder bewaarde stand van dezelfde dag", () => {
  const reeksen = metHuidigeStand({ contacten: { "2026-11-19": 5, "2026-11-20": 99 } }, telCrm(proeftabel()), "2026-11-20");
  assert.deepEqual(reeksen.contacten, { "2026-11-19": 5, "2026-11-20": 3 });
});

test("het overzicht: Contacten en Opt-ins als groepen, realisatie 0 vóór 2027", () => {
  const groepen = crmOverzicht(telCrm(proeftabel()), "2026-11-20");
  assert.deepEqual(groepen.map((g) => g.naam), ["Contacten, auto's en algemene opt-ins", "Opt-ins per merk"]);
  assert.equal(groepen[1].kpis.length, 3);
  assert.deepEqual(groepen[1].kpis[0].realisatie, { waarde: 0, peildatum: null });
  assert.ok(groepen.every((g) => g.kpis.every((k) => k.keuzes.length >= 3)));
});

test("volgorde bovenaan: Contacten, Contacten met opt-in, dan VDU, dan Service; daaronder de merken", () => {
  const tabel = bouwTabel(
    [
      '"MAIL";"PREFERENCES_AUDI";"PREFERENCES_SERVICE";"PREFERENCES_VW";"PREFERENCES_VDU"',
      '"a@x.nl";"True";"True";"False";"True"',
      '"b@x.nl";"False";"False";"True";"True"',
    ].join("\n") + "\n",
    META,
  );
  const telling = telCrm(tabel);
  assert.deepEqual(telling.ontbrekend, []);
  const [algemeen, merken] = crmOverzicht(telling, "2026-11-20");
  assert.deepEqual(algemeen.kpis.map((k) => k.naam), [
    "Contacten",
    "Contacten met opt-in",
    "Opt-in VDU",
    "Opt-in Service",
  ]);
  assert.deepEqual(algemeen.kpis.map((k) => k.uitkomst!.verwacht), [2, 2, 2, 1]);
  assert.deepEqual(merken.kpis.map((k) => k.naam), ["Opt-in Audi", "Opt-in Volkswagen"]);
});

test("VDU en Service worden herkend met en zonder voorvoegsel, en een ontbrekende wordt gemeld", () => {
  assert.equal(algemenePlek("PREFERENCES_VDU"), 0);
  assert.equal(algemenePlek("service"), 1);
  assert.equal(algemenePlek("PREFERENCES_SERVICES"), 1);
  assert.equal(algemenePlek("PREFERENCES_VW"), null);
  assert.deepEqual(telCrm(proeftabel()).ontbrekend, ["VDU", "Service"]);
});

test("Contacten met opt-in telt elk adres één keer, ook met meerdere opt-ins", () => {
  const tabel = bouwTabel(
    [
      '"MAIL";"PREFERENCES_VW";"PREFERENCES_AUDI"',
      '"a@x.nl";"True";"True"',
      '"a@x.nl";"False";"True"',
      '"b@x.nl";"False";"False"',
      '"c@x.nl";"";"true"',
    ].join("\n") + "\n",
    META,
  );
  const per = Object.fromEntries(telCrm(tabel).tellingen.map((r) => [r.naam, r.aantal]));
  assert.equal(per["Contacten"], 3);
  assert.equal(per["Opt-in Volkswagen"] + per["Opt-in Audi"], 3);
  assert.equal(per["Contacten met opt-in"], 2);
});

test("auto's: unieke kentekens, en met opt-in = de kentekens van een contact met opt-in", () => {
  const tabel = bouwTabel(
    [
      '"MAIL";"PREFERENCES_VDU";"PREFERENCES_SERVICE";"PREFERENCES_VW";"VDUVEHICLES_LICENSE_PLATE"',
      // a@x heeft een opt-in (op één rij) en twee auto's: allebei met opt-in.
      '"a@x.nl";"True";"";"";"AA-11-AA"',
      '"a@x.nl";"False";"";"";"BB-22-BB"',
      // b@x heeft geen opt-in; zijn auto staat ook bij c@x, die wél een opt-in heeft.
      '"b@x.nl";"False";"False";"False";"CC-33-CC"',
      '"c@x.nl";"";"";"true";"CC-33-CC"',
      // d@x zonder opt-in, met een eigen auto.
      '"d@x.nl";"";"";"";"DD-44-DD"',
      // Een rij zonder e-mailadres maar met True: telt wel als auto, niet als auto met opt-in.
      '"";"True";"";"";"EE-55-EE"',
      // Een contact zonder auto.
      '"e@x.nl";"True";"";"";""',
    ].join("\n") + "\n",
    META,
  );
  const telling = telCrm(tabel);
  assert.equal(telling.kentekenKolom, "VDUVEHICLES_LICENSE_PLATE");
  const per = Object.fromEntries(telling.tellingen.map((r) => [r.naam, r.aantal]));
  assert.equal(per["Aantal auto's"], 5);
  assert.equal(per["Auto's met opt-in"], 3);
  const [algemeen] = crmOverzicht(telling, "2026-11-20");
  assert.deepEqual(algemeen.kpis.map((k) => k.naam), [
    "Contacten",
    "Contacten met opt-in",
    "Aantal auto's",
    "Auto's met opt-in",
    "Opt-in VDU",
    "Opt-in Service",
  ]);
});

test("zonder kentekenkolom geen auto-KPI's, en dat wordt gemeld", () => {
  const telling = telCrm(proeftabel());
  assert.equal(telling.kentekenKolom, null);
  assert.ok(!telling.tellingen.some((t) => t.soort === "autos" || t.soort === "autos-optin"));
});

test("de definitie onder elke grafiek noemt de juiste kolommen en de algemene opt-ins", () => {
  const tabel = bouwTabel(
    [
      '"MAIL";"PREFERENCES_VDU";"PREFERENCES_SERVICE";"PREFERENCES_VW";"VDUVEHICLES_LICENSE_PLATE"',
      '"a@x.nl";"True";"False";"False";"AA-11-AA"',
    ].join("\n") + "\n",
    META,
  );
  const regels = crmOverzicht(telCrm(tabel), "2026-11-20").flatMap((g) => g.kpis);
  const per = Object.fromEntries(regels.map((r) => [r.naam, r]));
  // Elke KPI: minstens drie keuzes, waarvan het target en de realisatie.
  for (const r of regels) {
    assert.ok(r.keuzes.length >= 3, r.naam);
    assert.ok(r.keuzes.some((k) => k.startsWith("Target: +10%")), r.naam);
    assert.ok(r.keuzes.some((k) => k.includes("Realisatie 2027")), r.naam);
  }
  // De kolomnamen staan in de keuzes, zodat de definitie klopt met wat er geteld wordt.
  assert.ok(per["Contacten"].keuzes[0].includes("MAIL"));
  assert.ok(per["Aantal auto's"].keuzes[0].includes("VDUVEHICLES_LICENSE_PLATE"));
  assert.ok(per["Opt-in Volkswagen"].keuzes[0].includes("PREFERENCES_VW"));
  // VDU en Service worden als algemene opt-in uitgelegd, de merken niet.
  assert.equal(per["Opt-in VDU"].algemeen, "VDU");
  assert.equal(per["Opt-in Service"].algemeen, "Service");
  assert.equal(per["Opt-in Volkswagen"].algemeen, null);
  assert.ok(per["Opt-in Service"].keuzes[1].includes("algemene opt-in"));
  // "Met opt-in" weet welke opt-inkolommen meetellen.
  assert.deepEqual(per["Contacten met opt-in"].optinKolommen, ["PREFERENCES_VDU", "PREFERENCES_SERVICE", "PREFERENCES_VW"]);
});
