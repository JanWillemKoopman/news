import { NextResponse } from "next/server";
import { isWindsorGeconfigureerd } from "@/lib/windsor/api";
import { VENSTER_DAGEN, standaardVenster } from "@/lib/windsor/sync";
import { isDeel, voerSyncUit } from "@/lib/windsor/uitvoeren";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * De nachtelijke Windsor-sync, aangeroepen door Vercel Cron.
 *
 * ## Waarom in drie stukken
 *
 * Eén run over alles heen past niet binnen de vijf minuten die een serverless functie
 * krijgt: Facebook organic deed er in de meting alleen al 131 seconden over. Daarom drie
 * onderdelen die los draaien, elk met een eigen cron-regel in `vercel.json`:
 *
 *   ?deel=advertenties  — Meta, Google en LinkedIn Ads (±60 s)
 *   ?deel=organisch     — posts van Facebook, Instagram en LinkedIn (±120 s)
 *   ?deel=account       — pagina- en volgercijfers (±65 s)
 *
 * Ze staan elk in een eigen uur (02:10, 03:10, 04:10 UTC). Op het Hobby-plan van Vercel
 * is de cron-timing per uur nauwkeurig met een marge van 59 minuten, dus drie delen
 * binnen hetzelfde uur zouden in willekeurige volgorde vallen — en `organisch` moet ná
 * `advertenties` draaien omdat het de posts aan de advertenties koppelt.
 *
 * Zonder `deel` draait alles achter elkaar; alleen verstandig met een ruimere timeout
 * dan Vercel geeft.
 *
 * ## Waarom er zondagnacht een ruimere ronde bij staat
 *
 * De dagelijkse ronde ververst dertig dagen. Alles daarvoor is dus bevroren op het
 * moment dat het is opgehaald — inclusief conversies die binnen het attributievenster
 * dagen ná de klik nog binnenkomen. Een campagne die in maart draaide, staat in juni nog
 * steeds met de conversies van eind maart. `vercel.json` haalt daarom zondagnacht in twee
 * ronden de maanden dáárvoor opnieuw op: één keer per week schuift het venster ruim
 * genoeg terug om die na-ijl mee te nemen, zonder dat elke nacht vier maanden opnieuw
 * wordt opgehaald. Accountcijfers staan er niet bij — een volgersstand van gisteren
 * verandert niet meer.
 *
 * Twee ronden en niet één, omdat honderdtwintig dagen niet binnen de vijf minuten van een
 * functie passen. `terug` schuift het venster naar het verleden: `dagen=60&terug=60` is
 * de periode van 120 tot 60 dagen geleden. De sync knipt zo'n venster daarbinnen zelf nog
 * eens in stukken van dertig dagen en stopt netjes als de tijd op is — zie
 * `lib/windsor/uitvoeren.ts`.
 *
 * Het echte werk staat in `lib/windsor/uitvoeren.ts`, want de knop "Data ophalen" in het
 * dashboard start precies dezelfde sync — alleen met een ander soort toegangscontrole.
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
  if (!isWindsorGeconfigureerd()) {
    return NextResponse.json({ fout: "WINDSOR_API_KEY ontbreekt." }, { status: 503 });
  }

  const url = new URL(request.url);
  const deelParam = url.searchParams.get("deel");
  const deel = isDeel(deelParam) ? deelParam : null;

  // Een langere periode is met de hand op te geven om historie op te halen; standaard
  // het voortschrijdende venster van dertig dagen. Meta weigert verder terug dan
  // 37 maanden en geeft dan een expliciete foutmelding.
  const dagen = Number(url.searchParams.get("dagen")) || VENSTER_DAGEN;
  const terug = Math.max(0, Number(url.searchParams.get("terug")) || 0);

  try {
    const uitkomst = await voerSyncUit(deel, standaardVenster(dagen, terug));
    return NextResponse.json({
      status: uitkomst.ok ? "klaar" : "klaar met fouten",
      ...uitkomst,
    });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

/** Vercel Cron doet een GET; dezelfde autorisatie, dezelfde afhandeling. */
export async function GET(request: Request) {
  return POST(request);
}
