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

/** Het enige bedrijf waarvoor de leads en orders uit Syntec ("Data leads", "Data orders") van toepassing zijn. */
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

/**
 * Hoe vaak de analyseronde een analyse maakt (migratie 0049, plan §17). Uit = nooit, ook geen
 * eindevaluatie; een losse analyse kan nog wel. De rekenregel staat in `planning.ts`.
 */
export type Planning = "uit" | "week" | "maand" | "kwartaal";

export const PLANNINGEN: readonly Planning[] = ["uit", "week", "maand", "kwartaal"];

export const PLANNING_NAAM: Record<Planning, string> = {
  uit: "Uit",
  week: "Wekelijks",
  maand: "Maandelijks",
  kwartaal: "Per kwartaal",
};

export function isPlanning(x: unknown): x is Planning {
  return typeof x === "string" && (PLANNINGEN as readonly string[]).includes(x);
}

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
  /** De planning die een nieuwe analyse met deze opzet krijgt. */
  standaardPlanning: Planning;
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
  /** De campagnepagina('s), volledige URL's. Leeg bij een rapportage. */
  campagnePaginas: string[];
  dataCorrectie: string | null;
  dataCorrectieBijgewerktOp: string | null;
  /** Hoe vaak de analyseronde deze analyse maakt. */
  planning: Planning;
  /** Loopt mee met de planning (planning ≠ uit); lees `planning`. */
  analyseRonde: boolean;
  /** Uit welk voorstel de campagne kwam (migratie 0046); null als hij met de hand is aangemaakt. */
  voorstelId: string | null;
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
  | "campagnePaginas"
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
 * Waar het leadcijfer van een Campagne analyse vandaan komt (besluit van de eigenaar,
 * 25 november 2026): standaard Google Analytics; Syntec alleen als het doel in de briefing dat
 * expliciet zegt, en dan alleen leads met Kanaalgroep "Internet" én "udenhout.nl" in Kanaal of
 * Onderwerp (view `marketing_analyse_leads_website`). Nooit opgeteld of gemengd.
 */
export type LeadBron = "syntec" | "ga4";

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
  /** Alle lead-events in sessies die op de campagnepagina begonnen (GA4); context. */
  leadEvents?: number | null;
  /**
   * Leads in Syntec voor merk/model in de periode, alleen websiteleads van udenhout.nl
   * (Kanaalgroep "Internet" én "udenhout.nl" in Kanaal of Onderwerp); alleen Van den Udenhout.
   */
  leadsSyntec?: number | null;
  /** Vervallen sinds 25 november 2026 (alles in `leadsSyntec` is al Internet); oude versies hebben hem nog. */
  leadsSyntecInternet?: number | null;
  /**
   * De drie cijfers in de leadkolom van het overzicht (besluit van de eigenaar, 27 november 2026).
   * `leadsGa4`: de lead-events van de soort uit het doel in sessies die op de campagnepagina
   * begonnen (GA4), altijd, ook als het leadcijfer tegen het doel uit Syntec komt.
   */
  leadsGa4?: number | null;
  /**
   * Internetleads in Syntec (Kanaalgroep "Internet", alle kanalen daarbinnen) voor merk en
   * modellen in de periode, van de soort die de briefing noemt (anders alle soorten). Alleen als
   * Van den Udenhout in de briefing staat (bij meer bedrijven alleen dat deel) én de briefing een
   * merk en minstens één model heeft; anders null.
   */
  leadsInternet?: number | null;
  /** Wat er in `leadsInternet` is geteld, in gewone taal ("proefritten", "alle soorten"). */
  leadsInternetSoort?: string | null;
  /**
   * Orders in Syntec voor merk en modellen in de periode. Standaard alle klantgroepen van Nieuw
   * en Gebruikt; de briefing kan dat beperken ("alleen koop particulier"). Zelfde voorwaarden als
   * `leadsInternet`; anders null.
   */
  ordersSyntec?: number | null;
  /** Welke orders er in `ordersSyntec` zijn geteld, in gewone taal ("alle orders, nieuw en gebruikt"). */
  ordersSoort?: string | null;
  /** Uit welke bron `leadsDoel` komt. */
  leadBron?: LeadBron | null;
  /**
   * HET leadcijfer van de campagne, dat het overzicht tegen het doel zet: de leads van de soort
   * uit het doel ("20 proefritten" → alleen proefritten), uit `leadBron`. Bij GA4 de lead-events
   * van die soort in sessies die op de campagnepagina begonnen; bij Syntec de websiteleads van
   * die soort.
   */
  leadsDoel?: number | null;
  /** Welke soort er in `leadsDoel` is geteld, in gewone taal ("proefritten", "alle autoleads"). */
  leadsDoelSoort?: string | null;
  /**
   * Het aantal leads uit het doel van de briefing (vrije tekst, bijv. "20 proefritten" → 20),
   * zoals de analyse het las. Null als het doel niet over een aantal leads gaat.
   */
  doelLeads?: number | null;
  doel?: DoelOordeel | null;
  /**
   * De uitsplitsing achter de cijfers hierboven, voor de hover in Campagne analyse (28 november 2026).
   * De analyse levert hem mee; het dashboard toont een blok alleen als de rijen precies optellen
   * tot het cijfer waar ze bij horen (`leesUitsplitsing` in `uitsplitsing.ts`), anders niet.
   */
  uitsplitsing?: MaUitsplitsing | null;
}

