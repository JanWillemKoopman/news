import assert from "node:assert/strict";
import { test } from "node:test";
import { aantalDagen, periodeVoor } from "@/lib/leads/periode";

const LAATSTE = "2026-11-21";

test("de vaste periodes rekenen vanaf de laatste dag met data", () => {
  assert.deepEqual(periodeVoor("alles", LAATSTE), { van: "2026-06-01", tot: "2026-11-21" });
  assert.deepEqual(periodeVoor("maand", LAATSTE), { van: "2026-11-01", tot: "2026-11-21" });
  assert.deepEqual(periodeVoor("vorige-maand", LAATSTE), { van: "2026-10-01", tot: "2026-10-31" });
  assert.deepEqual(periodeVoor("30d", LAATSTE), { van: "2026-10-23", tot: "2026-11-21" });
  assert.deepEqual(periodeVoor("90d", LAATSTE), { van: "2026-08-24", tot: "2026-11-21" });
  assert.deepEqual(periodeVoor("jaar", LAATSTE), { van: "2026-06-01", tot: "2026-11-21" });
});

test("12 maanden is 365 dagen terug, dit jaar begint op 1 januari", () => {
  assert.deepEqual(periodeVoor("12m", "2027-08-15"), { van: "2026-08-16", tot: "2027-08-15" });
  assert.deepEqual(periodeVoor("jaar", "2027-08-15"), { van: "2027-01-01", tot: "2027-08-15" });
});

test("niets begint vóór 1 juni of vóór de eerste dag in de tabel", () => {
  assert.deepEqual(periodeVoor("vorige-maand", "2026-06-10"), { van: "2026-06-01", tot: "2026-05-31" });
  assert.deepEqual(periodeVoor("30d", "2026-06-10"), { van: "2026-06-01", tot: "2026-06-10" });
  assert.deepEqual(periodeVoor("12m", LAATSTE, "2026-06-05"), { van: "2026-06-05", tot: LAATSTE });
  assert.deepEqual(periodeVoor("alles", LAATSTE, "2026-01-01"), { van: "2026-06-01", tot: LAATSTE });
});

test("vorige maand over de jaargrens", () => {
  assert.deepEqual(periodeVoor("vorige-maand", "2027-01-05"), { van: "2026-12-01", tot: "2026-12-31" });
});

test("aantalDagen telt beide grenzen mee", () => {
  assert.equal(aantalDagen({ van: "2026-10-23", tot: "2026-11-21" }), 30);
  assert.equal(aantalDagen({ van: "2026-06-01", tot: "2026-06-01" }), 1);
});
