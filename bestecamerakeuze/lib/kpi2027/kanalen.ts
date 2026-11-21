import { getal, tekst, type WindsorRij } from "@/lib/windsor/api";
import { eventBron, type EmailCorrectie, type KpiDefinitie, type KpiWebsite } from "@/lib/kpi2027/definities";

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
 *
 * ## E-mail (alleen udenhout.nl, november 2026)
 *
 * Een negende groep, **E-mail**, en die volgt bewust níet uit bron/medium. De tracking
 * vanuit het e-mailprogramma (Selligent) ging mis: veel klikken uit de mailing komen in GA4
 * binnen als `(direct) / (none)`, maar met de Selligent-parameter `M_BT=` in de URL van de
 * landingspagina. Op verzoek van de eigenaar telt E-mail daarom precies dit, met de metric
 * `sessions` en alleen op de hostnames `udenhout.nl` en `www.udenhout.nl` (`EmailCorrectie`
 * in `definities.ts`; beide filters op beide delen):
 *
 *     session_default_channel_group = 'Email'
 *     OR (session_source_medium = '(direct) / (none)'
 *         AND landing_page_plus_query_string bevat 'M_BT=')
 *
 * M_BT telt alleen op de landingspagina van de sessie, niet op een pagina die later in de
 * sessie komt. De twee delen sluiten elkaar uit (een directe sessie zit nooit in GA4's
 * kanaalgroep Email) en worden apart opgehaald (`kanalenBron.ts`), per maand, en bewaard
 * onder `EMAIL_GA4` en `EMAIL_MBT` in `bronnen`.
 *
 * De GA4-kanaalgroep zelf blijft ongemoeid: de correctie gebeurt bij het lezen
 * (`kanalenVoorKpi`) en **verschuift** sessies, zodat het totaal over alle kanalen gelijk
 * blijft aan de KPI. De GA4-e-mailsessies gaan van de groep van hun bron/medium (volgens de
 * regels "Verwijzingen & overig") naar E-mail, de directe sessies met M_BT van Direct naar
 * E-mail. Sessies met M_BT die GA4 aan iets anders toeschrijft (Google Ads, organisch,
 * een verwijzing) blijven waar ze staan — die worden niet opgehaald. E-mailsessies op een
 * andere hostname (vooral "(not set)") tellen niet als E-mail en blijven ook staan.
 *
 * Alleen de KPI Sessies krijgt de correctie (zo gevraagd: metric `sessions`); bij
 * gebruikers en aanvragen blijft E-mail leeg. Websites zonder `emailCorrectie` hebben geen
 * E-mail: daar valt de nieuwsbrief zoals altijd onder Verwijzingen & overig, en de groep
 * staat niet in hun legenda. E-mail is niet met de hand te kiezen in
 * "Kanaalgroepindeling" (`isKanaalSleutel`): wat erin zit, ligt vast in de definitie.
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
    sleutel: "email",
    naam: "E-mail",
    uitleg:
      "Alleen udenhout.nl, bij sessies: GA4-kanaalgroep Email plus directe sessies met M_BT= in de landingspagina (Selligent), op udenhout.nl en www.udenhout.nl.",
  },
  {
    sleutel: "overig",
    naam: "Verwijzingen & overig",
    uitleg:
      "De rest: e-mail (nieuwsbrief), merksites (werkplaats.volkswagen.nl), Pepper, AI-assistenten, interne links en onbekend.",
  },
] as const;

export type KanaalSleutel = (typeof KANALEN)[number]["sleutel"];

/**
 * Bronsleutels in `KanaalVerdeling.bronnen` voor de e-mailcorrectie (zie de kop): per
 * maand de GA4-e-mailsessies per bron/medium, en de directe sessies met M_BT (onder
 * `(direct) / (none)`). Alleen bij een website met `emailCorrectie`.
 */
