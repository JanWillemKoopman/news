// Alleen een type-import: dit bestand doet zelf geen aggregatie, en blijft daardoor pure
// rekenkunde die zonder bundler te testen is. Het optellen en het uitrekenen van een
// afgeleide hoort in `kubus.ts` en gebeurt bij de aanroeper — er is precies één plek waar
// een CTR uit sommen wordt berekend, en dat blijft zo.
import type { Statistiek } from "@/lib/windsor/velden";

/**
 * Het verschil tussen nu en de vorige, even lange periode.
 *
 * ## Waarom een percentage en niet alleen het verschil
 *
 * "€ 61.538 uitgegeven" is een constatering; "€ 61.538, 12% meer dan de dertig dagen
 * ervoor" is een signaal. Alle cijfers op deze pagina's zijn tot nu toe het eerste
 * soort, en dat is de reden dat je er wel naar kunt kijken maar niet op kunt sturen.
 *
 * ## Twee dingen die hier bewust gebeuren
 *
 * - **Lager is soms beter.** Kosten per klik die met 20% dalen is goed nieuws, uitgaven
 *   die met 20% dalen niet per se, en leads die met 20% dalen slecht. `lagerIsBeter` op
 *   de statistiek bepaalt de kleur; staat het er niet op, dan is meer beter. Voor
 *   uitgaven zelf geven we geen oordeel — een budget dat stijgt is niet goed of fout.
 * - **Delen door nul geeft geen percentage.** Van nul naar honderd is geen "+∞%" maar
 *   "nieuw"; dat staat er dan ook.
 */

export interface Verschil {
  nu: number | null;
  toen: number | null;
  absoluut: number | null;
  /** Fractie (0,12 = +12%). Null als er niets was om mee te vergelijken. */
  relatief: number | null;
  /** true = gunstig, false = ongunstig, null = geen oordeel (bv. uitgaven). */
  gunstig: boolean | null;
}

/** Statistieken waarbij een stijging of daling geen oordeel verdient. */
const GEEN_OORDEEL = new Set(["uitgaven", "vertoningen", "advertentie_uitgaven", "volgers"]);

/**
 * @param nu   de waarde nu, al uitgerekend met `waardeVan`
 * @param toen dezelfde waarde over de vorige periode, of null als er niets te vergelijken is
 */
export function verschilVan(
  statistiek: Statistiek,
  nu: number | null,
  toen: number | null,
): Verschil {
  if (nu === null || toen === null) {
    return { nu, toen, absoluut: null, relatief: null, gunstig: null };
  }

  const absoluut = nu - toen;
  const relatief = toen === 0 ? null : absoluut / Math.abs(toen);

  let gunstig: boolean | null = null;
  if (absoluut !== 0 && !GEEN_OORDEEL.has(statistiek.id)) {
    gunstig = statistiek.lagerIsBeter ? absoluut < 0 : absoluut > 0;
  }

  return { nu, toen, absoluut, relatief, gunstig };
}

/**
 * Zet een relatief verschil om naar tekst.
 *
 * Boven de duizend procent zegt een percentage niets meer ("+4.200%"), dus dan liever
 * "meer dan 10× zoveel" — dat is wat iemand er zelf van maakt.
 */
export function verschilTekst(
  verschil: Verschil,
  waarmee = "vorige periode",
): string | null {
  if (verschil.nu === null) return null;
  if (verschil.toen === null) return null;
  if (verschil.relatief === null) {
    return verschil.nu === 0 ? "ook toen niets" : `nieuw t.o.v. ${waarmee}`;
  }
  if (verschil.relatief === 0) return `gelijk aan ${waarmee}`;

  const teken = verschil.relatief > 0 ? "+" : "−";
  const absoluut = Math.abs(verschil.relatief);
  if (absoluut >= 10) return `${teken}${Math.round(absoluut)}× t.o.v. ${waarmee}`;
  const cijfers = absoluut < 0.1 ? 1 : 0;
  return `${teken}${(absoluut * 100).toLocaleString("nl-NL", {
    maximumFractionDigits: cijfers,
  })}%`;
}
