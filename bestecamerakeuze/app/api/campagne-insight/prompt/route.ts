import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { isBeheerder } from "@/lib/gebruikersbeheer";
import { bewaarPrompt, haalPrompt, lijstPromptVersies } from "@/lib/insight/opslag";
import { haalProfielen } from "@/lib/profielen";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_LENGTE = 100_000;

/**
 * Campaign insight — de hoofdprompt.
 *
 * GET               → de geldende prompt (of de standaardtekst) en de eerdere versies
 * POST { inhoud }   → nieuwe versie opslaan (alleen beheerders)
 *
 * Lezen mag iedereen: wie een analyse leest, moet kunnen zien met welke opdracht hij is
 * gemaakt.
 */
export async function GET() {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  try {
    const supabase = await createClient();
    const [prompt, versies] = await Promise.all([haalPrompt(supabase), lijstPromptVersies(supabase)]);
    const namen = prompt.opgeslagenDoor
      ? await haalProfielen(supabase, [prompt.opgeslagenDoor]).catch(() => ({}) as Record<string, { naam: string | null }>)
      : {};
    const { opgeslagenDoor, ...rest } = prompt;
    return NextResponse.json({
      prompt: { ...rest, opgeslagenDoorNaam: opgeslagenDoor ? (namen[opgeslagenDoor]?.naam ?? null) : null },
      versies,
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
    return NextResponse.json({ fout: "Alleen beheerders mogen de hoofdprompt aanpassen." }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as { inhoud?: unknown } | null;
  const inhoud = typeof body?.inhoud === "string" ? body.inhoud.replace(/\r\n/g, "\n").trim() : "";
  if (!inhoud) return NextResponse.json({ fout: "De prompt is leeg." }, { status: 400 });
  if (inhoud.length > MAX_LENGTE) {
    return NextResponse.json({ fout: "De prompt is te lang (meer dan 100.000 tekens)." }, { status: 400 });
  }
  try {
    const { opgeslagenDoor: _door, ...prompt } = await bewaarPrompt(await createClient(), inhoud, gebruiker.id);
    return NextResponse.json({ prompt: { ...prompt, opgeslagenDoorNaam: null } });
  } catch (err) {
    return NextResponse.json({ fout: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
