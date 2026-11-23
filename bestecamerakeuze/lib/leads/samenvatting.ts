import {
  PLATFORMEN_MET_KOSTEN,
  PLATFORM_LABEL,
  heeftKostenbron,
  type BetaaldPlatform,
} from "@/lib/leads/kanaal";
import type { LeadRegel } from "@/lib/leads/koppel";

/**
 * Rekenwerk voor het tabblad Leads: filteren, groeperen en optellen.
 *
 * Staat los van React, zodat het getest kan worden en zodat elk getal op de pagina uit
 * dezelfde functies komt. De pagina haalt de regels één keer op en filtert daarna in het
 * geheugen — net als op de andere Kanalen-pagina's kost een klik op een filter dus geen
 * netwerkronde.
 *
 * ## Betaald is niet hetzelfde als "kosten bekend"
 *
 * Een lead is **betaald** als het verkeer betaald was (`platform !== null`). Zijn kosten
 * zijn daarmee nog niet bekend: Bing en LinkedIn zijn betaald, maar hebben geen
 * kostenbron. Daarom is "kosten per betaalde lead" gedeeld door alleen de leads waarvan
 * de kosten bekend zijn (`metKosten`) — anders trekt elke Bing-lead de gemiddelde prijs
 * omlaag met een lead waarvan niemand weet wat hij kostte.
 */

export type BetaaldFilter = "alle" | "betaald" | "onbetaald";

export interface LeadFilters {
  /** Lege lijst = geen filter. */
  events: string[];
  /** Het kanaal zoals dit dashboard het afleidt ("Google Ads", "Direct", …). */
  kanalen: string[];
  /**
   * De sessiebron/medium zoals GA4 hem levert, onbewerkt ("google / cpc",
   * "gaspedaal.nl / referral"). Het kanaal hierboven is een samenvatting daarvan; dit is
   * de waarde zelf, voor wie wil weten welke bron precies de lead bracht.
   */
  bronMedia: string[];
  /** De sessiecampagne zoals GA4 hem levert, onbewerkt ("T | Branding VDU", "(organic)"). */
  campagnes: string[];
  merken: string[];
  betaald: BetaaldFilter;
}

export const GEEN_FILTERS: LeadFilters = {
  events: [],
  kanalen: [],
  bronMedia: [],
  campagnes: [],
  merken: [],
  betaald: "alle",
};

/** Staat er minstens één filter aan? */
export function heeftFilters(f: LeadFilters): boolean {
  return (
    f.events.length > 0 ||
    f.kanalen.length > 0 ||
    f.bronMedia.length > 0 ||
    f.campagnes.length > 0 ||
    f.merken.length > 0 ||
    f.betaald !== "alle"
  );
}

/** "Onbekend" voor een lege merk-, model-, formulier-, bron- of campagnewaarde. */
export const ONBEKEND = "Onbekend";

export function waardeOfOnbekend(waarde: string): string {
  return waarde === "" ? ONBEKEND : waarde;
}

/** Past een regel binnen de filters? */
export function voldoetAanFilters(r: LeadRegel, f: LeadFilters): boolean {
  if (f.events.length > 0 && !f.events.includes(r.event)) return false;
  if (f.kanalen.length > 0 && !f.kanalen.includes(r.kanaal)) return false;
  if (f.bronMedia.length > 0 && !f.bronMedia.includes(waardeOfOnbekend(r.bronMedium))) return false;
  if (f.campagnes.length > 0 && !f.campagnes.includes(waardeOfOnbekend(r.campagne))) return false;
  if (f.merken.length > 0 && !f.merken.includes(waardeOfOnbekend(r.merk))) return false;
  if (f.betaald === "betaald" && r.platform === null) return false;
  if (f.betaald === "onbetaald" && r.platform !== null) return false;
  return true;
}

export function filterRegels(regels: LeadRegel[], f: LeadFilters): LeadRegel[] {
  return regels.filter((r) => voldoetAanFilters(r, f));
}

export interface Totalen {
  leads: number;
  betaald: number;
  onbetaald: number;
  /** Betaalde leads waarvan we de kosten kennen. */
  metKosten: number;
  /** Betaalde leads zonder kostenbron of zonder gevonden campagne. */
  zonderKosten: number;
  /** Som van de toegerekende kosten. */
  kosten: number;
  /**
   * Betaalde leads van platformen waarvan we de kosten kennen (Google en Meta), ook als hun
   * campagne niet te vinden was. Dit is de noemer van "totale uitgaven ÷ betaalde leads":
   * alles wat Google en Meta uitgaven, gedeeld door alle leads die zij brachten.
   */
  kostenbronLeads: number;
}

