import assert from "node:assert/strict";
import { test } from "node:test";
import { aantalDagen, herkenKeuze, periodeVoor } from "@/lib/leads/periode";

const LAATSTE = "2026-11-21";

test("de vaste periodes rekenen vanaf de laatste dag met data", () => {
  assert.deepEqual(periodeVoor("alles", LAATSTE), { van: "2026-06-01", tot: "2026-11-21" });
  assert.deepEqual(periodeVoor("deze-maand", LAATSTE), { van: "2026-11-01", tot: "2026-11-21" });
  assert.deepEqual(periodeVoor("vorige-maand", LAATSTE), { van: "2026-10-01", tot: "2026-10-31" });
  assert.deepEqual(periodeVoor("laatste-30", LAATSTE), { van: "2026-10-23", tot: "2026-11-21" });
});

test("niets begint vóór 1 juni", () => {
  assert.deepEqual(periodeVoor("vorige-maand", "2026-06-10"), { van: "2026-06-01", tot: "2026-05-31" });
  assert.deepEqual(periodeVoor("laatste-30", "2026-06-10"), { van: "2026-06-01", tot: "2026-06-10" });
});

test("vorige maand over de jaargrens", () => {
  assert.deepEqual(periodeVoor("vorige-maand", "2027-01-05"), { van: "2026-12-01", tot: "2026-12-31" });
});

test("herkenKeuze vindt de vaste periode terug, anders eigen", () => {
  assert.equal(herkenKeuze({ van: "2026-06-01", tot: LAATSTE }, LAATSTE), "alles");
  assert.equal(herkenKeuze({ van: "2026-10-01", tot: "2026-10-31" }, LAATSTE), "vorige-maand");
  assert.equal(herkenKeuze({ van: "2026-07-01", tot: "2026-07-15" }, LAATSTE), "eigen");
});

test("aantalDagen telt beide grenzen mee", () => {
  assert.equal(aantalDagen({ van: "2026-10-23", tot: "2026-11-21" }), 30);
  assert.equal(aantalDagen({ van: "2026-06-01", tot: "2026-06-01" }), 1);
});
