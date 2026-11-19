import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isKanaalSleutel, type KanaalSleutel } from "@/lib/kpi2027/kanalen";

/**
 * De handmatige kanaalkeuzes per bron/medium ("Kanaalgroepindeling" op KPI's 2027 GA,
 * migratie 0038). Alleen afwijkingen van de regels staan in de tabel; geen rij betekent
 * de regels in `kanalen.ts`. Via de Supabase-client, zodat de RLS en `aangepast_door`
 * gelden — net als het groeipercentage (`groei.ts`).
 */

const SCHEMA = "dataloket";
const TABEL = "kpi_2027_kanaal_keuzes";

export async function leesKanaalKeuzes(supabase: SupabaseClient, website: string): Promise<Map<string, KanaalSleutel>> {
  const { data, error } = await supabase.schema(SCHEMA).from(TABEL).select("bron_medium, kanaal").eq("website", website);
  if (error) throw new Error(error.message);
  const uit = new Map<string, KanaalSleutel>();
  for (const r of data ?? []) if (isKanaalSleutel(r.kanaal)) uit.set(String(r.bron_medium), r.kanaal);
  return uit;
}

/** Leest de keuzes, maar laat de grafiek nooit stuk gaan op deze tabel: dan gelden de regels. */
export async function leesKanaalKeuzesVeilig(website: string): Promise<Map<string, KanaalSleutel>> {
  try {
    return await leesKanaalKeuzes(await createClient(), website);
  } catch {
    return new Map();
  }
}

export async function zetKanaalKeuze(
  supabase: SupabaseClient,
  gebruikerId: string,
  rij: { website: string; bronMedium: string; kanaal: KanaalSleutel },
): Promise<void> {
  const { error } = await supabase.schema(SCHEMA).from(TABEL).upsert(
    {
      website: rij.website,
      bron_medium: rij.bronMedium,
      kanaal: rij.kanaal,
      aangepast_door: gebruikerId,
      aangepast_op: new Date().toISOString(),
    },
    { onConflict: "website,bron_medium" },
  );
  if (error) throw new Error(error.message);
}

/** Terug naar de regels: de rij weg. */
export async function verwijderKanaalKeuze(
  supabase: SupabaseClient,
  rij: { website: string; bronMedium: string },
): Promise<void> {
  const { error } = await supabase
    .schema(SCHEMA)
    .from(TABEL)
    .delete()
    .eq("website", rij.website)
    .eq("bron_medium", rij.bronMedium);
  if (error) throw new Error(error.message);
}
