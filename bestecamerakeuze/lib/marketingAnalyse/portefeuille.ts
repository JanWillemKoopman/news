import { budgetTempo, isLive, merkSleutels, overzichtCijfers, type BudgetTempo } from "./rekenen";
import { kostenPer } from "./uitsplitsing";
import type { MaKerncijfers } from "./types";

/**
 * Marketing analyse — het overzicht van alle campagne-analyses in één oogopslag (redesign
 * november 2026). Puur rekenwerk bovenop `overzichtCijfers`, zodat de getallen precies die van
 * de tabel en van Campagne analyse blijven: hier wordt niets opnieuw gedefinieerd, alleen
 * opgeteld en tegen de looptijd gezet.
 *
 * **Waarmee vergelijken we?** Met het verwachte tempo: budget en leaddoel × het verstreken deel
 * van de looptijd op de laatste dag van de analyseperiode. Dat is per campagne dezelfde regel als
 * de voortgangsbalken in de samenvatting (`voortgangVanAnalyse`), en het enige vergelijkpunt dat
 * voor elke analyse met dezelfde definities bestaat. Een vorige versie kan met een andere prompt
 * of semantic layer gemaakt zijn; die vergelijking staat daarom alleen op de analysepagina, met
 * die kanttekening erbij.
 */

/** Wat de rekenregel van één regel in het overzicht nodig heeft. */
export interface PortefeuilleInvoer {
  id: string;
  naam: string;
  bedrijven: readonly string[];
  budget: number | null;
  doel: string | null;
  merk?: string | null;
  modellen?: readonly string[] | null;
  startdatum: string | null;
  einddatum: string | null;
  laatsteAnalyse: { kerncijfers: MaKerncijfers; periodeTot?: string | null; geanalyseerdOp: string } | null;
}

/** Leads tegen het doel, net als budget: binnen 10 procentpunt van de looptijd is op koers. */
export type LeadTempo = "voor" | "op-koers" | "achter";

export function leadTempo(gehaaldPct: number | null, tijdPct: number | null): LeadTempo | null {
  if (gehaaldPct === null || tijdPct === null) return null;
  // Een gehaald doel is nooit "achter", ook niet als de looptijd al verder is.
  if (gehaaldPct >= 100) return "voor";
  const verschil = gehaaldPct - tijdPct;
  if (Math.abs(verschil) <= 10) return "op-koers";
  return verschil > 0 ? "voor" : "achter";
}

function dagNummer(datum: string): number {
  return Math.floor(Date.parse(`${datum.slice(0, 10)}T00:00:00Z`) / 86_400_000);
}

/** Dag x van y op de laatste dag van de analyseperiode; null zonder looptijd of periode. */
export function looptijdOp(
  start: string | null,
  eind: string | null,
  op: string | null | undefined,
): { dag: number; dagen: number; pct: number } | null {
  if (!start || !eind || !op) return null;
  const dagen = dagNummer(eind) - dagNummer(start) + 1;
  if (dagen <= 0) return null;
  const dag = Math.min(dagen, Math.max(0, dagNummer(op) - dagNummer(start) + 1));
  return { dag, dagen, pct: (dag / dagen) * 100 };
}

/** Waarom er geen kosten per lead staan: dat verschilt van "nog niet gemeten". */
export type KplReden = "geen-leads" | "geen-kosten" | "niet-gemeten";

