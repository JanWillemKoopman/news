import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { isBeheerder } from "@/lib/gebruikersbeheer";
import { leesOpzetInvoer } from "@/lib/marketingAnalyse/rekenen";
import { haalOpzet, lijstOpzetten, maakOpzet, verwijderOpzet, werkOpzetBij } from "@/lib/marketingAnalyse/opslag";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Marketing analyse — de analyse opzetten (analysetypes), elk met een eigen prompt.
 *
 * GET                                         → alle opzetten (iedereen)
 * POST { naam, formulier, bedrijf }           → nieuwe opzet (alleen de eigenaar)
 * PATCH ?id=… { naam, formulier, bedrijf, actief } → wijzigen (alleen de eigenaar)
 * DELETE ?id=…                                → weg, alleen zonder analyses en niet de
 *                                               standaard (alleen de eigenaar); anders uitzetten
 */

function fout(tekst: string, status: number) {
  return NextResponse.json({ fout: tekst }, { status });
}

function foutUit(err: unknown) {
  return fout(err instanceof Error ? err.message : String(err), 500);
}

export async function GET() {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return fout("Niet ingelogd.", 401);
  try {
    return NextResponse.json({ opzetten: await lijstOpzetten(await createClient()), magBewerken: isBeheerder(gebruiker.email) });
  } catch (err) {
    return foutUit(err);
  }
}

export async function POST(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return fout("Niet ingelogd.", 401);
  if (!isBeheerder(gebruiker.email)) return fout("Alleen de eigenaar mag een opzet toevoegen.", 403);
  const uitkomst = leesOpzetInvoer(await request.json().catch(() => null));
  if (!uitkomst.ok) return fout(uitkomst.fout, 400);
  try {
    const supabase = await createClient();
    const id = await maakOpzet(supabase, uitkomst.invoer, gebruiker.id);
    return NextResponse.json({ opzet: await haalOpzet(supabase, id) });
  } catch (err) {
    return foutUit(err);
  }
}

export async function PATCH(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return fout("Niet ingelogd.", 401);
  if (!isBeheerder(gebruiker.email)) return fout("Alleen de eigenaar mag een opzet wijzigen.", 403);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return fout("Geen opzet opgegeven.", 400);
  const uitkomst = leesOpzetInvoer(await request.json().catch(() => null));
  if (!uitkomst.ok) return fout(uitkomst.fout, 400);
  try {
    const supabase = await createClient();
    const huidig = await haalOpzet(supabase, id);
    if (!huidig) return fout("Opzet niet gevonden.", 404);
    // De standaard blijft een actieve campagne-analyse: daar valt alles op terug.
    const velden = huidig.standaard ? { ...uitkomst.invoer, formulier: "campagne" as const, actief: true } : uitkomst.invoer;
    await werkOpzetBij(supabase, id, velden);
    return NextResponse.json({ opzet: await haalOpzet(supabase, id) });
  } catch (err) {
    return foutUit(err);
  }
}

export async function DELETE(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return fout("Niet ingelogd.", 401);
  if (!isBeheerder(gebruiker.email)) return fout("Alleen de eigenaar mag een opzet verwijderen.", 403);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return fout("Geen opzet opgegeven.", 400);
  try {
    const supabase = await createClient();
    const opzet = await haalOpzet(supabase, id);
    if (!opzet) return fout("Opzet niet gevonden.", 404);
    if (opzet.standaard) return fout("Campagne analyse is de standaard en kan niet weg.", 400);
    if (opzet.aantalCampagnes > 0) {
      return fout(`Er ${opzet.aantalCampagnes === 1 ? "hangt nog één analyse" : `hangen nog ${opzet.aantalCampagnes} analyses`} aan deze opzet. Zet hem uit in plaats van hem te verwijderen.`, 400);
    }
    await verwijderOpzet(supabase, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return foutUit(err);
  }
}
