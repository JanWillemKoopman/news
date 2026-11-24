import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { isBeheerder } from "@/lib/gebruikersbeheer";
import { bewaarSemantiek, haalSemantiek } from "@/lib/marketingAnalyse/opslag";
import { leesSemantiek } from "@/lib/marketingAnalyse/rekenen";
import { haalProfielen } from "@/lib/profielen";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Marketing analyse — de semantic layer (kennis per databron). Lezen mag iedereen (ook de
 * keuzelijst Bedrijf in de briefing komt hieruit); opslaan, altijd als nieuwe versie, alleen
 * de eigenaar.
 */
export async function GET() {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  try {
    const supabase = await createClient();
    const { opgeslagenDoor, ...semantiek } = await haalSemantiek(supabase);
    const namen = opgeslagenDoor ? await haalProfielen(supabase, [opgeslagenDoor]).catch(() => ({}) as Record<string, { naam: string | null }>) : {};
    return NextResponse.json({
      semantiek: { ...semantiek, opgeslagenDoorNaam: opgeslagenDoor ? (namen[opgeslagenDoor]?.naam ?? null) : null },
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
    return NextResponse.json({ fout: "Alleen de eigenaar mag de semantic layer aanpassen." }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as { inhoud?: unknown } | null;
  const inhoud = leesSemantiek(body?.inhoud);
  if (inhoud.bedrijven.length === 0) {
    return NextResponse.json({ fout: "Geef in het blok Algemeen minstens één bedrijf op." }, { status: 400 });
  }
  try {
    const { opgeslagenDoor: _door, ...semantiek } = await bewaarSemantiek(await createClient(), inhoud, gebruiker.id);
    return NextResponse.json({ semantiek: { ...semantiek, opgeslagenDoorNaam: null } });
  } catch (err) {
    return NextResponse.json({ fout: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
