/**
 * Marketing analyse — pure functies voor formulier, semantic layer en weergave. Zonder
 * React of database, zodat ze zonder bundler te testen zijn (`rekenen.test.ts`).
 */
import {
  SEMANTIEK_BLOKKEN,
  type Eenheid,
  type FunnelStap,
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

/** De invoer uit het briefingformulier, gecontroleerd. Naam en bedrijf zijn verplicht. */
export function leesCampagneInvoer(body: unknown): InvoerUitkomst {
  const b = (body ?? {}) as Record<string, unknown>;
  const naam = tekstOfNull(b.naam, MAX_KORT);
  if (!naam) return { ok: false, fout: "Geef de campagne een naam." };
  const bedrijf = tekstOfNull(b.bedrijf, MAX_KORT);
  if (!bedrijf) return { ok: false, fout: "Kies voor welk bedrijf de campagne is." };

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
      naam,
      bedrijf,
      merk: tekstOfNull(b.merk, MAX_KORT),
      modellen: leesModellen(b.modellen),
      startdatum,
      einddatum,
      doel: tekstOfNull(b.doel, MAX_LANG),
      budget,
      omschrijving: tekstOfNull(b.omschrijving, MAX_LANG),
      dataCorrectie: tekstOfNull(b.dataCorrectie, MAX_LANG),
    },
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
