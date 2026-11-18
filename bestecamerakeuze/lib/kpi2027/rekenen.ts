import {
  KPI_DOELJAAR,
  KPI_GROEI,
  KPI_JAAR,
  eventBron,
  type KpiDefinitie,
  type KpiWebsite,
  type Periode,
} from "@/lib/kpi2027/definities";

/**
 * Het rekenwerk achter het tabblad KPI's 2027: wat doet 2026 naar verwachting, en wat is
 * dan het target voor 2027?
 *
 * Geen database, geen netwerk, geen React — pure functies, getest in `rekenen.test.ts`.
 *
 * ## De rekensom
 *
 *  1. **Gerealiseerd**: wat GA4 op de gemeten dagen t/m de peildatum telde.
 *  2. **Gemiddelde per dag**: gerealiseerd ÷ het aantal gemeten dagen.
 *  3. **Verwachting 2026**: gerealiseerd + gemiddelde × alle overige dagen van 2026 — de
 *     resterende dagen, en de dagen waarop niet gemeten werd (`definities.ts`).
 *  4. **Target 2027**: verwachting × 1,05.
 *  5. **Maandtarget 2027**: het jaartarget ÷ 12 — bewust een gelijke twaalfde en geen
 *     verdeling naar het aantal dagen of het seizoen, zodat hij in het overleg na te
 *     rekenen is.
 *
 * Bewust een rechte lijn, net als de forecast op Budget beheer: geen seizoenspatroon, geen
 * trend. Dat is na te rekenen en uit te leggen, en het verschil wordt elke zondag kleiner.
 *
 * ## Per dag of per maand
 *
 * Events, sessies en aankopen staan per dag in de stand, gebruikers per maand (per maand
 * ontdubbeld; een dagcijfer zou optellen tot een veel te hoog jaartotaal). Beide worden
 * eerst teruggebracht tot twaalf maanden met per maand de gemeten waarde en het aantal
 * gemeten dagen (`MaandInvoer`); vanaf daar is de som voor elke KPI dezelfde.
 *
 * ## Waarom de peildatum altijd een zaterdag is
 *
 * De stand wordt wekelijks op zondag bijgewerkt (cron in `vercel.json`) en rekent dan tot
 * en met de dag ervoor. `laatsteZaterdag` geeft de laatste zaterdag vóór vandaag, wie hem
 * ook aanroept en op welke dag: een handmatige herberekening op woensdag levert dezelfde
 * peildatum als de zondag ervoor, en dus geen ander target midden in de week.
 */

const DAG_MS = 86_400_000;

/** Aantal dagen in een maand (1 = januari). */
export function dagenInMaand(jaar: number, maand: number): number {
  return new Date(Date.UTC(jaar, maand, 0)).getUTCDate();
}

export function dagenInJaar(jaar: number): number {
  return new Date(Date.UTC(jaar, 1, 29)).getUTCMonth() === 1 ? 366 : 365;
}

function alsDatum(tekst: string): number {
  return Date.parse(`${tekst}T00:00:00Z`);
}

