import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { isBeheerder } from "@/lib/gebruikersbeheer";
import { leesEmail } from "@/lib/marketingAnalyse/mail";
import { metDienstVerbinding } from "@/lib/marketingAnalyse/notificatie";
import { merkenVoorMail, merkSleutel, vandaagNL } from "@/lib/marketingAnalyse/rekenen";
import type { MaMerkMail } from "@/lib/marketingAnalyse/types";

export const dynamic = "force-dynamic";

/**
 * Marketing analyse — E-mail settings: per automerk de adressen die standaard volger worden van
 * elke nieuwe analyse voor dat merk (de trigger uit migratie 0047 zet ze erbij).
 *
 * GET                        → { merken, adressen }: de merkenlijst en alle adressen
 * POST   { merk, email? }    → een adres bij een merk (zonder email: je eigen adres); staat ook
 *                              meteen bij de lopende analyses van dat merk
 * DELETE ?id=…               → een adres weg bij het merk: je eigen adres, een adres dat jij
 *                              toevoegde, of als eigenaar elk adres. Bij analyses blijft het staan.
 *
 * Schrijft via de dienstverbinding; wie wat mag, controleert deze route.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PER_MERK = 50;
const MAX_MERK = 80;

interface Rij {
  id: string;
  merk: string;
  email: string;
  toegevoegd_door: string | null;
  toegevoegd_op: Date;
}

const KOLOMMEN = "id, merk, email, toegevoegd_door, toegevoegd_op";

function fout(tekst: string, status: number) {
  return NextResponse.json({ fout: tekst }, { status });
}

function alsAdres(r: Rij, gebruiker: { id: string; email: string | null }): MaMerkMail {
  const ikZelf = !!gebruiker.email && r.email.toLowerCase() === gebruiker.email.toLowerCase();
  return {
    id: r.id,
    merk: r.merk,
    email: r.email,
    toegevoegdOp: r.toegevoegd_op.toISOString(),
    ikZelf,
    magVerwijderen: ikZelf || r.toegevoegd_door === gebruiker.id || isBeheerder(gebruiker.email),
  };
}

export async function GET() {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return fout("Niet ingelogd.", 401);
  try {
    const { rijen, briefingMerken } = await metDienstVerbinding(async (client) => {
      const a = await client.query<Rij>(
        `select ${KOLOMMEN} from dataloket.marketing_analyse_merk_mail order by toegevoegd_op`,
      );
      const b = await client.query<{ merk: string }>(
        `select distinct merk from dataloket.marketing_analyse_campagnes where merk is not null and trim(merk) <> ''`,
      );
      return { rijen: a.rows, briefingMerken: b.rows.map((r) => r.merk) };
    });
    return NextResponse.json({
      merken: merkenVoorMail(
        rijen.map((r) => r.merk),
        briefingMerken,
      ),
      adressen: rijen.map((r) => alsAdres(r, gebruiker)),
    });
  } catch (err) {
    return fout(err instanceof Error ? err.message : String(err), 500);
  }
}

export async function POST(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return fout("Niet ingelogd.", 401);
  const body = (await request.json().catch(() => null)) as { merk?: unknown; email?: unknown } | null;

  const merk = typeof body?.merk === "string" ? body.merk.trim() : "";
  if (!merk || merk.length > MAX_MERK || !merkSleutel(merk)) return fout("Kies een merk.", 400);
  const zelf = body?.email === undefined || body?.email === null || body?.email === "";
  const email = zelf ? leesEmail(gebruiker.email) : leesEmail(body?.email);
  if (!email) return fout(zelf ? "Je account heeft geen e-mailadres." : "Dat is geen geldig e-mailadres.", 400);

  try {
    const uitkomst = await metDienstVerbinding(
      async (client): Promise<{ weigering: string; status: number } | { rij: Rij; analyses: number }> => {
        const aantal = await client.query<{ n: number }>(
          `select count(*)::int as n from dataloket.marketing_analyse_merk_mail
            where merk_sleutel = dataloket.marketing_analyse_merk_sleutel($1)`,
          [merk],
        );
        if ((aantal.rows[0]?.n ?? 0) >= MAX_PER_MERK) return { weigering: `Hoogstens ${MAX_PER_MERK} adressen per merk.`, status: 400 };
        // Het merk zoals het al in de lijst staat, zodat "skoda" en "Škoda" één merk blijven.
        const r = await client.query<Rij>(
          `insert into dataloket.marketing_analyse_merk_mail (merk, email, toegevoegd_door)
           values (coalesce((select merk from dataloket.marketing_analyse_merk_mail
                              where merk_sleutel = dataloket.marketing_analyse_merk_sleutel($1)
                              order by toegevoegd_op limit 1), $1), $2, $3)
           on conflict (merk_sleutel, lower(email)) do update set email = dataloket.marketing_analyse_merk_mail.email
           returning ${KOLOMMEN}`,
          [merk, email, gebruiker.id],
        );
        const rij = r.rows[0];
        if (!rij) throw new Error("Kon het adres niet bewaren.");
        // Ook bij de analyses van dit merk die nog lopen (geen einddatum, of vandaag of later).
        const v = await client.query(
          `insert into dataloket.marketing_analyse_volgers (campagne_id, email, toegevoegd_door, via_merk)
           select c.id, $1, $2, $3
             from dataloket.marketing_analyse_campagnes c
            where dataloket.marketing_analyse_merk_sleutel($3) = any (dataloket.marketing_analyse_merk_sleutels(c.merk))
              and (c.einddatum is null or c.einddatum >= $4::date)
           on conflict (campagne_id, lower(email)) do nothing`,
          [rij.email, gebruiker.id, rij.merk, vandaagNL()],
        );
        return { rij, analyses: v.rowCount ?? 0 };
      },
    );
    if ("weigering" in uitkomst) return fout(uitkomst.weigering, uitkomst.status);
    return NextResponse.json({ adres: alsAdres(uitkomst.rij, gebruiker), toegevoegdAanAnalyses: uitkomst.analyses });
  } catch (err) {
    return fout(err instanceof Error ? err.message : String(err), 500);
  }
}

export async function DELETE(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return fout("Niet ingelogd.", 401);
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!UUID.test(id)) return fout("id ontbreekt.", 400);
  try {
    const uitkomst = await metDienstVerbinding(async (client) => {
      const r = await client.query<Rij>(`select ${KOLOMMEN} from dataloket.marketing_analyse_merk_mail where id = $1`, [id]);
      const rij = r.rows[0];
      if (!rij) return "weg";
      if (!alsAdres(rij, gebruiker).magVerwijderen) return "verboden";
      await client.query(`delete from dataloket.marketing_analyse_merk_mail where id = $1`, [id]);
      return "weg";
    });
    if (uitkomst === "verboden") return fout("Alleen wie het adres is, wie het toevoegde of de eigenaar kan dit adres weghalen.", 403);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fout(err instanceof Error ? err.message : String(err), 500);
  }
}
