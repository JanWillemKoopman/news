import { LEADS_VANAF, verschuifDatum } from "@/lib/leads/bereik";

/**
 * De periodekeuze van het tabblad Leads — dezelfde knoppen als op Syntec leads (verzoek
 * november 2026): Deze maand, Vorige maand, 30 dagen, 90 dagen, 12 maanden, Dit jaar, Alles
 * en een eigen periode. Standaard 12 maanden, net als daar.
 *
 * Elke vaste periode rekent vanaf de **laatste dag in de leadtabel** (`tot`, normaal
 * gisteren) en niet vanaf vandaag: anders eindigt "deze maand" met een dag zonder data, en
 * telt een maandbedrag uit Kostenverdeling voor een dag mee waarop nog geen lead binnen kan
 * zijn. Niets begint vóór de eerste dag in de tabel (en nooit vóór 1 juni 2026, `LEADS_VANAF`),
 * dus zolang de tabel korter dan een jaar beslaat zijn 12 maanden, Dit jaar en Alles hetzelfde.
 *
 * Pure functies, getest in `periode.test.ts`.
 */

export type VastePeriode = "maand" | "vorige-maand" | "30d" | "90d" | "12m" | "jaar" | "alles";
export type PeriodeKeuze = VastePeriode | "eigen";

export const PERIODE_KEUZES: { id: VastePeriode; label: string }[] = [
  { id: "maand", label: "Deze maand" },
  { id: "vorige-maand", label: "Vorige maand" },
  { id: "30d", label: "30 dagen" },
  { id: "90d", label: "90 dagen" },
  { id: "12m", label: "12 maanden" },
  { id: "jaar", label: "Dit jaar" },
  { id: "alles", label: "Alles" },
];

export const STANDAARD_PERIODE: VastePeriode = "12m";

export interface LeadsPeriode {
  van: string;
  tot: string;
}

function eersteVanMaand(datum: string): string {
  return `${datum.slice(0, 7)}-01`;
}

/**
 * De dagen van een vaste keuze, gerekend vanaf de laatste dag met data en niet vóór
 * `eersteDag` (de eerste dag in de leadtabel; nooit vóór 1 juni 2026).
 */
export function periodeVoor(
  keuze: VastePeriode,
  laatsteDag: string,
  eersteDag: string = LEADS_VANAF,
): LeadsPeriode {
  const begin = eersteDag < LEADS_VANAF ? LEADS_VANAF : eersteDag;
  const begrens = (datum: string) => (datum < begin ? begin : datum);
  const terug = (dagen: number) => begrens(verschuifDatum(laatsteDag, -(dagen - 1)));
  switch (keuze) {
    case "maand":
      return { van: begrens(eersteVanMaand(laatsteDag)), tot: laatsteDag };
    case "vorige-maand": {
      const tot = verschuifDatum(eersteVanMaand(laatsteDag), -1);
      return { van: begrens(eersteVanMaand(tot)), tot };
    }
    case "30d":
      return { van: terug(30), tot: laatsteDag };
    case "90d":
      return { van: terug(90), tot: laatsteDag };
    case "12m":
      return { van: terug(365), tot: laatsteDag };
    case "jaar":
      return { van: begrens(`${laatsteDag.slice(0, 4)}-01-01`), tot: laatsteDag };
    case "alles":
      return { van: begin, tot: laatsteDag };
  }
}

/** Aantal dagen van `van` t/m `tot`, beide inclusief. */
export function aantalDagen(periode: LeadsPeriode): number {
  return (
    Math.round(
      (Date.parse(`${periode.tot}T00:00:00Z`) - Date.parse(`${periode.van}T00:00:00Z`)) / 86_400_000,
    ) + 1
  );
}
