import { NextResponse, after } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { isWindsorGeconfigureerd } from "@/lib/windsor/api";
import { DELEN, isDeel, type Deel } from "@/lib/windsor/uitvoeren";
import { kanDoorschakelen, schakelDoor, zetOpdrachtKlaar } from "@/lib/windsor/keten";
import { haalOpdrachtStanden, isKanalenGeconfigureerd } from "@/lib/kanalen/bron";
import { isVastgelopen } from "@/lib/windsor/opdrachten";
import { standaardVenster } from "@/lib/windsor/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * "Data ophalen" vanuit het dashboard zelf.
 *
 * Dezelfde sync als de nachtelijke cron (`/api/windsor-sync`), maar gestart door een
 * ingelogde collega in plaats van door Vercel. Bestaat omdat de cron-route zich
 * beschermt met `CRON_SECRET`, en dat geheim hoort niet in een browser thuis: wie alleen
 * in de browser werkt zou anders een terminal nodig hebben om de eerste vulling te
 * starten of om na een mislukte nacht bij te trekken.
 *
 * Toegang is simpelweg "ingelogd", net als bij de aantekeningen en het kostentabblad —
 * dit is een leesactie bij Windsor en een schrijfactie naar de eigen tabellen, geen
 * onomkeerbare ingreep. Twee keer draaien is onschadelijk: alles gaat via een upsert op
 * dezelfde sleutel, dus een dubbele run overschrijft in plaats van te verdubbelen.
 *
 * ## Deze route doet het werk niet zelf
 *
 * Dat deed hij wel, en daar ging het mis. Eén aanroep haalde één stuk van dertig dagen op
 * en gaf terug wat er nog te doen was; de browser riep hem daarmee opnieuw aan tot het
 * restant leeg was. Die lus leefde dus in het tabblad, en dat betekende twee dingen die
 * niemand wist: wegklikken brak de import af, en een wegvallende verbinding ook — de
 * component stopte dan met een waarschuwing, want zonder antwoord wist hij niet meer wat
 * er nog te doen was.
 *
 * Op 14 september 2026 leverde dat een jaargrafiek op met een gat van acht maanden erin.
 * De opdracht staat sindsdien in `dataloket.sync_opdrachten` en de server schakelt
 * zichzelf door (`lib/windsor/keten.ts`). Deze POST zet de opdracht klaar, zet de eerste
 * schakel in gang en is meteen klaar; de GET ernaast vertelt hoe ver het staat. Het
 * venster mag daarna dicht.
 */

/** Een datum uit de body: alleen YYYY-MM-DD telt, zodat er nooit tekst in de query belandt. */
function isDatum(waarde: unknown): waarde is string {
  return typeof waarde === "string" && /^\d{4}-\d{2}-\d{2}$/.test(waarde);
}

/**
 * Welke onderdelen deze ronde meedoen.
 *
 * Komt er niets mee, dan zijn het ze alle vier — zo blijft een oude aanroep (en de
 * nachtelijke ketting) doen wat hij altijd deed. Wat er wél meekomt wordt gefilterd op
 * `isDeel` en daarna op de vaste volgorde van `DELEN` gezet: `organisch` koppelt aan het
 * eind zijn posts aan de advertenties en hoort dus ná `advertenties` te draaien, ook als
 * de browser ze in een andere volgorde aanvinkt.
 */
function gevraagdeDelen(waarde: unknown): readonly Deel[] {
  if (!Array.isArray(waarde)) return DELEN;
  const gekozen = new Set(waarde.filter(isDeel));
  if (gekozen.size === 0) return DELEN;
  return DELEN.filter((d) => gekozen.has(d));
}

export async function GET() {
  const gebruiker = await getGebruiker();
  if (!gebruiker) {
    return NextResponse.json({ fout: "Log eerst in." }, { status: 401 });
  }
  if (!isKanalenGeconfigureerd()) {
    return NextResponse.json({ fout: "Geen databaseverbinding." }, { status: 503 });
  }

  try {
    // `vastgelopen` hoort hier berekend te worden en niet in de browser: de grens waar
    // het om gaat (MAX_SCHAKELS) is een serverkeuze, en een pagina die hem zelf naschat
    // loopt er vroeg of laat naast.
    const opdrachten = await haalOpdrachtStanden(DELEN);
    return NextResponse.json({
      opdrachten: opdrachten.map((o) => ({ ...o, vastgelopen: isVastgelopen(o) })),
    });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) {
    return NextResponse.json({ fout: "Log eerst in." }, { status: 401 });
  }
  if (!isWindsorGeconfigureerd()) {
    return NextResponse.json(
      { fout: "WINDSOR_API_KEY ontbreekt — de koppeling met Windsor.ai is nog niet ingesteld." },
      { status: 503 },
    );
  }
  if (!process.env.SYNC_DATABASE_URL) {
    return NextResponse.json(
      { fout: "SYNC_DATABASE_URL ontbreekt — er is geen schrijvende databaseverbinding." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  // Begrensd tot ruim binnen Meta's venster van 37 maanden; daarbuiten weigert het
  // platform de hele opvraging in plaats van alleen het oudste stuk.
  const dagen = Math.min(Math.max(Number(body.dagen) || 30, 1), 1000);
  const periode =
    isDatum(body.van) && isDatum(body.tot) ? { van: body.van, tot: body.tot } : standaardVenster(dagen);

  // Wat er níet is aangevinkt gaat op inactief en blijft liggen; zie `zetOpdrachten`.
  // Anders zou de ketting alsnog een openstaande opdracht van een vorige ronde oppakken
  // en een kwartier besteden aan maanden die er al staan.
  const delen = gevraagdeDelen(body.delen);

  try {
    await zetOpdrachtKlaar(delen, periode);
    after(() => schakelDoor(new URL(request.url).origin));

    return NextResponse.json({
      gestart: true,
      periode,
      delen,
      /**
       * Zonder `CRON_SECRET` kan de server zichzelf niet aanroepen. De opdracht staat er
       * dan wel, maar hij komt pas vannacht aan de beurt via de cron. Dat hoort in beeld
       * te staan en niet stilletjes te gebeuren — precies de fout die deze hele
       * verbouwing moest wegnemen.
       */
      achtergrond: kanDoorschakelen(),
    });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
