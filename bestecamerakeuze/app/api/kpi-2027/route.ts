import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { isBeheerder } from "@/lib/gebruikersbeheer";
import { isKanalenGeconfigureerd } from "@/lib/kanalen/bron";
import { werkKpiStandBij } from "@/lib/kpi2027/bijwerken";
import { leesLaatsteStand } from "@/lib/kpi2027/bron";
import { KPI_DEFINITIES } from "@/lib/kpi2027/definities";
import { kpiOverzicht, volgendeUpdate } from "@/lib/kpi2027/rekenen";

export const dynamic = "force-dynamic";
// De knop "Nu bijwerken" haalt het hele jaar bij Windsor op; dat duurt doorgaans een halve
// minuut, maar Windsor kan bij drukte trager zijn.
export const maxDuration = 300;

/**
 * Het tabblad KPI's 2027.
 *
 * GET leest de laatste wekelijkse stand en rekent de KPI's daaruit uit (`rekenen.ts`).
 * POST werkt de stand nu bij — alleen voor beheerders, en tot en met dezelfde zaterdag als
 * de cron op zondag, zie `lib/kpi2027/bijwerken.ts`.
 */
async function antwoord() {
  const stand = await leesLaatsteStand();
  if (!stand) return { stand: null, volgendeUpdate: null, kpis: [] };
  return {
    stand: { peildatum: stand.peildatum, berekendOp: stand.berekendOp, definitief: stand.definitief },
    volgendeUpdate: volgendeUpdate(stand.peildatum),
    kpis: kpiOverzicht(stand, KPI_DEFINITIES),
  };
}

export async function GET() {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  if (!isKanalenGeconfigureerd()) {
    return NextResponse.json(
      { fout: "DATAQUERY_DATABASE_URL ontbreekt — de KPI-stand is niet aangesloten." },
      { status: 503 },
    );
  }
  try {
    return NextResponse.json(
      { ...(await antwoord()), magBijwerken: isBeheerder(gebruiker.email) },
      { headers: { "Cache-Control": "private, max-age=300, stale-while-revalidate=3600" } },
    );
  } catch (err) {
    return NextResponse.json({ fout: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function POST() {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  if (!isBeheerder(gebruiker.email)) {
    return NextResponse.json({ fout: "Alleen beheerders kunnen de stand bijwerken." }, { status: 403 });
  }
  try {
    // Met de hand bijwerken mag ook na de jaarwisseling nog: dan is het een bewuste keuze.
    const uitkomst = await werkKpiStandBij({ forceer: true });
    return NextResponse.json({ ...(await antwoord()), magBijwerken: true, bijgewerkt: uitkomst });
  } catch (err) {
    return NextResponse.json({ fout: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
