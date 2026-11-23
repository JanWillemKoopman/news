import assert from "node:assert/strict";
import { test } from "node:test";
import {
  doelVoortgang,
  doorstroom,
  formatWaarde,
  leesBedrag,
  leesCampagneInvoer,
  looptijdLabel,
  normaliseerResultaat,
  versieLabel,
} from "@/lib/insight/rekenen";

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

test("alleen de naam is verplicht", () => {
  const leeg = leesCampagneInvoer({ naam: "  " });
  assert.equal(leeg.ok, false);

  const minimaal = leesCampagneInvoer({ naam: " Audi A2 " });
  assert.ok(minimaal.ok);
  if (minimaal.ok) {
    assert.equal(minimaal.invoer.naam, "Audi A2");
    assert.equal(minimaal.invoer.budget, null);
    assert.equal(minimaal.invoer.startdatum, null);
  }
});

test("een volledig formulier wordt opgeschoond", () => {
  const u = leesCampagneInvoer({
    naam: "Audi A2",
    merk: "Audi",
    model: "A2 e-tron",
    startdatum: "2026-09-18",
    einddatum: "2026-12-31",
    doel: "20 proefritaanvragen",
    budget: "5.000",
    omschrijving: "Introductie van de A2 e-tron.",
    zoektermen: "",
  });
  assert.ok(u.ok);
  if (u.ok) {
    assert.equal(u.invoer.budget, 5000);
    assert.equal(u.invoer.zoektermen, null);
    assert.equal(u.invoer.einddatum, "2026-12-31");
  }
});

test("einddatum vóór de start en een onleesbaar budget worden geweigerd", () => {
  assert.equal(leesCampagneInvoer({ naam: "X", startdatum: "2026-10-01", einddatum: "2026-09-01" }).ok, false);
  assert.equal(leesCampagneInvoer({ naam: "X", budget: "vijfduizend" }).ok, false);
  // Een ongeldige datum valt weg in plaats van de invoer te blokkeren.
  const u = leesCampagneInvoer({ naam: "X", startdatum: "18-09-2026" });
  assert.ok(u.ok && u.invoer.startdatum === null);
});

test("waarden per eenheid", () => {
  assert.equal(formatWaarde(null), "—");
  assert.equal(formatWaarde(12345), "12.345");
  assert.equal(formatWaarde(3.456, "procent"), "3,5%");
  assert.equal(formatWaarde(42, "procent"), "42%");
  assert.equal(formatWaarde(95, "seconden"), "1:35 min");
  assert.equal(formatWaarde(40, "seconden"), "40 s");
  assert.match(formatWaarde(1960.8, "euro"), /1\.961/);
  assert.match(formatWaarde(0.15, "euro"), /0,15/);
  assert.equal(formatWaarde("n.v.t.", "aantal"), "n.v.t.");
});

test("doorstroom alleen tussen twee aantallen", () => {
  const d = doorstroom([
    { label: "Kosten", waarde: 1960, eenheid: "euro" },
    { label: "Vertoningen", waarde: 100_000, eenheid: "aantal" },
    { label: "Klikken", waarde: 2_000, eenheid: "aantal" },
    { label: "Sessies", waarde: null, eenheid: "aantal" },
    { label: "Leads", waarde: 10, eenheid: "aantal" },
  ]);
  assert.deepEqual(d, [null, null, 2, null, null]);
  // Meer Syntec-leads dan lead-events op de site: geen doorstroom.
  const meer = doorstroom([
    { label: "Lead-events", waarde: 23, eenheid: "aantal" },
    { label: "Syntec", waarde: 61, eenheid: "aantal" },
  ]);
  assert.deepEqual(meer, [null, null]);
});

test("doelvoortgang", () => {
  assert.equal(doelVoortgang({ doelWaarde: 20, doelRealisatie: 15 }), 75);
  assert.equal(doelVoortgang({ doelWaarde: 20, doelRealisatie: null }), null);
  assert.equal(doelVoortgang({ doelWaarde: 0, doelRealisatie: 3 }), null);
  assert.equal(doelVoortgang(null), null);
});

test("labels voor versie en looptijd", () => {
  assert.equal(versieLabel(2, "2026-11-23T10:00:00Z"), "v2 · 23 nov 2026");
  assert.equal(looptijdLabel("2026-09-18", "2026-12-31"), "18 sep – 31 dec 2026");
  assert.equal(looptijdLabel("2026-11-01", "2027-01-31"), "1 nov 2026 – 31 jan 2027");
  assert.equal(looptijdLabel(null, null), "Geen looptijd");
});

test("een onvolledig resultaat laat de weergave niet vastlopen", () => {
  const r = normaliseerResultaat({
    samenvatting: { kop: "Goed op weg" },
    secties: [
      { stap: 3, titel: "Leads" },
      { stap: 1, titel: "Bereik" },
    ],
  });
  assert.equal(r.samenvatting.tekst, "");
  assert.deepEqual(r.funnel, []);
  assert.deepEqual(r.herkenning, []);
  assert.deepEqual(
    r.secties.map((s) => s.titel),
    ["Bereik", "Leads"],
  );
  assert.deepEqual(normaliseerResultaat(null).secties, []);
});
