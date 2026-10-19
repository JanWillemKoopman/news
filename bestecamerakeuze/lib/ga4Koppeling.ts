/**
 * GA-conversies per campagne: welke GA4-events tellen voor welke campagne.
 *
 * Een campagne heeft een lijst **regels**; alles wat één van de regels matcht telt mee.
 * Binnen een regel zijn de events "of" en de voorwaarden "en":
 *
 *   events [generate_lead_proefrit, generate_lead_offerte] + pagina bevat /audi
 *   = elke proefrit- of offerteaanvraag op een pagina waarvan het pad /audi bevat.
 *
 * Twee regels die dezelfde rij matchen tellen hem één keer, niet twee: de regels worden
 * in één `where … or …` gezet en niet als losse optellingen bij elkaar gelegd. Wie twee
 * keer hetzelfde formulier aanvinkt, krijgt dus niet stilletjes een verdubbeld cijfer.
 *
 * Dit bestand is bewust zonder database en zonder React: de vertaling naar SQL is precies
 * het stuk dat niet fout mag gaan (een verkeerd haakje telt de hele website mee), en dat
 * is zo te testen — zie `ga4Koppeling.test.ts`. Elke waarde gaat als parameter mee, en
 * elke kolomnaam komt uit `KOLOM_VOOR_VELD` hieronder en nooit uit de invoer.
 *
 * Tabel: `dataloket.campagne_ga4_doelen`, data: `dataloket.v_ga4_event_paginas` — zie
 * `supabase/migrations/0031_ga4_campagne_conversies.sql`.
 */

export const VOORWAARDE_VELDEN = [
  "pagina",
  "querystring",
  "url",
  "website",
  "kanaalgroep",
  "campagne",
] as const;
export type VoorwaardeVeld = (typeof VOORWAARDE_VELDEN)[number];

export const OPERATOREN = ["bevat", "bevat_niet", "is", "is_niet", "begint_met"] as const;
export type Operator = (typeof OPERATOREN)[number];

export const VELD_LABELS: Record<VoorwaardeVeld, string> = {
  pagina: "Paginapad",
  querystring: "Querystring",
  url: "Pad + querystring",
  website: "Website",
  kanaalgroep: "Kanaalgroep",
  campagne: "UTM-campagne",
};

export const OPERATOR_LABELS: Record<Operator, string> = {
  bevat: "bevat",
  bevat_niet: "bevat niet",
  is: "is",
  is_niet: "is niet",
  begint_met: "begint met",
};

export interface Voorwaarde {
  veld: VoorwaardeVeld;
  operator: Operator;
  waarde: string;
}

export interface Regel {
  events: string[];
  voorwaarden: Voorwaarde[];
}

/** Wat er per campagne is vastgelegd. */
export interface Ga4Koppeling {
  campagneNaam: string;
  doelConversies: number | null;
  regels: Regel[];
  bijgewerktOp: string | null;
}

/**
 * De kolom in `v_ga4_event_paginas` per veld. "url" is geen kolom maar het pad met de
 * querystring erachter, zoals hij in de adresbalk staat (zonder trackingparameters) — zo
 * kan iemand die een URL uit de browser plakt er ook op filteren.
 */
const KOLOM_VOOR_VELD: Record<VoorwaardeVeld, string> = {
  pagina: "pagina",
  querystring: "querystring",
  url: "(pagina || case when querystring = '' then '' else '?' || querystring end)",
  website: "coalesce(website, '')",
  kanaalgroep: "kanaalgroep",
  campagne: "campagne",
};

/** Bovengrenzen: ruim boven elk zinnig gebruik, en een vangnet tegen een query van een meter. */
const MAX_REGELS = 20;
const MAX_EVENTS = 50;
const MAX_VOORWAARDEN = 10;
const MAX_WAARDE = 500;

export type Controle<T> = { ok: true; waarde: T } | { ok: false; fout: string };

/**
 * Controleert regels die van buiten komen (de API-body of de jsonb uit de database) en
 * geeft ze genormaliseerd terug: getrimd, zonder lege of dubbele events. Een regel zonder
 * events is een fout en geen "alles": een vergeten vinkje mag nooit de hele website als
 * conversie laten tellen.
 */
