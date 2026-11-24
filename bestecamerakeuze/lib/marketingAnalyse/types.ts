/**
 * Marketing analyse — de vormen die Claude Code wegschrijft en het dashboard toont.
 *
 * De verdeling van werk (zie campagne-analyse-tool.md):
 *  - De **analyse opzet** (`marketing_analyse_opzetten`) is de soort analyse: Campagne analyse
 *    (de standaard) of bijv. een maandrapportage. Hij bepaalt het briefingformulier en de prompt.
 *  - De **prompt** van de opzet (`marketing_analyse_prompts`) zegt hoe er geanalyseerd en
 *    geoordeeld wordt; bij Campagne analyse met een hoofdstuk per label.
 *  - De **semantic layer** (`marketing_analyse_semantiek`) zegt per databron hoe de data te
 *    lezen is, en in het blok Algemeen welke accounts bij welk bedrijf horen.
 *  - De **Data correctie** (per campagne) zegt wat er bij een vorige analyse niet klopte.
 *  - Dit bestand is het **formaat** van het resultaat: generiek, zodat de hoofdprompt de
 *    analyse anders kan opzetten zonder dat het dashboard hoeft te veranderen.
 *  - De werkwijze voor Claude Code staat in de skill `.claude/skills/marketing-analyse/`.
 *
 * Verander je hier iets, pas dan de skill in dezelfde wijziging aan.
 */

/** Het enige bedrijf waarvoor de leads uit Syntec ("Data leads") van toepassing zijn. */
export const BEDRIJF_MET_SYNTEC = "Van den Udenhout";

export type Label = "tussentijds" | "eind";

export const LABEL_NAAM: Record<Label, string> = {
  tussentijds: "Tussentijdse evaluatie",
  eind: "Eindevaluatie",
};

/** Het id van de standaardopzet Campagne analyse (vast, migratie 0044). */
export const STANDAARD_OPZET_ID = "7d0c0000-0000-4000-8000-000000000001";

/**
 * Welk briefingformulier een opzet heeft. `campagne`: de volledige briefing, met funnel en
 * kosten in het overzicht en een label. `rapportage`: naam, open periode, omschrijving.
 */
export type Formulier = "campagne" | "rapportage";

export const FORMULIER_NAAM: Record<Formulier, string> = {
  campagne: "Campagne (volledige briefing, funnel en kosten)",
  rapportage: "Rapportage (naam, periode en omschrijving)",
};

/** Een analyse opzet (analysetype), elk met een eigen prompt. */
export interface MaOpzet {
  id: string;
  naam: string;
  formulier: Formulier;
  /** Vaste bedrijven; leeg = de gebruiker kiest ze in de briefing. */
  bedrijven: string[];
  volgorde: number;
  actief: boolean;
  standaard: boolean;
  /** Er staat een prompt voor deze opzet (Campagne analyse heeft altijd de standaardtekst). */
  heeftPrompt: boolean;
  aantalCampagnes: number;
}

/** De briefing die het team invult. */
export interface MaCampagne {
  id: string;
  opzetId: string;
  naam: string;
  /** Voor welke van onze bedrijven de analyse is; minstens één. */
  bedrijven: string[];
  merk: string | null;
  modellen: string[];
  startdatum: string | null;
  einddatum: string | null;
  /** De open periode van een rapportage ("Afgelopen 3 maanden"); Claude legt hem bij elke analyse uit. */
  periodeTekst: string | null;
  doel: string | null;
  budget: number | null;
  omschrijving: string | null;
  dataCorrectie: string | null;
  dataCorrectieBijgewerktOp: string | null;
  analyseRonde: boolean;
  aangemaaktOp: string;
  bijgewerktOp: string;
}

/** Wat de gebruiker in het briefingformulier invult. */
export type MaCampagneInvoer = Pick<
  MaCampagne,
  | "opzetId"
  | "naam"
  | "bedrijven"
  | "merk"
  | "modellen"
  | "startdatum"
  | "einddatum"
  | "periodeTekst"
  | "doel"
  | "budget"
  | "omschrijving"
  | "dataCorrectie"
>;

export type DoelStatus = "voor" | "op-koers" | "achter" | "onbekend";

export const DOEL_STATUS_NAAM: Record<DoelStatus, string> = {
  voor: "Voor op schema",
  "op-koers": "Op koers",
  achter: "Achter op schema",
  onbekend: "Niet te beoordelen",
};

/** Het oordeel van de analyse over het doel uit de briefing (het doel is vrije tekst). */
export interface DoelOordeel {
  status: DoelStatus;
  /** Eén of twee zinnen: waarom. */
  toelichting: string;
}

/**
 * De vaste cijfers per analyse voor de overzichtstabel. Null als de analyse het niet kon
 * bepalen; `leadsSyntec` is bij elk ander bedrijf dan Van den Udenhout altijd null (n.v.t.).
 */
