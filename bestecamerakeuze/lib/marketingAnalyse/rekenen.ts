/**
 * Marketing analyse — pure functies voor formulier, semantic layer en weergave. Zonder
 * React of database, zodat ze zonder bundler te testen zijn (`rekenen.test.ts`).
 */
import {
  SEMANTIEK_BLOKKEN,
  type Eenheid,
  BEDRIJF_MET_SYNTEC,
  type FunnelStap,
  type Formulier,
  type MaKerncijfers,
  type MaCampagneInvoer,
  type MaResultaat,
  type SemantiekInhoud,
  type SemantiekSleutel,
} from "./types";

// ---------------------------------------------------------------------------
// Briefing
// ---------------------------------------------------------------------------

const MAX_KORT = 200;
const MAX_LANG = 10_000;

function tekstOfNull(waarde: unknown, max: number): string | null {
  if (typeof waarde !== "string") return null;
  const s = waarde.trim();
  return s ? s.slice(0, max) : null;
}

function datumOfNull(waarde: unknown): string | null {
  if (typeof waarde !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(waarde.trim())) return null;
  const d = new Date(`${waarde.trim()}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : waarde.trim();
}

/**
 * Een bedrag zoals een collega het typt: "5000", "5.000", "5.000,50", "€ 5000" of "5000.5".
 * Een punt gevolgd door precies drie cijfers is een duizendtal (Nederlandse notatie).
 */
export function leesBedrag(waarde: unknown): number | null {
  if (typeof waarde === "number") return Number.isFinite(waarde) && waarde >= 0 ? waarde : null;
  if (typeof waarde !== "string") return null;
  let s = waarde.replace(/[€\s]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const getal = Number(s);
  return Number.isFinite(getal) && getal >= 0 ? getal : null;
}

/** Modellen uit een lijst of uit tekst ("A2, Q4" of één per regel), zonder dubbele. */
export function leesModellen(waarde: unknown): string[] {
  const ruw = Array.isArray(waarde) ? waarde : typeof waarde === "string" ? waarde.split(/[,\n;]/) : [];
  const gezien = new Set<string>();
  const uit: string[] = [];
  for (const m of ruw) {
    if (typeof m !== "string") continue;
    const s = m.trim().slice(0, MAX_KORT);
    if (s && !gezien.has(s.toLowerCase())) {
      gezien.add(s.toLowerCase());
      uit.push(s);
    }
  }
  return uit.slice(0, 20);
}

export type InvoerUitkomst = { ok: true; invoer: MaCampagneInvoer } | { ok: false; fout: string };

/** Wat de invoercontrole van de gekozen opzet moet weten. */
export interface OpzetVoorInvoer {
  id: string;
  formulier: Formulier;
  bedrijf: string | null;
}

/**
 * De invoer uit het briefingformulier, gecontroleerd tegen de gekozen opzet. Naam en bedrijf
 * zijn altijd verplicht; een vast bedrijf van de opzet gaat vóór wat er is ingevuld. Bij een
 * rapportage is de periode verplicht en vallen merk, modellen, looptijd, budget en doel weg.
 */
export function leesCampagneInvoer(body: unknown, opzet: OpzetVoorInvoer): InvoerUitkomst {
  const b = (body ?? {}) as Record<string, unknown>;
  const naam = tekstOfNull(b.naam, MAX_KORT);
  if (!naam) return { ok: false, fout: "Geef de analyse een naam." };
  const bedrijf = opzet.bedrijf ?? tekstOfNull(b.bedrijf, MAX_KORT);
  if (!bedrijf) return { ok: false, fout: "Kies voor welk bedrijf de analyse is." };
  const omschrijving = tekstOfNull(b.omschrijving, MAX_LANG);
  const dataCorrectie = tekstOfNull(b.dataCorrectie, MAX_LANG);

  if (opzet.formulier === "rapportage") {
    const periodeTekst = tekstOfNull(b.periodeTekst, MAX_KORT);
    if (!periodeTekst) return { ok: false, fout: "Vul de periode in, bijvoorbeeld “Afgelopen 3 maanden” of “1 januari t/m 10 februari 2026”." };
    return {
      ok: true,
      invoer: {
        opzetId: opzet.id,
        naam,
        bedrijf,
        merk: null,
        modellen: [],
        startdatum: null,
        einddatum: null,
        periodeTekst,
        doel: null,
        budget: null,
        omschrijving,
        dataCorrectie,
      },
    };
  }

  const startdatum = datumOfNull(b.startdatum);
  const einddatum = datumOfNull(b.einddatum);
  if (startdatum && einddatum && einddatum < startdatum) {
    return { ok: false, fout: "De einddatum ligt vóór de startdatum." };
  }

  const budget = leesBedrag(b.budget);
  if (budget === null && typeof b.budget === "string" && b.budget.trim() !== "") {
    return { ok: false, fout: "Vul het budget in als bedrag, bijvoorbeeld 5000 of 5.000." };
  }

  return {
    ok: true,
    invoer: {
      opzetId: opzet.id,
      naam,
      bedrijf,
      merk: tekstOfNull(b.merk, MAX_KORT),
      modellen: leesModellen(b.modellen),
      startdatum,
      einddatum,
      periodeTekst: null,
      doel: tekstOfNull(b.doel, MAX_LANG),
      budget,
      omschrijving,
      dataCorrectie,
    },
  };
}

/** De voorgestelde naam van een rapportage: "VDU maandrapportage november 2026". */
export function rapportageNaam(opzetNaam: string, periodeTekst: string): string {
  const periode = periodeTekst.trim();
  return periode ? `${opzetNaam} ${periode}` : opzetNaam;
}

/** Opzetten in de volgorde van het menu: actief eerst, dan op volgorde en naam. */
export function sorteerOpzetten<T extends { volgorde: number; naam: string; actief: boolean }>(opzetten: readonly T[]): T[] {
  return [...opzetten].sort(
    (a, b) => Number(b.actief) - Number(a.actief) || a.volgorde - b.volgorde || a.naam.localeCompare(b.naam, "nl"),
  );
}

export type OpzetInvoerUitkomst =
  | { ok: true; invoer: { naam: string; formulier: Formulier; bedrijf: string | null; actief: boolean } }
  | { ok: false; fout: string };

/** Een nieuwe of gewijzigde opzet uit het dashboard, gecontroleerd. */
export function leesOpzetInvoer(body: unknown): OpzetInvoerUitkomst {
  const b = (body ?? {}) as Record<string, unknown>;
  const naam = tekstOfNull(b.naam, 80);
  if (!naam) return { ok: false, fout: "Geef de opzet een naam." };
  if (b.formulier !== "campagne" && b.formulier !== "rapportage") return { ok: false, fout: "Kies een formulier." };
  return {
    ok: true,
    invoer: { naam, formulier: b.formulier, bedrijf: tekstOfNull(b.bedrijf, MAX_KORT), actief: b.actief !== false },
  };
}

/** De datum van vandaag in Nederland, als "JJJJ-MM-DD". */
export function vandaagNL(nu: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(nu);
}

/** Afgelopen = de einddatum ligt vóór vandaag. Zonder einddatum loopt een campagne nog. */
export function isAfgelopen(einddatum: string | null | undefined, vandaag: string): boolean {
  return Boolean(einddatum && einddatum < vandaag);
}

/**
 * Lopend bovenaan op startdatum (nieuwste eerst, zonder startdatum achteraan); afgelopen
 * apart, op einddatum (meest recent eerst).
 */
export function deelOpInLopendEnAfgelopen<T extends { startdatum: string | null; einddatum: string | null }>(
  campagnes: readonly T[],
  vandaag: string,
): { lopend: T[]; afgelopen: T[] } {
  const lopend = campagnes
    .filter((c) => !isAfgelopen(c.einddatum, vandaag))
    .sort((a, b) => (b.startdatum ?? "").localeCompare(a.startdatum ?? ""));
  const afgelopen = campagnes
    .filter((c) => isAfgelopen(c.einddatum, vandaag))
    .sort((a, b) => (b.einddatum ?? "").localeCompare(a.einddatum ?? ""));
  return { lopend, afgelopen };
}

// ---------------------------------------------------------------------------
// Semantic layer
// ---------------------------------------------------------------------------

const MAX_BLOK = 50_000;

/** Een semantic layer uit de database of de editor, compleet en opgeschoond. */
export function leesSemantiek(ruw: unknown, terugval?: SemantiekInhoud): SemantiekInhoud {
  const r = (ruw ?? {}) as { bedrijven?: unknown; blokken?: Record<string, unknown> };
  const bedrijven = leesModellen(r.bedrijven);
  const blokken = {} as Record<SemantiekSleutel, string>;
  for (const { sleutel } of SEMANTIEK_BLOKKEN) {
    const waarde = r.blokken?.[sleutel];
    blokken[sleutel] =
      typeof waarde === "string" ? waarde.replace(/\r\n/g, "\n").slice(0, MAX_BLOK) : (terugval?.blokken[sleutel] ?? "");
  }
  return { bedrijven: bedrijven.length > 0 ? bedrijven : (terugval?.bedrijven ?? []), blokken };
}

// ---------------------------------------------------------------------------
// Weergave
// ---------------------------------------------------------------------------

const NL = "nl-NL";

export function formatWaarde(waarde: number | string | null | undefined, eenheid: Eenheid = "aantal"): string {
  if (waarde === null || waarde === undefined || waarde === "") return "—";
  if (typeof waarde === "string") return waarde;
  if (!Number.isFinite(waarde)) return "—";
  switch (eenheid) {
    case "euro":
      return new Intl.NumberFormat(NL, {
        style: "currency",
        currency: "EUR",
        // Onder de € 100 (kosten per klik, per lead) doen de centen ertoe.
        maximumFractionDigits: Math.abs(waarde) < 100 ? 2 : 0,
        minimumFractionDigits: Math.abs(waarde) < 100 && waarde % 1 !== 0 ? 2 : 0,
      }).format(waarde);
    case "procent":
      return `${new Intl.NumberFormat(NL, { maximumFractionDigits: Math.abs(waarde) < 10 ? 1 : 0 }).format(waarde)}%`;
    case "seconden": {
      const s = Math.round(waarde);
      if (s < 60) return `${s} s`;
      return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")} min`;
    }
    case "tekst":
      return String(waarde);
    default:
      return new Intl.NumberFormat(NL, { maximumFractionDigits: Math.abs(waarde) < 10 ? 1 : 0 }).format(waarde);
  }
}

