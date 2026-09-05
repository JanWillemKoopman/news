import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Toegang tot gesprekken en berichten.
 *
 * Alle functies draaien op de client van de ingelogde gebruiker, dus de
 * rijbeveiliging in de database bepaalt wat zichtbaar is. Er staat hier bewust
 * nergens een filter op gebruiker_id: dat zou suggereren dat de afscherming in deze
 * code zit, terwijl hij in de database hoort.
 */

export interface Gesprek {
  id: string;
  titel: string;
  bijgewerktOp: string;
}

export interface OpgeslagenBericht {
  id: number;
  rol: "gebruiker" | "assistent";
  tekst: string;
  queries: unknown[];
  oordeel: "goed" | "fout" | null;
}

const SCHEMA = "dataloket";

export async function lijstGesprekken(
  supabase: SupabaseClient,
  zoek?: string,
): Promise<Gesprek[]> {
  let query = supabase
    .schema(SCHEMA)
    .from("gesprekken")
    .select("id, titel, bijgewerkt_op")
    .eq("gearchiveerd", false)
    .order("bijgewerkt_op", { ascending: false })
    .limit(100);

  if (zoek && zoek.trim()) {
    query = query.ilike("titel", `%${zoek.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    titel: r.titel as string,
    bijgewerktOp: r.bijgewerkt_op as string,
  }));
}

export async function maakGesprek(
  supabase: SupabaseClient,
  gebruikerId: string,
  titel = "Nieuw gesprek",
): Promise<Gesprek> {
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("gesprekken")
    .insert({ gebruiker_id: gebruikerId, titel })
    .select("id, titel, bijgewerkt_op")
    .single();
  if (error) throw new Error(error.message);
  return {
    id: data.id as string,
    titel: data.titel as string,
    bijgewerktOp: data.bijgewerkt_op as string,
  };
}

export async function hernoemGesprek(
  supabase: SupabaseClient,
  gesprekId: string,
  titel: string,
): Promise<void> {
  const { error } = await supabase
    .schema(SCHEMA)
    .from("gesprekken")
    .update({ titel: titel.slice(0, 120) })
    .eq("id", gesprekId);
  if (error) throw new Error(error.message);
}

export async function verwijderGesprek(
  supabase: SupabaseClient,
  gesprekId: string,
): Promise<void> {
  const { error } = await supabase
    .schema(SCHEMA)
    .from("gesprekken")
    .delete()
    .eq("id", gesprekId);
  if (error) throw new Error(error.message);
}

export async function haalBerichten(
  supabase: SupabaseClient,
  gesprekId: string,
): Promise<OpgeslagenBericht[]> {
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("berichten")
    .select("id, rol, tekst, queries, feedback(oordeel)")
    .eq("gesprek_id", gesprekId)
    .order("id", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => {
    const feedback = r.feedback as { oordeel: string }[] | null;
    return {
      id: r.id as number,
      rol: r.rol as "gebruiker" | "assistent",
      tekst: r.tekst as string,
      queries: Array.isArray(r.queries) ? (r.queries as unknown[]) : [],
      oordeel: (feedback?.[0]?.oordeel as "goed" | "fout" | undefined) ?? null,
    };
  });
}

export async function bewaarBericht(
  supabase: SupabaseClient,
  gesprekId: string,
  rol: "gebruiker" | "assistent",
  tekst: string,
  queries: unknown[] = [],
): Promise<number | null> {
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("berichten")
    .insert({ gesprek_id: gesprekId, rol, tekst, queries })
    .select("id")
    .single();
  if (error) return null;
  return data.id as number;
}

/**
 * Verwijdert het laatste antwoord plus de vraag ervoor. Nodig bij "opnieuw proberen":
 * die vraag wordt daarna opnieuw gesteld, en anders zou hij dubbel in de
 * geschiedenis belanden.
 */
export async function verwijderLaatsteBeurt(
  supabase: SupabaseClient,
  gesprekId: string,
): Promise<void> {
  const { data } = await supabase
    .schema(SCHEMA)
    .from("berichten")
    .select("id")
    .eq("gesprek_id", gesprekId)
    .order("id", { ascending: false })
    .limit(2);
  const ids = (data ?? []).map((r) => r.id as number);
  if (ids.length === 0) return;
  await supabase.schema(SCHEMA).from("berichten").delete().in("id", ids);
}
