import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { parseProductsCsv } from "./csv";
import type { Product, Stabilisation } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * De site draait bewust ook zonder Supabase-configuratie: dan lezen we data/demo_cameras.csv
 * rechtstreeks. Zo werkt `npm run dev` direct na het clonen, en is de CSV meteen de bron van
 * waarheid voor de demo. Zodra de env-variabelen staan, wint Supabase.
 */
function hasSupabase(): boolean {
  return Boolean(supabaseUrl && supabaseKey);
}

/**
 * Houdbaarheid van de productdata in Next's Data Cache, in seconden. Gelijk aan de
 * `revalidate` van /vlogcameras, zodat er één getal is dat bepaalt hoe oud prijzen en
 * voorraad mogen worden.
 */
export const PRODUCT_CACHE_SECONDS = 3600;

function supabase() {
  return createClient(supabaseUrl!, supabaseKey!, {
    db: { schema: "camerakeuze" },
    auth: { persistSession: false },
    global: {
      // Next cachet fetch-antwoorden in de Data Cache. Zonder houdbaarheidsdatum blijft
      // zo'n antwoord over builds en deploys heen staan: na de migratie die de
      // vlog-kolommen toevoegde kreeg de build nog het antwoord van dáárvoor terug, met
      // de oude kolommen erin. Met een expliciete TTL loopt die cache gelijk met de
      // `revalidate` van de pagina's die hem gebruiken, in plaats van eronder zijn eigen
      // leven te leiden. (`no-store` zou hier niet werken: dat maakt elke pagina die deze
      // functie aanroept dynamisch, en dan verdwijnt het statisch renderen.)
      fetch: (input, init) =>
        fetch(input, { ...init, next: { revalidate: PRODUCT_CACHE_SECONDS } }),
    },
  });
}

let csvCache: Product[] | null = null;

async function readCsvProducts(): Promise<Product[]> {
  if (csvCache) return csvCache;
  const file = path.join(process.cwd(), "data", "demo_cameras.csv");
  csvCache = parseProductsCsv(await readFile(file, "utf8"));
  return csvCache;
}

const STABILISATION_VALUES: Stabilisation[] = ["geen", "digitaal", "optisch", "gimbal"];

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

/**
 * Zet een rij uit Supabase om naar een Product met alle velden aanwezig.
 *
 * Dit is bewust geen `as Product[]`. Een ontbrekend veld is geen theoretisch geval: tussen
 * het uitrollen van code die een nieuwe kolom gebruikt en de migratie die hem aanmaakt zit
 * altijd een venster, en een cache eronder kan dat venster oprekken. Zonder deze laag
 * betekent zo'n venster een lege pagina; met deze laag betekent het "—" in één kolom.
 */
function toProduct(row: Record<string, unknown>): Product {
  const stabilisation = asString(row.stabilisation);
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    brand: String(row.brand ?? ""),
    category: String(row.category ?? ""),
    price: asNumber(row.price),
    old_price: asNumber(row.old_price),
    rating: asNumber(row.rating),
    review_count: asNumber(row.review_count) ?? 0,
    image_url: asString(row.image_url),
    affiliate_url: String(row.affiliate_url ?? ""),
    description: asString(row.description),
    specs:
      row.specs && typeof row.specs === "object" && !Array.isArray(row.specs)
        ? Object.fromEntries(
            Object.entries(row.specs as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
          )
        : {},
    pros: asStringArray(row.pros),
    cons: asStringArray(row.cons),

    flip_screen: asBoolean(row.flip_screen),
    screen_type: asString(row.screen_type),
    stabilisation:
      stabilisation && STABILISATION_VALUES.includes(stabilisation as Stabilisation)
        ? (stabilisation as Stabilisation)
        : null,
    mic_input: asBoolean(row.mic_input),
    headphone_out: asBoolean(row.headphone_out),
    max_clip_minutes: asNumber(row.max_clip_minutes),
    unlimited_recording: asBoolean(row.unlimited_recording),
    overheating_reported: asBoolean(row.overheating_reported),
    weight_g: asNumber(row.weight_g),
    autofocus_type: asString(row.autofocus_type),
    log_profiles: asStringArray(row.log_profiles),
    battery_video_minutes: asNumber(row.battery_video_minutes),
  };
}

export async function getProducts(): Promise<Product[]> {
  if (!hasSupabase()) return readCsvProducts();

  const { data, error } = await supabase()
    .from("products")
    .select("*")
    .order("rating", { ascending: false, nullsFirst: false });

  // Een lege tabel (schema aangemaakt, import nog niet gedraaid) is geen fout maar levert
  // wel een lege site op — dan is de CSV een bruikbaarder resultaat dan niets.
  if (error) {
    console.error(`[products] Supabase-query mislukt, terugval op CSV: ${error.message}`);
    return readCsvProducts();
  }
  if (!data || data.length === 0) return readCsvProducts();

  return data.map((row) => toProduct(row as Record<string, unknown>));
}

export async function getProduct(id: string): Promise<Product | null> {
  const products = await getProducts();
  return products.find((product) => product.id === id) ?? null;
}

/** Unieke merken en categorieën voor de filterbalk, alfabetisch. */
export async function getFacets(): Promise<{ brands: string[]; categories: string[] }> {
  const products = await getProducts();
  return {
    brands: [...new Set(products.map((p) => p.brand))].filter(Boolean).sort(),
    categories: [...new Set(products.map((p) => p.category))].filter(Boolean).sort(),
  };
}
