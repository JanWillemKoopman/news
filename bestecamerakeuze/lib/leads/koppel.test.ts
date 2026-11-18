import assert from "node:assert/strict";
import { test } from "node:test";
import { koppelLeads, type LeadInvoer, type UitgavenInvoer } from "@/lib/leads/koppel";

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

function uitgave(over: Partial<UitgavenInvoer> = {}): UitgavenInvoer {
  return { bron: "google", campagne: "T | Branding VDU", uitgaven: 100, klikken: 50, vertoningen: 1000, ...over };
}

const som = (getallen: (number | null)[]) => getallen.reduce<number>((t, g) => t + (g ?? 0), 0);

test("de uitgaven van een campagne worden gelijk over zijn leads verdeeld", () => {
  const { regels } = koppelLeads(
    [lead({ aantal: 3, merk: "Audi" }), lead({ aantal: 1, merk: "Volkswagen" })],
    [uitgave({ uitgaven: 200 })],
  );
  // € 200 / 4 leads = € 50 per lead
  assert.equal(regels[0].kosten, 150);
  assert.equal(regels[1].kosten, 50);
  assert.ok(regels.every((r) => r.status === "toegerekend"));
});

test("toegerekende kosten plus uitgaven zonder lead zijn precies de uitgaven", () => {
  // Het hart van de koppeling: er mag geen euro zoekraken, in geen van beide richtingen.
  const uitgaven = [
    uitgave({ uitgaven: 321.37 }),
    uitgave({ campagne: "T | Sales - DSA", uitgaven: 80.11 }),
    uitgave({ campagne: "T | Nooit een lead", uitgaven: 55.5 }),
    uitgave({ bron: "meta", campagne: "1. Acties - Multimerk - 2026", uitgaven: 99.99 }),
  ];
  const k = koppelLeads(
    [
      lead({ aantal: 7 }),
      lead({ aantal: 2, campagne: "T | Sales - DSA" }),
      lead({ aantal: 5, bronMedium: "facebook / paid", campagne: "1. Acties - Multimerk - 2026" }),
      lead({ aantal: 4, bronMedium: "google / organic", campagne: "(organic)" }),
      lead({ aantal: 3, bronMedium: "bing / cpc" }),
    ],
    uitgaven,
  );
  const toegerekend = som(k.regels.map((r) => r.kosten));
  assert.ok(Math.abs(toegerekend + k.zonderLead.uitgaven - k.uitgavenTotaal) < 1e-9);
  assert.ok(Math.abs(k.uitgavenTotaal - 556.97) < 1e-9);
  assert.equal(k.zonderLead.uitgaven, 55.5);
  assert.equal(k.zonderLead.campagnes, 1);
});

test("Bing-verkeer met dezelfde campagnenaam krijgt de kosten van Google niet", () => {
  const { regels } = koppelLeads(
    [lead({ aantal: 2 }), lead({ bronMedium: "bing / cpc", aantal: 5 })],
    [uitgave({ uitgaven: 100 })],
  );
  const google = regels.find((r) => r.platform === "google");
  const bing = regels.find((r) => r.platform === "microsoft");
  // Alle € 100 gaat naar de twee Google-leads; de Bing-leads tellen niet mee in de noemer.
  assert.equal(google?.kosten, 100);
  assert.equal(bing?.kosten, null);
  assert.equal(bing?.status, "geen-bron");
});

test("Google- en Meta-campagnes met dezelfde naam blijven gescheiden", () => {
  const { regels } = koppelLeads(
    [lead({ aantal: 1 }), lead({ bronMedium: "facebook / paid", aantal: 1 })],
    [uitgave({ uitgaven: 10 }), uitgave({ bron: "meta", uitgaven: 90 })],
  );
  assert.equal(regels.find((r) => r.platform === "google")?.kosten, 10);
  assert.equal(regels.find((r) => r.platform === "meta")?.kosten, 90);
});

test("onbetaald verkeer kost € 0 en is geen 'onbekend'", () => {
  const { regels } = koppelLeads(
    [lead({ bronMedium: "google / organic", campagne: "(organic)", aantal: 6 })],
    [uitgave()],
  );
  assert.equal(regels[0].kosten, 0);
  assert.equal(regels[0].status, "onbetaald");
  assert.equal(regels[0].platform, null);
});

