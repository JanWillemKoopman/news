import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { isKanalenGeconfigureerd } from "@/lib/kanalen/bron";
import { datumInNederland } from "@/lib/kpi2027/rekenen";
import { kanCrmStandVastleggen, leesCrmStanden, metSchrijfverbinding, schrijfCrmStand } from "@/lib/kpi2027crm/bron";
import { CONTACTEN_SLEUTEL } from "@/lib/kpi2027crm/definities";
import { crmOverzicht, metHuidigeStand, telCrm, type CrmReeksen, type Kpi2027CrmAntwoord } from "@/lib/kpi2027crm/rekenen";
import { haalTabel } from "@/lib/selligent/bron";
import { isSelligentGeconfigureerd } from "@/lib/selligent/verbinding";

export const dynamic = "force-dynamic";

/** Ruim boven de gemeten tien seconden voor een koude tabel (zie `app/api/selligent/route.ts`). */
export const maxDuration = 60;

function bericht(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Het tabblad KPI's 2027 CRM: contacten, auto's en opt-ins uit de Selligent-export op Azure —
 * hetzelfde bestand en dezelfde tabel in het geheugen als Tools → Selligent database
 * (`lib/selligent/bron.ts`). `?vers=1` bouwt de tabel opnieuw op.
 *
 * Elk verzoek:
 *  1. telt de KPI's in de export van nu (`telCrm`);
 *  2. legt die stand vast in `kpi_2027_crm_standen` (alleen aantallen) — een vangnet naast de
 *     wekelijkse taak (`/api/kpi-2027-crm/bijwerken`, vrijdag 12:00 en 31 december), zodat er
 *     ook tussen twee vrijdagen een stand bewaard wordt op elke dag dat iemand het tabblad opent;
 *  3. leest alle bewaarde dagstanden en rekent daarmee (`crmOverzicht`).
 * Lukt 2 of 3 niet, dan rekent het tabblad met alleen de stand van nu en zegt het dat bovenaan.
 *
 * Alleen aantallen gaan over de lijn; geen enkel e-mailadres of kenteken verlaat de server.
 */
export async function GET(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  if (!isSelligentGeconfigureerd()) {
    return NextResponse.json(
      {
        fout:
          "Selligent is niet aangesloten. Zet SELLIGENT_BLOB_URL of SELLIGENT_AZURE_CONNECTION_STRING in de " +
          "omgevingsvariabelen — zie README-selligent.md.",
      },
      { status: 503 },
    );
  }

  try {
    const vers = new URL(request.url).searchParams.get("vers") === "1";
    const tabel = await haalTabel(vers);
    const telling = telCrm(tabel);
    // De dag van de meting is de dag waarop Selligent de export neerzette.
    const standDatum = datumInNederland(tabel.gewijzigdOp ? new Date(tabel.gewijzigdOp) : new Date());
    const vandaag = datumInNederland(new Date());

    let schrijfFout: string | null = null;
    if (!telling.mailKolom) {
      // Niets te bewaren.
    } else if (!kanCrmStandVastleggen()) {
      schrijfFout = "SYNC_DATABASE_URL ontbreekt";
    } else {
      schrijfFout = await metSchrijfverbinding((client) =>
        schrijfCrmStand(client, standDatum, telling.tellingen, tabel.gewijzigdOp),
      )
        .then(() => null)
        .catch(bericht);
    }

    let historie: CrmReeksen = {};
    let leesFout: string | null = null;
    if (!isKanalenGeconfigureerd()) leesFout = "DATAQUERY_DATABASE_URL ontbreekt";
    else historie = await leesCrmStanden().catch((err) => ((leesFout = bericht(err)), {}));

    const contacten = Object.keys(metHuidigeStand(historie, telling, standDatum)[CONTACTEN_SLEUTEL] ?? {}).sort();
    const antwoord: Kpi2027CrmAntwoord = {
      standDatum,
      gewijzigdOp: tabel.gewijzigdOp,
      gebouwdOp: tabel.gebouwdOp,
      mailKolom: telling.mailKolom,
      rijen: telling.rijen,
      rijenZonderMail: telling.rijenZonderMail,
      ontbrekend: telling.ontbrekend,
      kentekenKolom: telling.kentekenKolom,
      // Lukte het lezen niet, dan is er niets over de bewaarde reeks te zeggen.
      historie: leesFout
        ? { vanaf: null, dagen: 0, leesFout, schrijfFout }
        : { vanaf: contacten[0] ?? null, dagen: contacten.length, leesFout, schrijfFout },
      groepen: crmOverzicht(telling, standDatum, { historie, vandaag }),
      fout: telling.mailKolom ? undefined : "De export heeft geen kolom MAIL (of EMAIL): er valt niets te tellen.",
    };
    return NextResponse.json(antwoord, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    return NextResponse.json({ fout: bericht(err) }, { status: 500 });
  }
}
