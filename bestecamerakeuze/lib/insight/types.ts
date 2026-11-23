/**
 * Campaign insight — de vormen die Claude Code wegschrijft en het dashboard toont.
 *
 * De verdeling van werk:
 *  - De **hoofdprompt** (bewerkbaar in het dashboard, `insight_prompts`) zegt wát er
 *    geanalyseerd wordt en hoe je het beoordeelt.
 *  - Dit bestand is het **formaat** van het resultaat. Het is bewust generiek: een analyse
 *    bestaat uit secties in funnelvolgorde, en elke sectie is opgebouwd uit dezelfde blokken
 *    (kerncijfers, tekst, tabellen, grafieken). Zo kan de hoofdprompt de analyse anders
 *    opzetten zonder dat het dashboard hoeft te veranderen.
 *  - De werkwijze voor Claude Code (data ophalen, wegschrijven) staat in de skill
 *    `.claude/skills/campagne-insight/SKILL.md` in de root van de repository.
 *
 * Verander je hier iets, pas dan de skill in dezelfde wijziging aan: die beschrijft dit
 * formaat voor Claude Code.
 */

/** De briefing die het team invult. */
export interface InsightCampagne {
  id: string;
  naam: string;
  merk: string | null;
  model: string | null;
  startdatum: string | null;
  einddatum: string | null;
  doel: string | null;
  budget: number | null;
  omschrijving: string | null;
  zoektermen: string | null;
  campagnepaginas: string | null;
  analyseGevraagdOp: string | null;
  aangemaaktOp: string;
  bijgewerktOp: string;
}

/** Wat de gebruiker in het formulier kan invullen. */
export type InsightCampagneInvoer = Pick<
  InsightCampagne,
  | "naam"
  | "merk"
  | "model"
  | "startdatum"
  | "einddatum"
  | "doel"
  | "budget"
  | "omschrijving"
  | "zoektermen"
  | "campagnepaginas"
>;

/**
 * De vaste cijfers per analyse voor de overzichtstabel. Elke sleutel mag null zijn als de
 * analyse hem niet kon bepalen; het overzicht toont dan een streepje.
 */
export interface InsightKerncijfers {
  /** Totale advertentie-uitgaven over alle platforms, in euro. */
  kosten?: number | null;
  /** Vertoningen betaald + organisch. */
  vertoningen?: number | null;
  /** Klikken op advertenties (alle platforms). */
  klikken?: number | null;
  /** Sessies die op de campagnepagina('s) begonnen. */
  sessies?: number | null;
  /** Lead-events op de website die bij de campagne horen (GA4). */
  leadsOnline?: number | null;
  /** Leads in Syntec voor het merk/model in de periode. */
  leadsSyntec?: number | null;
  /** Het doel als getal, als dat uit de briefing te halen is (bv. 20 proefritaanvragen). */
  doelWaarde?: number | null;
  /** Wat daarvan gerealiseerd is, in dezelfde eenheid als het doel. */
  doelRealisatie?: number | null;
  /** Korte naam van de doeleenheid, bv. "proefritaanvragen". */
  doelEenheid?: string | null;
}

export type Eenheid = "aantal" | "euro" | "procent" | "seconden" | "tekst";

export interface Kerncijfer {
  label: string;
  waarde: number | string | null;
  eenheid: Eenheid;
  /** Eén korte zin onder het cijfer. */
  toelichting?: string;
  /** Optioneel: een vergelijkingswaarde (vorige periode, doel, benchmark). */
  vergelijking?: { label: string; waarde: number | null };
}

export interface TabelKolom {
  label: string;
  eenheid?: Eenheid;
}

export interface Tabel {
  titel?: string;
  kolommen: TabelKolom[];
  rijen: (string | number | null)[][];
  /** Optionele totaalregel onderaan. */
  totaal?: (string | number | null)[];
  voetnoot?: string;
}

export interface Grafiek {
  titel: string;
  type: "lijn" | "staaf";
  /** Labels op de x-as (bv. datums "2026-10-01" of weeknamen). */
  x: string[];
  /** Hoogstens zes reeksen, allemaal in dezelfde eenheid (één as). */
  reeksen: { naam: string; waarden: (number | null)[] }[];
  eenheid: Exclude<Eenheid, "tekst">;
  voetnoot?: string;
}

export interface Sectie {
  /** Volgorde in de funnel (1 = bovenaan). */
  stap: number;
  titel: string;
  ondertitel?: string;
  kerncijfers?: Kerncijfer[];
  /** Markdown. */
  tekst?: string;
  tabellen?: Tabel[];
  grafieken?: Grafiek[];
}

export interface FunnelStap {
  label: string;
  waarde: number | null;
  eenheid: Exclude<Eenheid, "tekst">;
  toelichting?: string;
}

export type InzichtSoort = "sterk" | "zwak" | "kans" | "risico";
export type Prioriteit = "hoog" | "middel" | "laag";

export interface Inzicht {
  soort: InzichtSoort;
  titel: string;
  toelichting: string;
}

export interface Aanbeveling {
  titel: string;
  toelichting: string;
  prioriteit: Prioriteit;
}

/** Wat de analyse aan de campagne heeft toegerekend, en waarom — de verantwoording. */
export interface Herkenning {
  /** Bijv. "Meta Ads", "Google Ads", "Instagram organisch", "GA4", "Syntec". */
  bron: string;
  /** Bijv. "campagne", "advertentie", "post", "landingspagina", "e-mailcampagne", "event". */
  soort: string;
  naam: string;
  /** Waarom dit bij de campagne hoort. */
  reden: string;
  /** Hoe zeker: "zeker" (naam/URL bevat de campagne), "waarschijnlijk", "twijfel". */
  zekerheid?: "zeker" | "waarschijnlijk" | "twijfel";
}

export interface InsightResultaat {
  /** Versie van dit formaat, zodat oudere analyses leesbaar blijven als het verandert. */
  formaat: 1;
  samenvatting: {
    /** Eén zin: het oordeel. */
    kop: string;
    /** Markdown, een paar alinea's. */
    tekst: string;
  };
  funnel: FunnelStap[];
  secties: Sectie[];
  inzichten?: Inzicht[];
  aanbevelingen?: Aanbeveling[];
  herkenning: Herkenning[];
  /** Kanttekeningen bij de data (ontbrekende bronnen, achterstand, aannames). */
  datakwaliteit?: string[];
}

/** Eén regel in het overzicht: de briefing plus de laatste analyse (als die er is). */
export interface InsightOverzichtRegel extends InsightCampagne {
  laatsteAnalyse: {
    id: string;
    versie: number;
    geanalyseerdOp: string;
    samenvatting: string | null;
    kerncijfers: InsightKerncijfers;
  } | null;
  aantalAnalyses: number;
}

/** Een versie in de keuzelijst op de analysepagina. */
export interface InsightVersie {
  id: string;
  versie: number;
  geanalyseerdOp: string;
}

export interface InsightAnalyse {
  id: string;
  campagneId: string;
  versie: number;
  geanalyseerdOp: string;
  periodeVan: string | null;
  periodeTot: string | null;
  briefing: Partial<InsightCampagneInvoer>;
  promptVersie: number | null;
  model: string | null;
  samenvatting: string | null;
  kerncijfers: InsightKerncijfers;
  resultaat: InsightResultaat;
}

export interface InsightPrompt {
  id: string | null;
  versie: number;
  inhoud: string;
  opgeslagenOp: string | null;
  opgeslagenDoorNaam: string | null;
  /** True zolang er nog niets is opgeslagen en de standaardtekst uit de code geldt. */
  standaard: boolean;
}
