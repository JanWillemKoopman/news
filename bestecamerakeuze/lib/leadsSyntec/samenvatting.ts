/**
 * Het rekenwerk achter het tabblad Leads Syntec: van de compacte kubus uit de route naar
 * regels, filteren, optellen en de reeks voor de grafiek.
 *
 * Pure functies zonder React of database. Alles gebeurt in het geheugen: de route levert
 * één keer de hele leadtabel samengevat per dag (±69.000 regels voor bijna drie jaar), en
 * periode en filters kosten daarna geen ophaalactie meer.
 */

import {
  GEEN_KANAALGROEP,
  ONBEKEND,
  deelMerkIn,
  herkomstVan,
  kanaalgroepLabel,
  type Herkomst,
} from "@/lib/leadsSyntec/indeling";

// ---------------------------------------------------------------------------
// De kubus zoals de route hem levert
// ---------------------------------------------------------------------------

/**
 * Elke regel is een rij getallen; strings staan één keer in een woordenlijst. Zo blijft
 * het antwoord voor alle jaren rond de 2 MB (±300 kB over de lijn) in plaats van het
 * viervoudige met de namen per regel uitgeschreven.
 *
 * Volgorde in een regel: zie `KUBUS_KOLOMMEN`.
 */
export interface SyntecKubus {
  dagen: string[];
  kanalen: { kanaal: string; kanaalgroep: string }[];
  merken: string[];
  modellen: string[];
  ordersoorten: string[];
  soorten: string[];
  regels: number[][];
}

export const KUBUS_KOLOMMEN = [
  "dag",
  "kanaal",
  "merk",
  "model",
  "ordersoort",
  "soort",
  "dubbel",
  "aantal",
] as const;

export interface LeadsSyntecAntwoord {
  kubus: SyntecKubus;
  /** Eerste en laatste dag met leads in de sheet (YYYY-MM-DD). */
  eersteDag: string | null;
  laatsteDag: string | null;
  /** Het tijdstip van de laatste lead ("2026-11-17T12:40"), zoals Syntec het noteerde. */
  laatsteLead: string | null;
  /** Wanneer de sheet voor het laatst gelukt naar de database is gekopieerd. */
  ingelezenOp: string | null;
  fout?: string;
}

/** Eén groep leads met dezelfde kenmerken, op één dag. */
export interface SyntecRegel {
  dag: string;
  kanaal: string;
  /** Leesbaar: een lege kanaalgroep heet "Geen kanaalgroep". */
  kanaalgroep: string;
  herkomst: Herkomst;
  /** Een eigen merk, "Overige merken" of "Onbekend". */
  merk: string;
  /** Bij "Overige merken" het merk zelf; anders gelijk aan `merk`. */
  merkDetail: string;
  /** Het model letterlijk zoals in de kolom Model; alleen een lege waarde heet "Onbekend". */
  model: string;
  ordersoort: string;
  soort: string;
  dubbel: boolean;
  aantal: number;
}

