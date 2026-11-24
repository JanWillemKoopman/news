import assert from "node:assert/strict";
import { test } from "node:test";
import {
  deelOpInLopendEnAfgelopen,
  doorstroom,
  formatWaarde,
  isAfgelopen,
  leesBedrag,
  leesCampagneInvoer,
  leesOpzetInvoer,
  rapportageNaam,
  sorteerOpzetten,
  leesModellen,
  leesSemantiek,
  looptijdLabel,
  normaliseerResultaat,
  vandaagNL,
  versieLabel,
} from "@/lib/marketingAnalyse/rekenen";
import { SEMANTIEK_BLOKKEN } from "@/lib/marketingAnalyse/types";


const CAMPAGNE = { id: "c", formulier: "campagne" as const, bedrijf: null };
const VDU_MAAND = { id: "r", formulier: "rapportage" as const, bedrijf: "Van den Udenhout" };

test("bedragen in Nederlandse en Engelse notatie", () => {
  assert.equal(leesBedrag("5000"), 5000);
  assert.equal(leesBedrag("5.000"), 5000);
  assert.equal(leesBedrag("€ 5.000,50"), 5000.5);
  assert.equal(leesBedrag("2500.5"), 2500.5);
  assert.equal(leesBedrag(1200), 1200);
  assert.equal(leesBedrag(""), null);
  assert.equal(leesBedrag("veel"), null);
  assert.equal(leesBedrag("-10"), null);
});

test("modellen uit tekst of lijst, zonder dubbele", () => {
  assert.deepEqual(leesModellen("A2 e-tron, Q4\nq4 ; Q6"), ["A2 e-tron", "Q4", "Q6"]);
  assert.deepEqual(leesModellen(["A2", " ", 3, "A2"]), ["A2"]);
  assert.deepEqual(leesModellen(undefined), []);
});

test("naam en bedrijf zijn verplicht", () => {
  assert.equal(leesCampagneInvoer({ naam: " ", bedrijf: "Van den Udenhout" }, CAMPAGNE).ok, false);
  assert.equal(leesCampagneInvoer({ naam: "Audi A2" }, CAMPAGNE).ok, false);
  const u = leesCampagneInvoer({ naam: " Audi A2 ", bedrijf: "Van den Udenhout" }, CAMPAGNE);
  assert.ok(u.ok);
  if (u.ok) {
    assert.equal(u.invoer.naam, "Audi A2");
    assert.deepEqual(u.invoer.modellen, []);
    assert.equal(u.invoer.dataCorrectie, null);
  }
});

test("een volledige briefing wordt opgeschoond", () => {
  const u = leesCampagneInvoer({
    naam: "Audi A2",
    bedrijf: "Van den Udenhout",
    merk: "Audi",
    modellen: "A2 e-tron",
    startdatum: "2026-09-18",
    einddatum: "2026-12-31",
    doel: "20 proefritaanvragen",
    budget: "5.000",
    omschrijving: "Introductie.",
    dataCorrectie: "De post van 3 oktober hoort er niet bij.",
  }, CAMPAGNE);
  assert.ok(u.ok);
  if (u.ok) {
    assert.equal(u.invoer.budget, 5000);
    assert.deepEqual(u.invoer.modellen, ["A2 e-tron"]);
    assert.equal(u.invoer.dataCorrectie, "De post van 3 oktober hoort er niet bij.");
  }
});

test("einddatum vóór de start en een onleesbaar budget worden geweigerd", () => {
  const basis = { naam: "X", bedrijf: "PGZ" };
  assert.equal(leesCampagneInvoer({ ...basis, startdatum: "2026-10-01", einddatum: "2026-09-01" }, CAMPAGNE).ok, false);
  assert.equal(leesCampagneInvoer({ ...basis, budget: "vijfduizend" }, CAMPAGNE).ok, false);
  const u = leesCampagneInvoer({ ...basis, startdatum: "18-09-2026" }, CAMPAGNE);
  assert.ok(u.ok && u.invoer.startdatum === null);
});

test("vandaag in Nederland, ook rond middernacht UTC", () => {
  assert.equal(vandaagNL(new Date("2026-11-23T23:30:00Z")), "2026-11-24");
  assert.equal(vandaagNL(new Date("2026-07-01T21:59:00Z")), "2026-07-01");
});

test("afgelopen pas na de einddatum; lopend bovenaan op startdatum", () => {
  assert.equal(isAfgelopen("2026-11-24", "2026-11-24"), false);
  assert.equal(isAfgelopen("2026-11-23", "2026-11-24"), true);
  assert.equal(isAfgelopen(null, "2026-11-24"), false);
  const { lopend, afgelopen } = deelOpInLopendEnAfgelopen(
    [
      { naam: "oud", startdatum: "2026-01-01", einddatum: "2026-02-01" },
      { naam: "nieuw", startdatum: "2026-11-01", einddatum: null },
      { naam: "a2", startdatum: "2026-09-18", einddatum: "2026-12-31" },
      { naam: "zonder", startdatum: null, einddatum: null },
      { naam: "net-af", startdatum: "2026-06-01", einddatum: "2026-11-23" },
    ],
    "2026-11-24",
  );
  assert.deepEqual(lopend.map((c) => c.naam), ["nieuw", "a2", "zonder"]);
  assert.deepEqual(afgelopen.map((c) => c.naam), ["net-af", "oud"]);
});

