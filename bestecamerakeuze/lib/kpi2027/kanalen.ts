import { getal, tekst, type WindsorRij } from "@/lib/windsor/api";
import { eventBron, type KpiDefinitie, type KpiWebsite } from "@/lib/kpi2027/definities";

/**
 * De kanaalverdeling achter het knopje "Kanalen" op KPI's 2027 GA (elke website):
 * per KPI en per maand, vanaf januari 2025, welk deel uit welk kanaal kwam.
 *
 * Pure functies, getest in `kanalen.test.ts`. Het ophalen en bewaren staat in
 * `kanalenBron.ts`.
 *
 * ## Welke data
 *
 * Dezelfde als KPI's 2027 GA, niet de leadtabel van het tabblad Leads (`windsor_ga4_leads`,
 * dertig dagen) en ook niet diens kanaalindeling (`lib/leads/kanaal.ts`): dezelfde
 * GA4-property, dezelfde events per KPI (`definities.ts`), dezelfde hostregels, sessies en
 * actieve gebruikers per maand — alleen met sessiebron/medium als extra dimensie, want die
 * zit niet in `kpi_2027_standen`. Per maand zet de route het cijfer van de KPI-pagina er
 * ter controle naast (`kpiTotaal`).
 *
 * ## De indeling
 *
 * Op GA4's sessiebron/medium (`session_source_medium`), in acht groepen. Acht omdat een
 * gestapelde grafiek met meer kleuren niet meer te lezen is: de negende en verdere groep
 * vallen samen onder "Verwijzingen & overig". De volgorde is die van de stapel, van
 * onder naar boven: eerst wat betaald is, dan wat organisch binnenkomt, dan de rest.
 *
 * Waarom niet GA4's eigen kanaalgroep (`session_default_channel_group`)? Die kent de
 * groepen niet waar het bij een autodealer om draait. Gaspedaal (±370.000 sessies sinds
 * 2025, na Google Ads de grootste bron) heet daar "Referral" tussen de merksites en
 * Pepper; Meta-advertenties met de plaatsing als medium (`fb / Facebook_Mobile_Feed`,
 * `ig / Instagram_Stories`) heten "Unassigned"; en "Paid Search" gooit Google en Bing op
 * één hoop. De regels hieronder zijn gemaakt op wat udenhout.nl werkelijk binnenkrijgt
 * (november 2026 geïnventariseerd over 2025 en 2026) en daarna nagelopen op de andere vijf
 * websites (Porsche Brabant en Maastricht, PGZ, Bentley, VELOO). Daar kwam bij: `Google /
 * Ads` en `Google / Ads-Extensie` (handmatig getagde advertenties), de Belgische
 * Marktplaats (2dehands, 2ememain), Elferspot, mobile.de en Porsche Finder als portal, en
 * `google / product_sync` (gratis productvermeldingen van de VELOO-webshop) als organisch.
 * Merksites van fietsmerken (Gazelle, Kalkhoff, Urban Arrow) en `porsche.com` zijn
 * verwijzingen, net als de merksites van udenhout.nl.
 *
 * De regels, in deze volgorde (de eerste die past, wint):
 *
 *  1. Leeg, "(not set)" of "(data not available)" → Verwijzingen & overig (onbekend).
 *  2. **Betaald**: medium `cpc`, `ppc`, `cpm`, `cpv`, `display`, iets met "paid" of iets
 *     dat met "ads" begint (`Google / Ads-Extensie`) — of een
 *     Meta-bron (`facebook`, `fb`, `instagram`, `ig`) met een medium dat geen verwijzing,
 *     social, organic of e-mail is: dat zijn de plaatsingsnamen uit Meta-advertenties.
 *     Google → **Google Ads**, Meta → **Meta Ads**, al het andere (Bing, LinkedIn, DPG,
 *     Criteo …) → **Overig betaald**.
 *  3. **AI-assistenten** (ChatGPT, Perplexity, Gemini, Copilot, Claude) → Verwijzingen &
 *     overig, vóór de regel voor organisch: `chatgpt.com / organic` is geen zoekmachine.
 *     Te klein voor een eigen kleur (±0,2% van de sessies).
 *  4. **Autoportals** (Gaspedaal, AutoTrack, AutoScout24, Marktplaats en 2dehands,
 *     JP.cars, AutoWereld, ViaBOVAG, mobile.de, Elferspot, Porsche Finder), ongeacht het
 *     medium: `gaspedaal / app` hoort erbij.
 *  5. **Direct**: `(direct)` of medium `(none)`.
 *  6. **Social organisch**: medium `social`, of een socialmediabron (Facebook, Instagram,
 *     LinkedIn, WhatsApp, X, YouTube, TikTok, Pinterest, Linktree …) zonder betaald medium.
 *  7. **Organisch zoeken**: medium `organic`, het Google Bedrijfsprofiel (`gmb`,
 *     `googlemijnbedrijf / vermelding`) en verwijzingen van zoekmachines
 *     (`nl.search.yahoo.com`, `search.brave.com`), en `google / product_sync`. Het Bedrijfsprofiel telt hier mee zoals
 *     GA4 het ook doet; als eigen groep zou het een negende kleur kosten.
 *  8. Al het andere → **Verwijzingen & overig**: e-mail (de nieuwsbrief), merksites
 *     (`werkplaats.volkswagen.nl`), Pepper, de eigen leasesites, interne links (Teams,
 *     SharePoint, het kantoornetwerk) en onbekend.
 */

