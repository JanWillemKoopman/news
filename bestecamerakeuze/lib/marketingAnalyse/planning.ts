import type { Formulier, Planning } from "./types";

/**
 * De planning van de analyseronde (migratie 0049, plan §17). Dezelfde regel staat in SQL
 * (`dataloket.marketing_analyse_ronde`), die de skill gebruikt; dit is de versie voor het
 * dashboard. Houd ze gelijk.
 *
 * - Een ronde hoort bij een week (maandag t/m zondag). De vrijdag van die week is de rondedag,
 *   dus wie een keer op donderdag draait, draait de ronde van die week.
 * - Wekelijks: elke week één keer. Maandelijks: vanaf de eerste vrijdag van de maand. Per
 *   kwartaal: vanaf de eerste vrijdag van januari, april, juli en oktober.
 * - Een regel is aan de beurt zolang er sinds de week van de geplande vrijdag geen versie is.
 *   Een gemiste vrijdag wordt zo ingehaald, en twee keer draaien maakt niets dubbel.
 * - Een campagne die nog niet begonnen is, wacht tot de eerste ronde na de startdatum. Een
 *   campagne waarvan de einddatum voorbij is, krijgt haar eindevaluatie (tenzij Uit).
 * - Een rapportage op Maandelijks of Per kwartaal gaat over de vorige volle maand of het vorige
 *   volle kwartaal; bij Wekelijks of Uit geldt de vrije periode uit de briefing.
 *
 * Datums zijn overal "JJJJ-MM-DD" in de Nederlandse kalender.
 */

export type PlanningReden =
  | "uit"
  | "nog niet gestart"
  | "eindevaluatie"
  | "eerste analyse"
  | "ingehaald"
  | "wekelijks"
  | "maandelijks"
  | "per kwartaal"
  | "gepland"
  | "eindevaluatie gepland";

export interface PlanningInvoer {
  planning: Planning;
  formulier: Formulier;
  startdatum: string | null;
  einddatum: string | null;
  /** De dag (Nederlandse kalender) van de laatste versie; null zonder analyse. */
  laatsteAnalyse: string | null;
}

export interface PlanningStand {
  aanDeBeurt: boolean;
  reden: PlanningReden;
  /** De eerstvolgende ronde waarin de regel draait; null bij Uit. */
  volgende: string | null;
  periodeVan: string | null;
  periodeTot: string | null;
}

// ---------------------------------------------------------------------------
// Datums
// ---------------------------------------------------------------------------

function naarDatum(s: string): Date {
  return new Date(`${s.slice(0, 10)}T00:00:00Z`);
}

function naarTekst(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function plusDagen(s: string, dagen: number): string {
  const d = naarDatum(s);
  d.setUTCDate(d.getUTCDate() + dagen);
  return naarTekst(d);
}

/** Maandag = 1 … zondag = 7. */
function isoDag(s: string): number {
  return naarDatum(s).getUTCDay() || 7;
}

/** De vrijdag op of na deze dag. */
export function volgendeVrijdag(s: string): string {
  return plusDagen(s, (5 - isoDag(s) + 7) % 7);
}

/** De vrijdag van de week (maandag t/m zondag) waarin deze dag valt. */
export function vrijdagVanWeek(s: string): string {
  return plusDagen(s, 5 - isoDag(s));
}

function eersteVanMaand(s: string, plusMaanden = 0): string {
  const d = naarDatum(s);
  return naarTekst(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + plusMaanden, 1)));
}

function eersteVanKwartaal(s: string, plusKwartalen = 0): string {
  const d = naarDatum(s);
  const maand = d.getUTCMonth() - (d.getUTCMonth() % 3) + plusKwartalen * 3;
  return naarTekst(new Date(Date.UTC(d.getUTCFullYear(), maand, 1)));
}

/** De eerste vrijdag van de maand waarin deze dag valt. */
export function eersteVrijdag(s: string): string {
  return volgendeVrijdag(eersteVanMaand(s));
}

const kleinste = (a: string, b: string) => (a < b ? a : b);

/** De dag van een tijdstip in de Nederlandse kalender. */
export function dagNL(tijdstip: string): string {
  const d = new Date(tijdstip);
  if (Number.isNaN(d.getTime())) return tijdstip.slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(d);
}

// ---------------------------------------------------------------------------
// De rekenregel
// ---------------------------------------------------------------------------