test("semantic layer: alle blokken aanwezig, terugval voor wat ontbreekt", () => {
  const terugval = leesSemantiek({
    bedrijven: ["Van den Udenhout", "PGZ"],
    blokken: Object.fromEntries(SEMANTIEK_BLOKKEN.map((b) => [b.sleutel, `standaard ${b.sleutel}`])),
  });
  const s = leesSemantiek({ blokken: { ga4: "Eigen tekst\r\nregel 2" } }, terugval);
  assert.equal(s.blokken.ga4, "Eigen tekst\nregel 2");
  assert.equal(s.blokken.algemeen, "standaard algemeen");
  assert.deepEqual(s.bedrijven, ["Van den Udenhout", "PGZ"]);
  assert.equal(Object.keys(s.blokken).length, SEMANTIEK_BLOKKEN.length);
  // Een leeg blok mag bewust leeg blijven.
  assert.equal(leesSemantiek({ blokken: { meta_ads: "" } }, terugval).blokken.meta_ads, "");
});

test("waarden per eenheid", () => {
  assert.equal(formatWaarde(null), "—");
  assert.equal(formatWaarde(12345), "12.345");
  assert.equal(formatWaarde(3.456, "procent"), "3,5%");
  assert.equal(formatWaarde(95, "seconden"), "1:35 min");
  assert.match(formatWaarde(1960.8, "euro"), /1\.961/);
  assert.match(formatWaarde(0.15, "euro"), /0,15/);
  assert.equal(formatWaarde("n.v.t."), "n.v.t.");
});

test("doorstroom alleen tussen twee aantallen en niet boven 100%", () => {
  const d = doorstroom([
    { label: "Kosten", waarde: 1960, eenheid: "euro" },
    { label: "Vertoningen", waarde: 100_000, eenheid: "aantal" },
    { label: "Klikken", waarde: 2_000, eenheid: "aantal" },
    { label: "Sessies", waarde: null, eenheid: "aantal" },
    { label: "Lead-events", waarde: 23, eenheid: "aantal" },
    { label: "Leads Syntec", waarde: 61, eenheid: "aantal" },
  ]);
  assert.deepEqual(d, [null, null, 2, null, null, null]);
});

test("labels voor versie en looptijd", () => {
  assert.equal(versieLabel(2, "2026-11-23T10:00:00Z"), "v2 · 23 nov 2026");
  assert.equal(looptijdLabel("2026-09-18", "2026-12-31"), "18 sep – 31 dec 2026");
  assert.equal(looptijdLabel("2026-11-01", "2027-01-31"), "1 nov 2026 – 31 jan 2027");
  assert.equal(looptijdLabel(null, null), "Geen looptijd");
});

test("een onvolledig resultaat laat de weergave niet vastlopen", () => {
  const r = normaliseerResultaat({
    samenvatting: { kop: "Goed op weg", regels: ["1", "2", "3", "4", "5", "6"] },
    secties: [
      { stap: 3, titel: "Leads" },
      { stap: 1, titel: "Bereik" },
    ],
  });
  assert.equal(r.samenvatting.regels.length, 5);
  assert.deepEqual(r.funnel, []);
  assert.deepEqual(r.correcties, []);
  assert.deepEqual(r.semantiekVoorstellen, []);
  assert.deepEqual(r.secties.map((s) => s.titel), ["Bereik", "Leads"]);
  assert.deepEqual(normaliseerResultaat(null).secties, []);
});

test("rapportage: vast bedrijf, periode verplicht, campagnevelden vallen weg", () => {
  assert.equal(leesCampagneInvoer({ naam: "VDU maand" }, VDU_MAAND).ok, false);
  const u = leesCampagneInvoer(
    { naam: "VDU maandrapportage november", bedrijf: "PGZ", periodeTekst: " Afgelopen 3 maanden ", merk: "Audi", budget: "5000" },
    VDU_MAAND,
  );
  assert.ok(u.ok);
  if (u.ok) {
    assert.equal(u.invoer.bedrijf, "Van den Udenhout");
    assert.equal(u.invoer.periodeTekst, "Afgelopen 3 maanden");
    assert.equal(u.invoer.merk, null);
    assert.equal(u.invoer.budget, null);
    assert.equal(u.invoer.opzetId, "r");
  }
  const c = leesCampagneInvoer({ naam: "A2", bedrijf: "VELOO", periodeTekst: "x" }, CAMPAGNE);
  assert.ok(c.ok && c.invoer.periodeTekst === null && c.invoer.opzetId === "c");
});

test("opzetten: naam, sortering en invoer", () => {
  assert.equal(rapportageNaam("VDU maandrapportage", " november 2026 "), "VDU maandrapportage november 2026");
  assert.equal(rapportageNaam("VDU maandrapportage", ""), "VDU maandrapportage");
  const lijst = sorteerOpzetten([
    { naam: "B", volgorde: 10, actief: false },
    { naam: "C", volgorde: 20, actief: true },
    { naam: "A", volgorde: 0, actief: true },
  ]);
  assert.deepEqual(lijst.map((o) => o.naam), ["A", "C", "B"]);
  assert.equal(leesOpzetInvoer({ naam: "X" }).ok, false);
  const o = leesOpzetInvoer({ naam: " Social rapportage ", formulier: "rapportage", bedrijf: "" });
  assert.ok(o.ok && o.invoer.bedrijf === null && o.invoer.actief);
});
