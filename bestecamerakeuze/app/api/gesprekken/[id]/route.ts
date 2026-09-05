import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { haalBerichten, hernoemGesprek, verwijderGesprek } from "@/lib/gesprekken";

export const dynamic = "force-dynamic";

/** In Next 15 zijn routeparameters async. */
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Log eerst in." }, { status: 401 });

  const { id } = await params;
  try {
    const supabase = await createClient();
    return NextResponse.json({ berichten: await haalBerichten(supabase, id) });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : "Kon berichten niet ophalen." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Log eerst in." }, { status: 401 });

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { titel?: unknown };
  const titel = typeof body.titel === "string" ? body.titel.trim() : "";
  if (!titel) return NextResponse.json({ fout: "Geen titel." }, { status: 400 });

  try {
    const supabase = await createClient();
    await hernoemGesprek(supabase, id, titel);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : "Kon niet hernoemen." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Log eerst in." }, { status: 401 });

  const { id } = await params;
  try {
    const supabase = await createClient();
    await verwijderGesprek(supabase, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : "Kon niet verwijderen." },
      { status: 500 },
    );
  }
}