/**
 * Het percentage dat van de ene funnelstap naar de volgende doorgaat. Alleen tussen twee
 * aantallen, en niet boven de 100%: dan is de volgende stap geen deel van de vorige.
 */
export function doorstroom(stappen: FunnelStap[]): (number | null)[] {
  return stappen.map((stap, i) => {
    if (i === 0) return null;
    const vorige = stappen[i - 1];
    if (stap.eenheid !== "aantal" || vorige.eenheid !== "aantal") return null;
    if (stap.waarde === null || vorige.waarde === null || vorige.waarde <= 0) return null;
    const pct = (stap.waarde / vorige.waarde) * 100;
    return pct > 100 ? null : pct;
  });
}

export function datumKort(op: string): string {
  const d = new Date(op);
  return Number.isNaN(d.getTime())
    ? op
    : new Intl.DateTimeFormat(NL, { day: "numeric", month: "short", year: "numeric" }).format(d);
}

/** "v2 · 23 nov 2026" */
export function versieLabel(versie: number, op: string): string {
  return `v${versie} · ${datumKort(op)}`;
}

/** De looptijd als "18 sep – 31 dec 2026", of wat er van bekend is. */
export function looptijdLabel(start: string | null | undefined, eind: string | null | undefined): string {
  const fmt = (s: string, metJaar: boolean) =>
    new Intl.DateTimeFormat(NL, { day: "numeric", month: "short", ...(metJaar ? { year: "numeric" } : {}) }).format(
      new Date(`${s}T00:00:00Z`),
    );
  if (start && eind) return `${fmt(start, start.slice(0, 4) !== eind.slice(0, 4))} – ${fmt(eind, true)}`;
  if (start) return `vanaf ${fmt(start, true)}`;
  if (eind) return `t/m ${fmt(eind, true)}`;
  return "Geen looptijd";
}

