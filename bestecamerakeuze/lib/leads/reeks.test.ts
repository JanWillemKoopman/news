import assert from "node:assert/strict";
import { test } from "node:test";
import { koppelLeads, type LeadInvoer } from "@/lib/leads/koppel";
import { kostenPerLeadVan, leadsReeks, metHandmatigPerDag, vakBegin } from "@/lib/leads/reeks";

function lead(over: Partial<LeadInvoer> = {}): LeadInvoer {
  return {
    datum: "2026-11-02",
    event: "generate_lead_proefrit",
    bronMedium: "google / cpc",
    campagne: "T | Branding VDU",
    merk: "Audi",
    model: "",
    formulier: "",
    aantal: 1,
    ...over,
  };
}

const regels = koppelLeads(
  [
    lead({ datum: "2026-11-02", aantal: 2 }), // maandag
    lead({ datum: "2026-11-09", aantal: 2 }), // maandag erna
    lead({ datum: "2026-11-10", bronMedium: "bing / cpc", aantal: 3 }),
    lead({ datum: "2026-11-03", bronMedium: "google / organic", campagne: "(organic)", aantal: 5 }),
  ],
  [{ bron: "google", campagne: "T | Branding VDU", uitgaven: 80, klikken: 10, vertoningen: 100 }],
).regels;

test("vakBegin: dag, maandag van de week, eerste van de maand", () => {
  assert.equal(vakBegin("2026-11-05", "dag"), "2026-11-05");
  assert.equal(vakBegin("2026-11-08", "week"), "2026-11-02"); // zondag → maandag ervoor
  assert.equal(vakBegin("2026-11-02", "week"), "2026-11-02");
  assert.equal(vakBegin("2026-11-20", "maand"), "2026-11-01");
});

test("per week: alle weken, halve weken onvolledig, leads opgeteld", () => {
  const punten = leadsReeks(regels, { van: "2026-11-01", tot: "2026-11-12" }, "week", null);
  assert.deepEqual(
    punten.map((p) => [p.begin, p.eind, p.betaald, p.onbetaald, p.volledig]),
    [
      ["2026-11-01", "2026-11-01", 0, 0, false],
      ["2026-11-02", "2026-11-08", 2, 5, true],
      ["2026-11-09", "2026-11-12", 5, 0, false],
    ],
  );
});

test("met filter: toegerekende kosten en alleen leads met bekende kosten in de noemer", () => {
  const [, eerste, tweede] = leadsReeks(regels, { van: "2026-11-01", tot: "2026-11-12" }, "week", null);
  assert.equal(eerste.uitgaven, 40);
  assert.equal(eerste.betaaldMetKosten, 2);
  assert.equal(kostenPerLeadVan(eerste), 20);
  // Bing is betaald maar zonder kosten: telt niet in de noemer.
  assert.equal(tweede.betaaldMetKosten, 2);
  assert.equal(tweede.uitgaven, 40);
});

test("zonder filter: echte uitgaven per dag, ook op dagen zonder lead", () => {
  const perDag = { "2026-11-02": 30, "2026-11-05": 50, "2026-11-11": 25, "2026-12-01": 999 };
  const punten = leadsReeks(regels, { van: "2026-11-01", tot: "2026-11-12" }, "week", perDag);
  assert.deepEqual(punten.map((p) => p.uitgaven), [0, 80, 25]);
  assert.equal(punten[2].betaaldMetKosten, 2);
  assert.equal(kostenPerLeadVan(punten[0]), null);
});

test("handmatige maandbedragen naar rato van de dagen", () => {
  const perDag = metHandmatigPerDag(
    { "2026-11-02": 10 },
    [{ bronMedium: "gaspedaal.nl / referral", maand: "2026-11", bedrag: 300, inVenster: 0, leads: 0 }],
    { van: "2026-11-01", tot: "2026-11-20" },
  );
  assert.equal(Object.keys(perDag).length, 20);
  assert.equal(perDag["2026-11-02"], 20);
  assert.equal(perDag["2026-11-20"], 10);
  const totaal = Object.values(perDag).reduce((t, b) => t + b, 0);
  assert.equal(Math.round(totaal), 210); // 10 + 300 × 20/30
});
