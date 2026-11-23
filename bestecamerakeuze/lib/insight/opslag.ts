import type { SupabaseClient } from "@supabase/supabase-js";
import { normaliseerResultaat } from "./rekenen";
import { STANDAARD_HOOFDPROMPT } from "./standaardPrompt";
import type {
  InsightAnalyse,
  InsightCampagne,
  InsightCampagneInvoer,
  InsightKerncijfers,
  InsightOverzichtRegel,
  InsightPrompt,
  InsightVersie,
} from "./types";

/**
 * Campaign insight — lezen en schrijven in Supabase. Zie
 * supabase/migrations/0042_campagne_insight.sql. Analyses worden hier alleen gelezen:
 * schrijven doet Claude Code via de functie `insight_bewaar_analyse`.
 */

const SCHEMA = "dataloket";
const CAMPAGNES = "insight_campagnes";
const ANALYSES = "insight_analyses";
const PROMPTS = "insight_prompts";

const CAMPAGNE_KOLOMMEN =
  "id, naam, merk, model, startdatum, einddatum, doel, budget, omschrijving, zoektermen, campagnepaginas, analyse_gevraagd_op, aangemaakt_op, bijgewerkt_op";

function getalOfNull(x: unknown): number | null {
  if (x === null || x === undefined || x === "") return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function naarCampagne(r: Record<string, unknown>): InsightCampagne {
  return {
    id: r.id as string,
    naam: r.naam as string,
    merk: (r.merk as string | null) ?? null,
    model: (r.model as string | null) ?? null,
    startdatum: (r.startdatum as string | null) ?? null,
    einddatum: (r.einddatum as string | null) ?? null,
    doel: (r.doel as string | null) ?? null,
    // numeric komt als string terug uit PostgREST.
    budget: getalOfNull(r.budget),
    omschrijving: (r.omschrijving as string | null) ?? null,
    zoektermen: (r.zoektermen as string | null) ?? null,
    campagnepaginas: (r.campagnepaginas as string | null) ?? null,
    analyseGevraagdOp: (r.analyse_gevraagd_op as string | null) ?? null,
    aangemaaktOp: r.aangemaakt_op as string,
    bijgewerktOp: r.bijgewerkt_op as string,
  };
}

function naarKolommen(invoer: InsightCampagneInvoer) {
  return {
    naam: invoer.naam,
    merk: invoer.merk,
    model: invoer.model,
    startdatum: invoer.startdatum,
    einddatum: invoer.einddatum,
    doel: invoer.doel,
    budget: invoer.budget,
    omschrijving: invoer.omschrijving,
    zoektermen: invoer.zoektermen,
    campagnepaginas: invoer.campagnepaginas,
  };
}

/** Alle campagnes, met per campagne de laatste analyse (alleen de kerncijfers). */
export async function lijstOverzicht(supabase: SupabaseClient): Promise<InsightOverzichtRegel[]> {
  const [campagnes, analyses] = await Promise.all([
    supabase.schema(SCHEMA).from(CAMPAGNES).select(CAMPAGNE_KOLOMMEN).order("aangemaakt_op", { ascending: false }),
    // Niet het resultaat zelf: dat kan honderden kB per analyse zijn.
    supabase
      .schema(SCHEMA)
      .from(ANALYSES)
      .select("id, campagne_id, versie, geanalyseerd_op, samenvatting, kerncijfers")
      .order("versie", { ascending: false }),
  ]);
  if (campagnes.error) throw new Error(campagnes.error.message);
  if (analyses.error) throw new Error(analyses.error.message);

  const perCampagne = new Map<string, Record<string, unknown>[]>();
  for (const a of analyses.data ?? []) {
    const lijst = perCampagne.get(a.campagne_id as string) ?? [];
    lijst.push(a);
    perCampagne.set(a.campagne_id as string, lijst);
  }

  return (campagnes.data ?? []).map((r) => {
    const campagne = naarCampagne(r);
    const lijst = perCampagne.get(campagne.id) ?? [];
    const laatste = lijst[0];
    return {
      ...campagne,
      aantalAnalyses: lijst.length,
      laatsteAnalyse: laatste
        ? {
            id: laatste.id as string,
            versie: laatste.versie as number,
            geanalyseerdOp: laatste.geanalyseerd_op as string,
            samenvatting: (laatste.samenvatting as string | null) ?? null,
            kerncijfers: (laatste.kerncijfers as InsightKerncijfers) ?? {},
          }
        : null,
    };
  });
}

export async function maakCampagne(
  supabase: SupabaseClient,
  invoer: InsightCampagneInvoer,
  gebruikerId: string,
): Promise<InsightCampagne> {
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(CAMPAGNES)
    .insert({ ...naarKolommen(invoer), aangemaakt_door: gebruikerId })
    .select(CAMPAGNE_KOLOMMEN)
    .single();
  if (error) throw new Error(error.message);
  return naarCampagne(data);
}

export async function werkCampagneBij(
  supabase: SupabaseClient,
  id: string,
  invoer: InsightCampagneInvoer,
): Promise<InsightCampagne | null> {
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(CAMPAGNES)
    .update({ ...naarKolommen(invoer), bijgewerkt_op: new Date().toISOString() })
    .eq("id", id)
    .select(CAMPAGNE_KOLOMMEN)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? naarCampagne(data) : null;
}

/** Analyse aanvragen (of de aanvraag intrekken): Claude Code pakt aangevraagde campagnes op. */
export async function zetAanvraag(
  supabase: SupabaseClient,
  id: string,
  aangevraagd: boolean,
  gebruikerId: string,
): Promise<InsightCampagne | null> {
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(CAMPAGNES)
    .update(
      aangevraagd
        ? { analyse_gevraagd_op: new Date().toISOString(), analyse_gevraagd_door: gebruikerId }
        : { analyse_gevraagd_op: null, analyse_gevraagd_door: null },
    )
    .eq("id", id)
    .select(CAMPAGNE_KOLOMMEN)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? naarCampagne(data) : null;
}

export async function verwijderCampagne(supabase: SupabaseClient, id: string): Promise<boolean> {
  const { data, error } = await supabase.schema(SCHEMA).from(CAMPAGNES).delete().eq("id", id).select("id");
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

/** De versies van één campagne, nieuwste eerst — voor de keuzelijst op de analysepagina. */
export async function lijstVersies(supabase: SupabaseClient, campagneId: string): Promise<InsightVersie[]> {
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(ANALYSES)
    .select("id, versie, geanalyseerd_op")
    .eq("campagne_id", campagneId)
    .order("versie", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    versie: r.versie as number,
    geanalyseerdOp: r.geanalyseerd_op as string,
  }));
}

