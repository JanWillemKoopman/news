/**
 * Rekenwerk voor het tabblad **Campagne timeline** (Campagnes → Campagne timeline): het
 * jaaroverzicht van alle Campagne analyses uit Marketing analyse. Los van het component zodat
 * het getest kan worden (`campagneTimeline.test.ts`).
 *
 * Datums zijn overal "JJJJ-MM-DD" (zoals in de briefing) en worden als UTC-middernacht gelezen,
 * net als de weekstarts; zo valt een datum nooit door een tijdzone in de verkeerde week.
 */

import { merkSleutel, merkSleutels } from "@/lib/marketingAnalyse/rekenen";

const DAG_MS = 86_400_000;

export const MAAND_NAMEN = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

/** Een campagne loopt "bijna af" binnen zoveel dagen tot de einddatum (gelijk aan het tabblad Tijdlijn). */
export const BIJNA_AF_DAGEN = 7;

export type Week = {
  nummer: number;
  /** Maandag van deze ISO-week, UTC-middernacht. */
  start: Date;
};

export type TimelineStatus = "actief" | "bijna-af" | "gepland" | "afgelopen";

export const STATUS_VOLGORDE: readonly TimelineStatus[] = ["actief", "bijna-af", "gepland", "afgelopen"];

/** Wat de timeline van een campagne-analyse nodig heeft. */
export type TimelineInvoer = {
  naam: string;
  bedrijven: readonly string[];
  merk: string | null;
  startdatum: string | null;
  einddatum: string | null;
};

/** "JJJJ-MM-DD" (of een langere ISO-tekst) als UTC-middernacht; null als het geen datum is. */
export function leesDag(waarde: string | null | undefined): Date | null {
  if (!waarde) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(waarde);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}

function maandagVan(d: Date): Date {
  const kopie = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dag = kopie.getUTCDay() || 7;
  kopie.setUTCDate(kopie.getUTCDate() - (dag - 1));
  return kopie;
}

/**
 * Alle ISO-weken van `jaar`: 52 of 53 (2026 heeft er 53). Week 1 is de week met 4 januari,
 * de laatste week die met 28 december.
 */
export function isoWeken(jaar: number): Week[] {
  const eerste = maandagVan(new Date(Date.UTC(jaar, 0, 4)));
  const laatste = maandagVan(new Date(Date.UTC(jaar, 11, 28)));
  const aantal = Math.round((laatste.getTime() - eerste.getTime()) / (7 * DAG_MS)) + 1;
  return Array.from({ length: aantal }, (_, i) => ({
    nummer: i + 1,
    start: new Date(eerste.getTime() + i * 7 * DAG_MS),
  }));
}

export type MaandBlok = { sleutel: string; label: string; vanKolom: number; aantalWeken: number };

/** De weken gegroepeerd per maand, op de donderdag van elke week (zoals de ISO-weeknummering zelf). */
export function maandBlokken(weken: readonly Week[]): MaandBlok[] {
  const blokken: MaandBlok[] = [];
  weken.forEach((week, i) => {
    const donderdag = new Date(week.start.getTime() + 3 * DAG_MS);
    const sleutel = `${donderdag.getUTCFullYear()}-${donderdag.getUTCMonth()}`;
    const laatste = blokken[blokken.length - 1];
    if (laatste && laatste.sleutel === sleutel) laatste.aantalWeken += 1;
    else blokken.push({ sleutel, label: MAAND_NAMEN[donderdag.getUTCMonth()], vanKolom: i, aantalWeken: 1 });
  });
  return blokken;
}

/**
 * De status van een campagne op `vandaag`, uit de looptijd en niet uit een planning of label:
 * gepland vóór de start, afgelopen na het einde, "loopt bijna af" in de laatste week. Zonder
 * einddatum loopt een campagne door (zoals in Marketing analyse).
 */
export function timelineStatus(start: string | null, eind: string | null, vandaag: string): TimelineStatus | null {
  const s = leesDag(start);
  const v = leesDag(vandaag);
  if (!s || !v) return null;
  const e = leesDag(eind);
  if (e && e < v) return "afgelopen";
  if (s > v) return "gepland";
  if (e && (e.getTime() - v.getTime()) / DAG_MS <= BIJNA_AF_DAGEN) return "bijna-af";
  return "actief";
}

export type BalkPositie = {
  /** Begin van de balk in weken vanaf het begin van week 1 (fractioneel, op de dag nauwkeurig). */
  van: number;
  /** Einde van de balk in weken (exclusief: het einde van de einddag). */
  tot: number;
  /** De campagne begon al vóór dit jaar: de balk loopt links het beeld uit. */
  doorVoor: boolean;
  /** De campagne loopt na dit jaar door, of heeft geen einddatum. */
  doorNa: boolean;
  /** Er is geen einddatum: de balk loopt tot de rand van het jaar. */
  openEinde: boolean;
};

/**
 * Waar de balk van een campagne in het jaaroverzicht staat, op de dag nauwkeurig (start- en
 * einddag tellen allebei mee). Null zonder startdatum of als de looptijd buiten dit jaar valt.
 */
export function balkPositie(start: string | null, eind: string | null, weken: readonly Week[]): BalkPositie | null {
  const s = leesDag(start);
  if (!s || weken.length === 0) return null;
  const e = leesDag(eind);
  const jaarStart = weken[0].start.getTime();
  const jaarEind = weken[weken.length - 1].start.getTime() + 7 * DAG_MS;
  const vanMs = s.getTime();
  const totMs = e ? Math.max(e.getTime(), vanMs) + DAG_MS : Number.POSITIVE_INFINITY;
  if (totMs <= jaarStart || vanMs >= jaarEind) return null;
  const inWeken = (ms: number) => (ms - jaarStart) / (7 * DAG_MS);
  return {
    van: inWeken(Math.max(vanMs, jaarStart)),
    tot: inWeken(Math.min(totMs, jaarEind)),
    doorVoor: vanMs < jaarStart,
    doorNa: totMs > jaarEind,
    openEinde: !e,
  };
}

