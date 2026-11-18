import { getal, haalOp, tekst, type WindsorFilter, type WindsorRij } from "@/lib/windsor/api";
import {
  KPI_JAAR,
  eventBron,
  gewoneEvents,
  heeftAankopen,
  padEvents,
  type KpiWebsite,
} from "@/lib/kpi2027/definities";

/**
 * De wekelijkse ophaalactie van het tabblad KPI's 2027: per website rechtstreeks bij
 * Windsor, niet uit de GA4-tabellen in de database.
 *
 * ## Waarom niet uit de database
 *
 * `windsor_ga4_events` en `windsor_ga4_verkeer` beginnen op 1 augustus 2026 (de nachtelijke
 * sync haalt dertig dagen, de historie is nooit verder teruggehaald), kennen geen
 * hostname en kennen gebruikers alleen per dag. Een jaarverwachting op vier maanden zou
 * januari t/m juli missen.
 *
 * ## Vier opvragingen per website, alle met een plat filter
 *
 *  1. De events per dag, gefilterd op naam aan Windsors kant ("of" ertussen).
 *  2. Per event met een padvoorwaarde (Bentley's oude offertemeting) één opvraging met
 *     naam én pad ("en" ertussen).
 *  3. Sessies per dag — en voor VELOO ook `ecommerce_purchases`.
 *  4. Actieve gebruikers per maand (`year_month`): per maand ontdubbeld.
 *
 * De eerste drie halen `hostname` als dimensie mee en laten de uitgesloten hosts in de
 * code vallen: sessies, events en aankopen tellen exact op over hostnames (een event heeft
 * er precies één). Gebruikers niet — wie op twee hosts kwam, zou twee keer tellen — dus
 * daar gaat de uitsluiting als filter mee naar Windsor. Zo bestaat elk filter uit één soort
 * verbinding ("of" óf "en"), precies de vorm die de nachtelijke sync al jaren gebruikt; een
 * genest filter is bij Windsor niet nodig en dus ook niet geprobeerd.
 */

export interface OpgehaaldeStand {
  /** Per bron: datum → aantal. */
  dagen: Record<string, Record<string, number>>;
  gebruikers: number[];
  rijen: number;
}

/** `2026-03-04` of `20260304` → `2026-03-04`, maar alleen in het gevraagde jaar. */
export function datumUit(waarde: unknown, jaar: number): string | null {
  const t = tekst(waarde)?.replace(/\D/g, "");
  if (!t || t.length < 8) return null;
  const d = `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`;
  return Number(t.slice(0, 4)) === jaar ? d : null;
}

/** `202603` → index 2, maar alleen in het gevraagde jaar. */
export function maandIndex(waarde: unknown, jaar: number = KPI_JAAR): number | null {
  const t = tekst(waarde)?.replace(/\D/g, "");
  if (!t || t.length !== 6) return null;
  if (Number(t.slice(0, 4)) !== jaar) return null;
  const maand = Number(t.slice(4, 6));
  return maand >= 1 && maand <= 12 ? maand - 1 : null;
}

/** "Event a of event b of …" — de vorm van `leadEventFilter` in de sync. */
export function eventFilter(events: readonly string[]): WindsorFilter {
  const filter: WindsorFilter = [];
  for (const [i, naam] of events.entries()) {
    if (i > 0) filter.push("or");
    filter.push(["event_name", "eq", naam]);
  }
  return filter;
}

/** "Hostname is niet a en niet b …", alleen voor de gebruikersopvraging. */
export function hostUitsluiting(hosts: readonly string[]): WindsorFilter | undefined {
  if (hosts.length === 0) return undefined;
  const filter: WindsorFilter = [];
  for (const [i, host] of hosts.entries()) {
    if (i > 0) filter.push("and");
    filter.push(["hostname", "neq", host]);
  }
  return filter;
}

function telOp(doel: Record<string, Record<string, number>>, bron: string, datum: string, n: number) {
  if (!n) return;
  const reeks = (doel[bron] ??= {});
  reeks[datum] = (reeks[datum] ?? 0) + n;
}

export interface WebsiteRijen {
  events: WindsorRij[];
  /** Per padevent (bronsleutel) zijn rijen. */
  padEvents: Record<string, WindsorRij[]>;
  verkeer: WindsorRij[];
  gebruikers: WindsorRij[];
}

