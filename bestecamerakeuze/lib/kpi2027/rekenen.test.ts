import assert from "node:assert/strict";
import { test } from "node:test";
import { KPI_WEBSITES, eventBron, gewoneEvents, padEvents, vindWebsite } from "@/lib/kpi2027/definities";
import {
  berekenKpi,
  dagenTussen,
  datumInNederland,
  dagwaardenVoor,
  isGemeten,
  laatsteZaterdag,
  maandInvoerUitDagen,
  maandInvoerUitMaanden,
  maandInvoerVoor,
  peildatumVoor,
  realisatieVoor,
  uitvalTekst,
  uitvalUitStand,
  volgendeUpdate,
  websiteOverzicht,
  type KpiStand,
  type MaandInvoer,
} from "@/lib/kpi2027/rekenen";

function bijna(werkelijk: number, verwacht: number, marge = 1e-9) {
  assert.ok(Math.abs(werkelijk - verwacht) < marge, `${werkelijk} ≠ ${verwacht}`);
}

/** Elke dag van `van` t/m `tot` dezelfde waarde. */
function elkeDag(van: string, tot: string, waarde: number): Record<string, number> {
  const uit: Record<string, number> = {};
  for (let t = Date.parse(`${van}T00:00:00Z`); t <= Date.parse(`${tot}T00:00:00Z`); t += 86_400_000) {
    uit[new Date(t).toISOString().slice(0, 10)] = waarde;
  }
  return uit;
}

test("dagenTussen telt beide grenzen mee", () => {
  assert.equal(dagenTussen("2026-01-01", "2026-01-01"), 1);
  assert.equal(dagenTussen("2026-01-01", "2026-12-31"), 365);
  assert.equal(dagenTussen("2026-02-01", "2026-01-31"), 0);
});

test("de peildatum is de laatste zaterdag vóór vandaag", () => {
  assert.equal(peildatumVoor(new Date("2026-11-18T12:00:00Z")), "2026-11-14"); // woensdag
  assert.equal(peildatumVoor(new Date("2026-11-15T09:00:00Z")), "2026-11-14"); // zondag
  assert.equal(peildatumVoor(new Date("2026-11-21T20:00:00Z")), "2026-11-14"); // zaterdag zelf
  assert.equal(peildatumVoor(new Date("2026-11-16T08:00:00Z")), "2026-11-14"); // maandag
});

test("de peildatum volgt de Nederlandse kalender, niet UTC", () => {
  const nu = new Date("2026-11-21T23:30:00Z"); // zondag 00:30 in Nederland
  assert.equal(datumInNederland(nu), "2026-11-22");
  assert.equal(peildatumVoor(nu), "2026-11-21");
});

test("na de jaarwisseling blijft de peildatum van 2026 op 31 december staan", () => {
  assert.equal(laatsteZaterdag(new Date("2027-01-03T10:00:00Z")), "2027-01-02");
  assert.equal(peildatumVoor(new Date("2027-01-03T10:00:00Z")), "2026-12-31");
  assert.equal(peildatumVoor(new Date("2027-01-03T10:00:00Z"), 2027), "2027-01-02");
  assert.equal(peildatumVoor(new Date("2026-12-27T10:00:00Z")), "2026-12-26");
  assert.equal(peildatumVoor(new Date("2026-01-02T10:00:00Z")), null);
});

test("gemeten is alles buiten de uitval", () => {
  const uitval = [{ van: "2026-06-25", tot: "2026-08-11" }];
  assert.equal(isGemeten("2026-06-24", uitval), true);
  assert.equal(isGemeten("2026-06-25", uitval), false);
  assert.equal(isGemeten("2026-08-11", uitval), false);
  assert.equal(isGemeten("2026-08-12", uitval), true);
});

test("de uitval zijn precies de dagen met 0 sessies, samengevoegd tot periodes", () => {
  const sessies = { ...elkeDag("2026-01-01", "2026-06-24", 400), ...elkeDag("2026-08-12", "2026-11-14", 400) };
  sessies["2026-03-03"] = 0; // één losse dag zonder sessies
  const uitval = uitvalUitStand({ jaar: 2026, peildatum: "2026-11-14", dagen: { sessies } });
  assert.deepEqual(uitval, [
    { van: "2026-03-03", tot: "2026-03-03" },
    { van: "2026-06-25", tot: "2026-08-11" },
  ]);
  assert.equal(
    uitvalTekst(uitval),
    "Op 3 maart en van 25 juni t/m 11 augustus 2026 had deze property 0 sessies: daar werkte de tracking niet. Die dagen zijn bij elke KPI met het gemiddelde per gemeten dag bijgeschat; alle andere dagen tellen zoals gemeten.",
  );
  // Dagen na de peildatum zijn geen uitval maar toekomst.
  assert.deepEqual(uitvalUitStand({ jaar: 2026, peildatum: "2026-01-03", dagen: { sessies: elkeDag("2026-01-01", "2026-01-03", 5) } }), []);
  assert.equal(uitvalTekst([]), null);
});

