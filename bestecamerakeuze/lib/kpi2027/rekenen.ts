import {
  KPI_DOELJAAR,
  KPI_GROEI,
  KPI_JAAR,
  eventBron,
  type KpiDefinitie,
  type KpiWebsite,
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
 *     resterende dagen, en de dagen waarop de property 0 sessies had (`uitvalUitStand`).
 *     Een dag mét sessies telt altijd als gemeten, ook als een event die dag niet vuurde.
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

/** Een aaneengesloten reeks dagen, `van` t/m `tot`. */
export interface Periode {
  van: string;
  tot: string;
}

/**
 * De dagen waarop de property **0 sessies** had, t/m de peildatum, samengevoegd tot
 * aaneengesloten periodes. Dat zijn de enige dagen die worden bijgeschat: daar werkte de
 * tracking niet. Een dag met sessies telt altijd als gemeten, ook als een event die dag
 * niet vuurde — keuze van de eigenaar, zie `definities.ts`.
 */
export function uitvalUitStand(stand: Pick<KpiStand, "dagen" | "peildatum" | "jaar">): Periode[] {
  const sessies = stand.dagen.sessies ?? {};
  const periodes: Periode[] = [];
  for (const dagen of dagenPerMaand(stand.jaar, stand.peildatum)) {
    for (const d of dagen) {
      if ((Number(sessies[d]) || 0) > 0) continue;
      const vorige = periodes[periodes.length - 1];
      if (vorige && tekstVan(alsDatum(vorige.tot) + DAG_MS) === d) vorige.tot = d;
      else periodes.push({ van: d, tot: d });
    }
  }
  return periodes;
}

/** Telt deze dag als gemeten, oftewel valt hij buiten de uitval? */
export function isGemeten(datum: string, uitval: readonly Periode[]): boolean {
  return !uitval.some((p) => datum >= p.van && datum <= p.tot);
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
  uitval: readonly Periode[],
  jaar: number = KPI_JAAR,
): MaandInvoer[] {
  return dagenPerMaand(jaar, peildatum).map((dagen) => {
    let waarde = 0;
    let dagenGemeten = 0;
    for (const d of dagen) {
      if (!isGemeten(d, uitval)) continue;
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
  uitval: readonly Periode[],
  jaar: number = KPI_JAAR,
): MaandInvoer[] {
  return dagenPerMaand(jaar, peildatum).map((dagen, i) => {
    const dagenGemeten = dagen.filter((d) => isGemeten(d, uitval)).length;
    return { waarde: dagenGemeten > 0 ? Math.max(0, Number(maandwaarden[i]) || 0) : 0, dagenGemeten };
  });
}

/**
 * Wat er van een maand in de grafiek staat:
 *
 *  - `gerealiseerd` — voorbij en elke dag gemeten;
 *  - `deels` — de peildatum valt erin: een deel gemeten, de rest verwachting;
 *  - `verwachting` — de maand moet nog komen;
 *  - `bijgeschat` — voorbij, maar (deels) zonder sessies en met het gemiddelde ingevuld.
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
  /**
   * Optioneel: een eigen uitleg voor de tooltip, in plaats van de standaardzin bij deze
   * soort. Gebruikt door de totaalkaarten van KPI's 2027 Syntec, waar één maand gemeten
   * en bijgeschatte KPI's kan optellen.
   */
  toelichting?: string;
  /**
   * Optioneel: er is voor deze maand niets bekend, dus ook geen punt in de grafiek. Gebruikt
   * door de volgerskaarten van KPI's 2027 social media vóór de eerste bekende stand.
   */
  leeg?: boolean;
}

export interface KpiUitkomst {
  peildatum: string;
  /** Wat GA4 op de gemeten dagen t/m de peildatum telde. */
  gerealiseerd: number;
  /** Het gemiddelde per gemeten dag. */
  perDag: number;
  dagenGemeten: number;
  /** Verstreken dagen (t/m de peildatum) zonder sessies, dus niet gemeten. */
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
 * Dezelfde uitkomst met een ander groeipercentage: alleen het target en het maandtarget
 * schuiven mee, de verwachting voor het basisjaar blijft. Gebruikt voor het percentage dat
 * een gebruiker per KPI met de hand aanpast (`lib/kpi2027/groei.ts`), op de server én in de
 * browser direct na het typen.
 */
export function metGroei(u: KpiUitkomst, groei: number): KpiUitkomst {
  const target = u.verwacht * (1 + groei);
  return { ...u, groei, target, targetPerMaand: target / 12 };
}

/**
 * Ligt een KPI in 2027 op schema? Voor de kolom Voortgang in de
 * overzichtstabellen bovenaan KPI's 2027 GA en KPI's 2027 Syntec.
 *
 * Het jaartarget lineair over de dagen van 2027 verdeeld: wie op dag 40 zit, hoort
 * target × 40 / 365 binnen te hebben (`targetTotNu`). De afwijking is de realisatie ten
 * opzichte daarvan: +10% is 10% vóór op schema, −10% erachter. Dezelfde rechte lijn als de
 * verwachting voor 2026, zodat hij in het overleg na te rekenen is.
 *
 * `null` zolang 2027 niet begonnen is (geen peildatum), of als er geen target is.
 */
export function voortgang(
  target: number,
  realisatie: { waarde: number; peildatum: string | null },
  jaar: number = KPI_DOELJAAR,
): { dagen: number; targetTotNu: number; afwijking: number } | null {
  if (!realisatie.peildatum || target <= 0) return null;
  const dagen = dagenTussen(`${jaar}-01-01`, realisatie.peildatum);
  if (dagen <= 0) return null;
  const targetTotNu = (target * dagen) / dagenInJaar(jaar);
  return { dagen, targetTotNu, afwijking: realisatie.waarde / targetTotNu - 1 };
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
  const extern = definitie.externeBron;
  for (const bron of bronnenVan(definitie)) {
    for (const [datum, n] of Object.entries(stand.dagen[bron] ?? {})) {
      // Waar een vervangende bron geldt, tellen de GA4-cijfers niet mee.
      if (extern && !extern.optellen && datum <= extern.tot) continue;
      som[datum] = (som[datum] ?? 0) + (Number(n) || 0);
    }
  }
  if (extern) {
    const jaar = `${stand.jaar}-`;
    for (const [datum, n] of Object.entries(extern.dagen)) {
      if (!datum.startsWith(jaar) || datum > extern.tot) continue;
      som[datum] = (som[datum] ?? 0) + (Number(n) || 0);
    }
  }
  return som;
}

/** De uitval na `tot`: dagen t/m `tot` zijn door een andere bron gedekt en dus gemeten. */
export function uitvalNa(uitval: readonly Periode[], tot: string): Periode[] {
  const dagNa = tekstVan(alsDatum(tot) + DAG_MS);
  return uitval.filter((p) => p.tot > tot).map((p) => (p.van > tot ? p : { van: dagNa, tot: p.tot }));
}

/** De twaalf maanden van één KPI, klaar voor `berekenKpi`. */
export function maandInvoerVoor(
  definitie: KpiDefinitie,
  stand: KpiStand,
  uitval: readonly Periode[] = uitvalUitStand(stand),
): MaandInvoer[] {
  if (definitie.bron.soort === "gebruikers") {
    return maandInvoerUitMaanden(stand.gebruikers, stand.peildatum, uitval, stand.jaar);
  }
  // Alleen een vervangende bron dekt de dagen zonder sessies; een optellende niet.
  const extern = definitie.externeBron;
  const eigenUitval = extern && !extern.optellen ? uitvalNa(uitval, extern.tot) : uitval;
  return maandInvoerUitDagen(dagwaardenVoor(definitie, stand), stand.peildatum, eigenUitval, stand.jaar);
}

const MAANDNAMEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

function datumTekst(datum: string): string {
  return `${Number(datum.slice(8, 10))} ${MAANDNAMEN[Number(datum.slice(5, 7)) - 1]}`;
}

/** De uitval in gewone taal, voor bovenaan het tabblad; null als er geen dag zonder sessies was. */
export function uitvalTekst(uitval: readonly Periode[], jaar: number = KPI_JAAR): string | null {
  if (uitval.length === 0) return null;
  const delen = uitval.map((p) =>
    p.van === p.tot ? `op ${datumTekst(p.van)}` : `van ${datumTekst(p.van)} t/m ${datumTekst(p.tot)}`,
  );
  const lijst = delen.length === 1 ? delen[0] : `${delen.slice(0, -1).join(", ")} en ${delen[delen.length - 1]}`;
  const zin = lijst.charAt(0).toUpperCase() + lijst.slice(1);
  return `${zin} ${jaar} had deze property 0 sessies: daar werkte de tracking niet. Die dagen zijn bij elke KPI met het gemiddelde per gemeten dag bijgeschat; alle andere dagen tellen zoals gemeten.`;
}

/** Hoe vaak elk event van een KPI vuurde, over de dagen in de stand waarop GA4 telt. */
export function eventTotalen(
  definitie: KpiDefinitie,
  stand: KpiStand,
): { naam: string; paginaBevat?: string; toelichting?: string; aantal: number }[] {
  if (definitie.bron.soort !== "events") return [];
  const extern = definitie.externeBron;
  const na = extern && !extern.optellen ? extern.tot : "";
  return definitie.bron.events.map((e) => ({
    naam: e.naam,
    paginaBevat: e.paginaBevat,
    toelichting: e.toelichting,
    aantal: Object.entries(stand.dagen[eventBron(e)] ?? {})
      .filter(([datum]) => datum > na)
      .reduce((t, [, n]) => t + (Number(n) || 0), 0),
  }));
}

/** Wat een andere bron in het jaar van de stand bijdraagt, voor onder de grafiek. */
export interface ExterneBronRegel {
  naam: string;
  omschrijving: string;
  tot: string;
  /** True: opgeteld bij GA4; false: in plaats van GA4. */
  optellen: boolean;
  eenheid: string;
  aantal: number;
}

/** Wat de andere bron in het jaar van de stand bijdraagt, voor onder de grafiek. */
export function externeBronTotaal(
  definitie: KpiDefinitie,
  stand: KpiStand,
): ExterneBronRegel | null {
  const extern = definitie.externeBron;
  if (!extern || extern.tot < `${stand.jaar}-01-01`) return null;
  const aantal = externAantalIn(extern, stand);
  return {
    naam: extern.naam,
    omschrijving: extern.omschrijving,
    tot: extern.tot,
    optellen: extern.optellen === true,
    eenheid: extern.eenheid,
    aantal,
  };
}

/**
 * De realisatie van het doeljaar t/m de peildatum van zijn stand: alles wat GA4 in dat jaar
 * telde, zonder bijschatting — dit is het cijfer waar het target tegen afgezet wordt.
 */
export function realisatieVoor(definitie: KpiDefinitie, stand: KpiStand): number {
  if (definitie.bron.soort === "gebruikers") return stand.gebruikers.reduce((t, n) => t + (Number(n) || 0), 0);
  return Object.values(dagwaardenVoor(definitie, stand)).reduce((t, n) => t + n, 0);
}

/**
 * Een eerder jaar als extra lijn in de grafiek (`vergelijkingsjaar` in `definities.ts`):
 * per maand wat GA4 telde, zoals gemeten. Niets bijgeschat en niets verwacht — het jaar is
 * voorbij, en het telt niet mee in de verwachting of het target.
 */
export interface Vergelijking {
  jaar: number;
  /** Twaalf maanden (index 0 = januari), zoals gemeten. */
  maanden: number[];
  totaal: number;
  /** Per event hoe vaak het in dat jaar vuurde, voor onder de grafiek. */
  events: { naam: string; paginaBevat?: string; aantal: number }[];
  /** Wat een optellende externe bron in dat jaar bijdraagt (udenhoutlease.nl in 2025). */
  extern: { naam: string; aantal: number } | null;
}

/**
 * De vergelijkingslijn van één KPI uit de stand van dat jaar. Null voor een KPI met
 * `zonderVergelijking` (niet gemeten in dat jaar) of met een vervangende externe bron: die
 * dekt alleen het basisjaar, en `dagwaardenVoor` zou de GA4-cijfers van het eerdere jaar
 * dan wegfilteren. Een optellende bron (udenhoutlease.nl) telt wél mee: `dagwaardenVoor`
 * neemt zijn dagen van dat jaar erbij.
 */
export function vergelijkingVoor(definitie: KpiDefinitie, stand: KpiStand): Vergelijking | null {
  const extern = definitie.externeBron;
  if (definitie.zonderVergelijking || (extern && !extern.optellen)) return null;
  let maanden: number[];
  if (definitie.bron.soort === "gebruikers") {
    maanden = Array.from({ length: 12 }, (_, i) => Math.max(0, Number(stand.gebruikers[i]) || 0));
  } else {
    maanden = Array.from({ length: 12 }, () => 0);
    for (const [datum, n] of Object.entries(dagwaardenVoor(definitie, stand))) {
      if (!datum.startsWith(`${stand.jaar}-`) || datum > stand.peildatum) continue;
      maanden[Number(datum.slice(5, 7)) - 1] += Math.max(0, n);
    }
  }
  return {
    jaar: stand.jaar,
    maanden,
    totaal: maanden.reduce((t, n) => t + n, 0),
    events: eventTotalen(definitie, stand).map(({ naam, paginaBevat, aantal }) => ({ naam, paginaBevat, aantal })),
    extern: extern ? { naam: extern.naam, aantal: externAantalIn(extern, stand) } : null,
  };
}

/**
 * Wat een KPI in één maand ("2025-03") telde volgens zijn stand, zoals gemeten: dezelfde
 * bronnen als de grafiek. Gebruikt als controle naast de kanaalverdeling, en die dekt
 * alleen de property van de website zelf: een optellende externe bron (udenhoutlease.nl
 * bij zakelijke lease) blijft hier daarom buiten, anders lijkt elke maand waarin die
 * meetelt een verschil. Een maand waarin een **vervangende** bron telt (Porsche-werkplaats
 * t/m oktober 2026: de werkplaatsplanning) heeft geen controle (null): de grafiek telt dan
 * afspraken uit de planning, de kanaalverdeling online aanvragen in GA4.
 */
export function kpiMaandTotaal(definitie: KpiDefinitie, stand: KpiStand, maand: string): number | null {
  if (!maand.startsWith(`${stand.jaar}-`) || `${maand}-01` > stand.peildatum) return null;
  const extern = definitie.externeBron;
  if (extern && !extern.optellen && `${maand}-01` <= extern.tot) return null;
  if (definitie.bron.soort === "gebruikers") return Math.max(0, Number(stand.gebruikers[Number(maand.slice(5, 7)) - 1]) || 0);
  const zonderOptellen = definitie.externeBron?.optellen ? { ...definitie, externeBron: undefined } : definitie;
  let som = 0;
  for (const [datum, n] of Object.entries(dagwaardenVoor(zonderOptellen, stand))) {
    if (datum.startsWith(`${maand}-`) && datum <= stand.peildatum) som += Math.max(0, n);
  }
  return som;
}

/** Wat een externe bron in het jaar van de stand t/m de peildatum telt. */
function externAantalIn(extern: NonNullable<KpiDefinitie["externeBron"]>, stand: KpiStand): number {
  return Object.entries(extern.dagen)
    .filter(([datum]) => datum.startsWith(`${stand.jaar}-`) && datum <= extern.tot && datum <= stand.peildatum)
    .reduce((t, [, n]) => t + (Number(n) || 0), 0);
}

/** Alles wat het tabblad van één KPI nodig heeft. */
export interface KpiOverzichtRegel {
  sleutel: string;
  naam: string;
  bronTekst: string | null;
  opmerking: string | null;
  events: { naam: string; paginaBevat?: string; toelichting?: string; aantal: number }[];
  /** Een andere bron voor het begin van het jaar (Porsche-werkplaats, udenhoutlease.nl), met wat die bijdraagt. */
  externeBron: ExterneBronRegel | null;
  /** Null als er voor 2026 nog geen stand is. */
  uitkomst: KpiUitkomst | null;
  /** True als het groeipercentage met de hand is aangepast (anders de standaard, +5%). */
  groeiAangepast: boolean;
  /** De realisatie van 2027: 0 met `peildatum: null` zolang 2027 niet begonnen is. */
  realisatie: { waarde: number; peildatum: string | null };
  /** De lijn van het vergelijkingsjaar; null als de website er geen heeft of nog geen stand. */
  vergelijking: Vergelijking | null;
  /** Waarom deze KPI geen vergelijkingslijn heeft terwijl de website die wel heeft. */
  zonderVergelijking: string | null;
}

export interface WebsiteOverzicht {
  sleutel: string;
  naam: string;
  domein: string;
  property: string;
  uitgeslotenHosts: readonly string[];
  uitvalTekst: string | null;
  /** Heeft deze website het knopje "Kanalen" op elke grafiek? */
  kanaalverdeling: boolean;
  /** Bovenaan de tab, als de website een vergelijkingsjaar heeft én daar een stand van is. */
  vergelijkingTekst: string | null;
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

/**
 * De uitvaltekst, met erachter welke KPI's die dagen uit een andere bron halen en daar dus
 * niet bijgeschat zijn (Porsche-werkplaats uit de planning).
 */
function uitvalMetUitzonderingen(website: KpiWebsite, uitval: readonly Periode[], jaar: number): string | null {
  const tekst = uitvalTekst(uitval, jaar);
  if (!tekst) return null;
  const gedekt = website.kpis.filter(
    (k) => k.externeBron && !k.externeBron.optellen && uitval.some((p) => p.van <= k.externeBron!.tot),
  );
  if (gedekt.length === 0) return tekst;
  const namen = gedekt.map((k) => `${k.naam.toLowerCase()} (uit ${k.externeBron!.naam})`).join(" en ");
  return `${tekst} Uitzondering: ${namen}, die voor die dagen een eigen bron ${gedekt.length === 1 ? "heeft" : "hebben"} en daar niet is bijgeschat.`;
}

/** Het overzicht van één website uit zijn stand van 2026 en (als die er al is) van 2027. */
export function websiteOverzicht(
  website: KpiWebsite,
  stand: KpiStand | null,
  standDoeljaar: KpiStand | null,
  /** Het met de hand aangepaste percentage per KPI-sleutel, of undefined voor de standaard. */
  groeiVoor: (kpi: string) => number | undefined = () => undefined,
  /** De stand van het vergelijkingsjaar (`website.vergelijkingsjaar`), als die er is. */
  standVergelijk: KpiStand | null = null,
): WebsiteOverzicht {
  const vergelijk = website.vergelijkingsjaar && standVergelijk?.jaar === website.vergelijkingsjaar.jaar ? standVergelijk : null;
  const laatste = standDoeljaar?.peildatum ?? stand?.peildatum ?? null;
  const uitval = stand ? uitvalUitStand(stand) : [];
  return {
    sleutel: website.sleutel,
    naam: website.naam,
    domein: website.domein,
    property: website.property,
    uitgeslotenHosts: website.uitgeslotenHosts,
    uitvalTekst: stand ? uitvalMetUitzonderingen(website, uitval, stand.jaar) : null,
    kanaalverdeling: Boolean(website.kanaalverdeling),
    vergelijkingTekst: vergelijk ? (website.vergelijkingsjaar?.toelichting ?? null) : null,
    stand: stand ? { peildatum: stand.peildatum, berekendOp: stand.berekendOp, definitief: stand.definitief } : null,
    standDoeljaar: standDoeljaar ? { peildatum: standDoeljaar.peildatum, berekendOp: standDoeljaar.berekendOp } : null,
    volgendeUpdate: laatste ? volgendeUpdate(laatste) : null,
    kpis: website.kpis.map((d) => {
      const groei = groeiVoor(d.sleutel);
      return {
      sleutel: d.sleutel,
      naam: d.naam,
      bronTekst: d.bronTekst ?? null,
      opmerking: d.opmerking ?? null,
      events: stand ? eventTotalen(d, stand) : [],
      externeBron: stand ? externeBronTotaal(d, stand) : null,
      uitkomst: stand
        ? berekenKpi(maandInvoerVoor(d, stand, uitval), stand.peildatum, { jaar: stand.jaar, groei })
        : null,
      groeiAangepast: groei !== undefined,
      realisatie: standDoeljaar
        ? { waarde: realisatieVoor(d, standDoeljaar), peildatum: standDoeljaar.peildatum }
        : { waarde: 0, peildatum: null },
      vergelijking: vergelijk ? vergelijkingVoor(d, vergelijk) : null,
      zonderVergelijking: vergelijk ? (d.zonderVergelijking ?? null) : null,
      };
    }),
  };
}
