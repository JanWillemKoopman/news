import assert from "node:assert/strict";
import { test } from "node:test";
import { pacingVan, type CampagneBudget } from "./budget.ts";

function campagne(overschrijf: Partial<CampagneBudget> = {}): CampagneBudget {
  return {
    campagne: "Audi Q4 e-tron",
    sheetCampagne: "Q4 e-tron voorjaar",
    budget: 10000,
    doelLeads: 100,
    startdatum: "2026-09-01",
    einddatum: "2026-09-30",
    uitgaven: 5000,
    leads: 50,
    ...overschrijf,
  };
}

const halverwege = new Date("2026-09-15T12:00:00Z");

test("halverwege de looptijd en halverwege het budget is op schema", () => {
  const pacing = pacingVan(campagne(), halverwege);
  assert.equal(pacing.dagen, 30);
  assert.equal(pacing.dagVan, 15);
  assert.equal(pacing.oordeel, "op-schema");
});

test("het geld dat te hard gaat is het signaal", () => {
  // 80% van het budget op de vijftiende van dertig dagen: over ruim een week is het op.
  const pacing = pacingVan(campagne({ uitgaven: 8000 }), halverwege);
  assert.equal(pacing.oordeel, "voor");
  assert.ok(pacing.afwijking !== null && pacing.afwijking > 0.25);
});

test("budget dat blijft liggen is ook een afwijking", () => {
  const pacing = pacingVan(campagne({ uitgaven: 1000 }), halverwege);
  assert.equal(pacing.oordeel, "achter");
});

test("een campagne die nog moet beginnen krijgt geen oordeel", () => {
  // Anders is elke vooruitbetaalde euro meteen "voor op schema".
  const pacing = pacingVan(campagne({ uitgaven: 200 }), new Date("2026-08-20T12:00:00Z"));
  assert.equal(pacing.begonnen, false);
  assert.equal(pacing.oordeel, "onbekend");
  assert.equal(pacing.verstreken, 0);
});

test("na de einddatum is de looptijd voor honderd procent verstreken", () => {
  const na = new Date("2026-10-15T12:00:00Z");

  // 95% besteed over de hele looptijd valt binnen de marge: dat is gewoon op schema.
  assert.equal(pacingVan(campagne({ uitgaven: 9500 }), na).oordeel, "op-schema");

  const helft = pacingVan(campagne({ uitgaven: 5000 }), na);
  assert.equal(helft.afgelopen, true);
  assert.equal(helft.verstreken, 1);
  assert.equal(helft.oordeel, "achter");
});

test("zonder budget valt er niets te peilen", () => {
  const pacing = pacingVan(campagne({ budget: null }), halverwege);
  assert.equal(pacing.afwijking, null);
  assert.equal(pacing.oordeel, "onbekend");
  // De looptijd zelf klopt nog wel; die hangt niet van het bedrag af.
  assert.equal(pacing.dagVan, 15);
});

test("een omgedraaide looptijd levert geen onzin op", () => {
  const pacing = pacingVan(
    campagne({ startdatum: "2026-09-30", einddatum: "2026-09-01" }),
    halverwege,
  );
  assert.equal(pacing.oordeel, "onbekend");
  assert.equal(pacing.dagen, 0);
});
