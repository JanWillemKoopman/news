import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Duim omhoog/omlaag op een antwoord.
 *
 * Dit is geen tevredenheidsmeting maar een werklijst. Een antwoord dat als fout is
 * gemarkeerd wijst bijna altijd op iets wat in het datawoordenboek ontbreekt — een
 * definitie, een toegestane waarde, een valkuil. Deze tabel is dus de plek waar je
 * kijkt als je het woordenboek wilt verbeteren.
 */
export async function POST(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Log eerst in." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    berichtId?: unknown;
    oordeel?: unknown;
    toelichting?: unknown;
  };
  const berichtId = typeof body.berichtId === "number" ? body.berichtId : null;
  const oordeel = body.oordeel === "goed" || body.oordeel === "fout" ? body.oordeel : null;
  if (!berichtId || !oordeel) {
    return NextResponse.json({ fout: "Ongeldig verzoek." }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .schema("dataloket")
      .from("feedback")
      .upsert(
        {
          bericht_id: berichtId,
          gebruiker_id: gebruiker.id,
          oordeel,
          toelichting:
            typeof body.toelichting === "string" ? body.toelichting.slice(0, 2000) : null,
        },
        { onConflict: "bericht_id,gebruiker_id" },
      );
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : "Kon feedback niet opslaan." },
      { status: 500 },
    );
  }
}
