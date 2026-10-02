/**
 * Vaste opbouw van de landingspagina-audit: de zeven criteria en de verkeersbronnen. De
 * namen liggen vast zodat rapporten van verschillende pagina's naast elkaar te leggen zijn;
 * hoe zwaar elk criterium weegt en welk eindcijfer de pagina krijgt, bepaalt het model per
 * campagne (zie lib/landingspaginaPrompt.ts). Zonder afhankelijkheden, zodat
 * lib/landingspaginaCriteria.test.ts het los kan testen.
 */

/** Waar de bezoeker vandaan komt; bepaalt wat de bezoeker al weet bij aankomst. */
export const VERKEERSBRONNEN = [
  "E-mail aan bestaande contacten",
  "Betaalde advertenties",
  "Social media (organisch)",
  "Onbekend of gemengd",
] as const;
export type Verkeersbron = (typeof VERKEERSBRONNEN)[number];

/** Elk criterium hoort bij iets wat de content marketeer in het CMS zelf kan aanpassen. */
export const CRITERIA = [
  "Doel & doelgroep",
  "Eerste scherm",
  "Informatie & bezwaren",
  "Duidelijkheid & consistentie",
  "Focus & opbouw",
  "Actie & formulier",
  "Beeld",
] as const;

export type InfoStatus = "duidelijk" | "onduidelijk" | "ontbreekt";
export type BlokOordeel = "kern" | "aanpassen" | "overbodig";

/**
 * Zet de weging die het model koos om naar hele procenten die samen precies 100 zijn. Het
 * schema kan geen som afdwingen; zonder bruikbare weging telt alles even zwaar.
 */
export function normaliseerGewichten(gewichten: number[]): number[] {
  if (!gewichten.length) return [];
  let schoon = gewichten.map((g) => (Number.isFinite(g) && g > 0 ? g : 0));
  let som = schoon.reduce((a, b) => a + b, 0);
  if (!som) {
    schoon = schoon.map(() => 1);
    som = schoon.length;
  }
  const exact = schoon.map((g) => (g / som) * 100);
  const afgerond = exact.map(Math.floor);
  // Wat er door het afronden naar beneden ontbreekt, gaat naar de grootste restjes.
  const volgorde = exact.map((g, i) => [g - afgerond[i], i] as const).sort((a, b) => b[0] - a[0]);
  const tekort = 100 - afgerond.reduce((a, b) => a + b, 0);
  for (let k = 0; k < tekort; k++) afgerond[volgorde[k][1]]++;
  return afgerond;
}
