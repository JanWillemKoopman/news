import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { isKanalenGeconfigureerd } from "@/lib/kanalen/bron";
import { KPI_DOELJAAR } from "@/lib/kpi2027/definities";
import { peildatumVoor, volgendeUpdate } from "@/lib/kpi2027/rekenen";
import { haalSyntecIngelezenOp, haalSyntecTellingen } from "@/lib/kpi2027syntec/bron";
import { syntecOverzicht, type Kpi2027SyntecAntwoord } from "@/lib/kpi2027syntec/rekenen";

export const dynamic = "force-dynamic";

/**
 * Het tabblad KPI's 2027 Syntec: de websiteleads uit Syntec per bron, met de verwachting
 * voor 2026 en het target voor 2027 (+5%).
 *
 * Rekent bij elk verzoek uit wat er in `v_leads` staat, t/m de laatste zaterdag — dezelfde
 * peildatum als KPI's 2027, zodat het target niet midden in de week verschuift. Zodra 2027
 * begonnen is, telt de realisatie van 2027 t/m diezelfde zaterdag mee.
 */
export async function GET() {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  if (!isKanalenGeconfigureerd()) {
    return NextResponse.json(
      { fout: "DATAQUERY_DATABASE_URL ontbreekt — de Syntec-leads zijn niet aangesloten." },
      { status: 503 },
    );
  }

  try {
    const nu = new Date();
    const peildatum = peildatumVoor(nu);
    const peildatumDoeljaar = peildatumVoor(nu, KPI_DOELJAAR);
    const ingelezenOp = await haalSyntecIngelezenOp().catch(() => null);
    let antwoord: Kpi2027SyntecAntwoord = {
      peildatum: null,
      peildatumDoeljaar: null,
      ingelezenOp,
      volgendeUpdate: null,
      overzicht: null,
    };
    if (peildatum) {
      const laatste = peildatumDoeljaar ?? peildatum;
      const { vorigJaar, basisjaar, doeljaar } = await haalSyntecTellingen(laatste);
      antwoord = {
        peildatum,
        peildatumDoeljaar,
        ingelezenOp,
        volgendeUpdate: volgendeUpdate(laatste),
        overzicht: syntecOverzicht(basisjaar, peildatum, {
          vorigJaar,
          doeljaar: peildatumDoeljaar ? { tellingen: doeljaar, peildatum: peildatumDoeljaar } : null,
        }),
      };
    }
    return NextResponse.json(antwoord, {
      headers: { "Cache-Control": "private, max-age=300, stale-while-revalidate=3600" },
    });
  } catch (err) {
    return NextResponse.json({ fout: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