/** Van Windsor-rijen naar de stand van één website. Uitgesloten hosts tellen niet mee. */
export function standUitRijen(website: KpiWebsite, rijen: WebsiteRijen, jaar: number = KPI_JAAR): OpgehaaldeStand {
  const uitgesloten = new Set(website.uitgeslotenHosts);
  const telt = (rij: WindsorRij) => !uitgesloten.has(tekst(rij.hostname) ?? "");
  const gezocht = new Set(gewoneEvents(website));
  const dagen: Record<string, Record<string, number>> = {};

  for (const rij of rijen.events) {
    const naam = tekst(rij.event_name);
    const datum = datumUit(rij.date, jaar);
    if (!naam || !datum || !gezocht.has(naam) || !telt(rij)) continue;
    telOp(dagen, `event:${naam}`, datum, getal(rij.event_count));
  }

  for (const event of padEvents(website)) {
    const bron = eventBron(event);
    for (const rij of rijen.padEvents[bron] ?? []) {
      const datum = datumUit(rij.date, jaar);
      if (!datum || !telt(rij)) continue;
      telOp(dagen, bron, datum, getal(rij.event_count));
    }
  }

  for (const rij of rijen.verkeer) {
    const datum = datumUit(rij.date, jaar);
    if (!datum || !telt(rij)) continue;
    telOp(dagen, "sessies", datum, getal(rij.sessions));
    telOp(dagen, "aankopen", datum, getal(rij.ecommerce_purchases));
  }

  const gebruikers = Array.from({ length: 12 }, () => 0);
  for (const rij of rijen.gebruikers) {
    const i = maandIndex(rij.year_month, jaar);
    if (i !== null) gebruikers[i] += getal(rij.active_users);
  }

  const aantalRijen =
    rijen.events.length +
    Object.values(rijen.padEvents).reduce((t, r) => t + r.length, 0) +
    rijen.verkeer.length +
    rijen.gebruikers.length;
  return { dagen, gebruikers, rijen: aantalRijen };
}

/**
 * Haalt de stand van één website op, van 1 januari t/m de peildatum van `jaar`.
 *
 * Een antwoord zonder één sessie is een fout en geen nul: elke website heeft elke maand
 * honderden tot honderdduizenden sessies, dus een leeg antwoord betekent dat er iets aan
 * de koppeling mankeert. De aanroeper schrijft dan niets weg, zodat de stand van vorige
 * week blijft staan in plaats van een jaar vol nullen.
 */
export async function haalWebsiteStand(
  website: KpiWebsite,
  peildatum: string,
  jaar: number,
  haal: typeof haalOp = haalOp,
): Promise<OpgehaaldeStand> {
  const van = `${jaar}-01-01`;
  const accounts = [website.property];
  const events = gewoneEvents(website);
  const metPad = padEvents(website);

  const [eventRijen, padRijen, verkeerRijen, gebruikerRijen] = await Promise.all([
    events.length > 0
      ? haal("googleanalytics4", ["date", "event_name", "hostname", "event_count"], van, peildatum, eventFilter(events), accounts)
      : Promise.resolve([] as WindsorRij[]),
    Promise.all(
      metPad.map((e) =>
        haal(
          "googleanalytics4",
          ["date", "hostname", "event_count"],
          van,
          peildatum,
          [["event_name", "eq", e.naam], "and", ["page_path", "contains", e.paginaBevat ?? ""]],
          accounts,
        ),
      ),
    ),
    haal(
      "googleanalytics4",
      heeftAankopen(website) ? ["date", "hostname", "sessions", "ecommerce_purchases"] : ["date", "hostname", "sessions"],
      van,
      peildatum,
      undefined,
      accounts,
    ),
    haal("googleanalytics4", ["year_month", "active_users"], van, peildatum, hostUitsluiting(website.uitgeslotenHosts), accounts),
  ]);

  const padEventRijen: Record<string, WindsorRij[]> = {};
  metPad.forEach((e, i) => (padEventRijen[eventBron(e)] = padRijen[i]));

  const stand = standUitRijen(
    website,
    { events: eventRijen, padEvents: padEventRijen, verkeer: verkeerRijen, gebruikers: gebruikerRijen },
    jaar,
  );
  if (Object.keys(stand.dagen.sessies ?? {}).length === 0) {
    throw new Error(
      `${website.naam}: GA4 gaf geen sessies over ${van} t/m ${peildatum}; de vorige stand blijft staan.`,
    );
  }
  return stand;
}
