import assert from "node:assert/strict";
import { test } from "node:test";
import { CRITERIA, gewogenEindcijfer, plafondFocus, plafondInformatie } from "./landingspaginaScore.ts";

test("de wegingen tellen op tot 100", () => {
  assert.equal(
    CRITERIA.reduce((som, c) => som + c.gewicht, 0),
    100,
  );
});

test("ontbrekende informatie kost twee punten, onduidelijke één", () => {
  assert.equal(plafondInformatie(["duidelijk", "duidelijk"]), 10);
  assert.equal(plafondInformatie(["ontbreekt", "onduidelijk", "duidelijk"]), 7);
  assert.equal(plafondInformatie(Array(8).fill("ontbreekt")), 1);
});

test("overbodige blokken drukken het focuscijfer hard", () => {
  assert.equal(plafondFocus(["kern", "inkorten"]), 10);
  assert.equal(plafondFocus(["overbodig"]), 7);
  assert.equal(plafondFocus(["overbodig", "overbodig"]), 5);
  assert.equal(plafondFocus(["overbodig", "overbodig", "overbodig"]), 4);
  assert.equal(plafondFocus(Array(6).fill("overbodig")), 3);
});

test("het eindcijfer is het gewogen gemiddelde", () => {
  const scores = CRITERIA.map((c) => ({ nummer: c.nummer, score: c.nummer === 2 ? 4 : 8 }));
  // 8 overal, behalve 4 op het zwaarste criterium (25%): 8 - 0,25 × 4 = 7.
  assert.equal(gewogenEindcijfer(scores), 7);
});