export const KANALEN = [
  {
    sleutel: "google-ads",
    naam: "Google Ads",
    uitleg: "Betaald via Google: google / cpc (zoeken, Shopping, Pmax, Demand Gen, YouTube).",
  },
  {
    sleutel: "meta-ads",
    naam: "Meta Ads",
    uitleg: "Betaald via Facebook en Instagram, ook met de plaatsing als medium (fb / Facebook_Mobile_Feed).",
  },
  {
    sleutel: "overig-betaald",
    naam: "Overig betaald",
    uitleg: "Ander betaald verkeer: Microsoft Ads (bing / cpc), LinkedIn Ads, DPG, Criteo.",
  },
  {
    sleutel: "organisch-zoeken",
    naam: "Organisch zoeken",
    uitleg: "Google, Bing, DuckDuckGo en andere zoekmachines zonder advertentie, plus het Google Bedrijfsprofiel.",
  },
  {
    sleutel: "social-organisch",
    naam: "Social organisch",
    uitleg: "Onbetaald via social media: Facebook, Instagram, LinkedIn, WhatsApp, YouTube en dergelijke.",
  },
  {
    sleutel: "autoportals",
    naam: "Autoportals",
    uitleg: "Occasionsites: Gaspedaal (site en app), AutoTrack, AutoScout24, Marktplaats/2dehands, JP.cars, mobile.de, Elferspot, Porsche Finder.",
  },
  {
    sleutel: "direct",
    naam: "Direct",
    uitleg: "Zonder herkomst: adres getypt, bladwijzer, of een link waar GA4 de bron niet van kent.",
  },
  {
    sleutel: "overig",
    naam: "Verwijzingen & overig",
    uitleg:
      "De rest: e-mail (nieuwsbrief), merksites (werkplaats.volkswagen.nl), Pepper, AI-assistenten, interne links en onbekend.",
  },
] as const;

export type KanaalSleutel = (typeof KANALEN)[number]["sleutel"];

