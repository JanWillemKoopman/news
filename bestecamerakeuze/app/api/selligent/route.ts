import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { berekenDatacheck, type Datacheck } from "@/lib/selligent/datacheck";
import {
  haalBlobKop,
  haalBlobTekst,
  isSelligentGeconfigureerd,
  STANDAARD_BLOB,
  STANDAARD_CONTAINER,
} from "@/lib/selligent/verbinding";

export const dynamic = "force-dynamic";

/**
 * Ruim boven de gemeten tien seconden (zeven voor de download, één voor het doorrekenen).
 * De marge is er voor een trage ochtend bij Azure, niet omdat het normaal zo lang duurt.
 */
export const maxDuration = 60;

/**
 * De Selligent-export, doorgerekend tot een datacheck.
 *
 * ## Waarom hier een cache in het geheugen zit en niet in een database
 *
 * De afspraak is dat deze data nergens wordt opgeslagen: geen Supabase, geen eigen kopie.
 * Maar 36 MB bij élk paginabezoek downloaden betekent tien seconden wachten per collega
 * per keer, en Azure factureert uitgaand verkeer. Daarom twee goedkope stappen:
 *
 * 1. Een `HEAD` op het blob. Die kost één verzoek en een paar honderd bytes, en geeft de
 *    ETag — Azure's eigen vingerafdruk van de inhoud.
 * 2. Is die ETag gelijk aan die van de vorige doorrekening, dan is het bestand
 *    byte-voor-byte hetzelfde en is het antwoord dat ook. Dan sturen we de bewaarde
 *    doorrekening terug, zonder download.
 *
 * Wat we bewaren is uitsluitend het geaggregeerde antwoord van een paar kilobyte: geen
 * mailadressen, geen kentekens, geen rijen. Het leeft in het geheugen van de serverless
 * instance en verdwijnt zodra die wordt opgeruimd — het is een versnelling, geen opslag.
 * De blob blijft de enige bron van waarheid, en een verse export is bij het eerstvolgende
 * bezoek binnen omdat de ETag dan verandert.
 *
 * `?vers=1` slaat de cache over, voor de ververs-knop op het tabblad.
 */
let cache: { etag: string; antwoord: Datacheck } | null = null;

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
  const pad = `${process.env.SELLIGENT_BLOB_CONTAINER || STANDAARD_CONTAINER}/${
    process.env.SELLIGENT_BLOB_PAD || STANDAARD_BLOB
  }`;

  try {
    const kop = await haalBlobKop();

    if (!vers && cache && kop.etag && cache.etag === kop.etag) {
      return NextResponse.json({ datacheck: cache.antwoord, uitCache: true });
    }

    const begin = Date.now();
    const tekst = await haalBlobTekst();
    const duurOphalen = Date.now() - begin;

    const datacheck = berekenDatacheck(
      tekst,
      { pad, bytes: kop.bytes, gewijzigdOp: kop.gewijzigdOp },
      duurOphalen,
    );

    if (kop.etag) cache = { etag: kop.etag, antwoord: datacheck };

    return NextResponse.json({ datacheck, uitCache: false });
  } catch (err) {
    // De foutmelding uit `verbinding.ts` is al in mensentaal en zegt wat er mis is met de
    // sleutel of het pad; die hoort in beeld te komen in plaats van een kale 500.
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
