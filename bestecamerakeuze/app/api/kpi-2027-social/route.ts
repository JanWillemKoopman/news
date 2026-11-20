import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { isBeheerder } from "@/lib/gebruikersbeheer";
import { isKanalenGeconfigureerd } from "@/lib/kanalen/bron";
import { leesGroeiVeilig } from "@/lib/kpi2027/groei";
import { groeiSleutel } from "@/lib/kpi2027/groeiInvoer";
import { SOCIAL_MERKEN } from "@/lib/kpi2027social/definities";
import { leesLaatsteFout, leesSocialStanden } from "@/lib/kpi2027social/bron";
import { werkSocialStandenBij } from "@/lib/kpi2027social/bijwerken";
import { merkOverzicht, type Kpi2027SocialAntwoord } from "@/lib/kpi2027social/rekenen";

export const dynamic = "force-dynamic";
// De knop "Nu bijwerken" haalt het hele jaar van alle accounts bij Windsor op.
export const maxDuration = 300;

/**
 * Het tabblad KPI's 2027 social media. GET leest de standen per account en rekent de KPI's
 * per merk uit (`lib/kpi2027social/rekenen.ts`); POST werkt ze nu bij — alleen voor
 * beheerders, t/m dezelfde zaterdag als de cron op zondag.
 */
async function antwoord(): Promise<Omit<Kpi2027SocialAntwoord, "magBijwerken">> {
  const [standen, groei, laatsteFout] = await Promise.all([
    leesSocialStanden(),
    leesGroeiVeilig("kpi-2027-social"),
    leesLaatsteFout().catch(() => null),
  ]);
  return {
    merken: SOCIAL_MERKEN.map((m) => merkOverzicht(m, standen, (kpi) => groei.get(groeiSleutel(m.sleutel, kpi)))),
    laatsteFout,
  };
}

export async function GET() {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  if (!isKanalenGeconfigureerd()) {
    return NextResponse.json(
      { fout: "DATAQUERY_DATABASE_URL ontbreekt — de KPI-stand is niet aangesloten." },
      { status: 503 },
    );
  }
  try {
    return NextResponse.json(
      { ...(await antwoord()), magBijwerken: isBeheerder(gebruiker.email) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    return NextResponse.json({ fout: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function POST() {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  if (!isBeheerder(gebruiker.email)) {
    return NextResponse.json({ fout: "Alleen beheerders kunnen de stand bijwerken." }, { status: 403 });
  }
  try {
    // De fouten per account komen via sync_runs terug in `laatsteFout`.
    await werkSocialStandenBij({ forceer: true });
    return NextResponse.json({ ...(await antwoord()), magBijwerken: true });
  } catch (err) {
    return NextResponse.json({ fout: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
