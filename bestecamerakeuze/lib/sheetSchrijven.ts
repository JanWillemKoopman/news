import { google } from "googleapis";
import { SHEET_ID, SHEET_TAB } from "@/lib/sheet";
import {
  bezetteKolommen,
  celAdres,
  nieuweCampagneRij,
  rijVanCampagne,
} from "@/lib/campagneRij";

/**
 * Whitelist van velden die vanuit het dashboard terug naar de sheet geschreven mogen
 * worden, met de exacte kolomkop erbij. Leads, Online leads (kolom "Leads marketing")
 * en Orders (kolom "Order totaal") staan hier bewust niet in: die cijfers komen ergens
 * anders vandaan en horen niet handmatig overschreven te worden.
 */
const SCHRIJFBARE_VELDEN: Record<string, string> = {
  naam: "Campagne naam",
  startdatum: "Startdatum",
  einddatum: "Einddatum",
  budget: "Budget",
  uitgaven: "Uitgaven",
  doelLeads: "Doel leads",
  doelOrders: "Doel orders",
  merk: "Merk",
  model: "Model",
  leadType: "Lead type",
  ordersoort: "Ordersoort",
  klantgroepOrders: "Klantgroep orders (indien van toepassing)",
};

export function isSchrijfbaarVeld(veld: string): boolean {
  return veld in SCHRIJFBARE_VELDEN;
}

export function isSheetsSchrijvenGeconfigureerd(): boolean {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);
}

/**
 * Maakt de geplakte private key weer tot geldige PEM, ongeacht hoe hij precies is
 * opgeslagen: sommige env-UI's (waaronder Vercel) bewaren de waarde inclusief
 * omringende aanhalingstekens als je die zelf meeplakt, en de \n's uit het
 * JSON-keybestand overleven de copy-paste soms als letterlijke `\n` en soms als
 * echte regeleindes.
 */
function normaliseerPrivateKey(raw: string): string {
  let key = raw.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }
  return key.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n/g, "\n").trim();
}

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !privateKeyRaw) {
    throw new Error(
      "Schrijven naar de sheet is niet geconfigureerd (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ontbreken).",
    );
  }

  const privateKey = normaliseerPrivateKey(privateKeyRaw);
  if (!privateKey.includes("BEGIN PRIVATE KEY") || !privateKey.includes("END PRIVATE KEY")) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY bevat geen geldige PEM-sleutel. Plak de volledige `private_key` " +
        'uit het JSON-keybestand van het service account, inclusief de regels "-----BEGIN PRIVATE KEY-----" ' +
        'en "-----END PRIVATE KEY-----", zonder omringende aanhalingstekens, en herstart de deployment.',
    );
  }

  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

/**
 * Vertaalt een mislukte Google-aanroep naar een begrijpelijke foutmelding. De rauwe
 * OpenSSL-fout ("error:1E08010C:DECODER routines::unsupported") die Node geeft zodra de
 * private key niet als geldige PEM te lezen is, zegt een gebruiker niets — die wijst
 * hem hier expliciet naar de env-variabele die het probleem veroorzaakt. Hetzelfde geldt
 * voor "exceeds grid limits": dat betekent simpelweg dat het tabblad geen rij meer over
 * heeft onder de laatste campagne.
 */
function vertaalSheetFout(err: unknown): Error {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("DECODER routines") || message.includes("unsupported")) {
    return new Error(
      "De GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY-omgevingsvariabele kon niet gelezen worden als geldige sleutel. " +
        "Kopieer de `private_key` opnieuw uit het JSON-keybestand van het service account en herstart de deployment.",
    );
  }
  if (message.includes("exceeds grid limits")) {
    return new Error(
      "Het tabblad “Campagnes” heeft geen rij meer vrij onder de laatste campagne. " +
        "Voeg onderaan een paar lege rijen toe in de sheet en probeer het opnieuw.",
    );
  }
  return err instanceof Error ? err : new Error(message);
}

/**
 * Schrijft één celwaarde terug naar de "Campagnes"-sheet, gevonden op basis van de
 * kolomkop (niet een vaste kolomletter) en de campagnenaam (niet een vast rijnummer) —
 * zodat het blijft werken als iemand in de sheet zelf kolommen of rijen verschuift.
 * `valueInputOption: "USER_ENTERED"` laat Sheets de waarde net zo interpreteren als
 * wanneer je 'm zelf in de cel zou typen (inclusief het bestaande celformaat), in
 * plaats van hem altijd als platte tekst weg te schrijven.
 */
