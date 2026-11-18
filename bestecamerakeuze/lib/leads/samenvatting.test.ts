import assert from "node:assert/strict";
import { test } from "node:test";
import { koppelLeads, type LeadInvoer, type LeadRegel } from "@/lib/leads/koppel";
import {
  GEEN_FILTERS,
  filterRegels,
  groepeer,
  heeftFilters,
  kostenPerLead,
  leadSoort,
  perDag,
  telTotalen,
} from "@/lib/leads/samenvatting";

function lead(over: Partial<LeadInvoer> = {}): LeadInvoer {
  return {
    datum: "2026-11-01",
    event: "generate_lead_proefrit",
    bronMedium: "google / cpc",
    campagne: "T | Branding VDU",
    merk: "Audi",
    model: "Q4 e-tron",
    formulier: "stock",
    aantal: 1,
    ...over,
  };
}

/** Vier leads: twee betaald met kosten, één betaald zonder kostenbron (Bing), één onbetaald. */
function voorbeeld(): LeadRegel[] {
  return koppelLeads(
    [
      lead({ aantal: 2 }),
      lead({ aantal: 2, merk: "Volkswagen", model: "Tiguan" }),
      lead({ bronMedium: "bing / cpc", aantal: 3 }),
      lead({ bronMedium: "google / organic", campagne: "(organic)", aantal: 5, merk: "", model: "" }),
    ],
    [{ bron: "google", campagne: "T | Branding VDU", uitgaven: 80, klikken: 10, vertoningen: 100 }],
  ).regels;
}

test("totalen onderscheiden betaald, onbetaald en betaald zonder bekende kosten", () => {
  const t = telTotalen(voorbeeld());
  assert.equal(t.leads, 12);
  assert.equal(t.betaald, 7);
  assert.equal(t.onbetaald, 5);
  assert.equal(t.metKosten, 4);
  assert.equal(t.zonderKosten, 3);
  assert.equal(t.kosten, 80);
});

test("kosten per lead deelt alleen door leads waarvan de kosten bekend zijn", () => {
  // De drie Bing-leads trekken het gemiddelde niet omlaag: niemand weet wat ze kostten.
  assert.equal(kostenPerLead(telTotalen(voorbeeld())), 20);
});

test("kosten per lead is niet te berekenen zonder bekende kosten", () => {
  const onbetaald = voorbeeld().filter((r) => r.platform === null);
  assert.equal(kostenPerLead(telTotalen(onbetaald)), null);
});

test("filteren op betaald en onbetaald", () => {
  const regels = voorbeeld();
  assert.equal(telTotalen(filterRegels(regels, { ...GEEN_FILTERS, betaald: "betaald" })).leads, 7);
  assert.equal(telTotalen(filterRegels(regels, { ...GEEN_FILTERS, betaald: "onbetaald" })).leads, 5);
  assert.equal(filterRegels(regels, GEEN_FILTERS).length, regels.length);
});

test("filteren op merk, ook op 'Onbekend' voor leads zonder merk", () => {
  const regels = voorbeeld();
  assert.equal(telTotalen(filterRegels(regels, { ...GEEN_FILTERS, merken: ["Audi"] })).leads, 5);
  assert.equal(telTotalen(filterRegels(regels, { ...GEEN_FILTERS, merken: ["Onbekend"] })).leads, 5);
});

test("filteren op kanaal en op event", () => {
  const regels = voorbeeld();
  assert.equal(telTotalen(filterRegels(regels, { ...GEEN_FILTERS, kanalen: ["Microsoft Ads"] })).leads, 3);
  assert.equal(telTotalen(filterRegels(regels, { ...GEEN_FILTERS, events: ["generate_lead_offerte"] })).leads, 0);
});

test("filteren op de ruwe sessiebron/medium van GA4", () => {
  const regels = voorbeeld();
  const cpc = filterRegels(regels, { ...GEEN_FILTERS, bronMedia: ["google / cpc"] });
  assert.equal(telTotalen(cpc).leads, 4);
  assert.ok(cpc.every((r) => r.bronMedium === "google / cpc"));
  // Meerdere waarden zijn een "of".
  assert.equal(
    telTotalen(filterRegels(regels, { ...GEEN_FILTERS, bronMedia: ["google / cpc", "bing / cpc"] })).leads,
    7,
  );
});

test("filteren op de ruwe sessiecampagne van GA4, ook een vulwaarde als (organic)", () => {
  const regels = voorbeeld();
  assert.equal(
    telTotalen(filterRegels(regels, { ...GEEN_FILTERS, campagnes: ["T | Branding VDU"] })).leads,
    7,
  );
  assert.equal(telTotalen(filterRegels(regels, { ...GEEN_FILTERS, campagnes: ["(organic)"] })).leads, 5);
});