/** Eén regel van een uitsplitsing: een naam, eventueel een technische naam erbij, en een aantal. */
export interface MaUitsplitsingRegel {
  naam: string;
  /** Bijv. de eventnaam `generate_lead_proefrit` bij de naam "Proefrit". */
  detail?: string | null;
  aantal: number;
}

/** Eén advertentieplatform: dezelfde definities als `kosten`, `vertoningenAds` en `klikken`. */
export interface MaUitsplitsingPlatform {
  /** "Google Ads", "Meta Ads" of "LinkedIn Ads". */
  naam: string;
  kosten: number | null;
  vertoningen: number | null;
  klikken: number | null;
}

/** Een lead-event in GA4; `telt` = hoort bij de soort uit het doel, dus bij `leadsGa4`. */
export interface MaUitsplitsingEvent extends MaUitsplitsingRegel {
  telt: boolean;
}

export interface MaUitsplitsing {
  /** Per advertentieplatform; kosten, vertoningen en klikken tellen op tot `kosten`, `vertoningenAds` en `klikken`. */
  platforms?: MaUitsplitsingPlatform[] | null;
  /** Per kanaal; de sessies tellen op tot `sessies`. */
  sessies?: MaUitsplitsingRegel[] | null;
  /** De lead-events op de campagnepagina; de regels met `telt` tellen op tot `leadsGa4`, alle regels tot `leadEvents`. */
  leadsGa4?: MaUitsplitsingEvent[] | null;
  /**
   * De leads in Google Analytics (`leadsGa4`, dus van de soort uit het doel) per kanaal, ook organisch en
   * direct; tellen op tot `leadsGa4`. Een kanaal van betaald verkeer heet precies zoals het platform in
   * `platforms`, zodat het dashboard de mediakosten per lead per platform kan uitrekenen.
   */
  leadsKanaal?: MaUitsplitsingRegel[] | null;
  /** De Syntec-internetleads per soort; tellen op tot `leadsInternet`. */
  leadsInternet?: MaUitsplitsingRegel[] | null;
  /** De Syntec-orders per klantgroep; tellen op tot `ordersSyntec`. */
  orders?: MaUitsplitsingRegel[] | null;
}

export type Eenheid = "aantal" | "euro" | "procent" | "seconden" | "tekst";

/**
 * Hoe een kerncijfer zich verhoudt tot soortgelijke campagnes of posts uit onze eigen historie
 * (besluit van de eigenaar, 25 november 2026; plan §20). De analyse rekent het cijfer per
 * vergelijkbaar item uit en geeft de verdeling mee; het dashboard bepaalt zelf het oordeel
 * (`benchmarkOordeel`): onder het eerste kwart is slechter, boven het derde kwart beter.
 */
