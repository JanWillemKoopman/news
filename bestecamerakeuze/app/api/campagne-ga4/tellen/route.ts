import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { isKanalenGeconfigureerd, telGa4Conversies } from "@/lib/kanalen/bron";
import { controleerRegels, telPeriode, type TelVraag } from "@/lib/ga4Koppeling";

export const dynamic = "force-dynamic";

const MAX_CAMPAGNES = 300;

/** Gisteren in Nederlandse tijd: de sync draait 's nachts, dus vandaag staat er nog niet in. */
function gisteren(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(d);
}

const DATUM = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Telt de GA-conversies voor een lijst campagnes, elk met zijn eigen looptijd en regels.
 *
 * De regels komen mee in het verzoek in plaats van uit de database te worden gelezen.
 * Daardoor kan dezelfde route ook een **concept** tellen: de zijbalk laat zien wat een
 * regel oplevert vóórdat hij wordt opgeslagen. Er wordt niets geschreven, en de regels
 * gaan door dezelfde controle als bij het opslaan — de query bevat nooit iets anders dan
 * vaste kolommen en parameters.
 */
export async function POST(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Log eerst in." }, { status: 401 });

  if (!isKanalenGeconfigureerd()) {
    return NextResponse.json(
      { fout: "DATAQUERY_DATABASE_URL ontbreekt — de GA4-data is niet aangesloten." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (!Array.isArray(body.campagnes)) {
    return NextResponse.json({ fout: "Geef een lijst campagnes mee." }, { status: 400 });
  }
  if (body.campagnes.length > MAX_CAMPAGNES) {
    return NextResponse.json({ fout: `Maximaal ${MAX_CAMPAGNES} campagnes per keer.` }, { status: 400 });
  }

  const tot = gisteren();
  const vragen: TelVraag[] = [];
  for (const ruw of body.campagnes as unknown[]) {
    if (typeof ruw !== "object" || ruw === null) continue;
    const c = ruw as Record<string, unknown>;
    const naam = typeof c.naam === "string" ? c.naam.trim() : "";
    const start = typeof c.startdatum === "string" && DATUM.test(c.startdatum) ? c.startdatum : null;
    const eind = typeof c.einddatum === "string" && DATUM.test(c.einddatum) ? c.einddatum : null;
    const controle = controleerRegels(c.regels);
    if (!naam || !controle.ok) continue;
    const periode = telPeriode(start, eind, tot);
    if (!periode) continue;
    vragen.push({ campagneNaam: naam, ...periode, regels: controle.waarde });
  }

  try {
    const tellingen = await telGa4Conversies(vragen);
    // Een campagne met regels maar zonder treffers is nul, niet "onbekend".
    for (const v of vragen) tellingen[v.campagneNaam] ??= { totaal: 0, perEvent: [] };
    return NextResponse.json({ tellingen, tot });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : "Kon de GA-conversies niet tellen." },
      { status: 500 },
    );
  }
}