export function telTotalen(regels: LeadRegel[]): Totalen {
  const t: Totalen = {
    leads: 0,
    betaald: 0,
    onbetaald: 0,
    metKosten: 0,
    zonderKosten: 0,
    kosten: 0,
    kostenbronLeads: 0,
  };
  for (const r of regels) {
    t.leads += r.aantal;
    if (r.platform === null) {
      t.onbetaald += r.aantal;
      continue;
    }
    t.betaald += r.aantal;
    if (heeftKostenbron(r.platform) || (r.handmatigeKosten ?? 0) > 0) t.kostenbronLeads += r.aantal;
    if (r.status === "toegerekend") {
      t.metKosten += r.aantal;
      t.kosten += r.kosten ?? 0;
    } else {
      t.zonderKosten += r.aantal;
    }
  }
  return t;
}

/** Kosten per betaalde lead, gedeeld door de leads waarvan de kosten bekend zijn. */
export function kostenPerLead(t: Pick<Totalen, "kosten" | "metKosten">): number | null {
  return t.metKosten > 0 ? t.kosten / t.metKosten : null;
}

/**
 * Kosten per betaalde lead voor een totaalregel of kerncijfer.
 *
 * Zonder filters: **alle** uitgaven van Google en Meta, gedeeld door **alle** betaalde leads
 * van Google en Meta. Dat is het getal waar de vraag "wat kost een lead ons" om vraagt, en
 * het is inclusief de campagnes die niets opleverden — wie die weglaat, rekent zich rijk.
 *
 * Met een filter bestaat dat totaal niet meer (de uitgaven van een campagne zijn niet op
 * merk of model te filteren); dan zijn het de toegerekende kosten van de selectie, gedeeld
 * door de leads in de selectie waarvan de kosten bekend zijn.
 */
export function kostenPerLeadTotaal(
  t: Totalen,
  uitgavenTotaal: number,
  filtersActief: boolean,
): number | null {
  if (filtersActief) return kostenPerLead(t);
  return t.kostenbronLeads > 0 ? uitgavenTotaal / t.kostenbronLeads : null;
}

/**
 * Gelden voor deze selectie de **echte** uitgaven (zoals Google, Meta, LinkedIn en de
 * handmatige kosten ze opleveren) in plaats van de toegerekende kosten? Ja zonder filters, en
 * ook met alleen het filter Betaald: onbetaalde leads hebben geen kosten, dus daar valt geen
 * euro door weg. Met Onbetaald of een ander filter niet.
 */
export function echteUitgavenGelden(f: LeadFilters): boolean {
  return !heeftFilters({ ...f, betaald: "alle" }) && f.betaald !== "onbetaald";
}

/** De uitgaven bij de kerncijfers: echt als dat kan, anders toegerekend aan de selectie. */
export function uitgavenVoorSelectie(t: Totalen, f: LeadFilters, uitgavenTotaal: number): number {
  return echteUitgavenGelden(f) ? uitgavenTotaal : t.kosten;
}

/**
 * Kosten per lead (definitie van de eigenaar, november 2026): de uitgaven ÷ **alle** leads,
 * betaald en onbetaald. Met het filter Betaald zijn dat dus de uitgaven ÷ de betaalde leads.
 */
export function kostenPerLeadAlle(uitgaven: number, leads: number): number | null {
  return leads > 0 ? uitgaven / leads : null;
}

/**
 * Zet bij de kanalen Google Ads en Meta Ads de **echte uitgaven van het platform** in
 * plaats van de toegerekende kosten.
 *
 * De toegerekende kosten laten de campagnes zonder lead en de leads zonder herkenbare
 * campagne buiten beeld, waardoor een platform dat € 32.827 uitgaf in de tabel op € 27.229
 * stond en de tabel niet optelde tot het totaal. Een kanaal is een platform; de uitgaven
 * van een platform zijn een feit uit Google Ads of Meta, en daar hoort geen verdeling bij.
 *
 * Een platform zonder één lead in de selectie krijgt toch een rij: geld dat is uitgegeven
 * en niets opleverde moet er staan, niet ontbreken omdat er geen lead is om hem aan te
 * hangen.
 *
 * Alleen aanroepen zonder filters; bij een filter zijn de toegerekende kosten juist de
 * bedoeling.
 */