export interface CampagneVoortgang {
  id: string;
  naam: string;
  live: boolean;
  geanalyseerd: boolean;
  /** Laatste dag van de analyseperiode (JJJJ-MM-DD). */
  standTot: string | null;
  dag: number | null;
  dagen: number | null;
  tijdPct: number | null;
  kosten: number | null;
  budget: number | null;
  besteedPct: number | null;
  /** Budget × verstreken deel van de looptijd. */
  verwachtKosten: number | null;
  kostenTempo: BudgetTempo | null;
  leads: number | null;
  leadSoort: string | null;
  doelLeads: number | null;
  gehaaldPct: number | null;
  verwachtLeads: number | null;
  leadTempo: LeadTempo | null;
  kostenPerLead: number | null;
  /** Gevuld als `kostenPerLead` null is. */
  kplReden: KplReden | null;
  bezoekers: number | null;
  ctr: number | null;
  klikken: number | null;
  vertoningenAds: number | null;
  /** Aandeel in de mediakosten en de leads van alle campagnes in het overzicht, 0 t/m 100. */
  aandeelKosten: number | null;
  aandeelLeads: number | null;
}

function voortgangZonderAandeel(c: PortefeuilleInvoer, vandaag: string): CampagneVoortgang {
  const k = c.laatsteAnalyse?.kerncijfers;
  const o = overzichtCijfers(c, k);
  const tijd = looptijdOp(c.startdatum, c.einddatum, c.laatsteAnalyse?.periodeTot ?? null);
  const tijdPct = tijd?.pct ?? null;
  const kpl = kostenPer(o.kosten, o.leads);
  let kplReden: KplReden | null = null;
  if (kpl === null) {
    if (o.leads === 0 && o.kosten !== null && o.kosten > 0) kplReden = "geen-leads";
    else if (o.kosten === null || o.kosten === 0) kplReden = o.leads === null ? "niet-gemeten" : "geen-kosten";
    else kplReden = "niet-gemeten";
  }
  return {
    id: c.id,
    naam: c.naam,
    live: isLive(c, vandaag),
    geanalyseerd: Boolean(c.laatsteAnalyse),
    standTot: c.laatsteAnalyse?.periodeTot ?? null,
    dag: tijd?.dag ?? null,
    dagen: tijd?.dagen ?? null,
    tijdPct,
    kosten: o.kosten,
    budget: o.budget,
    besteedPct: o.besteedPct,
    verwachtKosten: o.budget !== null && tijdPct !== null ? (o.budget * tijdPct) / 100 : null,
    kostenTempo: budgetTempo(o.besteedPct, tijdPct),
    leads: o.leads,
    leadSoort: o.leadSoort,
    doelLeads: o.doelLeads,
    gehaaldPct: o.gehaaldPct,
    verwachtLeads: o.doelLeads !== null && tijdPct !== null ? (o.doelLeads * tijdPct) / 100 : null,
    leadTempo: leadTempo(o.gehaaldPct, tijdPct),
    kostenPerLead: kpl,
    kplReden,
    bezoekers: o.bezoekers,
    ctr: o.ctr,
    klikken: k?.klikken ?? null,
    vertoningenAds: k?.vertoningenAds ?? null,
    aandeelKosten: null,
    aandeelLeads: null,
  };
}

function som(waarden: (number | null)[]): { som: number; aantal: number } {
  let s = 0;
  let n = 0;
  for (const w of waarden) {
    if (typeof w === "number" && Number.isFinite(w)) {
      s += w;
      n += 1;
    }
  }
  return { som: s, aantal: n };
}

export interface Portefeuille {
  campagnes: CampagneVoortgang[];
  aantal: number;
  aantalLive: number;
  aantalGeanalyseerd: number;
  kosten: number | null;
  /** Budget van de campagnes met kosten én budget; daartegen staat `besteedPct`. */
  budget: number | null;
  besteedPct: number | null;
  verwachtKosten: number | null;
  /** Kosten van dezelfde campagnes als `verwachtKosten`, zodat het tempo appels met appels vergelijkt. */
  kostenMetTempo: number | null;
  kostenTempo: BudgetTempo | null;
  leads: number | null;
  /** Leads, doel en verwachting van alleen de campagnes met een aantal in het doel. */
  leadsMetDoel: number | null;
  doelLeads: number | null;
  verwachtLeads: number | null;
  aantalMetDoel: number;
  leadTempo: LeadTempo | null;
  kostenPerLead: number | null;
  bezoekers: number | null;
  ctr: number | null;
  /** De vroegste en laatste dag waarop een analyseperiode eindigt: "stand t/m". */
  standVan: string | null;
  standTot: string | null;
}

