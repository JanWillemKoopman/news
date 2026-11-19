import type { Client } from "pg";
import { metVerbinding } from "@/lib/kanalen/bron";
import type { KpiStand } from "@/lib/kpi2027/rekenen";

/**
 * Lezen en schrijven van `kpi_2027_standen` (migratie 0035): één rij per website per jaar.
 *
 * Lezen gaat via de leesverbinding (`DATAQUERY_DATABASE_URL`, de view), schrijven alleen
 * vanuit de wekelijkse ophaalactie met de schrijvende verbinding — dezelfde scheiding als
 * bij de Windsor-sync.
 */

function reeks(waarde: unknown): number[] {
  const lijst = Array.isArray(waarde) ? waarde : [];
  return Array.from({ length: 12 }, (_, i) => Number(lijst[i]) || 0);
}

function dagen(waarde: unknown): Record<string, Record<string, number>> {
  const uit: Record<string, Record<string, number>> = {};
  if (typeof waarde !== "object" || waarde === null) return uit;
  for (const [bron, per] of Object.entries(waarde as Record<string, unknown>)) {
    if (typeof per !== "object" || per === null) continue;
    const r: Record<string, number> = {};
    for (const [datum, n] of Object.entries(per as Record<string, unknown>)) r[datum] = Number(n) || 0;
    uit[bron] = r;
  }
  return uit;
}

function rijNaarStand(r: Record<string, unknown>): KpiStand {
  return {
    website: String(r.website),
    jaar: Number(r.jaar),
    peildatum: String(r.peildatum),
    berekendOp: new Date(r.berekend_op as string).toISOString(),
    definitief: Boolean(r.definitief),
    dagen: dagen(r.dagen),
    gebruikers: reeks(r.gebruikers),
  };
}

/** Alle standen: per website hooguit één voor 2026, één voor 2027 en één voor zijn vergelijkingsjaar. */
export async function leesStanden(): Promise<KpiStand[]> {
  return metVerbinding(async (client) => {
    const res = await client.query(
      `select website, jaar, peildatum::text as peildatum, berekend_op, definitief, dagen, gebruikers
         from dataloket.v_kpi_2027_standen`,
    );
    return res.rows.map(rijNaarStand);
  });
}

/** Staat er voor deze website en dit jaar al een definitieve stand? */
export async function isStandDefinitief(client: Client, website: string, jaar: number): Promise<boolean> {
  const res = await client.query(
    `select 1 from dataloket.kpi_2027_standen where website = $1 and jaar = $2 and definitief limit 1`,
    [website, jaar],
  );
  return (res.rowCount ?? 0) > 0;
}

/** Schrijft de stand van één website over één jaar weg; overschrijft de vorige van dat jaar. */
export async function schrijfStand(client: Client, stand: Omit<KpiStand, "berekendOp">): Promise<void> {
  await client.query(
    `insert into dataloket.kpi_2027_standen (website, jaar, peildatum, berekend_op, definitief, dagen, gebruikers)
     values ($1, $2, $3, now(), $4, $5::jsonb, $6::jsonb)
     on conflict (website, jaar) do update
       set peildatum   = excluded.peildatum,
           berekend_op = excluded.berekend_op,
           definitief  = excluded.definitief,
           dagen       = excluded.dagen,
           gebruikers  = excluded.gebruikers`,
    [
      stand.website,
      stand.jaar,
      stand.peildatum,
      stand.definitief,
      JSON.stringify(stand.dagen),
      JSON.stringify(stand.gebruikers),
    ],
  );
}