export async function schrijfVeld(campagneNaam: string, veld: string, waarde: string): Promise<void> {
  const kolomNaam = SCHRIJFBARE_VELDEN[veld];
  if (!kolomNaam) {
    throw new Error(`Veld "${veld}" mag niet vanuit het dashboard aangepast worden.`);
  }

  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  try {
    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_TAB}!A:Z`,
    });
    const rows = data.values ?? [];
    if (rows.length === 0) {
      throw new Error("Tabblad “Campagnes” lijkt leeg.");
    }

    const header = rows[0];
    const kolomIndex = header.indexOf(kolomNaam);
    const campagneKolomIndex = header.indexOf("Campagne naam");
    if (kolomIndex === -1 || campagneKolomIndex === -1) {
      throw new Error(`Kolom "${kolomNaam}" of "Campagne naam" niet gevonden in de sheet.`);
    }

    const rij = rijVanCampagne(rows, campagneKolomIndex, campagneNaam);
    if (rij === 0) {
      throw new Error(`Campagne "${campagneNaam}" niet gevonden in de sheet.`);
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_TAB}!${celAdres(kolomIndex, rij)}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[waarde]] },
    });
  } catch (err) {
    throw vertaalSheetFout(err);
  }
}

/** Alle velden die het nieuwe-campagneformulier mag invullen, min de naam (die heeft een eigen verplichte plek). */
export type NieuweCampagneVelden = {
  naam: string;
} & Partial<Record<Exclude<keyof typeof SCHRIJFBARE_VELDEN, "naam">, string>>;

/**
 * Voegt een nieuwe campagne toe als rij in de sheet, in de eerste rij onder de laatste
 * campagne — net als handmatig een rij onderaan invullen. Kolommen worden op kolomkop
 * gezocht (dezelfde aanpak als `schrijfVeld`), zodat de volgorde van kolommen in de
 * sheet er niet toe doet. Velden die niet zijn ingevuld blijven leeg; kolommen die niet
 * vanuit het dashboard te schrijven zijn (Leads, Order totaal, Status, …) blijven ook
 * leeg totdat iemand of iets anders ze vult.
 *
 * Bewust géén `spreadsheets.values.append`: dat schrijft niet op het meegegeven bereik,
 * maar zoekt binnen dat bereik zélf naar een "tabel" en schrijft dan onder die tabel,
 * beginnend bij de eerste kolom dáárvan. In deze sheet zat die gok ernaast — de eerste
 * paar kolommen staan bij veel campagnes leeg en onder de campagnes lopen de formules in
 * "Leads"/"Leads marketing" nog honderden rijen door — waardoor de rij vijf kolommen te
 * ver naar rechts belandde: de campagnenaam kwam in kolom F terecht in plaats van in
 * kolom A. Daarom rekenen we rij én kolom hier zelf uit en schrijven we elke waarde naar
 * een expliciet celadres, met `values.batchUpdate` in één keer.
 *
 * Omdat we in een bestaande (lege) rij schrijven in plaats van er een in te voegen,
 * blijven de doorgetrokken formules in die rij staan: de nieuwe campagne telt zijn leads
 * meteen mee, net als de rijen erboven.
 */
export async function voegCampagneToe(velden: NieuweCampagneVelden): Promise<void> {
  const naam = velden.naam.trim();
  if (!naam) {
    throw new Error("Campagnenaam is verplicht.");
  }

  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  try {
    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_TAB}!A:Z`,
    });
    const rows = data.values ?? [];
    if (rows.length === 0) {
      throw new Error("Tabblad “Campagnes” lijkt leeg.");
    }

    const header = rows[0];
    const campagneKolomIndex = header.indexOf("Campagne naam");
    if (campagneKolomIndex === -1) {
      throw new Error('Kolom "Campagne naam" niet gevonden in de sheet.');
    }

    if (rijVanCampagne(rows, campagneKolomIndex, naam) !== 0) {
      throw new Error(`Er bestaat al een campagne met de naam "${naam}".`);
    }

    // Kolomindex per schrijfbaar veld, op kolomkop gezocht. Een kop die niet (meer) in de
    // sheet staat, slaan we over in plaats van blind op een kolomnummer te gokken.
    const kolomIndexen = new Map<string, number>();
    for (const [veld, kolomNaam] of Object.entries(SCHRIJFBARE_VELDEN)) {
      const kolomIndex = veld === "naam" ? campagneKolomIndex : header.indexOf(kolomNaam);
      if (kolomIndex !== -1) kolomIndexen.set(veld, kolomIndex);
    }

    const rij = nieuweCampagneRij(rows, campagneKolomIndex);

    // De rij onder de laatste campagne hoort leeg te zijn. Staat er toch iets in een van
    // "onze" kolommen, dan is er iets bijzonders aan de hand in de sheet (een restant van
    // een eerdere fout, een losse aantekening) — dat overschrijven we niet stilletjes.
    const bezet = bezetteKolommen(rows, rij, [...kolomIndexen.values()]);
    if (bezet.length > 0) {
      throw new Error(
        `Rij ${rij} van het tabblad “Campagnes” is niet leeg (kolom ${bezet.join(", ")}). ` +
          "Maak die rij eerst leeg of verwijder hem, en probeer het opnieuw.",
      );
    }

    const teSchrijven: { range: string; values: string[][] }[] = [];
    for (const [veld, kolomIndex] of kolomIndexen) {
      const waarde = veld === "naam" ? naam : velden[veld as keyof NieuweCampagneVelden];
      if (!waarde) continue;
      teSchrijven.push({
        range: `${SHEET_TAB}!${celAdres(kolomIndex, rij)}`,
        values: [[waarde]],
      });
    }

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { valueInputOption: "USER_ENTERED", data: teSchrijven },
    });
  } catch (err) {
    throw vertaalSheetFout(err);
  }
}
