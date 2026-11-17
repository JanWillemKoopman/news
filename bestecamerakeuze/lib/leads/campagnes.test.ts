import assert from "node:assert/strict";
import { test } from "node:test";
import { bouwCampagneRijen, redenZonderKosten } from "@/lib/leads/campagnes";
import { koppelLeads, type LeadInvoer, type UitgavenInvoer } from "@/lib/leads/koppel";
import { groepeer } from "@/lib/leads/samenvatting";

function lead(over: Partial<LeadInvoer> = {}): LeadInvoer {
  return {
    datum: "2026-11-01",
    event: "generate_lead_proefrit",
    bronMedium: "google / cpc",
    campagne: "T | Branding VDU",
    merk: "",
    model: "",
    formulier: "",
    aantal: 1,
    ...over,
  };
}

const uitgave = (over: Partial<UitgavenInvoer> = {}): UitgavenInvoer => ({
  bron: "google",
  campagne: "T | Branding VDU",
  uitgaven: 100,
  klikken: 10,
  vertoningen: 100,
  ...over,
});

function rijenVoor(leads: LeadInvoer[], uitgaven: UitgavenInvoer[], metZonderLead = true) {
  const k = koppelLeads(leads, uitgaven);
  const betaald = groepeer(
    k.regels.filter((r) => r.platform !== null),
    (r) => `${r.platform}\u0000${r.campagne}`,
  );
  const zonderLead = metZonderLead ? k.campagnes.filter((c) => c.leads === 0 && (c.uitgaven ?? 0) > 0) : [];
  return bouwCampagneRijen(betaald, zonderLead);
}

test("een gekoppelde campagne toont kosten en kosten per lead", () => {
  const [rij] = rijenVoor([lead({ aantal: 4 })], [uitgave({ uitgaven: 200 })]);
  assert.equal(rij.kosten, 200);
  assert.equal(rij.perLead, 50);
  assert.equal(rij.leads, 4);
  assert.equal(rij.reden, null);
});

test("betaald verkeer zonder bekende kosten staat erin, met de reden", () => {
  const rijen = rijenVoor(
    [lead({ bronMedium: "bing / cpc", aantal: 3 }), lead({ campagne: "(not set)", aantal: 2 })],
    [uitgave()],
  );
  const bing = rijen.find((r) => r.platform === "microsoft");
  const onbekend = rijen.find((r) => r.campagne === "(not set)");
  assert.equal(bing?.kosten, null);
  assert.equal(bing?.reden, redenZonderKosten("microsoft"));
  assert.match(bing?.reden ?? "", /geen kostenbron/);
  assert.equal(onbekend?.kosten, null);
  assert.match(onbekend?.reden ?? "", /niet gevonden/);
});

test("een campagne met uitgaven en zonder lead krijgt een rij met nul leads", () => {
  const rijen = rijenVoor([lead({ aantal: 2 })], [uitgave(), uitgave({ campagne: "Geen resultaat", uitgaven: 75 })]);
  const geen = rijen.find((r) => r.campagne === "Geen resultaat");
  assert.equal(geen?.leads, 0);
  assert.equal(geen?.kosten, 75);
  assert.equal(geen?.perLead, null);
});

test("met een filter (zonder 'zonder lead') verdwijnen die campagnes uit de lijst", () => {
  const rijen = rijenVoor([lead()], [uitgave(), uitgave({ campagne: "Geen resultaat", uitgaven: 75 })], false);
  assert.equal(rijen.some((r) => r.campagne === "Geen resultaat"), false);
});

test("de rijen staan op kosten, onbekende kosten onderaan", () => {
  const rijen = rijenVoor(
    [lead({ aantal: 9, bronMedium: "bing / cpc" }), lead({ campagne: "Duur" }), lead()],
    [uitgave({ campagne: "Duur", uitgaven: 900 }), uitgave({ uitgaven: 10 })],
  );
  assert.deepEqual(
    rijen.map((r) => r.campagne),
    ["Duur", "T | Branding VDU", "T | Branding VDU"],
  );
  assert.equal(rijen[rijen.length - 1].kosten, null);
});

test("de kosten in de tabel zijn samen precies de uitgaven van de campagnes met leads", () => {
  const rijen = rijenVoor(
    [lead({ aantal: 3 }), lead({ campagne: "Andere", aantal: 7 })],
    [uitgave({ uitgaven: 120.5 }), uitgave({ campagne: "Andere", uitgaven: 79.5 })],
    false,
  );
  const som = rijen.reduce((t, r) => t + (r.kosten ?? 0), 0);
  assert.ok(Math.abs(som - 200) < 1e-9);
});
