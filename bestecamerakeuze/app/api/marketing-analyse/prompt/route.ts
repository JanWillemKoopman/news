import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { isBeheerder } from "@/lib/gebruikersbeheer";
import { bewaarPrompt, haalPrompt } from "@/lib/marketingAnalyse/opslag";
import { haalProfielen } from "@/lib/profielen";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_LENGTE = 100_000;

/**
 * Marketing analyse — de hoofdprompt. Lezen mag iedereen; opslaan (altijd als nieuwe versie)
 * alleen de eigenaar.
 */
export async function GET() {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  try {
    const supabase = await createClient();
    const { opgeslagenDoor, ...prompt } = await haalPrompt(supabase);
    const namen = opgeslagenDoor ? await haalProfielen(supabase, [opgeslagenDoor]).catch(() => ({}) as Record<string, { naam: string | null }>) : {};
    return NextResponse.json({
      prompt: { ...prompt, opgeslagenDoorNaam: opgeslagenDoor ? (namen[opgeslagenDoor]?.naam ?? null) : null },
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
    return NextResponse.json({ fout: "Alleen de eigenaar mag de hoofdprompt aanpassen." }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as { inhoud?: unknown } | null;
  const inhoud = typeof body?.inhoud === "string" ? body.inhoud.replace(/\r\n/g, "\n").trim() : "";
  if (!inhoud) return NextResponse.json({ fout: "De prompt is leeg." }, { status: 400 });
  if (inhoud.length > MAX_LENGTE) return NextResponse.json({ fout: "De prompt is te lang (meer dan 100.000 tekens)." }, { status: 400 });
  try {
    const { opgeslagenDoor: _door, ...prompt } = await bewaarPrompt(await createClient(), inhoud, gebruiker.id);
    return NextResponse.json({ prompt: { ...prompt, opgeslagenDoorNaam: null } });
  } catch (err) {
    return NextResponse.json({ fout: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
