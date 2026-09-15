/**
 * Welke velden halen we op, en welke statistieken toont het dashboard?
 *
 * Twee dingen in één bestand, omdat ze één ding zijn: wat we bij Windsor opvragen is
 * precies wat er in een tabel te kiezen valt. Staat een statistiek hieronder niet, dan
 * wordt hij ook niet opgehaald — en andersom halen we niets op wat nergens te zien is.
 *
 * ## Optelbaar versus afgeleid
 *
 * De belangrijkste scheiding hier. Uitgaven, vertoningen en klikken zijn **optelbaar**:
 * de waarde van een selectie is de som van de rijen. CTR, CPC en kosten per lead zijn
 * **afgeleid** en mogen nooit worden opgeteld of gemiddeld — het gemiddelde van tien
 * CTR's is niet de CTR van die tien advertenties samen, want een advertentie met tien
 * vertoningen telt dan even zwaar als een met tienduizend. Een afgeleide statistiek
 * wordt daarom altijd ná het optellen berekend, uit de sommen van zijn twee bronnen.
 * Dat is precies waar dashboards het vaakst stilletjes de mist in gaan.
 *
 * ## Waarom bereik hier niet staat
 *
 * Bereik is optelbaar noch afgeleid: het platform telt daar **verschillende mensen**, en
 * doet dat per opgevraagde korrel opnieuw. Wie op drie dagen naar dezelfde advertentie
 * keek telt in de dagcijfers drie keer en in het periodecijfer één keer. Wij bewaren
 * dagcijfers — dat is de hele opzet, want alleen zo is elke periode achteraf nog te
 * bevragen — en dus is elke optelling die wij maken hoger dan het bereik dat Ads Manager
 * over diezelfde periode toont. Dat valt niet met beter rekenen op te lossen: het echte
 * periodebereik bestaat alleen in een opvraging zónder dagkorrel, en die hebben we niet.
 *
 * Een getal dat per definitie nooit met het platform overeenkomt, hoort niet op een
 * pagina die juist bedoeld is om naast Ads Manager te leggen. Bereik en de frequentie die
 * erop deelt staan daarom niet in de lijsten hieronder, en de kanaalqueries halen de
 * kolom niet meer op. De sync blijft hem wél wegschrijven: de data gaat niet verloren,
 * hij wordt alleen niet getoond. Wie hem terugzet, zet ook de misleiding terug — doe dat
 * alleen samen met een aparte opvraging van het periodebereik bij het platform zelf.
 *
 * ## De definities komen van het platform, niet van ons
 *
 * Elke `uitleg` hieronder beschrijft wat het platform daadwerkelijk meet, ook waar dat
 * ongemakkelijk is: Meta's post_engagement telt kliks mee, Meta's videoweergave begint
 * bij drie seconden en die van LinkedIn bij twee. Wie hier een mooiere zin van maakt,
 * maakt het dashboard onbetrouwbaar — dan staat er iets anders op de pagina dan in Ads
 * Manager, en dat is precies wat dit bestand hoort te voorkomen.
 */

import type { Connector } from "@/lib/windsor/api";

export type Eenheid = "euro" | "aantal" | "procent" | "seconden";

export interface Statistiek {
  /** Sleutel in de datarij; bij afgeleide statistieken alleen een id. */
  id: string;
  label: string;
  /** Eén zin in gewone taal, voor de "Zo lees je dit"-stand van de tabel. */
  uitleg: string;
  eenheid: Eenheid;
  /** Staat hij meteen in de tabel, of pas als iemand hem aanzet? */
  standaard: boolean;
  /**
   * Alleen bij afgeleide statistieken: teller en noemer, allebei optelbare velden. De
   * UI berekent `teller / noemer` ná het aggregeren, nooit ervoor.
   */
  afgeleid?: { teller: string; noemer: string; maal?: number };
  /** Lager is beter (kosten per klik, kosten per lead) — bepaalt de kleur van een verschil. */
  lagerIsBeter?: boolean;
}

// ---------------------------------------------------------------------------
// Advertenties — gedeeld door de pagina's Social ads en Google Ads
// ---------------------------------------------------------------------------

