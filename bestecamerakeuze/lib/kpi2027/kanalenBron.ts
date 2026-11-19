import { Client } from "pg";
import { haalOp, isWindsorGeconfigureerd, type WindsorRij } from "@/lib/windsor/api";
import { metVerbinding } from "@/lib/kanalen/bron";
import { eisVerbindingssnaar } from "@/lib/verbindingssnaar";
import { gewoneEvents, type KpiWebsite } from "@/lib/kpi2027/definities";
import { eventFilter, hostUitsluiting } from "@/lib/kpi2027/ophalen";
import { KANALEN_VANAF, verdelingUitRijen, type KanaalVerdeling } from "@/lib/kpi2027/kanalen";

/**
 * Ophalen, bewaren en lezen van de kanaalverdeling (`kpi_2027_kanalen`, migratie 0037).
 * De indeling zelf staat in `kanalen.ts`.
 *
 * Twee opvragingen bij Windsor, van 1 januari 2025 t/m de peildatum, per maand ×
 * sessiebron/medium:
 *
 *  1. Sessies en actieve gebruikers. De uitgesloten hosts gaan als filter mee, zonder
 *     hostname als dimensie — dezelfde reden als in `ophalen.ts`: per hostname opgeteld
 *     tellen sessies dubbel.
 *  2. De events van de KPI's (`event_count`), met hostname als dimensie; de uitgesloten
 *     hosts vallen in `verdelingUitRijen` weg.
 *
 * Elke week opnieuw over de hele periode (in de cron en met "Nu bijwerken"), zodat een
 * aangepaste indeling binnen een week overal geldt. Bestaat er nog geen verdeling, dan
 * haalt de eerste klik op het knopje hem op (`/api/kpi-2027/kanalen`).
 */

export async function haalKanaalVerdeling(
  website: KpiWebsite,
  peildatum: string,
  haal: typeof haalOp = haalOp,
): Promise<KanaalVerdeling> {
  const accounts = [website.property];
  const events = gewoneEvents(website);
  const [verkeer, eventRijen] = await Promise.all([
    haal(
      "googleanalytics4",
      ["year_month", "session_source_medium", "sessions", "active_users"],
      KANALEN_VANAF,
      peildatum,
      hostUitsluiting(website.uitgeslotenHosts),
      accounts,
    ),
    events.length > 0
      ? haal(
          "googleanalytics4",
          ["year_month", "session_source_medium", "event_name", "hostname", "event_count"],
          KANALEN_VANAF,
          peildatum,
          eventFilter(events),
          accounts,
        )
      : Promise.resolve([] as WindsorRij[]),
  ]);
  if (verkeer.length === 0) {
    throw new Error(`${website.naam}: GA4 gaf geen sessies per bron/medium; de vorige verdeling blijft staan.`);
  }
  return verdelingUitRijen(website, { verkeer, events: eventRijen }, peildatum, events);
}

/** Schrijft de verdeling van één website weg; overschrijft de vorige. */
export async function schrijfKanaalVerdeling(client: Client, v: KanaalVerdeling): Promise<void> {
  await client.query(
    `insert into dataloket.kpi_2027_kanalen (website, van, peildatum, berekend_op, bronnen, staart, bron_media, staart_info)
     values ($1, $2, $3, now(), $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb)
     on conflict (website) do update
       set van         = excluded.van,
           peildatum   = excluded.peildatum,
           berekend_op = excluded.berekend_op,
           bronnen     = excluded.bronnen,
           staart      = excluded.staart,
           bron_media  = excluded.bron_media,
           staart_info = excluded.staart_info`,
    [
      v.website,
      v.van,
      v.peildatum,
      JSON.stringify(v.bronnen),
      JSON.stringify(v.staart),
      JSON.stringify(v.bronMedia),
      JSON.stringify(v.staartInfo),
    ],
  );
}

/** Haalt de verdeling op en schrijft hem weg, met een eigen schrijvende verbinding. */
export async function werkKanaalVerdelingBij(website: KpiWebsite, peildatum: string): Promise<KanaalVerdeling> {
  if (!isWindsorGeconfigureerd()) throw new Error("WINDSOR_API_KEY ontbreekt.");
  const connectionString = process.env.SYNC_DATABASE_URL;
  if (!connectionString) throw new Error("SYNC_DATABASE_URL ontbreekt.");
  eisVerbindingssnaar(connectionString, "SYNC_DATABASE_URL");
  const verdeling = await haalKanaalVerdeling(website, peildatum);
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await schrijfKanaalVerdeling(client, verdeling);
  } finally {
    await client.end().catch(() => {});
  }
  return verdeling;
}

/** De bewaarde verdeling van één website, of null als die er nog niet is. */
export async function leesKanaalVerdeling(
  website: string,
): Promise<(KanaalVerdeling & { berekendOp: string }) | null> {
  return metVerbinding(async (client) => {
    const res = await client.query(
      `select website, van::text as van, peildatum::text as peildatum, berekend_op, bronnen, staart, bron_media, staart_info
         from dataloket.v_kpi_2027_kanalen where website = $1`,
      [website],
    );
    const r = res.rows[0];
    if (!r) return null;
    return {
      website: String(r.website),
      van: String(r.van),
      peildatum: String(r.peildatum),
      berekendOp: new Date(r.berekend_op as string).toISOString(),
      bronnen: (r.bronnen ?? {}) as KanaalVerdeling["bronnen"],
      staart: (r.staart ?? {}) as KanaalVerdeling["staart"],
      bronMedia: (r.bron_media ?? []) as KanaalVerdeling["bronMedia"],
      staartInfo: (r.staart_info ?? { aantal: 0, sessies: 0 }) as KanaalVerdeling["staartInfo"],
    };
  });
}