const BETAALDE_MEDIA = new Set(["cpc", "ppc", "cpm", "cpv", "display", "paidsearch", "paidsocial"]);
const META = ["facebook", "fb", "instagram", "ig", "meta"];
const AI = ["chatgpt", "openai", "perplexity", "gemini", "copilot", "claude"];
const AUTOPORTALS = [
  "gaspedaal",
  "autotrack",
  "autoscout24",
  "marktplaats",
  "2dehands",
  "2ememain",
  "jp.cars",
  "autowereld",
  "viabovag",
  "mobile.de",
  "elferspot",
  "finder.porsche.com",
];
const SOCIAL = [
  "facebook",
  "fb",
  "instagram",
  "ig",
  "linkedin",
  "lnkd",
  "whatsapp",
  "wl.co",
  "t.co",
  "twitter",
  "x.com",
  "youtube",
  "tiktok",
  "pinterest",
  "snapchat",
  "threads",
  "linktr.ee",
];
const BEDRIJFSPROFIEL = ["gmb", "googlemijnbedrijf", "google_mijn_bedrijf", "googlemybusiness", "google_business_profile"];
const ZOEKMACHINES = ["search.yahoo", "search.brave", "duckduckgo", "ecosia", "startpage", "qwant", "bing.com", "google."];
const NIET_BETAALDE_MEDIA = new Set(["referral", "social", "organic", "(none)", "email", "e-mail", "(not set)", ""]);

/**
 * Hoort deze bron bij een van de namen? Een naam als "facebook" past op `facebook`,
 * `m.facebook.com` en `l.facebook.com`, niet op een domein waar het toevallig in staat.
 * Een naam met een punt ("jp.cars", "t.co") past op het domein en zijn subdomeinen.
 */
function bronIs(bron: string, namen: readonly string[]): boolean {
  const delen = bron.split(".");
  return namen.some((n) =>
    n.includes(".") ? bron === n || bron.endsWith(`.${n}`) : delen.includes(n),
  );
}

function isBetaaldMedium(medium: string): boolean {
  const m = medium.replace(/[\s_-]/g, "");
  return BETAALDE_MEDIA.has(m) || m.startsWith("paid") || m.startsWith("ads");
}

/** Het kanaal van één `bron / medium` (zie de regels in de kop). */
export function kanaalVoor(bronMedium: string): KanaalSleutel {
  const schoon = bronMedium.trim().toLowerCase();
  if (!schoon || schoon === "(not set)" || schoon.includes("(data not available)")) return "overig";
  const [bron = "", medium = ""] = schoon.split(" / ").map((d) => d.trim());
  if (!bron || bron === "(not set)") return "overig";

  const meta = bronIs(bron, META);
  if (isBetaaldMedium(medium) || (meta && !NIET_BETAALDE_MEDIA.has(medium))) {
    if (bron === "google" || bron.startsWith("google ") || bron === "adwords" || bron === "youtube") return "google-ads";
    if (meta) return "meta-ads";
    return "overig-betaald";
  }
  if (medium === "ai-assistant" || AI.some((a) => bron.includes(a))) return "overig";
  if (AUTOPORTALS.some((p) => bron.includes(p))) return "autoportals";
  if (bron === "(direct)" || medium === "(none)") return "direct";
  if (medium === "social" || bronIs(bron, SOCIAL)) return "social-organisch";
  if (BEDRIJFSPROFIEL.includes(bron) || medium === "organic" || medium === "product_sync") return "organisch-zoeken";
  if (ZOEKMACHINES.some((z) => bron.includes(z))) return "organisch-zoeken";
  return "overig";
}

/** Per maand ("2025-01") het aantal per kanaal. */
export type MaandPerKanaal = Record<string, Partial<Record<KanaalSleutel, number>>>;

/** Per maand ("2025-01") het aantal per bron/medium. */
export type MaandPerBronMedium = Record<string, Record<string, number>>;

