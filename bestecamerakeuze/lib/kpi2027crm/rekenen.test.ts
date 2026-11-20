import assert from "node:assert/strict";
import { test } from "node:test";
import { CRM_GROEI, algemenePlek, optinNaam } from "@/lib/kpi2027crm/definities";
import { berekenStand, crmOverzicht, telCrm } from "@/lib/kpi2027crm/rekenen";
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

test("de stand: vóór de meting aangenomen, daarna doorgetrokken, target +10%", () => {
  const u = berekenStand(1000, "2026-11-20")!;
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
});

test("een meting buiten 2026 levert geen basis op, wel realisatie in 2027", () => {
  assert.equal(berekenStand(1000, "2027-02-01"), null);
  const groepen = crmOverzicht(telCrm(proeftabel()), "2027-02-01");
  assert.equal(groepen[0].kpis[0].uitkomst, null);
  assert.deepEqual(groepen[0].kpis[0].realisatie, { waarde: 3, peildatum: "2027-02-01" });
});

test("het overzicht: Contacten en Opt-ins als groepen, realisatie 0 vóór 2027", () => {
  const groepen = crmOverzicht(telCrm(proeftabel()), "2026-11-20");
  assert.deepEqual(groepen.map((g) => g.naam), ["Contacten en algemene opt-ins", "Opt-ins per merk"]);
  assert.equal(groepen[1].kpis.length, 3);
  assert.deepEqual(groepen[1].kpis[0].realisatie, { waarde: 0, peildatum: null });
  assert.ok(groepen.every((g) => g.kpis.every((k) => k.keuzes.length >= 2)));
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
