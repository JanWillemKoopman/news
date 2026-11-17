import type { LeadRegel } from "@/lib/leads/koppel";

/**
 * Rekenwerk voor het tabblad Leads: filteren, groeperen en optellen.
 *
 * Staat los van React, zodat het getest kan worden en zodat elk getal op de pagina uit
 * dezelfde functies komt. De pagina haalt de regels één keer op en filtert daarna in het
 * geheugen — net als op de andere Kanalen-pagina's kost een klik op een filter dus geen
 * netwerkronde.
 *
 * ## Betaald is niet hetzelfde als "kosten bekend"
 *
 * Een lead is **betaald** als het verkeer betaald was (`platform !== null`). Zijn kosten
 * zijn daarmee nog niet bekend: Bing en LinkedIn zijn betaald, maar hebben geen
 * kostenbron. Daarom is "kosten per betaalde lead" gedeeld door alleen de leads waarvan
 * de kosten bekend zijn (`metKosten`) — anders trekt elke Bing-lead de gemiddelde prijs
 * omlaag met een lead waarvan niemand weet wat hij kostte.
 */

export type BetaaldFilter = "alle" | "betaald" | "onbetaald";

export interface LeadFilters {
  /** Lege lijst = geen filter. */
  events: string[];
  kanalen: string[];
  merken: string[];
  betaald: BetaaldFilter;
}

export const GEEN_FILTERS: LeadFilters = { events: [], kanalen: [], merken: [], betaald: "alle" };

/** "Onbekend" voor een lege merk-, model- of formulierwaarde. */
export const ONBEKEND = "Onbekend";

export function waardeOfOnbekend(waarde: string): string {
  return waarde === "" ? ONBEKEND : waarde;
}

/** Past een regel binnen de filters? */
export function voldoetAanFilters(r: LeadRegel, f: LeadFilters): boolean {
  if (f.events.length > 0 && !f.events.includes(r.event)) return false;
  if (f.kanalen.length > 0 && !f.kanalen.includes(r.kanaal)) return false;
  if (f.merken.length > 0 && !f.merken.includes(waardeOfOnbekend(r.merk))) return false;
  if (f.betaald === "betaald" && r.platform === null) return false;
  if (f.betaald === "onbetaald" && r.platform !== null) return false;
  return true;
}

export function filterRegels(regels: LeadRegel[], f: LeadFilters): LeadRegel[] {
  return regels.filter((r) => voldoetAanFilters(r, f));
}

export interface Totalen {
  leads: number;
  betaald: number;
  onbetaald: number;
  /** Betaalde leads waarvan we de kosten kennen. */
  metKosten: number;
  /** Betaalde leads zonder kostenbron of zonder gevonden campagne. */
  zonderKosten: number;
  /** Som van de toegerekende kosten. */
  kosten: number;
}

export function telTotalen(regels: LeadRegel[]): Totalen {
  const t: Totalen = { leads: 0, betaald: 0, onbetaald: 0, metKosten: 0, zonderKosten: 0, kosten: 0 };
  for (const r of regels) {
    t.leads += r.aantal;
    if (r.platform === null) {
      t.onbetaald += r.aantal;
      continue;
    }
    t.betaald += r.aantal;
    if (r.status === "toegerekend") {
      t.metKosten += r.aantal;
      t.kosten += r.kosten ?? 0;
    } else {
      t.zonderKosten += r.aantal;
    }
  }
  return t;
}

/** Kosten per betaalde lead, gedeeld door de leads waarvan de kosten bekend zijn. */
export function kostenPerLead(t: Pick<Totalen, "kosten" | "metKosten">): number | null {
  return t.metKosten > 0 ? t.kosten / t.metKosten : null;
}

export interface Groep extends Totalen {
  sleutel: string;
  /** Extra tekst die bij de sleutel hoort (bv. het merk bij een model). */
  toelichting?: string;
}

/**
 * Groepeert regels op een sleutel, de grootste groep bovenaan.
 *
 * Bij gelijk aantal volgt de sleutel alfabetisch, zodat de volgorde niet verspringt als
 * twee groepen even groot zijn en een filter wisselt.
 */
export function groepeer(
  regels: LeadRegel[],
  sleutelVan: (r: LeadRegel) => string,
  toelichtingVan?: (r: LeadRegel) => string,
): Groep[] {
  const perSleutel = new Map<string, LeadRegel[]>();
  for (const r of regels) {
    const sleutel = sleutelVan(r);
    const lijst = perSleutel.get(sleutel);
    if (lijst) lijst.push(r);
    else perSleutel.set(sleutel, [r]);
  }
  return [...perSleutel.entries()]
    .map(([sleutel, lijst]) => ({
      sleutel,
      toelichting: toelichtingVan?.(lijst[0]),
      ...telTotalen(lijst),
    }))
    .sort((a, b) => b.leads - a.leads || a.sleutel.localeCompare(b.sleutel, "nl"));
}

export interface DagPunt {
  datum: string;
  betaald: number;
  onbetaald: number;
}

/** Alle dagen van `van` t/m `tot`, ook de dagen zonder lead — anders liegt de as. */
export function perDag(regels: LeadRegel[], van: string, tot: string): DagPunt[] {
  const dagen = new Map<string, DagPunt>();
  const start = Date.parse(`${van}T00:00:00Z`);
  const eind = Date.parse(`${tot}T00:00:00Z`);
  for (let t = start; t <= eind; t += 86_400_000) {
    const datum = new Date(t).toISOString().slice(0, 10);
    dagen.set(datum, { datum, betaald: 0, onbetaald: 0 });
  }
  for (const r of regels) {
    const dag = dagen.get(r.datum);
    if (!dag) continue;
    if (r.platform === null) dag.onbetaald += r.aantal;
    else dag.betaald += r.aantal;
  }
  return [...dagen.values()];
}

/**
 * Een leesbare naam voor een leadevent.
 *
 * `generate_lead_proefrit` → "Proefrit". Het kale `generate_lead` is het algemene event
 * dat geen soort meegeeft. De schrijfwijze van GA4 blijft herkenbaar (`privatelease` en
 * `private_lease` zijn twee verschillende events en blijven dat), zodat een rij in de
 * tabel terug te vinden is in GA4.
 */
export function leadSoort(event: string): string {
  const rest = event.replace(/^generate_lead_?/i, "").replace(/_/g, " ").trim();
  if (rest === "") return "Algemeen";
  if (rest === rest.toUpperCase() && rest.length <= 6) return rest; // HMODH
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}
