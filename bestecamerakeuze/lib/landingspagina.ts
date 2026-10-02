import type { SupabaseClient } from "@supabase/supabase-js";
import type { BlokOordeel, InfoStatus, Verkeersbron } from "./landingspaginaCriteria";

/**
 * Landingspagina-audits — zie supabase/migrations/0028_landingspagina_analyses.sql en
 * app/api/landingspagina/route.ts. Het rapport is het gestructureerde antwoord van
 * het model (RAPPORT_SCHEMA hieronder) en wordt ongewijzigd als jsonb bewaard.
 */

export interface Criterium {
  nummer: number;
  naam: string;
  score: number;
  /** Hoe zwaar dit criterium bij deze campagne weegt, in procenten (samen 100). Door het model gekozen. */
  gewicht?: number;
  /** Eén of twee zinnen: waarom dit cijfer en wat er beter kan. */
  beoordeling: string;
  /** Alleen bij oudere rapporten (zeven criteria met scorematrix). */
  potentie?: number;
  /** Alleen bij de oudste rapporten (tien criteria, uitgebreide onderbouwing). */
  korte_beoordeling?: string;
  wat_goed_gaat?: string;
  wat_beter_kan?: string;
  concreet_advies?: string;
}

/** Eén onderdeel dat de bezoeker nodig heeft om de actie te nemen. */
export interface InfoPunt {
  onderdeel: string;
  status: InfoStatus;
  toelichting: string;
}

/** Eén contentblok op de pagina en of het bijdraagt aan het doel. */
export interface Blok {
  blok: string;
  oordeel: BlokOordeel;
  reden: string;
}

export interface Rapport {
  url: string;
  /** Korte eigen omschrijving van het model, bijv. het soort campagne. */
  campagnetype?: string;
  /** Door de marketeer opgegeven (door de route gezet). */
  verkeersbron?: Verkeersbron;
  primaire_conversie: string;
  /** Wie de bezoeker is, wat die al weet en waarmee die komt. */
  bezoeker?: string;
  verwachte_informatie?: InfoPunt[];
  /** Waarom de criteria bij deze campagne zo zwaar wegen. */
  weging_toelichting?: string;
  blokken?: Blok[];
  criteria: Criterium[];
  /** Het eindoordeel van het model, met de weging als leidraad (geen rekensom). */
  eindcijfer: number;
  eindcijfer_toelichting: string;
  top_verbeterpunten: Verbeterpunt[];
  /** Kort verhaal (enkele zinnen) met de conclusie. */
  conclusie: string;
  /** Doel en doelgroep zoals de marketeer ze beschreef (door de route gezet, niet door het model). */
  campagnecontext?: string | null;
  /** Of er bij deze analyse een screenshot is meegestuurd (door de route gezet). */
  met_screenshot?: boolean;
  /** Alleen bij oudere rapporten. */
  type_pagina?: string;
  samenvatting?: Record<string, string>;
}

export type Niveau = "hoog" | "middel" | "laag";

export interface Verbeterpunt {
  titel: string;
  toelichting: string;
  /** Hoe dringend het is om dit op te pakken. Ontbreekt bij oudere rapporten. */
  urgentie?: Niveau;
  /** Verwachte impact op conversie. Ontbreekt bij de oudste rapporten. */
  impact?: Niveau;
  /** Alleen bij oudere rapporten (inspanning in het CMS). */
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
  /** Cijfer per criterium, voor de kolommen in de lijst. Ontbreekt na een POST (dan is het hele rapport er). */
  criteria?: { naam: string; score: number }[];
}

export interface Analyse extends AnalyseItem {
  rapport: Rapport;
  /** Ontwerpvoorstel bij dit rapport; null als er (nog) geen is of als het bij een vorig rapport hoort. */
  ontwerp?: Ontwerp | null;
}

export type WijzigingSoort = "aangepast" | "nieuw" | "verwijderd" | "verplaatst";

/** Eén wijziging die het ontwerpvoorstel doorvoert, met het verbeterpunt waar hij uit komt. */
export interface Wijziging {
  blok: string;
  soort: WijzigingSoort;
  /** Wat er verandert, met de nieuwe tekst letterlijk waar dat kan. */
  wat: string;
  /** Nummer van het verbeterpunt in het rapport (1-based), 0 als het nergens direct uit volgt. */
  verbeterpunt: number;
}

