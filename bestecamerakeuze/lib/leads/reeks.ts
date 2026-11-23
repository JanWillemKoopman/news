import type { HandmatigePost } from "@/lib/leads/kanaalkosten";
import type { LeadRegel } from "@/lib/leads/koppel";
import { heeftKostenbron } from "@/lib/leads/kanaal";
import type { LeadsPeriode } from "@/lib/leads/periode";

/**
 * De reeks achter de grafiek op het tabblad Leads: per dag, week of maand de leads
 * (betaald en onbetaald), de uitgaven en wat nodig is voor de kosten per betaalde lead.
 *
 * Zelfde korrels als op Syntec leads (verzoek november 2026): dag, week (maandag t/m
 * zondag) of maand, standaard per week. Een eerste of laatste week/maand die maar half in de
 * periode valt, draagt `volledig: false` en tekent lichter.
 *
 * ## Uitgaven per vak
 *
 * Zonder filters zijn het de **echte uitgaven** van Google Ads, Meta Ads en LinkedIn Ads op
 * die dagen (`uitgavenPerDag` uit de route), plus de handmatige maandbedragen naar rato van
 * de dagen — opgeteld over de vakken precies het kerncijfer Uitgaven. Kosten per betaalde lead
 * is dan die uitgaven ÷ de betaalde leads van Google, Meta, LinkedIn en de kanalen met
 * handmatige kosten in dat vak, dezelfde som als het kerncijfer.
 *
 * Met een filter bestaat dat niet meer (campagnekosten zijn niet op merk of model te
 * filteren): dan zijn het de **toegerekende** kosten van de geselecteerde leads in dat vak,
 * gedeeld door de leads daarvan met bekende kosten — net als het kerncijfer met een filter.
 *
 * Pure functies, getest in `reeks.test.ts`.
 */

export type Korrel = "dag" | "week" | "maand";

export const KORRELS: { id: Korrel; label: string }[] = [
  { id: "dag", label: "Dag" },
  { id: "week", label: "Week" },
  { id: "maand", label: "Maand" },
];

export const STANDAARD_KORREL: Korrel = "week";

const DAG_MS = 86_400_000;

function datum(tekst: string): Date {
  return new Date(`${tekst}T00:00:00Z`);
}

function alsTekst(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Het begin van het vak waar een dag in valt: de dag zelf, de maandag ervoor, of de eerste van de maand. */
export function vakBegin(dag: string, korrel: Korrel): string {
  if (korrel === "dag") return dag;
  if (korrel === "maand") return `${dag.slice(0, 7)}-01`;
  const d = datum(dag);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); // maandag = 0
  return alsTekst(d);
}

function volgendVak(begin: string, korrel: Korrel): string {
  const d = datum(begin);
  if (korrel === "dag") d.setUTCDate(d.getUTCDate() + 1);
  else if (korrel === "week") d.setUTCDate(d.getUTCDate() + 7);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return alsTekst(d);
}

function dagenInMaand(maand: string): number {
  const [jaar, m] = maand.split("-").map(Number);
  return new Date(Date.UTC(jaar, m, 0)).getUTCDate();
}

/**
 * Legt de handmatige maandbedragen naar rato van de dagen over de uitgaven per dag:
 * maandbedrag ÷ dagen in de maand, op elke dag van die maand binnen het venster. Opgeteld is
 * dat precies `inVenster` van elke post, dus het totaal blijft gelijk aan het kerncijfer.
 */
export function metHandmatigPerDag(
  perDag: Record<string, number>,
  handmatig: HandmatigePost[],
  periode: LeadsPeriode,
): Record<string, number> {
  const uit: Record<string, number> = { ...perDag };
  for (const post of handmatig) {
    if (!(post.bedrag > 0)) continue;
    const perDagBedrag = post.bedrag / dagenInMaand(post.maand);
    const begin = `${post.maand}-01`;
    const eind = alsTekst(new Date(datum(begin).getTime() + (dagenInMaand(post.maand) - 1) * DAG_MS));
    let d = begin < periode.van ? periode.van : begin;
    const laatste = eind > periode.tot ? periode.tot : eind;
    while (d <= laatste) {
      uit[d] = (uit[d] ?? 0) + perDagBedrag;
      d = alsTekst(new Date(datum(d).getTime() + DAG_MS));
    }
  }
  return uit;
}

export interface ReeksPunt {
  /** Eerste dag van het vak binnen de periode (YYYY-MM-DD). */
  begin: string;
  /** Laatste dag van het vak binnen de periode. */
  eind: string;
  betaald: number;
  onbetaald: number;
  /** Uitgaven in dit vak: echt (zonder filters) of toegerekend aan de selectie (met filters). */
  uitgaven: number;
  /** De noemer van de kosten per betaalde lead in dit vak. */
  betaaldMetKosten: number;
  /** Valt het vak helemaal binnen de periode? */
  volledig: boolean;
}

/** Kosten per betaalde lead van één vak; `null` als er geen betaalde lead met kosten was. */
export function kostenPerLeadVan(p: Pick<ReeksPunt, "uitgaven" | "betaaldMetKosten">): number | null {
  return p.betaaldMetKosten > 0 ? p.uitgaven / p.betaaldMetKosten : null;
}

/**
 * Alle vakken van de periode, ook die zonder lead: een rustige week hoort als dal in de
 * grafiek te staan en niet te verdwijnen.
 *
 * `uitgavenPerDag`: de echte uitgaven per dag (zonder filters). `null` = er staat een filter
 * aan; dan tellen de toegerekende kosten van de regels.
 */
export function leadsReeks(
  regels: LeadRegel[],
  periode: LeadsPeriode,
  korrel: Korrel,
  uitgavenPerDag: Record<string, number> | null,
): ReeksPunt[] {
  const punten: ReeksPunt[] = [];
  const index = new Map<string, ReeksPunt>();
  for (let begin = vakBegin(periode.van, korrel); begin <= periode.tot; begin = volgendVak(begin, korrel)) {
    const laatste = alsTekst(new Date(datum(volgendVak(begin, korrel)).getTime() - DAG_MS));
    const punt: ReeksPunt = {
      begin: begin < periode.van ? periode.van : begin,
      eind: laatste > periode.tot ? periode.tot : laatste,
      betaald: 0,
      onbetaald: 0,
      uitgaven: 0,
      betaaldMetKosten: 0,
      volledig: begin >= periode.van && laatste <= periode.tot,
    };
    punten.push(punt);
    index.set(begin, punt);
  }
  const echt = uitgavenPerDag !== null;
  for (const r of regels) {
    if (r.datum < periode.van || r.datum > periode.tot) continue;
    const punt = index.get(vakBegin(r.datum, korrel));
    if (!punt) continue;
    if (r.platform === null) {
      punt.onbetaald += r.aantal;
      continue;
    }
    punt.betaald += r.aantal;
    if (echt) {
      // Dezelfde noemer als `kostenbronLeads` in telTotalen.
      if (heeftKostenbron(r.platform) || (r.handmatigeKosten ?? 0) > 0) punt.betaaldMetKosten += r.aantal;
    } else if (r.status === "toegerekend") {
      punt.betaaldMetKosten += r.aantal;
      punt.uitgaven += r.kosten ?? 0;
    }
  }
  if (echt) {
    for (const [dag, bedrag] of Object.entries(uitgavenPerDag)) {
      if (dag < periode.van || dag > periode.tot) continue;
      const punt = index.get(vakBegin(dag, korrel));
      if (punt) punt.uitgaven += bedrag;
    }
  }
  return punten;
}
