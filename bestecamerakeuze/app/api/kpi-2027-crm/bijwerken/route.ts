import { NextResponse } from "next/server";
import { werkCrmStandBij } from "@/lib/kpi2027crm/bijwerken";

export const dynamic = "force-dynamic";
/** De export ophalen en ombouwen kost ±10 seconden; ruim daarboven. */
export const maxDuration = 120;

/**
 * De dagelijkse vastlegging van KPI's 2027 CRM, aangeroepen door Vercel Cron (zie `vercel.json`):
 * per KPI het aantal van vandaag in `kpi_2027_crm_standen` — zie `lib/kpi2027crm/bijwerken.ts`.
 *
 * Staat buiten de inlog (`CRON_PADEN` in `lib/toegang.ts`) en legitimeert zich met
 * `CRON_SECRET`, net als de andere cron-routes. `?vers=1` haalt de export opnieuw op in plaats
 * van de tabel in het geheugen te gebruiken.
 */
function isGeautoriseerd(request: Request): boolean {
  const geheim = process.env.CRON_SECRET;
  if (!geheim) return false;
  return request.headers.get("authorization") === `Bearer ${geheim}`;
}

export async function POST(request: Request) {
  if (!isGeautoriseerd(request)) {
    return NextResponse.json({ fout: "Niet geautoriseerd." }, { status: 401 });
  }
  try {
    const vers = new URL(request.url).searchParams.get("vers") === "1";
    const uitkomst = await werkCrmStandBij({ vers });
    return NextResponse.json(uitkomst, { status: uitkomst.ok ? 200 : 500 });
  } catch (err) {
    return NextResponse.json({ fout: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

/** Vercel Cron doet een GET; dezelfde autorisatie, dezelfde afhandeling. */
export async function GET(request: Request) {
  return POST(request);
}
