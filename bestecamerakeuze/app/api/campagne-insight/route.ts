import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { isBeheerder } from "@/lib/gebruikersbeheer";
import { leesCampagneInvoer } from "@/lib/insight/rekenen";
import {
  lijstOverzicht,
  maakCampagne,
  verwijderCampagne,
  werkCampagneBij,
  zetAanvraag,
} from "@/lib/insight/opslag";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Campaign insight — de campagnes (briefings).
 *
 * GET                         → alle campagnes met de kerncijfers van hun laatste analyse
 * POST { naam, … }            → nieuwe campagne
 * PATCH ?id=… { naam, … }     → briefing bijwerken
 * PATCH ?id=… { aanvraag }    → analyse aanvragen (true) of intrekken (false)
 * DELETE ?id=…                → campagne met al zijn analyses weg (alleen beheerders)
 *
 * De analyses zelf schrijft Claude Code (zie de skill campagne-insight); deze routes
 * schrijven nooit een analyse.
 */

function fout(err: unknown, status = 500) {
  return NextResponse.json({ fout: err instanceof Error ? err.message : String(err) }, { status });
}

export async function GET() {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  try {
    const campagnes = await lijstOverzicht(await createClient());
    return NextResponse.json({ campagnes, magVerwijderen: isBeheerder(gebruiker.email) });
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
    const campagne = await maakCampagne(await createClient(), uitkomst.invoer, gebruiker.id);
    return NextResponse.json({ campagne });
  } catch (err) {
    return fout(err);
  }
}

export async function PATCH(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ fout: "Geen campagne opgegeven." }, { status: 400 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  try {
    const supabase = await createClient();
    if (body && typeof body.aanvraag === "boolean") {
      const campagne = await zetAanvraag(supabase, id, body.aanvraag, gebruiker.id);
      if (!campagne) return NextResponse.json({ fout: "Campagne niet gevonden." }, { status: 404 });
      return NextResponse.json({ campagne });
    }
    const uitkomst = leesCampagneInvoer(body);
    if (!uitkomst.ok) return NextResponse.json({ fout: uitkomst.fout }, { status: 400 });
    const campagne = await werkCampagneBij(supabase, id, uitkomst.invoer);
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
    return NextResponse.json({ fout: "Alleen beheerders mogen een campagne verwijderen." }, { status: 403 });
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
