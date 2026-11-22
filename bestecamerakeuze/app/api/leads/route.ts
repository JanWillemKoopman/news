import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { magBeperkteTabbladenZien } from "@/lib/beperkteTabbladen";
import { haalSyncStand, isKanalenGeconfigureerd } from "@/lib/kanalen/bron";
import { haalLeads } from "@/lib/leads/bron";

export const dynamic = "force-dynamic";

/**
 * De data achter het tabblad Leads onder Kanalen.
 *
 * `?van=JJJJ-MM-DD&tot=JJJJ-MM-DD` kiest de periode (standaard alles vanaf 1 juni 2026). Een
 * andere periode is een nieuw verzoek, omdat de kosten van een campagne over de leads van
 * dezelfde dagen verdeeld worden; de overige filters (soort, kanaal, merk …) doet de pagina
 * daarna zelf in het geheugen, zodat een klik daarop geen netwerkronde kost.
 *
 * De data verandert één keer per nacht, dus het antwoord mag ruim gecachet worden.
 */
const CACHE = "private, max-age=300, stale-while-revalidate=3600";

function datum(waarde: string | null): string | undefined {
  return waarde && /^\d{4}-\d{2}-\d{2}$/.test(waarde) ? waarde : undefined;
}

export async function GET(request: Request) {
  // Leaddata is bedrijfsdata: wie niet is ingelogd, krijgt hem niet.
  const gebruiker = await getGebruiker();
  if (!gebruiker) {
    return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  }
  // Het tabblad Leads is alleen voor de eigenaar (lib/beperkteTabbladen.ts).
  if (!magBeperkteTabbladenZien(gebruiker.email)) {
    return NextResponse.json({ fout: "Geen toegang tot dit tabblad." }, { status: 403 });
  }

  if (!isKanalenGeconfigureerd()) {
    return NextResponse.json(
      { fout: "DATAQUERY_DATABASE_URL ontbreekt — de leaddata is niet aangesloten." },
      { status: 503 },
    );
  }

  try {
    const [data, stand] = await Promise.all([
      haalLeads({
        van: datum(new URL(request.url).searchParams.get("van")),
        tot: datum(new URL(request.url).searchParams.get("tot")),
      }),
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
