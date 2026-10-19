import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { haalGa4Opties, isKanalenGeconfigureerd } from "@/lib/kanalen/bron";

export const dynamic = "force-dynamic";

/** De keuzelijsten van de koppelzijbalk: events, websites en kanaalgroepen. */
export async function GET() {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Log eerst in." }, { status: 401 });

  if (!isKanalenGeconfigureerd()) {
    return NextResponse.json(
      { fout: "DATAQUERY_DATABASE_URL ontbreekt — de GA4-data is niet aangesloten." },
      { status: 503 },
    );
  }

  try {
    return NextResponse.json(await haalGa4Opties());
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : "Kon de GA4-events niet ophalen." },
      { status: 500 },
    );
  }
}
