/**
 * KPI's 2027 social media: welke account op welk kanaal bij welk merk hoort, en het
 * groeipercentage dat het team per KPI voor 2027 vastlegde (november 2026).
 *
 * Alles over de koppeling staat hier; het rekenwerk in `rekenen.ts`, het ophalen in
 * `ophalen.ts`. Onderzocht in Windsor (november 2026) — wat er per kanaal kan:
 *
 * ## Volgers zijn een stand, vertoningen een aantal
 *
 *  - **Vertoningen** tellen op, net als sessies op KPI's 2027 GA: wat er t/m de peildatum
 *    binnenkwam plus het gemiddelde per dag × de resterende dagen = verwachting 2026,
 *    × (1 + groei) = target 2027, ÷ 12 = maandtarget.
 *  - **Volgers** tellen niet op: het is een stand op een dag. "Volgers +7%" betekent: eind
 *    2027 7% meer volgers dan eind 2026. De basis is dus de stand op 31 december 2026 (zolang
 *    het jaar loopt: de laatste stand plus de trend per dag tot 31 december), het target de
 *    stand die er eind 2027 moet zijn.
 *
 * ## Per kanaal
 *
 *  - **Instagram** (`instagram`): vertoningen = `views` (Meta's opvolger van impressions,
 *    dat sinds 2025 is afgevoerd), per dag, terug tot augustus 2025. Volgers =
 *    `followers_count`, en dat is **alleen de stand van vandaag**: de API heeft geen
 *    historie. `follower_count_1d` gaat maar dertig dagen terug en telt alleen nieuwe
 *    volgers, `follows_and_unfollows` telt volgen én ontvolgen bij elkaar op (1–14 november
 *    bij udenhoutgroep: 63 tegen 49 nieuwe volgers) — geen van beide geeft de netto groei.
 *    De historie bouwt zich daarom op vanaf november 2026, uit de nachtelijke momentopname
 *    (`windsor_account_dag`) en de wekelijkse ophaalactie.
 *  - **LinkedIn** (`linkedin_organic`): vertoningen = `account_analytics_impression_count`
 *    per dag. Volgers = de stand van vandaag (`organization_follower_count`) min de
 *    netto aanwas per dag erna (`followers_gain_organic` + `followers_gain_paid`, kan
 *    negatief zijn): zo is de stand op elke dag van het jaar terug te rekenen. Eén opvraging
 *    mag niet meer dan 14 maanden beslaan.
 *  - **Facebook** (`facebook_organic`): volgers = `page_follows` per dag (een stand),
 *    vertoningen = `page_impressions` per dag. **Niet gekoppeld sinds 8 oktober 2026**: de
 *    nachtelijke sync faalt met "No facebook_organic accounts are configured". Zodra de
 *    pagina's in Windsor opnieuw zijn geselecteerd, haalt de eerstvolgende run heel 2026 op.
 *  - **TikTok en YouTube**: niet gekoppeld in Windsor. De KPI's staan erin (met hun
 *    percentage) en tonen "nog niet gekoppeld" tot er een account is.
 */

export type SocialKanaal = "facebook" | "instagram" | "linkedin" | "tiktok" | "youtube";

/** Volgers (een stand op een dag) of vertoningen (een aantal per dag, optelbaar). */
export type SocialMaat = "volgers" | "vertoningen";

export interface SocialKpi {
  /** Uniek binnen het merk, bv. `instagram-volgers`. */
  sleutel: string;
  naam: string;
  kanaal: SocialKanaal;
  maat: SocialMaat;
  /** Het groeipercentage voor 2027 zoals het team het vastlegde (fractie: 0,07 = +7%). */
  groei: number;
}

export interface SocialAccount {
  kanaal: SocialKanaal;
  /** Het account-id bij Windsor; null als het kanaal (nog) niet gekoppeld is. */
  accountId: string | null;
  /** Zoals het in het platform heet, voor onder de grafiek. */
  naam: string;
  /** Waarom er (nog) geen cijfers zijn, als dat zo is. */
  nietGekoppeld?: string;
}

export interface SocialMerk {
  sleutel: string;
  naam: string;
  accounts: SocialAccount[];
  kpis: SocialKpi[];
}

export const KANAAL_NAMEN: Record<SocialKanaal, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
};

/** De volgorde van de kanalen op de pagina en in de tabel. */
export const KANAAL_VOLGORDE: readonly SocialKanaal[] = ["facebook", "instagram", "linkedin", "tiktok", "youtube"];

const FACEBOOK_LOS =
  "De Facebook-koppeling in Windsor staat sinds 8 oktober 2026 uit (\"No facebook_organic accounts are configured\"). Selecteer de pagina's opnieuw in Windsor; de eerstvolgende update haalt dan heel 2026 op.";
