import type { SupabaseClient } from "@supabase/supabase-js";
import { leesSemantiek, normaliseerResultaat, sorteerOpzetten } from "./rekenen";
import { STANDAARD_HOOFDPROMPT } from "./standaardPrompt";
import { STANDAARD_SEMANTIEK } from "./standaardSemantiek";
import {
  isPlanning,
  STANDAARD_OPZET_ID,
  type Formulier,
  type Label,
  type MaAnalyse,
  type MaCampagne,
  type MaCampagneInvoer,
  type MaKerncijfers,
  type MaOpzet,
  type MaOverzichtRegel,
  type Planning,
  type MaVersie,
  type MaVoorstel,
  type MaZoekronde,
  type SemantiekInhoud,
  type VoorstelBewijs,
  type VoorstelStatus,
  type Zekerheid,
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
const OPZETTEN = "marketing_analyse_opzetten";

const CAMPAGNE_KOLOMMEN =
  "id, opzet_id, naam, bedrijven, merk, modellen, startdatum, einddatum, periode_tekst, doel, budget, omschrijving, campagnepaginas, data_correctie, data_correctie_bijgewerkt_op, planning, analyse_ronde, voorstel_id, aangemaakt_op, bijgewerkt_op";

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
    opzetId: (r.opzet_id as string) ?? STANDAARD_OPZET_ID,
    naam: r.naam as string,
    bedrijven: Array.isArray(r.bedrijven) ? (r.bedrijven as string[]) : [],
    merk: tekst(r.merk),
    modellen: Array.isArray(r.modellen) ? (r.modellen as string[]) : [],
    startdatum: tekst(r.startdatum),
    einddatum: tekst(r.einddatum),
    periodeTekst: tekst(r.periode_tekst),
    doel: tekst(r.doel),
    // numeric komt als string terug uit PostgREST.
    budget: getalOfNull(r.budget),
    omschrijving: tekst(r.omschrijving),
    campagnePaginas: Array.isArray(r.campagnepaginas) ? (r.campagnepaginas as string[]) : [],
    dataCorrectie: tekst(r.data_correctie),
    dataCorrectieBijgewerktOp: tekst(r.data_correctie_bijgewerkt_op),
    planning: isPlanning(r.planning) ? r.planning : r.analyse_ronde ? "week" : "uit",
    analyseRonde: Boolean(r.analyse_ronde),
    voorstelId: tekst(r.voorstel_id),
    aangemaaktOp: r.aangemaakt_op as string,
    bijgewerktOp: r.bijgewerkt_op as string,
  };
}

function naarKolommen(i: MaCampagneInvoer) {
  return {
    opzet_id: i.opzetId,
    naam: i.naam,
    bedrijven: i.bedrijven,
    merk: i.merk,
    modellen: i.modellen,
    startdatum: i.startdatum,
    einddatum: i.einddatum,
    periode_tekst: i.periodeTekst,
    doel: i.doel,
    budget: i.budget,
    omschrijving: i.omschrijving,
    campagnepaginas: i.campagnePaginas,
  };
}

