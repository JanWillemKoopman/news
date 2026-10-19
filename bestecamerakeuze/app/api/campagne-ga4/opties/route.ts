import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { haalGa4Opties, isKanalenGeconfigureerd } from "@/lib/kanalen/bron";

export const dynamic = "force-dynamic";

const DATUM = /^\d{4}-\d{2}-\d{2}$/;

/**
 * De keuzelijsten van de koppelzijbalk: events, websites en kanaalgroepen.
 *
 * Met `?van=&tot=` (de looptijd van de campagne) tellen en sorteren de events over die
 * periode; zonder over de laatste negentig dagen.
 */
export async function GET(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Log eerst in." }, { status: 401 });

  if (!isKanalenGeconfigureerd()) {
    return NextResponse.json(
      { fout: "DATAQUERY_DATABASE_URL ontbreekt — de GA4-data is niet aangesloten." },
      { status: 503 },
    );
  }

  try {
    const zoek = new URL(request.url).searchParams;
    const van = zoek.get("van");
    const tot = zoek.get("tot");
    const periode = van && tot && DATUM.test(van) && DATUM.test(tot) && van <= tot ? { van, tot } : undefined;
    return NextResponse.json(await haalGa4Opties(periode));
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : "Kon de GA4-events niet ophalen." },
      { status: 500 },
    );
  }
}
