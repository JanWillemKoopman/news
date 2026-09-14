import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { lijstCijfers, verwijderCijfer, zetCijfer } from "@/lib/campagneCijfers";

export const dynamic = "force-dynamic";

export async function GET() {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Log eerst in." }, { status: 401 });

  try {
    const supabase = await createClient();
    const items = await lijstCijfers(supabase);
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : "Kon campagnecijfers niet ophalen." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Log eerst in." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const campagne = typeof body.campagne === "string" ? body.campagne.trim() : "";
  const cijfer = typeof body.cijfer === "number" ? body.cijfer : null;

  if (!campagne) return NextResponse.json({ fout: "Campagnenaam ontbreekt." }, { status: 400 });

  try {
    const supabase = await createClient();

    if (cijfer === null) {
      await verwijderCijfer(supabase, campagne);
      return NextResponse.json({ item: null });
    }

    if (!Number.isInteger(cijfer) || cijfer < 0 || cijfer > 10) {
      return NextResponse.json({ fout: "Cijfer moet een geheel getal tussen 0 en 10 zijn." }, { status: 400 });
    }

    const item = await zetCijfer(supabase, gebruiker.id, campagne, cijfer);
    return NextResponse.json({ item });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : "Kon campagnecijfer niet opslaan." },
      { status: 500 },
    );
  }
}