test("betaald verkeer met een campagne die niet te vinden is, krijgt geen kosten — geen nul", () => {
  const { regels, campagnes } = koppelLeads(
    [
      lead({ campagne: "(not set)", aantal: 2 }),
      lead({ campagne: "Bestaat niet meer", aantal: 1 }),
    ],
    [uitgave({ uitgaven: 100 })],
  );
  assert.ok(regels.every((r) => r.status === "geen-match" && r.kosten === null));
  // De campagnes zonder kosten staan wél in de tabel, met de leads erbij.
  const onbekend = campagnes.filter((c) => c.uitgaven === null);
  assert.deepEqual(
    onbekend.map((c) => [c.campagne, c.leads]).sort(),
    [["(not set)", 2], ["Bestaat niet meer", 1]],
  );
});

test("een campagne met kosten en nul leads staat in 'zonder lead'", () => {
  const k = koppelLeads([], [uitgave({ uitgaven: 250 }), uitgave({ campagne: "Andere", uitgaven: 50 })]);
  assert.deepEqual(k.zonderLead, { uitgaven: 300, campagnes: 2 });
  assert.equal(k.uitgavenTotaal, 300);
  assert.equal(k.campagnes.length, 2);
  assert.ok(k.campagnes.every((c) => c.leads === 0));
});

test("een campagne met nul uitgaven en nul leads telt niet als 'zonder lead'", () => {
  const k = koppelLeads([], [uitgave({ uitgaven: 0 })]);
  assert.deepEqual(k.zonderLead, { uitgaven: 0, campagnes: 0 });
});

test("Meta's gedachtestreepje en GA4's gewone streepje zijn dezelfde campagne", () => {
  const { regels } = koppelLeads(
    [lead({ bronMedium: "facebook / paid", campagne: "4. Vacatures - Service Functies - Leads", aantal: 2 })],
    [uitgave({ bron: "meta", campagne: "4. Vacatures - Service Functies – Leads", uitgaven: 60 })],
  );
  assert.equal(regels[0].status, "toegerekend");
  assert.equal(regels[0].kosten, 60);
});

test("twee schrijfwijzen van één campagne tellen hun uitgaven op in plaats van er één weg te gooien", () => {
  const k = koppelLeads(
    [lead({ aantal: 2 })],
    [uitgave({ campagne: "T | Branding VDU", uitgaven: 70 }), uitgave({ campagne: "t | branding vdu", uitgaven: 30 })],
  );
  assert.equal(k.regels[0].kosten, 100);
  assert.equal(k.uitgavenTotaal, 100);
  assert.equal(k.campagnes.filter((c) => c.uitgaven !== null).length, 1);
});

test("het totaal aantal leads verandert niet door het koppelen", () => {
  const invoer = [
    lead({ aantal: 3 }),
    lead({ bronMedium: "(direct) / (none)", campagne: "(direct)", aantal: 4 }),
    lead({ bronMedium: "bing / cpc", aantal: 5 }),
    lead({ campagne: "(not set)", aantal: 6 }),
  ];
  const { regels } = koppelLeads(invoer, [uitgave()]);
  assert.equal(som(regels.map((r) => r.aantal)), 18);
  assert.equal(regels.length, invoer.length);
});

test("de campagnetabel staat op uitgaven, de campagnes zonder kosten onderaan", () => {
  const { campagnes } = koppelLeads(
    [lead({ campagne: "(not set)", aantal: 9 }), lead({ aantal: 1 })],
    [uitgave({ uitgaven: 10 }), uitgave({ campagne: "Duurder", uitgaven: 500 })],
  );
  assert.deepEqual(
    campagnes.map((c) => c.campagne),
    ["Duurder", "T | Branding VDU", "(not set)"],
  );
});

test("een Ads-campagne zonder naam telt mee in de uitgaven", () => {
  const k = koppelLeads([], [uitgave({ campagne: "", uitgaven: 40 })]);
  assert.equal(k.uitgavenTotaal, 40);
  assert.equal(k.zonderLead.uitgaven, 40);
});

test("de uitgaven per platform zijn de echte uitgaven, ook van campagnes zonder lead", () => {
  const k = koppelLeads(
    [lead({ aantal: 2 })],
    [
      uitgave({ uitgaven: 100 }),
      uitgave({ campagne: "Zonder lead", uitgaven: 50 }),
      uitgave({ bron: "meta", campagne: "Meta", uitgaven: 30 }),
    ],
  );
  assert.deepEqual(k.uitgavenPerPlatform, { google: 150, meta: 30 });
  assert.equal(k.uitgavenTotaal, 180);
});
