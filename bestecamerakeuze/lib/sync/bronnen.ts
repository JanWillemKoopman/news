import Papa from "papaparse";

/**
 * De sheets die naar Postgres gekopieerd worden.
 *
 * Sjabloon: zodra je de links deelt, komt hier per sheet één regel in de `BRONNEN`-lijst
 * te staan. De rest van de sync-machinerie (validatie, afwijkingen, logging) hoeft dan
 * niet meer aangepast te worden.
 *
 * Waarom kopiëren en niet live lezen: met een kopie in Postgres kun je joinen, filteren
 * in SQL, en straks Ads- en Selligent-data naast verkoopdata leggen. Bij duizenden rijen
 * is een volledige verversing per nacht het simpelst en het betrouwbaarst.
 */

export interface Bron {
  /** Sleutel in de logging; ook de naam die in sync_runs verschijnt. */
  naam: string;
  /** Id uit de sheet-URL. */
  sheetId: string;
  /** Naam van het tabblad. */
  tabblad: string;
  /** Doeltabel in het dataloket-schema. */
  doeltabel: string;
  /** Kolom die een rij uniek maakt — nodig om te kunnen upserten. */
  sleutelKolom: string;
  /**
   * Van sheetkolom naar databasekolom. Kolommen die hier niet in staan worden genegeerd,
   * wat meteen de manier is om velden die de AI niet hoeft te zien buiten de database te
   * houden.
   */
  kolommen: Record<string, string>;
}

/** Nog leeg: hier komen de echte sheets in zodra de links bekend zijn. */
export const BRONNEN: Bron[] = [];

export function csvUrl(bron: Bron): string {
  return (
    `https://docs.google.com/spreadsheets/d/${bron.sheetId}/gviz/tq` +
    `?tqx=out:csv&sheet=${encodeURIComponent(bron.tabblad)}`
  );
}

/**
 * NL-notatie omzetten: "€ 3.000,50" → 3000.5. De sheets schrijven bedragen met een punt
 * als duizendtalscheiding en een komma als decimaalteken.
 */
export function parseGetalNL(waarde: string | undefined): number | null {
  if (!waarde) return null;
  const schoon = waarde.trim().replace(/[€\s]/g, "").replace(/\./g, "").replace(",", ".");
  if (schoon === "") return null;
  const n = Number(schoon);
  return Number.isFinite(n) ? n : null;
}

/** "31-12-2025" of "2025-12-31" → "2025-12-31". Geeft null bij iets onherkenbaars. */
export function parseDatumNL(waarde: string | undefined): string | null {
  if (!waarde) return null;
  const s = waarde.trim();
  if (s === "") return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) return s;
  const nl = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(s);
  if (nl) {
    const [, d, m, j] = nl;
    return `${j}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

export interface GeparsteRij {
  rijnummer: number;
  waarden: Record<string, string>;
}

export async function haalSheetOp(bron: Bron): Promise<GeparsteRij[]> {
  const res = await fetch(csvUrl(bron), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Kon sheet "${bron.naam}" niet ophalen (status ${res.status})`);
  }
  const csv = await res.text();
  const { data } = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  });
  // +2: rij 1 is de kop, en mensen tellen vanaf 1 — zo verwijst het rijnummer in een
  // afwijkingsmelding naar de regel die je in de sheet ziet staan.
  return data.map((waarden, i) => ({ rijnummer: i + 2, waarden }));
}