function tekstVan(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Aantal dagen van `van` t/m `tot`, beide inbegrepen; nul als `tot` vóór `van` ligt. */
export function dagenTussen(van: string, tot: string): number {
  const verschil = Math.round((alsDatum(tot) - alsDatum(van)) / DAG_MS);
  return verschil < 0 ? 0 : verschil + 1;
}

/** De kalenderdatum in Nederland (YYYY-MM-DD) op het moment `nu`. */
export function datumInNederland(nu: Date): string {
  // en-CA schrijft YYYY-MM-DD; de tijdzone regelt zomer- en wintertijd.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(nu);
}

/** De laatste zaterdag vóór vandaag (Nederlandse kalender). Vandaag telt nooit mee. */
export function laatsteZaterdag(nu: Date): string {
  const vandaag = alsDatum(datumInNederland(nu));
  const weekdag = new Date(vandaag).getUTCDay(); // 0 = zondag … 6 = zaterdag
  const terug = weekdag === 6 ? 7 : weekdag + 1;
  return tekstVan(vandaag - terug * DAG_MS);
}

/**
 * De peildatum van de stand van `jaar`: de laatste zaterdag vóór vandaag, afgekapt op
 * 31 december van dat jaar. `null` zolang er in dat jaar nog geen zaterdag voorbij is.
 */
export function peildatumVoor(nu: Date, jaar: number = KPI_JAAR): string | null {
  const zaterdag = laatsteZaterdag(nu);
  const eind = `${jaar}-12-31`;
  if (zaterdag > eind) return eind;
  if (zaterdag < `${jaar}-01-01`) return null;
  return zaterdag;
}

/** Is het jaar met deze peildatum helemaal voorbij? Dan verandert de stand niet meer. */
export function isDefinitief(peildatum: string, jaar: number = KPI_JAAR): boolean {
  return peildatum >= `${jaar}-12-31`;
}

function binnen(datum: string, p: Periode): boolean {
  return datum >= p.van && (p.tot === undefined || datum <= p.tot);
}

/** Telt deze dag als gemeten: binnen een meetperiode (of geen meetperiodes) en niet in de uitval? */
export function isGemeten(
  datum: string,
  meetperiodes: readonly Periode[] | undefined,
  uitval: readonly Periode[],
): boolean {
  if (uitval.some((p) => binnen(datum, p))) return false;
  if (!meetperiodes || meetperiodes.length === 0) return true;
  return meetperiodes.some((p) => binnen(datum, p));
}

/** Per maand: wat er op de gemeten dagen werd geteld, en hoeveel dagen dat waren. */
export interface MaandInvoer {
  waarde: number;
  dagenGemeten: number;
}

/** Alle dagen van het jaar t/m de peildatum, per maand (index 0 = januari). */
function dagenPerMaand(jaar: number, peildatum: string): string[][] {
  const maanden: string[][] = Array.from({ length: 12 }, () => []);
  const eind = alsDatum(peildatum < `${jaar}-12-31` ? peildatum : `${jaar}-12-31`);
  for (let t = alsDatum(`${jaar}-01-01`); t <= eind; t += DAG_MS) {
    const d = tekstVan(t);
    maanden[Number(d.slice(5, 7)) - 1].push(d);
  }
  return maanden;
}

/** Van dagcijfers (datum → aantal) naar twaalf maanden, alleen over de gemeten dagen. */
export function maandInvoerUitDagen(
  dagwaarden: Readonly<Record<string, number>>,
  peildatum: string,
  meetperiodes: readonly Periode[] | undefined,
  uitval: readonly Periode[],
  jaar: number = KPI_JAAR,
): MaandInvoer[] {
  return dagenPerMaand(jaar, peildatum).map((dagen) => {
    let waarde = 0;
    let dagenGemeten = 0;
    for (const d of dagen) {
      if (!isGemeten(d, meetperiodes, uitval)) continue;
      waarde += Math.max(0, Number(dagwaarden[d]) || 0);
      dagenGemeten++;
    }
    return { waarde, dagenGemeten };
  });
}

/**
 * Van maandcijfers (gebruikers) naar twaalf maanden. Het maandcijfer beslaat precies de
 * dagen waarop GA4 iets mat, dus de gemeten dagen zijn die waarop de property draaide.
 */
export function maandInvoerUitMaanden(
  maandwaarden: readonly number[],
  peildatum: string,
  meetperiodes: readonly Periode[] | undefined,
  uitval: readonly Periode[],
  jaar: number = KPI_JAAR,
): MaandInvoer[] {
  return dagenPerMaand(jaar, peildatum).map((dagen, i) => {
    const dagenGemeten = dagen.filter((d) => isGemeten(d, meetperiodes, uitval)).length;
    return { waarde: dagenGemeten > 0 ? Math.max(0, Number(maandwaarden[i]) || 0) : 0, dagenGemeten };
  });
}

/**
 * Wat er van een maand in de grafiek staat:
 *
 *  - `gerealiseerd` — voorbij en elke dag gemeten;
 *  - `deels` — de peildatum valt erin: een deel gemeten, de rest verwachting;
 *  - `verwachting` — de maand moet nog komen;
 *  - `bijgeschat` — voorbij, maar (deels) niet gemeten en met het gemiddelde ingevuld.
 */
export type MaandSoort = "gerealiseerd" | "deels" | "verwachting" | "bijgeschat";

export interface MaandUitkomst {
  /** 1 = januari. */
  maand: number;
  soort: MaandSoort;
  /** Wat GA4 op de gemeten dagen van deze maand telde; null als er geen dag gemeten is. */
  gerealiseerd: number | null;
  /** Het verwachte maandtotaal: gerealiseerd plus het gemiddelde over de overige dagen. */
  verwacht: number;
  dagenGemeten: number;
  dagenInMaand: number;
}

export interface KpiUitkomst {
  peildatum: string;
  /** Wat GA4 op de gemeten dagen t/m de peildatum telde. */
  gerealiseerd: number;
  /** Het gemiddelde per gemeten dag. */
  perDag: number;
  dagenGemeten: number;
  /** Verstreken dagen (t/m de peildatum) die niet gemeten zijn. */
  dagenNietGemeten: number;
  /** Alle dagen van het jaar die met het gemiddelde zijn ingevuld. */
  dagenBijgeschat: number;
  /** Gemiddelde × de bijgeschatte dagen. */
  bijgeschat: number;
  /** Verwachting voor het hele basisjaar: gerealiseerd + bijgeschat. */
  verwacht: number;
  groei: number;
  /** Verwachting × (1 + groei). */
  target: number;
  /** Target ÷ 12. */
  targetPerMaand: number;
  maanden: MaandUitkomst[];
  /** True zodra het jaar voorbij is: dan verandert de stand niet meer. */
  definitief: boolean;
}

/** Rekent één KPI uit, uit zijn twaalf maanden (`maandInvoerUitDagen` / `…UitMaanden`). */
export function berekenKpi(
  maanden: readonly MaandInvoer[],
  peildatum: string,
  opties: { groei?: number; jaar?: number } = {},
): KpiUitkomst {
  const jaar = opties.jaar ?? KPI_JAAR;
  const groei = opties.groei ?? KPI_GROEI;
  const eindJaar = `${jaar}-12-31`;
  const tot = peildatum < eindJaar ? peildatum : eindJaar;

  const gerealiseerd = maanden.reduce((t, m) => t + m.waarde, 0);
  const dagenGemeten = maanden.reduce((t, m) => t + m.dagenGemeten, 0);
  const perDag = dagenGemeten > 0 ? gerealiseerd / dagenGemeten : 0;
  const dagenBijgeschat = dagenInJaar(jaar) - dagenGemeten;
  const bijgeschat = perDag * dagenBijgeschat;
  const verwacht = gerealiseerd + bijgeschat;
  const target = verwacht * (1 + groei);

  const uitkomsten: MaandUitkomst[] = maanden.map((m, i) => {
    const maand = i + 1;
    const mm = String(maand).padStart(2, "0");
    const dagen = dagenInMaand(jaar, maand);
    const begin = `${jaar}-${mm}-01`;
    const eind = `${jaar}-${mm}-${String(dagen).padStart(2, "0")}`;
    const soort: MaandSoort =
      begin > tot
        ? "verwachting"
        : m.dagenGemeten === dagen
          ? "gerealiseerd"
          : eind > tot
            ? "deels"
            : "bijgeschat";
    return {
      maand,
      soort,
      gerealiseerd: m.dagenGemeten > 0 ? m.waarde : null,
      verwacht: m.waarde + perDag * (dagen - m.dagenGemeten),
      dagenGemeten: m.dagenGemeten,
      dagenInMaand: dagen,
    };
  });

  return {
    peildatum,
    gerealiseerd,
    perDag,
    dagenGemeten,
    dagenNietGemeten: dagenTussen(`${jaar}-01-01`, tot) - dagenGemeten,
    dagenBijgeschat,
    bijgeschat,
    verwacht,
    groei,
    target,
    targetPerMaand: target / 12,
    maanden: uitkomsten,
    definitief: isDefinitief(peildatum, jaar),
  };
}

/**
 * De ruwe GA4-cijfers van één website over één jaar, zoals de wekelijkse ophaalactie ze
 * bewaart (`kpi_2027_standen`, migratie 0035). De koppeling naar KPI's gebeurt pas bij het
 * lezen, zodat een gewijzigde definitie meteen geldt zonder opnieuw op te halen.
 */
export interface KpiStand {
  website: string;
  jaar: number;
  peildatum: string;
  berekendOp: string;
  definitief: boolean;
  /** Per bron (`sessies`, `aankopen`, `event:<naam>`, `event:<naam>@<pad>`): datum → aantal. */
  dagen: Record<string, Record<string, number>>;
  /** Actieve gebruikers per maand (index 0 = januari), per maand ontdubbeld. */
  gebruikers: number[];
}

/** De bronnen in de stand waar een KPI uit optelt (niet voor gebruikers). */
export function bronnenVan(definitie: KpiDefinitie): string[] {
  switch (definitie.bron.soort) {
    case "sessies":
      return ["sessies"];
    case "aankopen":
      return ["aankopen"];
    case "gebruikers":
      return [];
    case "events":
      return definitie.bron.events.map(eventBron);
  }
}

/** De dagcijfers van één KPI: de som van zijn bronnen per datum. */
export function dagwaardenVoor(definitie: KpiDefinitie, stand: KpiStand): Record<string, number> {
  const som: Record<string, number> = {};
  for (const bron of bronnenVan(definitie)) {
    for (const [datum, n] of Object.entries(stand.dagen[bron] ?? {})) {
      som[datum] = (som[datum] ?? 0) + (Number(n) || 0);
    }
  }
  return som;
}

/** De twaalf maanden van één KPI van een website, klaar voor `berekenKpi`. */
export function maandInvoerVoor(
  definitie: KpiDefinitie,
  website: KpiWebsite,
  stand: KpiStand,
): MaandInvoer[] {
  if (definitie.bron.soort === "gebruikers") {
    return maandInvoerUitMaanden(stand.gebruikers, stand.peildatum, definitie.meetperiodes, website.uitval, stand.jaar);
  }
  return maandInvoerUitDagen(
    dagwaardenVoor(definitie, stand),
    stand.peildatum,
    definitie.meetperiodes,
    website.uitval,
    stand.jaar,
  );
}

/** Hoe vaak elk event van een KPI vuurde, over alle dagen in de stand. */
export function eventTotalen(
  definitie: KpiDefinitie,
  stand: KpiStand,
): { naam: string; paginaBevat?: string; toelichting?: string; aantal: number }[] {
  if (definitie.bron.soort !== "events") return [];
  return definitie.bron.events.map((e) => ({
    naam: e.naam,
    paginaBevat: e.paginaBevat,
    toelichting: e.toelichting,
    aantal: Object.values(stand.dagen[eventBron(e)] ?? {}).reduce((t, n) => t + (Number(n) || 0), 0),
  }));
}

/**
 * De realisatie van het doeljaar t/m de peildatum van zijn stand: alles wat GA4 in dat jaar
 * telde, zonder bijschatting — dit is het cijfer waar het target tegen afgezet wordt.
 */
export function realisatieVoor(definitie: KpiDefinitie, stand: KpiStand): number {
  if (definitie.bron.soort === "gebruikers") return stand.gebruikers.reduce((t, n) => t + (Number(n) || 0), 0);
  return Object.values(dagwaardenVoor(definitie, stand)).reduce((t, n) => t + n, 0);
}

/** Alles wat het tabblad van één KPI nodig heeft. */
export interface KpiOverzichtRegel {
  sleutel: string;
  naam: string;
  bronTekst: string | null;
  opmerking: string | null;
  events: { naam: string; paginaBevat?: string; toelichting?: string; aantal: number }[];
  /** Null als er voor 2026 nog geen stand is. */
  uitkomst: KpiUitkomst | null;
  /** De realisatie van 2027: 0 met `peildatum: null` zolang 2027 niet begonnen is. */
  realisatie: { waarde: number; peildatum: string | null };
}

export interface WebsiteOverzicht {
  sleutel: string;
  naam: string;
  domein: string;
  property: string;
  uitgeslotenHosts: readonly string[];
  uitvalTekst: string | null;
  stand: { peildatum: string; berekendOp: string; definitief: boolean } | null;
  standDoeljaar: { peildatum: string; berekendOp: string } | null;
  volgendeUpdate: string | null;
  kpis: KpiOverzichtRegel[];
}

/** Wat `/api/kpi-2027` teruggeeft. */
export interface Kpi2027Antwoord {
  websites: WebsiteOverzicht[];
  magBijwerken?: boolean;
  fout?: string;
}

/**
 * Wanneer de volgende stand verschijnt: de zondag na de volgende zaterdag, dus acht dagen
 * na de laatste peildatum. Null als beide jaren voorbij zijn.
 */
export function volgendeUpdate(laatstePeildatum: string): string | null {
  if (laatstePeildatum >= `${KPI_DOELJAAR}-12-31`) return null;
  return tekstVan(alsDatum(laatstePeildatum) + 8 * DAG_MS);
}

/** Het overzicht van één website uit zijn stand van 2026 en (als die er al is) van 2027. */
export function websiteOverzicht(
  website: KpiWebsite,
  stand: KpiStand | null,
  standDoeljaar: KpiStand | null,
): WebsiteOverzicht {
  const laatste = standDoeljaar?.peildatum ?? stand?.peildatum ?? null;
  return {
    sleutel: website.sleutel,
    naam: website.naam,
    domein: website.domein,
    property: website.property,
    uitgeslotenHosts: website.uitgeslotenHosts,
    uitvalTekst: website.uitvalTekst ?? null,
    stand: stand ? { peildatum: stand.peildatum, berekendOp: stand.berekendOp, definitief: stand.definitief } : null,
    standDoeljaar: standDoeljaar ? { peildatum: standDoeljaar.peildatum, berekendOp: standDoeljaar.berekendOp } : null,
    volgendeUpdate: laatste ? volgendeUpdate(laatste) : null,
    kpis: website.kpis.map((d) => ({
      sleutel: d.sleutel,
      naam: d.naam,
      bronTekst: d.bronTekst ?? null,
      opmerking: d.opmerking ?? null,
      events: stand ? eventTotalen(d, stand) : [],
      uitkomst: stand ? berekenKpi(maandInvoerVoor(d, website, stand), stand.peildatum, { jaar: stand.jaar }) : null,
      realisatie: standDoeljaar
        ? { waarde: realisatieVoor(d, standDoeljaar), peildatum: standDoeljaar.peildatum }
        : { waarde: 0, peildatum: null },
    })),
  };
}
