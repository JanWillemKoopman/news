import { Client } from "pg";
import { metVerbinding } from "@/lib/kanalen/bron";
import { eisVerbindingssnaar } from "@/lib/verbindingssnaar";
import type { CrmReeksen, CrmTelling } from "@/lib/kpi2027crm/rekenen";

/**
 * Lezen en schrijven van `kpi_2027_crm_standen` (migratie 0040): per dag per KPI één aantal.
 *
 * Lezen via de leesverbinding (`DATAQUERY_DATABASE_URL`, de view), schrijven via
 * `SYNC_DATABASE_URL` — dezelfde scheiding als bij KPI's 2027 GA en social media. Er gaan
 * alleen aantallen de database in; geen enkele waarde uit de export zelf.
 */

/** Alle bewaarde dagstanden vanaf 2026, per KPI-sleutel een reeks dag → aantal. */
export async function leesCrmStanden(): Promise<CrmReeksen> {
  return metVerbinding(async (client) => {
    const res = await client.query(
      `select datum::text as datum, kpi, aantal
         from dataloket.v_kpi_2027_crm_standen
        where datum >= date '2026-01-01'`,
    );
    const uit: CrmReeksen = {};
    for (const r of res.rows) {
      const kpi = String(r.kpi);
      (uit[kpi] ??= {})[String(r.datum)] = Number(r.aantal) || 0;
    }
    return uit;
  });
}

/**
 * Schrijft de stand van één dag weg: één rij per KPI, in één query. Dezelfde dag nog een keer
 * schrijven overschrijft alleen die dag (een latere export van dezelfde dag gaat voor).
 */
export async function schrijfCrmStand(
  client: Client,
  datum: string,
  tellingen: readonly CrmTelling[],
  exportVan: string | null,
): Promise<number> {
  if (tellingen.length === 0) return 0;
  await client.query(
    `insert into dataloket.kpi_2027_crm_standen (datum, kpi, naam, aantal, export_van, vastgelegd_op)
     select $1::date, k, n, a, $5::timestamptz, now()
       from unnest($2::text[], $3::text[], $4::int[]) as t(k, n, a)
     on conflict (datum, kpi) do update
       set naam          = excluded.naam,
           aantal        = excluded.aantal,
           export_van    = excluded.export_van,
           vastgelegd_op = excluded.vastgelegd_op`,
    [
      datum,
      tellingen.map((t) => t.sleutel),
      tellingen.map((t) => t.naam),
      tellingen.map((t) => t.aantal),
      exportVan,
    ],
  );
  return tellingen.length;
}

/** Of er geschreven kan worden: zonder `SYNC_DATABASE_URL` wordt er niets bewaard. */
export function kanCrmStandVastleggen(): boolean {
  return Boolean(process.env.SYNC_DATABASE_URL);
}

/** Een schrijvende verbinding (`SYNC_DATABASE_URL`) voor de duur van `werk`. */
export async function metSchrijfverbinding<T>(werk: (client: Client) => Promise<T>): Promise<T> {
  const connectionString = process.env.SYNC_DATABASE_URL;
  if (!connectionString) throw new Error("SYNC_DATABASE_URL ontbreekt: de dagstand kan niet worden bewaard.");
  eisVerbindingssnaar(connectionString, "SYNC_DATABASE_URL");
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    return await werk(client);
  } finally {
    await client.end().catch(() => {});
  }
}
