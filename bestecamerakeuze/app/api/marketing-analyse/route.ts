import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { isBeheerder } from "@/lib/gebruikersbeheer";
import { leesCampagneInvoer } from "@/lib/marketingAnalyse/rekenen";
import { metRegel } from "@/lib/marketingAnalyse/dataverantwoording";
import {
  haalCampagne,
  haalOpzet,
  lijstOpzetten,
  lijstOverzicht,
  maakCampagne,
  verwijderCampagne,
  werkCampagneBij,
  zetDataCorrectie,
  zetPlanning,
} from "@/lib/marketingAnalyse/opslag";
import { createClient } from "@/lib/supabase/server";
import { isPlanning, STANDAARD_OPZET_ID } from "@/lib/marketingAnalyse/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * Marketing analyse — de campagnes (briefings).
 *
 * GET                               → alle campagnes met de kerncijfers van hun laatste analyse,
 *                                     plus de analyse opzetten
 * POST { opzetId, naam, bedrijven, … } → nieuwe campagne of rapportage (iedereen die ingelogd is)
 * PATCH ?id=… { opzetId, naam, … }  → briefing bijwerken (de opzet mag veranderen)
 * PATCH ?id=… { planning }          → planning: uit, week, maand of kwartaal (iedereen)
 * PATCH ?id=… { dataCorrectie }     → alleen de Data correctie (vanaf de analysepagina)
 * PATCH ?id=… { correctieRegel: { sleutel, regel } } → één vaste regel (− of + in de
 *                                    Dataverantwoording) zetten of weghalen (regel null); de rest
 *                                    van de Data correctie blijft zoals hij in de database staat
 * DELETE ?id=…                      → campagne met al zijn analyses weg (alleen de eigenaar)
 *
 * De analyses zelf schrijft Claude Code (skill marketing-analyse), nooit deze routes.
 */

const MAX_CORRECTIE = 10_000;

function fout(err: unknown, status = 500) {
  return NextResponse.json({ fout: err instanceof Error ? err.message : String(err) }, { status });
}

/** De briefing lezen tegen de gekozen opzet (zonder opzet: Campagne analyse). */
async function leesBriefing(supabase: SupabaseClient, body: unknown) {
  const gevraagd = (body as { opzetId?: unknown } | null)?.opzetId;
  const opzet = await haalOpzet(supabase, typeof gevraagd === "string" && gevraagd ? gevraagd : STANDAARD_OPZET_ID);
  if (!opzet) return { ok: false as const, fout: "Onbekende analyse opzet." };
  return leesCampagneInvoer(body, opzet);
}

export async function GET() {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  try {
    const supabase = await createClient();
    const [campagnes, opzetten] = await Promise.all([lijstOverzicht(supabase), lijstOpzetten(supabase)]);
    return NextResponse.json({ campagnes, opzetten, isEigenaar: isBeheerder(gebruiker.email) });
  } catch (err) {
    return fout(err);
  }
}

export async function POST(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  const body = await request.json().catch(() => null);
  try {
    const supabase = await createClient();
    const uitkomst = await leesBriefing(supabase, body);
    if (!uitkomst.ok) return NextResponse.json({ fout: uitkomst.fout }, { status: 400 });
    return NextResponse.json({ campagne: await maakCampagne(supabase, uitkomst.invoer, gebruiker.id) });
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
    if ("planning" in body && Object.keys(body).length === 1) {
      if (!isPlanning(body.planning)) return NextResponse.json({ fout: "Onbekende planning." }, { status: 400 });
      campagne = await zetPlanning(supabase, id, body.planning);
    } else if ("correctieRegel" in body && Object.keys(body).length === 1) {
      const invoer = (body.correctieRegel ?? {}) as { sleutel?: unknown; regel?: unknown };
      const sleutel = typeof invoer.sleutel === "string" ? invoer.sleutel.trim() : "";
      const regel = typeof invoer.regel === "string" ? invoer.regel.trim() : null;
      if (!sleutel || sleutel.length > 500 || (regel !== null && regel.length > 1000)) {
        return NextResponse.json({ fout: "Ongeldige regel voor de Data correctie." }, { status: 400 });
      }
      const vorige = await haalCampagne(supabase, id);
      if (!vorige) return NextResponse.json({ fout: "Campagne niet gevonden." }, { status: 404 });
      let tekst: string;
      try {
        tekst = metRegel(vorige.dataCorrectie, sleutel, regel);
      } catch (err) {
        return fout(err, 400);
      }
      if (tekst.length > MAX_CORRECTIE) return NextResponse.json({ fout: "De Data correctie wordt te lang." }, { status: 400 });
      campagne = await zetDataCorrectie(supabase, id, tekst || null);
    } else if ("dataCorrectie" in body && Object.keys(body).length === 1) {
      const tekst = typeof body.dataCorrectie === "string" ? body.dataCorrectie.trim().slice(0, MAX_CORRECTIE) : "";
      campagne = await zetDataCorrectie(supabase, id, tekst || null);
    } else {
      const uitkomst = await leesBriefing(supabase, body);
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