export interface KerncijferBenchmark {
  /** Waarmee vergeleken is, in gewone taal: "18 organische posts van dezelfde accounts, afgelopen 12 maanden". */
  groep: string;
  /** Hoeveel campagnes of posts in de vergelijking zitten; onder de 5 wordt hij niet getoond. */
  aantal: number;
  mediaan: number;
  /** Eerste en derde kwartiel: de middelste helft van de vergelijkingsgroep. */
  p25: number;
  p75: number;
  /** Laagste en hoogste waarde in de groep, voor de schaal van de balk. */
  min?: number;
  max?: number;
  /** False bij kosten (kosten per klik, per sessie, per lead): dan is lager beter. Standaard true. */
  hogerIsBeter?: boolean;
}

export interface Kerncijfer {
  label: string;
  waarde: number | string | null;
  eenheid: Eenheid;
  toelichting?: string;
  /**
   * Hetzelfde cijfer over een eerdere periode (bij een maandrapport: de maand ervoor). Het dashboard
   * rekent het verschil zelf uit (`vergelijkingVerschil`). `hogerIsBeter` kleurt het verschil:
   * true = stijging is gunstig, false = daling is gunstig (kosten per lead), weglaten = geen oordeel
   * (uitgaven).
   */
  vergelijking?: { label: string; waarde: number | null; hogerIsBeter?: boolean };
  benchmark?: KerncijferBenchmark;
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
 * De vaste stappen van een campagne-analyse, in funnelvolgorde en in groepen. Een sectie hoort bij
 * een stap via `tab`. De volgorde en de groepen zijn een besluit van de eigenaar; verander ze samen
 * met de prompt en de skill.
 *
 * Formaat 3 (25 november 2026, opzet A, plan §21): de funnel zoals de eigenaar hem beschreef.
 * Advertenties (met bereik en investering), organische social en e-mail brengen verkeer naar de
 * campagnepagina; daar kijken we wat bezoekers doen, welke conversies ze doen en waar ze daarna
 * heen gaan op de website; daarna leads en orders in Syntec.
 */
export const TAB_GROEPEN = ["Media", "Content", "Website", "Resultaat"] as const;
export type TabGroep = (typeof TAB_GROEPEN)[number];

export const ANALYSE_TABBLADEN = [
  { sleutel: "advertenties", naam: "Advertenties", groep: "Media" },
  { sleutel: "organisch", naam: "Organische social", groep: "Media" },
  { sleutel: "email", naam: "E-mail", groep: "Media" },
  { sleutel: "campagnepagina", naam: "Campagnepagina", groep: "Website" },
  { sleutel: "conversies", naam: "Conversies", groep: "Website" },
  { sleutel: "vervolg", naam: "Vervolg op de website", groep: "Website" },
  { sleutel: "syntec", naam: "Leads in Syntec", groep: "Resultaat" },
  { sleutel: "orders", naam: "Orders in Syntec", groep: "Resultaat" },
] as const satisfies readonly { sleutel: string; naam: string; groep: TabGroep }[];

/** Formaat 2 (24 november 2026, plan §14): de tabbladen van de versies van vóór formaat 3. */
export const ANALYSE_TABBLADEN_V2 = [
  { sleutel: "bereik", naam: "Bereik", groep: "Media" },
  { sleutel: "investering", naam: "Investering", groep: "Media" },
  { sleutel: "advertenties", naam: "Advertenties", groep: "Media" },
  { sleutel: "organisch", naam: "Organische posts", groep: "Content" },
  { sleutel: "email", naam: "E-mail", groep: "Content" },
  { sleutel: "verkeer", naam: "Verkeer", groep: "Website" },
  { sleutel: "gedrag", naam: "Gedrag op de pagina", groep: "Website" },
  { sleutel: "lead-events", naam: "Lead-events", groep: "Resultaat" },
  { sleutel: "syntec", naam: "Leads in Syntec", groep: "Resultaat" },
  { sleutel: "orders", naam: "Orders in Syntec", groep: "Resultaat" },
] as const satisfies readonly { sleutel: string; naam: string; groep: TabGroep }[];

export type TabSleutel = (typeof ANALYSE_TABBLADEN)[number]["sleutel"] | (typeof ANALYSE_TABBLADEN_V2)[number]["sleutel"];

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
  /**
   * Alleen bij een rapportage: de groep in de navigatie links (bijv. "E-mail", "Website",
   * "Resultaat"). Opeenvolgende stappen met dezelfde groep staan onder één kopje.
   */
  groep?: string;
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

/** Een cijfer bij een datapunt in de Dataverantwoording (uitgaven, bereik, sessies, opens …). */
export interface HerkenningCijfer {
  label: string;
  waarde: number;
  eenheid: Eenheid;
}

/**
 * Wat de analyse aan de campagne heeft toegerekend, en waarom: één datapunt per rij in de
 * Dataverantwoording (plan §25). Alles behalve bron, soort, naam en reden is optioneel, zodat
 * versies van vóór 28 november 2026 gewoon blijven werken.
 */
export interface Herkenning {
  bron: string;
  /** campagne | advertentie | post | pagina | event | mailing | filter … */
  soort: string;
  naam: string;
  reden: string;
  zekerheid?: "zeker" | "waarschijnlijk" | "twijfel";
  /** Stabiel tussen versies: `<bron>:<soort>:<extern id, pad of naam>`. Zonder: `herkenningSleutel`. */
  sleutel?: string;
  /** Standaard true. false = mogelijk touchpoint dat de analyse bekeek maar niet meenam. */
  opgenomen?: boolean;
  /** Het belangrijkste cijfer eerst; bij een mailing bijv. verzonden, opens en klikken. */
  cijfers?: HerkenningCijfer[];
  /** Post of mailing: de datum; campagne: de start. JJJJ-MM-DD. */
  datum?: string;
  /** Campagne: het einde van de looptijd binnen de analyse. */
  tot?: string;
  url?: string;
  account?: string;
  /** Meegenomen of weggelaten door een regel uit de Data correctie. */
  viaCorrectie?: "meenemen" | "weglaten";
}

/** Hoe er per bron is gefilterd (de kop boven de rijen van die bron in de Dataverantwoording). */
export interface BronFilter {
  bron: string;
  accounts?: string[];
  /** In gewone taal: "campagnenaam bevat A2". */
  filter: string;
  periode?: string;
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

/**
 * Formaat 4: het Maandrapport (opzet "Maandrapport Jana", 27 november 2026). Een eigen weergave
 * met één tabblad per bedrijf en alleen resultaten: geen samenvatting, oordelen, benchmarks of
 * acties. Elk cijfer van de rapportmaand staat naast dat van de maand ervoor; het dashboard rekent
 * het verschil en de forecast zelf uit (`maandrapportForecast` in `maandrapport.ts`).
 */
export const MAANDRAPPORT_OPZET_ID = "7d0c0000-0000-4000-8000-000000000007";

/** De tabbladen van het Maandrapport, in vaste volgorde; het eerste staat open. */
export const MAANDRAPPORT_BEDRIJVEN = [
  "Porsche Centrum Brabant",
  "Porsche Centrum Maastricht",
  "Bentley Maastricht",
  "PGZ",
] as const;

/** Een waarde van de rapportmaand met dezelfde waarde van de maand ervoor. */
export interface MrWaarde {
  waarde: number | null;
  vorige?: number | null;
}

/** Een regel van een uitsplitsing die bij hover getoond wordt (leadsoort, betaald/organisch, platform). */
export interface MrUitsplitsing extends MrWaarde {
  label: string;
}

/** Een tegel bovenaan: groot cijfer, vergelijking met de vorige maand, maandreeks en uitsplitsing. */
export interface MrTegel extends MrWaarde {
  /** Per kalendermaand (x = JJJJ-MM), t/m de rapportmaand; de sparkline en, bij leads, de trendgrafiek. */
  reeks?: { x: string[]; waarden: (number | null)[] };
  uitsplitsing?: MrUitsplitsing[];
  /** Gewone taal: hoe dit cijfer gemeten is (hoogstens één regel). */
  toelichting?: string;
  /** Staat er een tekst, dan is er geen cijfer ("niet gemeten") en toont de tegel die tekst. */
  nietGemeten?: string;
}

export interface MrUitgaven extends MrWaarde {
  /** Uitgaven van 1 januari t/m de rapportmaand. */
  jaarTotaal: number | null;
  /** Tijdelijk: `jaarTotaal` × 1,22, tot het echte jaarbudget er is (semantic layer, blok Maandrapport). */
  jaarbudget: number | null;
  /** Per platform: Google Ads, Meta Ads, LinkedIn Ads. */
  uitsplitsing?: MrUitsplitsing[];
  nietGemeten?: string;
}

export interface MrKanaal extends MrWaarde {
  kanaal: string;
}

export interface MrTopContent {
  kanaal: string;
  account: string;
  datum?: string | null;
  /** De (ingekorte) tekst van de post. */
  titel: string;
  url?: string | null;
  /** Een data-URL (het beeld is bij het maken van het rapport opgehaald) of een https-adres. */
  afbeelding?: string | null;
  /** De maat waarop gekozen is, bijv. "Engagement rate" 4,1%. */
  metriek: { label: string; waarde: number | null; eenheid: Eenheid };
  /** Wat de lezer erbij leest: de post tegen het gemiddelde van het account. Het enige oordeel in het rapport. */
  waarom: string;
}

export interface MrCampagne {
  campagne: string;
  /** Google Ads, Meta Ads of LinkedIn Ads. */
  platform: string;
  uitgaven: MrWaarde;
  /** Wat het platform zelf als lead telt; null = het platform levert geen leads ("n.v.t."). */
  leads: MrWaarde;
  /** Kosten per lead: uitgaven ÷ leads; null zonder leads. */
  cpl: MrWaarde;
}

export interface MrSocialKanaal {
  kanaal: string;
  account: string;
  volgers: MrWaarde;
  bereik: MrWaarde;
  vertoningen?: MrWaarde;
  likes: MrWaarde;
  reacties: MrWaarde;
  posts?: MrWaarde;
}

export interface MrBedrijf {
  naam: string;
  leads: MrTegel;
  sessies: MrTegel;
  bereik: MrTegel;
  uitgaven: MrUitgaven;
  /** Sessies per kanaal (de cirkel); het dashboard rekent de percentages uit. */
  kanalen: MrKanaal[];
  topContent?: MrTopContent | null;
  /** Waarom er geen top content is ("geen organisch account gekoppeld"). */
  topContentReden?: string;
  /** Alle advertentiecampagnes van de maand; het dashboard sorteert op uitgaven, hoog naar laag. */
  campagnes: MrCampagne[];
  socialKanalen: MrSocialKanaal[];
  /** Waarom er geen socialkanalen zijn ("geen organisch account gekoppeld"). */
  socialReden?: string;
  /**
   * De analyse van dit tabblad voor de mail bij een nieuw rapport (`mailMaandrapport.ts`): vijf tot zeven
   * zinnen, hoogstens zeven punten, die verklaren wat de cijfers doen (welk soort lead, uit welke kanalen,
   * welke campagnes). Alleen in de mail; het dashboard toont ze niet en blijft puur beschrijvend.
   */
  mailPunten?: string[];
}

export interface MaMaandrapport {
  /** De rapportmaand, JJJJ-MM. */
  maand: string;
  /** De maand ervoor, JJJJ-MM. */
  vorigeMaand: string;
  bedrijven: MrBedrijf[];
}

export interface MaResultaat {
  /**
   * 1: secties onder elkaar, inzichten en aanbevelingen onderaan (versies tot 24 november 2026).
   * 2: secties per tabblad met bevindingen en acties; `aanbevelingen` zijn de acties voor de
   * campagne als geheel en `inzichten` vervallen (`ANALYSE_TABBLADEN_V2`).
   * 3: hetzelfde, met de stappen van `ANALYSE_TABBLADEN` (vanaf 25 november 2026, plan §21).
   * 4: het Maandrapport: alleen `maandrapport`, geen stappen, samenvatting of oordelen.
   */
  formaat: 1 | 2 | 3 | 4;
  samenvatting: {
    /** Eén zin: het oordeel. */
    kop: string;
    /** Hoogstens vijf korte regels, ook leesbaar voor het management. */
    regels: string[];
    /** Optioneel: verdere toelichting (Markdown). */
    tekst?: string;
  };
  /** Alleen formaat 4. */
  maandrapport?: MaMaandrapport;
  doel?: DoelOordeel;
  /** Niet meer getoond (de hoofdgetallen staan in de tabbalk); blijft voor oudere versies. */
  funnel: FunnelStap[];
  secties: Sectie[];
  /** Alleen formaat 1. */
  inzichten?: Inzicht[];
  /** Formaat 1: alle aanbevelingen. Formaat 2 en 3: de acties voor de campagne als geheel. */
  aanbevelingen?: Aanbeveling[];
  herkenning: Herkenning[];
  /** Welke bronnen er gebruikt zijn (bijv. "Windsor · Meta Ads · Van den Udenhout"). */
  bronnen?: string[];
  /** Per bron hoe er gefilterd is (plan §25); oudere versies hebben alleen `bronnen`. */
  bronFilters?: BronFilter[];
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
  /** Het merk via E-mailinstellingen waardoor dit adres erbij kwam; leeg als iemand het zelf toevoegde. */
  viaMerk: string | null;
}

/** Een adres dat standaard volger wordt van elke nieuwe analyse voor een merk (E-mailinstellingen). */
export interface MaMerkMail {
  id: string;
  /** Het merk zoals het in de lijst staat ("Škoda"). */
  merk: string;
  email: string;
  toegevoegdOp: string;
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
  { sleutel: "data_orders", naam: "Syntec orders" },
  { sleutel: "kanaalkosten", naam: "Extra kanaalkosten" },
  { sleutel: "werving", naam: "Werving (HRM campagne)" },
  { sleutel: "maandrapport", naam: "Maandrapport Jana" },
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

// ---------------------------------------------------------------------------
// Voorgestelde campagne analyses (migratie 0046, campagne-voorstellen-plan.md)
// ---------------------------------------------------------------------------

export type VoorstelStatus = "open" | "toegevoegd" | "genegeerd" | "verlopen";
export type Zekerheid = "zeker" | "waarschijnlijk" | "twijfel";

export const ZEKERHEID_NAAM: Record<Zekerheid, string> = {
  zeker: "Zeker",
  waarschijnlijk: "Waarschijnlijk",
  twijfel: "Twijfel",
};

/** Een platformcampagne die bij het voorstel hoort, uit het bewijs. */
export interface VoorstelPlatformCampagne {
  platform: string;
  campagne: string;
  uitgaven?: number | null;
  laatsteUitgave?: string | null;
}

/** Een organische post over hetzelfde onderwerp, uit het bewijs. */
export interface VoorstelPost {
  kanaal: string;
  datum?: string | null;
  tekst?: string | null;
  url?: string | null;
}

/** Wat de skill heeft gevonden; alles optioneel, want het komt uit vrije JSON. */
export interface VoorstelBewijs {
  platformCampagnes?: VoorstelPlatformCampagne[];
  ga4?: { sessies?: number | null; leadEvents?: number | null; periode?: string | null; toelichting?: string | null } | null;
  posts?: VoorstelPost[];
  kanttekeningen?: string[];
}

export interface MaVoorstel {
  id: string;
  status: VoorstelStatus;
  naam: string;
  bedrijven: string[];
  merk: string | null;
  modellen: string[];
  startdatum: string | null;
  einddatum: string | null;
  budget: number | null;
  doel: string | null;
  omschrijving: string | null;
  campagnePaginas: string[];
  zekerheid: Zekerheid;
  reden: string | null;
  kanalen: string[];
  uitgavenTotNu: number | null;
  laatsteUitgaveOp: string | null;
  bewijs: VoorstelBewijs;
  gevondenOp: string;
  laatstGezienOp: string;
}

export interface MaZoekronde {
  gezochtOp: string;
  aantalNieuw: number;
  aantalBijgewerkt: number;
  aantalOvergeslagen: number;
  aantalVerlopen: number;
}

/** Een afgevinkte actie uit "Wat nu te doen" van een versie (migratie 0051). */
export interface MaActieKlaar {
  /** `geheel-<plek in MaResultaat.aanbevelingen>` */
  actie: string;
  afgevinktOp: string;
  /** Naam uit het profiel van wie afvinkte; null als die geen naam heeft. */
  door: string | null;
}