/**
 * Alle campagne-analyses samen. Telt alleen op wat een analyse heeft; een campagne zonder cijfer
 * telt niet als nul. Het aandeel per campagne is tegen het totaal van de campagnes in beeld.
 */
export function portefeuille(regels: readonly PortefeuilleInvoer[], vandaag: string): Portefeuille {
  const lijst = regels.map((c) => voortgangZonderAandeel(c, vandaag));
  const kosten = som(lijst.map((c) => c.kosten));
  const leads = som(lijst.map((c) => c.leads));
  const metBudget = lijst.filter((c) => c.kosten !== null && c.budget !== null && c.budget > 0);
  const budget = som(metBudget.map((c) => c.budget));
  const metTempo = metBudget.filter((c) => c.verwachtKosten !== null);
  const verwacht = som(metTempo.map((c) => c.verwachtKosten));
  const kostenMetTempo = som(metTempo.map((c) => c.kosten));
  const metDoel = lijst.filter((c) => c.leads !== null && c.doelLeads !== null && c.doelLeads > 0);
  const leadsMetDoel = som(metDoel.map((c) => c.leads));
  const doel = som(metDoel.map((c) => c.doelLeads));
  const metDoelEnTijd = metDoel.filter((c) => c.verwachtLeads !== null);
  const verwachtLeads = som(metDoelEnTijd.map((c) => c.verwachtLeads));
  const leadsMetDoelEnTijd = som(metDoelEnTijd.map((c) => c.leads));
  const bezoekers = som(lijst.map((c) => c.bezoekers));
  const metCtr = lijst.filter((c) => c.klikken !== null && c.vertoningenAds);
  const klikken = som(metCtr.map((c) => c.klikken));
  const vertoningen = som(metCtr.map((c) => c.vertoningenAds));
  const standen = lijst.map((c) => c.standTot).filter((x): x is string => Boolean(x)).sort();

  const campagnes = lijst.map((c) => ({
    ...c,
    aandeelKosten: c.kosten !== null && kosten.som > 0 ? (c.kosten / kosten.som) * 100 : null,
    aandeelLeads: c.leads !== null && leads.som > 0 ? (c.leads / leads.som) * 100 : null,
  }));

  const besteedPct = budget.aantal && budget.som > 0 ? (som(metBudget.map((c) => c.kosten)).som / budget.som) * 100 : null;
  const tempoPct = metTempo.length && verwacht.som > 0 ? (kostenMetTempo.som / verwacht.som) * 100 : null;
  const doelPct = metDoelEnTijd.length && verwachtLeads.som > 0 ? (leadsMetDoelEnTijd.som / verwachtLeads.som) * 100 : null;

  return {
    campagnes,
    aantal: lijst.length,
    aantalLive: lijst.filter((c) => c.live).length,
    aantalGeanalyseerd: lijst.filter((c) => c.geanalyseerd).length,
    kosten: kosten.aantal ? kosten.som : null,
    budget: budget.aantal ? budget.som : null,
    besteedPct,
    verwachtKosten: metTempo.length ? verwacht.som : null,
    kostenMetTempo: metTempo.length ? kostenMetTempo.som : null,
    // Hetzelfde ±10%-venster als per campagne, maar dan tegen de verwachting zelf.
    kostenTempo: tempoPct === null ? null : Math.abs(tempoPct - 100) <= 10 ? "op-schema" : tempoPct > 100 ? "te-snel" : "te-langzaam",
    leads: leads.aantal ? leads.som : null,
    leadsMetDoel: metDoel.length ? leadsMetDoel.som : null,
    doelLeads: metDoel.length ? doel.som : null,
    verwachtLeads: metDoelEnTijd.length ? verwachtLeads.som : null,
    aantalMetDoel: metDoel.length,
    leadTempo: doelPct === null ? null : Math.abs(doelPct - 100) <= 10 ? "op-koers" : doelPct > 100 ? "voor" : "achter",
    kostenPerLead: kostenPer(kosten.aantal ? kosten.som : null, leads.aantal ? leads.som : null),
    bezoekers: bezoekers.aantal ? bezoekers.som : null,
    ctr: vertoningen.som > 0 ? (klikken.som / vertoningen.som) * 100 : null,
    standVan: standen[0] ?? null,
    standTot: standen[standen.length - 1] ?? null,
  };
}

