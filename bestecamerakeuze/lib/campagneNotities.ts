import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Aantekeningen/learnings per campagne — zie supabase/migrations/0005_campagne_notities.sql.
 * Gekoppeld op de campagnenaam uit de Google Sheet, niet op een database-id: de
 * campagnes zelf leven niet in deze database.
 */
export interface CampagneNotitie {
  id: string;
  campagneNaam: string;
  tekst: string;
  bijgewerktOp: string;
}

const SCHEMA = "dataloket";
const TABEL = "campagne_notities";
const KOLOMMEN = "id, campagne_naam, tekst, bijgewerkt_op";

function naarItem(r: Record<string, unknown>): CampagneNotitie {
  return {
    id: r.id as string,
    campagneNaam: r.campagne_naam as string,
    tekst: r.tekst as string,
    bijgewerktOp: r.bijgewerkt_op as string,
  };
}

export async function lijstNotities(
  supabase: SupabaseClient,
  campagneNaam: string,
): Promise<CampagneNotitie[]> {
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(TABEL)
    .select(KOLOMMEN)
    .eq("campagne_naam", campagneNaam)
    .order("aangemaakt_op", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(naarItem);
}

export async function maakNotitie(
  supabase: SupabaseClient,
  gebruikerId: string,
  campagneNaam: string,
  tekst: string,
): Promise<CampagneNotitie> {
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(TABEL)
    .insert({
      campagne_naam: campagneNaam,
      tekst,
      aangemaakt_door: gebruikerId,
      bijgewerkt_door: gebruikerId,
    })
    .select(KOLOMMEN)
    .single();
  if (error) throw new Error(error.message);
  return naarItem(data);
}

export async function wijzigNotitie(
  supabase: SupabaseClient,
  gebruikerId: string,
  id: string,
  tekst: string,
): Promise<void> {
  const { error } = await supabase
    .schema(SCHEMA)
    .from(TABEL)
    .update({ tekst, bijgewerkt_door: gebruikerId })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function verwijderNotitie(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.schema(SCHEMA).from(TABEL).delete().eq("id", id);
  if (error) throw new Error(error.message);
}
