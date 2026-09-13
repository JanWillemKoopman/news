import assert from "node:assert/strict";
import { test } from "node:test";
import { bepaalSignalen } from "./signalen.ts";
import type { Kubus } from "./kubus.ts";
import { ADVERTENTIE_STATISTIEKEN } from "../windsor/velden.ts";

/**
 * Twaalf dagen, twee campagnes. Twaalf dagen betekent: de laatste vier dagen zijn het
 * "recente" deel en de acht daarvoor het "eerdere" deel.
 */
function bouw(rijen: [number, number, number, number, number][]): Kubus {
  const datums = Array.from({ length: 12 }, (_, i) => `2026-09-${String(i + 1).padStart(2, "0")}`);
  return {
    dimensies: ["datum", "campagne"],
    labels: { datum: datums, campagne: ["Stabiel", "Verdacht"] },
    kolommen: ["uitgaven", "klikken", "leads"],
    // datumindex, campagne-index, uitgaven, klikken, leads
    rijen: rijen.map(([d, c, u, k, l]) => [d, c, u, k, l]),
    korrel: "dag",
    periode: { van: datums[0], tot: datums[11] },
  };
}

const statistieken = ADVERTENTIE_STATISTIEKEN;
const instellingen = { dimensie: "campagne", drempelUitgaven: 100, drempelLeads: 4 };

test("een campagne die stilvalt komt bovenaan", () => {
  const rijen: [number, number, number, number, number][] = [];
  for (let d = 0; d < 12; d++) rijen.push([d, 0, 50, 20, 2]); // Stabiel loopt door
  for (let d = 0; d < 8; d++) rijen.push([d, 1, 100, 40, 4]); // Verdacht stopt na dag 8

  const signalen = bepaalSignalen(bouw(rijen), bouw(rijen).rijen, statistieken, instellingen);
  assert.equal(signalen[0].onderwerp, "Verdacht");
  assert.equal(signalen[0].ernst, "let-op");
  assert.match(signalen[0].tekst, /Geen uitgaven meer/);
});

test("een duurdere lead wordt gemeld, een goedkopere ook maar als goed nieuws", () => {
  const rijen: [number, number, number, number, number][] = [];
  // Eerste acht dagen: € 100 voor 10 leads = € 10 per lead.
  for (let d = 0; d < 8; d++) rijen.push([d, 1, 100, 40, 10]);
  // Laatste vier dagen: € 100 voor 2 leads = € 50 per lead.
  for (let d = 8; d < 12; d++) rijen.push([d, 1, 100, 40, 2]);

  const kubus = bouw(rijen);
  const signalen = bepaalSignalen(kubus, kubus.rijen, statistieken, instellingen);
  const cpl = signalen.find((s) => s.id.startsWith("cpl:"));
  assert.ok(cpl, "er hoort een CPL-signaal te zijn");
  assert.equal(cpl.ernst, "let-op");
  assert.match(cpl.tekst, /Kosten per lead gestegen/);
});

test("kleine campagnes halen de drempel niet", () => {
  const rijen: [number, number, number, number, number][] = [];
  // Eén euro per dag: relatief een verdubbeling, absoluut niets om over te vergaderen.
  for (let d = 0; d < 8; d++) rijen.push([d, 1, 1, 1, 1]);
  for (let d = 8; d < 12; d++) rijen.push([d, 1, 2, 1, 0]);

  const kubus = bouw(rijen);
  assert.deepEqual(bepaalSignalen(kubus, kubus.rijen, statistieken, instellingen), []);
});

test("meer budget zonder meer leads is een signaal", () => {
  const rijen: [number, number, number, number, number][] = [];
  for (let d = 0; d < 8; d++) rijen.push([d, 1, 50, 20, 5]);
  for (let d = 8; d < 12; d++) rijen.push([d, 1, 150, 60, 5]); // per dag 3× zoveel geld, evenveel leads

  const kubus = bouw(rijen);
  const signalen = bepaalSignalen(kubus, kubus.rijen, statistieken, instellingen);
  const budget = signalen.find((s) => s.id.startsWith("budget:") || s.id.startsWith("cpl:"));
  assert.ok(budget, "een verdrievoudigd budget bij gelijke leads hoort op te vallen");
  assert.equal(budget.ernst, "let-op");
});

test("te weinig dagen levert geen signalen op", () => {
  // Onder de negen dagen is het "laatste derde" drie dagen; dan is elke uitschieter een
  // weekendeffect en geen signaal.
  const kort: Kubus = {
    ...bouw([[0, 0, 500, 100, 10]]),
    labels: { datum: ["2026-09-01", "2026-09-02"], campagne: ["Stabiel", "Verdacht"] },
  };
  assert.deepEqual(bepaalSignalen(kort, kort.rijen, statistieken, instellingen), []);
});
