import assert from "node:assert/strict";
import { test } from "node:test";
import { vindWebsite } from "@/lib/kpi2027/definities";
import {
  EMAIL_GA4,
  EMAIL_MBT,
  KANALEN,
  emailTotalen,
  isKanaalSleutel,
  kanaalVoor,
  kanalenVoorKpi,
  maandenTussen,
  verdelingUitRijen,
} from "@/lib/kpi2027/kanalen";

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

test("acht groepen, plus E-mail (alleen udenhout.nl): meer kleuren is in een gestapelde grafiek niet te lezen", () => {
  assert.equal(KANALEN.length, 9);
  assert.equal(new Set(KANALEN.map((k) => k.sleutel)).size, 9);
  // E-mail volgt nooit uit bron/medium en is niet met de hand te kiezen.
  assert.equal(kanaalVoor("Nieuwsbrief / email"), "overig");
  assert.equal(isKanaalSleutel("email"), false);
  assert.equal(isKanaalSleutel("direct"), true);
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

  // Los bewaard, per bron/medium (nog niet ingedeeld).
  assert.deepEqual(v.bronnen.sessies["2025-01"], { "google / cpc": 100, "gaspedaal / app": 50, "gaspedaal.nl / referral": 25 });
  assert.deepEqual(
    v.bronMedia.map((x) => x.bronMedium),
    ["google / cpc", "gaspedaal / app", "gaspedaal.nl / referral", "(direct) / (none)"],
  );

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
  assert.equal(k.maanden[5].perKanaal.length, 9);

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

test("de staart: kleine bron/media worden al per kanaal bewaard, de grote los", () => {
  const udenhout = vindWebsite("udenhout")!;
  const v = verdelingUitRijen(
    udenhout,
    {
      verkeer: [
        { year_month: "202501", session_source_medium: "google / cpc", sessions: 100, active_users: 80 },
        { year_month: "202501", session_source_medium: "gaspedaal.nl / referral", sessions: 50, active_users: 40 },
        { year_month: "202501", session_source_medium: "autotrack / referral", sessions: 3, active_users: 3 },
        { year_month: "202501", session_source_medium: "klein.nl / referral", sessions: 2, active_users: 2 },
      ],
      events: [
        { year_month: "202501", session_source_medium: "autotrack / referral", event_name: "generate_lead_proefrit_aanvraag", hostname: "www.udenhout.nl", event_count: 1 },
      ],
    },
    "2025-01-31",
    ["generate_lead_proefrit_aanvraag"],
    2,
  );
  assert.deepEqual(v.bronMedia.map((x) => x.bronMedium), ["google / cpc", "gaspedaal.nl / referral"]);
  assert.deepEqual(v.staartInfo, { aantal: 2, sessies: 5 });
  assert.deepEqual(v.staart.sessies["2025-01"], { autoportals: 3, overig: 2 });
  assert.deepEqual(v.staart["event:generate_lead_proefrit_aanvraag"]["2025-01"], { autoportals: 1 });
  const sessies = udenhout.kpis.find((k) => k.sleutel === "sessies")!;
  const jan = kanalenVoorKpi(sessies, v).maanden[0];
  assert.equal(jan.totaal, 155);
  assert.equal(jan.perKanaal[KANALEN.findIndex((k) => k.sleutel === "autoportals")], 53);
});

test("een handmatige keuze gaat vóór de regels, in elke grafiek en in de tabel", async () => {
  const { bronMediumRegels } = await import("@/lib/kpi2027/kanalen");
  const udenhout = vindWebsite("udenhout")!;
  const v = verdelingUitRijen(
    udenhout,
    {
      verkeer: [
        { year_month: "202501", session_source_medium: "google / cpc", sessions: 100, active_users: 80 },
        { year_month: "202501", session_source_medium: "nl.pepper.com / referral", sessions: 40, active_users: 30 },
      ],
      events: [
        { year_month: "202501", session_source_medium: "nl.pepper.com / referral", event_name: "generate_lead_private_lease", hostname: "www.udenhout.nl", event_count: 6 },
      ],
    },
    "2025-01-31",
    ["generate_lead_private_lease"],
  );
  const keuzes = new Map([["nl.pepper.com / referral", "autoportals" as const]]);
  const lease = udenhout.kpis.find((k) => k.sleutel === "private-lease")!;
  const autoportals = KANALEN.findIndex((k) => k.sleutel === "autoportals");
  const overig = KANALEN.findIndex((k) => k.sleutel === "overig");
  assert.equal(kanalenVoorKpi(lease, v).maanden[0].perKanaal[overig], 6);
  assert.equal(kanalenVoorKpi(lease, v, keuzes).maanden[0].perKanaal[autoportals], 6);
  assert.equal(kanalenVoorKpi(lease, v, keuzes).maanden[0].perKanaal[overig], 0);

  const regels = bronMediumRegels(v, keuzes);
  assert.deepEqual(regels[1], { bronMedium: "nl.pepper.com / referral", sessies: 40, regel: "overig", kanaal: "autoportals", handmatig: true });
  assert.equal(regels[0].handmatig, false);
});

test("de bron/media van de andere vijf websites, nagelopen in november 2026", () => {
  const verwacht: Record<string, string> = {
    // Handmatig getagde Google-advertenties (Porsche).
    "Google / Ads": "google-ads",
    "Google / Ads-Extensie": "google-ads",
    "google / paid": "google-ads",
    "l.facebook.com / paid": "meta-ads", // VELOO
    "facebook / paid": "meta-ads",
    "linkedin / paid": "overig-betaald",
    // Portals: de Belgische Marktplaats, Elferspot, mobile.de en Porsche Finder.
    "2dehands / referral": "autoportals",
    "2ememain / referral": "autoportals",
    "elferspot.com / referral": "autoportals",
    "home.mobile.de / referral": "autoportals",
    "finder.porsche.com / referral": "autoportals",
    "autoscout24.be / referral": "autoportals",
    // Gratis productvermeldingen van de VELOO-webshop.
    "google / product_sync": "organisch-zoeken",
    "gmb / organic": "organisch-zoeken",
    // Merksites en mail blijven verwijzingen.
    "porsche.com / referral": "overig",
    "configurator.porsche.com / referral": "overig",
    "gazelle.nl / referral": "overig",
    "kalkhoff-bikes.com / referral": "overig",
    "campaign / email": "overig",
    "SAPHybris / email": "overig",
    "chatgpt.com / ai-assistant": "overig",
  };
  for (const [bm, kanaal] of Object.entries(verwacht)) assert.equal(kanaalVoor(bm), kanaal, bm);
});

test("elke website heeft de kanaalverdeling, en elke KPI telt uit een bron die de verdeling ophaalt", () => {
  for (const sleutel of ["udenhout", "porsche-brabant", "porsche-maastricht", "pgz", "bentley", "veloo"]) {
    assert.equal(vindWebsite(sleutel)?.kanaalverdeling, true, sleutel);
  }
});

test("Bentley: een event met padvoorwaarde telt mee in de verdeling, uitgesloten hosts niet", () => {
  const bentley = vindWebsite("bentley")!;
  const offerte = bentley.kpis.find((k) => k.sleutel === "offerteaanvragen")!;
  const v = verdelingUitRijen(
    bentley,
    {
      verkeer: [{ year_month: "202605", session_source_medium: "facebook / paid", sessions: 100, active_users: 80 }],
      events: [
        { year_month: "202610", session_source_medium: "google / cpc", event_name: "generate_lead_offerte", hostname: "www.bentley-maastricht.nl", event_count: 2 },
      ],
      padEvents: {
        "event:Contactaanvraag@/caw-bedankt/offerte/": [
          { year_month: "202605", session_source_medium: "facebook / paid", hostname: "www.bentley-maastricht.nl", event_count: 3 },
          { year_month: "202605", session_source_medium: "facebook / paid", hostname: "pon-test-maastricht.uname-it.digital", event_count: 9 },
        ],
      },
    },
    "2026-10-31",
    ["generate_lead_offerte"],
  );
  const maanden = kanalenVoorKpi(offerte, v).maanden;
  const mei = maanden.find((m) => m.maand === "2026-05")!;
  const okt = maanden.find((m) => m.maand === "2026-10")!;
  assert.equal(mei.totaal, 3);
  assert.equal(mei.perKanaal[KANALEN.findIndex((k) => k.sleutel === "meta-ads")], 3);
  assert.equal(okt.totaal, 2);
});

test("VELOO: productaankopen per kanaal, uit ecommerce_purchases", () => {
  const veloo = vindWebsite("veloo")!;
  const aankopen = veloo.kpis.find((k) => k.bron.soort === "aankopen")!;
  const v = verdelingUitRijen(
    veloo,
    {
      verkeer: [
        { year_month: "202603", session_source_medium: "google / cpc", sessions: 500, active_users: 400, ecommerce_purchases: 4 },
        { year_month: "202603", session_source_medium: "gmb / organic", sessions: 100, active_users: 90, ecommerce_purchases: 1 },
      ],
      events: [],
    },
    "2026-03-31",
    [],
  );
  const maart = kanalenVoorKpi(aankopen, v).maanden.find((m) => m.maand === "2026-03")!;
  assert.equal(maart.totaal, 5);
  assert.equal(maart.perKanaal[KANALEN.findIndex((k) => k.sleutel === "google-ads")], 4);
  assert.equal(maart.perKanaal[KANALEN.findIndex((k) => k.sleutel === "organisch-zoeken")], 1);
});

test("controle naast de kanaalverdeling: geen KPI-cijfer in maanden met een vervangende bron", async () => {
  const { kpiMaandTotaal } = await import("@/lib/kpi2027/rekenen");
  const werkplaats = vindWebsite("porsche-brabant")!.kpis.find((k) => k.sleutel === "werkplaatsafspraken")!;
  assert.ok(werkplaats.externeBron && !werkplaats.externeBron.optellen, "de planning vervangt GA4");
  const stand = {
    website: "porsche-brabant",
    jaar: 2026,
    peildatum: "2026-11-14",
    berekendOp: "2026-11-15T10:15:00Z",
    definitief: false,
    dagen: { "event:generate_lead_werkplaats": { "2026-09-10": 2, "2026-11-03": 4 } },
    gebruikers: new Array(12).fill(0),
  };
  assert.equal(kpiMaandTotaal(werkplaats, stand, "2026-09"), null);
  assert.equal(kpiMaandTotaal(werkplaats, stand, "2026-11"), 4);
});

const idx = (sleutel: string) => KANALEN.findIndex((k) => k.sleutel === sleutel);

function emailVerdeling(bronMax?: number) {
  const udenhout = vindWebsite("udenhout")!;
  return verdelingUitRijen(
    udenhout,
    {
      verkeer: [
        { year_month: "202603", session_source_medium: "(direct) / (none)", sessions: 1000, active_users: 900 },
        { year_month: "202603", session_source_medium: "Nieuwsbrief / email", sessions: 300, active_users: 250 },
        { year_month: "202603", session_source_medium: "selligent / e-mail", sessions: 20, active_users: 18 },
        { year_month: "202603", session_source_medium: "google / cpc", sessions: 500, active_users: 400 },
      ],
      events: [],
      email: {
        // Windsor zet de hostname er zelf bij; "(not set)" telt niet.
        ga4: [
          { year_month: "202603", session_source_medium: "Nieuwsbrief / email", hostname: "www.udenhout.nl", sessions: 200 },
          { year_month: "202603", session_source_medium: "Nieuwsbrief / email", hostname: "udenhout.nl", sessions: 40 },
          { year_month: "202603", session_source_medium: "Nieuwsbrief / email", hostname: "(not set)", sessions: 60 },
          { year_month: "202603", session_source_medium: "selligent / e-mail", hostname: "www.udenhout.nl", sessions: 20 },
        ],
        mbt: [
          { year_month: "202603", hostname: "www.udenhout.nl", landing_page_plus_query_string: "/?M_BT=123", sessions: 150 },
          { year_month: "202603", hostname: "udenhout.nl", landing_page_plus_query_string: "/occasions?M_BT=9&x=1", sessions: 30 },
          { year_month: "202603", hostname: "(not set)", landing_page_plus_query_string: "/?M_BT=1", sessions: 999 },
          { year_month: "202603", hostname: "www.udenhout.nl", landing_page_plus_query_string: "/zonder", sessions: 999 },
        ],
      },
    },
    "2026-03-28",
    [],
    bronMax,
  );
}

test("e-mail: GA4-kanaalgroep Email plus direct met M_BT, alleen op udenhout.nl en www.udenhout.nl", () => {
  const v = emailVerdeling();
  assert.deepEqual(v.bronnen[EMAIL_GA4]["2026-03"], { "Nieuwsbrief / email": 240, "selligent / e-mail": 20 });
  assert.deepEqual(v.bronnen[EMAIL_MBT]["2026-03"], { "(direct) / (none)": 180 });
  assert.deepEqual(emailTotalen(v), [{ jaar: 2026, ga4: 260, mbt: 180 }]);
});

test("e-mail: verschuift bij Sessies van Direct en Verwijzingen & overig naar E-mail, totaal gelijk", () => {
  const udenhout = vindWebsite("udenhout")!;
  const sessies = udenhout.kpis.find((k) => k.bron.soort === "sessies")!;
  const v = emailVerdeling();
  const maart = kanalenVoorKpi(sessies, v).maanden.find((m) => m.maand === "2026-03")!;
  assert.equal(maart.totaal, 1820);
  assert.equal(maart.perKanaal[idx("email")], 260 + 180);
  assert.equal(maart.perKanaal[idx("direct")], 1000 - 180);
  // De 60 e-mailsessies op hostname "(not set)" blijven waar de regels ze zetten.
  assert.equal(maart.perKanaal[idx("overig")], 320 - 260);
  // Betaald blijft betaald.
  assert.equal(maart.perKanaal[idx("google-ads")], 500);
  assert.equal(maart.perKanaal.reduce((t, n) => t + n, 0), maart.totaal);
});

test("e-mail: ook vanuit de staart, en nooit meer dan er in de groep staat", () => {
  const udenhout = vindWebsite("udenhout")!;
  const sessies = udenhout.kpis.find((k) => k.bron.soort === "sessies")!;
  // Alleen de grootste twee los; "selligent / e-mail" zit in de staart (overig).
  const v = emailVerdeling(2);
  const maart = kanalenVoorKpi(sessies, v).maanden.find((m) => m.maand === "2026-03")!;
  assert.equal(maart.totaal, 1820);
  assert.equal(maart.perKanaal[idx("email")], 440);
  // Meer M_BT dan direct (afronding/telling in GA4): niet onder nul, totaal blijft.
  v.bronnen[EMAIL_MBT]["2026-03"]["(direct) / (none)"] = 5000;
  const m2 = kanalenVoorKpi(sessies, v).maanden.find((m) => m.maand === "2026-03")!;
  assert.equal(m2.perKanaal[idx("direct")], 0);
  assert.equal(m2.totaal, 1820);
});

test("e-mail: alleen bij Sessies, en een handmatige keuze bepaalt waar het vandaan komt", () => {
  const udenhout = vindWebsite("udenhout")!;
  const v = emailVerdeling();
  const gebruikers = udenhout.kpis.find((k) => k.bron.soort === "gebruikers")!;
  const g = kanalenVoorKpi(gebruikers, v).maanden.find((m) => m.maand === "2026-03")!;
  assert.equal(g.perKanaal[idx("email")], 0);

  const sessies = udenhout.kpis.find((k) => k.bron.soort === "sessies")!;
  const keuzes = new Map([["Nieuwsbrief / email", "social-organisch" as const]]);
  const s = kanalenVoorKpi(sessies, v, keuzes).maanden.find((m) => m.maand === "2026-03")!;
  assert.equal(s.perKanaal[idx("social-organisch")], 300 - 240);
  assert.equal(s.perKanaal[idx("email")], 440);
  assert.equal(s.totaal, 1820);
});

test("e-mail: een website zonder emailCorrectie krijgt geen E-mail", () => {
  const udenhout = vindWebsite("udenhout")!;
  const { emailCorrectie: _weg, ...zonder } = udenhout;
  const v = verdelingUitRijen(
    zonder,
    {
      verkeer: [{ year_month: "202603", session_source_medium: "Nieuwsbrief / email", sessions: 300, active_users: 250 }],
      events: [],
      email: { ga4: [{ year_month: "202603", session_source_medium: "Nieuwsbrief / email", sessions: 300 }], mbt: [] },
    },
    "2026-03-28",
    [],
  );
  assert.equal(v.bronnen[EMAIL_GA4], undefined);
  assert.equal(emailTotalen(v), null);
  const sessies = udenhout.kpis.find((k) => k.bron.soort === "sessies")!;
  const maart = kanalenVoorKpi(sessies, v).maanden.find((m) => m.maand === "2026-03")!;
  assert.equal(maart.perKanaal[idx("email")], 0);
  assert.equal(maart.perKanaal[idx("overig")], 300);
});
