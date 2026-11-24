import type { SupabaseClient } from "@supabase/supabase-js";
import { leesSemantiek, normaliseerResultaat } from "./rekenen";
import { STANDAARD_HOOFDPROMPT } from "./standaardPrompt";
import { STANDAARD_SEMANTIEK } from "./standaardSemantiek";
import type {
  Label,
  MaAnalyse,
  MaCampagne,
  MaCampagneInvoer,
  MaKerncijfers,
  MaOverzichtRegel,
  MaVersie,
  SemantiekInhoud,
} from "./types";

/**
 * Marketing analyse — lezen en schrijven in Supabase (migratie 0042). Analyses worden hier
 * alleen gelezen en verwijderd: schrijven doet Claude Code via `marketing_analyse_bewaar`.
 */

const SCHEMA = "dataloket";
const CAMPAGNES = "marketing_analyse_campagnes";
const VERSIES = "marketing_analyse_versies";
const PROMPTS = "marketing_analyse_prompts";
const SEMANTIEK = "marketing_analyse_semantiek";

const CAMPAGNE_KOLOMMEN =
  "id, naam, bedrijf, merk, modellen, startdatum, einddatum, doel, budget, omschrijving, data_correctie, data_correctie_bijgewerkt_op, analyse_ronde, aangemaakt_op, bijgewerkt_op";

function getalOfNull(x: unknown): number | null {
  if (x === null || x === undefined || x === "") return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function tekst(x: unknown): string | null {
  return typeof x === "string" ? x : null;
}

function naarCampagne(r: Record<string, unknown>): MaCampagne {
  return {
    id: r.id as string,
    naam: r.naam as string,
    bedrijf: r.bedrijf as string,
    merk: tekst(r.merk),
    modellen: Array.isArray(r.modellen) ? (r.modellen as string[]) : [],
    startdatum: tekst(r.startdatum),
    einddatum: tekst(r.einddatum),
    doel: tekst(r.doel),
    // numeric komt als string terug uit PostgREST.
    budget: getalOfNull(r.budget),
    omschrijving: tekst(r.omschrijving),
    dataCorrectie: tekst(r.data_correctie),
    dataCorrectieBijgewerktOp: tekst(r.data_correctie_bijgewerkt_op),
    analyseRonde: Boolean(r.analyse_ronde),
    aangemaaktOp: r.aangemaakt_op as string,
    bijgewerktOp: r.bijgewerkt_op as string,
  };
}

function naarKolommen(i: MaCampagneInvoer) {
  return {
    naam: i.naam,
    bedrijf: i.bedrijf,
    merk: i.merk,
    modellen: i.modellen,
    startdatum: i.startdatum,
    einddatum: i.einddatum,
    doel: i.doel,
    budget: i.budget,
    omschrijving: i.omschrijving,
  };
}

/** Alle campagnes, met per campagne de laatste analyse (alleen de kerncijfers). */
export async function lijstOverzicht(supabase: SupabaseClient): Promise<MaOverzichtRegel[]> {
  const [campagnes, versies] = await Promise.all([
    supabase.schema(SCHEMA).from(CAMPAGNES).select(CAMPAGNE_KOLOMMEN),
    // Niet het resultaat zelf: dat kan honderden kB per analyse zijn.
    supabase
      .schema(SCHEMA)
      .from(VERSIES)
      .select("id, campagne_id, versie, label, geanalyseerd_op, kerncijfers")
      .order("versie", { ascending: false }),
  ]);
  if (campagnes.error) throw new Error(campagnes.error.message);
  if (versies.error) throw new Error(versies.error.message);

  const perCampagne = new Map<string, Record<string, unknown>[]>();
  for (const v of versies.data ?? []) {
    const lijst = perCampagne.get(v.campagne_id as string) ?? [];
    lijst.push(v);
    perCampagne.set(v.campagne_id as string, lijst);
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
            label: laatste.label as Label,
            geanalyseerdOp: laatste.geanalyseerd_op as string,
            kerncijfers: (laatste.kerncijfers as MaKerncijfers) ?? {},
          }
        : null,
    };
  });
}

