import { NextResponse } from "next/server";
import { werkSocialStandenBij } from "@/lib/kpi2027social/bijwerken";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * De wekelijkse bijwerking van het tabblad KPI's 2027 social media, aangeroepen door Vercel Cron op
 * zondag (zie `vercel.json`), een half uur na die van KPI's 2027 GA. Werkt voor alle
 * social-accounts de stand t/m zaterdag bij — zie
 * `lib/kpi2027social/bijwerken.ts`.
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
    const uitkomst = await werkSocialStandenBij();
    return NextResponse.json(uitkomst, { status: uitkomst.ok ? 200 : 500 });
  } catch (err) {
    return NextResponse.json({ fout: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

/** Vercel Cron doet een GET; dezelfde autorisatie, dezelfde afhandeling. */
export async function GET(request: Request) {
  return POST(request);
}