test("verwachting = gemeten + gemiddelde per dag × overige dagen; target = +5%", () => {
  const maanden = maandInvoerUitDagen(elkeDag("2026-01-01", "2026-11-14", 10), "2026-11-14", []);
  const u = berekenKpi(maanden, "2026-11-14");
  assert.equal(u.dagenGemeten, 318);
  assert.equal(u.dagenNietGemeten, 0);
  assert.equal(u.gerealiseerd, 3180);
  bijna(u.perDag, 10);
  assert.equal(u.dagenBijgeschat, 47);
  bijna(u.verwacht, 3650);
  bijna(u.target, 3650 * 1.05);
  bijna(u.targetPerMaand, (3650 * 1.05) / 12);
  assert.equal(u.definitief, false);
  assert.equal(u.maanden[9].soort, "gerealiseerd");
  assert.equal(u.maanden[10].soort, "deels");
  bijna(u.maanden[10].verwacht, 300);
  assert.equal(u.maanden[11].soort, "verwachting");
  assert.equal(u.maanden[11].gerealiseerd, null);
  bijna(
    u.maanden.reduce((t, m) => t + m.verwacht, 0),
    u.verwacht,
    1e-6,
  );
});

test("uitval wordt bijgeschat en niet als nul geteld", () => {
  // Elke dag 10, behalve een gat zonder data van 25 juni t/m 11 augustus.
  const dagen = { ...elkeDag("2026-01-01", "2026-06-24", 10), ...elkeDag("2026-08-12", "2026-11-14", 10) };
  const uitval = [{ van: "2026-06-25", tot: "2026-08-11" }];
  const u = berekenKpi(maandInvoerUitDagen(dagen, "2026-11-14", uitval), "2026-11-14");
  assert.equal(u.dagenNietGemeten, 48);
  bijna(u.perDag, 10);
  bijna(u.verwacht, 3650); // zonder bijschatting zou het 3170 zijn
  assert.equal(u.maanden[5].soort, "bijgeschat"); // juni: 24 van 30 dagen gemeten
  assert.equal(u.maanden[5].dagenGemeten, 24);
  assert.equal(u.maanden[6].soort, "bijgeschat"); // juli: niets gemeten
  assert.equal(u.maanden[6].gerealiseerd, null);
  bijna(u.maanden[6].verwacht, 310);
});

test("een dag met sessies maar zonder event telt als nul, niet als schatting", () => {
  // Het event bestaat pas vanaf 21 oktober; de website mat het hele jaar.
  const s: KpiStand = {
    website: "bentley", jaar: 2026, peildatum: "2026-11-14", berekendOp: "", definitief: false,
    dagen: { sessies: elkeDag("2026-01-01", "2026-11-14", 250), "event:generate_lead_contact": { "2026-10-21": 1 } },
    gebruikers: new Array(12).fill(0),
  };
  const contact = vindWebsite("bentley")!.kpis.find((k) => k.sleutel === "contactaanvragen")!;
  const u = berekenKpi(maandInvoerVoor(contact, s), s.peildatum);
  assert.equal(u.dagenGemeten, 318);
  assert.equal(u.dagenNietGemeten, 0);
  assert.equal(u.maanden[0].soort, "gerealiseerd");
  assert.equal(u.maanden[0].gerealiseerd, 0);
  bijna(u.verwacht, 365 / 318);
});

test("gebruikers per maand: een maand zonder gemeten dag telt niet, een halve maand wel half", () => {
  const maandcijfers = [100, 100, 100, 100, 100, 80, 0, 60, 100, 100, 50, 0];
  const uitval = [{ van: "2026-06-25", tot: "2026-08-11" }];
  const maanden = maandInvoerUitMaanden(maandcijfers, "2026-11-14", uitval);
  assert.deepEqual(maanden[6], { waarde: 0, dagenGemeten: 0 } satisfies MaandInvoer);
  assert.equal(maanden[5].dagenGemeten, 24);
  assert.equal(maanden[7].dagenGemeten, 20);
  assert.equal(maanden[10].dagenGemeten, 14);
});

test("op 31 december is alles voorbij en is de stand definitief", () => {
  const u = berekenKpi(maandInvoerUitDagen(elkeDag("2026-01-01", "2026-12-31", 2), "2026-12-31", []), "2026-12-31");
  assert.equal(u.dagenBijgeschat, 0);
  assert.equal(u.verwacht, 730);
  assert.equal(u.definitief, true);
  assert.ok(u.maanden.every((m) => m.soort === "gerealiseerd"));
});

test("zonder gemeten dagen is het gemiddelde nul in plaats van NaN", () => {
  const u = berekenKpi(maandInvoerUitDagen({}, "2026-03-14", [{ van: "2026-01-01", tot: "2026-03-14" }]), "2026-03-14");
  assert.equal(u.perDag, 0);
  assert.equal(u.target, 0);
});