export function controleerRegels(invoer: unknown): Controle<Regel[]> {
  if (!Array.isArray(invoer)) return { ok: false, fout: "Regels moeten een lijst zijn." };
  if (invoer.length > MAX_REGELS) return { ok: false, fout: `Maximaal ${MAX_REGELS} regels.` };

  const regels: Regel[] = [];
  for (const [i, ruw] of invoer.entries()) {
    const nummer = i + 1;
    if (typeof ruw !== "object" || ruw === null) return { ok: false, fout: `Regel ${nummer} is ongeldig.` };
    const r = ruw as Record<string, unknown>;

    if (!Array.isArray(r.events)) return { ok: false, fout: `Regel ${nummer}: kies minstens één event.` };
    const events = [
      ...new Set(
        r.events
          .filter((e): e is string => typeof e === "string")
          .map((e) => e.trim())
          .filter(Boolean),
      ),
    ];
    if (events.length === 0) return { ok: false, fout: `Regel ${nummer}: kies minstens één event.` };
    if (events.length > MAX_EVENTS) return { ok: false, fout: `Regel ${nummer}: maximaal ${MAX_EVENTS} events.` };

    const ruweVoorwaarden = r.voorwaarden ?? [];
    if (!Array.isArray(ruweVoorwaarden)) return { ok: false, fout: `Regel ${nummer}: voorwaarden zijn ongeldig.` };
    if (ruweVoorwaarden.length > MAX_VOORWAARDEN) {
      return { ok: false, fout: `Regel ${nummer}: maximaal ${MAX_VOORWAARDEN} voorwaarden.` };
    }

    const voorwaarden: Voorwaarde[] = [];
    for (const v of ruweVoorwaarden) {
      if (typeof v !== "object" || v === null) return { ok: false, fout: `Regel ${nummer}: voorwaarde ongeldig.` };
      const { veld, operator, waarde } = v as Record<string, unknown>;
      if (!VOORWAARDE_VELDEN.includes(veld as VoorwaardeVeld)) {
        return { ok: false, fout: `Regel ${nummer}: onbekend veld.` };
      }
      if (!OPERATOREN.includes(operator as Operator)) {
        return { ok: false, fout: `Regel ${nummer}: onbekende vergelijking.` };
      }
      const tekst = typeof waarde === "string" ? waarde.trim() : "";
      // Een lege waarde bij "bevat" matcht alles; dat is nooit wat iemand bedoelt. Bij
      // "is" kan leeg wél betekenis hebben (geen querystring), dus daar mag het.
      if (!tekst && operator !== "is" && operator !== "is_niet") {
        return { ok: false, fout: `Regel ${nummer}: vul bij ${VELD_LABELS[veld as VoorwaardeVeld]} een waarde in.` };
      }
      if (tekst.length > MAX_WAARDE) return { ok: false, fout: `Regel ${nummer}: waarde is te lang.` };
      voorwaarden.push({ veld: veld as VoorwaardeVeld, operator: operator as Operator, waarde: tekst });
    }

    regels.push({ events, voorwaarden });
  }
  return { ok: true, waarde: regels };
}

/** Regels uit de database: wat niet (meer) klopt telt als "niet gekoppeld", niet als fout. */
export function leesRegels(invoer: unknown): Regel[] {
  const c = controleerRegels(invoer);
  return c.ok ? c.waarde : [];
}

/** `%` en `_` in een zoekwaarde letterlijk nemen, niet als wildcard. */
function escapeLike(waarde: string): string {
  return waarde.replace(/[\\%_]/g, (teken) => `\\${teken}`);
}

/**
 * Eén voorwaarde als SQL. Vergelijkt zonder hoofdlettergevoeligheid: in GA4 staat
 * `/Audi/` en `/audi/` naast elkaar, en wie op "audi" filtert bedoelt allebei.
 */
function voorwaardeSql(v: Voorwaarde, param: (waarde: unknown) => string): string {
  const kolom = KOLOM_VOOR_VELD[v.veld];
  switch (v.operator) {
    case "bevat":
      return `${kolom} ilike ${param(`%${escapeLike(v.waarde)}%`)}`;
    case "bevat_niet":
      return `${kolom} not ilike ${param(`%${escapeLike(v.waarde)}%`)}`;
    case "begint_met":
      return `${kolom} ilike ${param(`${escapeLike(v.waarde)}%`)}`;
    case "is":
      return `lower(${kolom}) = lower(${param(v.waarde)})`;
    case "is_niet":
      return `lower(${kolom}) <> lower(${param(v.waarde)})`;
  }
}

