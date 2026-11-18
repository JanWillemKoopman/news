import { getal, haalOp, tekst, type WindsorFilter, type WindsorRij } from "@/lib/windsor/api";
import { KPI_JAAR, KPI_PROPERTY, kpiEvents } from "@/lib/kpi2027/definities";

/**
 * De wekelijkse ophaalactie van het tabblad KPI's 2027: rechtstreeks bij Windsor, niet uit
 * de GA4-tabellen in de database.
 *
 * ## Waarom niet uit de database
 *
 * `windsor_ga4_events` en `windsor_ga4_verkeer` beginnen op dit moment op 1 augustus 2026
 * (de nachtelijke sync haalt dertig dagen, de historie is nooit verder teruggehaald). Een
 * jaarverwachting op vier maanden zou januari t/m juli missen. Daarnaast kan de database
 * gebruikers alleen per dag geven, terwijl het target per maand ontdubbeld rekent.
 *
 * Twee kleine opvragingen over één property, gegroepeerd per maand (`year_month`): een
 * paar honderd rijen, ook aan het eind van het jaar. Dat past ruim in één functie-aanroep.
 *
 *  1. De KPI-events, gefilterd aan Windsors kant — wat geen KPI is komt niet over de lijn.
 *  2. Sessies en gebruikers per maand. `totalusers` met `year_month` als dimensie is het
 *     per maand ontdubbelde cijfer dat GA4 ook in het maandrapport toont.
 */

export interface OpgehaaldeStand {
  events: Record<string, number[]>;
  sessies: number[];
  gebruikers: number[];
  rijen: number;
}

function nulreeks(): number[] {
  return Array.from({ length: 12 }, () => 0);
}

/** `202603` (of 202603 als getal) → index 2, maar alleen in het basisjaar. */
export function maandIndex(waarde: unknown, jaar: number = KPI_JAAR): number | null {
  const t = tekst(waarde)?.replace(/\D/g, "");
  if (!t || t.length !== 6) return null;
  if (Number(t.slice(0, 4)) !== jaar) return null;
  const maand = Number(t.slice(4, 6));
  return maand >= 1 && maand <= 12 ? maand - 1 : null;
}

/** Het Windsor-filter: precies de events uit de definities, met "of" ertussen. */
export function kpiEventFilter(events: readonly string[] = kpiEvents()): WindsorFilter {
  const filter: WindsorFilter = [];
  for (const [i, naam] of events.entries()) {
    if (i > 0) filter.push("or");
    filter.push(["event_name", "eq", naam]);
  }
  return filter;
}

/** Van Windsor-rijen naar maandreeksen. Een event dat niet in de lijst staat, telt niet. */
export function standUitRijen(
  eventRijen: WindsorRij[],
  verkeerRijen: WindsorRij[],
  events: readonly string[] = kpiEvents(),
  jaar: number = KPI_JAAR,
): OpgehaaldeStand {
  const gezocht = new Set(events);
  const perEvent: Record<string, number[]> = {};
  for (const naam of events) perEvent[naam] = nulreeks();

  for (const rij of eventRijen) {
    const naam = tekst(rij.event_name);
    const i = maandIndex(rij.year_month, jaar);
    if (!naam || i === null || !gezocht.has(naam)) continue;
    perEvent[naam][i] += getal(rij.event_count);
  }

  const sessies = nulreeks();
  const gebruikers = nulreeks();
  for (const rij of verkeerRijen) {
    const i = maandIndex(rij.year_month, jaar);
    if (i === null) continue;
    sessies[i] += getal(rij.sessions);
    gebruikers[i] += getal(rij.totalusers);
  }

  return { events: perEvent, sessies, gebruikers, rijen: eventRijen.length + verkeerRijen.length };
}

/**
 * Haalt de stand van 1 januari t/m de peildatum op.
 *
 * Een antwoord zonder één sessie is een fout en geen nul: udenhout.nl heeft elke maand
 * ruim honderdduizend sessies, dus een leeg antwoord betekent dat er iets aan de koppeling
 * mankeert. De aanroeper schrijft dan niets weg, zodat de stand van vorige week blijft
 * staan in plaats van een jaar vol nullen.
 */
export async function haalKpiStand(
  peildatum: string,
  haal: typeof haalOp = haalOp,
  jaar: number = KPI_JAAR,
): Promise<OpgehaaldeStand> {
  const van = `${jaar}-01-01`;
  const events = kpiEvents();

  const [eventRijen, verkeerRijen] = await Promise.all([
    haal(
      "googleanalytics4",
      ["year_month", "event_name", "event_count"],
      van,
      peildatum,
      kpiEventFilter(events),
      [KPI_PROPERTY],
    ),
    haal("googleanalytics4", ["year_month", "sessions", "totalusers"], van, peildatum, undefined, [KPI_PROPERTY]),
  ]);

  const stand = standUitRijen(eventRijen, verkeerRijen, events, jaar);
  if (stand.sessies.every((n) => n === 0)) {
    throw new Error(
      `GA4 gaf geen sessies voor udenhout.nl over ${van} t/m ${peildatum}; de stand van vorige week blijft staan.`,
    );
  }
  return stand;
}