export function metPlatformUitgaven(
  groepen: Groep[],
  perPlatform: Partial<Record<BetaaldPlatform, number>>,
): Groep[] {
  const uit = groepen.map((g) => ({ ...g }));
  for (const platform of PLATFORMEN_MET_KOSTEN) {
    const uitgaven = perPlatform[platform];
    if (uitgaven === undefined) continue;
    const label = PLATFORM_LABEL[platform];
    const rij = uit.find((g) => g.sleutel === label);
    if (rij) {
      rij.kosten = uitgaven;
      rij.metKosten = rij.kostenbronLeads;
      rij.zonderKosten = 0;
    } else if (uitgaven > 0) {
      uit.push({
        sleutel: label,
        leads: 0,
        betaald: 0,
        onbetaald: 0,
        metKosten: 0,
        zonderKosten: 0,
        kosten: uitgaven,
        kostenbronLeads: 0,
      });
    }
  }
  return uit;
}

export interface Groep extends Totalen {
  sleutel: string;
  /** Extra tekst die bij de sleutel hoort (bv. het merk bij een model). */
  toelichting?: string;
}

/**
 * Groepeert regels op een sleutel, de grootste groep bovenaan.
 *
 * Bij gelijk aantal volgt de sleutel alfabetisch, zodat de volgorde niet verspringt als
 * twee groepen even groot zijn en een filter wisselt.
 */
export function groepeer(
  regels: LeadRegel[],
  sleutelVan: (r: LeadRegel) => string,
  toelichtingVan?: (r: LeadRegel) => string,
): Groep[] {
  const perSleutel = new Map<string, LeadRegel[]>();
  for (const r of regels) {
    const sleutel = sleutelVan(r);
    const lijst = perSleutel.get(sleutel);
    if (lijst) lijst.push(r);
    else perSleutel.set(sleutel, [r]);
  }
  return [...perSleutel.entries()]
    .map(([sleutel, lijst]) => ({
      sleutel,
      toelichting: toelichtingVan?.(lijst[0]),
      ...telTotalen(lijst),
    }))
    .sort((a, b) => b.leads - a.leads || a.sleutel.localeCompare(b.sleutel, "nl"));
}

export interface DagPunt {
  datum: string;
  betaald: number;
  onbetaald: number;
}

/** Alle dagen van `van` t/m `tot`, ook de dagen zonder lead — anders liegt de as. */
export function perDag(regels: LeadRegel[], van: string, tot: string): DagPunt[] {
  const dagen = new Map<string, DagPunt>();
  const start = Date.parse(`${van}T00:00:00Z`);
  const eind = Date.parse(`${tot}T00:00:00Z`);
  for (let t = start; t <= eind; t += 86_400_000) {
    const datum = new Date(t).toISOString().slice(0, 10);
    dagen.set(datum, { datum, betaald: 0, onbetaald: 0 });
  }
  for (const r of regels) {
    const dag = dagen.get(r.datum);
    if (!dag) continue;
    if (r.platform === null) dag.onbetaald += r.aantal;
    else dag.betaald += r.aantal;
  }
  return [...dagen.values()];
}

/**
 * Namen voor de events die het team als lead aanwees (`LEADS_EXTRA_EVENTS`) en waarvan de
 * naam zonder uitleg niet voor zich spreekt. Een bedankpagina is geen formulier: de naam
 * zegt dat het om een bezoek aan de bevestigingspagina gaat.
 */
const EVENT_NAMEN: Record<string, string> = {
  bedanktpagina_werkplaatsplanner: "Werkplaatsplanner (bedankpagina)",
  verhuur_aanvraag: "Autoverhuur aanvraag",
};

/**
 * Een leesbare naam voor een leadevent.
 *
 * `generate_lead_proefrit` → "Proefrit". Het kale `generate_lead` is het algemene event
 * dat geen soort meegeeft. De schrijfwijze van GA4 blijft herkenbaar (`privatelease` en
 * `private_lease` zijn twee verschillende events en blijven dat), zodat een rij in de
 * tabel terug te vinden is in GA4.
 */
export function leadSoort(event: string): string {
  const bekend = EVENT_NAMEN[event];
  if (bekend) return bekend;
  const rest = event.replace(/^generate_lead_?/i, "").replace(/_/g, " ").trim();
  if (rest === "") return "Algemeen";
  if (rest === rest.toUpperCase() && rest.length <= 6) return rest; // HMODH
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}
