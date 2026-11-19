import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { isBeheerder } from "@/lib/gebruikersbeheer";
import { isKanalenGeconfigureerd } from "@/lib/kanalen/bron";
import { werkKpiStandenBij } from "@/lib/kpi2027/bijwerken";
import { leesStanden } from "@/lib/kpi2027/bron";
import { leesGroeiVeilig } from "@/lib/kpi2027/groei";
import { groeiSleutel } from "@/lib/kpi2027/groeiInvoer";
import { KPI_DOELJAAR, KPI_JAAR, KPI_WEBSITES } from "@/lib/kpi2027/definities";
import { websiteOverzicht, type Kpi2027Antwoord } from "@/lib/kpi2027/rekenen";

export const dynamic = "force-dynamic";
// De knop "Nu bijwerken" haalt het hele jaar van zes websites bij Windsor op.
export const maxDuration = 300;

/**
 * Het tabblad KPI's 2027.
 *
 * GET leest de standen (per website één voor 2026 en, vanaf januari 2027, één voor 2027) en
 * rekent de KPI's daaruit uit (`rekenen.ts`). POST werkt de standen nu bij — alleen voor
 * beheerders, en tot en met dezelfde zaterdag als de cron op zondag, zie
 * `lib/kpi2027/bijwerken.ts`.
 */
async function antwoord(): Promise<Kpi2027Antwoord> {
  const [standen, groei] = await Promise.all([leesStanden(), leesGroeiVeilig("kpi-2027")]);
  return {
    websites: KPI_WEBSITES.map((w) =>
      websiteOverzicht(
        w,
        standen.find((s) => s.website === w.sleutel && s.jaar === KPI_JAAR) ?? null,
        standen.find((s) => s.website === w.sleutel && s.jaar === KPI_DOELJAAR) ?? null,
        (kpi) => groei.get(groeiSleutel(w.sleutel, kpi)),
        w.vergelijkingsjaar
          ? (standen.find((s) => s.website === w.sleutel && s.jaar === w.vergelijkingsjaar!.jaar) ?? null)
          : null,
      ),
    ),
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
      // Niet in de browser cachen: een net aangepast percentage moet er na herladen staan.
      { headers: { "Cache-Control": "private, no-store" } },
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
    // Met de hand mag de basis (2026) ook na de jaarwisseling nog opnieuw: een bewuste keuze.
    const uitkomst = await werkKpiStandenBij({ forceer: true });
    const fouten = uitkomst.resultaten.filter((r) => r.fout).map((r) => r.fout);
    return NextResponse.json({
      ...(await antwoord()),
      magBijwerken: true,
      fout: fouten.length > 0 ? `Niet alles kon worden bijgewerkt: ${fouten.join(" · ")}` : undefined,
    });
  } catch (err) {
    return NextResponse.json({ fout: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
