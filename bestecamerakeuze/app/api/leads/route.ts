import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { haalSyncStand, isKanalenGeconfigureerd } from "@/lib/kanalen/bron";
import { haalLeads } from "@/lib/leads/bron";

export const dynamic = "force-dynamic";

/**
 * De data achter het tabblad Leads onder Kanalen.
 *
 * Eén verzoek, geen filterparameters: de periode is vast (de laatste dertig dagen, zoals
 * de leadtabel ze bevat) en de pagina filtert daarna zelf in het geheugen. Zo kost een klik
 * op een filter geen netwerkronde — hetzelfde uitgangspunt als `/api/kanalen`.
 *
 * De data verandert één keer per nacht, dus het antwoord mag ruim gecachet worden.
 */
const CACHE = "private, max-age=300, stale-while-revalidate=3600";

export async function GET() {
  // Leaddata is bedrijfsdata: wie niet is ingelogd, krijgt hem niet.
  const gebruiker = await getGebruiker();
  if (!gebruiker) {
    return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  }

  if (!isKanalenGeconfigureerd()) {
    return NextResponse.json(
      { fout: "DATAQUERY_DATABASE_URL ontbreekt — de leaddata is niet aangesloten." },
      { status: 503 },
    );
  }

  try {
    const [data, stand] = await Promise.all([
      haalLeads(),
      haalSyncStand().catch(() => ({ laatsteSync: null, loopt: false })),
    ]);
    return NextResponse.json(
      { ...data, laatsteSync: stand.laatsteSync, syncLoopt: stand.loopt },
      { headers: { "Cache-Control": CACHE } },
    );
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
