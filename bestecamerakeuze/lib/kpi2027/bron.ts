import type { Client } from "pg";
import { metVerbinding } from "@/lib/kanalen/bron";
import type { KpiStand } from "@/lib/kpi2027/rekenen";

/**
 * Lezen en schrijven van `kpi_2027_standen` (migratie 0034).
 *
 * Lezen gaat via de leesverbinding (`DATAQUERY_DATABASE_URL`, de view), schrijven alleen
 * vanuit de wekelijkse ophaalactie met de schrijvende verbinding — dezelfde scheiding als
 * bij de Windsor-sync.
 */

function reeks(waarde: unknown): number[] {
  const lijst = Array.isArray(waarde) ? waarde : [];
  return Array.from({ length: 12 }, (_, i) => Number(lijst[i]) || 0);
}

function rijNaarStand(r: Record<string, unknown>): KpiStand {
  const events: Record<string, number[]> = {};
  const ruw = (r.events ?? {}) as Record<string, unknown>;
  for (const [naam, waarden] of Object.entries(ruw)) events[naam] = reeks(waarden);
  return {
    peildatum: String(r.peildatum),
    berekendOp: new Date(r.berekend_op as string).toISOString(),
    definitief: Boolean(r.definitief),
    events,
    sessies: reeks(r.sessies),
    gebruikers: reeks(r.gebruikers),
  };
}

/** De meest recente stand, of null als er nog nooit een is weggeschreven. */
export async function leesLaatsteStand(): Promise<KpiStand | null> {
  return metVerbinding(async (client) => {
    const res = await client.query(
      `select peildatum::text as peildatum, berekend_op, definitief, events, sessies, gebruikers
         from dataloket.v_kpi_2027_standen
        order by peildatum desc
        limit 1`,
    );
    return res.rows[0] ? rijNaarStand(res.rows[0]) : null;
  });
}

/** Staat er al een stand waarin heel 2026 gemeten is? Dan hoeft de cron niets meer. */
export async function heeftDefinitieveStand(client: Client): Promise<boolean> {
  const res = await client.query(`select 1 from dataloket.kpi_2027_standen where definitief limit 1`);
  return (res.rowCount ?? 0) > 0;
}

/** Schrijft de stand van één peildatum weg; dezelfde peildatum opnieuw overschrijft hem. */
export async function schrijfStand(client: Client, stand: Omit<KpiStand, "berekendOp">): Promise<void> {
  await client.query(
    `insert into dataloket.kpi_2027_standen (peildatum, berekend_op, definitief, events, sessies, gebruikers)
     values ($1, now(), $2, $3::jsonb, $4::jsonb, $5::jsonb)
     on conflict (peildatum) do update
       set berekend_op = excluded.berekend_op,
           definitief  = excluded.definitief,
           events      = excluded.events,
           sessies     = excluded.sessies,
           gebruikers  = excluded.gebruikers`,
    [
      stand.peildatum,
      stand.definitief,
      JSON.stringify(stand.events),
      JSON.stringify(stand.sessies),
      JSON.stringify(stand.gebruikers),
    ],
  );
}
