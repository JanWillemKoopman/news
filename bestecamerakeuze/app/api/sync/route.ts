import { NextResponse } from "next/server";
import { Client } from "pg";
import { BRONNEN, haalSheetOp, type Bron, type GeparsteRij } from "@/lib/sync/bronnen";
import { bouwBlokInsert, inBlokken, rijenAlsRecords, teBewarenAfwijkingen } from "@/lib/sync/blokken";
import { controleerVerbindingssnaar } from "@/lib/verbindingssnaar";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * De sync-job: sheets → Postgres.
 *
 * Draait via Vercel Cron (zie vercel.json) en is ook handmatig aan te roepen, want wie
 * net iets in de sheet heeft gecorrigeerd wil niet tot morgen wachten.
 *
 * Deze route gebruikt een schrijvende verbinding (SYNC_DATABASE_URL) — bewust een andere
 * dan de read-only verbinding waarop de chat draait. Die twee mogen nooit dezelfde zijn.
 */

function isGeautoriseerd(request: Request): boolean {
  const geheim = process.env.CRON_SECRET;
  if (!geheim) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${geheim}`;
}

interface SyncResultaat {
  bron: string;
  gelezen: number;
  geplaatst: number;
  afgekeurd: number;
}

async function syncBron(client: Client, bron: Bron): Promise<SyncResultaat> {
  const startRes = await client.query<{ id: string }>(
    `insert into dataloket.sync_runs (bron) values ($1) returning id`,
    [bron.naam],
  );
  const runId = startRes.rows[0].id;

  try {
    const rijen = await haalSheetOp(bron);
    // Voor bronnen zonder natuurlijke sleutel (geen lead- of order-ID in de sheet) doet
    // sleutelKolom "regelnummer" mee — die vult de sync hier zelf, uit het rijnummer dat
    // haalSheetOp toch al bijhoudt. Bestaat de sheetkolom al (toekomstige bron met een
    // eigen "regelnummer"-kolom), dan overschrijft dit hem; dat risico is verwaarloosbaar.
    for (const rij of rijen) {
      rij.waarden.regelnummer = String(rij.rijnummer);
    }

    const goed: GeparsteRij[] = [];
    const afgekeurd: { rij: GeparsteRij; reden: string }[] = [];

    const controleKolom = bron.vereisteKolom ?? bron.sleutelKolom;
    for (const rij of rijen) {
      const sleutel = rij.waarden[bron.sleutelKolom];
      if (!sleutel || !sleutel.trim()) {
        afgekeurd.push({ rij, reden: `Lege sleutelkolom "${bron.sleutelKolom}"` });
        continue;
      }
      const controleWaarde = rij.waarden[controleKolom];
      if (!controleWaarde || !controleWaarde.trim()) {
        afgekeurd.push({ rij, reden: `Lege verplichte kolom "${controleKolom}"` });
        continue;
      }
      goed.push(rij);
    }

    // Volledige verversing in één transactie: bij duizenden rijen simpeler en
    // betrouwbaarder dan bijhouden wat er veranderd is. Mislukt er iets halverwege, dan
    // blijft de oude inhoud staan in plaats van een half gevulde tabel.
    //
    // In blokken van duizenden regels per query (`lib/sync/blokken.ts`), niet per regel:
    // ±97.000 losse inserts voor "Data leads" pasten niet in de vijf minuten van Vercel,
    // waardoor de functie werd afgebroken en de tabel wekenlang op een oude stand bleef.
    const insert = bouwBlokInsert(bron);
    await client.query("begin");
    await client.query(`truncate table dataloket.${bron.doeltabel}`);
    for (const blok of inBlokken(goed)) {
      await client.query(insert, [JSON.stringify(rijenAlsRecords(blok, bron))]);
    }
    await client.query("commit");

    // Lege opvulregels worden alleen geteld; van de rest bewaren we er hoogstens een paar
    // honderd met hun ruwe inhoud, in één query.
    const bewaren = teBewarenAfwijkingen(afgekeurd, bron);
    if (bewaren.length > 0) {
      await client.query(
        `insert into dataloket.sync_afwijkingen (run_id, bron, rijnummer, reden, ruwe_rij)
         select $1, $2, a.rijnummer, a.reden, a.ruwe_rij
           from json_to_recordset($3::json) as a(rijnummer integer, reden text, ruwe_rij jsonb)`,
        [
          runId,
          bron.naam,
          JSON.stringify(bewaren.map(({ rij, reden }) => ({ rijnummer: rij.rijnummer, reden, ruwe_rij: rij.waarden }))),
        ],
      );
    }

    await client.query(
      `update dataloket.sync_runs
          set geeindigd_op = now(), rijen_gelezen = $2, rijen_geplaatst = $3,
              rijen_afgekeurd = $4, gelukt = true
        where id = $1`,
      [runId, rijen.length, goed.length, afgekeurd.length],
    );

    return {
      bron: bron.naam,
      gelezen: rijen.length,
      geplaatst: goed.length,
      afgekeurd: afgekeurd.length,
    };
  } catch (err) {
    await client.query("rollback").catch(() => {});
    const bericht = err instanceof Error ? err.message : String(err);
    await client.query(
      `update dataloket.sync_runs set geeindigd_op = now(), gelukt = false, fout = $2 where id = $1`,
      [runId, bericht],
    );
    throw err;
  }
}

export async function POST(request: Request) {
  if (!isGeautoriseerd(request)) {
    return NextResponse.json({ fout: "Niet geautoriseerd." }, { status: 401 });
  }

  const connectionString = process.env.SYNC_DATABASE_URL;
  if (!connectionString) {
    return NextResponse.json(
      { fout: "SYNC_DATABASE_URL ontbreekt." },
      { status: 503 },
    );
  }

  const snaarFout = controleerVerbindingssnaar(connectionString, "SYNC_DATABASE_URL");
  if (snaarFout) return NextResponse.json({ fout: snaarFout }, { status: 503 });

  if (BRONNEN.length === 0) {
    return NextResponse.json({
      status: "niets te doen",
      toelichting:
        "Er zijn nog geen bronnen geconfigureerd in lib/sync/bronnen.ts — vul BRONNEN aan zodra de sheet-links bekend zijn.",
    });
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const resultaten: SyncResultaat[] = [];
    for (const bron of BRONNEN) {
      resultaten.push(await syncBron(client, bron));
    }
    return NextResponse.json({ status: "klaar", resultaten });
  } catch (err) {
    const bericht = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ fout: bericht }, { status: 500 });
  } finally {
    await client.end().catch(() => {});
  }
}

/** Vercel Cron doet een GET; dezelfde autorisatie, dezelfde afhandeling. */
export async function GET(request: Request) {
  return POST(request);
}