test("de volgende update is acht dagen na de laatste peildatum, tot eind 2027", () => {
  assert.equal(volgendeUpdate("2026-11-14"), "2026-11-22");
  assert.equal(volgendeUpdate("2026-12-26"), "2027-01-03");
  assert.equal(volgendeUpdate("2027-01-02"), "2027-01-10");
  assert.equal(volgendeUpdate("2027-12-31"), null);
});

function stand(over: Partial<KpiStand>): KpiStand {
  return {
    website: "bentley",
    jaar: 2026,
    peildatum: "2026-11-14",
    berekendOp: "2026-11-15T10:15:00Z",
    definitief: false,
    dagen: {},
    gebruikers: new Array(12).fill(0),
    ...over,
  };
}

test("een KPI telt zijn bronnen per dag bij elkaar op, inclusief een event met padvoorwaarde", () => {
  const bentley = vindWebsite("bentley")!;
  const offerte = bentley.kpis.find((k) => k.sleutel === "offerteaanvragen")!;
  const s = stand({
    dagen: {
      "event:Contactaanvraag@/caw-bedankt/offerte/": { "2026-03-04": 1, "2026-05-27": 2 },
      "event:generate_lead_offerte": { "2026-10-20": 1, "2026-11-03": 1 },
      "event:Contactaanvraag": { "2026-08-09": 1 }, // een proefrit: hoort er niet bij
    },
  });
  assert.deepEqual(dagwaardenVoor(offerte, s), { "2026-03-04": 1, "2026-05-27": 2, "2026-10-20": 1, "2026-11-03": 1 });
});

test("de realisatie van 2027 is de som van alles in de stand van 2027, zonder bijschatting", () => {
  const veloo = vindWebsite("veloo")!;
  const aankopen = veloo.kpis.find((k) => k.sleutel === "productaankopen")!;
  const s = stand({ website: "veloo", jaar: 2027, peildatum: "2027-01-09", dagen: { aankopen: { "2027-01-04": 2, "2027-01-08": 1 } } });
  assert.equal(realisatieVoor(aankopen, s), 3);
  const udenhout = vindWebsite("udenhout")!;
  const gebruikers = udenhout.kpis.find((k) => k.sleutel === "gebruikers")!;
  assert.equal(realisatieVoor(gebruikers, stand({ jaar: 2027, gebruikers: [500, ...new Array(11).fill(0)] })), 500);
});

test("het overzicht zonder stand van 2027 toont realisatie 0 en geen peildatum", () => {
  const pgz = vindWebsite("pgz")!;
  const o = websiteOverzicht(pgz, stand({ website: "pgz", dagen: { sessies: elkeDag("2026-01-01", "2026-11-14", 80) } }), null);
  assert.equal(o.kpis.length, pgz.kpis.length);
  for (const k of o.kpis) assert.deepEqual(k.realisatie, { waarde: 0, peildatum: null });
  const sessies = o.kpis.find((k) => k.sleutel === "sessies")!;
  bijna(sessies.uitkomst!.verwacht, 80 * 365);
  assert.equal(o.volgendeUpdate, "2026-11-22");
});

test("zonder enige stand is er geen uitkomst, wel de lijst KPI's", () => {
  const o = websiteOverzicht(vindWebsite("veloo")!, null, null);
  assert.ok(o.kpis.every((k) => k.uitkomst === null));
  assert.equal(o.stand, null);
});

test("de definities: zes websites, unieke sleutels, geldige perioden, geen event twee keer per website", () => {
  assert.equal(KPI_WEBSITES.length, 6);
  assert.equal(new Set(KPI_WEBSITES.map((w) => w.sleutel)).size, 6);
  for (const w of KPI_WEBSITES) {
    assert.match(w.property, /^\d+$/);
    assert.equal(new Set(w.kpis.map((k) => k.sleutel)).size, w.kpis.length, w.sleutel);
    const bronnen: string[] = [];
    for (const k of w.kpis) {
      if (k.bron.soort === "events") bronnen.push(...k.bron.events.map(eventBron));
      else assert.ok(k.bronTekst, `${w.sleutel}/${k.sleutel} mist een bronTekst`);
    }
    // Eén aanvraag mag niet bij twee KPI's van dezelfde website meetellen.
    assert.equal(new Set(bronnen).size, bronnen.length, w.sleutel);
    assert.equal(gewoneEvents(w).length + padEvents(w).length, bronnen.length, w.sleutel);
  }
});

test("de uitgesloten hosts zijn nooit het live domein", () => {
  for (const w of KPI_WEBSITES) {
    for (const host of w.uitgeslotenHosts) assert.ok(!host.endsWith(`www.${w.domein}`) && host !== w.domein, host);
  }
});
