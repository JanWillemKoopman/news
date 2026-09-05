import { Client } from "pg";
import { guardSql, MAX_ROWS } from "@/lib/sqlGuard";

/**
 * Voert de door het model geschreven SQL uit.
 *
 * Drie onafhankelijke grenzen, van buiten naar binnen:
 *  1. guardSql()          — weigert alles wat geen enkele SELECT is (zie sqlGuard.ts)
 *  2. de databaserol      — DATAQUERY_DATABASE_URL wijst naar een rol met uitsluitend
 *                           SELECT op de v_-views (zie supabase/migrations)
 *  3. de transactie       — READ ONLY + statement_timeout, dus zelfs met de juiste
 *                           rechten kan er niets geschreven worden en kan geen query
 *                           de database bezet houden
 *
 * Alle drie moeten kloppen. De prompt is géén grens en telt hier niet mee.
 */

const STATEMENT_TIMEOUT_MS = 10_000;
/** Ruimte boven de statement timeout voor verbinden en opruimen. */
const CONNECT_TIMEOUT_MS = 5_000;

export interface QueryResultaat {
  kolommen: string[];
  rijen: Record<string, unknown>[];
  aantalRijen: number;
  afgekapt: boolean;
  duurMs: number;
}

export type QueryUitkomst =
  | { ok: true; resultaat: QueryResultaat; uitgevoerdeSql: string }
  | { ok: false; fout: string };

export function isDataQueryGeconfigureerd(): boolean {
  return Boolean(process.env.DATAQUERY_DATABASE_URL);
}

export async function voerQueryUit(ruweSql: string): Promise<QueryUitkomst> {
  const connectionString = process.env.DATAQUERY_DATABASE_URL;
  if (!connectionString) {
    return {
      ok: false,
      fout:
        "De dataverbinding is nog niet geconfigureerd (DATAQUERY_DATABASE_URL ontbreekt).",
    };
  }

  const gecontroleerd = guardSql(ruweSql);
  if (!gecontroleerd.ok) return { ok: false, fout: gecontroleerd.reden };

  const client = new Client({
    connectionString,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    // Supabase's pooler serveert TLS met een certificaat dat Node niet standaard kent;
    // de verbinding is versleuteld, we verifiëren de keten niet.
    ssl: { rejectUnauthorized: false },
  });

  const start = Date.now();
  try {
    await client.connect();
    // READ ONLY op transactieniveau: een schrijfpoging faalt hier ook als de rol per
    // ongeluk te ruime rechten zou hebben.
    await client.query("begin read only");
    await client.query(`set local statement_timeout = ${STATEMENT_TIMEOUT_MS}`);
    const res = await client.query(gecontroleerd.sql);
    await client.query("rollback");

    const rijen = res.rows as Record<string, unknown>[];
    return {
      ok: true,
      uitgevoerdeSql: gecontroleerd.sql,
      resultaat: {
        kolommen: res.fields.map((f) => f.name),
        rijen,
        aantalRijen: rijen.length,
        afgekapt: rijen.length >= MAX_ROWS,
        duurMs: Date.now() - start,
      },
    };
  } catch (err) {
    // De databasefout gaat bewust terug naar het model: daarmee kan het een typefout in
    // een kolomnaam zelf herstellen in de volgende ronde.
    const bericht = err instanceof Error ? err.message : String(err);
    return { ok: false, fout: bericht };
  } finally {
    await client.end().catch(() => {
      // Verbinding al weg — niets te doen.
    });
  }
}

/**
 * Compacte weergave van het resultaat voor het model: kolomkoppen plus rijen als
 * tab-gescheiden regels. Dat is aanzienlijk goedkoper in tokens dan JSON met per rij
 * herhaalde sleutels, en modellen lezen het even goed.
 */
export function resultaatVoorModel(r: QueryResultaat): string {
  if (r.aantalRijen === 0) return "0 rijen.";
  const kop = r.kolommen.join("\t");
  const regels = r.rijen.map((rij) =>
    r.kolommen
      .map((k) => {
        const v = rij[k];
        if (v === null || v === undefined) return "";
        if (v instanceof Date) return v.toISOString().slice(0, 10);
        return String(v);
      })
      .join("\t"),
  );
  const staart = r.afgekapt
    ? `\n(afgekapt op ${MAX_ROWS} rijen — verfijn de query of aggregeer)`
    : "";
  return `${r.aantalRijen} rijen\n${kop}\n${regels.join("\n")}${staart}`;
}
