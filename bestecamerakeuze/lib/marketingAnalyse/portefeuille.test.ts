import assert from "node:assert/strict";
import { test } from "node:test";
import { isOnvolledigeWeek, leadTempo, looptijdOp, portefeuille, versieVerschil, type PortefeuilleInvoer } from "./portefeuille.ts";

/** De vier campagne-analyses zoals ze op 27 november 2026 in het overzicht stonden (laatste versie). */
const regels: PortefeuilleInvoer[] = [
  {
    id: "audi",
    naam: "Audi A2",
    bedrijven: ["Van den Udenhout"],
    budget: 3150,
    doel: "20 proefritten",
    startdatum: "2026-09-18",
    einddatum: "2026-12-31",
    laatsteAnalyse: {
      geanalyseerdOp: "2026-11-27T17:05:21Z",
      periodeTot: "2026-11-26",
      kerncijfers: { kosten: 2064.42, klikken: 13261, vertoningenAds: 546609, sessies: 4371, leadBron: "ga4", leadsGa4: 20, leadsDoel: 20, doelLeads: 20, leadsDoelSoort: "proefritten" },
    },
  },
  {
    id: "multimerk",
    naam: "Multimerk Actieshow",
    bedrijven: ["Van den Udenhout"],
    budget: 8500,
    doel: "Doel is 100 leads via de website.",
    startdatum: "2026-10-07",
    einddatum: "2026-12-07",
    laatsteAnalyse: {
      geanalyseerdOp: "2026-11-27T17:10:57Z",
      periodeTot: "2026-11-26",
      kerncijfers: { kosten: 5464.16, klikken: 4941, vertoningenAds: 580902, sessies: 4706, leadBron: "ga4", leadsGa4: 80, leadsDoel: 80, doelLeads: 100 },
    },
  },
  {
    id: "skoda",
    naam: "Škoda herfstvoordeel",
    bedrijven: ["Van den Udenhout"],
    budget: 2100,
    doel: "Offerte- en proefritaanvragen voor Škoda via de actiepagina",
    startdatum: "2026-09-28",
    einddatum: "2026-12-07",
    laatsteAnalyse: {
      geanalyseerdOp: "2026-11-27T17:14:47Z",
      periodeTot: "2026-11-26",
      kerncijfers: { kosten: 1783.37, klikken: 7894, vertoningenAds: 337463, sessies: 2366, leadBron: "ga4", leadsGa4: 1, leadsDoel: 1, doelLeads: null },
    },
  },
  {
    id: "werkplaats",
    naam: "Werkplaatscampagne Dealerstempel",
    bedrijven: ["Porsche Centrum Brabant"],
    budget: 1000,
    doel: null,
    startdatum: "2026-11-11",
    einddatum: "2026-12-31",
    laatsteAnalyse: {
      geanalyseerdOp: "2026-11-27T17:17:48Z",
      periodeTot: "2026-11-26",
      kerncijfers: { kosten: 154.02, klikken: 535, vertoningenAds: 18253, sessies: 125, leadBron: "ga4", leadsGa4: 0, leadsDoel: 0, doelLeads: null },
    },
  },
];

test("looptijdOp: dag 70 van 105 voor de A2 op 26 november", () => {
  const t = looptijdOp("2026-09-18", "2026-12-31", "2026-11-26");
  assert.equal(t?.dag, 70);
  assert.equal(t?.dagen, 105);
  assert.ok(Math.abs((t?.pct ?? 0) - 66.67) < 0.01);
  assert.equal(looptijdOp(null, "2026-12-31", "2026-11-26"), null);
});

test("portefeuille: totalen zijn de som van de overzichtscijfers", () => {
  const p = portefeuille(regels, "2026-11-27");
  assert.equal(p.aantal, 4);
  assert.equal(p.aantalLive, 4);
  assert.ok(Math.abs((p.kosten ?? 0) - 9465.97) < 0.001);
  assert.equal(p.budget, 14750);
  assert.equal(p.leads, 101);
  assert.equal(p.bezoekers, 11568);
  // CTR gewogen: alle klikken ÷ alle advertentievertoningen.
  assert.ok(Math.abs((p.ctr ?? 0) - (26631 / 1483227) * 100) < 1e-9);
  assert.equal(p.standTot, "2026-11-26");
});

