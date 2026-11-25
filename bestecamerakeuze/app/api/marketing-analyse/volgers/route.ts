import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { isBeheerder } from "@/lib/gebruikersbeheer";
import { leesEmail } from "@/lib/marketingAnalyse/mail";
import { metDienstVerbinding } from "@/lib/marketingAnalyse/notificatie";
import type { MaVolger } from "@/lib/marketingAnalyse/types";

export const dynamic = "force-dynamic";

/**
 * Marketing analyse — wie krijgt een mail bij een nieuwe analyse van een campagne.
 *
 * GET    ?campagne=…             → de volgers (zonder afmeldtokens)
 * POST   ?campagne=… {}          → jezelf aanmelden met het adres van je account
 * POST   ?campagne=… { email }   → een ander adres toevoegen (ook buiten het team)
 * DELETE ?campagne=…&id=…        → een volger weg: jezelf, een adres dat jij toevoegde, of
 *                                  als eigenaar iedereen
 *
 * Schrijft via de dienstverbinding; wie wat mag, controleert deze route.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_VOLGERS = 50;

interface Rij {
  id: string;
  email: string;
  gebruiker_id: string | null;
  toegevoegd_door: string | null;
  toegevoegd_op: Date;
  via_merk: string | null;
}

function fout(tekst: string, status: number) {
  return NextResponse.json({ fout: tekst }, { status });
}

function alsVolger(r: Rij, gebruiker: { id: string; email: string | null }): MaVolger {
  const ikZelf = r.gebruiker_id === gebruiker.id || (!!gebruiker.email && r.email === gebruiker.email.toLowerCase());
  return {
    id: r.id,
    email: r.email,
    toegevoegdOp: r.toegevoegd_op.toISOString(),
    ikZelf,
    magVerwijderen: ikZelf || r.toegevoegd_door === gebruiker.id || isBeheerder(gebruiker.email),
    viaMerk: r.via_merk,
  };
}

const KOLOMMEN = "id, email, gebruiker_id, toegevoegd_door, toegevoegd_op, via_merk";

export async function GET(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return fout("Niet ingelogd.", 401);
  const campagne = new URL(request.url).searchParams.get("campagne") ?? "";
  if (!UUID.test(campagne)) return fout("campagne ontbreekt.", 400);
  try {
    const rijen = await metDienstVerbinding(async (client) =>
      (
        await client.query<Rij>(
          `select ${KOLOMMEN} from dataloket.marketing_analyse_volgers where campagne_id = $1 order by toegevoegd_op`,
          [campagne],
        )
      ).rows,
    );
    return NextResponse.json({ volgers: rijen.map((r) => alsVolger(r, gebruiker)) });
  } catch (err) {
    return fout(err instanceof Error ? err.message : String(err), 500);
  }
}

export async function POST(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return fout("Niet ingelogd.", 401);
  const campagne = new URL(request.url).searchParams.get("campagne") ?? "";
  if (!UUID.test(campagne)) return fout("campagne ontbreekt.", 400);
  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;

  const zelf = body?.email === undefined || body?.email === null || body?.email === "";
  const email = zelf ? leesEmail(gebruiker.email) : leesEmail(body?.email);
  if (!email) return fout(zelf ? "Je account heeft geen e-mailadres." : "Dat is geen geldig e-mailadres.", 400);
  const eigenAdres = !!gebruiker.email && email === gebruiker.email.toLowerCase();

  try {
    const uitkomst = await metDienstVerbinding(async (client): Promise<{ weigering: string; status: number } | { rij: Rij }> => {
      const bestaat = await client.query(`select 1 from dataloket.marketing_analyse_campagnes where id = $1`, [campagne]);
      if (bestaat.rowCount === 0) return { weigering: "Campagne niet gevonden.", status: 404 };
      const aantal = await client.query<{ n: number }>(
        `select count(*)::int as n from dataloket.marketing_analyse_volgers where campagne_id = $1`,
        [campagne],
      );
      if ((aantal.rows[0]?.n ?? 0) >= MAX_VOLGERS) return { weigering: `Hoogstens ${MAX_VOLGERS} volgers per campagne.`, status: 400 };
      const r = await client.query<Rij>(
        `insert into dataloket.marketing_analyse_volgers (campagne_id, email, gebruiker_id, toegevoegd_door)
         values ($1, $2, $3, $4)
         on conflict (campagne_id, lower(email)) do update set gebruiker_id = coalesce(dataloket.marketing_analyse_volgers.gebruiker_id, excluded.gebruiker_id)
         returning ${KOLOMMEN}`,
        [campagne, email, eigenAdres ? gebruiker.id : null, gebruiker.id],
      );
      const rij = r.rows[0];
      if (!rij) throw new Error("Kon het adres niet bewaren.");
      return { rij };
    });
    if ("weigering" in uitkomst) return fout(uitkomst.weigering, uitkomst.status);
    return NextResponse.json({ volger: alsVolger(uitkomst.rij, gebruiker) });
  } catch (err) {
    return fout(err instanceof Error ? err.message : String(err), 500);
  }
}

export async function DELETE(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return fout("Niet ingelogd.", 401);
  const params = new URL(request.url).searchParams;
  const campagne = params.get("campagne") ?? "";
  const id = params.get("id") ?? "";
  if (!UUID.test(campagne) || !UUID.test(id)) return fout("campagne of id ontbreekt.", 400);
  try {
    const uitkomst = await metDienstVerbinding(async (client) => {
      const r = await client.query<Rij>(
        `select ${KOLOMMEN} from dataloket.marketing_analyse_volgers where id = $1 and campagne_id = $2`,
        [id, campagne],
      );
      const rij = r.rows[0];
      if (!rij) return "weg";
      if (!alsVolger(rij, gebruiker).magVerwijderen) return "verboden";
      await client.query(`delete from dataloket.marketing_analyse_volgers where id = $1`, [id]);
      return "weg";
    });
    if (uitkomst === "verboden") return fout("Alleen de volger zelf, wie het adres toevoegde of de eigenaar kan dit adres weghalen.", 403);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fout(err instanceof Error ? err.message : String(err), 500);
  }
}