/**
 * Een resultaat uit de database zo neerzetten dat de weergave er niet op kan vastlopen. Een
 * analyse is door een model geschreven; een veld dat ontbreekt mag de pagina niet breken.
 */
export function normaliseerResultaat(ruw: unknown): MaResultaat {
  const r = (ruw ?? {}) as Partial<MaResultaat>;
  const lijst = <T,>(x: T[] | undefined | null): T[] => (Array.isArray(x) ? x : []);
  return {
    formaat: 1,
    samenvatting: {
      kop: r.samenvatting?.kop ?? "",
      regels: lijst(r.samenvatting?.regels).filter((x) => typeof x === "string").slice(0, 5),
      tekst: r.samenvatting?.tekst ?? "",
    },
    doel: r.doel,
    funnel: lijst(r.funnel),
    secties: lijst(r.secties)
      .map((s, i) => ({ ...s, stap: typeof s.stap === "number" ? s.stap : i + 1 }))
      .sort((a, b) => a.stap - b.stap),
    inzichten: lijst(r.inzichten),
    aanbevelingen: lijst(r.aanbevelingen),
    herkenning: lijst(r.herkenning),
    bronnen: lijst(r.bronnen),
    correcties: lijst(r.correcties),
    semantiekVoorstellen: lijst(r.semantiekVoorstellen),
    datakwaliteit: lijst(r.datakwaliteit),
  };
}

