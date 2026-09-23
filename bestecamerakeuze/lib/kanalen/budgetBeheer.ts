/**
 * Budget beheer: ligt de lopende maand op koers, per account en platform?
 *
 * Drie getallen per kant — wat er is uitgegeven (of aan klikken binnenkwam), waar de
 * maand op uitkomt als het tempo zo blijft, en wat er is afgesproken. Het tweede is de
 * vraag: een budget van € 3.000 met € 1.800 uitgegeven zegt niets zolang je niet weet of
 * het de 10e of de 25e is.
 *
 * De forecast is een rechte lijn: (gerealiseerd / verstreken dagen) × dagen in de maand.
 * Bewust niets slimmers — geen weekdagpatroon, geen trend. Het cijfer moet in het
 * overleg na te rekenen zijn, en "als we zo doorgaan" is precies wat het belooft.
 *
 * Geen React en geen database, dus zonder bundler te testen (`budgetBeheer.test.ts`).
 */

/** Uitgaven en klikken van één account × platform op één dag. */
export interface DagRegel {
  datum: string;
  account: string;
  platform: string;
  uitgaven: number;
  klikken: number;
}

/** Wat het team voor één account × platform × maand heeft vastgelegd. */
export interface BudgetDoel {
  account: string;
  platform: string;
  /** `YYYY-MM`. */
  maand: string;
  budget: number | null;
  doelKlikken: number | null;
}

export interface MaandVoortgang {
  dagenInMaand: number;
  /**
   * Hoeveel dagen van de maand er in de data kunnen zitten.
   *
   * Tot en met **gisteren**, net als op de kanaalpagina's (`periodeGrenzen`): de sync
   * draait 's nachts, dus vandaag telt nog niet mee. Rekende de forecast vandaag als
   * verstreken dag, dan deelde hij door een dag te veel en kwam elke maand te laag uit.
   */
  verstrekenDagen: number;
}

export type Oordeel = "te-langzaam" | "op-koers" | "te-snel";

/** Binnen 10% van het doel noemen we het op koers — dezelfde marge als `budget.ts`. */
export const MARGE = 0.1;

const MAAND_PATROON = /^(\d{4})-(\d{2})$/;

export function isMaand(waarde: string | null | undefined): waarde is string {
  if (!waarde) return false;
  const m = MAAND_PATROON.exec(waarde);
  return Boolean(m && Number(m[2]) >= 1 && Number(m[2]) <= 12);
}

/** De maand waarin `nu` valt, als `YYYY-MM`. */
export function huidigeMaand(nu: Date = new Date()): string {
  return nu.toISOString().slice(0, 7);
}

/** Eerste en laatste dag van een maand, als `YYYY-MM-DD`. */
export function maandGrenzen(maand: string): { van: string; tot: string } {
  const [jaar, mnd] = maand.split("-").map(Number);
  const laatste = new Date(Date.UTC(jaar, mnd, 0)).getUTCDate();
  return { van: `${maand}-01`, tot: `${maand}-${String(laatste).padStart(2, "0")}` };
}

/** `aantal` maanden vóór (negatief) of na (positief) `maand`. */
export function verschuifMaand(maand: string, aantal: number): string {
  const [jaar, mnd] = maand.split("-").map(Number);
  return new Date(Date.UTC(jaar, mnd - 1 + aantal, 1)).toISOString().slice(0, 7);
}

export function maandVoortgang(maand: string, nu: Date = new Date()): MaandVoortgang {
  const { tot } = maandGrenzen(maand);
  const dagenInMaand = Number(tot.slice(8, 10));
  const huidig = huidigeMaand(nu);

  if (maand < huidig) return { dagenInMaand, verstrekenDagen: dagenInMaand };
  if (maand > huidig) return { dagenInMaand, verstrekenDagen: 0 };
  // In de lopende maand: dag van vandaag min één, want vandaag zit nog niet in de data.
  return { dagenInMaand, verstrekenDagen: nu.getUTCDate() - 1 };
}

/**
 * Waar komt de maand uit als het tempo zo blijft?
 *
 * Null zolang er nog geen enkele volle dag voorbij is — op de 1e van de maand valt er niets
 * te extrapoleren, en een nul zou lezen als "we gaan niets uitgeven".
 */
export function forecast(gerealiseerd: number, voortgang: MaandVoortgang): number | null {
  if (voortgang.verstrekenDagen <= 0) return null;
  return (gerealiseerd / voortgang.verstrekenDagen) * voortgang.dagenInMaand;
}

/** Forecast tegen doel. Null zonder doel of zonder forecast: dan valt er niets te oordelen. */
export function oordeelVan(verwacht: number | null, doel: number | null): Oordeel | null {
  if (verwacht === null || doel === null || doel <= 0) return null;
  const verhouding = verwacht / doel;
  if (verhouding < 1 - MARGE) return "te-langzaam";
  if (verhouding > 1 + MARGE) return "te-snel";
  return "op-koers";
}

export function sleutelVan(account: string, platform: string): string {
  return `${account}\u0000${platform}`;
}

export interface Totalen {
  uitgaven: number;
  klikken: number;
  /** Null als er voor geen enkele regel in de selectie een budget staat. */
  budget: number | null;
  doelKlikken: number | null;
}

/**
 * Telt de dagregels en de doelen op voor één maand en de gekozen account × platform-paren.
 *
 * `binnen` beslist per paar of het meetelt; zo gebruiken de zes kaartjes en de tabel
 * precies dezelfde selectie. Een budget telt alleen mee als het voor díe maand is
 * ingevuld — geen doorschuiven van vorige maand, want dan staat er een getal dat
 * niemand heeft afgesproken.
 */
export function telOpVoorMaand(
  dagen: DagRegel[],
  doelen: BudgetDoel[],
  maand: string,
  binnen: (account: string, platform: string) => boolean = () => true,
): Totalen {
  let uitgaven = 0;
  let klikken = 0;
  for (const dag of dagen) {
    if (dag.datum.slice(0, 7) !== maand || !binnen(dag.account, dag.platform)) continue;
    uitgaven += dag.uitgaven;
    klikken += dag.klikken;
  }

  let budget: number | null = null;
  let doelKlikken: number | null = null;
  for (const doel of doelen) {
    if (doel.maand !== maand || !binnen(doel.account, doel.platform)) continue;
    if (doel.budget !== null) budget = (budget ?? 0) + doel.budget;
    if (doel.doelKlikken !== null) doelKlikken = (doelKlikken ?? 0) + doel.doelKlikken;
  }

  return { uitgaven, klikken, budget, doelKlikken };
}