/** Het verschil tussen twee versies van hetzelfde cijfer: absoluut en relatief. */
export interface VersieVerschil {
  absoluut: number;
  /** In procenten; null als de vorige waarde nul was. */
  relatief: number | null;
}

export function versieVerschil(nu: number | null | undefined, toen: number | null | undefined): VersieVerschil | null {
  if (typeof nu !== "number" || typeof toen !== "number" || !Number.isFinite(nu) || !Number.isFinite(toen)) return null;
  return { absoluut: nu - toen, relatief: toen === 0 ? null : ((nu - toen) / Math.abs(toen)) * 100 };
}

/**
 * Een week (maandag als begin, JJJJ-MM-DD) die niet helemaal binnen de periode valt: de eerste
 * of de laatste week van de analyse. Die staan in de grafiek als onvolledig gemarkeerd.
 */
export function isOnvolledigeWeek(weekStart: string, periodeVan: string | null, periodeTot: string | null): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) return false;
  const start = dagNummer(weekStart);
  const eind = start + 6;
  if (periodeVan && start < dagNummer(periodeVan)) return true;
  if (periodeTot && eind > dagNummer(periodeTot)) return true;
  return false;
}

/** "Alle merken", "alle modellen": geen merk om op te filteren. */
const GEEN_FILTERMERK = /^alle\b/;

/**
 * De knoppen van het filter op merk boven het overzicht (verzoek van de eigenaar, 27 november 2026):
 * één per merk dat in de campagne-analyses of de voorstellen voorkomt, op sleutel (`merkSleutels`:
 * "Skoda" en "Škoda" zijn één merk, "Volkswagen, Audi" telt voor beide), met het aantal; hoog naar
 * laag. De naam is de eerste schrijfwijze die voorkomt.
 */
export function merkFilterKnoppen(items: readonly { merk: string | null }[]): { sleutel: string; naam: string; aantal: number }[] {
  const knoppen = new Map<string, { sleutel: string; naam: string; aantal: number }>();
  for (const item of items) {
    const delen = (item.merk ?? "").split(/\s*(?:,|;|\/|\+|&|\s+en\s+)\s*/i).filter((d) => d.trim());
    const gezien = new Set<string>();
    for (const deel of delen) {
      const sleutel = merkSleutels(deel)[0];
      if (!sleutel || GEEN_FILTERMERK.test(sleutel) || gezien.has(sleutel)) continue;
      gezien.add(sleutel);
      const k = knoppen.get(sleutel);
      if (k) k.aantal += 1;
      else knoppen.set(sleutel, { sleutel, naam: deel.trim(), aantal: 1 });
    }
  }
  return [...knoppen.values()].sort((a, b) => b.aantal - a.aantal || a.naam.localeCompare(b.naam, "nl"));
}

/** Alleen wat over dit merk gaat (sleutel uit `merkFilterKnoppen`); `null` = alle. */
export function filterOpMerk<T extends { merk: string | null }>(items: readonly T[], sleutel: string | null): T[] {
  if (sleutel === null) return [...items];
  return items.filter((i) => merkSleutels(i.merk).includes(sleutel));
}
