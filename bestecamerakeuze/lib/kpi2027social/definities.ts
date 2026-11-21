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
 *  - **Volgers** tellen niet op: het is een stand op een dag (alle kanalen, besluit van de
 *    eigenaar op 20 november 2026; daarvoor was het een paar uur "nieuwe volgers" bij Instagram
 *    en Facebook — de maat `nieuwe-volgers` en de opslag ervan bestaan nog, maar geen KPI
 *    gebruikt hem). "Volgers +7%" betekent: eind
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
 *    Besluit van de eigenaar (20 november 2026): toch `followers_count`, vanaf nu elke dag
 *    bijgehouden (nachtelijke sync + wekelijkse ophaalactie), en 1 januari t/m de dag vóór de
 *    eerste gemeten stand krijgen de waarde van die eerste stand (`aanvullen` in
 *    `berekenVolgers`, gestippeld in de grafiek).
 *  - **LinkedIn** (`linkedin_organic`): vertoningen = `account_analytics_impression_count`
 *    per dag. Volgers = de stand van vandaag (`organization_follower_count`) min de
 *    netto aanwas per dag erna (`followers_gain_organic` + `followers_gain_paid`, kan
 *    negatief zijn): zo is de stand op elke dag van het jaar terug te rekenen. Eén opvraging
 *    mag niet meer dan 14 maanden beslaan.
 *  - **Facebook** (`facebook_organic`): volgers = `page_follows` (het totaal, een stand per
 *    dag), vertoningen = `page_impressions`, nieuwe volgers = `page_daily_follows`, allemaal per
 *    dag en het hele jaar terug. Op 20 november 2026 opnieuw gekoppeld (stond sinds 8 oktober uit) en nagelopen: alle
 *    318 dagen t/m 14 november aanwezig voor alle drie de pagina's. **Altijd per dag opvragen**:
 *    Windsors eigen maandoptelling van `page_daily_follows` geeft voor februari, april, juni en
 *    september 0, terwijl de dagen ervan gewoon nieuwe volgers hebben (februari Van den Udenhout:
 *    12). `somPerDag` telt zelf op. Audi Sport = de pagina Audi Sport Eindhoven.
 *  - **TikTok en YouTube**: niet gekoppeld in Windsor. De KPI's staan erin (met hun
 *    percentage) en tonen "nog niet gekoppeld" tot er een account is.
 */

export type SocialKanaal = "facebook" | "instagram" | "linkedin" | "tiktok" | "youtube";

/**
 * Volgers (een stand op een dag), nieuwe volgers of vertoningen (allebei een aantal per dag,
 * optelbaar).
 */
export type SocialMaat = "volgers" | "nieuwe-volgers" | "vertoningen";

