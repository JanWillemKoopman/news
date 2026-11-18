import { KPI_GROEI, KPI_JAAR, type KpiDefinitie } from "@/lib/kpi2027/definities";

/**
 * Het rekenwerk achter het tabblad KPI's 2027: wat doet 2026 naar verwachting, en wat is
 * dan het target voor 2027?
 *
 * Geen database, geen netwerk, geen React — pure functies, getest in `rekenen.test.ts`.
 *
 * ## De rekensom, zoals gevraagd
 *
 *  1. **Gerealiseerd**: wat GA4 tot en met de peildatum telde.
 *  2. **Gemiddelde per dag**: gerealiseerd ÷ het aantal verstreken dagen.
 *  3. **Verwachting 2026**: gerealiseerd + gemiddelde × de resterende dagen van 2026.
 *  4. **Target 2027**: verwachting × 1,05.
 *  5. **Maandtarget 2027**: het jaartarget ÷ 12 — bewust een gelijke twaalfde en geen
 *     verdeling naar het aantal dagen of het seizoen, zodat hij in het overleg na te
 *     rekenen is.
 *
 * Bewust een rechte lijn, net als de forecast op Budget beheer: geen seizoenspatroon,
 * geen trend. Dat is na te rekenen en uit te leggen, en het verschil wordt elke zondag
 * kleiner — op 31 december is er niets meer te verwachten.
 *
 * ## Waarom de peildatum altijd een zaterdag is
 *
 * De stand wordt wekelijks op zondag bijgewerkt (cron in `vercel.json`) en rekent dan tot
 * en met de dag ervoor. `peildatumVoor` geeft daarom de laatste zaterdag vóór vandaag, wie
 * hem ook aanroept en op welke dag: een handmatige herberekening op woensdag levert
 * dezelfde peildatum als de zondag ervoor, en dus geen ander target midden in de week.
 */

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

const DAG_MS = 86_400_000;

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

/**
 * De peildatum van de stand: de laatste zaterdag vóór vandaag (Nederlandse tijd), en
 * nooit later dan 31 december van het basisjaar. Vandaag telt nooit mee — de dag is niet
 * af — dus op een zaterdag is het de zaterdag van vorige week.
 *
 * `null` zolang er in het basisjaar nog geen zaterdag voorbij is: dan valt er niets te
 * rekenen.
 */
export function peildatumVoor(nu: Date, jaar: number = KPI_JAAR): string | null {
  const vandaag = alsDatum(datumInNederland(nu));
  const weekdag = new Date(vandaag).getUTCDay(); // 0 = zondag … 6 = zaterdag
  const terug = weekdag === 6 ? 7 : weekdag + 1;
  const zaterdag = tekstVan(vandaag - terug * DAG_MS);

  const eind = `${jaar}-12-31`;
  if (zaterdag > eind) return eind;
  if (zaterdag < `${jaar}-01-01`) return null;
  return zaterdag;
}

/** Is 2026 met deze peildatum helemaal gemeten? Dan verandert de stand niet meer. */
export function isDefinitief(peildatum: string, jaar: number = KPI_JAAR): boolean {
  return peildatum >= `${jaar}-12-31`;
}

/**
 * Wat er van een maand in de grafiek staat:
 *
 *  - `gerealiseerd` — de maand is voorbij en volledig gemeten;
 *  - `deels` — de peildatum valt erin: een deel gemeten, de rest verwachting;
 *  - `verwachting` — de maand moet nog komen;
 *  - `bijgeschat` — de maand ligt vóór de basis van deze KPI (zakelijke lease vóór april)
 *    en is met hetzelfde gemiddelde ingevuld als de toekomst.
 */
export type MaandSoort = "gerealiseerd" | "deels" | "verwachting" | "bijgeschat";

