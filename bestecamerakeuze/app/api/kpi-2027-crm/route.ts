import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { datumInNederland } from "@/lib/kpi2027/rekenen";
import { crmOverzicht, telCrm, type Kpi2027CrmAntwoord } from "@/lib/kpi2027crm/rekenen";
import { haalTabel } from "@/lib/selligent/bron";
import { isSelligentGeconfigureerd } from "@/lib/selligent/verbinding";

export const dynamic = "force-dynamic";

/** Ruim boven de gemeten tien seconden voor een koude tabel (zie `app/api/selligent/route.ts`). */
export const maxDuration = 60;

/**
 * Het tabblad KPI's 2027 CRM: contacten en opt-ins in unieke e-mailadressen, uit de
 * Selligent-export op Azure — hetzelfde bestand en dezelfde tabel in het geheugen als Tools →
 * Selligent database (`lib/selligent/bron.ts`). Er wordt niets opgeslagen: elk verzoek leest
 * de stand van de laatste export. `?vers=1` bouwt de tabel opnieuw op.
 *
 * Alleen aantallen gaan over de lijn; geen enkel e-mailadres verlaat de server.
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
    const antwoord: Kpi2027CrmAntwoord = {
      standDatum,
      gewijzigdOp: tabel.gewijzigdOp,
      gebouwdOp: tabel.gebouwdOp,
      mailKolom: telling.mailKolom,
      rijen: telling.rijen,
      rijenZonderMail: telling.rijenZonderMail,
      ontbrekend: telling.ontbrekend,
      kentekenKolom: telling.kentekenKolom,
      groepen: crmOverzicht(telling, standDatum),
      fout: telling.mailKolom ? undefined : "De export heeft geen kolom MAIL (of EMAIL): er valt niets te tellen.",
    };
    return NextResponse.json(antwoord, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    return NextResponse.json({ fout: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
