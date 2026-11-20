import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { KPI_WEBSITES } from "@/lib/kpi2027/definities";
import { verwijderGroei, zetGroei } from "@/lib/kpi2027/groei";
import { GROEI_MAX, GROEI_MIN, KPI_TABBLADEN, isGeldigeGroei, type KpiTabblad } from "@/lib/kpi2027/groeiInvoer";
import { SYNTEC_KPIS } from "@/lib/kpi2027syntec/definities";
import { vindSocialKpi } from "@/lib/kpi2027social/definities";

export const dynamic = "force-dynamic";

/**
 * Het groeipercentage van één KPI op KPI's 2027, KPI's 2027 Syntec of KPI's 2027 social media
 * met de hand zetten.
 *
 * POST { tabblad, website, kpi, groei } — `groei` als fractie (0,075 = +7,5%), of null om
 * terug te gaan naar de standaard (+5%; op social media het percentage uit de definities). Elke ingelogde gebruiker mag dit; wie het als
 * laatste zette staat in de tabel (migratie 0036). De KPI moet bestaan in de definities van
 * dat tabblad, zodat er geen rijen ontstaan die nergens meer bij horen.
 */
function bestaat(tabblad: KpiTabblad, website: string, kpi: string): boolean {
  if (tabblad === "kpi-2027-syntec") return website === "" && SYNTEC_KPIS.some((k) => k.sleutel === kpi);
  if (tabblad === "kpi-2027-social") return Boolean(vindSocialKpi(website, kpi));
  return KPI_WEBSITES.some((w) => w.sleutel === website && w.kpis.some((k) => k.sleutel === kpi));
}

export async function POST(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Log eerst in." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const tabblad = KPI_TABBLADEN.find((t) => t === body.tabblad);
  const website = typeof body.website === "string" ? body.website : "";
  const kpi = typeof body.kpi === "string" ? body.kpi : "";

  if (!tabblad || !bestaat(tabblad, website, kpi)) {
    return NextResponse.json({ fout: "Onbekende KPI." }, { status: 400 });
  }
  if (body.groei !== null && !isGeldigeGroei(body.groei)) {
    return NextResponse.json(
      { fout: `Het percentage moet tussen ${GROEI_MIN * 100}% en +${GROEI_MAX * 100}% liggen.` },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();
    if (body.groei === null) await verwijderGroei(supabase, { tabblad, website, kpi });
    else await zetGroei(supabase, gebruiker.id, { tabblad, website, kpi, groei: body.groei });
    return NextResponse.json({ groei: body.groei });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : "Kon het percentage niet opslaan." },
      { status: 500 },
    );
  }
}