export const ADVERTENTIE_STATISTIEKEN: Statistiek[] = [
  {
    id: "uitgaven",
    label: "Uitgaven",
    uitleg: "Wat er in deze periode daadwerkelijk is uitgegeven, exclusief btw.",
    eenheid: "euro",
    standaard: true,
  },
  {
    id: "vertoningen",
    label: "Vertoningen",
    uitleg: "Hoe vaak de advertentie op iemands scherm is verschenen, herhalingen meegeteld.",
    eenheid: "aantal",
    standaard: true,
  },
  {
    id: "klikken",
    label: "Klikken",
    uitleg:
      "Alle klikken op de advertentie, ook die niet naar de website leiden — in Ads Manager heet dit " +
      "'Klikken (alle)' en niet 'Linkklikken'.",
    eenheid: "aantal",
    standaard: true,
  },
  {
    id: "link_klikken",
    label: "Linkklikken",
    uitleg: "Alleen de klikken die iemand daadwerkelijk naar de bestemming brachten.",
    eenheid: "aantal",
    standaard: false,
  },
  {
    id: "interacties",
    label: "Interacties",
    uitleg:
      "Alles wat mensen met de advertentie deden bij elkaar opgeteld — klikken, reacties, likes, " +
      "delen én videoweergaven tellen hier mee. Dit is Meta's 'post engagement', dus een stuk breder " +
      "dan alleen reacties.",
    eenheid: "aantal",
    standaard: false,
  },
  {
    id: "videoweergaven",
    label: "Videoweergaven",
    uitleg:
      "Hoe vaak de video is aangekeken. Let op: één getal over twee definities — Meta telt vanaf drie " +
      "seconden, LinkedIn al vanaf twee seconden met de video half in beeld.",
    eenheid: "aantal",
    standaard: false,
  },
  {
    id: "leads",
    label: "Leads",
    uitleg:
      "Leads die het platform aan deze advertentie toeschrijft. Meta telt daarin leadformulieren, " +
      "Messenger én leads die de pixel op de site meet; LinkedIn telt alleen zijn eigen Lead " +
      "Gen-formulieren. Aangewezen conversie-acties uit de koppeltabel komen hier bovenop.",
    eenheid: "aantal",
    standaard: true,
  },
  {
    id: "conversies",
    label: "Conversies",
    uitleg:
      "Bij Meta: de conversie-acties die het team zelf heeft aangewezen op de pagina Koppeltabel — het " +
      "platform levert daar geen totaal, en álle acties optellen telde hetzelfde formulier meerdere " +
      "keren. Bij LinkedIn zijn het de conversies die de pixel op de site meet, bij Google alles wat " +
      "daar als conversie is ingesteld.",
    eenheid: "aantal",
    standaard: true,
  },
  {
    id: "conversiewaarde",
    label: "Conversiewaarde",
    uitleg:
      "De waarde die aan die conversies is toegekend. Alleen gevuld voor LinkedIn en Google — voor " +
      "Meta halen we nog geen waarde op, daar staat dus altijd nul.",
    eenheid: "euro",
    standaard: false,
  },

  // Afgeleid — berekend ná het optellen, zie de toelichting bovenaan dit bestand.
  {
    id: "ctr",
    label: "CTR",
    uitleg:
      "Van elke honderd vertoningen dit percentage geklikt. Gerekend met álle klikken, dus dit is " +
      "Ads Manager's 'CTR (alle)' en niet de CTR op linkklikken.",
    eenheid: "procent",
    standaard: true,
    afgeleid: { teller: "klikken", noemer: "vertoningen", maal: 100 },
  },
  {
    id: "cpc",
    label: "Kosten per klik",
    uitleg:
      "Wat één klik gemiddeld kostte in deze selectie. Gerekend met álle klikken, dus Ads Manager's " +
      "'CPC (alle)'.",
    eenheid: "euro",
    standaard: true,
    afgeleid: { teller: "uitgaven", noemer: "klikken" },
    lagerIsBeter: true,
  },
  {
    id: "cpm",
    label: "Kosten per 1.000 vertoningen",
    uitleg: "Wat het kostte om de advertentie duizend keer te laten zien.",
    eenheid: "euro",
    standaard: false,
    afgeleid: { teller: "uitgaven", noemer: "vertoningen", maal: 1000 },
    lagerIsBeter: true,
  },
  {
    id: "cpl",
    label: "Kosten per lead",
    uitleg: "Wat één lead gemiddeld kostte in deze selectie.",
    eenheid: "euro",
    standaard: true,
    afgeleid: { teller: "uitgaven", noemer: "leads" },
    lagerIsBeter: true,
  },
  {
    id: "cpa",
    label: "Kosten per conversie",
    uitleg:
      "Wat één conversie gemiddeld kostte in deze selectie — gerekend over de conversies zoals die " +
      "hiernaast zijn gedefinieerd, dus bij Meta over de aangewezen acties.",
    eenheid: "euro",
    standaard: false,
    afgeleid: { teller: "uitgaven", noemer: "conversies" },
    lagerIsBeter: true,
  },
  {
    id: "roas",
    label: "Rendement op advertentiebudget",
    uitleg:
      "Hoeveel euro conversiewaarde elke uitgegeven euro opleverde. Voor Meta dus altijd leeg, want " +
      "daar halen we geen conversiewaarde op.",
    eenheid: "aantal",
    standaard: false,
    afgeleid: { teller: "conversiewaarde", noemer: "uitgaven" },
  },
];

// ---------------------------------------------------------------------------
// Organische posts
// ---------------------------------------------------------------------------