export interface MaKerncijfers {
  /** Mediakosten uit de advertentieplatformen (Google Ads, Meta Ads, LinkedIn Ads), in euro. Geen extra kanaalkosten. */
  kosten?: number | null;
  /** Vertoningen betaald + organisch. */
  vertoningen?: number | null;
  /** Alleen de vertoningen van de advertenties (Google Ads, Meta Ads, LinkedIn Ads samen); noemer van de CTR. */
  vertoningenAds?: number | null;
  /** Klikken op advertenties (Google Ads clicks, Meta link clicks, LinkedIn clicks samen); teller van de CTR. */
  klikken?: number | null;
  /** Sessies die op de campagnepagina('s) begonnen (GA4). */
  sessies?: number | null;
  /** Lead-events in sessies die op de campagnepagina begonnen (GA4). */
  leadEvents?: number | null;
  /** Leads in Syntec (Data leads) voor merk/model in de periode; alleen Van den Udenhout. */
  leadsSyntec?: number | null;
  /** Waarvan via kanaalgroep Internet. */
  leadsSyntecInternet?: number | null;
  /**
   * Het aantal leads uit het doel van de briefing (vrije tekst, bijv. "20 proefritten" → 20),
   * zoals de analyse het las. Null als het doel niet over een aantal leads gaat.
   */
  doelLeads?: number | null;
  doel?: DoelOordeel | null;
}

export type Eenheid = "aantal" | "euro" | "procent" | "seconden" | "tekst";

export interface Kerncijfer {
  label: string;
  waarde: number | string | null;
  eenheid: Eenheid;
  toelichting?: string;
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
  totaal?: (string | number | null)[];
  voetnoot?: string;
}

export interface Grafiek {
  titel: string;
  type: "lijn" | "staaf";
  x: string[];
  /** Hoogstens zes reeksen, allemaal in dezelfde eenheid (één as). */
  reeksen: { naam: string; waarden: (number | null)[] }[];
  eenheid: Exclude<Eenheid, "tekst">;
  voetnoot?: string;
}

/**
 * De vaste tabbladen van een campagne-analyse (formaat 2), in funnelvolgorde en in groepen. Een
 * sectie hoort bij een tabblad via `tab`. De volgorde en de groepen zijn een besluit van de
 * eigenaar (november 2026); verander ze samen met de prompt en de skill.
 */
export const TAB_GROEPEN = ["Media", "Content", "Website", "Resultaat"] as const;
export type TabGroep = (typeof TAB_GROEPEN)[number];

export const ANALYSE_TABBLADEN = [
  { sleutel: "bereik", naam: "Bereik", groep: "Media" },
  { sleutel: "investering", naam: "Investering", groep: "Media" },
  { sleutel: "advertenties", naam: "Advertenties", groep: "Media" },
  { sleutel: "organisch", naam: "Organische posts", groep: "Content" },
  { sleutel: "email", naam: "E-mail", groep: "Content" },
  { sleutel: "verkeer", naam: "Verkeer", groep: "Website" },
  { sleutel: "gedrag", naam: "Gedrag op de pagina", groep: "Website" },
  { sleutel: "lead-events", naam: "Lead-events", groep: "Resultaat" },
  { sleutel: "syntec", naam: "Leads in Syntec", groep: "Resultaat" },
] as const satisfies readonly { sleutel: string; naam: string; groep: TabGroep }[];

export type TabSleutel = (typeof ANALYSE_TABBLADEN)[number]["sleutel"];

/** Het oordeel over één tabblad: het stipje in de tabbalk. */
export type TabOordeel = "goed" | "aandacht" | "probleem" | "geen-data";

export const TAB_OORDEEL_NAAM: Record<TabOordeel, string> = {
  goed: "Goed",
  aandacht: "Aandacht",
  probleem: "Probleem",
  "geen-data": "Geen data",
};

export interface Sectie {
  stap: number;
  titel: string;
  ondertitel?: string;
  /** Formaat 2: bij welk tabblad de sectie hoort. Ontbreekt hij, dan wordt de sectie een eigen tabblad. */
  tab?: TabSleutel | string;
  /** Het eerste kerncijfer is het hoofdgetal dat in de tabbalk staat. */
  kerncijfers?: Kerncijfer[];
  /** Links: alleen hoe je de cijfers leest (twee of drie zinnen). Oordelen staan rechts. */
  tekst?: string;
  tabellen?: Tabel[];
  grafieken?: Grafiek[];
  /** Formaat 2, rechterkolom: één zin met het oordeel over dit onderdeel. */
  kop?: string;
  oordeel?: TabOordeel;
  /** Formaat 2, rechterkolom: twee tot vijf korte bevindingen, elk met het cijfer erbij. */
  bevindingen?: string[];
  /** Formaat 2, rechterkolom: nul tot drie acties voor dit onderdeel. */
  acties?: Aanbeveling[];
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
  /**
   * Formaat 2, alleen bij de overkoepelende acties (`MaResultaat.aanbevelingen`): de tabbladen
   * waar de onderbouwing staat.
   */
  tabs?: TabSleutel[];
}

/** Wat de analyse aan de campagne heeft toegerekend, en waarom. */
export interface Herkenning {
  bron: string;
  soort: string;
  naam: string;
  reden: string;
  zekerheid?: "zeker" | "waarschijnlijk" | "twijfel";
}

