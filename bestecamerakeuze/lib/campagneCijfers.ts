import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Handmatig campagnecijfer (0-10) — zie supabase/migrations/0018_campagne_cijfers.sql.
 * Gekoppeld op de campagnenaam uit de Google Sheet, niet op een database-id: de
 * campagnes zelf leven niet in deze database. Eén rij per campagne (een huidige stand,
 * geen geschiedenis zoals bij de aantekeningen).
 */
export interface CampagneCijfer {
  campagneNaam: string;
  cijfer: number;
  aangepastDoor: string;
  aangepastOp: string;
}

const SCHEMA = "dataloket";
const TABEL = "campagne_cijfers";
const KOLOMMEN = "campagne_naam, cijfer, aangepast_door, aangepast_op";

function naarItem(r: Record<string, unknown>): CampagneCijfer {
  return {
    campagneNaam: r.campagne_naam as string,
    cijfer: Number(r.cijfer),
    aangepastDoor: r.aangepast_door as string,
    aangepastOp: r.aangepast_op as string,
  };
}

/** Alle campagnecijfers in één keer, voor de campagnetabel. */
export async function lijstCijfers(supabase: SupabaseClient): Promise<CampagneCijfer[]> {
  const { data, error } = await supabase.schema(SCHEMA).from(TABEL).select(KOLOMMEN);
  if (error) throw new Error(error.message);
  return (data ?? []).map(naarItem);
}

export async function zetCijfer(
  supabase: SupabaseClient,
  gebruikerId: string,
  campagneNaam: string,
  cijfer: number,
): Promise<CampagneCijfer> {
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(TABEL)
    .upsert(
      {
        campagne_naam: campagneNaam,
        cijfer,
        aangepast_door: gebruikerId,
        aangepast_op: new Date().toISOString(),
      },
      { onConflict: "campagne_naam" },
    )
    .select(KOLOMMEN)
    .single();
  if (error) throw new Error(error.message);
  return naarItem(data);
}

export async function verwijderCijfer(supabase: SupabaseClient, campagneNaam: string): Promise<void> {
  const { error } = await supabase.schema(SCHEMA).from(TABEL).delete().eq("campagne_naam", campagneNaam);
  if (error) throw new Error(error.message);
}