export const POST_STATISTIEKEN: Statistiek[] = [
  {
    id: "vertoningen_organisch",
    label: "Organische vertoningen",
    uitleg: "Hoe vaak de post is getoond zonder dat er advertentiegeld achter zat.",
    eenheid: "aantal",
    standaard: true,
  },
  {
    id: "vertoningen",
    label: "Vertoningen",
    uitleg:
      "Hoe vaak de post op iemands scherm verscheen, organisch en betaald bij elkaar. Staat hier " +
      "sinds bereik van de pagina af is: de interactieratio moet ergens op delen, en dit is het " +
      "cijfer dat het platform wél per periode kan reproduceren.",
    eenheid: "aantal",
    standaard: false,
  },
  {
    id: "interacties",
    label: "Interacties",
    uitleg: "Likes, reacties, opslagen en delen bij elkaar opgeteld.",
    eenheid: "aantal",
    standaard: true,
  },
  {
    id: "likes",
    label: "Likes",
    uitleg: "Het aantal likes en andere reacties op de post.",
    eenheid: "aantal",
    standaard: false,
  },
  {
    id: "reacties",
    label: "Reacties",
    uitleg: "Het aantal geschreven reacties onder de post.",
    eenheid: "aantal",
    standaard: false,
  },
  {
    id: "opgeslagen",
    label: "Opgeslagen",
    uitleg: "Hoe vaak iemand de post bewaarde om later terug te zien.",
    eenheid: "aantal",
    standaard: false,
  },
  {
    id: "gedeeld",
    label: "Gedeeld",
    uitleg: "Hoe vaak de post is doorgestuurd of gedeeld.",
    eenheid: "aantal",
    standaard: false,
  },
  {
    id: "klikken",
    label: "Klikken",
    uitleg: "Klikken op de post, inclusief op een link of op 'meer weergeven'.",
    eenheid: "aantal",
    standaard: false,
  },
  {
    id: "nieuwe_volgers",
    label: "Nieuwe volgers",
    uitleg: "Hoeveel mensen het account gingen volgen na het zien van deze post.",
    eenheid: "aantal",
    standaard: true,
  },
  {
    id: "videoweergaven",
    label: "Videoweergaven",
    uitleg: "Hoe vaak de video van deze post is bekeken.",
    eenheid: "aantal",
    standaard: false,
  },
  {
    id: "vertoningen_betaald",
    label: "Betaalde vertoningen",
    uitleg: "Het deel van de vertoningen dat uit advertentiegeld kwam — nul bij een post die niet is opgehoogd.",
    eenheid: "aantal",
    standaard: false,
  },
  {
    id: "advertentie_uitgaven",
    label: "Advertentiebudget op deze post",
    uitleg: "Wat er aan deze post is uitgegeven toen hij als advertentie liep.",
    eenheid: "euro",
    standaard: false,
  },

  {
    id: "interactieratio",
    label: "Interactieratio",
    uitleg:
      "Van elke honderd vertoningen deed dit percentage er iets mee. Deelde eerder op bereik; dat " +
      "cijfer staat niet meer op deze pagina omdat het over een periode niet te reproduceren is. " +
      "De verhouding is daardoor lager dan je gewend was — het is dezelfde teller op een grotere " +
      "noemer, geen gedaalde betrokkenheid.",
    eenheid: "procent",
    standaard: true,
    afgeleid: { teller: "interacties", noemer: "vertoningen", maal: 100 },
  },
  {
    id: "gemiddelde_kijktijd",
    label: "Gemiddelde kijktijd",
    uitleg: "Hoe lang mensen gemiddeld naar de video keken.",
    eenheid: "seconden",
    standaard: false,
    afgeleid: { teller: "kijktijd_ms", noemer: "videoweergaven", maal: 0.001 },
  },
];

// ---------------------------------------------------------------------------
// Accountontwikkeling
// ---------------------------------------------------------------------------

export const ACCOUNT_STATISTIEKEN: Statistiek[] = [
  {
    id: "volgers",
    label: "Volgers",
    uitleg: "De stand aan het eind van de gekozen periode.",
    eenheid: "aantal",
    standaard: true,
  },
  {
    id: "volgers_netto",
    label: "Groei",
    uitleg: "Nieuwe volgers min vertrokken volgers in deze periode.",
    eenheid: "aantal",
    standaard: true,
  },
  {
    id: "volgers_erbij",
    label: "Nieuwe volgers",
    uitleg: "Hoeveel mensen het account gingen volgen.",
    eenheid: "aantal",
    standaard: true,
  },
  {
    id: "volgers_eraf",
    label: "Vertrokken volgers",
    uitleg: "Hoeveel mensen het account ontvolgden of van het platform verdwenen.",
    eenheid: "aantal",
    standaard: false,
    lagerIsBeter: true,
  },
  {
    id: "vertoningen",
    label: "Vertoningen",
    uitleg: "Hoe vaak er iets van dit account op iemands scherm verscheen.",
    eenheid: "aantal",
    standaard: true,
  },
  {
    id: "vertoningen_organisch",
    label: "Organische vertoningen",
    uitleg: "Het deel daarvan dat niet uit advertenties kwam.",
    eenheid: "aantal",
    standaard: false,
  },
  {
    id: "interacties",
    label: "Interacties",
    uitleg: "Alles wat mensen met de posts van dit account deden.",
    eenheid: "aantal",
    standaard: true,
  },
  {
    id: "paginaweergaven",
    label: "Profielbezoeken",
    uitleg: "Hoe vaak het profiel of de bedrijfspagina zelf is bekeken.",
    eenheid: "aantal",
    standaard: false,
  },
  {
    id: "aantal_posts",
    label: "Geplaatste posts",
    uitleg: "Hoeveel er in deze periode is gepubliceerd.",
    eenheid: "aantal",
    standaard: true,
  },
];

