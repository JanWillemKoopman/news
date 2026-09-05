import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Legt elke uitgevoerde query vast.
 *
 * Dit is niet bedoeld om collega's te controleren, maar om twee praktische vragen te
 * kunnen beantwoorden: "waar kwam dat rare cijfer vandaan?" en — belangrijker — "welke
 * vragen gingen mis?". Die laatste lijst is je backlog voor het woordenboek: elke
 * mislukte query wijst op kennis die er nog niet in staat.
 *
 * Loggen mag de chat nooit laten omvallen; fouten worden daarom bewust ingeslikt.
 *
 * De Supabase-client wordt meegegeven in plaats van hier aangemaakt: aanmaken vereist
 * `cookies()`, en dat is in Next 15 een request-scoped API. Deze functie draait vanuit
 * een streamende response, dus ná het moment waarop dat mag — de aanroeper maakt de
 * client daarom aan vóór de stream begint.
 */
export interface QueryLogRegel {
  gebruikerId: string;
  vraag: string;
  sql: string;
  toelichting: string;
  gelukt: boolean;
  fout: string | null;
  aantalRijen: number | null;
  duurMs: number | null;
}

export async function logQuery(
  supabase: SupabaseClient | null,
  regel: QueryLogRegel,
): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.schema("dataloket").from("query_log").insert({
      gebruiker_id: regel.gebruikerId,
      vraag: regel.vraag,
      sql: regel.sql,
      toelichting: regel.toelichting,
      gelukt: regel.gelukt,
      fout: regel.fout,
      aantal_rijen: regel.aantalRijen,
      duur_ms: regel.duurMs,
    });
  } catch {
    // Loggen is bijzaak — een chatantwoord mag er nooit op stuklopen.
  }
}
