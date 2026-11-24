import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { isBeheerder } from "@/lib/gebruikersbeheer";
import { bewaarPrompt, haalOpzet, haalPrompt } from "@/lib/marketingAnalyse/opslag";
import { STANDAARD_OPZET_ID } from "@/lib/marketingAnalyse/types";
import { haalProfielen } from "@/lib/profielen";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_LENGTE = 100_000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Marketing analyse — de prompt van een analyse opzet (`?opzet=…`, zonder: Campagne analyse).
 * Lezen mag iedereen; opslaan (altijd als nieuwe versie, per opzet genummerd) alleen de eigenaar.
 */
export async function GET(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  const opzetId = new URL(request.url).searchParams.get("opzet") || STANDAARD_OPZET_ID;
  if (!UUID.test(opzetId)) return NextResponse.json({ fout: "Ongeldige opzet." }, { status: 400 });
  try {
    const supabase = await createClient();
    const { opgeslagenDoor, ...prompt } = await haalPrompt(supabase, opzetId);
    const namen = opgeslagenDoor ? await haalProfielen(supabase, [opgeslagenDoor]).catch(() => ({}) as Record<string, { naam: string | null }>) : {};
    return NextResponse.json({
      prompt: { ...prompt, opzetId, opgeslagenDoorNaam: opgeslagenDoor ? (namen[opgeslagenDoor]?.naam ?? null) : null },
      magBewerken: isBeheerder(gebruiker.email),
    });
  } catch (err) {
    return NextResponse.json({ fout: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  if (!isBeheerder(gebruiker.email)) {
    return NextResponse.json({ fout: "Alleen de eigenaar mag een analyse prompt aanpassen." }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as { inhoud?: unknown; opzetId?: unknown } | null;
  const opzetId = typeof body?.opzetId === "string" && body.opzetId ? body.opzetId : STANDAARD_OPZET_ID;
  if (!UUID.test(opzetId)) return NextResponse.json({ fout: "Ongeldige opzet." }, { status: 400 });
  const inhoud = typeof body?.inhoud === "string" ? body.inhoud.replace(/\r\n/g, "\n").trim() : "";
  if (!inhoud) return NextResponse.json({ fout: "De prompt is leeg." }, { status: 400 });
  if (inhoud.length > MAX_LENGTE) return NextResponse.json({ fout: "De prompt is te lang (meer dan 100.000 tekens)." }, { status: 400 });
  try {
    const supabase = await createClient();
    if (!(await haalOpzet(supabase, opzetId))) return NextResponse.json({ fout: "Onbekende analyse opzet." }, { status: 404 });
    const { opgeslagenDoor: _door, ...prompt } = await bewaarPrompt(supabase, opzetId, inhoud, gebruiker.id);
    return NextResponse.json({ prompt: { ...prompt, opzetId, opgeslagenDoorNaam: null } });
  } catch (err) {
    return NextResponse.json({ fout: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
