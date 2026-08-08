import Papa from "papaparse";
import type { Product } from "./types";

/** Ruwe CSV-rij: alles komt als string binnen, ook de getallen. */
type CsvRow = Record<string, string>;

function parseNumber(value: string | undefined): number | null {
  if (!value || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** pros/cons staan in de CSV als "a|b|c"; lege segmenten vallen weg. */
function parsePipeList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * De specs-kolom is een JSON-string. Valt die om (handmatig bewerkte feed, half
 * ontsnapte quotes), dan mag dat één product niet de hele import laten mislukken —
 * we loggen en gaan verder met lege specs.
 */
function parseSpecs(value: string | undefined, id: string): Record<string, string> {
  if (!value || value.trim() === "") return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>).map(([key, val]) => [key, String(val)]),
      );
    }
  } catch {
    console.warn(`[csv] specs van ${id} is geen geldige JSON — overgeslagen`);
  }
  return {};
}

export function parseProductsCsv(csv: string): Product[] {
  const { data, errors } = Papa.parse<CsvRow>(csv, {
    header: true,
    skipEmptyLines: true,
  });

  if (errors.length > 0) {
    console.warn(`[csv] ${errors.length} parse-waarschuwing(en), eerste: ${errors[0]?.message}`);
  }

  return data
    .filter((row) => row.id && row.title)
    .map((row) => ({
      id: row.id,
      title: row.title,
      brand: row.brand ?? "",
      category: row.category ?? "",
      price: parseNumber(row.price) ?? 0,
      old_price: parseNumber(row.old_price),
      rating: parseNumber(row.rating),
      review_count: parseNumber(row.review_count) ?? 0,
      image_url: row.image_url || null,
      affiliate_url: row.affiliate_url ?? "",
      description: row.description || null,
      specs: parseSpecs(row.specs, row.id),
      pros: parsePipeList(row.pros),
      cons: parsePipeList(row.cons),
    }));
}
