import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { isBeheerder } from "@/lib/gebruikersbeheer";
import { leesCampagneInvoer } from "@/lib/marketingAnalyse/rekenen";
import {
  haalCampagne,
  lijstOverzicht,
  maakCampagne,
  verwijderCampagne,
  werkCampagneBij,
  zetAnalyseRonde,
  zetDataCorrectie,
} from "@/lib/marketingAnalyse/opslag";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Marketing analyse — de campagnes (briefings).
 *
 * GET                               → alle campagnes met de kerncijfers van hun laatste analyse
 * POST { naam, bedrijf, … }         → nieuwe campagne (iedereen die ingelogd is)
 * PATCH ?id=… { naam, bedrijf, … }  → briefing bijwerken
 * PATCH ?id=… { analyseRonde }      → schakelaar Analyse ronde
 * PATCH ?id=… { dataCorrectie }     → alleen de Data correctie (vanaf de analysepagina)
 * DELETE ?id=…                      → campagne met al zijn analyses weg (alleen de eigenaar)
 *
 * De analyses zelf schrijft Claude Code (skill marketing-analyse), nooit deze routes.
 */

const MAX_CORRECTIE = 10_000;

function fout(err: unknown, status = 500) {
  return NextResponse.json({ fout: err instanceof Error ? err.message : String(err) }, { status });
}

export async function GET() {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  try {
    const campagnes = await lijstOverzicht(await createClient());
    return NextResponse.json({ campagnes, isEigenaar: isBeheerder(gebruiker.email) });
  } catch (err) {
    return fout(err);
  }
}

export async function POST(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  const uitkomst = leesCampagneInvoer(await request.json().catch(() => null));
  if (!uitkomst.ok) return NextResponse.json({ fout: uitkomst.fout }, { status: 400 });
  try {
    return NextResponse.json({ campagne: await maakCampagne(await createClient(), uitkomst.invoer, gebruiker.id) });
  } catch (err) {
    return fout(err);
  }
}

export async function PATCH(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ fout: "Geen campagne opgegeven." }, { status: 400 });
  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;

  try {
    const supabase = await createClient();
    let campagne;
    if (typeof body.analyseRonde === "boolean" && Object.keys(body).length === 1) {
      campagne = await zetAnalyseRonde(supabase, id, body.analyseRonde);
    } else if ("dataCorrectie" in body && Object.keys(body).length === 1) {
      const tekst = typeof body.dataCorrectie === "string" ? body.dataCorrectie.trim().slice(0, MAX_CORRECTIE) : "";
      campagne = await zetDataCorrectie(supabase, id, tekst || null);
    } else {
      const uitkomst = leesCampagneInvoer(body);
      if (!uitkomst.ok) return NextResponse.json({ fout: uitkomst.fout }, { status: 400 });
      const vorige = await haalCampagne(supabase, id);
      if (!vorige) return NextResponse.json({ fout: "Campagne niet gevonden." }, { status: 404 });
      campagne = await werkCampagneBij(supabase, id, uitkomst.invoer, vorige.dataCorrectie);
    }
    if (!campagne) return NextResponse.json({ fout: "Campagne niet gevonden." }, { status: 404 });
    return NextResponse.json({ campagne });
  } catch (err) {
    return fout(err);
  }
}

export async function DELETE(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  if (!isBeheerder(gebruiker.email)) {
    return NextResponse.json({ fout: "Alleen de eigenaar mag een campagne verwijderen." }, { status: 403 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ fout: "Geen campagne opgegeven." }, { status: 400 });
  try {
    const weg = await verwijderCampagne(await createClient(), id);
    if (!weg) return NextResponse.json({ fout: "Campagne niet gevonden." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fout(err);
  }
}
