import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { parseProductsCsv } from "./csv";
import type { Product } from "./types";

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

function supabase() {
  return createClient(supabaseUrl!, supabaseKey!, {
    db: { schema: "camerakeuze" },
    auth: { persistSession: false },
  });
}

let csvCache: Product[] | null = null;

async function readCsvProducts(): Promise<Product[]> {
  if (csvCache) return csvCache;
  const file = path.join(process.cwd(), "data", "demo_cameras.csv");
  csvCache = parseProductsCsv(await readFile(file, "utf8"));
  return csvCache;
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

  return data as Product[];
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