export const EMAIL_GA4 = "correctie:email-ga4";
export const EMAIL_MBT = "correctie:email-mbt";
export const DIRECT = "(direct) / (none)";

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
  rijen: {
    verkeer: WindsorRij[];
    events: WindsorRij[];
    padEvents?: Record<string, WindsorRij[]>;
    /** Alleen bij `emailCorrectie`: de twee delen van E-mail (zie de kop). */
    email?: { ga4: WindsorRij[]; mbt: WindsorRij[] };
  },
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

  if (rijen.email && website.emailCorrectie) {
    const { hosts, landingBevat } = website.emailCorrectie;
    const ga4: MaandPerBronMedium = (bronnen[EMAIL_GA4] = {});
    const mbt: MaandPerBronMedium = (bronnen[EMAIL_MBT] = {});
    for (const rij of rijen.email.ga4) {
      const maand = maandSleutel(rij.year_month);
      if (!maand || !emailRijTelt(rij, hosts)) continue;
      if (rij.session_default_channel_group !== undefined && tekst(rij.session_default_channel_group) !== "Email") continue;
      const bm = tekst(rij.session_source_medium) ?? "";
      const perMaand = (ga4[maand] ??= {});
      perMaand[bm] = (perMaand[bm] ?? 0) + getal(rij.sessions);
    }
    for (const rij of rijen.email.mbt) {
      const maand = maandSleutel(rij.year_month);
      if (!maand || !emailRijTelt(rij, hosts)) continue;
      if (rij.session_source_medium !== undefined && tekst(rij.session_source_medium) !== DIRECT) continue;
      if (rij.landing_page_plus_query_string !== undefined && !(tekst(rij.landing_page_plus_query_string) ?? "").includes(landingBevat)) continue;
      const perMaand = (mbt[maand] ??= {});
      perMaand[DIRECT] = (perMaand[DIRECT] ?? 0) + getal(rij.sessions);
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

/**
 * Windsor zet de dimensies waarop gefilterd is er soms zelf bij (hostname, landingspagina);
 * staat de hostname in de rij, dan moet hij een van de toegestane zijn. Het filter in de
 * opvraging doet hetzelfde; dit is de controle erachteraan.
 */
function emailRijTelt(rij: WindsorRij, hosts: readonly string[]): boolean {
  return rij.hostname === undefined || hosts.includes(tekst(rij.hostname) ?? "");
}

/** Een handmatige keuze per bron/medium (`kpi_2027_kanaal_keuzes`), die vóór de regels gaat. */
export type KanaalKeuzes = ReadonlyMap<string, KanaalSleutel>;

/** Het kanaal van een bron/medium: de handmatige keuze, anders de regels. */
export function kanaalMetKeuze(bronMedium: string, keuzes: KanaalKeuzes): KanaalSleutel {
  return keuzes.get(bronMedium) ?? kanaalVoor(bronMedium);
}

/**
 * Een kanaal dat met de hand te kiezen is in "Kanaalgroepindeling". E-mail niet: wat
 * daarin zit, ligt vast in de definitie (zie de kop), niet in bron/medium.
 */
export function isKanaalSleutel(waarde: unknown): waarde is KanaalSleutel {
  return typeof waarde === "string" && waarde !== "email" && KANALEN.some((k) => k.sleutel === waarde);
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
      const los = new Set<string>();
      for (const b of bronnen) {
        for (const [bm, n] of Object.entries(verdeling.bronnen[b]?.[maand] ?? {})) {
          los.add(bm);
          let i = kanaalVan.get(bm);
          if (i === undefined) kanaalVan.set(bm, (i = index.get(kanaalMetKeuze(bm, keuzes)) ?? KANALEN.length - 1));
          perKanaal[i] += Math.max(0, Number(n) || 0);
        }
        for (const [k, n] of Object.entries(verdeling.staart[b]?.[maand] ?? {})) {
          const i = index.get(k as KanaalSleutel);
          if (i !== undefined) perKanaal[i] += Math.max(0, Number(n) || 0);
        }
      }
      if (definitie.bron.soort === "sessies") {
        // E-mail (zie de kop): verschuiven, niet optellen, zodat het totaal gelijk blijft.
        // Een bron/medium die los bewaard is, staat in de groep van zijn keuze of regel; een
        // uit de staart in de groep van de regels. Nooit meer weghalen dan er staat.
        const email = index.get("email")!;
        const verschuif = (bm: string, n: number) => {
          const i = los.has(bm) ? (index.get(kanaalMetKeuze(bm, keuzes)) ?? KANALEN.length - 1) : index.get(kanaalVoor(bm))!;
          if (i === email) return;
          const m = Math.min(Math.max(0, Number(n) || 0), perKanaal[i]);
          perKanaal[i] -= m;
          perKanaal[email] += m;
        };
        for (const [bm, n] of Object.entries(verdeling.bronnen[EMAIL_GA4]?.[maand] ?? {})) verschuif(bm, n);
        for (const [bm, n] of Object.entries(verdeling.bronnen[EMAIL_MBT]?.[maand] ?? {})) verschuif(bm, n);
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
  /** Alleen bij `emailCorrectie`: de sessies in E-mail per jaar, uitgesplitst (zie de kop). */
  email?: EmailTotaal[];
  /** Alleen bij `emailCorrectie`: op welke hostnames en met welke parameter, voor de uitleg. */
  emailDefinitie?: EmailCorrectie;
  fout?: string;
}

/** De twee delen van E-mail over één jaar (t/m de peildatum). */
export interface EmailTotaal {
  jaar: number;
  /** GA4-kanaalgroep Email, op de toegestane hostnames. */
  ga4: number;
  /** `(direct) / (none)` met M_BT in de landingspagina, op de toegestane hostnames. */
  mbt: number;
}

/** Per jaar de twee delen van E-mail, of null als de verdeling geen e-mailcorrectie heeft. */
export function emailTotalen(verdeling: KanaalVerdeling): EmailTotaal[] | null {
  const ga4 = verdeling.bronnen[EMAIL_GA4];
  const mbt = verdeling.bronnen[EMAIL_MBT];
  if (!ga4 || !mbt) return null;
  const perJaar = new Map<number, EmailTotaal>();
  const tel = (bron: MaandPerBronMedium, veld: "ga4" | "mbt") => {
    for (const [maand, perBm] of Object.entries(bron)) {
      const jaar = Number(maand.slice(0, 4));
      const t = perJaar.get(jaar) ?? { jaar, ga4: 0, mbt: 0 };
      for (const n of Object.values(perBm)) t[veld] += Math.max(0, Number(n) || 0);
      perJaar.set(jaar, t);
    }
  };
  tel(ga4, "ga4");
  tel(mbt, "mbt");
  return [...perJaar.values()].sort((a, b) => a.jaar - b.jaar);
}
