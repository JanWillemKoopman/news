/**
 * Vaste opbouw en rekenregels van de landingspagina-audit. Het model geeft per criterium
 * een cijfer; hier liggen de weging, de plafonds en het eindcijfer vast, zodat twee
 * pagina's met dezelfde gebreken ook hetzelfde cijfer krijgen. Zonder afhankelijkheden,
 * zodat lib/landingspaginaScore.test.ts het los kan testen.
 */

/** Wat voor campagne de pagina is; bepaalt welke informatie de bezoeker verwacht (zie de prompt). */
export const CAMPAGNETYPES = [
  "Evenement of uitnodiging",
  "Prijs- of leaseactie",
  "Proefrit of leadgeneratie",
  "Modelintroductie",
  "Werkplaats- of serviceactie",
  "Overig",
] as const;
export type Campagnetype = (typeof CAMPAGNETYPES)[number];

/** Waar de bezoeker vandaan komt; bepaalt wat de bezoeker al weet bij aankomst. */
export const VERKEERSBRONNEN = [
  "E-mail aan bestaande contacten",
  "Betaalde advertenties",
  "Social media (organisch)",
  "Onbekend of gemengd",
] as const;
export type Verkeersbron = (typeof VERKEERSBRONNEN)[number];

/**
 * De zes criteria met hun weging (samen 100). De zwaarte ligt bewust bij de vraag of de
 * verwachte informatie er staat en duidelijk is, en of de pagina zonder ruis bij het doel blijft.
 */
export const CRITERIA = [
  { nummer: 1, naam: "Doel & aansluiting", gewicht: 10 },
  { nummer: 2, naam: "Verwachte informatie", gewicht: 25 },
  { nummer: 3, naam: "Duidelijkheid & consistentie", gewicht: 20 },
  { nummer: 4, naam: "Focus: geen overbodige content", gewicht: 20 },
  { nummer: 5, naam: "Eerste scherm", gewicht: 10 },
  { nummer: 6, naam: "Aanmelden & conversie", gewicht: 15 },
] as const;

export type InfoStatus = "duidelijk" | "onduidelijk" | "ontbreekt";
export type BlokOordeel = "kern" | "inkorten" | "overbodig";

/** Plafond voor criterium 2: elk ontbrekend onderdeel kost 2 punten, elk onduidelijk onderdeel 1. */
export function plafondInformatie(statussen: InfoStatus[]): number {
  const ontbreekt = statussen.filter((s) => s === "ontbreekt").length;
  const onduidelijk = statussen.filter((s) => s === "onduidelijk").length;
  return Math.max(1, 10 - 2 * ontbreekt - onduidelijk);
}

/** Plafond voor criterium 4: één overbodig blok maximaal een 7, twee een 5, drie een 4, meer een 3. */
export function plafondFocus(oordelen: BlokOordeel[]): number {
  const overbodig = oordelen.filter((o) => o === "overbodig").length;
  return [10, 7, 5, 4][overbodig] ?? 3;
}

/** Gewogen gemiddelde van de criteriumcijfers, op één decimaal. */
export function gewogenEindcijfer(scores: { nummer: number; score: number }[]): number {
  let som = 0;
  let gewichten = 0;
  for (const c of CRITERIA) {
    const s = scores.find((x) => x.nummer === c.nummer);
    if (!s) continue;
    som += s.score * c.gewicht;
    gewichten += c.gewicht;
  }
  return gewichten ? Math.round((som / gewichten) * 10) / 10 : 0;
}
