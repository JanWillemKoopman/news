import assert from "node:assert/strict";
import { test } from "node:test";
import {
  forecast,
  isMaand,
  maandGrenzen,
  maandVoortgang,
  oordeelVan,
  platformGroep,
  telOpVoorMaand,
  verschuifMaand,
  type BudgetDoel,
  type DagRegel,
} from "./budgetBeheer.ts";

const drieentwintigSeptember = new Date("2026-09-23T10:00:00Z");

test("de lopende maand telt tot en met gisteren", () => {
  const voortgang = maandVoortgang("2026-09", drieentwintigSeptember);
  assert.equal(voortgang.dagenInMaand, 30);
  assert.equal(voortgang.verstrekenDagen, 22);
});

test("een afgelopen maand is helemaal verstreken, een komende nog helemaal niet", () => {
  assert.deepEqual(maandVoortgang("2026-08", drieentwintigSeptember), { dagenInMaand: 31, verstrekenDagen: 31 });
  assert.deepEqual(maandVoortgang("2026-10", drieentwintigSeptember), { dagenInMaand: 31, verstrekenDagen: 0 });
});

test("forecast is gemiddelde per verstreken dag maal de dagen in de maand", () => {
  // € 2.200 in 22 dagen is € 100 per dag, over 30 dagen € 3.000.
  assert.equal(forecast(2200, { dagenInMaand: 30, verstrekenDagen: 22 }), 3000);
});

test("op de eerste van de maand is er nog niets te voorspellen", () => {
  const voortgang = maandVoortgang("2026-09", new Date("2026-09-01T08:00:00Z"));
  assert.equal(voortgang.verstrekenDagen, 0);
  assert.equal(forecast(0, voortgang), null);
});

test("het oordeel kijkt naar forecast tegen doel, met tien procent marge", () => {
  assert.equal(oordeelVan(3000, 3000), "op-koers");
  assert.equal(oordeelVan(3250, 3000), "op-koers");
  assert.equal(oordeelVan(3400, 3000), "te-snel");
  assert.equal(oordeelVan(2500, 3000), "te-langzaam");
  assert.equal(oordeelVan(3000, null), null);
  assert.equal(oordeelVan(null, 3000), null);
  assert.equal(oordeelVan(3000, 0), null);
});

test("maandrekenwerk rond de jaargrens en schrikkeljaren", () => {
  assert.equal(verschuifMaand("2026-01", -1), "2025-12");
  assert.equal(verschuifMaand("2026-12", 1), "2027-01");
  assert.deepEqual(maandGrenzen("2028-02"), { van: "2028-02-01", tot: "2028-02-29" });
  assert.equal(isMaand("2026-09"), true);
  assert.equal(isMaand("2026-13"), false);
  assert.equal(isMaand("2026-9"), false);
});

test("optellen volgt maand én selectie, en een ontbrekend budget blijft leeg", () => {
  const dagen: DagRegel[] = [
    { datum: "2026-09-01", account: "Audi", platform: "facebook", uitgaven: 100, klikken: 50 },
    { datum: "2026-09-02", account: "Audi", platform: "instagram", uitgaven: 40, klikken: 10 },
    { datum: "2026-08-31", account: "Audi", platform: "facebook", uitgaven: 999, klikken: 999 },
    { datum: "2026-09-02", account: "Škoda", platform: "facebook", uitgaven: 70, klikken: 30 },
  ];
  const doelen: BudgetDoel[] = [
    { account: "Audi", platform: "facebook", maand: "2026-09", budget: 1000, doelKlikken: 500 },
    { account: "Audi", platform: "instagram", maand: "2026-09", budget: null, doelKlikken: 100 },
    { account: "Audi", platform: "facebook", maand: "2026-08", budget: 5000, doelKlikken: 5000 },
  ];

  assert.deepEqual(telOpVoorMaand(dagen, doelen, "2026-09"), {
    uitgaven: 210,
    klikken: 90,
    budget: 1000,
    doelKlikken: 600,
  });

  assert.deepEqual(
    telOpVoorMaand(dagen, doelen, "2026-09", (account) => account === "Škoda"),
    { uitgaven: 70, klikken: 30, budget: null, doelKlikken: null },
  );
});

test("platformGroep bundelt alles behalve LinkedIn tot Meta", () => {
  assert.equal(platformGroep("facebook"), "meta");
  assert.equal(platformGroep("instagram"), "meta");
  assert.equal(platformGroep("threads"), "meta");
  assert.equal(platformGroep("audience_network"), "meta");
  assert.equal(platformGroep("messenger"), "meta");
  assert.equal(platformGroep("linkedin"), "linkedin");
});

test("optellen over de Meta-platforms samen, via platformGroep als selectie", () => {
  const dagen: DagRegel[] = [
    { datum: "2026-09-01", account: "Audi", platform: "facebook", uitgaven: 100, klikken: 50 },
    { datum: "2026-09-02", account: "Audi", platform: "instagram", uitgaven: 40, klikken: 10 },
    { datum: "2026-09-03", account: "Audi", platform: "threads", uitgaven: 5, klikken: 1 },
    { datum: "2026-09-04", account: "Audi", platform: "linkedin", uitgaven: 1000, klikken: 1000 },
  ];
  const doelen: BudgetDoel[] = [
    { account: "Audi", platform: "facebook", maand: "2026-09", budget: 500, doelKlikken: 200 },
    { account: "Audi", platform: "instagram", maand: "2026-09", budget: 300, doelKlikken: null },
  ];

  assert.deepEqual(
    telOpVoorMaand(dagen, doelen, "2026-09", (a, p) => a === "Audi" && platformGroep(p) === "meta"),
    { uitgaven: 145, klikken: 61, budget: 800, doelKlikken: 200 },
  );
  assert.deepEqual(
    telOpVoorMaand(dagen, doelen, "2026-09", (a, p) => a === "Audi" && platformGroep(p) === "linkedin"),
    { uitgaven: 1000, klikken: 1000, budget: null, doelKlikken: null },
  );
});