/** Van de compacte kubus naar regels, met het merk meteen ingedeeld. */
export function pakUit(kubus: SyntecKubus): SyntecRegel[] {
  const merkCache = kubus.merken.map((m) => deelMerkIn(m));

  return kubus.regels.map(([dag, kanaal, merk, model, ordersoort, soort, dubbel, aantal]) => {
    const k = kubus.kanalen[kanaal] ?? { kanaal: "", kanaalgroep: "" };
    const m = merkCache[merk] ?? { merk: ONBEKEND, detail: ONBEKEND };
    return {
      dag: kubus.dagen[dag] ?? "",
      kanaal: k.kanaal || ONBEKEND,
      kanaalgroep: kanaalgroepLabel(k.kanaalgroep),
      herkomst: herkomstVan(k.kanaalgroep),
      merk: m.merk,
      merkDetail: m.detail,
      model: (kubus.modellen[model] ?? "").trim() || ONBEKEND,
      ordersoort: (kubus.ordersoorten[ordersoort] ?? "").trim() || ONBEKEND,
      soort: (kubus.soorten[soort] ?? "").trim() || ONBEKEND,
      dubbel: dubbel === 1,
      aantal,
    };
  });
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export type HerkomstFilter = "alle" | Herkomst;

export interface SyntecFilters {
  herkomst: HerkomstFilter;
  kanaalgroepen: string[];
  kanalen: string[];
  merken: string[];
  /** De letterlijke modelwaarden; "Caddy" telt dus bij Volkswagen én Bedrijfswagens. */
  modellen: string[];
  ordersoorten: string[];
  soorten: string[];
  /** Leads met sluitreden "Dubbel" of "[SA] Dubbel" weglaten. */
  zonderDubbel: boolean;
}

export const GEEN_FILTERS: SyntecFilters = {
  herkomst: "alle",
  kanaalgroepen: [],
  kanalen: [],
  merken: [],
  modellen: [],
  ordersoorten: [],
  soorten: [],
  zonderDubbel: false,
};

/**
 * Een regel in de modellentabel: merk en model samen, zoals ze in de sheet naast elkaar
 * staan. "Caddy" bij Volkswagen en bij Volkswagen Bedrijfswagens zijn twee regels.
 */
export function modelRijSleutel(r: Pick<SyntecRegel, "merkDetail" | "model">): string {
  return `${r.merkDetail}|${r.model}`;
}

export function heeftFilters(f: SyntecFilters): boolean {
  return (
    f.herkomst !== "alle" ||
    f.zonderDubbel ||
    f.kanaalgroepen.length > 0 ||
    f.kanalen.length > 0 ||
    f.merken.length > 0 ||
    f.modellen.length > 0 ||
    f.ordersoorten.length > 0 ||
    f.soorten.length > 0
  );
}

export interface Periode {
  van: string;
  tot: string;
}

/** Tussen filters "en", binnen een filter "of". De periode telt op de dag van Aangelegd. */
export function filterRegels(regels: SyntecRegel[], f: SyntecFilters, periode: Periode | null): SyntecRegel[] {
  const in_ = (lijst: string[], waarde: string) => lijst.length === 0 || lijst.includes(waarde);
  return regels.filter(
    (r) =>
      (periode === null || (r.dag >= periode.van && r.dag <= periode.tot)) &&
      (f.herkomst === "alle" || r.herkomst === f.herkomst) &&
      (!f.zonderDubbel || !r.dubbel) &&
      in_(f.kanaalgroepen, r.kanaalgroep) &&
      in_(f.kanalen, r.kanaal) &&
      in_(f.merken, r.merk) &&
      in_(f.modellen, r.model) &&
      in_(f.ordersoorten, r.ordersoort) &&
      in_(f.soorten, r.soort),
  );
}

// ---------------------------------------------------------------------------
// Optellen
// ---------------------------------------------------------------------------

export interface Telling {
  totaal: number;
  online: number;
  offline: number;
}

export function tel(regels: SyntecRegel[]): Telling {
  const t = { totaal: 0, online: 0, offline: 0 };
  for (const r of regels) {
    t.totaal += r.aantal;
    t[r.herkomst] += r.aantal;
  }
  return t;
}

export interface Groep extends Telling {
  sleutel: string;
  /** Per merk (eigen merk, "Overige merken" of "Onbekend"): voor de kanalentabel. */
  perMerk: Record<string, number>;
}

/**
 * Groepeert regels op een sleutel en telt per groep het totaal, online, offline en per
 * merk. Gesorteerd op het totaal (groot eerst), bij gelijke stand op naam.
 */
export function groepeer(regels: SyntecRegel[], sleutelVan: (r: SyntecRegel) => string): Groep[] {
  const groepen = new Map<string, Groep>();
  for (const r of regels) {
    const s = sleutelVan(r);
    let g = groepen.get(s);
    if (!g) {
      g = { sleutel: s, totaal: 0, online: 0, offline: 0, perMerk: {} };
      groepen.set(s, g);
    }
    g.totaal += r.aantal;
    g[r.herkomst] += r.aantal;
    g.perMerk[r.merk] = (g.perMerk[r.merk] ?? 0) + r.aantal;
  }
  return [...groepen.values()].sort((a, b) => b.totaal - a.totaal || a.sleutel.localeCompare(b.sleutel, "nl"));
}

/** Opties voor een keuzelijst, op volgorde van grootte. */
export function opties(regels: SyntecRegel[], waardeVan: (r: SyntecRegel) => string): string[] {
  return groepeer(regels, waardeVan).map((g) => g.sleutel);
}

// ---------------------------------------------------------------------------
// Periodes
// ---------------------------------------------------------------------------

const DAG_MS = 86_400_000;

function datum(tekst: string): Date {
  return new Date(`${tekst}T00:00:00Z`);
}

function alsTekst(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function dagenTussen({ van, tot }: Periode): number {
  return Math.max(1, Math.round((datum(tot).getTime() - datum(van).getTime()) / DAG_MS) + 1);
}

/** De id's van de vaste periodes; een andere id in de URL (bv. het oude "vorig-jaar") telt niet. */
export const VASTE_PERIODE_IDS = ["maand", "vorige-maand", "30d", "90d", "12m", "jaar", "alles"] as const;

export interface SyntecPeriode extends Periode {
  id: string;
  label: string;
}

/**
 * De vaste periodes, gerekend vanaf de **laatste dag met leads** en niet vanaf vandaag.
 *
 * De sheet loopt een dag of twee achter (op 19 november stond de laatste lead op 17
 * november). Vanaf vandaag gerekend eindigt elke grafiek dan met twee lege dagen die lezen
 * als een instorting. Tot welke dag er data is, staat in de filterbalk.
 */
export function vastePeriodes(eersteDag: string, laatsteDag: string): SyntecPeriode[] {
  const eind = datum(laatsteDag);
  const terug = (dagen: number) => {
    const d = new Date(eind);
    d.setUTCDate(d.getUTCDate() - (dagen - 1));
    const van = alsTekst(d);
    return van < eersteDag ? eersteDag : van;
  };
  const j = eind.getUTCFullYear();
  const m = eind.getUTCMonth();
  const begrens = (van: string) => (van < eersteDag ? eersteDag : van);
  return [
    { id: "maand", label: "Deze maand", van: begrens(alsTekst(new Date(Date.UTC(j, m, 1)))), tot: laatsteDag },
    {
      id: "vorige-maand",
      label: "Vorige maand",
      van: begrens(alsTekst(new Date(Date.UTC(j, m - 1, 1)))),
      tot: alsTekst(new Date(Date.UTC(j, m, 0))),
    },
    { id: "30d", label: "30 dagen", van: terug(30), tot: laatsteDag },
    { id: "90d", label: "90 dagen", van: terug(90), tot: laatsteDag },
    { id: "12m", label: "12 maanden", van: terug(365), tot: laatsteDag },
    { id: "jaar", label: "Dit jaar", van: begrens(`${j}-01-01`), tot: laatsteDag },
    { id: "alles", label: "Alles", van: eersteDag, tot: laatsteDag },
  ];
}

// ---------------------------------------------------------------------------
// De reeks voor de grafiek
// ---------------------------------------------------------------------------

/**
 * Per dag, week of maand — te kiezen met de knopjes boven de grafiek, standaard per week
 * (verzoek november 2026). Een week loopt van maandag t/m zondag.
 */
export type Korrel = "dag" | "week" | "maand";

export const KORRELS: { id: Korrel; label: string }[] = [
  { id: "dag", label: "Dag" },
  { id: "week", label: "Week" },
  { id: "maand", label: "Maand" },
];

export const STANDAARD_KORREL: Korrel = "week";

export interface ReeksPunt {
  /** Eerste dag van het vak (YYYY-MM-DD). */
  begin: string;
  /** Laatste dag van het vak binnen de periode. */
  eind: string;
  online: number;
  offline: number;
  /**
   * Valt het vak helemaal binnen de periode, met complete dagen? Niet bij een eerste of
   * laatste week/maand die maar half in de periode ligt, of een vak met een halve dag.
   */
  volledig: boolean;
}

/** Het begin van het vak waar een dag in valt: de dag zelf, de maandag ervoor, of de eerste van de maand. */
export function vakBegin(dag: string, korrel: Korrel): string {
  if (korrel === "dag") return dag;
  const d = datum(dag);
  if (korrel === "maand") return alsTekst(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
  const terug = (d.getUTCDay() + 6) % 7; // maandag = 0
  d.setUTCDate(d.getUTCDate() - terug);
  return alsTekst(d);
}

function volgendVak(begin: string, korrel: Korrel): string {
  const d = datum(begin);
  if (korrel === "dag") d.setUTCDate(d.getUTCDate() + 1);
  else if (korrel === "week") d.setUTCDate(d.getUTCDate() + 7);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return alsTekst(d);
}

/**
 * Leads per vak, met **alle** vakken van de periode — ook die zonder lead, want een
 * rustige week hoort als dal in de grafiek te staan en niet te verdwijnen.
 *
 * `halveDag`: een dag die nog niet compleet is in de sheet (de export liep halverwege die
 * dag). Het vak waar hij in valt, telt als onvolledig en wordt lichter getekend.
 */
export function reeks(
  regels: SyntecRegel[],
  periode: Periode,
  korrel: Korrel,
  halveDag: string | null = null,
): ReeksPunt[] {
  const punten: ReeksPunt[] = [];
  const index = new Map<string, ReeksPunt>();
  for (let begin = vakBegin(periode.van, korrel); begin <= periode.tot; begin = volgendVak(begin, korrel)) {
    const volgende = volgendVak(begin, korrel);
    const laatste = alsTekst(new Date(datum(volgende).getTime() - DAG_MS));
    const punt: ReeksPunt = {
      begin: begin < periode.van ? periode.van : begin,
      eind: laatste > periode.tot ? periode.tot : laatste,
      online: 0,
      offline: 0,
      volledig:
        begin >= periode.van &&
        laatste <= periode.tot &&
        !(halveDag !== null && halveDag >= begin && halveDag <= laatste),
    };
    punten.push(punt);
    index.set(begin, punt);
  }
  for (const r of regels) {
    if (r.dag < periode.van || r.dag > periode.tot) continue;
    const punt = index.get(vakBegin(r.dag, korrel));
    if (punt) punt[r.herkomst] += r.aantal;
  }
  return punten;
}

export { GEEN_KANAALGROEP, ONBEKEND };
