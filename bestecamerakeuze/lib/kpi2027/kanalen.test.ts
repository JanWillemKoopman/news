import assert from "node:assert/strict";
import { test } from "node:test";
import { vindWebsite } from "@/lib/kpi2027/definities";
import { KANALEN, kanaalVoor, kanalenVoorKpi, maandenTussen, verdelingUitRijen } from "@/lib/kpi2027/kanalen";

test("de bron/media die udenhout.nl werkelijk binnenkrijgt, vallen in de bedoelde groep", () => {
  const verwacht: Record<string, string> = {
    "google / cpc": "google-ads",
    "google / display": "google-ads",
    "facebook / paid": "meta-ads",
    "fb / paid": "meta-ads",
    "facebook / paid-social": "meta-ads",
    "fb / Facebook_Mobile_Feed": "meta-ads",
    "fb / Facebook_Mobile_Reels": "meta-ads",
    "ig / Instagram_Stories": "meta-ads",
    "bing / cpc": "overig-betaald",
    "linkedin / paid": "overig-betaald",
    "DPG / cpc": "overig-betaald",
    "criteo / display": "overig-betaald",
    "optout / cpc": "overig-betaald",
    "google / organic": "organisch-zoeken",
    "bing / organic": "organisch-zoeken",
    "duckduckgo / organic": "organisch-zoeken",
    "ecosia.org / organic": "organisch-zoeken",
    "gmb / organic": "organisch-zoeken",
    "googlemijnbedrijf / vermelding": "organisch-zoeken",
    "googlemijnbedrijf / Vermelding": "organisch-zoeken",
    "google_mijn_bedrijf / vermelding": "organisch-zoeken",
    "nl.search.yahoo.com / referral": "organisch-zoeken",
    "search.brave.com / referral": "organisch-zoeken",
    "m.facebook.com / referral": "social-organisch",
    "l.facebook.com / referral": "social-organisch",
    "facebook.com / referral": "social-organisch",
    "l.instagram.com / referral": "social-organisch",
    "linkedin.com / referral": "social-organisch",
    "whatsapp / social": "social-organisch",
    "l.wl.co / referral": "social-organisch",
    "linktr.ee / referral": "social-organisch",
    "gaspedaal.nl / referral": "autoportals",
    "gaspedaal / app": "autoportals",
    "autotrack / referral": "autoportals",
    "nl.jp.cars / referral": "autoportals",
    "(direct) / (none)": "direct",
    "chatgpt.com / organic": "overig",
    "chatgpt.com / ai-assistant": "overig",
    "chatgpt.com / (not set)": "overig",
    "Nieuwsbrief / email": "overig",
    "werkplaats.volkswagen.nl / referral": "overig",
    "nl.pepper.com / referral": "overig",
    "udenhoutlease.nl / referral": "overig",
    "192.168.200.1:1000 / referral": "overig",
    "statics.teams.cdn.office.net / referral": "overig",
    "ntp.msn.com / referral": "overig",
    "(not set)": "overig",
    "(data not available)": "overig",
    "": "overig",
  };
  for (const [bm, kanaal] of Object.entries(verwacht)) assert.equal(kanaalVoor(bm), kanaal, bm);
});

test("een korte naam past op het domein, niet op een domein waar hij toevallig in staat", () => {
  assert.equal(kanaalVoor("netflix.com / referral"), "overig"); // geen x.com
  assert.equal(kanaalVoor("tig.nl / referral"), "overig"); // geen ig
  assert.equal(kanaalVoor("t.co / referral"), "social-organisch");
});

test("acht groepen: meer kleuren is in een gestapelde grafiek niet te lezen", () => {
  assert.equal(KANALEN.length, 8);
  assert.equal(new Set(KANALEN.map((k) => k.sleutel)).size, 8);
});

test("maanden van januari 2025 t/m de maand van de peildatum", () => {
  const m = maandenTussen("2025-01-01", "2026-11-14");
  assert.equal(m.length, 23);
  assert.equal(m[0], "2025-01");
  assert.equal(m[11], "2025-12");
  assert.equal(m[22], "2026-11");
});