test("portefeuille: leaddoel alleen over de campagnes met een aantal in het doel", () => {
  const p = portefeuille(regels, "2026-11-27");
  assert.equal(p.aantalMetDoel, 2);
  assert.equal(p.leadsMetDoel, 100);
  assert.equal(p.doelLeads, 120);
  // A2: 20 × 70/105; Multimerk: 100 × 51/62.
  assert.ok(Math.abs((p.verwachtLeads ?? 0) - (20 * (70 / 105) + 100 * (51 / 62))) < 1e-9);
  assert.equal(p.leadTempo, "op-koers");
});

test("portefeuille: kosten tegen het verwachte tempo van de looptijd", () => {
  const p = portefeuille(regels, "2026-11-27");
  const verwacht = 3150 * (70 / 105) + 8500 * (51 / 62) + 2100 * (60 / 71) + 1000 * (16 / 51);
  assert.ok(Math.abs((p.verwachtKosten ?? 0) - verwacht) < 1e-9);
  assert.equal(p.kostenTempo, "te-langzaam");
  const multimerk = p.campagnes.find((c) => c.id === "multimerk");
  assert.equal(multimerk?.kostenTempo, "te-langzaam");
  assert.equal(p.campagnes.find((c) => c.id === "audi")?.kostenTempo, "op-schema");
});

test("kosten per lead: nul leads bij uitgaven is geen nul en geen deling door nul", () => {
  const p = portefeuille(regels, "2026-11-27");
  const werkplaats = p.campagnes.find((c) => c.id === "werkplaats");
  assert.equal(werkplaats?.leads, 0);
  assert.equal(werkplaats?.kostenPerLead, null);
  assert.equal(werkplaats?.kplReden, "geen-leads");
  const audi = p.campagnes.find((c) => c.id === "audi");
  assert.ok(Math.abs((audi?.kostenPerLead ?? 0) - 103.221) < 0.001);
  assert.equal(audi?.kplReden, null);
});

test("aandeel per campagne tegen het totaal in beeld", () => {
  const p = portefeuille(regels, "2026-11-27");
  const multimerk = p.campagnes.find((c) => c.id === "multimerk");
  assert.ok(Math.abs((multimerk?.aandeelLeads ?? 0) - (80 / 101) * 100) < 1e-9);
  assert.ok(Math.abs((multimerk?.aandeelKosten ?? 0) - (5464.16 / 9465.97) * 100) < 1e-9);
});

test("zonder analyse telt een campagne nergens mee als nul", () => {
  const p = portefeuille([...regels, { ...regels[0], id: "nieuw", laatsteAnalyse: null }], "2026-11-27");
  assert.equal(p.leads, 101);
  assert.equal(p.aantalGeanalyseerd, 4);
  const nieuw = p.campagnes.find((c) => c.id === "nieuw");
  assert.equal(nieuw?.kosten, null);
  assert.equal(nieuw?.kplReden, "niet-gemeten");
});

test("leadTempo: een gehaald doel is nooit achter", () => {
  assert.equal(leadTempo(100, 67), "voor");
  assert.equal(leadTempo(60, 67), "op-koers");
  assert.equal(leadTempo(40, 67), "achter");
  assert.equal(leadTempo(null, 67), null);
});

test("versieVerschil: absoluut en relatief, geen percentage vanaf nul", () => {
  assert.deepEqual(versieVerschil(2064.42, 2016.82)?.absoluut.toFixed(2), "47.60");
  assert.equal(versieVerschil(5, 0)?.relatief, null);
  assert.equal(versieVerschil(null, 3), null);
});

test("isOnvolledigeWeek: eerste en laatste week van de periode", () => {
  assert.equal(isOnvolledigeWeek("2026-09-14", "2026-09-18", "2026-11-26"), true);
  assert.equal(isOnvolledigeWeek("2026-09-21", "2026-09-18", "2026-11-26"), false);
  assert.equal(isOnvolledigeWeek("2026-11-23", "2026-09-18", "2026-11-26"), true);
  assert.equal(isOnvolledigeWeek("week 3", "2026-09-18", "2026-11-26"), false);
});
