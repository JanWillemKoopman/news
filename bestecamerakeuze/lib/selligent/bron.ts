/**
 * De opgebouwde tabel bewaren tussen verzoeken — zonder hem op te slaan.
 *
 * ## Waarom dit nodig is
 *
 * De afspraak is dat deze data nergens wordt opgeslagen: geen Supabase, geen eigen kopie.
 * Maar een dashboard waarin elke klik op een filter 36 MB downloadt en acht seconden
 * wacht, is geen dashboard. Daarom blijft de omgebouwde tabel in het geheugen van de
 * serverless instance staan, en kost een volgend verzoek alleen nog het filteren.
 *
 * Twee stappen houden dat eerlijk:
 *
 * 1. **Een `HEAD` op het blob, elk verzoek.** Die kost één verzoek en een paar honderd
 *    bytes, en geeft de ETag — Azure's eigen vingerafdruk van de inhoud. Verandert die,
 *    dan wordt de tabel opnieuw opgebouwd. Een verse export is dus bij het eerstvolgende
 *    verzoek binnen, zonder dat iemand iets hoeft te verversen.
 * 2. **Wat bewaard wordt is geen bestand.** Het is de woordenboek-gecodeerde tabel in het
 *    werkgeheugen van één instance; hij verdwijnt als die wordt opgeruimd, overleeft geen
 *    deploy, en is van buiten niet te lezen. Het is een versnelling, geen opslag, en de
 *    blob blijft de enige bron van waarheid.
 *
 * ## Waarom er een slot op het bouwen zit
 *
 * Twee gelijktijdige verzoeken op een koude instance zouden allebei 36 MB gaan
 * downloaden en allebei een tabel opbouwen: dubbel verkeer, dubbel geheugen, en de kans
 * dat de functie op zijn geheugenlimiet stuit. `bouwBezig` laat de tweede daarom
 * meeliften op het resultaat van de eerste.
 */

import { bouwTabel, type Tabel } from "./tabel";
import {
  haalBlobKop,
  haalBlobTekst,
  STANDAARD_BLOB,
  STANDAARD_CONTAINER,
} from "./verbinding";

let bewaard: Tabel | null = null;
let bouwBezig: Promise<Tabel> | null = null;

/** Het pad zoals het in de omgevingsvariabelen staat; alleen voor de weergave. */
export function blobPad(): string {
  return `${process.env.SELLIGENT_BLOB_CONTAINER || STANDAARD_CONTAINER}/${
    process.env.SELLIGENT_BLOB_PAD || STANDAARD_BLOB
  }`;
}

async function bouw(): Promise<Tabel> {
  const kop = await haalBlobKop();
  const begin = Date.now();
  const tekst = await haalBlobTekst();
  const tabel = bouwTabel(
    tekst,
    { pad: blobPad(), bytes: kop.bytes, gewijzigdOp: kop.gewijzigdOp, etag: kop.etag },
    Date.now() - begin,
  );
  bewaard = tabel;
  return tabel;
}

/**
 * De tabel, uit het geheugen als het bestand niet is veranderd.
 *
 * `vers` slaat de ETag-vergelijking over en bouwt altijd opnieuw — dat is wat de
 * ververs-knop op het tabblad doet.
 */
export async function haalTabel(vers = false): Promise<Tabel> {
  if (bouwBezig) return bouwBezig;

  if (!vers && bewaard?.etag) {
    try {
      const kop = await haalBlobKop();
      if (kop.etag === bewaard.etag) return bewaard;
    } catch {
      // Een HEAD die faalt is geen reden om een werkende tabel weg te gooien: dan toont
      // de pagina liever de vorige stand dan een foutmelding. Een echte fout komt zo
      // tevoorschijn bij het opnieuw opbouwen hieronder.
      if (bewaard) return bewaard;
    }
  }

  bouwBezig = bouw().finally(() => {
    bouwBezig = null;
  });
  return bouwBezig;
}

/** Of er een tabel in het geheugen staat — de UI zegt dan dat het antwoord uit de cache komt. */
export function heeftBewaardeTabel(): boolean {
  return bewaard !== null;
}