// ---------------------------------------------------------------------------
// Wat we per connector bij Windsor opvragen
// ---------------------------------------------------------------------------

/**
 * Vier opvragingen, vier korrels.
 *
 * GA4 kent geen enkele rij waarin een sessie, een pagina en een event tegelijk passen:
 * een sessie raakt tien pagina's en elke pagina vuurt vijf events. Wie die drie in één
 * opvraging zet, vermenigvuldigt de rijen én telt dezelfde sessie meerdere keren. Dus
 * vier keer vragen, vier tabellen — zie `supabase/migrations/0025_windsor_ga4.sql`.
 *
 * De kanaalgroep zit in alle vier de opvragingen, en dat is geen verdubbeling maar een
 * ontwerpkeuze: zonder die kolom zou een filter op "Paid Search" wél de verkeergrafiek
 * veranderen en níet de pagina's eronder, en dan staat er een half gefilterd scherm.
 *
 * Wat er bewust níet in zit: bron/medium op de landingspagina's (het verdubbelt de rijen
 * terwijl de kanaalgroep dezelfde vraag beantwoordt) en de pagina bij een event (dat is
 * de kruising die op de grootste property van ±4.000 naar ruim 100.000 rijen per dag
 * springt — zie de migratie).
 */
export const GA4_VERKEERVELDEN = [
  "date",
  "account_id",
  "account_name",
  "session_default_channel_group",
  "session_source_medium",
  "campaign",
  "devicecategory",
  "sessions",
  "totalusers",
  "newusers",
  "engaged_sessions",
  "screen_page_views",
  "conversions",
  "user_engagement_duration",
];

export const GA4_LANDINGSVELDEN = [
  "date",
  "account_id",
  "account_name",
  "landing_page",
  "session_default_channel_group",
  "campaign",
  "sessions",
  "totalusers",
  "newusers",
  "engaged_sessions",
  "conversions",
];

export const GA4_PAGINAVELDEN = [
  "date",
  "account_id",
  "account_name",
  "page_path",
  "session_default_channel_group",
  "screen_page_views",
  "totalusers",
  "sessions",
  "event_count",
  "conversions",
  "user_engagement_duration",
];

export const GA4_EVENTVELDEN = [
  "date",
  "account_id",
  "account_name",
  "event_name",
  "session_default_channel_group",
  "event_count",
  "totalusers",
  "conversions",
];

/**
 * De vaste velden per connector.
 *
 * De maatwerkconversies staan hier bewust níet bij: die heten per account anders en
 * komen erbij zodra marketing er een aanzet. De sync ontdekt ze uit de veldcatalogus en
 * plakt ze achter deze lijst — zie `lib/windsor/sync.ts`.
 *
 * Twee combinaties die Windsor weigert en waar je dus niet omheen kunt ontwerpen:
 * `publisher_platform` + `platform_position` gaan niet samen met de ranking-velden
 * (`quality_ranking` en familie), en `data_fetched_at` schakelt aggregatie helemaal uit.
 */
export const OPHAALVELDEN: Record<Connector, string[]> = {
  facebook: [
    "date",
    "account_id",
    "account_name",
    "campaign_id",
    "campaign",
    "campaign_objective",
    "campaign_effective_status",
    "adset_id",
    "adset_name",
    "ad_id",
    "ad_name",
    "effective_status",
    "thumbnail_url",
    "ad_preview_shareable_link",
    "website_destination_url",
    "effective_object_story_id",
    "instagram_permalink_url",
    "publisher_platform",
    "platform_position",
    "spend",
    "impressions",
    "reach",
    "clicks",
    "actions_link_click",
    "actions_post_engagement",
    "actions_video_view",
    "actions_lead",
  ],
  google_ads: [
    "date",
    "account_id",
    "account_name",
    "campaign_id",
    "campaign",
    "campaign_type",
    "campaign_status",
    "ad_group_id",
    "ad_group_name",
    "ad_id",
    "ad_group_ad_ad_type",
    "ad_group_ad_ad_final_urls",
    "spend",
    "impressions",
    "clicks",
    "conversions",
    "conversions_value",
    // Google kent geen kaal `video_views`; TrueView-weergaven zijn het dichtste
    // equivalent van wat Meta en LinkedIn een videoweergave noemen.
    "video_trueview_views",
    "engagements",
  ],
  linkedin: [
    "date",
    "account_id",
    "account_name",
    "campaign_group_name",
    "campaign_id",
    "campaign",
    "campaign_start_date",
    "creative_id",
    "creative_thumbnail",
    "spend",
    "impressions",
    "approximate_unique_impressions",
    "clicks",
    "landingpageclicks",
    "total_engagements",
    "video_views",
    "oneclickleads",
    "externalwebsiteconversions",
    "conversionvalueinlocalcurrency",
  ],

  // Posts en paginacijfers komen uit dezelfde connector maar hebben een andere korrel;
  // de sync doet daarom twee aparte opvragingen per organische connector. Deze lijst is
  // die van de posts — de paginavelden staan in PAGINAVELDEN hieronder.
  facebook_organic: [
    "date",
    "account_id",
    "account_name",
    "page_id",
    "post_id",
    "post_created_time",
    "post_message_oneline",
    "type",
    "permalink_url",
    "full_picture",
    "post_impressions",
    "post_impressions_organic",
    "post_impressions_paid",
    "post_impressions_unique",
    "post_engagements",
    "post_video_views_organic",
    "post_video_followers",
  ],
  instagram: [
    "date",
    "account_id",
    "account_name",
    "username",
    "media_id",
    "timestamp",
    "media_product_type",
    "media_caption",
    "media_permalink",
    "media_url",
    "media_reach",
    "media_views",
    "media_engagement",
    "media_like_count",
    "media_comments_count",
    "media_saved",
    "media_shares",
    "media_follows",
    "media_reel_total_watch_time",
  ],
  linkedin_organic: [
    "date",
    "account_id",
    "account_name",
    "organization_name",
    "post_id",
    "share_text",
    "share_post_type",
    "share_url",
    "share_impression_count",
    "share_unique_impressions_count",
    "share_total_engagements",
  ],

  // Google Analytics 4 doet vier opvragingen op vier korrels; dit record kent er maar
  // één per connector, dus alleen het verkeer staat hier. De sync haalt de andere drie
  // rechtstreeks uit GA4_LANDINGSVELDEN, GA4_PAGINAVELDEN en GA4_EVENTVELDEN hierboven.
  googleanalytics4: GA4_VERKEERVELDEN,
};