/** Alle campagnes, met per campagne de laatste analyse (alleen de kerncijfers). */
export async function lijstOverzicht(supabase: SupabaseClient): Promise<MaOverzichtRegel[]> {
  const [campagnes, versies, volgers] = await Promise.all([
    supabase.schema(SCHEMA).from(CAMPAGNES).select(CAMPAGNE_KOLOMMEN),
    // Niet het resultaat zelf: dat kan honderden kB per analyse zijn.
    supabase
      .schema(SCHEMA)
      .from(VERSIES)
      .select("id, campagne_id, versie, label, geanalyseerd_op, kerncijfers")
      .order("versie", { ascending: false }),
    // Alleen tellen; het afmeldtoken is voor ingelogde gebruikers niet eens leesbaar (0043).
    supabase.schema(SCHEMA).from("marketing_analyse_volgers").select("campagne_id"),
  ]);
  if (campagnes.error) throw new Error(campagnes.error.message);
  if (versies.error) throw new Error(versies.error.message);
  const aantalVolgers = new Map<string, number>();
  // Lukt het tellen niet, dan staat er gewoon geen getal bij het icoontje.
  for (const v of volgers.error ? [] : (volgers.data ?? [])) {
    aantalVolgers.set(v.campagne_id as string, (aantalVolgers.get(v.campagne_id as string) ?? 0) + 1);
  }

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
      aantalVolgers: aantalVolgers.get(campagne.id) ?? 0,
      laatsteAnalyse: laatste
        ? {
            id: laatste.id as string,
            versie: laatste.versie as number,
            label: (laatste.label as Label | null) ?? null,
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

/** De planning in het overzicht; analyse_ronde loopt in de database vanzelf mee (migratie 0049). */
export async function zetPlanning(supabase: SupabaseClient, id: string, planning: Planning) {
  return werkBij(supabase, id, { planning });
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
    label: (r.label as Label | null) ?? null,
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
    label: (data.label as Label | null) ?? null,
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

async function haalLaatste<T>(
  supabase: SupabaseClient,
  tabel: string,
  standaard: T,
  lees: (x: unknown) => T,
  opzetId?: string,
): Promise<Opgeslagen<T>> {
  let query = supabase.schema(SCHEMA).from(tabel).select("id, versie, inhoud, opgeslagen_op, opgeslagen_door");
  if (opzetId) query = query.eq("opzet_id", opzetId);
  const { data, error } = await query
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
  extra: Record<string, unknown> = {},
): Promise<Opgeslagen<T>> {
  for (let poging = 0; poging < 2; poging++) {
    const nu = await huidig();
    if (!nu.standaard && gelijk(nu.inhoud, inhoud)) return nu;
    const { data, error } = await supabase
      .schema(SCHEMA)
      .from(tabel)
      .insert({ versie: nu.versie + 1, inhoud, opgeslagen_door: gebruikerId, ...extra })
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

/**
 * De laatste prompt van een opzet. Zonder opgeslagen versie: bij Campagne analyse de
 * standaardtekst uit de code, bij elke andere opzet een lege prompt (dan weigert de skill).
 */
export function haalPrompt(supabase: SupabaseClient, opzetId: string = STANDAARD_OPZET_ID) {
  return haalLaatste(supabase, PROMPTS, opzetId === STANDAARD_OPZET_ID ? STANDAARD_HOOFDPROMPT : "", leesTekst, opzetId);
}

export function bewaarPrompt(supabase: SupabaseClient, opzetId: string, inhoud: string, gebruikerId: string) {
  return bewaarNieuweVersie(
    supabase,
    PROMPTS,
    inhoud,
    gebruikerId,
    () => haalPrompt(supabase, opzetId),
    (a, b) => a === b,
    leesTekst,
    { opzet_id: opzetId },
  );
}

// ---------------------------------------------------------------------------
// Analyse opzetten
// ---------------------------------------------------------------------------

const OPZET_KOLOMMEN = "id, naam, formulier, bedrijven, volgorde, actief, standaard, standaard_planning";

function naarOpzet(r: Record<string, unknown>, metPrompt: Set<string>, aantallen: Map<string, number>): MaOpzet {
  const id = r.id as string;
  return {
    id,
    naam: r.naam as string,
    formulier: r.formulier as Formulier,
    bedrijven: Array.isArray(r.bedrijven) ? (r.bedrijven as string[]) : [],
    volgorde: Number(r.volgorde ?? 100),
    actief: Boolean(r.actief),
    standaard: Boolean(r.standaard),
    standaardPlanning: isPlanning(r.standaard_planning) ? r.standaard_planning : "uit",
    heeftPrompt: Boolean(r.standaard) || metPrompt.has(id),
    aantalCampagnes: aantallen.get(id) ?? 0,
  };
}

/** Alle opzetten, met per opzet of er een prompt is en hoeveel analyses hem gebruiken. */
export async function lijstOpzetten(supabase: SupabaseClient): Promise<MaOpzet[]> {
  const [opzetten, prompts, campagnes] = await Promise.all([
    supabase.schema(SCHEMA).from(OPZETTEN).select(OPZET_KOLOMMEN),
    supabase.schema(SCHEMA).from(PROMPTS).select("opzet_id"),
    supabase.schema(SCHEMA).from(CAMPAGNES).select("opzet_id"),
  ]);
  if (opzetten.error) throw new Error(opzetten.error.message);
  if (prompts.error) throw new Error(prompts.error.message);
  if (campagnes.error) throw new Error(campagnes.error.message);
  const metPrompt = new Set((prompts.data ?? []).map((p) => p.opzet_id as string));
  const aantallen = new Map<string, number>();
  for (const c of campagnes.data ?? []) aantallen.set(c.opzet_id as string, (aantallen.get(c.opzet_id as string) ?? 0) + 1);
  return sorteerOpzetten((opzetten.data ?? []).map((r) => naarOpzet(r, metPrompt, aantallen)));
}

export async function haalOpzet(supabase: SupabaseClient, id: string): Promise<MaOpzet | null> {
  const lijst = await lijstOpzetten(supabase);
  return lijst.find((o) => o.id === id) ?? null;
}

export interface OpzetVelden {
  naam: string;
  formulier: Formulier;
  bedrijven: string[];
  actief: boolean;
  standaardPlanning: Planning;
}

function opzetKolommen(v: OpzetVelden) {
  return { naam: v.naam, formulier: v.formulier, bedrijven: v.bedrijven, actief: v.actief, standaard_planning: v.standaardPlanning };
}

function opzetFout(error: { code?: string; message: string }): Error {
  return new Error(error.code === "23505" ? "Er bestaat al een opzet met die naam." : error.message);
}

export async function maakOpzet(supabase: SupabaseClient, velden: OpzetVelden, gebruikerId: string): Promise<string> {
  const huidige = await lijstOpzetten(supabase);
  const volgorde = Math.max(0, ...huidige.map((o) => o.volgorde)) + 10;
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(OPZETTEN)
    .insert({ ...opzetKolommen(velden), volgorde, aangemaakt_door: gebruikerId })
    .select("id")
    .single();
  if (error) throw opzetFout(error);
  return data.id as string;
}

export async function werkOpzetBij(supabase: SupabaseClient, id: string, velden: OpzetVelden): Promise<boolean> {
  const { data, error } = await supabase.schema(SCHEMA).from(OPZETTEN).update(opzetKolommen(velden)).eq("id", id).select("id");
  if (error) throw opzetFout(error);
  return (data ?? []).length > 0;
}

export async function verwijderOpzet(supabase: SupabaseClient, id: string): Promise<boolean> {
  const { data, error } = await supabase.schema(SCHEMA).from(OPZETTEN).delete().eq("id", id).select("id");
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
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

// ---------------------------------------------------------------------------
// Voorgestelde campagne analyses (migratie 0046). Nieuwe voorstellen schrijft alleen Claude
// Code (marketing_analyse_voorstellen_bewaar); hier lezen, toevoegen, negeren en terugzetten.
// ---------------------------------------------------------------------------

const VOORSTELLEN = "marketing_analyse_voorstellen";
const VOORSTEL_KOLOMMEN =
  "id, status, naam, bedrijven, merk, modellen, startdatum, einddatum, budget, doel, omschrijving, campagnepaginas, zekerheid, reden, kanalen, uitgaven_tot_nu, laatste_uitgave_op, bewijs, gevonden_op, laatst_gezien_op";

function lijst(x: unknown): string[] {
  return Array.isArray(x) ? x.filter((y): y is string => typeof y === "string") : [];
}

function naarVoorstel(r: Record<string, unknown>): MaVoorstel {
  const bewijs = r.bewijs && typeof r.bewijs === "object" && !Array.isArray(r.bewijs) ? (r.bewijs as VoorstelBewijs) : {};
  return {
    id: r.id as string,
    status: r.status as VoorstelStatus,
    naam: r.naam as string,
    bedrijven: lijst(r.bedrijven),
    merk: tekst(r.merk),
    modellen: lijst(r.modellen),
    startdatum: tekst(r.startdatum),
    einddatum: tekst(r.einddatum),
    budget: getalOfNull(r.budget),
    doel: tekst(r.doel),
    omschrijving: tekst(r.omschrijving),
    campagnePaginas: lijst(r.campagnepaginas),
    zekerheid: (r.zekerheid as Zekerheid) ?? "waarschijnlijk",
    reden: tekst(r.reden),
    kanalen: lijst(r.kanalen),
    uitgavenTotNu: getalOfNull(r.uitgaven_tot_nu),
    laatsteUitgaveOp: tekst(r.laatste_uitgave_op),
    bewijs,
    gevondenOp: r.gevonden_op as string,
    laatstGezienOp: r.laatst_gezien_op as string,
  };
}

/** De open en genegeerde voorstellen, en wanneer er voor het laatst is gezocht. */
export async function lijstVoorstellen(
  supabase: SupabaseClient,
): Promise<{ open: MaVoorstel[]; genegeerd: MaVoorstel[]; laatsteZoekronde: MaZoekronde | null }> {
  const [voorstellen, ronde] = await Promise.all([
    supabase
      .schema(SCHEMA)
      .from(VOORSTELLEN)
      .select(VOORSTEL_KOLOMMEN)
      .in("status", ["open", "genegeerd"])
      .order("laatst_gezien_op", { ascending: false }),
    supabase
      .schema(SCHEMA)
      .from("marketing_analyse_zoekrondes")
      .select("gezocht_op, aantal_nieuw, aantal_bijgewerkt, aantal_overgeslagen, aantal_verlopen")
      .order("gezocht_op", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (voorstellen.error) throw new Error(voorstellen.error.message);
  if (ronde.error) throw new Error(ronde.error.message);
  const alle = (voorstellen.data ?? []).map(naarVoorstel);
  const r = ronde.data;
  return {
    open: alle.filter((v) => v.status === "open"),
    genegeerd: alle.filter((v) => v.status === "genegeerd"),
    laatsteZoekronde: r
      ? {
          gezochtOp: r.gezocht_op as string,
          aantalNieuw: Number(r.aantal_nieuw ?? 0),
          aantalBijgewerkt: Number(r.aantal_bijgewerkt ?? 0),
          aantalOvergeslagen: Number(r.aantal_overgeslagen ?? 0),
          aantalVerlopen: Number(r.aantal_verlopen ?? 0),
        }
      : null,
  };
}

/**
 * Negeren (open → genegeerd) of terugzetten (genegeerd → open). Alleen vanuit de verwachte
 * status, zodat een voorstel dat net is toegevoegd niet terug in de balk springt.
 */
export async function zetVoorstelStatus(
  supabase: SupabaseClient,
  id: string,
  naar: "genegeerd" | "open",
  gebruikerId: string,
): Promise<MaVoorstel | null> {
  const van = naar === "genegeerd" ? "open" : "genegeerd";
  const nu = new Date().toISOString();
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(VOORSTELLEN)
    .update(
      naar === "genegeerd"
        ? { status: naar, afgehandeld_door: gebruikerId, afgehandeld_op: nu, bijgewerkt_op: nu }
        : { status: naar, afgehandeld_door: null, afgehandeld_op: null, bijgewerkt_op: nu },
    )
    .eq("id", id)
    .eq("status", van)
    .select(VOORSTEL_KOLOMMEN)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? naarVoorstel(data) : null;
}

/**
 * Een voorstel toevoegen met de nagelopen briefing: één transactie in de database maakt de
 * campagne aan (opzet Campagne analyse, planning Wekelijks via de trigger uit 0049) en sluit het voorstel af.
 */
export async function voegVoorstelToe(supabase: SupabaseClient, id: string, invoer: MaCampagneInvoer): Promise<MaCampagne> {
  const { data, error } = await supabase.schema(SCHEMA).rpc("marketing_analyse_voorstel_toevoegen", {
    p_voorstel_id: id,
    p_naam: invoer.naam,
    p_bedrijven: invoer.bedrijven,
    p_merk: invoer.merk,
    p_modellen: invoer.modellen,
    p_startdatum: invoer.startdatum,
    p_einddatum: invoer.einddatum,
    p_doel: invoer.doel,
    p_budget: invoer.budget,
    p_omschrijving: invoer.omschrijving,
    p_data_correctie: invoer.dataCorrectie,
    p_campagnepaginas: invoer.campagnePaginas,
  });
  if (error) throw new Error(error.message);
  const campagne = await haalCampagne(supabase, data as string);
  if (!campagne) throw new Error("De campagne is aangemaakt maar kon niet worden gelezen. Herlaad de pagina.");
  return campagne;
}