export interface MaandUitkomst {
  /** 1 = januari. */
  maand: number;
  soort: MaandSoort;
  /** Wat GA4 in deze maand telde, binnen de basis en t/m de peildatum; anders null. */
  gerealiseerd: number | null;
  /** Het verwachte maandtotaal: gerealiseerd plus het gemiddelde over de overige dagen. */
  verwacht: number;
  /** Hoeveel dagen van deze maand gemeten zijn (binnen de basis, t/m de peildatum). */
  dagenGemeten: number;
  dagenInMaand: number;
}

export interface KpiUitkomst {
  peildatum: string;
  /** Vanaf welke dag het gemiddelde rekent. */
  basisVanaf: string;
  /** Wat GA4 telde binnen de basis, t/m de peildatum. */
  gerealiseerd: number;
  /** Het gemiddelde per gemeten dag. */
  perDag: number;
  dagenGemeten: number;
  /** De dagen van het jaar die met het gemiddelde zijn ingevuld (toekomst + vóór de basis). */
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
  /** True zodra het hele jaar gemeten is: dan is de verwachting de realisatie. */
  definitief: boolean;
}

/**
 * Rekent één KPI uit, uit zijn twaalf maandcijfers.
 *
 * `maandwaarden` zijn de tellingen per maand (index 0 = januari) zoals GA4 ze tot en met
 * de peildatum gaf: een lopende maand bevat dus alleen zijn gemeten dagen, een toekomstige
 * maand nul. Maanden vóór `basisVanaf` tellen niet mee in het gemiddelde en worden
 * bijgeschat.
 */
export function berekenKpi(
  maandwaarden: readonly number[],
  peildatum: string,
  opties: { basisVanaf?: string; groei?: number; jaar?: number } = {},
): KpiUitkomst {
  const jaar = opties.jaar ?? KPI_JAAR;
  const groei = opties.groei ?? KPI_GROEI;
  const basisVanaf = opties.basisVanaf ?? `${jaar}-01-01`;
  if (!/^\d{4}-\d{2}-01$/.test(basisVanaf)) {
    throw new Error(`basisVanaf moet de eerste van een maand zijn (de cijfers staan per maand), niet ${basisVanaf}.`);
  }

  const maandenMeta = Array.from({ length: 12 }, (_, i) => {
    const maand = i + 1;
    const mm = String(maand).padStart(2, "0");
    const dagen = dagenInMaand(jaar, maand);
    return { maand, begin: `${jaar}-${mm}-01`, eind: `${jaar}-${mm}-${String(dagen).padStart(2, "0")}`, dagen };
  });

  // Eerst het gemeten deel en het gemiddelde; pas daarna kan elke maand worden ingevuld.
  let gerealiseerd = 0;
  let dagenGemeten = 0;
  const gemetenPerMaand = maandenMeta.map((m, i) => {
    const binnenBasis = m.begin >= basisVanaf;
    if (!binnenBasis || m.begin > peildatum) return { waarde: null as number | null, dagen: 0 };
    const tot = m.eind < peildatum ? m.eind : peildatum;
    const dagen = dagenTussen(m.begin, tot);
    const waarde = Math.max(0, Number(maandwaarden[i]) || 0);
    gerealiseerd += waarde;
    dagenGemeten += dagen;
    return { waarde, dagen };
  });

  const perDag = dagenGemeten > 0 ? gerealiseerd / dagenGemeten : 0;
  const dagenBijgeschat = dagenInJaar(jaar) - dagenGemeten;
  const bijgeschat = perDag * dagenBijgeschat;
  const verwacht = gerealiseerd + bijgeschat;
  const target = verwacht * (1 + groei);

  const maanden: MaandUitkomst[] = maandenMeta.map((m, i) => {
    const gemeten = gemetenPerMaand[i];
    const soort: MaandSoort =
      m.begin < basisVanaf
        ? "bijgeschat"
        : m.begin > peildatum
          ? "verwachting"
          : m.eind <= peildatum
            ? "gerealiseerd"
            : "deels";
    return {
      maand: m.maand,
      soort,
      gerealiseerd: gemeten.waarde,
      verwacht: (gemeten.waarde ?? 0) + perDag * (m.dagen - gemeten.dagen),
      dagenGemeten: gemeten.dagen,
      dagenInMaand: m.dagen,
    };
  });

  return {
    peildatum,
    basisVanaf,
    gerealiseerd,
    perDag,
    dagenGemeten,
    dagenBijgeschat,
    bijgeschat,
    verwacht,
    groei,
    target,
    targetPerMaand: target / 12,
    maanden,
    definitief: isDefinitief(peildatum, jaar) && basisVanaf === `${jaar}-01-01`,
  };
}