export interface SocialKpi {
  /** Uniek binnen het merk, bv. `instagram-volgers`. */
  sleutel: string;
  naam: string;
  kanaal: SocialKanaal;
  maat: SocialMaat;
  /** Het groeipercentage voor 2027 zoals het team het vastlegde (fractie: 0,07 = +7%). */
  groei: number;
  /**
   * True als het team (nog) geen percentage vastlegde en `groei` de standaard +5% is
   * (Porsche Centrum Brabant, Porsche Centrum Maastricht en Instra, toegevoegd 21 november
   * 2026). Aan te passen op de pagina zelf, net als de andere percentages.
   */
  standaard?: boolean;
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

const NIET_IN_WINDSOR = (kanaal: string) =>
  `${kanaal} is niet gekoppeld in Windsor. Zodra het account daar gekoppeld is, kan deze KPI worden aangesloten.`;

/** Het percentage voor een KPI waarvoor het team (nog) niets vastlegde: +5%, net als op KPI's 2027 GA. */
export const STANDAARD_GROEI = 0.05;

function kpi(kanaal: SocialKanaal, maat: SocialMaat, groei: number, standaard = false): SocialKpi {
  return {
    sleutel: `${kanaal}-${maat}`,
    naam: `${KANAAL_NAMEN[kanaal]} ${maat === "volgers" ? "volgers" : maat === "nieuwe-volgers" ? "nieuwe volgers" : "impressies"}`,
    kanaal,
    maat,
    groei,
    ...(standaard ? { standaard: true } : {}),
  };
}

/** Volgers en impressies op elk gegeven kanaal, met de standaard +5%. */
function standaardKpis(kanalen: SocialKanaal[]): SocialKpi[] {
  return kanalen.flatMap((k) => [kpi(k, "volgers", STANDAARD_GROEI, true), kpi(k, "vertoningen", STANDAARD_GROEI, true)]);
}

export const SOCIAL_MERKEN: readonly SocialMerk[] = [
  {
    sleutel: "udenhout",
    naam: "Van den Udenhout",
    accounts: [
      { kanaal: "facebook", accountId: "135654409827841", naam: "Van den Udenhout" },
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
      { kanaal: "facebook", accountId: "113133791655546", naam: "VELOO" },
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
      { kanaal: "facebook", accountId: "324389797988583", naam: "Audi Sport Eindhoven" },
      { kanaal: "instagram", accountId: "17841402138338797", naam: "audisportdealer" },
    ],
    kpis: [
      kpi("facebook", "volgers", 0.05),
      kpi("facebook", "vertoningen", 0.33),
      kpi("instagram", "volgers", 0.02),
      kpi("instagram", "vertoningen", 0.15),
    ],
  },
  // Toegevoegd 21 november 2026: alle organische social-accounts die in Windsor gekoppeld
  // zijn en in 2026 actief waren, krijgen een tab. Het team legde voor deze drie nog geen
  // percentages vast; tot dan +5% (`standaard`), op de pagina aan te passen.
  {
    sleutel: "porsche-brabant",
    naam: "Porsche Centrum Brabant",
    accounts: [
      { kanaal: "facebook", accountId: "152454588113374", naam: "Porsche Centrum Brabant" },
      { kanaal: "instagram", accountId: "17841400735388282", naam: "porschebrabant" },
      { kanaal: "linkedin", accountId: "1688996", naam: "Porsche Centrum Brabant" },
    ],
    kpis: standaardKpis(["facebook", "instagram", "linkedin"]),
  },
  {
    sleutel: "porsche-maastricht",
    naam: "Porsche Centrum Maastricht",
    accounts: [
      { kanaal: "facebook", accountId: "1856659467764845", naam: "Porsche Centrum Maastricht" },
      { kanaal: "instagram", accountId: "17841409820778415", naam: "porschecentrummaastricht" },
      { kanaal: "linkedin", accountId: "77458602", naam: "Porsche Centrum Maastricht" },
    ],
    kpis: standaardKpis(["facebook", "instagram", "linkedin"]),
  },
  {
    sleutel: "instra",
    naam: "Instra",
    accounts: [{ kanaal: "facebook", accountId: "274218899266126", naam: "Instra Bedrijfswagen- en Werkplaatsinrichtingen" }],
    kpis: standaardKpis(["facebook"]),
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

/** +7% / −6%, voor in de keuzes (de UI heeft zijn eigen notatie in `GroeiBewerken.tsx`). */
function procentTekst(groei: number): string {
  const p = Math.round(groei * 1000) / 10;
  return `${p >= 0 ? "+" : "−"}${String(Math.abs(p)).replace(".", ",")}%`;
}

const KEUZE_STAND =
  "Volgers is het totaal aantal volgers op een dag, geen optelsom (besluit van de eigenaar, 20 november 2026). De basis is het aantal op 31 december 2026; het target is het aantal dat er eind 2027 moet zijn. Zolang 2026 loopt, is de basis de laatste stand plus de gemiddelde groei per dag tot 31 december.";
const KEUZE_OPTELLEN =
  "Rekent precies als KPI's Google Analytics: wat het platform t/m de peildatum telde, plus het gemiddelde per dag × de resterende dagen van 2026. Het maandtarget is het jaartarget ÷ 12, zonder seizoenspatroon.";
const KEUZE_ACHTERSTAND =
  "Hooguit drie lege dagen vlak vóór de peildatum tellen als nog niet binnen in plaats van als nul: LinkedIn en Meta leveren hun dagcijfers een tot twee dagen later.";
const KEUZE_DEFINITIEF =
  "Vanaf 3 januari 2027 wordt 2026 één laatste keer volledig opgehaald en definitief: dan rust het target op het hele, gemeten jaar en verdwijnt elke verwachting.";

/**
 * De besluiten achter één KPI, in gewone taal, voor onder de grafiek ("Keuzes in de
 * definitie", net als op KPI's 2027 Syntec). Elke KPI heeft er minstens één (getest).
 * Verander je een definitie of een rekenregel, pas dan in dezelfde wijziging deze tekst aan.
 */
export function keuzesVoor(merk: SocialMerk, kpi: SocialKpi): string[] {
  const account = accountVoor(merk, kpi.kanaal);
  const uit: string[] = [
    kpi.standaard
      ? `${procentTekst(kpi.groei)} is een voorlopig target: het team legde voor dit account nog geen percentage vast, dus geldt de standaard +5% (net als op KPI's 2027 GA). Aan te passen hierboven.`
      : `${procentTekst(kpi.groei)} is het target dat het team voor deze KPI vastlegde (november 2026), op basis van het resultaat van 2026; geen standaard +5%.`,
  ];
  if (!account?.accountId) {
    uit.push(
      `${KANAAL_NAMEN[kpi.kanaal]} is niet gekoppeld in Windsor. Het target staat erop, maar zonder cijfers. Zodra het account gekoppeld is, telt het totaal aantal volgers, als stand (net als de andere volgers-KPI's).`,
    );
    return uit;
  }
  if (kpi.maat === "volgers") {
    uit.push(KEUZE_STAND);
    if (kpi.kanaal === "instagram") {
      uit.push(
        "Instagram geeft alleen het aantal volgers van vandaag (followers_count), geen historie. Besluit van de eigenaar (20 november 2026): 1 januari t/m de dag vóór de eerste meting krijgen het aantal van die eerste meting; vanaf dan telt elke dag het echte aantal. Het dashboard bewaart daarvoor elke nacht de stand.",
        "Die aangevulde maanden zijn een aanname: gestippeld in de grafiek, en ze tellen niet mee in de groei per dag. Het target zelf rust op het echt gemeten aantal van 31 december 2026.",
        "Niet gebruikt: nieuwe volgers per dag (follower_count_1d, bij Meta maar 30 dagen terug) en follows_and_unfollows (volgen en ontvolgen bij elkaar opgeteld, dus geen netto groei).",
      );
    } else if (kpi.kanaal === "facebook") {
      uit.push(
        "Facebook levert het totaal aantal volgers per dag (page_follows), heel 2026 gemeten: hier is niets aangevuld of geschat. Eerst was gekozen voor 'nieuwe volgers'; dat is teruggedraaid zodra bleek dat het totaal beschikbaar is.",
        "Een pagina die nooit van likes naar volgers is omgezet, telt het aantal paginalikes (page_fans).",
      );
    } else if (kpi.kanaal === "linkedin") {
      uit.push(
        "LinkedIn levert het aantal volgers van vandaag en de netto aanwas per dag (organisch plus via advertenties). Het aantal op elke eerdere dag van 2026 is daaruit teruggerekend.",
      );
    }
  } else {
    uit.push(KEUZE_OPTELLEN, KEUZE_ACHTERSTAND);
    if (kpi.kanaal === "instagram") {
      uit.push(
        "Instagram heeft geen impressies meer: views is sinds 2025 Meta's opvolger en telt ook herhaald bekijken van posts, reels en stories. Het percentage van het team geldt dus voor views.",
      );
    } else if (kpi.kanaal === "facebook") {
      uit.push("Vertoningen van de pagina (page_impressions), organisch en betaald samen, zoals Facebook ze telt.");
    } else if (kpi.kanaal === "linkedin") {
      uit.push("Alleen organische vertoningen van de bedrijfspagina; advertenties tellen niet mee.");
    }
  }
  if (account.naam && merk.sleutel === "audi-sport" && kpi.kanaal === "facebook") {
    uit.push("Audi Sport is op Facebook de pagina Audi Sport Eindhoven.");
  }
  uit.push(KEUZE_DEFINITIEF);
  return uit;
}