export async function haalAnalyse(supabase: SupabaseClient, id: string): Promise<InsightAnalyse | null> {
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(ANALYSES)
    .select(
      "id, campagne_id, versie, geanalyseerd_op, periode_van, periode_tot, briefing, model, samenvatting, kerncijfers, resultaat, prompt:prompt_id(versie)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const prompt = data.prompt as { versie?: number } | { versie?: number }[] | null;
  const promptVersie = Array.isArray(prompt) ? prompt[0]?.versie : prompt?.versie;
  return {
    id: data.id as string,
    campagneId: data.campagne_id as string,
    versie: data.versie as number,
    geanalyseerdOp: data.geanalyseerd_op as string,
    periodeVan: (data.periode_van as string | null) ?? null,
    periodeTot: (data.periode_tot as string | null) ?? null,
    briefing: (data.briefing as InsightAnalyse["briefing"]) ?? {},
    promptVersie: promptVersie ?? null,
    model: (data.model as string | null) ?? null,
    samenvatting: (data.samenvatting as string | null) ?? null,
    kerncijfers: (data.kerncijfers as InsightKerncijfers) ?? {},
    resultaat: normaliseerResultaat(data.resultaat),
  };
}

// ---------------------------------------------------------------------------
// Hoofdprompt
// ---------------------------------------------------------------------------

/** De geldende hoofdprompt; zonder opgeslagen versie de standaardtekst uit de code. */
export async function haalPrompt(supabase: SupabaseClient): Promise<Omit<InsightPrompt, "opgeslagenDoorNaam"> & { opgeslagenDoor: string | null }> {
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(PROMPTS)
    .select("id, versie, inhoud, opgeslagen_op, opgeslagen_door")
    .order("versie", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    return { id: null, versie: 0, inhoud: STANDAARD_HOOFDPROMPT, opgeslagenOp: null, opgeslagenDoor: null, standaard: true };
  }
  return {
    id: data.id as string,
    versie: data.versie as number,
    inhoud: data.inhoud as string,
    opgeslagenOp: data.opgeslagen_op as string,
    opgeslagenDoor: (data.opgeslagen_door as string | null) ?? null,
    standaard: false,
  };
}

/** Eerdere versies van de prompt (zonder inhoud), nieuwste eerst. */
export async function lijstPromptVersies(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(PROMPTS)
    .select("id, versie, opgeslagen_op")
    .order("versie", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ id: r.id as string, versie: r.versie as number, opgeslagenOp: r.opgeslagen_op as string }));
}

/**
 * Een nieuwe versie van de prompt opslaan. Overschrijven gebeurt nooit: elke analyse
 * verwijst naar de versie waarmee hij gemaakt is, en die moet terug te lezen blijven.
 * Valt de unieke versie samen met een gelijktijdige opslag, dan één keer opnieuw.
 */
export async function bewaarPrompt(supabase: SupabaseClient, inhoud: string, gebruikerId: string) {
  for (let poging = 0; poging < 2; poging++) {
    const huidig = await haalPrompt(supabase);
    if (!huidig.standaard && huidig.inhoud === inhoud) return huidig;
    const { data, error } = await supabase
      .schema(SCHEMA)
      .from(PROMPTS)
      .insert({ versie: huidig.versie + 1, inhoud, opgeslagen_door: gebruikerId })
      .select("id, versie, inhoud, opgeslagen_op, opgeslagen_door")
      .single();
    if (!error) {
      return {
        id: data.id as string,
        versie: data.versie as number,
        inhoud: data.inhoud as string,
        opgeslagenOp: data.opgeslagen_op as string,
        opgeslagenDoor: (data.opgeslagen_door as string | null) ?? null,
        standaard: false,
      };
    }
    if (error.code !== "23505") throw new Error(error.message);
  }
  throw new Error("De prompt werd tegelijk door iemand anders opgeslagen. Probeer het opnieuw.");
}
