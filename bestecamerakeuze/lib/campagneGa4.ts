import type { SupabaseClient } from "@supabase/supabase-js";
import { leesRegels, type Ga4Koppeling, type Regel } from "@/lib/ga4Koppeling";

/**
 * Opslag van de GA-koppeling en het GA-doel per campagne — zie
 * `supabase/migrations/0031_ga4_campagne_conversies.sql`. Zelfde opzet als
 * `lib/campagneCijfers.ts`: gekoppeld op de campagnenaam uit de sheet, één rij per
 * campagne, gedeeld en niet per gebruiker.
 */

const SCHEMA = "dataloket";
const TABEL = "campagne_ga4_doelen";
const KOLOMMEN = "campagne_naam, doel_conversies, regels, bijgewerkt_op";

function naarItem(r: Record<string, unknown>): Ga4Koppeling {
  return {
    campagneNaam: r.campagne_naam as string,
    doelConversies: r.doel_conversies === null || r.doel_conversies === undefined ? null : Number(r.doel_conversies),
    regels: leesRegels(r.regels),
    bijgewerktOp: (r.bijgewerkt_op as string) ?? null,
  };
}

export async function lijstGa4Koppelingen(supabase: SupabaseClient): Promise<Ga4Koppeling[]> {
  const { data, error } = await supabase.schema(SCHEMA).from(TABEL).select(KOLOMMEN);
  if (error) throw new Error(error.message);
  return (data ?? []).map(naarItem);
}

/**
 * Zet het doel, de regels of allebei. Wat niet wordt meegegeven blijft staan: het doel
 * wordt in de campagnetabel ingevuld en de regels op Campagnebeheer, en de ene
 * schrijfactie mag de andere niet leeggooien. Daarom eerst lezen en dan samenvoegen in
 * plaats van een kale upsert.
 */
export async function zetGa4Koppeling(
  supabase: SupabaseClient,
  gebruikerId: string,
  campagneNaam: string,
  wijziging: { doelConversies?: number | null; regels?: Regel[] },
): Promise<Ga4Koppeling> {
  const { data: bestaand, error: leesFout } = await supabase
    .schema(SCHEMA)
    .from(TABEL)
    .select(KOLOMMEN)
    .eq("campagne_naam", campagneNaam)
    .maybeSingle();
  if (leesFout) throw new Error(leesFout.message);

  const huidig = bestaand ? naarItem(bestaand) : null;
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(TABEL)
    .upsert(
      {
        campagne_naam: campagneNaam,
        doel_conversies:
          wijziging.doelConversies !== undefined ? wijziging.doelConversies : (huidig?.doelConversies ?? null),
        regels: wijziging.regels ?? huidig?.regels ?? [],
        bijgewerkt_door: gebruikerId,
        bijgewerkt_op: new Date().toISOString(),
      },
      { onConflict: "campagne_naam" },
    )
    .select(KOLOMMEN)
    .single();
  if (error) throw new Error(error.message);
  return naarItem(data);
}
