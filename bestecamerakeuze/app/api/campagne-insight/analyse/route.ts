import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { haalAnalyse, lijstVersies } from "@/lib/insight/opslag";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Campaign insight — de analyses (alleen lezen; Claude Code schrijft ze).
 *
 * GET ?campagne=…   → de versies van een campagne, nieuwste eerst
 * GET ?id=…         → één analyse met het volledige resultaat
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
