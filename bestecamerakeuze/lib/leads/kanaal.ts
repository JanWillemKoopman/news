/**
 * Van GA4-bron/medium naar een kanaal, en naar het platform waar de kosten te vinden zijn.
 *
 * Twee vragen, en ze zijn niet dezelfde:
 *
 *  - **Welk kanaal?** Een leesbaar label voor de tabel ("Google Ads", "Organisch zoeken",
 *    "Direct"). Daar kijkt een mens naar.
 *  - **Waar staan de kosten?** Alleen Google Ads en Meta Ads hebben een kostenbron in dit
 *    dashboard. Verkeer met medium `cpc` van Bing is wél betaald, maar de kosten staan er
 *    niet — en dat mag nooit vervagen tot "onbetaald".
 *
 * Het kanaal volgt uit bron/medium en niet uit GA4's eigen kanaalgroep. De kanaalgroep
 * zou een extra kolom in de tabel kosten, en hij helpt niet bij het koppelen: Pmax en
 * Demand Gen staan daar als "Cross-network" terwijl ze gewoon Google Ads zijn.
 *
 * Pure functies, getest in `kanaal.test.ts`.
 */

/** Het advertentieplatform achter betaald verkeer. */
/**
 * `handmatig` volgt nooit uit bron/medium (`kanaalVan` geeft hem niet): dat is verkeer waarvoor
 * de eigenaar zelf een maandbedrag invulde, zoals Gaspedaal (zie `kanaalkosten.ts`).
 */
export type BetaaldPlatform = "google" | "meta" | "microsoft" | "linkedin" | "overig" | "handmatig";

export interface KanaalInfo {
  /** Het label voor in de tabel. */
  kanaal: string;
  /** Het platform als het verkeer betaald was; `null` = onbetaald. */
  platform: BetaaldPlatform | null;
}

/** De platformen waarvan dit dashboard de kosten kent (Google Ads, Meta Ads en LinkedIn Ads). */
export const PLATFORMEN_MET_KOSTEN: readonly BetaaldPlatform[] = ["google", "meta", "linkedin"];

export function heeftKostenbron(platform: BetaaldPlatform | null): boolean {
  // Handmatig heeft per definitie een bedrag, maar staat niet in PLATFORMEN_MET_KOSTEN: die
  // lijst is die van de advertentieplatforms waarvan de uitgaven uit Windsor komen.
  return platform === "handmatig" || (platform !== null && PLATFORMEN_MET_KOSTEN.includes(platform));
}

/** De labels van de betaalde kanalen, ook voor de "kosten onbekend"-uitleg in de UI. */
export const PLATFORM_LABEL: Record<BetaaldPlatform, string> = {
  google: "Google Ads",
  meta: "Meta Ads",
  microsoft: "Microsoft Ads",
  linkedin: "LinkedIn Ads",
  overig: "Betaald (overig)",
  handmatig: "Handmatige kosten",
};

/** Media waaraan GA4 betaald verkeer herkent, naast alles wat met "paid" begint. */
const BETAALDE_MEDIA = new Set(["cpc", "ppc", "cpm", "cpv", "display", "paidsearch", "paidsocial"]);

const META_BRONNEN = new Set(["facebook", "fb", "instagram", "ig", "meta"]);
const AI_BRONNEN = ["chatgpt", "claude.ai", "perplexity", "gemini", "copilot"];
const SOCIAL_BRONNEN = ["facebook", "instagram", "linkedin", "t.co", "twitter", "x.com", "youtube", "pinterest", "tiktok"];

function isBetaald(medium: string): boolean {
  const m = medium.replace(/[\s_-]/g, "");
  return BETAALDE_MEDIA.has(m) || m.startsWith("paid");
}

function platformVan(bron: string): BetaaldPlatform {
  if (bron === "google") return "google";
  if (bron === "bing" || bron === "microsoft") return "microsoft";
  if (META_BRONNEN.has(bron)) return "meta";
  if (bron.startsWith("linkedin")) return "linkedin";
  return "overig";
}

/**
 * Het kanaal en — bij betaald verkeer — het platform voor een `bron / medium`.
 *
 * Een lege waarde of "(not set)" is "Onbekend". Hetzelfde geldt voor "(data not
 * available)": GA4 geeft dat bij Cross-network-verkeer waarvan de bron niet te herleiden
 * is. Het is vrijwel zeker Google Ads (Pmax of Demand Gen), maar zonder bron en campagne
 * is dat niet te bewijzen, en een raden-als-feit hoort niet in een kostentabel.
 */
export function kanaalVan(bronMedium: string): KanaalInfo {
  const schoon = bronMedium.trim().toLowerCase();
  if (!schoon || schoon === "(not set)" || schoon.includes("(data not available)")) {
    return { kanaal: "Onbekend", platform: null };
  }

  const [bron = "", medium = ""] = schoon.split(" / ").map((d) => d.trim());
  // "(not set) / (not set)" en "(not set) / cpc": zonder bron is er geen kanaal te benoemen.
  if (bron === "(not set)") return { kanaal: "Onbekend", platform: null };

  if (isBetaald(medium)) {
    const platform = platformVan(bron);
    return { kanaal: PLATFORM_LABEL[platform], platform };
  }

  if (medium === "ai-assistant" || AI_BRONNEN.some((b) => bron.includes(b))) {
    return { kanaal: "AI-assistent", platform: null };
  }
  if (bron === "(direct)" || medium === "(none)") return { kanaal: "Direct", platform: null };
  if (bron === "gmb") return { kanaal: "Google Bedrijfsprofiel", platform: null };
  if (medium === "organic") return { kanaal: "Organisch zoeken", platform: null };
  if (medium === "email" || medium === "e-mail") return { kanaal: "E-mail", platform: null };
  if (medium === "social" || (medium === "referral" && SOCIAL_BRONNEN.some((b) => bron.includes(b)))) {
    return { kanaal: "Social (organisch)", platform: null };
  }
  if (medium === "referral") return { kanaal: "Verwijzing", platform: null };
  return { kanaal: "Overig", platform: null };
}

/**
 * De sleutel waarop een GA4-campagne aan een advertentiecampagne wordt gekoppeld.
 *
 * Hoofdletters, spaties en streepjes zijn geen verschil tussen twee campagnes maar tussen
 * twee schrijfwijzen van dezelfde: Meta schrijft een gedachtestreepje ("Service Functies
 * – Leads"), een UTM-parameter krijgt dat soms als gewoon streepje terug. Wat er wél
 * toe doet, blijft staan: "…Skoda - NEW" en "…Skoda - Push" zijn twee campagnes.
 */
export function campagneSleutel(naam: string): string {
  return naam
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‐-―−]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/** Een campagne waaraan niets te koppelen valt: leeg, "(not set)", "(direct)" enzovoort. */
export function isKoppelbareCampagne(naam: string): boolean {
  const sleutel = campagneSleutel(naam);
  return sleutel !== "" && !/^\(.*\)$/.test(sleutel);
}