/**
 * Wat er bewaard wordt (`kpi_2027_kanalen`, migraties 0037 en 0038).
 *
 * De grootste bron/media (`BRON_MEDIA_MAX`, op sessies over de hele periode) staan er
 * **los** in, nog niet ingedeeld: zo geldt een handmatige keuze in "Kanaalgroepindeling"
 * meteen, zonder opnieuw op te halen. De lange staart (honderden bron/media met een
 * handvol sessies, vaak eenmalige verwijzers) staat er al ingedeeld per kanaal in, zodat de
 * rij klein blijft; die volgt altijd de regels.
 */
export interface KanaalVerdeling {
  website: string;
  /** Eerste dag: altijd 1 januari 2025. */
  van: string;
  /** T/m welke dag: de laatste zaterdag, net als de standen. */
  peildatum: string;
  /**
   * Per bron (`sessies`, `gebruikers`, `aankopen`, `event:<naam>`, `event:<naam>@<pad>`)
   * per maand per bron/medium — dezelfde bronsleutels als `kpi_2027_standen`.
   */
  bronnen: Record<string, MaandPerBronMedium>;
  /** De staart: per bron per maand al per kanaal (volgens de regels). */
  staart: Record<string, MaandPerKanaal>;
  /** De losse bron/media met hun sessies, van groot naar klein. */
  bronMedia: { bronMedium: string; sessies: number }[];
  /** Hoeveel bron/media en sessies in de staart zitten. */
  staartInfo: { aantal: number; sessies: number };
}

/** Hoeveel bron/media er los bewaard worden en dus met de hand in te delen zijn. */
export const BRON_MEDIA_MAX = 250;

/** Vanaf wanneer de verdeling loopt. */
export const KANALEN_VANAF = "2025-01-01";

/** `202503` → `2025-03`; null voor iets anders. */
export function maandSleutel(waarde: unknown): string | null {
  const t = tekst(waarde)?.replace(/\D/g, "");
  if (!t || t.length !== 6) return null;
  const maand = Number(t.slice(4, 6));
  return maand >= 1 && maand <= 12 ? `${t.slice(0, 4)}-${t.slice(4, 6)}` : null;
}

function telOp<T extends string>(doel: Record<string, Record<string, Partial<Record<T, number>>>>, bron: string, maand: string, sleutel: T, n: number) {
  if (!n) return;
  const perMaand = ((doel[bron] ??= {})[maand] ??= {});
  perMaand[sleutel] = (perMaand[sleutel] ?? 0) + n;
}

/**
 * Van Windsor-rijen naar de verdeling. `verkeer` heeft per maand × bron/medium sessies,
 * actieve gebruikers en (VELOO) aankopen (de uitgesloten hosts zijn daar al als filter
 * weggelaten), `events` per maand × bron/medium × event × hostname het aantal keer gevuurd,
 * en `padEvents` hetzelfde voor elk event met een padvoorwaarde (Bentley: Contactaanvraag
 * op /caw-bedankt/offerte/), per bronsleutel (`eventBron`) een eigen opvraging.
 */