/** De paginacijfers per dag — de tweede opvraging per organische connector. */
export const PAGINAVELDEN: Partial<Record<Connector, string[]>> = {
  facebook_organic: [
    "date",
    "account_id",
    "account_name",
    "page_name",
    "page_fans",
    "page_follows",
    "page_daily_follows",
    "page_daily_unfollows",
    "page_impressions",
    "page_impressions_organic",
    "page_impressions_unique",
    "page_post_engagements",
    "page_views_total",
  ],
  linkedin_organic: [
    "date",
    "account_id",
    "account_name",
    "organization_name",
    "organization_follower_count",
    "followers_gain_organic",
    "followers_gain_paid",
    "all_page_views",
    "account_analytics_impression_count",
    "account_analytics_total_engagements",
  ],
  // Instagram staat hier bewust niet bij: `followers_count` negeert de opgegeven periode
  // en geeft altijd precies één rij met de stand van vandaag. De sync vraagt hem daarom
  // apart op, zonder periode, en schrijft hem weg op de datum van vandaag — zo bouwen we
  // de historie op die de API zelf niet heeft.
};

/**
 * Verhoudingen die geen conversies zijn maar er wel zo heten.
 *
 * Windsor biedt naast de conversie-acties ook hun percentages aan
 * (`conversions_from_interactions_rate` is het conversiepercentage, niet een aantal).
 * Die kwamen als gewone actie in de catalogus terecht en waren dus aan te vinken als
 * lead — en dan worden er percentages bij aantallen opgeteld. Een aantal en een
 * verhouding horen nooit in dezelfde kolom.
 */
function isVerhouding(veld: string): boolean {
  return veld.endsWith("_rate") || veld.endsWith("_ratio");
}

/** Herkent de maatwerkconversies in de veldcatalogus van Windsor. */
export function isConversieActie(veld: string, connector: string): boolean {
  if (isVerhouding(veld)) return false;
  if (connector === "facebook") {
    // De vaste actions_* velden (actions_lead, actions_link_click, …) halen we al op als
    // gewone statistiek; alleen de maatwerkconversies horen in de jsonb-kolom.
    //
    // De omni-velden vallen af, ook al beginnen ze met actions_. Meta weigert ze in
    // dezelfde opvraging als een uitsplitsing naar plaatsing, en die uitsplitsing
    // (publisher_platform + platform_position) is voor dit dashboard belangrijker: zonder
    // dat weten we niet of een advertentie in de feed, in stories of in reels liep.
    // Windsor geeft dat letterlijk terug als "Breakdown fields [{'platform_position',
    // 'publisher_platform'}] are incompatible with 'omni' and 'ranking' fields". Het zijn
    // bovendien standaard e-commerce-acties (add_to_cart, app_install, purchase) waar een
    // autodealer niets mee doet.
    return (
      veld.startsWith("actions_") &&
      !veld.startsWith("actions_omni_") &&
      !VASTE_META_ACTIES.has(veld)
    );
  }
  if (connector === "google_ads") {
    return (
      veld.startsWith("conversions_") &&
      !veld.startsWith("conversions_value") &&
      !VASTE_GOOGLE_CONVERSIES.has(veld)
    );
  }
  return false;
}

const VASTE_META_ACTIES = new Set([
  "actions_lead",
  "actions_link_click",
  "actions_post_engagement",
  "actions_video_view",
  "actions_total",
  "actions_purchase",
  "actions_landing_page_view",
  "actions_page_engagement",
  "actions_post_reaction",
  "actions_comment",
  "actions_post",
  "actions_like",
  "actions_photo_view",
  "actions_search",
  "actions_view_content",
]);