test("verdeling: ingedeeld per maand en bron, uitgesloten hosts weg, totaal per KPI klopt", () => {
  const udenhout = vindWebsite("udenhout")!;
  const v = verdelingUitRijen(
    { ...udenhout, uitgeslotenHosts: ["staging.udenhout.nl"] },
    {
      verkeer: [
        { year_month: "202501", session_source_medium: "google / cpc", sessions: 100, active_users: 80 },
        { year_month: "202501", session_source_medium: "gaspedaal / app", sessions: 50, active_users: 40 },
        { year_month: "202501", session_source_medium: "gaspedaal.nl / referral", sessions: 25, active_users: 20 },
        { year_month: "202602", session_source_medium: "(direct) / (none)", sessions: 10, active_users: 9 },
      ],
      events: [
        { year_month: "202501", session_source_medium: "google / cpc", event_name: "generate_lead_proefrit_aanvraag", hostname: "www.udenhout.nl", event_count: 3 },
        { year_month: "202501", session_source_medium: "fb / paid", event_name: "generate_lead_proefrit_aanvraag", hostname: "(not set)", event_count: 1 },
        { year_month: "202604", session_source_medium: "google / organic", event_name: "generate_lead_proefrit", hostname: "www.udenhout.nl", event_count: 2 },
        { year_month: "202501", session_source_medium: "google / cpc", event_name: "generate_lead_proefrit_aanvraag", hostname: "staging.udenhout.nl", event_count: 9 },
        { year_month: "202501", session_source_medium: "google / cpc", event_name: "click", hostname: "www.udenhout.nl", event_count: 99 },
      ],
    },
    "2026-04-11",
    ["generate_lead_proefrit_aanvraag", "generate_lead_proefrit"],
  );

  assert.deepEqual(v.bronnen.sessies["2025-01"], { "google-ads": 100, autoportals: 75 });
  assert.deepEqual(v.voorbeelden.autoportals?.map((x) => x.bronMedium), ["gaspedaal / app", "gaspedaal.nl / referral"]);

  const proefrit = udenhout.kpis.find((k) => k.sleutel === "proefritaanvragen")!;
  const k = kanalenVoorKpi(proefrit, v);
  assert.equal(k.maanden.length, 16); // jan 2025 t/m apr 2026
  const jan = k.maanden[0];
  assert.equal(jan.totaal, 4);
  assert.equal(jan.perKanaal[KANALEN.findIndex((x) => x.sleutel === "google-ads")], 3);
  assert.equal(jan.perKanaal[KANALEN.findIndex((x) => x.sleutel === "meta-ads")], 1);
  assert.equal(k.maanden[15].perKanaal[KANALEN.findIndex((x) => x.sleutel === "organisch-zoeken")], 2);
  // Een maand zonder iets is nul, geen gat.
  assert.equal(k.maanden[5].totaal, 0);
  assert.equal(k.maanden[5].perKanaal.length, 8);

  const gebruikers = udenhout.kpis.find((x) => x.sleutel === "gebruikers")!;
  assert.equal(kanalenVoorKpi(gebruikers, v).maanden[0].totaal, 140);
});

test("kanaalverdeling en KPI-pagina tellen dezelfde bronnen: het totaal per maand is gelijk", async () => {
  const { kpiMaandTotaal } = await import("@/lib/kpi2027/rekenen");
  const udenhout = vindWebsite("udenhout")!;
  const proefrit = udenhout.kpis.find((k) => k.sleutel === "proefritaanvragen")!;
  const stand = {
    website: "udenhout",
    jaar: 2026,
    peildatum: "2026-04-11",
    berekendOp: "2026-04-12T10:15:00Z",
    definitief: false,
    dagen: {
      "event:generate_lead_proefrit_aanvraag": { "2026-03-02": 2, "2026-03-20": 1 },
      "event:generate_lead_proefrit": { "2026-04-03": 4, "2026-04-15": 9 },
    },
    gebruikers: new Array(12).fill(0),
  };
  const v = verdelingUitRijen(
    udenhout,
    {
      verkeer: [{ year_month: "202603", session_source_medium: "google / cpc", sessions: 1, active_users: 1 }],
      events: [
        { year_month: "202603", session_source_medium: "google / cpc", event_name: "generate_lead_proefrit_aanvraag", hostname: "www.udenhout.nl", event_count: 2 },
        { year_month: "202603", session_source_medium: "(direct) / (none)", event_name: "generate_lead_proefrit_aanvraag", hostname: "www.udenhout.nl", event_count: 1 },
        { year_month: "202604", session_source_medium: "gaspedaal.nl / referral", event_name: "generate_lead_proefrit", hostname: "www.udenhout.nl", event_count: 4 },
      ],
    },
    "2026-04-11",
    ["generate_lead_proefrit_aanvraag", "generate_lead_proefrit"],
  );
  const k = kanalenVoorKpi(proefrit, v);
  const maart = k.maanden.find((m) => m.maand === "2026-03")!;
  const april = k.maanden.find((m) => m.maand === "2026-04")!;
  assert.equal(maart.totaal, kpiMaandTotaal(proefrit, stand, "2026-03"));
  // Na de peildatum telt de stand niet mee (de 9 op 15 april).
  assert.equal(april.totaal, kpiMaandTotaal(proefrit, stand, "2026-04"));
  assert.equal(kpiMaandTotaal(proefrit, stand, "2025-12"), null);
});

test("controle naast de kanaalverdeling: een optellende bron van een andere property telt niet mee", async () => {
  const { kpiMaandTotaal, dagwaardenVoor } = await import("@/lib/kpi2027/rekenen");
  const zakelijk = vindWebsite("udenhout")!.kpis.find((k) => k.sleutel === "zakelijke-lease")!;
  assert.ok(zakelijk.externeBron?.optellen, "zakelijke lease telt udenhoutlease.nl op");
  const stand = {
    website: "udenhout",
    jaar: 2026,
    peildatum: "2026-11-14",
    berekendOp: "2026-11-15T10:15:00Z",
    definitief: false,
    dagen: { "event:generate_lead_zakelijk_lease": { "2026-01-15": 1 } },
    gebruikers: new Array(12).fill(0),
  };
  const kpiGrafiekJan = Object.entries(dagwaardenVoor(zakelijk, stand))
    .filter(([d]) => d.startsWith("2026-01-"))
    .reduce((t, [, n]) => t + n, 0);
  assert.ok(kpiGrafiekJan > 1, "de KPI-grafiek telt udenhoutlease.nl wel mee");
  assert.equal(kpiMaandTotaal(zakelijk, stand, "2026-01"), 1);
});
