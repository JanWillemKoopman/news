import { NextResponse } from "next/server";
import { werkKpiStandBij } from "@/lib/kpi2027/bijwerken";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * De wekelijkse bijwerking van het tabblad KPI's 2027, aangeroepen door Vercel Cron op
 * zondag (zie `vercel.json`). Rekent tot en met zaterdag, tot 2026 helemaal gemeten is;
 * daarna doet hij niets meer — zie `lib/kpi2027/bijwerken.ts`.
 *
 * Staat buiten de inlog (`CRON_PADEN` in `lib/toegang.ts`) en legitimeert zich met
 * `CRON_SECRET`, net als de andere cron-routes.
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
    return NextResponse.json(await werkKpiStandBij());
  } catch (err) {
    return NextResponse.json({ fout: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

/** Vercel Cron doet een GET; dezelfde autorisatie, dezelfde afhandeling. */
export async function GET(request: Request) {
  return POST(request);
}