export function verdelingUitRijen(
  website: KpiWebsite,
  rijen: { verkeer: WindsorRij[]; events: WindsorRij[]; padEvents?: Record<string, WindsorRij[]> },
  peildatum: string,
  gezocht: readonly string[],
  max: number = BRON_MEDIA_MAX,
): KanaalVerdeling {
  const uitgesloten = new Set(website.uitgeslotenHosts);
  const events = new Set(gezocht);

  // Eerst bepalen welke bron/media los bewaard worden: de grootste op sessies.
  const sessiesPer = new Map<string, number>();
  for (const rij of rijen.verkeer) {
    if (!maandSleutel(rij.year_month)) continue;
    const bm = tekst(rij.session_source_medium) ?? "";
    sessiesPer.set(bm, (sessiesPer.get(bm) ?? 0) + getal(rij.sessions));
  }
  const gesorteerd = [...sessiesPer].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const los = new Set(gesorteerd.slice(0, max).map(([bm]) => bm));

  const bronnen: Record<string, MaandPerBronMedium> = {};
  const staart: Record<string, MaandPerKanaal> = {};
  function tel(bron: string, maand: string, bm: string, n: number) {
    if (los.has(bm)) telOp(bronnen, bron, maand, bm, n);
    else telOp(staart, bron, maand, kanaalVoor(bm), n);
  }

  for (const rij of rijen.verkeer) {
    const maand = maandSleutel(rij.year_month);
    if (!maand) continue;
    const bm = tekst(rij.session_source_medium) ?? "";
    tel("sessies", maand, bm, getal(rij.sessions));
    tel("gebruikers", maand, bm, getal(rij.active_users));
    if (rij.ecommerce_purchases !== undefined) tel("aankopen", maand, bm, getal(rij.ecommerce_purchases));
  }
  for (const rij of rijen.events) {
    const maand = maandSleutel(rij.year_month);
    const naam = tekst(rij.event_name);
    if (!maand || !naam || !events.has(naam) || uitgesloten.has(tekst(rij.hostname) ?? "")) continue;
    tel(`event:${naam}`, maand, tekst(rij.session_source_medium) ?? "", getal(rij.event_count));
  }
  for (const [bron, padRijen] of Object.entries(rijen.padEvents ?? {})) {
    for (const rij of padRijen) {
      const maand = maandSleutel(rij.year_month);
      if (!maand || uitgesloten.has(tekst(rij.hostname) ?? "")) continue;
      tel(bron, maand, tekst(rij.session_source_medium) ?? "", getal(rij.event_count));
    }
  }

  const staartRijen = gesorteerd.slice(max);
  return {
    website: website.sleutel,
    van: KANALEN_VANAF,
    peildatum,
    bronnen,
    staart,
    bronMedia: gesorteerd.slice(0, max).map(([bronMedium, sessies]) => ({ bronMedium, sessies })),
    staartInfo: { aantal: staartRijen.length, sessies: staartRijen.reduce((t, [, n]) => t + n, 0) },
  };
}

/** Een handmatige keuze per bron/medium (`kpi_2027_kanaal_keuzes`), die vóór de regels gaat. */
export type KanaalKeuzes = ReadonlyMap<string, KanaalSleutel>;

/** Het kanaal van een bron/medium: de handmatige keuze, anders de regels. */
export function kanaalMetKeuze(bronMedium: string, keuzes: KanaalKeuzes): KanaalSleutel {
  return keuzes.get(bronMedium) ?? kanaalVoor(bronMedium);
}

export function isKanaalSleutel(waarde: unknown): waarde is KanaalSleutel {
  return typeof waarde === "string" && KANALEN.some((k) => k.sleutel === waarde);
}

/** Alle maanden van `van` t/m de maand van `peildatum`, als "2025-01". */
export function maandenTussen(van: string, peildatum: string): string[] {
  const uit: string[] = [];
  let jaar = Number(van.slice(0, 4));
  let maand = Number(van.slice(5, 7));
  const eind = peildatum.slice(0, 7);
  for (;;) {
    const m = `${jaar}-${String(maand).padStart(2, "0")}`;
    if (m > eind) break;
    uit.push(m);
    if (++maand > 12) {
      maand = 1;
      jaar++;
    }
  }
  return uit;
}

/** Eén maand van één KPI: het totaal en het aantal per kanaal (in de volgorde van `KANALEN`). */
export interface KanaalMaand {
  maand: string;
  totaal: number;
  perKanaal: number[];
  /**
   * Hetzelfde cijfer zoals KPI's 2027 GA het toont (uit `kpi_2027_standen`), ter controle;
   * null als er voor dat jaar geen stand is. Zelfde property, events en hostregels, dus
   * het hoort gelijk te zijn aan `totaal` — op afronding in GA4 na.
   */
  kpiTotaal: number | null;
}

/** Wat de grafiek van één KPI nodig heeft. */
export interface KpiKanalen {
  maanden: KanaalMaand[];
}

