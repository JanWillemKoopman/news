/**
 * Het rekenwerk rond periodes: grenzen, lengtes en de vorige periode.
 *
 * Bewust los van `gebruik.ts`, dat een client component-module is. Dit is pure
 * datumrekenkunde zonder React, en dat hoort testbaar te zijn zonder een bundler die het
 * `@/`-alias kent — zie `vergelijk.test.ts`.
 */

export interface Periode {
  van: string;
  tot: string;
}

export interface PeriodeKeuze extends Periode {
  id: string;
  label: string;
  /** Hoeveel dagen de periode beslaat; bij een eigen periode uit de datums afgeleid. */
  dagen: number;
}

const DAG_MS = 86400000;

function alsTekst(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function dagenIn({ van, tot }: Periode): number {
  const a = new Date(`${van}T00:00:00Z`).getTime();
  const b = new Date(`${tot}T00:00:00Z`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 1;
  return Math.max(1, Math.round((b - a) / DAG_MS) + 1);
}

/**
 * De periode loopt tot en met **gisteren**, niet tot en met vandaag.
 *
 * De sync draait 's nachts, dus van vandaag staat er hooguit een fractie in de database
 * — en die halve dag verscheen als een ingezakte laatste staaf in elke grafiek. Een
 * kolom die alleen maar zegt "de nacht is nog niet geweest" hoort er niet te staan.
 */
export function periodeGrenzen(dagen: number): Periode {
  const tot = new Date();
  tot.setUTCDate(tot.getUTCDate() - 1);
  const van = new Date(tot);
  van.setUTCDate(van.getUTCDate() - (dagen - 1));
  return { van: alsTekst(van), tot: alsTekst(tot) };
}

/** Dezelfde lengte, eindigend op de dag vóór deze periode begint. */
export function vorigePeriode(periode: Periode): Periode {
  const dagen = dagenIn(periode);
  const tot = new Date(`${periode.van}T00:00:00Z`);
  tot.setUTCDate(tot.getUTCDate() - 1);
  const van = new Date(tot);
  van.setUTCDate(van.getUTCDate() - (dagen - 1));
  return { van: alsTekst(van), tot: alsTekst(tot) };
}

/** De eerste en laatste dag van de kalendermaand waar `peil` in valt, of eerder. */
function maandGrenzen(maandenTerug: number): Periode {
  const nu = new Date();
  const eerste = new Date(Date.UTC(nu.getUTCFullYear(), nu.getUTCMonth() - maandenTerug, 1));
  const laatste = new Date(Date.UTC(eerste.getUTCFullYear(), eerste.getUTCMonth() + 1, 0));
  const gisteren = new Date();
  gisteren.setUTCDate(gisteren.getUTCDate() - 1);
  return {
    van: alsTekst(eerste),
    tot: alsTekst(laatste < gisteren ? laatste : gisteren),
  };
}

/**
 * De vaste periodes.
 *
 * Naast de vier vensters staan hier twee kalenderperiodes ("deze maand", "vorige maand"):
 * een marketingbudget loopt per maand, en "de afgelopen dertig dagen" is dan net niet de
 * vraag. Alles wat daarbuiten valt gaat via de eigen periode in de filterbalk.
 */
export function standaardPeriodes(): PeriodeKeuze[] {
  const venster = (id: string, label: string, dagen: number): PeriodeKeuze => ({
    id,
    label,
    dagen,
    ...periodeGrenzen(dagen),
  });
  const dezeMaand = maandGrenzen(0);
  const vorigeMaand = maandGrenzen(1);
  return [
    venster("7d", "7 dagen", 7),
    venster("30d", "30 dagen", 30),
    venster("90d", "90 dagen", 90),
    venster("12m", "12 maanden", 365),
    { id: "maand", label: "Deze maand", dagen: dagenIn(dezeMaand), ...dezeMaand },
    { id: "vorige-maand", label: "Vorige maand", dagen: dagenIn(vorigeMaand), ...vorigeMaand },
  ];
}

/** Een eigen periode uit twee datums, met een label dat leest als een periode. */
export function eigenPeriode(van: string, tot: string): PeriodeKeuze {
  const heen = van <= tot ? { van, tot } : { van: tot, tot: van };
  return {
    id: "eigen",
    label: `${kortDatum(heen.van)} – ${kortDatum(heen.tot)}`,
    dagen: dagenIn(heen),
    ...heen,
  };
}

export function kortDatum(datum: string): string {
  if (!datum) return "—";
  return new Date(`${datum}T00:00:00Z`).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  });
}