const VASTE_GOOGLE_CONVERSIES = new Set([
  "conversions_by_conversion_date",
  "conversions_from_interactions_value_per_interaction",
  "conversions_unique_query_clusters",
  "conversions_value",
  "conversions_value_by_conversion_date",
  "conversions_value_per_cost",
]);

/**
 * Maakt van een veldnaam een leesbaar label: `actions_proefrit_aanvraag` wordt
 * "Proefrit aanvraag", `conversions_ga4_https_udenhout_nl_web_generate_lead_offerte`
 * wordt "Offerte". De ruwe naam blijft in de database staan, dus een label dat er naast
 * zit is in de koppeltabel te corrigeren zonder dat er data verloren gaat.
 */
export function labelVoorConversie(veld: string): string {
  const kaal = veld
    .replace(/^actions_/, "")
    .replace(/^conversions_/, "")
    .replace(/^ga4_https_udenhout_nl_web_/, "")
    .replace(/^bic_bedrijfswagen_inbouw_centrum_ga4_web_/, "BIC ")
    .replace(/^ud_(macro|micro)_/, "")
    .replace(/^generate_lead_/, "")
    .replace(/_\d+_udenhout_nl_losse_conversies_[ab]_$/, "")
    .replace(/_+/g, " ")
    .trim();
  if (!kaal) return veld;
  return kaal.charAt(0).toUpperCase() + kaal.slice(1);
}

// ---------------------------------------------------------------------------
// Website — Google Analytics 4
// ---------------------------------------------------------------------------


/**
 * De statistieken van het verkeer — het bovenste blok van de pagina Website.
 *
 * ## Wat wél en wat niet optelt over dagen
 *
 * Dit is de belangrijkste scheiding op deze pagina, en het is een andere dan bij de
 * advertenties. **Sessies, nieuwe gebruikers, weergaven, events en conversies** zijn
 * gebeurtenissen: een dag levert er een hoeveelheid van op en dertig dagen leveren de som
 * op. **Gebruikers** is dat niet. GA4 ontdubbelt dat cijfer binnen de opgevraagde periode,
 * en wij bewaren dagcijfers — wie op drie dagen langskwam zit in drie dagrijen.
 *
 * Bij de advertenties is om precies deze reden besloten bereik helemaal niet te tonen
 * (zie de kop van dit bestand). Hier is de afweging anders uitgevallen, en dat is een
 * bewuste afwijking: "hoeveel gebruikers" is de eerste vraag die iemand aan GA4 stelt, en
 * een pagina die hem niet beantwoordt stuurt marketing terug naar GA4 — precies wat dit
 * tabblad moest voorkomen. Het cijfer staat er dus, maar met de waarheid erbij in zijn
 * eigen `uitleg` en in de leeswijzer: over één dag is het exact, over een langere periode
 * ligt het hoger dan GA4. Wie het precieze periodecijfer nodig heeft, kiest één dag of
 * kijkt naar **nieuwe gebruikers**, dat wél exact optelt.
 *
 * Verhoudingen staan hier nooit als opgeslagen kolom maar altijd als `afgeleid`: het
 * gemiddelde van dertig engagementratio's is niet de engagementratio van die dertig dagen.
 */
