import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { blobPad, haalTabel, heeftBewaardeTabel } from "@/lib/selligent/bron";
import { datacheckVan } from "@/lib/selligent/datacheck";
import { veldenVan } from "@/lib/selligent/stand";
import { isSelligentGeconfigureerd } from "@/lib/selligent/verbinding";

export const dynamic = "force-dynamic";

/**
 * Ruim boven de gemeten tien seconden (acht voor de download, tweeënhalf voor het
 * ombouwen). De marge is er voor een trage ochtend bij Azure, niet omdat het normaal zo
 * lang duurt.
 */
export const maxDuration = 60;

/**
 * De kolommen van de Selligent-export: de filtercontrols plus de datacheck.
 *
 * Eén antwoord voor beide, omdat ze uit dezelfde opgebouwde tabel komen. Twee verzoeken
 * zouden twee standen kunnen opleveren zodra Selligent er midden tussenin een nieuwe
 * export neerzet — en dan filtert de balk op waarden die het overzicht eronder niet meer
 * kent.
 *
 * `?vers=1` bouwt de tabel opnieuw op in plaats van de bewaarde te gebruiken.
 */
export async function GET(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });

  if (!isSelligentGeconfigureerd()) {
    return NextResponse.json(
      {
        fout:
          "Selligent is niet aangesloten. Zet SELLIGENT_BLOB_URL (een SAS-URL met " +
          "leesrecht) of SELLIGENT_AZURE_CONNECTION_STRING in de omgevingsvariabelen — " +
          "zie README-selligent.md.",
      },
      { status: 503 },
    );
  }

  const vers = new URL(request.url).searchParams.get("vers") === "1";
  const stondKlaar = heeftBewaardeTabel();

  try {
    const tabel = await haalTabel(vers);
    return NextResponse.json({
      velden: veldenVan(tabel),
      datacheck: datacheckVan(tabel),
      uitCache: stondKlaar && !vers,
    });
  } catch (err) {
    // De foutmelding uit `verbinding.ts` is al in mensentaal en zegt wat er mis is met de
    // sleutel of het pad; die hoort in beeld te komen in plaats van een kale 500.
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : String(err), pad: blobPad() },
      { status: 500 },
    );
  }
}