const NIET_IN_WINDSOR = (kanaal: string) =>
  `${kanaal} is niet gekoppeld in Windsor. Zodra het account daar gekoppeld is, kan deze KPI worden aangesloten.`;

function kpi(kanaal: SocialKanaal, maat: SocialMaat, groei: number): SocialKpi {
  return {
    sleutel: `${kanaal}-${maat}`,
    naam: `${KANAAL_NAMEN[kanaal]} ${maat === "volgers" ? "volgers" : "impressies"}`,
    kanaal,
    maat,
    groei,
  };
}

export const SOCIAL_MERKEN: readonly SocialMerk[] = [
  {
    sleutel: "udenhout",
    naam: "Van den Udenhout",
    accounts: [
      { kanaal: "facebook", accountId: "135654409827841", naam: "Van den Udenhout", nietGekoppeld: FACEBOOK_LOS },
      { kanaal: "instagram", accountId: "17841400383959539", naam: "udenhoutgroep" },
      { kanaal: "linkedin", accountId: "288254", naam: "Van den Udenhout Groep" },
      { kanaal: "tiktok", accountId: null, naam: "TikTok", nietGekoppeld: NIET_IN_WINDSOR("TikTok") },
      { kanaal: "youtube", accountId: null, naam: "YouTube", nietGekoppeld: NIET_IN_WINDSOR("YouTube") },
    ],
    kpis: [
      kpi("facebook", "volgers", 0.01),
      kpi("facebook", "vertoningen", 0.08),
      kpi("instagram", "volgers", 0.07),
      kpi("instagram", "vertoningen", 0.19),
      kpi("linkedin", "volgers", 0.05),
      kpi("linkedin", "vertoningen", 0.09),
      kpi("tiktok", "volgers", 0.15),
      kpi("youtube", "volgers", 0.04),
    ],
  },
  {
    sleutel: "veloo",
    naam: "VELOO",
    accounts: [
      { kanaal: "facebook", accountId: "113133791655546", naam: "VELOO", nietGekoppeld: FACEBOOK_LOS },
      { kanaal: "instagram", accountId: "17841457360463399", naam: "veloonl" },
      { kanaal: "linkedin", accountId: "91687065", naam: "VELOO" },
    ],
    kpis: [
      kpi("facebook", "volgers", 0.05),
      kpi("facebook", "vertoningen", -0.06),
      kpi("instagram", "volgers", 0.17),
      kpi("instagram", "vertoningen", 0.17),
      kpi("linkedin", "volgers", 0.07),
      kpi("linkedin", "vertoningen", 0.21),
    ],
  },
  {
    sleutel: "audi-sport",
    naam: "Audi Sport",
    accounts: [
      { kanaal: "facebook", accountId: "324389797988583", naam: "Audi Sport Eindhoven", nietGekoppeld: FACEBOOK_LOS },
      { kanaal: "instagram", accountId: "17841402138338797", naam: "audisportdealer" },
    ],
    kpis: [
      kpi("facebook", "volgers", 0.05),
      kpi("facebook", "vertoningen", 0.33),
      kpi("instagram", "volgers", 0.02),
      kpi("instagram", "vertoningen", 0.15),
    ],
  },
];

/**
 * Of een kanaal nu als "niet gekoppeld" geldt. Facebook staat hier bewust níet bij: het
 * account-id is bekend en de ophaalactie probeert het elke week; lukt het, dan verschijnen
 * de cijfers vanzelf en verdwijnt de melding (die toont alleen zolang er geen stand is).
 */
export function isGekoppeld(account: SocialAccount | undefined): account is SocialAccount & { accountId: string } {
  return Boolean(account?.accountId);
}

export function accountVoor(merk: SocialMerk, kanaal: SocialKanaal): SocialAccount | undefined {
  return merk.accounts.find((a) => a.kanaal === kanaal);
}

/** De sleutel van een account in `kpi_2027_social_standen`: kanaal en account-id. */
export function standSleutel(kanaal: SocialKanaal, accountId: string): string {
  return `${kanaal}:${accountId}`;
}

/** Alle gekoppelde accounts, elk één keer (een account kan in meerdere merken staan). */
export function alleAccounts(): { kanaal: SocialKanaal; accountId: string; naam: string }[] {
  const gezien = new Map<string, { kanaal: SocialKanaal; accountId: string; naam: string }>();
  for (const merk of SOCIAL_MERKEN) {
    for (const a of merk.accounts) {
      if (a.accountId) gezien.set(standSleutel(a.kanaal, a.accountId), { kanaal: a.kanaal, accountId: a.accountId, naam: a.naam });
    }
  }
  return [...gezien.values()];
}

export function vindSocialKpi(merkSleutel: string, kpiSleutel: string): SocialKpi | undefined {
  return SOCIAL_MERKEN.find((m) => m.sleutel === merkSleutel)?.kpis.find((k) => k.sleutel === kpiSleutel);
}
