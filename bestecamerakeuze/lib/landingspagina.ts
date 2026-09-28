import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Landingspagina-audits — zie supabase/migrations/0028_landingspagina_analyses.sql en
 * app/api/landingspagina/route.ts. Het rapport is het gestructureerde antwoord van
 * Claude (RAPPORT_SCHEMA hieronder) en wordt ongewijzigd als jsonb bewaard.
 */

export interface Criterium {
  nummer: number;
  naam: string;
  score: number;
  korte_beoordeling: string;
  beoordeling: string;
  wat_goed_gaat: string;
  wat_beter_kan: string;
  concreet_advies: string;
}

export interface Rapport {
  url: string;
  type_pagina: string;
  primaire_conversie: string;
  samenvatting: {
    wat_gaat_goed: string;
    wat_gaat_minder_goed: string;
    grootste_conversierisico: string;
    belangrijkste_kans: string;
    eerst_aanpakken: string;
  };
  criteria: Criterium[];
  eindcijfer: number;
  eindcijfer_toelichting: string;
  top_verbeterpunten: Verbeterpunt[];
  conclusie: string;
  /** Campagnebelofte/advertentietekst die bij de analyse is meegegeven (door de route gezet, niet door Claude). */
  campagnecontext?: string | null;
  /** Of er bij deze analyse een screenshot is meegestuurd (door de route gezet). */
  met_screenshot?: boolean;
}

export type Niveau = "hoog" | "middel" | "laag";

export interface Verbeterpunt {
  titel: string;
  toelichting: string;
  /** Ontbreken bij rapporten van vóór de invoering ervan. */
  impact?: Niveau;
  inspanning?: Niveau;
}

export interface AnalyseItem {
  id: string;
  url: string;
  eindcijfer: number | null;
  geanalyseerdOp: string;
  eerstGeanalyseerdOp: string;
  geanalyseerdDoor: string;
  geanalyseerdDoorNaam: string | null;
}

export interface Analyse extends AnalyseItem {
  rapport: Rapport;
}

const tekst = { type: "string" } as const;

function object(properties: Record<string, unknown>) {
  return {
    type: "object",
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

/** JSON-schema voor structured outputs; de veldnamen volgen de rapportstructuur uit de prompt. */
export const RAPPORT_SCHEMA = object({
  url: tekst,
  type_pagina: tekst,
  primaire_conversie: tekst,
  samenvatting: object({
    wat_gaat_goed: tekst,
    wat_gaat_minder_goed: tekst,
    grootste_conversierisico: tekst,
    belangrijkste_kans: tekst,
    eerst_aanpakken: tekst,
  }),
  criteria: {
    type: "array",
    items: object({
      nummer: { type: "integer" },
      naam: tekst,
      score: { type: "integer" },
      korte_beoordeling: tekst,
      beoordeling: tekst,
      wat_goed_gaat: tekst,
      wat_beter_kan: tekst,
      concreet_advies: tekst,
    }),
  },
  eindcijfer: { type: "number" },
  eindcijfer_toelichting: tekst,
  top_verbeterpunten: {
    type: "array",
    items: object({
      titel: tekst,
      toelichting: tekst,
      impact: { type: "string", enum: ["hoog", "middel", "laag"] },
      inspanning: { type: "string", enum: ["laag", "middel", "hoog"] },
    }),
  },
  conclusie: tekst,
});

/** Parameters die alleen iets zeggen over de bron van het bezoek, niet over de pagina. */
const TRACKING = /^(utm_.*|gclid|gbraid|wbraid|fbclid|msclkid|dclid|li_fat_id|mc_cid|mc_eid|_ga|_gl)$/i;

/**
 * Eén vaste schrijfwijze per pagina, zodat dezelfde pagina nooit twee keer in de lijst
 * staat: kleine letters in de host, geen #-anker, geen trackingparameters en geen slash
 * aan het eind.
 */
export function normaliseerUrl(adres: URL): string {
  const url = new URL(adres.href);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  for (const sleutel of [...url.searchParams.keys()]) {
    if (TRACKING.test(sleutel)) url.searchParams.delete(sleutel);
  }
  url.searchParams.sort();
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
  return url.href;
}

const SCHEMA = "dataloket";
const TABEL = "landingspagina_analyses";
const KOLOMMEN = "id, url, eindcijfer, geanalyseerd_op, eerst_geanalyseerd_op, geanalyseerd_door";

function naarItem(r: Record<string, unknown>): Omit<AnalyseItem, "geanalyseerdDoorNaam"> {
  return {
    id: r.id as string,
    url: r.url as string,
    // numeric komt als string terug uit PostgREST.
    eindcijfer: r.eindcijfer === null || r.eindcijfer === undefined ? null : Number(r.eindcijfer),
    geanalyseerdOp: r.geanalyseerd_op as string,
    eerstGeanalyseerdOp: r.eerst_geanalyseerd_op as string,
    geanalyseerdDoor: r.geanalyseerd_door as string,
  };
}

export async function lijstAnalyses(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(TABEL)
    .select(KOLOMMEN)
    .order("geanalyseerd_op", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []).map(naarItem);
}

export async function haalAnalyse(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(TABEL)
    .select(`${KOLOMMEN}, rapport`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { ...naarItem(data), rapport: data.rapport as Rapport };
}

/** Upsert op url: een nieuwe analyse van dezelfde pagina vervangt het oude rapport. */
export async function bewaarAnalyse(
  supabase: SupabaseClient,
  analyse: { url: string; rapport: Rapport; model: string; gebruikerId: string },
) {
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(TABEL)
    .upsert(
      {
        url: analyse.url,
        eindcijfer: analyse.rapport.eindcijfer,
        rapport: analyse.rapport,
        model: analyse.model,
        geanalyseerd_door: analyse.gebruikerId,
        geanalyseerd_op: new Date().toISOString(),
      },
      { onConflict: "url" },
    )
    .select(KOLOMMEN)
    .single();
  if (error) throw new Error(error.message);
  return naarItem(data);
}

export async function verwijderAnalyse(supabase: SupabaseClient, id: string): Promise<boolean> {
  const { data, error } = await supabase.schema(SCHEMA).from(TABEL).delete().eq("id", id).select("id");
  if (error) throw new Error(error.message);
  // RLS laat een niet-toegestane delete stil niets doen; dan is er ook geen rij terug.
  return (data ?? []).length > 0;
}
