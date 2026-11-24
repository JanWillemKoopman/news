import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { isBeheerder } from "@/lib/gebruikersbeheer";
import { haalAnalyse, lijstVersies, verwijderVersie } from "@/lib/marketingAnalyse/opslag";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Marketing analyse — de analyses (versies). Claude Code schrijft ze; hier lezen en, voor de
 * eigenaar, verwijderen.
 *
 * GET ?campagne=…   → de versies van een campagne, nieuwste eerst
 * GET ?id=…         → één analyse met het volledige resultaat
 * DELETE ?id=…      → één versie verwijderen (alleen de eigenaar; de nummering schuift niet op)
 */
export async function GET(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  const params = new URL(request.url).searchParams;
  try {
    const supabase = await createClient();
    const id = params.get("id");
    if (id) {
      const analyse = await haalAnalyse(supabase, id);
      if (!analyse) return NextResponse.json({ fout: "Analyse niet gevonden." }, { status: 404 });
      return NextResponse.json({ analyse });
    }
    const campagne = params.get("campagne");
    if (!campagne) return NextResponse.json({ fout: "Geef een campagne of een analyse op." }, { status: 400 });
    return NextResponse.json({ versies: await lijstVersies(supabase, campagne) });
  } catch (err) {
    return NextResponse.json({ fout: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  if (!isBeheerder(gebruiker.email)) {
    return NextResponse.json({ fout: "Alleen de eigenaar mag een versie verwijderen." }, { status: 403 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ fout: "Geen versie opgegeven." }, { status: 400 });
  try {
    const weg = await verwijderVersie(await createClient(), id);
    if (!weg) return NextResponse.json({ fout: "Versie niet gevonden." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ fout: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