export const WEBSITE_STATISTIEKEN: Statistiek[] = [
  {
    id: "sessies",
    label: "Sessies",
    uitleg:
      "Het aantal bezoeken. Een bezoek eindigt na dertig minuten zonder activiteit, dus dezelfde " +
      "persoon kan op één dag meerdere sessies hebben. Telt exact op over dagen.",
    eenheid: "aantal",
    standaard: true,
  },
  {
    id: "gebruikers",
    label: "Gebruikers",
    uitleg:
      "Het aantal verschillende bezoekers. LET OP: dit is per dág ontdubbeld en wordt over de " +
      "periode opgeteld — wie op drie dagen langskwam telt drie keer. Over één dag komt dit overeen " +
      "met GA4, over een langere periode ligt het hoger. Nieuwe gebruikers telt wél exact op.",
    eenheid: "aantal",
    standaard: true,
  },
  {
    id: "nieuwe_gebruikers",
    label: "Nieuwe gebruikers",
    uitleg:
      "Bezoekers die de site voor het eerst bezochten. Iemand is maar één keer nieuw, dus dit cijfer " +
      "telt exact op over de hele periode.",
    eenheid: "aantal",
    standaard: true,
  },
  {
    id: "weergaven",
    label: "Paginaweergaven",
    uitleg: "Hoe vaak er een pagina is geopend, herhaalde weergaven van dezelfde pagina meegeteld.",
    eenheid: "aantal",
    standaard: true,
  },
  {
    id: "conversies",
    label: "Conversies",
    uitleg:
      "Het aantal key events: de events die in GA4 als conversie zijn aangemerkt, bij elkaar " +
      "opgeteld. Welke dat zijn, lees je in de tabel Conversies onderaan de pagina.",
    eenheid: "aantal",
    standaard: true,
  },
  {
    id: "betrokken_sessies",
    label: "Betrokken sessies",
    uitleg:
      "Sessies die langer dan tien seconden duurden, een conversie opleverden of minstens twee " +
      "pagina's bekeken. Het omgekeerde hiervan is wat vroeger een bounce heette.",
    eenheid: "aantal",
    standaard: false,
  },
  {
    id: "betrokkenheidstijd",
    label: "Betrokkenheidstijd",
    uitleg:
      "Alle tijd dat de site daadwerkelijk op de voorgrond stond, bij elkaar opgeteld. Een tabblad " +
      "dat op de achtergrond openstaat telt niet mee.",
    eenheid: "seconden",
    standaard: false,
  },

  // Afgeleid — berekend ná het optellen, zie de toelichting bovenaan dit bestand.
  {
    id: "engagementratio",
    label: "Engagementratio",
    uitleg:
      "Van elke honderd sessies dit percentage betrokken. Honderd min dit getal is het " +
      "bouncepercentage — GA4 rekent die twee als elkaars spiegelbeeld.",
    eenheid: "procent",
    standaard: true,
    afgeleid: { teller: "betrokken_sessies", noemer: "sessies", maal: 100 },
  },
  {
    id: "conversieratio",
    label: "Conversieratio",
    uitleg: "Van elke honderd sessies leverde dit percentage minstens één key event op.",
    eenheid: "procent",
    standaard: false,
    afgeleid: { teller: "conversies", noemer: "sessies", maal: 100 },
  },
  {
    id: "weergaven_per_sessie",
    label: "Weergaven per sessie",
    uitleg: "Hoeveel pagina's iemand gemiddeld bekeek binnen één bezoek.",
    eenheid: "aantal",
    standaard: false,
    afgeleid: { teller: "weergaven", noemer: "sessies" },
  },
  {
    id: "sessieduur",
    label: "Gem. betrokkenheidstijd",
    uitleg:
      "De betrokkenheidstijd gedeeld door het aantal sessies — hetzelfde cijfer dat GA4 " +
      "'gemiddelde betrokkenheidstijd per sessie' noemt.",
    eenheid: "seconden",
    standaard: false,
    afgeleid: { teller: "betrokkenheidstijd", noemer: "sessies" },
  },
  {
    id: "aandeel_nieuw",
    label: "Aandeel nieuw",
    uitleg:
      "Welk deel van de bezoekers voor het eerst kwam. Deelt op de dagelijks ontdubbelde " +
      "gebruikers, dus over een lange periode is dit een ondergrens.",
    eenheid: "procent",
    standaard: false,
    afgeleid: { teller: "nieuwe_gebruikers", noemer: "gebruikers", maal: 100 },
  },
];

/**
 * De statistieken van een landingspagina: het instappunt.
 *
 * `sessies` heet hier bewust **Instappen**. Op deze korrel telt GA4 alleen de sessies die
 * op deze pagina begónnen — hetzelfde getal, een andere betekenis, en dat verschil is de
 * hele reden dat deze tabel apart bestaat.
 */
export const LANDINGSPAGINA_STATISTIEKEN: Statistiek[] = [
  {
    id: "sessies",
    label: "Instappen",
    uitleg:
      "Hoe vaak een bezoek op deze pagina begon. Dit is niet het aantal keer dat de pagina bekeken " +
      "is — wie er later in het bezoek langskomt, telt hier niet mee.",
    eenheid: "aantal",
    standaard: true,
  },
  {
    id: "gebruikers",
    label: "Gebruikers",
    uitleg:
      "Het aantal verschillende bezoekers dat hier binnenkwam, per dag ontdubbeld en over de " +
      "periode opgeteld — zie de leeswijzer.",
    eenheid: "aantal",
    standaard: false,
  },
  {
    id: "nieuwe_gebruikers",
    label: "Nieuwe gebruikers",
    uitleg: "Bezoekers die hier voor het eerst op de site binnenkwamen. Telt exact op.",
    eenheid: "aantal",
    standaard: true,
  },
  {
    id: "betrokken_sessies",
    label: "Betrokken sessies",
    uitleg: "De instappen die niet meteen weer weg waren — zie Engagementratio.",
    eenheid: "aantal",
    standaard: false,
  },
  {
    id: "conversies",
    label: "Conversies",
    uitleg:
      "De key events uit de sessies die hier begonnen. Ze hoeven dus niet op déze pagina te zijn " +
      "gebeurd: een bezoeker die hier binnenkomt en drie pagina's verder een formulier invult, telt " +
      "hier mee. Dat is precies wat je van een landingspagina wilt weten.",
    eenheid: "aantal",
    standaard: true,
  },

  {
    id: "engagementratio",
    label: "Engagementratio",
    uitleg:
      "Van elke honderd instappen bleef dit percentage hangen. Laag betekent: de pagina lost de " +
      "belofte van de advertentie of het zoekresultaat niet in.",
    eenheid: "procent",
    standaard: true,
    afgeleid: { teller: "betrokken_sessies", noemer: "sessies", maal: 100 },
  },
  {
    id: "conversieratio",
    label: "Conversieratio",
    uitleg: "Van elke honderd instappen op deze pagina leverde dit percentage een key event op.",
    eenheid: "procent",
    standaard: true,
    afgeleid: { teller: "conversies", noemer: "sessies", maal: 100 },
  },
  {
    id: "aandeel_nieuw",
    label: "Aandeel nieuw",
    uitleg: "Welk deel van de instappers de site voor het eerst zag.",
    eenheid: "procent",
    standaard: false,
    afgeleid: { teller: "nieuwe_gebruikers", noemer: "gebruikers", maal: 100 },
  },
];

