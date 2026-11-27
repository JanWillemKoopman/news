/**
 * Marketing analyse — één kleur per kanaal op de hele pagina (redesign november 2026).
 *
 * De kleur komt uit het grafiekpalet van het actieve theme (`useGrafiekKleuren().categorieen`),
 * maar op een vaste plek per kanaal: Meta Ads is overal de eerste kleur, Google Ads overal de
 * tweede, ook als een grafiek alleen Google toont. Zo herken je een kanaal in de zijbalk, de
 * grafieken en de tabellen aan dezelfde kleur. Kanalen zonder eigen plek (Direct, Overig) krijgen
 * de rustige contextkleur.
 */

export type KanaalSleutel =
  | "meta"
  | "google"
  | "linkedin"
  | "email"
  | "social"
  | "instagram"
  | "zoeken"
  | "overig";

/** Plek in het palet; null = de contextkleur. */
const PLEK: Record<KanaalSleutel, number | null> = {
  meta: 0,
  google: 1,
  email: 2,
  zoeken: 3,
  linkedin: 4,
  social: 5,
  instagram: 5,
  overig: null,
};

export const KANAAL_NAAM: Record<KanaalSleutel, string> = {
  meta: "Meta Ads",
  google: "Google Ads",
  linkedin: "LinkedIn",
  email: "E-mail",
  social: "Organische social",
  instagram: "Instagram",
  zoeken: "Organisch zoeken",
  overig: "Overig",
};

/** Herken het kanaal aan de naam zoals de analyse hem schrijft ("Meta Ads (facebook / paid)", "Google Ads (Demand Gen)"). */
export function kanaalVan(naam: string): KanaalSleutel | null {
  const n = naam.toLowerCase();
  if (/\b(meta|facebook)\b/.test(n)) return "meta";
  if (/google ads|google \/ cpc|demand gen|\bgoogle\b/.test(n) && !/organisch/.test(n)) return "google";
  if (/linkedin/.test(n)) return "linkedin";
  if (/e-?mail|nieuwsbrief|selligent/.test(n)) return "email";
  if (/instagram/.test(n)) return "instagram";
  if (/organische social|social organisch/.test(n)) return "social";
  if (/organisch zoeken|organic search|seo/.test(n)) return "zoeken";
  if (/^(direct|overig|niet toegewezen|verwijzingen)/.test(n) || /overig/.test(n)) return "overig";
  return null;
}

/** De kleur van één kanaal in het palet van het theme. */
export function kanaalKleur(naam: string, palet: readonly string[], context: string): string | null {
  const sleutel = kanaalVan(naam);
  if (!sleutel) return null;
  const plek = PLEK[sleutel];
  return plek === null ? context : (palet[plek % palet.length] ?? context);
}

/**
 * Kleuren voor de reeksen van één grafiek. Zijn alle reeksen herkenbare kanalen met elk een
 * andere kleur, dan de vaste kanaalkleuren; anders de gewone volgorde van het palet, zodat er
 * nooit twee reeksen met dezelfde kleur naast elkaar staan.
 */
export function reeksKleuren(namen: readonly string[], palet: readonly string[], context: string): string[] {
  const standaard = namen.map((_, i) => palet[i % palet.length] ?? context);
  const kanaal = namen.map((n) => kanaalKleur(n, palet, context));
  if (kanaal.some((k) => k === null)) return standaard;
  const uniek = new Set(kanaal);
  // Twee keer de contextkleur (Direct en Overig) mag niet; dan liever de gewone volgorde.
  return uniek.size === kanaal.length ? (kanaal as string[]) : standaard;
}
