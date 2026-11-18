import { NextResponse } from "next/server";
import { werkKpiStandenBij } from "@/lib/kpi2027/bijwerken";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * De wekelijkse bijwerking van het tabblad KPI's 2027, aangeroepen door Vercel Cron op
 * zondag (zie `vercel.json`). Werkt voor alle websites de stand t/m zaterdag bij: in 2026
 * de basis voor het target, vanaf januari 2027 de realisatie — zie
 * `lib/kpi2027/bijwerken.ts`.
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
    const uitkomst = await werkKpiStandenBij();
    return NextResponse.json(uitkomst, { status: uitkomst.ok ? 200 : 500 });
  } catch (err) {
    return NextResponse.json({ fout: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

/** Vercel Cron doet een GET; dezelfde autorisatie, dezelfde afhandeling. */
export async function GET(request: Request) {
  return POST(request);
}