/** Waar vandaag staat, in weken vanaf het begin van week 1 (midden van de dag); null buiten dit jaar. */
export function vandaagPositie(vandaag: string, weken: readonly Week[]): number | null {
  const v = leesDag(vandaag);
  if (!v || weken.length === 0) return null;
  const pos = (v.getTime() + DAG_MS / 2 - weken[0].start.getTime()) / (7 * DAG_MS);
  return pos < 0 || pos >= weken.length ? null : pos;
}

/** Het ISO-jaar waarin een datum valt (de week met 29 december 2025 is week 1 van 2026). */
function isoJaar(d: Date): number {
  const donderdag = new Date(maandagVan(d).getTime() + 3 * DAG_MS);
  return donderdag.getUTCFullYear();
}

/**
 * De jaren waar je doorheen kunt bladeren: van het vroegste startjaar tot het laatste eindjaar
 * van de campagnes, altijd inclusief het huidige jaar.
 */
export function jarenBereik(campagnes: readonly TimelineInvoer[], vandaag: string): { van: number; tot: number } {
  const nu = leesDag(vandaag);
  const huidig = nu ? isoJaar(nu) : new Date().getUTCFullYear();
  let van = huidig;
  let tot = huidig;
  for (const c of campagnes) {
    const s = leesDag(c.startdatum);
    if (!s) continue;
    van = Math.min(van, isoJaar(s));
    tot = Math.max(tot, isoJaar(leesDag(c.einddatum) ?? s));
  }
  return { van, tot };
}

/**
 * De merken voor het filter: elk merkveld gesplitst ("Volkswagen, Audi" telt als twee merken),
 * dubbel op sleutel eruit ("Skoda" en "Škoda" zijn één merk; de eerste schrijfwijze blijft),
 * alfabetisch.
 */
export function merkOpties(campagnes: readonly TimelineInvoer[]): string[] {
  const perSleutel = new Map<string, string>();
  for (const c of campagnes) {
    const delen = (c.merk ?? "").split(/\s*(?:,|;|\/|\+|&|\s+en\s+)\s*/i);
    for (const deel of delen) {
      const naam = deel.trim();
      const sleutel = merkSleutel(naam);
      if (sleutel && !perSleutel.has(sleutel)) perSleutel.set(sleutel, naam);
    }
  }
  return [...perSleutel.values()].sort((a, b) => a.localeCompare(b, "nl"));
}

/** De bedrijven die in de campagnes voorkomen, alfabetisch. */
export function bedrijfOpties(campagnes: readonly TimelineInvoer[]): string[] {
  return [...new Set(campagnes.flatMap((c) => c.bedrijven))].sort((a, b) => a.localeCompare(b, "nl"));
}

/**
 * Filtert op bedrijf en merk. Binnen een filter is het "of" (een van de gekozen bedrijven), tussen
 * de filters "en". Een leeg filter laat alles door.
 */
export function filterTimeline<T extends TimelineInvoer>(
  campagnes: readonly T[],
  filter: { bedrijven: readonly string[]; merken: readonly string[] },
): T[] {
  const merkSet = new Set(filter.merken.map(merkSleutel).filter((s): s is string => s !== null));
  return campagnes.filter((c) => {
    if (filter.bedrijven.length > 0 && !c.bedrijven.some((b) => filter.bedrijven.includes(b))) return false;
    if (merkSet.size > 0 && !merkSleutels(c.merk).some((s) => merkSet.has(s))) return false;
    return true;
  });
}

/** Op startdatum (vroegste eerst; zonder startdatum achteraan), dan einddatum, dan naam. */
export function sorteerTimeline<T extends TimelineInvoer>(campagnes: readonly T[]): T[] {
  return [...campagnes].sort((a, b) => {
    if (!a.startdatum !== !b.startdatum) return a.startdatum ? -1 : 1;
    return (
      (a.startdatum ?? "").localeCompare(b.startdatum ?? "") ||
      (a.einddatum ?? "9999").localeCompare(b.einddatum ?? "9999") ||
      a.naam.localeCompare(b.naam, "nl")
    );
  });
}

/** Hoeveel campagnes er per status zijn. */
export function telStatussen(statussen: readonly (TimelineStatus | null)[]): Record<TimelineStatus, number> {
  const telling: Record<TimelineStatus, number> = { actief: 0, "bijna-af": 0, gepland: 0, afgelopen: 0 };
  for (const s of statussen) if (s) telling[s] += 1;
  return telling;
}

/** Aantal dagen van start t/m einde (beide dagen tellen mee); null zonder beide datums. */
export function looptijdDagen(start: string | null, eind: string | null): number | null {
  const s = leesDag(start);
  const e = leesDag(eind);
  if (!s || !e || e < s) return null;
  return Math.round((e.getTime() - s.getTime()) / DAG_MS) + 1;
}

/** Hoeveel procent van de looptijd er op `vandaag` verstreken is (0–100); null zonder looptijd. */
export function verstrekenPct(start: string | null, eind: string | null, vandaag: string): number | null {
  const totaal = looptijdDagen(start, eind);
  const s = leesDag(start);
  const v = leesDag(vandaag);
  if (totaal === null || !s || !v) return null;
  const gedaan = Math.round((v.getTime() - s.getTime()) / DAG_MS) + 1;
  return Math.min(100, Math.max(0, (gedaan / totaal) * 100));
}
