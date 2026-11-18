import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { groeiSleutel, isGeldigeGroei, type KpiTabblad } from "@/lib/kpi2027/groeiInvoer";

/**
 * Het met de hand aangepaste groeipercentage per KPI — zie
 * supabase/migrations/0036_kpi_2027_groei.sql. Alleen afwijkingen van de standaard
 * (`KPI_GROEI`, +5%) staan in de tabel; geen rij betekent de standaard.
 */

const SCHEMA = "dataloket";
const TABEL = "kpi_2027_groei";

/** Alle aangepaste percentages van één tabblad, op `groeiSleutel(website, kpi)`. */
export async function leesGroei(supabase: SupabaseClient, tabblad: KpiTabblad): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(TABEL)
    .select("website, kpi, groei")
    .eq("tabblad", tabblad);
  if (error) throw new Error(error.message);
  const uit = new Map<string, number>();
  for (const r of data ?? []) {
    const groei = Number(r.groei);
    if (isGeldigeGroei(groei)) uit.set(groeiSleutel(String(r.website ?? ""), String(r.kpi)), groei);
  }
  return uit;
}

export async function zetGroei(
  supabase: SupabaseClient,
  gebruikerId: string,
  rij: { tabblad: KpiTabblad; website: string; kpi: string; groei: number },
): Promise<void> {
  const { error } = await supabase.schema(SCHEMA).from(TABEL).upsert(
    {
      tabblad: rij.tabblad,
      website: rij.website,
      kpi: rij.kpi,
      groei: rij.groei,
      aangepast_door: gebruikerId,
      aangepast_op: new Date().toISOString(),
    },
    { onConflict: "tabblad,website,kpi" },
  );
  if (error) throw new Error(error.message);
}

/** Terug naar de standaard: de rij weg. */
export async function verwijderGroei(
  supabase: SupabaseClient,
  rij: { tabblad: KpiTabblad; website: string; kpi: string },
): Promise<void> {
  const { error } = await supabase
    .schema(SCHEMA)
    .from(TABEL)
    .delete()
    .eq("tabblad", rij.tabblad)
    .eq("website", rij.website)
    .eq("kpi", rij.kpi);
  if (error) throw new Error(error.message);
}

/**
 * Leest de percentages, maar laat het tabblad nooit stuk gaan op deze tabel: lukt het niet
 * (migratie nog niet gedraaid, Supabase niet bereikbaar), dan rekent alles met +5%.
 */
export async function leesGroeiVeilig(tabblad: KpiTabblad): Promise<Map<string, number>> {
  try {
    return await leesGroei(await createClient(), tabblad);
  } catch {
    return new Map();
  }
}