export function planningStand(r: PlanningInvoer, vandaag: string): PlanningStand {
  const vrijdag = vrijdagVanWeek(vandaag);
  const maandag = plusDagen(vrijdag, -4);
  const gisteren = plusDagen(vandaag, -1);
  const campagne = r.formulier === "campagne";
  let aanDeBeurt = false;
  let reden: PlanningReden;
  let volgende: string | null = null;
  let ref: string | null = null;

  if (r.planning === "uit") {
    reden = "uit";
  } else if (campagne && r.startdatum && r.startdatum >= vandaag) {
    reden = "nog niet gestart";
    volgende = volgendeVrijdag(plusDagen(r.startdatum, 1));
  } else if (campagne && r.einddatum && r.einddatum < vandaag) {
    aanDeBeurt = true;
    reden = "eindevaluatie";
    volgende = volgendeVrijdag(vandaag);
  } else {
    const gepland =
      r.planning === "week" ? vrijdag : r.planning === "maand" ? eersteVrijdag(vrijdag) : eersteVrijdag(eersteVanKwartaal(vrijdag));
    // Een versie uit de week van de geplande vrijdag (of later) telt.
    const drempel = plusDagen(gepland, -4);
    if (!r.laatsteAnalyse || r.laatsteAnalyse < drempel) {
      aanDeBeurt = true;
      volgende = volgendeVrijdag(vandaag);
      ref = gepland;
      reden = !r.laatsteAnalyse
        ? "eerste analyse"
        : r.planning !== "week" && drempel < maandag
          ? "ingehaald"
          : r.planning === "week"
            ? "wekelijks"
            : r.planning === "maand"
              ? "maandelijks"
              : "per kwartaal";
    } else {
      volgende =
        r.planning === "week"
          ? plusDagen(vrijdag, 7)
          : r.planning === "maand"
            ? eersteVrijdag(eersteVanMaand(vrijdag, 1))
            : eersteVrijdag(eersteVanKwartaal(vrijdag, 1));
      ref = volgende;
      reden = "gepland";
      if (campagne && r.einddatum && r.einddatum < volgende) {
        volgende = volgendeVrijdag(plusDagen(r.einddatum, 1));
        reden = "eindevaluatie gepland";
      }
    }
  }

  let periodeVan: string | null = null;
  let periodeTot: string | null = null;
  if (campagne && aanDeBeurt) {
    periodeVan = r.startdatum;
    periodeTot = kleinste(r.einddatum ?? gisteren, gisteren);
  } else if (!campagne && ref && (r.planning === "maand" || r.planning === "kwartaal")) {
    const begin = r.planning === "maand" ? eersteVanMaand(ref) : eersteVanKwartaal(ref);
    periodeVan = r.planning === "maand" ? eersteVanMaand(ref, -1) : eersteVanKwartaal(ref, -1);
    periodeTot = plusDagen(begin, -1);
    if (aanDeBeurt) periodeTot = kleinste(periodeTot, gisteren);
  }

  return { aanDeBeurt, reden, volgende, periodeVan, periodeTot };
}

// ---------------------------------------------------------------------------
// Voor het scherm
// ---------------------------------------------------------------------------

const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const KORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

/** "vr 4 dec", met het jaar erbij als dat niet het jaar van vandaag is. */
export function vrijdagKort(datum: string, vandaag: string): string {
  const d = naarDatum(datum);
  const jaar = d.getUTCFullYear() !== naarDatum(vandaag).getUTCFullYear() ? ` ${d.getUTCFullYear()}` : "";
  return `vr ${d.getUTCDate()} ${KORT[d.getUTCMonth()]}${jaar}`;
}

/** "vrijdag 27 november" */
export function vrijdagLang(datum: string, vandaag: string): string {
  const d = naarDatum(datum);
  const jaar = d.getUTCFullYear() !== naarDatum(vandaag).getUTCFullYear() ? ` ${d.getUTCFullYear()}` : "";
  return `vrijdag ${d.getUTCDate()} ${MAANDEN[d.getUTCMonth()]}${jaar}`;
}

/** "over november", "over december 2026", "over Q4 2026". */
export function periodeLabel(planning: Planning, periodeVan: string | null, vandaag: string): string | null {
  if (!periodeVan || (planning !== "maand" && planning !== "kwartaal")) return null;
  const d = naarDatum(periodeVan);
  if (planning === "kwartaal") return `over Q${Math.floor(d.getUTCMonth() / 3) + 1} ${d.getUTCFullYear()}`;
  const jaar = d.getUTCFullYear() !== naarDatum(vandaag).getUTCFullYear() ? ` ${d.getUTCFullYear()}` : "";
  return `over ${MAANDEN[d.getUTCMonth()]}${jaar}`;
}

export type PlanningToon = "klaar" | "eind" | "gewoon" | "uit";

export interface VolgendeWeergave {
  /** "vr 4 dec"; null bij Uit. */
  datum: string | null;
  /** Wat erachter staat: "over november", "eindevaluatie", "ingehaald" … */
  toelichting: string | null;
  /** Blauw = staat klaar, oranje = eindevaluatie. */
  toon: PlanningToon;
}

/** De regel onder het uitklapmenu en achter elke keuze. */
export function volgendeWeergave(r: PlanningInvoer, vandaag: string, stand = planningStand(r, vandaag)): VolgendeWeergave {
  if (!stand.volgende) return { datum: null, toelichting: null, toon: "uit" };
  const datum = vrijdagKort(stand.volgende, vandaag);
  const eind =
    stand.reden === "eindevaluatie" ||
    stand.reden === "eindevaluatie gepland" ||
    (r.formulier === "campagne" && Boolean(r.einddatum) && (r.einddatum as string) < stand.volgende);
  if (eind) return { datum, toelichting: "eindevaluatie", toon: "eind" };
  const periode = periodeLabel(r.planning, stand.periodeVan, vandaag);
  if (stand.reden === "nog niet gestart") return { datum, toelichting: "eerste analyse", toon: "gewoon" };
  const toelichting = [stand.reden === "ingehaald" ? "ingehaald" : null, periode].filter(Boolean).join(" · ") || null;
  return { datum, toelichting, toon: stand.aanDeBeurt ? "klaar" : "gewoon" };
}

/** De dag van de eerstvolgende ronde: vandaag als het vrijdag is, anders de komende vrijdag. */
export function rondeDag(vandaag: string): string {
  return volgendeVrijdag(vandaag);
}

/** Welke regels in de eerstvolgende ronde draaien, met hun stand. */
export function volgendeRonde<T extends PlanningInvoer>(regels: readonly T[], vandaag: string) {
  const dag = rondeDag(vandaag);
  return regels
    .map((regel) => ({ regel, stand: planningStand(regel, vandaag) }))
    .filter(({ stand }) => stand.volgende === dag);
}
