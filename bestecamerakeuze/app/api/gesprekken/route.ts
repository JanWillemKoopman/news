import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { lijstGesprekken, maakGesprek } from "@/lib/gesprekken";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Log eerst in." }, { status: 401 });

  const zoek = new URL(request.url).searchParams.get("zoek") ?? undefined;
  try {
    const supabase = await createClient();
    return NextResponse.json({ gesprekken: await lijstGesprekken(supabase, zoek) });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : "Kon gesprekken niet ophalen." },
      { status: 500 },
    );
  }
}

export async function POST() {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Log eerst in." }, { status: 401 });

  try {
    const supabase = await createClient();
    return NextResponse.json({ gesprek: await maakGesprek(supabase, gebruiker.id) });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : "Kon gesprek niet aanmaken." },
      { status: 500 },
    );
  }
}