// ---------------------------------------------------------------------------
// Overzicht van een campagne-analyse: uitgaven, leads en doel
// ---------------------------------------------------------------------------

/**
 * Het eerste aantal in een doel in vrije tekst: "20 proefritten" → 20, "1.000 leads" → 1000.
 * Null zonder getal. Alleen een terugval: de analyse zet het gelezen doel in `doelLeads`.
 */
export function leesDoelGetal(doel: string | null | undefined): number | null {
  if (!doel) return null;
  const m = doel.match(/\d{1,3}(?:\.\d{3})+(?!\d)|\d+/);
  if (!m) return null;
  const n = Number(m[0].replace(/\./g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export type LeadBron = "syntec" | "ga4";

/**
 * Waar de leads van een campagne-analyse vandaan komen. Syntec alleen bij Van den Udenhout
 * én als er modellen zijn opgegeven (de leads-kopie is te filteren op merk en model);
 * anders de lead-events in GA4 (sessies die op de campagnepagina begonnen).
 */
export function leadBron(c: { bedrijf: string; modellen: readonly string[] }): LeadBron {
  return c.bedrijf === BEDRIJF_MET_SYNTEC && c.modellen.length > 0 ? "syntec" : "ga4";
}

export interface OverzichtCijfers {
  kosten: number | null;
  budget: number | null;
  /** Deel van het budget dat is uitgegeven, in procenten; null zonder budget of kosten. */
  besteedPct: number | null;
  leads: number | null;
  bron: LeadBron;
  doelLeads: number | null;
  /** Deel van het leaddoel dat is gehaald, in procenten; null zonder doel of leads. */
  gehaaldPct: number | null;
}

/** De cijfers voor één regel in het overzicht van campagne-analyses. */
export function overzichtCijfers(
  c: { bedrijf: string; modellen: readonly string[]; budget: number | null; doel: string | null },
  k: MaKerncijfers | null | undefined,
): OverzichtCijfers {
  const kosten = k?.kosten ?? null;
  const bron = leadBron(c);
  const leads = (bron === "syntec" ? k?.leadsSyntec : k?.leadEvents) ?? null;
  const doelLeads = k?.doelLeads ?? leesDoelGetal(c.doel);
  return {
    kosten,
    budget: c.budget,
    besteedPct: kosten !== null && c.budget ? (kosten / c.budget) * 100 : null,
    leads,
    bron,
    doelLeads,
    gehaaldPct: leads !== null && doelLeads ? (leads / doelLeads) * 100 : null,
  };
}