export async function maakCampagne(supabase: SupabaseClient, invoer: MaCampagneInvoer, gebruikerId: string) {
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(CAMPAGNES)
    .insert({
      ...naarKolommen(invoer),
      data_correctie: invoer.dataCorrectie,
      data_correctie_bijgewerkt_op: invoer.dataCorrectie ? new Date().toISOString() : null,
      aangemaakt_door: gebruikerId,
    })
    .select(CAMPAGNE_KOLOMMEN)
    .single();
  if (error) throw new Error(error.message);
  return naarCampagne(data);
}

async function werkBij(supabase: SupabaseClient, id: string, velden: Record<string, unknown>) {
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(CAMPAGNES)
    .update({ ...velden, bijgewerkt_op: new Date().toISOString() })
    .eq("id", id)
    .select(CAMPAGNE_KOLOMMEN)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? naarCampagne(data) : null;
}

/** De briefing bijwerken. De Data correctie gaat mee, maar krijgt alleen een nieuwe datum als hij verandert. */
export async function werkCampagneBij(supabase: SupabaseClient, id: string, invoer: MaCampagneInvoer, vorige: string | null) {
  const veranderd = (invoer.dataCorrectie ?? null) !== (vorige ?? null);
  return werkBij(supabase, id, {
    ...naarKolommen(invoer),
    data_correctie: invoer.dataCorrectie,
    ...(veranderd ? { data_correctie_bijgewerkt_op: new Date().toISOString() } : {}),
  });
}

export async function zetDataCorrectie(supabase: SupabaseClient, id: string, dataCorrectie: string | null) {
  return werkBij(supabase, id, { data_correctie: dataCorrectie, data_correctie_bijgewerkt_op: new Date().toISOString() });
}

export async function zetAnalyseRonde(supabase: SupabaseClient, id: string, aan: boolean) {
  return werkBij(supabase, id, { analyse_ronde: aan });
}

export async function haalCampagne(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase.schema(SCHEMA).from(CAMPAGNES).select(CAMPAGNE_KOLOMMEN).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? naarCampagne(data) : null;
}

export async function verwijderCampagne(supabase: SupabaseClient, id: string): Promise<boolean> {
  const { data, error } = await supabase.schema(SCHEMA).from(CAMPAGNES).delete().eq("id", id).select("id");
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

// ---------------------------------------------------------------------------
// Analyses
// ---------------------------------------------------------------------------

export async function lijstVersies(supabase: SupabaseClient, campagneId: string): Promise<MaVersie[]> {
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(VERSIES)
    .select("id, versie, label, geanalyseerd_op")
    .eq("campagne_id", campagneId)
    .order("versie", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    versie: r.versie as number,
    label: r.label as Label,
    geanalyseerdOp: r.geanalyseerd_op as string,
  }));
}

function eersteVersie(x: unknown): number | null {
  const v = Array.isArray(x) ? (x[0] as { versie?: number } | undefined)?.versie : (x as { versie?: number } | null)?.versie;
  return typeof v === "number" ? v : null;
}

export async function haalAnalyse(supabase: SupabaseClient, id: string): Promise<MaAnalyse | null> {
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(VERSIES)
    .select(
      "id, campagne_id, versie, label, geanalyseerd_op, periode_van, periode_tot, briefing, model, kerncijfers, resultaat, prompt:prompt_id(versie), semantiek:semantiek_id(versie)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: data.id as string,
    campagneId: data.campagne_id as string,
    versie: data.versie as number,
    label: data.label as Label,
    geanalyseerdOp: data.geanalyseerd_op as string,
    periodeVan: tekst(data.periode_van),
    periodeTot: tekst(data.periode_tot),
    briefing: (data.briefing as MaAnalyse["briefing"]) ?? {},
    promptVersie: eersteVersie(data.prompt),
    semantiekVersie: eersteVersie(data.semantiek),
    model: tekst(data.model),
    kerncijfers: (data.kerncijfers as MaKerncijfers) ?? {},
    resultaat: normaliseerResultaat(data.resultaat),
  };
}