/** De bronnen in de verdeling waar een KPI uit optelt. */
function bronnenVoor(definitie: KpiDefinitie): string[] {
  switch (definitie.bron.soort) {
    case "sessies":
      return ["sessies"];
    case "gebruikers":
      return ["gebruikers"];
    case "aankopen":
      return ["aankopen"];
    case "events":
      return definitie.bron.events.map(eventBron);
  }
}

/**
 * De maanden van één KPI, van januari 2025 t/m de maand van de peildatum: de losse
 * bron/media ingedeeld met de handmatige keuzes (anders de regels), plus de staart.
 */
export function kanalenVoorKpi(
  definitie: KpiDefinitie,
  verdeling: KanaalVerdeling,
  keuzes: KanaalKeuzes = new Map(),
): KpiKanalen {
  const bronnen = bronnenVoor(definitie);
  const index = new Map(KANALEN.map((k, i) => [k.sleutel as KanaalSleutel, i]));
  const kanaalVan = new Map<string, number>();
  return {
    maanden: maandenTussen(verdeling.van, verdeling.peildatum).map((maand) => {
      const perKanaal = KANALEN.map(() => 0);
      for (const b of bronnen) {
        for (const [bm, n] of Object.entries(verdeling.bronnen[b]?.[maand] ?? {})) {
          let i = kanaalVan.get(bm);
          if (i === undefined) kanaalVan.set(bm, (i = index.get(kanaalMetKeuze(bm, keuzes)) ?? KANALEN.length - 1));
          perKanaal[i] += Math.max(0, Number(n) || 0);
        }
        for (const [k, n] of Object.entries(verdeling.staart[b]?.[maand] ?? {})) {
          const i = index.get(k as KanaalSleutel);
          if (i !== undefined) perKanaal[i] += Math.max(0, Number(n) || 0);
        }
      }
      return { maand, totaal: perKanaal.reduce((t, n) => t + n, 0), perKanaal, kpiTotaal: null };
    }),
  };
}

/** Eén regel in de tabel "Kanaalgroepindeling". */
export interface BronMediumRegel {
  bronMedium: string;
  sessies: number;
  /** Waar de regels hem indelen. */
  regel: KanaalSleutel;
  /** Waar hij nu staat: de handmatige keuze, anders de regel. */
  kanaal: KanaalSleutel;
  handmatig: boolean;
}

/** De tabel "Kanaalgroepindeling": de losse bron/media op sessies, met hun kanaal. */
export function bronMediumRegels(verdeling: KanaalVerdeling, keuzes: KanaalKeuzes): BronMediumRegel[] {
  return verdeling.bronMedia.map(({ bronMedium, sessies }) => {
    const regel = kanaalVoor(bronMedium);
    const keuze = keuzes.get(bronMedium);
    return { bronMedium, sessies, regel, kanaal: keuze ?? regel, handmatig: keuze !== undefined && keuze !== regel };
  });
}

/**
 * Zet bij elke maand het cijfer van KPI's 2027 GA zelf (`kpiMaandTotaal` uit
 * `rekenen.ts`), zodat zichtbaar is dat de kanaalgrafiek over dezelfde aantallen gaat.
 */
export function metKpiTotalen(k: KpiKanalen, totaalVoor: (maand: string) => number | null): KpiKanalen {
  return { maanden: k.maanden.map((m) => ({ ...m, kpiTotaal: totaalVoor(m.maand) })) };
}

/** Wat `/api/kpi-2027/kanalen` teruggeeft. */
export interface KanalenAntwoord {
  website?: string;
  peildatum?: string;
  berekendOp?: string;
  /** Per KPI-sleutel de maanden. */
  kpis?: Record<string, KpiKanalen>;
  /** De tabel "Kanaalgroepindeling". */
  bronMedia?: BronMediumRegel[];
  staart?: { aantal: number; sessies: number };
  fout?: string;
}
