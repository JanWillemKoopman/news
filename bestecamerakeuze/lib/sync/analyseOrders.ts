import type { Bron, GeparsteRij } from "@/lib/sync/bronnen";
import { eersteDag } from "@/lib/sync/analyseLeads";

/**
 * De orders-kopie voor Marketing analyse (`dataloket.marketing_analyse_orders`): de bron
 * "Syntec orders" in de semantic layer.
 *
 * Verzoek van de eigenaar (25 november 2026, campagne-analyse-tool.md §16): precies dezelfde
 * opzet als de leads-kopie (`analyseLeads.ts`), maar dan voor de verkochte auto's uit het
 * sheet-tabblad "Data orders":
 *
 *  - **vijf kolommen, 1-op-1** zoals in de sheet: Ordersoort, Klantgroep, Merk, Model,
 *    Orderdatum (plus Orderdatum als datum, om op periode te filteren);
 *  - **de laatste 365 dagen** (Nederlandse kalender, op Orderdatum);
 *  - **elke rij is één verkochte auto**; Handel blijft erin (de analyse noemt hem apart);
 *  - zonder rijen zonder leesbare Orderdatum (lege opvulregels of iets onherkenbaars).
 *
 * "Data orders" staat niet in `BRONNEN`: er is geen ruwe kopie (`orders_raw` komt uit
 * "Data orders 2"). `/api/sync` leest dit tabblad daarom zelf, elke nacht, met
 * `ANALYSE_ORDERS_BRON`. Pure functies: geen database.
 */

export const ANALYSE_ORDERS_DAGEN = 365;

/** Het sheet-tabblad, in dezelfde spreadsheet als "Data leads". */
export const ANALYSE_ORDERS_BRON: Bron = {
  naam: "Data orders",
  sheetId: "15v1fCY976qQ0vVSiAmyXqYoGJvAnismE66IQzrVuZKk",
  tabblad: "Data orders",
  doeltabel: "marketing_analyse_orders",
  sleutelKolom: "regelnummer",
  vereisteKolom: "Orderdatum",
  kolommen: {
    Ordersoort: "ordersoort",
    Klantgroep: "klantgroep",
    Merk: "merk",
    Model: "model",
    Orderdatum: "orderdatum",
  },
};

export interface AnalyseOrderRecord {
  ordersoort: string | null;
  klantgroep: string | null;
  merk: string | null;
  model: string | null;
  orderdatum: string | null;
  /** De orderdatum als "JJJJ-MM-DD", of null. */
  orderdatum_op: string | null;
}

/** "18-9-2026" (of "2026-09-18") → "2026-09-18". Null bij iets onherkenbaars. */
export function leesOrderdatum(waarde: string | null | undefined): string | null {
  if (!waarde) return null;
  const s = waarde.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const nl = /^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s+\d{1,2}:\d{2})?$/.exec(s);
  let jaar: number, maand: number, dag: number;
  if (iso) [jaar, maand, dag] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (nl) [dag, maand, jaar] = [Number(nl[1]), Number(nl[2]), Number(nl[3])];
  else return null;
  if (maand < 1 || maand > 12 || dag < 1 || dag > 31) return null;
  return `${jaar}-${String(maand).padStart(2, "0")}-${String(dag).padStart(2, "0")}`;
}

function waarde(rij: GeparsteRij, kolom: string): string | null {
  const w = rij.waarden[kolom]?.trim();
  return w === undefined || w === "" ? null : w;
}

/**
 * De rijen voor de orders-kopie. `vandaag` is de Nederlandse datum ("JJJJ-MM-DD"). Rijen zonder
 * leesbare Orderdatum vallen weg: zonder datum is niet te zeggen of ze in de 365 dagen vallen.
 */
export function analyseOrderRecords(
  rijen: readonly GeparsteRij[],
  vandaag: string,
  dagen: number = ANALYSE_ORDERS_DAGEN,
): AnalyseOrderRecord[] {
  const vanaf = eersteDag(vandaag, dagen);
  const uit: AnalyseOrderRecord[] = [];
  for (const rij of rijen) {
    const datum = leesOrderdatum(rij.waarden.Orderdatum);
    if (!datum || datum < vanaf || datum > vandaag) continue;
    uit.push({
      ordersoort: waarde(rij, "Ordersoort"),
      klantgroep: waarde(rij, "Klantgroep"),
      merk: waarde(rij, "Merk"),
      model: waarde(rij, "Model"),
      orderdatum: waarde(rij, "Orderdatum"),
      orderdatum_op: datum,
    });
  }
  return uit;
}

/**
 * Telt een order mee bij een analyse van de verkoop aan klanten? Standaard alleen Nieuw en
 * Gebruikt; Handel (verkoop aan andere bedrijven, bijna altijd zonder klantgroep) staat apart.
 * Gelijk aan het filter van de view `marketing_analyse_orders_klant` (migratie 0048); houd ze gelijk.
 */
export function isKlantOrder(o: Pick<AnalyseOrderRecord, "ordersoort">): boolean {
  return o.ordersoort === "Nieuw" || o.ordersoort === "Gebruikt";
}

/**
 * De klantgroep zoals de analyse hem noemt: een lege klantgroep heet "Geen klantgroep" (kolom
 * `klantgroep_naam` in de view), zodat de uitsplitsing altijd optelt tot het totaal.
 */
export const GEEN_KLANTGROEP = "Geen klantgroep";

export function klantgroepNaam(o: Pick<AnalyseOrderRecord, "klantgroep">): string {
  return o.klantgroep ?? GEEN_KLANTGROEP;
}
