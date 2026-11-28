/**
 * Rekenwerk achter het onderdeel Dataverantwoording van een analyse (plan §25, verzoek van de
 * eigenaar, 28 november 2026): per bron welke datapunten de analyse heeft meegenomen, de
 * twijfelgevallen die hij niet meenam, en de vaste regels die een klik op − of + in de Data
 * correctie zet.
 *
 * De regels staan in hetzelfde tekstveld als de vrije Data correctie, in een vaste vorm met de
 * sleutel van het datapunt tussen haken:
 *
 *   Weglaten: Meta Ads · campagne · A2 | Awareness [meta-ads:campagne:120211234567]
 *   Meenemen: Instagram · post · Audi-weekend bij Van den Udenhout [instagram:post:178901234]
 *
 * Zo leest de skill ze als gewone Data correctie, legt elke versie ze vast en neemt de volgende
 * analyseronde ze vanzelf mee; het dashboard herkent zijn eigen regels aan de sleutel.
 */

import type { BronFilter, Herkenning } from "./types";

export type CorrectieActie = "weglaten" | "meenemen";

export interface CorrectieRegel {
  actie: CorrectieActie;
  sleutel: string;
  /** "Meta Ads · campagne · A2 | Awareness" */
  omschrijving: string;
  /** De hele regel zoals hij in het veld staat. */
  regel: string;
}

const WOORD: Record<CorrectieActie, string> = { weglaten: "Weglaten", meenemen: "Meenemen" };
const REGEL = /^\s*(weglaten|meenemen)\s*:\s*(.*?)\s*\[([^[\]]+)\]\s*$/i;

