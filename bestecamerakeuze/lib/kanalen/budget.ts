/**
 * Budget en pacing: hoever is een campagne door zijn geld, vergeleken met hoever hij is
 * door zijn looptijd?
 *
 * Twee breuken naast elkaar. Staat een campagne op 80% van zijn budget terwijl hij pas
 * op de helft van zijn looptijd is, dan is hij over drie weken leeg — en dat is iets wat
 * je nú wilt weten, niet als het geld op is. Andersom betekent 20% besteed op 80% van de
 * tijd dat er budget onbenut blijft.
 *
 * Geen React en geen databaseverbinding, dus zonder bundler te testen.
 */

export interface CampagneBudget {
  campagne: string;
  sheetCampagne: string;
  budget: number | null;
  doelLeads: number | null;
  startdatum: string;
  einddatum: string;
  uitgaven: number;
  leads: number;
}

export interface Pacing {
  /** Welk deel van de looptijd voorbij is (0–1). */
  verstreken: number;
  /** Welk deel van het budget op is (0–1); 0 als er geen budget bekend is. */
  benut: number;
  /** Benut min verstreken, in procentpunten als fractie. Null zonder budget. */
  afwijking: number | null;
  oordeel: "voor" | "achter" | "op-schema" | "onbekend";
  begonnen: boolean;
  afgelopen: boolean;
  /** De hoeveelste dag van de looptijd we nu zijn, en hoeveel dagen het er zijn. */
  dagVan: number;
  dagen: number;
}

/** Vanaf hoeveel procentpunten verschil noemen we het uit de pas? */
const MARGE = 0.1;

const DAG_MS = 86400000;

function alsTijd(datum: string): number {
  return new Date(`${datum}T00:00:00Z`).getTime();
}

export function pacingVan(budget: CampagneBudget, nu: Date = new Date()): Pacing {
  const start = alsTijd(budget.startdatum);
  const eind = alsTijd(budget.einddatum);
  const vandaag = alsTijd(nu.toISOString().slice(0, 10));

  if (!Number.isFinite(start) || !Number.isFinite(eind) || eind < start) {
    return {
      verstreken: 0,
      benut: 0,
      afwijking: null,
      oordeel: "onbekend",
      begonnen: false,
      afgelopen: false,
      dagVan: 0,
      dagen: 0,
    };
  }

  const dagen = Math.round((eind - start) / DAG_MS) + 1;
  const dagVan = Math.min(dagen, Math.max(0, Math.round((vandaag - start) / DAG_MS) + 1));
  const begonnen = vandaag >= start;
  const afgelopen = vandaag > eind;
  const verstreken = afgelopen ? 1 : begonnen ? dagVan / dagen : 0;

  if (budget.budget === null || budget.budget <= 0) {
    return { verstreken, benut: 0, afwijking: null, oordeel: "onbekend", begonnen, afgelopen, dagVan, dagen };
  }

  const benut = budget.uitgaven / budget.budget;
  const afwijking = benut - verstreken;
  // Vóór de start zegt een afwijking niets: dan is verstreken nul en is elke euro "voor".
  const oordeel = !begonnen
    ? "onbekend"
    : Math.abs(afwijking) < MARGE
      ? "op-schema"
      : afwijking > 0
        ? "voor"
        : "achter";

  return { verstreken, benut, afwijking, oordeel, begonnen, afgelopen, dagVan, dagen };
}