/**
 * De `where`-voorwaarde voor een set regels, of `null` als er niets te tellen valt.
 *
 * `param` registreert een waarde en geeft de placeholder terug (`$3`); zo blijft de
 * nummering kloppen als dit stuk in een grotere query belandt.
 */
export function regelsSql(regels: Regel[], param: (waarde: unknown) => string): string | null {
  const delen = regels
    .filter((r) => r.events.length > 0)
    .map((r) => {
      const stukken = [`event_naam = any(${param(r.events)}::text[])`, ...r.voorwaarden.map((v) => voorwaardeSql(v, param))];
      return `(${stukken.join(" and ")})`;
    });
  if (delen.length === 0) return null;
  return `(${delen.join(" or ")})`;
}

export interface TelVraag {
  campagneNaam: string;
  van: string;
  tot: string;
  regels: Regel[];
}

/**
 * Eén query voor alle campagnes: per campagne een eigen `select` met zijn eigen periode
 * en regels, aan elkaar met `union all`. Geteld wordt `events` (hoe vaak het event
 * vuurde), niet `conversies` (alleen key events) — zo telt een aangevinkt event ook als
 * hij in GA4 geen key event is. Per event uitgesplitst, zodat de zijbalk kan laten zien
 * waar het getal uit bestaat.
 */
export function bouwTelQuery(vragen: TelVraag[]): { sql: string; params: unknown[] } | null {
  const params: unknown[] = [];
  const param = (waarde: unknown) => {
    params.push(waarde);
    return `$${params.length}`;
  };

  const selects: string[] = [];
  for (const vraag of vragen) {
    if (vraag.tot < vraag.van) continue;
    const where = regelsSql(vraag.regels, param);
    if (!where) continue;
    selects.push(
      `select ${param(vraag.campagneNaam)}::text as campagne, event_naam, sum(events) as aantal
         from dataloket.v_ga4_event_paginas
        where datum between ${param(vraag.van)}::date and ${param(vraag.tot)}::date
          and ${where}
        group by event_naam`,
    );
  }
  if (selects.length === 0) return null;
  return { sql: selects.join("\nunion all\n"), params };
}

/** Telling per campagne: het totaal en waar het uit bestaat. */
export interface Ga4Telling {
  totaal: number;
  perEvent: { event: string; aantal: number }[];
}

export function verwerkTelling(rijen: Record<string, unknown>[]): Record<string, Ga4Telling> {
  const uit: Record<string, Ga4Telling> = {};
  for (const rij of rijen) {
    const campagne = String(rij.campagne);
    const aantal = Number(rij.aantal ?? 0);
    const telling = (uit[campagne] ??= { totaal: 0, perEvent: [] });
    telling.totaal += aantal;
    telling.perEvent.push({ event: String(rij.event_naam), aantal });
  }
  for (const t of Object.values(uit)) t.perEvent.sort((a, b) => b.aantal - a.aantal);
  return uit;
}

/**
 * De periode waarover een campagne telt: van de startdatum tot en met de einddatum, maar
 * nooit verder dan gisteren — de sync draait 's nachts, dus vandaag staat er nog niet in
 * en zou als "nul" meetellen. Zonder startdatum is er geen periode.
 */
export function telPeriode(
  startdatum: string | null,
  einddatum: string | null,
  gisteren: string,
): { van: string; tot: string } | null {
  if (!startdatum) return null;
  const tot = einddatum && einddatum < gisteren ? einddatum : gisteren;
  return { van: startdatum, tot };
}

/** Korte omschrijving van een regel, voor in de tabel: "proefrit, offerte · pagina bevat /audi". */
export function omschrijfRegel(regel: Regel): string {
  const events = regel.events.join(", ");
  if (regel.voorwaarden.length === 0) return events;
  const voorwaarden = regel.voorwaarden
    .map((v) => `${VELD_LABELS[v.veld].toLowerCase()} ${OPERATOR_LABELS[v.operator]} ${v.waarde ? `“${v.waarde}”` : "leeg"}`)
    .join(" en ");
  return `${events} · ${voorwaarden}`;
}
