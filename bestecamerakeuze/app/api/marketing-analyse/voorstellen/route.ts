import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { leesCampagneInvoer } from "@/lib/marketingAnalyse/rekenen";
import { haalOpzet, lijstVoorstellen, voegVoorstelToe, zetVoorstelStatus } from "@/lib/marketingAnalyse/opslag";
import { STANDAARD_OPZET_ID } from "@/lib/marketingAnalyse/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Marketing analyse — voorgestelde campagne analyses (migratie 0046).
 *
 * GET                                       → open en genegeerde voorstellen + laatste zoekronde
 * POST ?id=… { actie: "toevoegen", …briefing } → de nagelopen briefing wordt een campagne
 *                                              (Campagne analyse, Analyse ronde aan)
 * POST ?id=… { actie: "negeren" }            → open → genegeerd
 * POST ?id=… { actie: "terugzetten" }        → genegeerd → open
 *
 * Iedereen die ingelogd is mag dit (besluit van de eigenaar). Nieuwe voorstellen schrijft alleen
 * Claude Code (skill campagne-voorstellen), nooit deze route.
 */

function fout(err: unknown, status = 500) {
  return NextResponse.json({ fout: err instanceof Error ? err.message : String(err) }, { status });
}

export async function GET() {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  try {
    return NextResponse.json(await lijstVoorstellen(await createClient()));
  } catch (err) {
    return fout(err);
  }
}

export async function POST(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ fout: "Geen voorstel opgegeven." }, { status: 400 });
  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;

  try {
    const supabase = await createClient();
    if (body.actie === "negeren" || body.actie === "terugzetten") {
      const voorstel = await zetVoorstelStatus(supabase, id, body.actie === "negeren" ? "genegeerd" : "open", gebruiker.id);
      if (!voorstel) return NextResponse.json({ fout: "Dit voorstel is al afgehandeld. Herlaad de pagina." }, { status: 409 });
      return NextResponse.json({ voorstel });
    }
    if (body.actie === "toevoegen") {
      const opzet = await haalOpzet(supabase, STANDAARD_OPZET_ID);
      if (!opzet) return NextResponse.json({ fout: "De opzet Campagne analyse ontbreekt." }, { status: 500 });
      const uitkomst = leesCampagneInvoer(body, opzet);
      if (!uitkomst.ok) return NextResponse.json({ fout: uitkomst.fout }, { status: 400 });
      try {
        return NextResponse.json({ campagne: await voegVoorstelToe(supabase, id, uitkomst.invoer) });
      } catch (err) {
        const tekst = err instanceof Error ? err.message : String(err);
        if (/al afgehandeld|niet gevonden/.test(tekst)) return NextResponse.json({ fout: tekst }, { status: 409 });
        throw err;
      }
    }
    return NextResponse.json({ fout: "Onbekende actie." }, { status: 400 });
  } catch (err) {
    return fout(err);
  }
}
