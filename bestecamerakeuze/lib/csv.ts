import Papa from "papaparse";
import type { Product, Stabilisation } from "./types";

/** Ruwe CSV-rij: alles komt als string binnen, ook de getallen. */
type CsvRow = Record<string, string>;

function parseNumber(value: string | undefined): number | null {
  if (!value || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Zoals parseNumber, maar voor kolommen die in de database integer zijn. */
function parseInteger(value: string | undefined): number | null {
  const parsed = parseNumber(value);
  return parsed === null ? null : Math.round(parsed);
}

/**
 * Een leeg vakje is geen `false` maar "niet geverifieerd" — het verschil tussen "deze
 * camera heeft geen microfooningang" en "wij weten het niet" is precies wat deze pagina
 * de bezoeker moet kunnen vertellen. Daarom null bij leeg, en null bij onzin.
 */
function parseBoolean(value: string | undefined, id: string, column: string): boolean | null {
  if (!value || value.trim() === "") return null;
  const normalised = value.trim().toLowerCase();
  if (["ja", "true", "1", "yes"].includes(normalised)) return true;
  if (["nee", "false", "0", "no"].includes(normalised)) return false;
  console.warn(`[csv] ${column} van ${id} is "${value}" — geen ja/nee, als onbekend gelezen`);
  return null;
}

const STABILISATION_VALUES: Stabilisation[] = ["geen", "digitaal", "optisch", "gimbal"];

/** Moet overeenkomen met de CHECK-constraint op de kolom, anders faalt de import pas in Supabase. */
function parseStabilisation(value: string | undefined, id: string): Stabilisation | null {
  if (!value || value.trim() === "") return null;
  const normalised = value.trim().toLowerCase() as Stabilisation;
  if (STABILISATION_VALUES.includes(normalised)) return normalised;
  console.warn(
    `[csv] stabilisation van ${id} is "${value}" — verwacht ${STABILISATION_VALUES.join("/")}`,
  );
  return null;
}

/** pros/cons/log_profiles staan in de CSV als "a|b|c"; lege segmenten vallen weg. */
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
      price: parseNumber(row.price),
      old_price: parseNumber(row.old_price),
      rating: parseNumber(row.rating),
      review_count: parseNumber(row.review_count) ?? 0,
      image_url: row.image_url || null,
      affiliate_url: row.affiliate_url ?? "",
      description: row.description || null,
      specs: parseSpecs(row.specs, row.id),
      pros: parsePipeList(row.pros),
      cons: parsePipeList(row.cons),

      flip_screen: parseBoolean(row.flip_screen, row.id, "flip_screen"),
      screen_type: row.screen_type || null,
      stabilisation: parseStabilisation(row.stabilisation, row.id),
      mic_input: parseBoolean(row.mic_input, row.id, "mic_input"),
      headphone_out: parseBoolean(row.headphone_out, row.id, "headphone_out"),
      max_clip_minutes: parseInteger(row.max_clip_minutes),
      unlimited_recording: parseBoolean(row.unlimited_recording, row.id, "unlimited_recording"),
      overheating_reported: parseBoolean(row.overheating_reported, row.id, "overheating_reported"),
      weight_g: parseInteger(row.weight_g),
      autofocus_type: row.autofocus_type || null,
      log_profiles: parsePipeList(row.log_profiles),
      battery_video_minutes: parseInteger(row.battery_video_minutes),
    }));
}