/** Ontwerpvoorstel: de pagina opnieuw getekend met de belangrijkste verbeterpunten verwerkt. */
export interface Ontwerp {
  /** De verbeterde pagina als data-URL (webp). */
  afbeelding: string;
  /** Twee of drie zinnen: wat er in dit voorstel anders is. */
  samenvatting: string;
  wijzigingen: Wijziging[];
  gemaaktOp: string;
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
  campagnetype: tekst,
  primaire_conversie: tekst,
  bezoeker: tekst,
  verwachte_informatie: {
    type: "array",
    items: object({
      onderdeel: tekst,
      status: { type: "string", enum: ["duidelijk", "onduidelijk", "ontbreekt"] },
      toelichting: tekst,
    }),
  },
  weging_toelichting: tekst,
  blokken: {
    type: "array",
    items: object({
      blok: tekst,
      oordeel: { type: "string", enum: ["kern", "aanpassen", "overbodig"] },
      reden: tekst,
    }),
  },
  criteria: {
    type: "array",
    items: object({
      nummer: { type: "integer" },
      naam: tekst,
      gewicht: { type: "integer" },
      score: { type: "integer" },
      beoordeling: tekst,
    }),
  },
  eindcijfer: { type: "number" },
  eindcijfer_toelichting: tekst,
  top_verbeterpunten: {
    type: "array",
    items: object({
      titel: tekst,
      toelichting: tekst,
      urgentie: { type: "string", enum: ["hoog", "middel", "laag"] },
      impact: { type: "string", enum: ["hoog", "middel", "laag"] },
    }),
  },
  conclusie: tekst,
});

/**
 * JSON-schema voor de ontwerpbrief (app/api/landingspagina/ontwerp): wat er verandert, voor
 * de marketeer, en de opdracht voor het beeldmodel (Engels, met de Nederlandse teksten letterlijk).
 */
export const ONTWERP_SCHEMA = object({
  samenvatting: tekst,
  wijzigingen: {
    type: "array",
    items: object({
      blok: tekst,
      soort: { type: "string", enum: ["aangepast", "nieuw", "verwijderd", "verplaatst"] },
      wat: tekst,
      verbeterpunt: { type: "integer" },
    }),
  },
  beeldopdracht: tekst,
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
  const criteria = Array.isArray(r.criteria)
    ? (r.criteria as { naam?: unknown; score?: unknown }[]).map((c) => ({
        naam: String(c.naam ?? ""),
        score: Number(c.score),
      }))
    : undefined;
  return {
    ...(criteria ? { criteria } : {}),
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
    // Alleen de criteria uit het rapport, niet het hele jsonb: de lijst toont per pagina de cijfers.
    .select(`${KOLOMMEN}, criteria:rapport->criteria`)
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
  const item = naarItem(data);
  // Een mislukt ontwerp (bv. migratie 0030 nog niet gedraaid) mag het rapport niet blokkeren.
  const ontwerp = await haalOntwerp(supabase, item.id, item.geanalyseerdOp).catch(() => null);
  return { ...item, rapport: data.rapport as Rapport, ontwerp };
}

const ONTWERPEN = "landingspagina_ontwerpen";

/**
 * Het ontwerp bij een analyse, of null. Een ontwerp van vóór de laatste analyse hoort bij
 * het vorige rapport (opnieuw analyseren houdt dezelfde id) en tonen we niet.
 */
export async function haalOntwerp(
  supabase: SupabaseClient,
  analyseId: string,
  geanalyseerdOp: string,
): Promise<Ontwerp | null> {
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(ONTWERPEN)
    .select("afbeelding, ontwerp, gemaakt_op")
    .eq("analyse_id", analyseId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || new Date(data.gemaakt_op) < new Date(geanalyseerdOp)) return null;
  const ontwerp = data.ontwerp as Pick<Ontwerp, "samenvatting" | "wijzigingen">;
  return {
    afbeelding: data.afbeelding as string,
    samenvatting: ontwerp.samenvatting ?? "",
    wijzigingen: ontwerp.wijzigingen ?? [],
    gemaaktOp: data.gemaakt_op as string,
  };
}

/** Upsert op analyse: een nieuw ontwerp vervangt het vorige. */
export async function bewaarOntwerp(
  supabase: SupabaseClient,
  analyseId: string,
  ontwerp: Omit<Ontwerp, "gemaaktOp">,
  { model, gebruikerId }: { model: string; gebruikerId: string },
): Promise<Ontwerp> {
  const gemaaktOp = new Date().toISOString();
  const { error } = await supabase
    .schema(SCHEMA)
    .from(ONTWERPEN)
    .upsert(
      {
        analyse_id: analyseId,
        afbeelding: ontwerp.afbeelding,
        ontwerp: { samenvatting: ontwerp.samenvatting, wijzigingen: ontwerp.wijzigingen },
        model,
        gemaakt_door: gebruikerId,
        gemaakt_op: gemaaktOp,
      },
      { onConflict: "analyse_id" },
    );
  if (error) throw new Error(error.message);
  return { ...ontwerp, gemaaktOp };
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
