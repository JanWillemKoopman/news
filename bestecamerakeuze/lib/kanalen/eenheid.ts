import type { Eenheid } from "@/components/chat/chartTheme";
import type { Statistiek } from "@/lib/windsor/velden";

/**
 * Hoe een statistiek wordt weergegeven.
 *
 * Stond drie keer bijna gelijk in de componenten (grafiek, kerncijfers, tabel) en week
 * op één punt af: de eenheid `seconden` viel er stilletjes doorheen als "aantal",
 * waardoor de gemiddelde kijktijd een kaal getal was.
 *
 * Het onderscheid tussen de twee euro-eenheden zit in wat het cijfer ís, niet in hoe
 * groot het is. Een **bedrag** (uitgaven, conversiewaarde) hoort op hele euro's: centen
 * zijn daar ruis. Een **prijs per iets** (kosten per klik, per lead, per duizend
 * vertoningen) hoort altijd op twee decimalen: daar is vijf cent het verschil, en een
 * kolom waarin de ene regel wel en de andere geen centen toont is niet te lezen.
 */
export function eenheidVan(statistiek: Statistiek): Eenheid {
  if (statistiek.eenheid === "euro") return statistiek.afgeleid ? "euro-exact" : "euro-heel";
  if (statistiek.eenheid === "procent") return "procent";
  if (statistiek.eenheid === "seconden") return "seconden";
  return "aantal";
}