/**
 * De ruwe GA4-cijfers zoals de wekelijkse ophaalactie ze bewaart: twaalf maandcijfers
 * per event, plus sessies en gebruikers. De koppeling naar KPI's gebeurt pas bij het
 * lezen, zodat een gewijzigde definitie meteen geldt zonder opnieuw op te halen.
 */
export interface KpiStand {
  peildatum: string;
  berekendOp: string;
  definitief: boolean;
  events: Record<string, number[]>;
  sessies: number[];
  gebruikers: number[];
}

function nulreeks(): number[] {
  return Array.from({ length: 12 }, () => 0);
}

/** De twaalf maandcijfers van één KPI, opgeteld uit de stand. */
export function maandwaardenVoor(definitie: KpiDefinitie, stand: KpiStand): number[] {
  if (definitie.bron.soort === "verkeer") {
    const reeks = definitie.bron.veld === "sessies" ? stand.sessies : stand.gebruikers;
    return nulreeks().map((_, i) => Number(reeks?.[i]) || 0);
  }
  const som = nulreeks();
  for (const event of definitie.bron.events) {
    const reeks = stand.events[event.naam];
    if (!reeks) continue;
    for (let i = 0; i < 12; i++) som[i] += Number(reeks[i]) || 0;
  }
  return som;
}

/** Hoe vaak elk event van een KPI t/m de peildatum vuurde, voor de regel onder de grafiek. */
export function eventTotalen(
  definitie: KpiDefinitie,
  stand: KpiStand,
): { naam: string; toelichting?: string; aantal: number }[] {
  if (definitie.bron.soort !== "events") return [];
  return definitie.bron.events.map((e) => ({
    naam: e.naam,
    toelichting: e.toelichting,
    aantal: (stand.events[e.naam] ?? []).reduce((t, n) => t + (Number(n) || 0), 0),
  }));
}

/** Alles wat het tabblad van één KPI nodig heeft: de definitie, de events en de uitkomst. */
export interface KpiOverzichtRegel {
  sleutel: string;
  naam: string;
  bronTekst: string;
  opmerking: string | null;
  events: { naam: string; toelichting?: string; aantal: number }[];
  uitkomst: KpiUitkomst;
}

/** Wat `/api/kpi-2027` teruggeeft. */
export interface Kpi2027Antwoord {
  stand: { peildatum: string; berekendOp: string; definitief: boolean } | null;
  volgendeUpdate: string | null;
  kpis: KpiOverzichtRegel[];
  magBijwerken?: boolean;
  fout?: string;
}

/** De negen KPI's uit één stand. */
export function kpiOverzicht(stand: KpiStand, definities: readonly KpiDefinitie[]): KpiOverzichtRegel[] {
  return definities.map((d) => ({
    sleutel: d.sleutel,
    naam: d.naam,
    bronTekst: d.bronTekst,
    opmerking: d.opmerking ?? null,
    events: eventTotalen(d, stand),
    uitkomst: berekenKpi(maandwaardenVoor(d, stand), stand.peildatum, { basisVanaf: d.basisVanaf }),
  }));
}

/**
 * Wanneer de volgende stand verschijnt: de zondag na de volgende zaterdag, dus acht dagen
 * na de peildatum. Null als 2026 al helemaal gemeten is.
 */
export function volgendeUpdate(peildatum: string, jaar: number = KPI_JAAR): string | null {
  if (isDefinitief(peildatum, jaar)) return null;
  return tekstVan(alsDatum(peildatum) + 8 * DAG_MS);
}