function plat(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function slug(s: string): string {
  return plat(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Haken en regeleinden kunnen de vaste vorm breken; die gaan eruit. */
function schoon(s: string): string {
  return s.replace(/[[\]\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

/** De sleutel van een datapunt: die van de analyse, anders afgeleid van bron, soort en naam. */
export function herkenningSleutel(h: Pick<Herkenning, "bron" | "soort" | "naam" | "sleutel">): string {
  const eigen = typeof h.sleutel === "string" ? schoon(h.sleutel) : "";
  if (eigen) return eigen;
  return `${slug(h.bron) || "bron"}:${slug(h.soort) || "soort"}:${schoon(plat(h.naam))}`;
}

export function herkenningOmschrijving(h: Pick<Herkenning, "bron" | "soort" | "naam">): string {
  return [h.bron, h.soort, h.naam].map(schoon).filter(Boolean).join(" · ");
}

export function maakRegel(actie: CorrectieActie, h: Pick<Herkenning, "bron" | "soort" | "naam" | "sleutel">): string {
  return `${WOORD[actie]}: ${herkenningOmschrijving(h)} [${herkenningSleutel(h)}]`;
}

function leesRegel(regel: string): CorrectieRegel | null {
  const m = REGEL.exec(regel);
  if (!m) return null;
  const sleutel = m[3].trim();
  if (!sleutel) return null;
  return { actie: m[1].toLowerCase() as CorrectieActie, sleutel, omschrijving: m[2].trim(), regel: regel.trim() };
}

/** De Data correctie uit elkaar: de vaste regels en de vrije tekst eromheen. */
export function leesCorrectie(tekst: string | null | undefined): { regels: CorrectieRegel[]; vrij: string } {
  const regels: CorrectieRegel[] = [];
  const vrij: string[] = [];
  for (const regel of (tekst ?? "").split(/\r?\n/)) {
    const r = leesRegel(regel);
    if (r) {
      // Dezelfde sleutel twee keer: de laatste geldt.
      const al = regels.findIndex((x) => x.sleutel === r.sleutel);
      if (al >= 0) regels.splice(al, 1);
      regels.push(r);
    } else vrij.push(regel);
  }
  return { regels, vrij: vrij.join("\n").replace(/^\s*\n+|\n+\s*$/g, "").trim() };
}

/** Vaste regels bovenaan, een lege regel, dan de vrije tekst. */
export function schrijfCorrectie(regels: readonly Pick<CorrectieRegel, "regel">[], vrij: string): string {
  return [regels.map((r) => r.regel).join("\n"), vrij.trim()].filter(Boolean).join("\n\n");
}

export function regelVoor(tekst: string | null | undefined, sleutel: string): CorrectieRegel | null {
  return leesCorrectie(tekst).regels.find((r) => r.sleutel === sleutel) ?? null;
}

/**
 * De Data correctie met voor `sleutel` precies `regel` (null = geen regel meer). De vrije tekst
 * blijft staan zoals hij was.
 */
export function metRegel(tekst: string | null | undefined, sleutel: string, regel: string | null): string {
  const { regels, vrij } = leesCorrectie(tekst);
  const rest = regels.filter((r) => r.sleutel !== sleutel);
  const nieuw = regel ? leesRegel(regel) : null;
  if (regel && (!nieuw || nieuw.sleutel !== sleutel)) throw new Error("Ongeldige regel voor de Data correctie.");
  return schrijfCorrectie(nieuw ? [...rest, nieuw] : rest, vrij);
}

// ---------------------------------------------------------------------------
// Per bron groeperen
// ---------------------------------------------------------------------------

export type HerkenningGroep = "Advertenties" | "Organische social" | "E-mail" | "Website" | "Syntec" | "Overig";

/** Dezelfde volgorde als de funnel. */
export const GROEP_VOLGORDE: readonly HerkenningGroep[] = ["Advertenties", "Organische social", "E-mail", "Website", "Syntec", "Overig"];

/** In welke groep van de Dataverantwoording een bron hoort. */
export function groepVanBron(bron: string, soort = ""): HerkenningGroep {
  const b = plat(bron);
  const s = plat(soort);
  const beide = `${b} ${s}`;
  if (/syntec/.test(beide)) return "Syntec";
  if (/e-?mail|mailing|selligent|nieuwsbrief|m_bt/.test(beide)) return "E-mail";
  if (/\bads\b|advertentie|adverteren/.test(b)) return "Advertenties";
  if (/ga4|google analytics|analytics|website|landingspagina/.test(b)) return "Website";
  if (/instagram|facebook|linkedin|tiktok|youtube|social/.test(b)) {
    return /campagne|advertentie|ad set|advertentieset/.test(s) ? "Advertenties" : "Organische social";
  }
  if (/\bmeta\b|google/.test(b) && /campagne|advertentie/.test(s)) return "Advertenties";
  if (/pagina|event|conversie/.test(s)) return "Website";
  if (/lead|order/.test(b)) return "Syntec";
  return "Overig";
}

export interface BronBlok {
  bron: string;
  filter: BronFilter | null;
  rijen: Herkenning[];
}

export interface GroepBlok {
  groep: HerkenningGroep;
  bronnen: BronBlok[];
}

export function isOpgenomen(h: Herkenning): boolean {
  return h.opgenomen !== false;
}

/**
 * De rijen van de Dataverantwoording per groep en per bron, in de volgorde van de funnel; binnen
 * een groep de bronnen in de volgorde waarin de analyse ze noemt. `opgenomen` kiest de bovenste
 * lijst (meegenomen) of die onder de streep (mogelijke touchpoints). Een bronfilter zonder rij
 * staat er alleen bij de meegenomen lijst, zodat zichtbaar is dat de bron wél bekeken is.
 */
export function groepeerHerkenning(
  herkenning: readonly Herkenning[],
  bronFilters: readonly BronFilter[] = [],
  opgenomen = true,
): GroepBlok[] {
  const filterVan = new Map(bronFilters.map((f) => [plat(f.bron), f]));
  const blokken = new Map<string, BronBlok & { groep: HerkenningGroep }>();
  for (const h of herkenning) {
    if (isOpgenomen(h) !== opgenomen) continue;
    const sleutel = plat(h.bron);
    let blok = blokken.get(sleutel);
    if (!blok) {
      blok = { bron: h.bron, groep: groepVanBron(h.bron, h.soort), filter: filterVan.get(sleutel) ?? null, rijen: [] };
      blokken.set(sleutel, blok);
    }
    blok.rijen.push(h);
  }
  if (opgenomen) {
    for (const f of bronFilters) {
      const sleutel = plat(f.bron);
      if (!blokken.has(sleutel)) blokken.set(sleutel, { bron: f.bron, groep: groepVanBron(f.bron), filter: f, rijen: [] });
    }
  }
  return GROEP_VOLGORDE.map((groep) => ({
    groep,
    bronnen: [...blokken.values()].filter((b) => b.groep === groep).map(({ bron, filter, rijen }) => ({ bron, filter, rijen })),
  })).filter((g) => g.bronnen.length > 0);
}

// ---------------------------------------------------------------------------
// Wat een klik doet
// ---------------------------------------------------------------------------

export interface RijStand {
  /** Wat de Data correctie nu over dit datapunt zegt. */
  wens: CorrectieActie | null;
  /** De wens is anders dan bij deze versie: hij geldt vanaf de volgende analyse. */
  klaar: boolean;
}

export function rijStand(h: Herkenning, tekstNu: string | null | undefined, tekstBijVersie: string | null | undefined): RijStand {
  const sleutel = herkenningSleutel(h);
  const nu = regelVoor(tekstNu, sleutel)?.actie ?? null;
  const toen = regelVoor(tekstBijVersie, sleutel)?.actie ?? null;
  return { wens: nu, klaar: nu !== toen };
}

/**
 * De regel die na een klik voor dit datapunt in de Data correctie hoort. − op een meegenomen rij
 * zet "Weglaten", + op een niet meegenomen rij "Meenemen"; ongedaan maken zet terug wat er bij
 * deze versie stond (of niets).
 */
export function regelNaKlik(
  h: Herkenning,
  klik: "min" | "plus" | "ongedaan",
  tekstBijVersie: string | null | undefined,
): string | null {
  if (klik === "min") return maakRegel("weglaten", h);
  if (klik === "plus") return maakRegel("meenemen", h);
  return regelVoor(tekstBijVersie, herkenningSleutel(h))?.regel ?? null;
}

/** Hoeveel regels de Data correctie nu anders heeft dan bij deze versie. */
export function aantalAanpassingen(tekstNu: string | null | undefined, tekstBijVersie: string | null | undefined): number {
  const nu = new Map(leesCorrectie(tekstNu).regels.map((r) => [r.sleutel, r.actie]));
  const toen = new Map(leesCorrectie(tekstBijVersie).regels.map((r) => [r.sleutel, r.actie]));
  let n = 0;
  for (const sleutel of new Set([...nu.keys(), ...toen.keys()])) if (nu.get(sleutel) !== toen.get(sleutel)) n++;
  return n;
}

export interface VerantwoordingTelling {
  meegenomen: number;
  bronnen: number;
  nietMeegenomen: number;
}

export function telVerantwoording(herkenning: readonly Herkenning[]): VerantwoordingTelling {
  const mee = herkenning.filter(isOpgenomen);
  return {
    meegenomen: mee.length,
    bronnen: new Set(mee.map((h) => plat(h.bron))).size,
    nietMeegenomen: herkenning.length - mee.length,
  };
}
