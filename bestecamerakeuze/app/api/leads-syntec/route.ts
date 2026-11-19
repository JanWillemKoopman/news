import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { isKanalenGeconfigureerd } from "@/lib/kanalen/bron";
import { haalSyntecIngelezenOp } from "@/lib/kpi2027syntec/bron";
import { haalSyntecLeads } from "@/lib/leadsSyntec/bron";
import type { LeadsSyntecAntwoord } from "@/lib/leadsSyntec/samenvatting";

export const dynamic = "force-dynamic";

/**
 * De data achter het tabblad Leads Syntec onder Kanalen: alle leads uit het sheet-tabblad
 * "Data leads", samengevat per dag.
 *
 * Eén verzoek, geen parameters: periode, filters en de vergelijking met vorig jaar doet de
 * pagina in het geheugen, net als bij `/api/leads` en `/api/kanalen`. De sheet wordt één
 * keer per nacht gekopieerd, dus het antwoord mag even gecachet worden.
 */
const CACHE = "private, max-age=300, stale-while-revalidate=3600";

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
    const [data, ingelezenOp] = await Promise.all([
      haalSyntecLeads(),
      haalSyntecIngelezenOp().catch(() => null),
    ]);
    const antwoord: LeadsSyntecAntwoord = { ...data, ingelezenOp };
    return NextResponse.json(antwoord, { headers: { "Cache-Control": CACHE } });
  } catch (err) {
    return NextResponse.json({ fout: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
