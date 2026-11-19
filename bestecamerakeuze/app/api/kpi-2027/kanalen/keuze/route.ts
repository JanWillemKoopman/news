import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { vindWebsite } from "@/lib/kpi2027/definities";
import { isKanaalSleutel } from "@/lib/kpi2027/kanalen";
import { verwijderKanaalKeuze, zetKanaalKeuze } from "@/lib/kpi2027/kanaalKeuzes";

export const dynamic = "force-dynamic";

/**
 * POST `/api/kpi-2027/kanalen/keuze` { website, bronMedium, kanaal } — de kanaalgroep van
 * één bron/medium met de hand zetten ("Kanaalgroepindeling" op KPI's 2027 GA), of met
 * `kanaal: null` terug naar de regels. Elke ingelogde collega mag dit; wie het als laatste
 * zette staat in de tabel (migratie 0038).
 */
export async function POST(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Log eerst in." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const website = vindWebsite(typeof body.website === "string" ? body.website : "");
  const bronMedium = typeof body.bronMedium === "string" ? body.bronMedium : null;
  if (!website?.kanaalverdeling) return NextResponse.json({ fout: "Onbekende website." }, { status: 400 });
  if (bronMedium === null || bronMedium.length > 300) {
    return NextResponse.json({ fout: "Onbekende bron/medium." }, { status: 400 });
  }
  if (body.kanaal !== null && !isKanaalSleutel(body.kanaal)) {
    return NextResponse.json({ fout: "Onbekende kanaalgroep." }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    if (body.kanaal === null) await verwijderKanaalKeuze(supabase, { website: website.sleutel, bronMedium });
    else await zetKanaalKeuze(supabase, gebruiker.id, { website: website.sleutel, bronMedium, kanaal: body.kanaal });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : "Kon de keuze niet opslaan." },
      { status: 500 },
    );
  }
}
