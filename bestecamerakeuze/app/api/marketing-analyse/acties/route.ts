import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { metDienstVerbinding } from "@/lib/marketingAnalyse/notificatie";
import type { MaActieKlaar } from "@/lib/marketingAnalyse/types";

export const dynamic = "force-dynamic";

/**
 * Marketing analyse — acties afvinken in "Wat nu te doen" op de analysepagina (migratie 0051).
 *
 * GET  ?versie=…                          → de afgevinkte acties van die versie, met naam
 * POST ?versie=… { actie, klaar }         → afvinken (klaar: true) of uitvinken (false)
 *
 * Iedere ingelogde collega mag afvinken en uitvinken: het is een gedeelde takenlijst. Schrijft
 * via de dienstverbinding; deze route controleert dat de actie in de versie bestaat.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIE = /^geheel-(\d{1,3})$/;

interface Rij {
  actie: string;
  afgevinkt_op: Date;
  naam: string | null;
}

function fout(tekst: string, status: number) {
  return NextResponse.json({ fout: tekst }, { status });
}

function versieUit(request: Request): string | null {
  const versie = new URL(request.url).searchParams.get("versie") ?? "";
  return UUID.test(versie) ? versie : null;
}

async function leesAfgevinkt(versie: string): Promise<MaActieKlaar[]> {
  const rijen = await metDienstVerbinding(async (client) =>
    (
      await client.query<Rij>(
        `select k.actie, k.afgevinkt_op, p.naam
           from dataloket.marketing_analyse_acties_klaar k
           left join dataloket.profielen p on p.id = k.afgevinkt_door
          where k.versie_id = $1
          order by k.afgevinkt_op`,
        [versie],
      )
    ).rows,
  );
  return rijen.map((r) => ({ actie: r.actie, afgevinktOp: r.afgevinkt_op.toISOString(), door: r.naam }));
}

export async function GET(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return fout("Niet ingelogd.", 401);
  const versie = versieUit(request);
  if (!versie) return fout("versie ontbreekt.", 400);
  try {
    return NextResponse.json({ afgevinkt: await leesAfgevinkt(versie) });
  } catch (err) {
    return fout(err instanceof Error ? err.message : String(err), 500);
  }
}

export async function POST(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return fout("Niet ingelogd.", 401);
  const versie = versieUit(request);
  if (!versie) return fout("versie ontbreekt.", 400);
  const body = (await request.json().catch(() => null)) as { actie?: unknown; klaar?: unknown } | null;
  const actie = typeof body?.actie === "string" ? body.actie : "";
  const match = ACTIE.exec(actie);
  if (!match || typeof body?.klaar !== "boolean") return fout("actie en klaar zijn verplicht.", 400);
  const plek = Number(match[1]);

  try {
    const bestaat = await metDienstVerbinding(async (client) => {
      const res = await client.query<{ aantal: number | null }>(
        `select jsonb_array_length(coalesce(resultaat->'aanbevelingen', '[]'::jsonb)) as aantal
           from dataloket.marketing_analyse_versies where id = $1`,
        [versie],
      );
      return res.rows.length > 0 && plek < (res.rows[0].aantal ?? 0);
    });
    if (!bestaat) return fout("Deze actie bestaat niet in deze versie.", 404);

    await metDienstVerbinding(async (client) => {
      if (body.klaar) {
        await client.query(
          `insert into dataloket.marketing_analyse_acties_klaar (versie_id, actie, afgevinkt_door)
           values ($1, $2, $3)
           on conflict (versie_id, actie) do nothing`,
          [versie, actie, gebruiker.id],
        );
      } else {
        await client.query(`delete from dataloket.marketing_analyse_acties_klaar where versie_id = $1 and actie = $2`, [
          versie,
          actie,
        ]);
      }
    });
    return NextResponse.json({ afgevinkt: await leesAfgevinkt(versie) });
  } catch (err) {
    return fout(err instanceof Error ? err.message : String(err), 500);
  }
}
