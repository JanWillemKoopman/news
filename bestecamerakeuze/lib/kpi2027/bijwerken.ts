import { Client } from "pg";
import { isWindsorGeconfigureerd } from "@/lib/windsor/api";
import { eisVerbindingssnaar } from "@/lib/verbindingssnaar";
import { heeftDefinitieveStand, schrijfStand } from "@/lib/kpi2027/bron";
import { haalKpiStand } from "@/lib/kpi2027/ophalen";
import { isDefinitief, peildatumVoor } from "@/lib/kpi2027/rekenen";

/**
 * De wekelijkse bijwerking van het tabblad KPI's 2027, los van wie hem start.
 *
 * Twee aanroepers: de cron op zondag (`/api/kpi-2027/bijwerken`, met `CRON_SECRET`) en de
 * knop "Nu bijwerken" op het tabblad (`POST /api/kpi-2027`, alleen voor beheerders). Beide
 * rekenen tot en met dezelfde zaterdag (`peildatumVoor`), dus de knop levert midden in de
 * week geen ander target op dan de zondag ervoor — hij is er voor als de cron een keer
 * mislukte, of na een gewijzigde eventdefinitie die een nieuw event nodig heeft.
 *
 * Elke run staat in `sync_runs` (bron `kpi-2027`), met de fout erbij als hij mislukt. De
 * versheidsregel op de Kanalen-pagina's leest alleen `windsor%`, dus deze runs verschuiven
 * daar niets.
 */

export interface BijwerkUitkomst {
  status: "bijgewerkt" | "al-definitief";
  peildatum: string;
  definitief: boolean;
  rijen: number;
  duurMs: number;
}

export async function werkKpiStandBij(
  opties: { nu?: Date; forceer?: boolean } = {},
): Promise<BijwerkUitkomst> {
  const start = Date.now();
  if (!isWindsorGeconfigureerd()) throw new Error("WINDSOR_API_KEY ontbreekt.");
  const connectionString = process.env.SYNC_DATABASE_URL;
  if (!connectionString) throw new Error("SYNC_DATABASE_URL ontbreekt.");
  eisVerbindingssnaar(connectionString, "SYNC_DATABASE_URL");

  const peildatum = peildatumVoor(opties.nu ?? new Date());
  if (!peildatum) throw new Error("Er is in 2026 nog geen volledige week voorbij; er valt nog niets te rekenen.");

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  let runId: string | null = null;
  try {
    const run = await client.query<{ id: string }>(
      `insert into dataloket.sync_runs (bron) values ('kpi-2027') returning id`,
    );
    runId = run.rows[0].id;

    // Tot 2026 volledig voorbij is, en niet langer: een definitieve stand is de basis
    // voor 2027 en hoort daarna niet meer te verschuiven door late GA4-correcties.
    if (!opties.forceer && (await heeftDefinitieveStand(client))) {
      await client.query(
        `update dataloket.sync_runs set geeindigd_op = now(), rijen_gelezen = 0, rijen_geplaatst = 0, gelukt = true
          where id = $1`,
        [runId],
      );
      return { status: "al-definitief", peildatum, definitief: true, rijen: 0, duurMs: Date.now() - start };
    }

    const opgehaald = await haalKpiStand(peildatum);
    const definitief = isDefinitief(peildatum);
    await schrijfStand(client, {
      peildatum,
      definitief,
      events: opgehaald.events,
      sessies: opgehaald.sessies,
      gebruikers: opgehaald.gebruikers,
    });

    await client.query(
      `update dataloket.sync_runs set geeindigd_op = now(), rijen_gelezen = $2, rijen_geplaatst = 1, gelukt = true
        where id = $1`,
      [runId, opgehaald.rijen],
    );
    return { status: "bijgewerkt", peildatum, definitief, rijen: opgehaald.rijen, duurMs: Date.now() - start };
  } catch (err) {
    if (runId) {
      await client
        .query(`update dataloket.sync_runs set geeindigd_op = now(), gelukt = false, fout = $2 where id = $1`, [
          runId,
          err instanceof Error ? err.message : String(err),
        ])
        .catch(() => {});
    }
    throw err;
  } finally {
    await client.end().catch(() => {});
  }
}