/**
 * De statistieken van een pagina: wat er ná de instap gebeurt.
 *
 * Twee cijfers hier zijn sessie-scope op een pagina-korrel en tellen daarom **niet** op
 * over pagina's: `sessies` en `gebruikers`. Eén sessie raakt tien pagina's en staat bij
 * alle tien. Ze staan er wel (je wilt per pagina weten hoeveel bezoeken hem zagen) maar
 * niet als standaardkolom, en de totaalregel eronder is voor die twee dus geen
 * werkelijkheid maar een optelsom. Wat wél optelt: weergaven, events en conversies.
 */
export const PAGINA_STATISTIEKEN: Statistiek[] = [
  {
    id: "weergaven",
    label: "Weergaven",
    uitleg: "Hoe vaak deze pagina is geopend, herhalingen meegeteld. Telt op over pagina's en dagen.",
    eenheid: "aantal",
    standaard: true,
  },
  {
    id: "conversies",
    label: "Conversies",
    uitleg:
      "Het aantal key events dat op deze pagina vuurde. Welke events dat waren, staat niet per " +
      "pagina in de data — die kruising is te groot om op te halen (zie migratie 0025); de tabel " +
      "Conversies onderaan geeft de namen over de hele site.",
    eenheid: "aantal",
    standaard: true,
  },
  {
    id: "events",
    label: "Events",
    uitleg: "Alle events die op deze pagina vuurden, inclusief page_view, scroll en user_engagement.",
    eenheid: "aantal",
    standaard: true,
  },
  {
    id: "sessies",
    label: "Sessies",
    uitleg:
      "Bezoeken waarin deze pagina voorkwam. Telt NIET op over pagina's: één bezoek dat tien " +
      "pagina's raakt, staat bij alle tien. De totaalregel is hier dus een optelsom en geen " +
      "werkelijk aantal bezoeken.",
    eenheid: "aantal",
    standaard: false,
  },
  {
    id: "gebruikers",
    label: "Gebruikers",
    uitleg:
      "Bezoekers die deze pagina zagen. Telt om dezelfde reden niet op over pagina's, en ook niet " +
      "over dagen — zie de leeswijzer.",
    eenheid: "aantal",
    standaard: false,
  },
  {
    id: "betrokkenheidstijd",
    label: "Betrokkenheidstijd",
    uitleg: "Alle tijd die bezoekers met deze pagina op de voorgrond doorbrachten, opgeteld.",
    eenheid: "seconden",
    standaard: false,
  },

  {
    id: "tijd_per_weergave",
    label: "Gem. tijd per weergave",
    uitleg: "Hoe lang iemand gemiddeld op deze pagina bleef voordat hij doorklikte of vertrok.",
    eenheid: "seconden",
    standaard: true,
    afgeleid: { teller: "betrokkenheidstijd", noemer: "weergaven" },
  },
  {
    id: "conversies_per_weergave",
    label: "Conversies per 100 weergaven",
    uitleg: "Hoeveel key events er per honderd weergaven van deze pagina vuurden.",
    eenheid: "aantal",
    standaard: false,
    afgeleid: { teller: "conversies", noemer: "weergaven", maal: 100 },
  },
];

/**
 * De statistieken van een event.
 *
 * `conversies` doet hier dubbel werk: het is het aantal keer dat dit event als key event
 * telde, én daarmee het antwoord op de vraag óf het een key event is. Boven nul betekent
 * ja. Een aparte lijst met "welke events zijn conversies" zou een tweede waarheid zijn
 * over iets wat GA4 zelf al bijhoudt.
 */
export const EVENT_STATISTIEKEN: Statistiek[] = [
  {
    id: "events",
    label: "Aantal keer",
    uitleg: "Hoe vaak dit event heeft gevuurd in de gekozen periode.",
    eenheid: "aantal",
    standaard: true,
  },
  {
    id: "conversies",
    label: "Waarvan conversie",
    uitleg:
      "Hoe vaak dit event als key event telde. Staat hier nul, dan is het in GA4 niet als conversie " +
      "aangemerkt — en dan telt het ook nergens anders op deze pagina als conversie mee.",
    eenheid: "aantal",
    standaard: true,
  },
  {
    id: "gebruikers",
    label: "Gebruikers",
    uitleg:
      "Hoeveel verschillende bezoekers dit event afvuurden, per dag ontdubbeld en over de periode " +
      "opgeteld — zie de leeswijzer.",
    eenheid: "aantal",
    standaard: true,
  },

  {
    id: "per_gebruiker",
    label: "Per gebruiker",
    uitleg: "Hoe vaak één bezoeker dit event gemiddeld afvuurde.",
    eenheid: "aantal",
    standaard: false,
    afgeleid: { teller: "events", noemer: "gebruikers" },
  },
];