export async function verwijderVersie(supabase: SupabaseClient, id: string): Promise<boolean> {
  const { data, error } = await supabase.schema(SCHEMA).from(VERSIES).delete().eq("id", id).select("id");
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

// ---------------------------------------------------------------------------
// Hoofdprompt en semantic layer: altijd een nieuwe versie, nooit overschrijven
// ---------------------------------------------------------------------------

interface Opgeslagen<T> {
  id: string | null;
  versie: number;
  inhoud: T;
  opgeslagenOp: string | null;
  opgeslagenDoor: string | null;
  standaard: boolean;
}

async function haalLaatste<T>(supabase: SupabaseClient, tabel: string, standaard: T, lees: (x: unknown) => T): Promise<Opgeslagen<T>> {
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(tabel)
    .select("id, versie, inhoud, opgeslagen_op, opgeslagen_door")
    .order("versie", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { id: null, versie: 0, inhoud: standaard, opgeslagenOp: null, opgeslagenDoor: null, standaard: true };
  return {
    id: data.id as string,
    versie: data.versie as number,
    inhoud: lees(data.inhoud),
    opgeslagenOp: data.opgeslagen_op as string,
    opgeslagenDoor: tekst(data.opgeslagen_door),
    standaard: false,
  };
}

async function bewaarNieuweVersie<T>(
  supabase: SupabaseClient,
  tabel: string,
  inhoud: T,
  gebruikerId: string,
  huidig: () => Promise<Opgeslagen<T>>,
  gelijk: (a: T, b: T) => boolean,
  lees: (x: unknown) => T,
): Promise<Opgeslagen<T>> {
  for (let poging = 0; poging < 2; poging++) {
    const nu = await huidig();
    if (!nu.standaard && gelijk(nu.inhoud, inhoud)) return nu;
    const { data, error } = await supabase
      .schema(SCHEMA)
      .from(tabel)
      .insert({ versie: nu.versie + 1, inhoud, opgeslagen_door: gebruikerId })
      .select("id, versie, inhoud, opgeslagen_op, opgeslagen_door")
      .single();
    if (!error) {
      return {
        id: data.id as string,
        versie: data.versie as number,
        inhoud: lees(data.inhoud),
        opgeslagenOp: data.opgeslagen_op as string,
        opgeslagenDoor: tekst(data.opgeslagen_door),
        standaard: false,
      };
    }
    // Twee keer tegelijk opgeslagen: dezelfde versie bestaat al. Eén keer opnieuw.
    if (error.code !== "23505") throw new Error(error.message);
  }
  throw new Error("Er werd tegelijk door iemand anders opgeslagen. Probeer het opnieuw.");
}

const leesTekst = (x: unknown) => (typeof x === "string" ? x : "");

export function haalPrompt(supabase: SupabaseClient) {
  return haalLaatste(supabase, PROMPTS, STANDAARD_HOOFDPROMPT, leesTekst);
}

export function bewaarPrompt(supabase: SupabaseClient, inhoud: string, gebruikerId: string) {
  return bewaarNieuweVersie(supabase, PROMPTS, inhoud, gebruikerId, () => haalPrompt(supabase), (a, b) => a === b, leesTekst);
}

const leesSem = (x: unknown) => leesSemantiek(x, STANDAARD_SEMANTIEK);

export function haalSemantiek(supabase: SupabaseClient) {
  return haalLaatste<SemantiekInhoud>(supabase, SEMANTIEK, STANDAARD_SEMANTIEK, leesSem);
}

export function bewaarSemantiek(supabase: SupabaseClient, inhoud: SemantiekInhoud, gebruikerId: string) {
  return bewaarNieuweVersie(
    supabase,
    SEMANTIEK,
    inhoud,
    gebruikerId,
    () => haalSemantiek(supabase),
    (a, b) => JSON.stringify(a) === JSON.stringify(b),
    leesSem,
  );
}