/** Wat de analyse met een regel uit de Data correctie heeft gedaan. */
export interface CorrectieVerwerking {
  correctie: string;
  verwerking: string;
}

/** Een correctie die voor alle campagnes lijkt te gelden: voorstel voor de semantic layer. */
export interface SemantiekVoorstel {
  /** Het blok, bijv. "Google Analytics 4" of "Algemeen". */
  blok: string;
  voorstel: string;
  reden: string;
}

export interface MaResultaat {
  /**
   * 1: secties onder elkaar, inzichten en aanbevelingen onderaan (versies tot 24 november 2026).
   * 2: secties per tabblad met bevindingen en acties rechts; `aanbevelingen` zijn de acties
   * voor de campagne als geheel en `inzichten` vervallen.
   */
  formaat: 1 | 2;
  samenvatting: {
    /** Eén zin: het oordeel. */
    kop: string;
    /** Hoogstens vijf korte regels, ook leesbaar voor het management. */
    regels: string[];
    /** Optioneel: verdere toelichting (Markdown). */
    tekst?: string;
  };
  doel?: DoelOordeel;
  /** Niet meer getoond (de hoofdgetallen staan in de tabbalk); blijft voor oudere versies. */
  funnel: FunnelStap[];
  secties: Sectie[];
  /** Alleen formaat 1. */
  inzichten?: Inzicht[];
  /** Formaat 1: alle aanbevelingen. Formaat 2: de acties voor de campagne als geheel. */
  aanbevelingen?: Aanbeveling[];
  herkenning: Herkenning[];
  /** Welke bronnen er gebruikt zijn (bijv. "Windsor · Meta Ads · Van den Udenhout"). */
  bronnen?: string[];
  correcties?: CorrectieVerwerking[];
  semantiekVoorstellen?: SemantiekVoorstel[];
  datakwaliteit?: string[];
}

export interface MaOverzichtRegel extends MaCampagne {
  laatsteAnalyse: {
    id: string;
    versie: number;
    /** Null bij een rapportage. */
    label: Label | null;
    geanalyseerdOp: string;
    kerncijfers: MaKerncijfers;
  } | null;
  aantalAnalyses: number;
  /** Hoeveel adressen een mail krijgen bij een nieuwe versie. */
  aantalVolgers: number;
}

/** Iemand die een mail krijgt bij een nieuwe analyse van een campagne. */
export interface MaVolger {
  id: string;
  email: string;
  toegevoegdOp: string;
  /** Het adres van de ingelogde gebruiker zelf. */
  ikZelf: boolean;
  magVerwijderen: boolean;
}

export interface MaVersie {
  id: string;
  versie: number;
  label: Label | null;
  geanalyseerdOp: string;
}

export interface MaAnalyse {
  id: string;
  campagneId: string;
  versie: number;
  label: Label | null;
  geanalyseerdOp: string;
  periodeVan: string | null;
  periodeTot: string | null;
  /** `bedrijf` (één tekst) staat in versies van vóór migratie 0045. */
  briefing: Partial<MaCampagneInvoer> & { opzet?: string; formulier?: Formulier; bedrijf?: string };
  promptVersie: number | null;
  semantiekVersie: number | null;
  model: string | null;
  kerncijfers: MaKerncijfers;
  resultaat: MaResultaat;
}

export interface MaPrompt {
  id: string | null;
  opzetId: string;
  versie: number;
  inhoud: string;
  opgeslagenOp: string | null;
  opgeslagenDoorNaam: string | null;
  /** Nog niets opgeslagen: de standaardtekst uit de code geldt (bij een andere opzet dan Campagne analyse: leeg). */
  standaard: boolean;
}

/** De blokken van de semantic layer, in vaste volgorde. */
export const SEMANTIEK_BLOKKEN = [
  { sleutel: "algemeen", naam: "Algemeen" },
  { sleutel: "google_ads", naam: "Google Ads" },
  { sleutel: "meta_ads", naam: "Meta Ads" },
  { sleutel: "linkedin_ads", naam: "LinkedIn Ads" },
  { sleutel: "facebook", naam: "Facebook (organisch)" },
  { sleutel: "instagram", naam: "Instagram (organisch)" },
  { sleutel: "linkedin_organisch", naam: "LinkedIn (organisch)" },
  { sleutel: "ga4", naam: "Google Analytics 4" },
  { sleutel: "data_leads", naam: "Data leads (Syntec)" },
  { sleutel: "kanaalkosten", naam: "Extra kanaalkosten" },
] as const;

export type SemantiekSleutel = (typeof SEMANTIEK_BLOKKEN)[number]["sleutel"];

export interface SemantiekInhoud {
  /** De bedrijven voor de keuzelijst in de briefing. */
  bedrijven: string[];
  blokken: Record<SemantiekSleutel, string>;
}

export interface MaSemantiek {
  id: string | null;
  versie: number;
  inhoud: SemantiekInhoud;
  opgeslagenOp: string | null;
  opgeslagenDoorNaam: string | null;
  standaard: boolean;
}
