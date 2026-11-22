import { LEADS_VANAF, verschuifDatum } from "@/lib/leads/bereik";

/**
 * De periodekeuze van het tabblad Leads.
 *
 * Elke vaste periode rekent vanaf de **laatste dag in de leadtabel** (`tot`, normaal
 * gisteren) en niet vanaf vandaag: anders eindigt "deze maand" met een dag zonder data, en
 * telt een maandbedrag uit Kostenverdeling voor een dag mee waarop nog geen lead binnen kan
 * zijn. Niets begint vóór 1 juni 2026 (`LEADS_VANAF`).
 *
 * Pure functies, getest in `periode.test.ts`.
 */

export type PeriodeKeuze = "alles" | "deze-maand" | "vorige-maand" | "laatste-30" | "eigen";

export const PERIODE_KEUZES: { id: Exclude<PeriodeKeuze, "eigen">; label: string }[] = [
  { id: "alles", label: "Sinds 1 juni" },
  { id: "deze-maand", label: "Deze maand" },
  { id: "vorige-maand", label: "Vorige maand" },
  { id: "laatste-30", label: "Laatste 30 dagen" },
];

export interface LeadsPeriode {
  van: string;
  tot: string;
}

function eersteVanMaand(datum: string): string {
  return `${datum.slice(0, 7)}-01`;
}

function laatsteVanVorigeMaand(datum: string): string {
  return verschuifDatum(eersteVanMaand(datum), -1);
}

function nietVoorBegin(datum: string): string {
  return datum < LEADS_VANAF ? LEADS_VANAF : datum;
}

/** De dagen van een vaste keuze, gerekend vanaf de laatste dag met data. */
export function periodeVoor(keuze: Exclude<PeriodeKeuze, "eigen">, laatsteDag: string): LeadsPeriode {
  switch (keuze) {
    case "alles":
      return { van: LEADS_VANAF, tot: laatsteDag };
    case "deze-maand":
      return { van: nietVoorBegin(eersteVanMaand(laatsteDag)), tot: laatsteDag };
    case "vorige-maand": {
      const tot = laatsteVanVorigeMaand(laatsteDag);
      return { van: nietVoorBegin(eersteVanMaand(tot)), tot };
    }
    case "laatste-30":
      return { van: nietVoorBegin(verschuifDatum(laatsteDag, -29)), tot: laatsteDag };
  }
}

/** Welke vaste keuze precies deze periode is; anders "eigen". */
export function herkenKeuze(periode: LeadsPeriode, laatsteDag: string): PeriodeKeuze {
  const gevonden = PERIODE_KEUZES.find((k) => {
    const p = periodeVoor(k.id, laatsteDag);
    return p.van === periode.van && p.tot === periode.tot;
  });
  return gevonden?.id ?? "eigen";
}

/** Aantal dagen van `van` t/m `tot`, beide inclusief. */
export function aantalDagen(periode: LeadsPeriode): number {
  return (
    Math.round(
      (Date.parse(`${periode.tot}T00:00:00Z`) - Date.parse(`${periode.van}T00:00:00Z`)) / 86_400_000,
    ) + 1
  );
}
