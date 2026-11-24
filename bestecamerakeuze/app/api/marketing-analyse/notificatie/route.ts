import { NextResponse } from "next/server";
import { metDienstVerbinding, verstuurNotificaties } from "@/lib/marketingAnalyse/notificatie";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Marketing analyse — mail de volgers van een nieuwe versie.
 *
 * POST { analyseId } → aangeroepen door de database-trigger uit migratie 0043 (pg_net), direct
 * na het bewaren van een analyse. Staat buiten de inlog (`lib/toegang.ts`) en vraagt geen
 * geheim: hij verstuurt alleen voor een bestaande, nog niet verstuurde versie van hoogstens
 * zeven dagen oud, en dat één keer. Wie hem aanroept, laat dus hoogstens een mail die toch al
 * zou komen iets eerder vertrekken.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { analyseId?: unknown } | null;
  const analyseId = typeof body?.analyseId === "string" ? body.analyseId.trim() : "";
  if (!UUID.test(analyseId)) return NextResponse.json({ fout: "analyseId ontbreekt of is ongeldig." }, { status: 400 });
  try {
    const uitkomst = await metDienstVerbinding((client) => verstuurNotificaties(client, analyseId));
    return NextResponse.json(uitkomst, { status: uitkomst.status === "mislukt" ? 502 : 200 });
  } catch (err) {
    return NextResponse.json({ fout: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
