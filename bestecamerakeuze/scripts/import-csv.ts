/**
 * Laadt data/demo_cameras.csv in camerakeuze.products.
 *
 *   npm run import-csv
 *
 * Vereist NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY in .env.local. De
 * service_role key is nodig omdat RLS op products alleen SELECT toestaat — schrijven
 * hoort uitsluitend via deze import te lopen, niet via de site.
 *
 * Draait als upsert op `id`, dus meermaals uitvoeren is veilig en werkt gewijzigde
 * prijzen bij zonder duplicaten.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import { parseProductsCsv } from "../lib/csv.ts";

const CSV_PATH = path.join(process.cwd(), "data", "demo_cameras.csv");
const BATCH_SIZE = 100;

async function loadEnv(): Promise<void> {
  // Geen dotenv-dependency: .env.local is een simpel KEY=value-bestand en Next leest het
  // zelf al: dit script draait er alleen buitenom.
  try {
    const raw = await readFile(path.join(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (!match) continue;
      const [, key, value] = match;
      process.env[key] ??= value.replace(/^["']|["']$/g, "");
    }
  } catch {
    // Geen .env.local — dan moeten de variabelen al in de omgeving staan.
  }
}

async function main(): Promise<void> {
  await loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error(
      "Ontbrekende configuratie. Zet NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY\n" +
        "in .env.local (zie .env.local.example). De service_role key vind je in het Supabase-\n" +
        "dashboard onder Project Settings > API.",
    );
    process.exit(1);
  }

  const products = parseProductsCsv(await readFile(CSV_PATH, "utf8"));
  if (products.length === 0) {
    console.error(`Geen producten gevonden in ${CSV_PATH}.`);
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    db: { schema: "camerakeuze" },
    auth: { persistSession: false },
  });

  console.log(`${products.length} producten gelezen uit ${path.basename(CSV_PATH)}.`);

  let imported = 0;
  for (let offset = 0; offset < products.length; offset += BATCH_SIZE) {
    const batch = products.slice(offset, offset + BATCH_SIZE);
    const { error } = await supabase.from("products").upsert(batch, { onConflict: "id" });

    if (error) {
      console.error(`Import mislukt bij rij ${offset + 1}: ${error.message}`);
      process.exit(1);
    }
    imported += batch.length;
    console.log(`  ${imported}/${products.length} verwerkt`);
  }

  console.log(`Klaar: ${imported} producten staan in camerakeuze.products.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
