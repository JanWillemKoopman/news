/**
 * Marketing analyse — de vormen die Claude Code wegschrijft en het dashboard toont.
 *
 * De verdeling van werk (zie campagne-analyse-tool.md):
 *  - De **hoofdprompt** (`marketing_analyse_prompts`) zegt hoe er geanalyseerd en geoordeeld
 *    wordt, met een hoofdstuk per label (tussentijdse evaluatie, eindevaluatie).
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

/** De briefing die het team invult. */
export interface MaCampagne {
  id: string;
  naam: string;
  bedrijf: string;
  merk: string | null;
  modellen: string[];
  startdatum: string | null;
  einddatum: string | null;
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
  "naam" | "bedrijf" | "merk" | "modellen" | "startdatum" | "einddatum" | "doel" | "budget" | "omschrijving" | "dataCorrectie"
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
  /** Mediakosten (advertentieaccounts) plus de verdeelde extra kanaalkosten, in euro. */
  kosten?: number | null;
  /** Vertoningen betaald + organisch. */
  vertoningen?: number | null;
  /** Klikken op advertenties. */
  klikken?: number | null;
  /** Sessies die op de campagnepagina('s) begonnen (GA4). */
  sessies?: number | null;
  /** Lead-events in sessies die op de campagnepagina begonnen (GA4). */
  leadEvents?: number | null;
  /** Leads in Syntec (Data leads) voor merk/model in de periode; alleen Van den Udenhout. */
  leadsSyntec?: number | null;
  /** Waarvan via kanaalgroep Internet. */
  leadsSyntecInternet?: number | null;
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

export interface Sectie {
  stap: number;
  titel: string;
  ondertitel?: string;
  kerncijfers?: Kerncijfer[];
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
  formaat: 1;
  samenvatting: {
    /** Eén zin: het oordeel. */
    kop: string;
    /** Hoogstens vijf korte regels, ook leesbaar voor het management. */
    regels: string[];
    /** Optioneel: verdere toelichting (Markdown). */
    tekst?: string;
  };
  doel?: DoelOordeel;
  funnel: FunnelStap[];
  secties: Sectie[];
  inzichten?: Inzicht[];
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
    label: Label;
    geanalyseerdOp: string;
    kerncijfers: MaKerncijfers;
  } | null;
  aantalAnalyses: number;
}

export interface MaVersie {
  id: string;
  versie: number;
  label: Label;
  geanalyseerdOp: string;
}

export interface MaAnalyse {
  id: string;
  campagneId: string;
  versie: number;
  label: Label;
  geanalyseerdOp: string;
  periodeVan: string | null;
  periodeTot: string | null;
  briefing: Partial<MaCampagneInvoer>;
  promptVersie: number | null;
  semantiekVersie: number | null;
  model: string | null;
  kerncijfers: MaKerncijfers;
  resultaat: MaResultaat;
}

export interface MaPrompt {
  id: string | null;
  versie: number;
  inhoud: string;
  opgeslagenOp: string | null;
  opgeslagenDoorNaam: string | null;
  /** Nog niets opgeslagen: de standaardtekst uit de code geldt. */
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