test("een lege bron of campagne is te kiezen als 'Onbekend'", () => {
  const regels = koppelLeads(
    [lead({ bronMedium: "", campagne: "", aantal: 2 }), lead({ aantal: 5 })],
    [],
  ).regels;
  assert.equal(telTotalen(filterRegels(regels, { ...GEEN_FILTERS, bronMedia: ["Onbekend"] })).leads, 2);
  assert.equal(telTotalen(filterRegels(regels, { ...GEEN_FILTERS, campagnes: ["Onbekend"] })).leads, 2);
});

test("filters combineren als 'en' tussen de filters en 'of' binnen een filter", () => {
  const regels = voorbeeld();
  const filters = {
    ...GEEN_FILTERS,
    bronMedia: ["google / cpc", "bing / cpc"],
    campagnes: ["T | Branding VDU"],
    merken: ["Audi"],
  };
  // Google (2 Audi-leads) en Bing (3 Audi-leads) allebei binnen de campagne: 5.
  assert.equal(telTotalen(filterRegels(regels, filters)).leads, 5);
  // Één bron eruit, en alleen Google blijft over: de filters sluiten elkaar uit als "en".
  assert.equal(telTotalen(filterRegels(regels, { ...filters, bronMedia: ["google / cpc"] })).leads, 2);
  // Een ander merk dat bij geen enkele regel hoort: niets blijft over.
  assert.equal(telTotalen(filterRegels(regels, { ...filters, merken: ["Seat"] })).leads, 0);
});

test("heeftFilters ziet elk soort filter, ook de nieuwe", () => {
  assert.equal(heeftFilters(GEEN_FILTERS), false);
  assert.equal(heeftFilters({ ...GEEN_FILTERS, bronMedia: ["google / cpc"] }), true);
  assert.equal(heeftFilters({ ...GEEN_FILTERS, campagnes: ["x"] }), true);
  assert.equal(heeftFilters({ ...GEEN_FILTERS, kanalen: ["Direct"] }), true);
  assert.equal(heeftFilters({ ...GEEN_FILTERS, betaald: "onbetaald" }), true);
});

test("een filter verandert de kosten per rij niet", () => {
  // Kosten worden toegerekend vóór het filteren: de campagne kost wat ze kost, ook als
  // je maar één merk bekijkt.
  const audi = telTotalen(filterRegels(voorbeeld(), { ...GEEN_FILTERS, merken: ["Audi"] }));
  assert.equal(audi.kosten, 40);
});

test("groeperen zet de grootste groep bovenaan en verliest geen leads", () => {
  const regels = voorbeeld();
  const perMerk = groepeer(regels, (r) => r.merk || "Onbekend");
  assert.equal(perMerk.reduce((t, g) => t + g.leads, 0), 12);
  assert.equal(perMerk[0].sleutel, "Audi");
  assert.equal(perMerk.reduce((t, g) => t + g.kosten, 0), 80);
});

test("groepen met gelijk aantal staan alfabetisch", () => {
  const regels = koppelLeads(
    [lead({ merk: "Škoda" }), lead({ merk: "Audi" }), lead({ merk: "CUPRA" })],
    [],
  ).regels;
  assert.deepEqual(
    groepeer(regels, (r) => r.merk).map((g) => g.sleutel),
    ["Audi", "CUPRA", "Škoda"],
  );
});

test("per dag staan ook de dagen zonder lead, en betaald en onbetaald apart", () => {
  const regels = koppelLeads(
    [
      lead({ datum: "2026-11-01", aantal: 2 }),
      lead({ datum: "2026-11-03", aantal: 4, bronMedium: "google / organic", campagne: "(organic)" }),
    ],
    [],
  ).regels;
  const dagen = perDag(regels, "2026-11-01", "2026-11-04");
  assert.deepEqual(
    dagen.map((d) => [d.datum, d.betaald, d.onbetaald]),
    [
      ["2026-11-01", 2, 0],
      ["2026-11-02", 0, 0],
      ["2026-11-03", 0, 4],
      ["2026-11-04", 0, 0],
    ],
  );
});

test("de aangewezen events hebben een leesbare naam", () => {
  assert.equal(leadSoort("bedanktpagina_werkplaatsplanner"), "Werkplaatsplanner (bedankpagina)");
  assert.equal(leadSoort("verhuur_aanvraag"), "Autoverhuur aanvraag");
  assert.equal(leadSoort("verhuuractie_verzonden"), "Verhuuractie verzonden");
  assert.equal(leadSoort("verhuur_losse_formulieren"), "Verhuur losse formulieren");
  assert.equal(leadSoort("offerte_onderhoud"), "Offerte onderhoud");
});

test("een leesbare naam voor een leadevent", () => {
  assert.equal(leadSoort("generate_lead_proefrit"), "Proefrit");
  assert.equal(leadSoort("generate_lead_zakelijk_offerte"), "Zakelijk offerte");
  assert.equal(leadSoort("generate_lead"), "Algemeen");
  assert.equal(leadSoort("generate_lead_HMODH"), "HMODH");
  assert.equal(leadSoort("generate_lead_privatelease"), "Privatelease");
  assert.equal(leadSoort("generate_lead_private_lease"), "Private lease");
});
