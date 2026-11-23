/**
 * Campaign insight — pure functies voor het formulier en de weergave. Zonder React of
 * database, zodat ze zonder bundler te testen zijn (`rekenen.test.ts`).
 */
import type {
  Eenheid,
  FunnelStap,
  InsightCampagneInvoer,
  InsightKerncijfers,
  InsightResultaat,
} from "./types";

// ---------------------------------------------------------------------------
// Formulier
// ---------------------------------------------------------------------------

const MAX_KORT = 200;
const MAX_LANG = 5_000;

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

export type InvoerUitkomst =
  | { ok: true; invoer: InsightCampagneInvoer }
  | { ok: false; fout: string };

/** De invoer uit het formulier, gecontroleerd en opgeschoond. Alleen de naam is verplicht. */
export function leesCampagneInvoer(body: unknown): InvoerUitkomst {
  const b = (body ?? {}) as Record<string, unknown>;
  const naam = tekstOfNull(b.naam, MAX_KORT);
  if (!naam) return { ok: false, fout: "Geef de campagne een naam." };

  const startdatum = datumOfNull(b.startdatum);
  const einddatum = datumOfNull(b.einddatum);
  if (startdatum && einddatum && einddatum < startdatum) {
    return { ok: false, fout: "De einddatum ligt vóór de startdatum." };
  }

  const budgetRuw = b.budget;
  const budget = leesBedrag(budgetRuw);
  if (budget === null && typeof budgetRuw === "string" && budgetRuw.trim() !== "") {
    return { ok: false, fout: "Vul het budget in als bedrag, bijvoorbeeld 5000 of 5.000." };
  }

  return {
    ok: true,
    invoer: {
      naam,
      merk: tekstOfNull(b.merk, MAX_KORT),
      model: tekstOfNull(b.model, MAX_KORT),
      startdatum,
      einddatum,
      doel: tekstOfNull(b.doel, MAX_LANG),
      budget,
      omschrijving: tekstOfNull(b.omschrijving, MAX_LANG),
      zoektermen: tekstOfNull(b.zoektermen, MAX_LANG),
      campagnepaginas: tekstOfNull(b.campagnepaginas, MAX_LANG),
    },
  };
}

// ---------------------------------------------------------------------------
// Weergave
// ---------------------------------------------------------------------------

const NL = "nl-NL";

/** Een cijfer in de eenheid die de analyse opgeeft, in Nederlandse notatie. */
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
 * Het percentage dat van de ene funnelstap naar de volgende doorgaat (bv. klikken ÷
 * vertoningen). Alleen tussen twee aantallen; tussen een bedrag en een aantal, als een van
 * beide ontbreekt of nul is, of als de volgende stap groter is dan de vorige, is er geen
 * zinnige verhouding en komt er null.
 */
export function doorstroom(stappen: FunnelStap[]): (number | null)[] {
  return stappen.map((stap, i) => {
    if (i === 0) return null;
    const vorige = stappen[i - 1];
    if (stap.eenheid !== "aantal" || vorige.eenheid !== "aantal") return null;
    if (stap.waarde === null || vorige.waarde === null || vorige.waarde <= 0) return null;
    const pct = (stap.waarde / vorige.waarde) * 100;
    // Boven de 100% is de volgende stap geen deel van de vorige (bv. Syntec-leads, waar ook
    // offline leads in zitten, na de lead-events op de website): dan is het geen doorstroom.
    return pct > 100 ? null : pct;
  });
}

/** Voortgang op het doel als percentage, of null zonder doel of realisatie. */
export function doelVoortgang(k: InsightKerncijfers | null | undefined): number | null {
  if (!k || k.doelWaarde == null || k.doelRealisatie == null || k.doelWaarde <= 0) return null;
  return (k.doelRealisatie / k.doelWaarde) * 100;
}

/** "v2 · 23 nov 2026" */
export function versieLabel(versie: number, op: string): string {
  const d = new Date(op);
  const datum = Number.isNaN(d.getTime())
    ? op
    : new Intl.DateTimeFormat(NL, { day: "numeric", month: "short", year: "numeric" }).format(d);
  return `v${versie} · ${datum}`;
}

/** De looptijd als "18 sep – 31 dec 2026", of wat er van bekend is. */
export function looptijdLabel(start: string | null | undefined, eind: string | null | undefined): string {
  const fmt = (s: string, metJaar: boolean) =>
    new Intl.DateTimeFormat(NL, { day: "numeric", month: "short", ...(metJaar ? { year: "numeric" } : {}) }).format(
      new Date(`${s}T00:00:00Z`),
    );
  if (start && eind) {
    const zelfdeJaar = start.slice(0, 4) === eind.slice(0, 4);
    return `${fmt(start, !zelfdeJaar)} – ${fmt(eind, true)}`;
  }
  if (start) return `vanaf ${fmt(start, true)}`;
  if (eind) return `t/m ${fmt(eind, true)}`;
  return "Geen looptijd";
}

/**
 * Een resultaat uit de database zo neerzetten dat de weergave er niet op kan vastlopen: een
 * ontbrekende lijst wordt een lege lijst, secties staan op funnelvolgorde. Een analyse is
 * door een model geschreven; een veld dat ontbreekt mag de pagina niet laten crashen.
 */
export function normaliseerResultaat(ruw: unknown): InsightResultaat {
  const r = (ruw ?? {}) as Partial<InsightResultaat>;
  const lijst = <T,>(x: T[] | undefined | null): T[] => (Array.isArray(x) ? x : []);
  return {
    formaat: 1,
    samenvatting: {
      kop: r.samenvatting?.kop ?? "",
      tekst: r.samenvatting?.tekst ?? "",
    },
    funnel: lijst(r.funnel),
    secties: lijst(r.secties)
      .map((s, i) => ({ ...s, stap: typeof s.stap === "number" ? s.stap : i + 1 }))
      .sort((a, b) => a.stap - b.stap),
    inzichten: lijst(r.inzichten),
    aanbevelingen: lijst(r.aanbevelingen),
    herkenning: lijst(r.herkenning),
    datakwaliteit: lijst(r.datakwaliteit),
  };
}
