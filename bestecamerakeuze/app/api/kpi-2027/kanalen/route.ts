import { NextResponse, type NextRequest } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { vindWebsite } from "@/lib/kpi2027/definities";
import { kanalenVoorKpi, metKpiTotalen, type KanaalVerdeling, type KanalenAntwoord } from "@/lib/kpi2027/kanalen";
import { leesStanden } from "@/lib/kpi2027/bron";
import { leesKanaalVerdeling, werkKanaalVerdelingBij } from "@/lib/kpi2027/kanalenBron";
import { kpiMaandTotaal, laatsteZaterdag } from "@/lib/kpi2027/rekenen";

export const dynamic = "force-dynamic";
// De eerste keer haalt deze route de verdeling zelf op bij Windsor (twee opvragingen over
// bijna twee jaar); dat past ruim, maar niet in de standaardtijd.
export const maxDuration = 300;

/**
 * GET `/api/kpi-2027/kanalen?website=udenhout`: de kanaalverdeling per KPI, voor het
 * knopje "Kanalen" op KPI's 2027 GA. Niet de leadtabel van het tabblad Leads, maar
 * dezelfde bron als KPI's 2027 GA (zelfde property, events en hostregels, met bron/medium
 * erbij); per maand staat het cijfer van de KPI-pagina er ter controle naast. Staat er nog niets, dan wordt hij nu opgehaald en
 * bewaard; daarna houdt de zondagse cron hem bij (`lib/kpi2027/bijwerken.ts`).
 */
export async function GET(req: NextRequest) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json<KanalenAntwoord>({ fout: "Niet ingelogd." }, { status: 401 });

  const website = vindWebsite(req.nextUrl.searchParams.get("website") ?? "");
  if (!website?.kanaalverdeling) {
    return NextResponse.json<KanalenAntwoord>({ fout: "Deze website heeft geen kanaalverdeling." }, { status: 404 });
  }

  try {
    let verdeling: (KanaalVerdeling & { berekendOp: string }) | null = await leesKanaalVerdeling(website.sleutel);
    if (!verdeling) {
      const nieuw = await werkKanaalVerdelingBij(website, laatsteZaterdag(new Date()));
      verdeling = { ...nieuw, berekendOp: new Date().toISOString() };
    }
    // De standen van KPI's 2027 GA zelf, om per maand naast het kanaaltotaal te zetten.
    const standen = (await leesStanden().catch(() => [])).filter((s) => s.website === website.sleutel);
    const kpis: NonNullable<KanalenAntwoord["kpis"]> = {};
    for (const k of website.kpis) {
      kpis[k.sleutel] = metKpiTotalen(kanalenVoorKpi(k, verdeling), (maand) => {
        const stand = standen.find((s) => s.jaar === Number(maand.slice(0, 4)));
        return stand ? kpiMaandTotaal(k, stand, maand) : null;
      });
    }
    return NextResponse.json<KanalenAntwoord>(
      {
        website: website.sleutel,
        peildatum: verdeling.peildatum,
        berekendOp: verdeling.berekendOp,
        kpis,
        voorbeelden: verdeling.voorbeelden,
      },
      { headers: { "Cache-Control": "private, max-age=300" } },
    );
  } catch (err) {
    return NextResponse.json<KanalenAntwoord>(
      { fout: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
