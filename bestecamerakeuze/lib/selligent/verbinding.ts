/**
 * De rechtstreekse verbinding met de Azure Blob Storage waar Selligent zijn export zet.
 *
 * ## Waarom hier geen Supabase aan te pas komt
 *
 * De rest van het dataloket haalt zijn cijfers uit Postgres, gevuld door een nachtelijke
 * sync. Voor deze export is dat bewust niet gedaan: het is één bestand dat Azure zelf al
 * elke ochtend verst neerzet, en een kopie in Supabase zou een tweede waarheid opleveren
 * die altijd net iets ouder is dan het origineel. Bovendien staan er persoonsgegevens in
 * (mailadressen, kentekens) — die horen niet in een tweede database te belanden als het
 * dashboard alleen aantallen nodig heeft. Het blob is dus de enige bron, en wat het
 * dashboard laat zien is een optelling die nooit op schijf komt.
 *
 * ## Waarom hier geen Azure-SDK staat
 *
 * `@azure/storage-blob` doet precies één ding dat wij nodig hebben: een verzoek signeren
 * met de accountsleutel. Dat is de HMAC hieronder, een kleine twintig regels. De SDK
 * ernaast zetten kost een paar megabyte aan serverless bundle voor functionaliteit die
 * we niet gebruiken (uploads, leases, container-beheer, retries met telemetrie).
 *
 * ## Twee manieren om je te legitimeren
 *
 * `SELLIGENT_BLOB_URL` — een volledige URL met SAS-token erachter. Aan te raden: alleen
 *   leesrecht, alleen op dit pad, met een einddatum. Er staat dan geen accountsleutel in
 *   de omgevingsvariabelen van Vercel.
 * `SELLIGENT_AZURE_CONNECTION_STRING` — de connection string zoals Azure hem onder
 *   "Access keys" geeft, inclusief `AccountKey`. Werkt net zo goed, maar die sleutel geeft
 *   lees- én schrijfrecht op het hele storage-account; zie README-selligent.md.
 *
 * Staat de SAS-URL er, dan wint die: dat is de veiligere van de twee.
 */

import crypto from "node:crypto";
import { isSelligentGeconfigureerd } from "@/lib/config";

export { isSelligentGeconfigureerd };

/** Het bestand dat het dashboard leest, binnen de container. */
export const STANDAARD_CONTAINER = "output";
export const STANDAARD_BLOB = "autoline/users_customers_dashboard.csv";

/** De API-versie waarmee we ondertekenen — hoort bij het `x-ms-version`-formaat hieronder. */
const AZURE_VERSIE = "2021-08-06";

export interface BlobKop {
  /** Grootte in bytes, zoals Azure hem meldt. */
  bytes: number;
  /** Wanneer Selligent het bestand voor het laatst heeft neergezet. */
  gewijzigdOp: string | null;
  /**
   * De ETag van het blob.
   *
   * Hiermee weet de cache of een nieuwe download zin heeft: dezelfde ETag betekent
   * byte-voor-byte hetzelfde bestand, dus hetzelfde antwoord.
   */
  etag: string | null;
}

interface Doelwit {
  url: string;
  /** Kopteksten die het verzoek moet meesturen; leeg bij een SAS-URL. */
  headers: Record<string, string>;
  /** Het storage-account en het pad, voor in een foutmelding. */
  account: string;
  pad: string;
}

export class SelligentNietGeconfigureerd extends Error {
  constructor() {
    super(
      "Selligent is niet aangesloten: zet SELLIGENT_BLOB_URL (SAS-URL) of " +
        "SELLIGENT_AZURE_CONNECTION_STRING in de omgevingsvariabelen.",
    );
    this.name = "SelligentNietGeconfigureerd";
  }
}

/**
 * De onderdelen uit een Azure-connection string.
 *
 * Exporteerbaar omdat het de enige stap is waar een typefout in de variabele zich als
 * een onbegrijpelijke 403 zou uiten; de tests dekken hem daarom apart.
 */
export function leesConnectionString(waarde: string): {
  account: string;
  sleutel: string;
  suffix: string;
  protocol: string;
} {
  const delen = new Map<string, string>();
  for (const stuk of waarde.split(";")) {
    const scheiding = stuk.indexOf("=");
    if (scheiding <= 0) continue;
    // Niet op "=" splitsen maar op de eerste: een base64-sleutel eindigt zelf op "==".
    delen.set(stuk.slice(0, scheiding).trim(), stuk.slice(scheiding + 1).trim());
  }
  const account = delen.get("AccountName") ?? "";
  const sleutel = delen.get("AccountKey") ?? "";
  if (!account || !sleutel) {
    throw new Error(
      "De connection string mist AccountName of AccountKey — kopieer hem onverkort uit " +
        "Azure onder Storage account → Access keys.",
    );
  }
  return {
    account,
    sleutel,
    suffix: delen.get("EndpointSuffix") ?? "core.windows.net",
    protocol: delen.get("DefaultEndpointsProtocol") ?? "https",
  };
}

/**
 * De tekst die Azure verwacht als onderwerp van de HMAC-signatuur.
 *
 * De volgorde en het aantal lege regels liggen vast in de documentatie van "Shared Key
 * voor Blob": verb, elf kopteksten die wij allemaal leeg laten, dan de `x-ms-`-regels
 * alfabetisch en tot slot het pad. Eén regel te veel of te weinig levert een 403 op met
 * als enige uitleg "signature did not match" — vandaar de test die deze tekst letterlijk
 * vastlegt.
 */
export function tekstOmTeOndertekenen(
  verb: string,
  account: string,
  pad: string,
  headers: Record<string, string>,
): string {
  const canoniekeHeaders = Object.keys(headers)
    .filter((k) => k.toLowerCase().startsWith("x-ms-"))
    .map((k) => k.toLowerCase())
    .sort()
    .map((k) => {
      const origineel = Object.keys(headers).find((h) => h.toLowerCase() === k)!;
      return `${k}:${headers[origineel].trim()}`;
    })
    .join("\n");

  const [padZonderQuery, query] = pad.split("?");
  const canoniekeQuery = query
    ? "\n" +
      query
        .split("&")
        .map((p) => {
          const scheiding = p.indexOf("=");
          return [p.slice(0, scheiding), decodeURIComponent(p.slice(scheiding + 1))];
        })
        .sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .map(([k, v]) => `${k.toLowerCase()}:${v}`)
        .join("\n")
    : "";

  return [
    verb,
    "", // Content-Encoding
    "", // Content-Language
    "", // Content-Length
    "", // Content-MD5
    "", // Content-Type
    "", // Date — wij gebruiken x-ms-date
    "", // If-Modified-Since
    "", // If-Match
    "", // If-None-Match
    "", // If-Unmodified-Since
    "", // Range — wij gebruiken x-ms-range
    `${canoniekeHeaders}\n/${account}${padZonderQuery}${canoniekeQuery}`,
  ].join("\n");
}

/** Waar we het verzoek naartoe sturen, en met welke kopteksten. */
function doelwit(verb: "GET" | "HEAD"): Doelwit {
  const sas = process.env.SELLIGENT_BLOB_URL;
  if (sas) {
    // Bij een SAS-URL staat het pad al in de URL; eruit halen zodat een foutmelding ook
    // dan zegt waar hij heeft gekeken — zonder het token zelf te tonen.
    let account = "(uit SELLIGENT_BLOB_URL)";
    let pad = sas;
    try {
      const url = new URL(sas);
      account = url.hostname.split(".")[0];
      pad = url.pathname;
    } catch {
      throw new Error(
        "SELLIGENT_BLOB_URL is geen geldige URL. Hij hoort te beginnen met https:// en " +
          "het SAS-token als querystring te hebben.",
      );
    }
    return { url: sas, headers: {}, account, pad };
  }

  const verbinding = process.env.SELLIGENT_AZURE_CONNECTION_STRING;
  if (!verbinding) throw new SelligentNietGeconfigureerd();

  const { account, sleutel, suffix, protocol } = leesConnectionString(verbinding);
  const container = process.env.SELLIGENT_BLOB_CONTAINER || STANDAARD_CONTAINER;
  const blob = process.env.SELLIGENT_BLOB_PAD || STANDAARD_BLOB;
  const pad = `/${container}/${blob}`;

  const headers: Record<string, string> = {
    "x-ms-date": new Date().toUTCString(),
    "x-ms-version": AZURE_VERSIE,
  };
  const signatuur = crypto
    .createHmac("sha256", Buffer.from(sleutel, "base64"))
    .update(tekstOmTeOndertekenen(verb, account, pad, headers), "utf8")
    .digest("base64");

  return {
    url: `${protocol}://${account}.blob.${suffix}${pad}`,
    headers: { ...headers, Authorization: `SharedKey ${account}:${signatuur}` },
    account,
    pad,
  };
}

/**
 * Een leesbare fout in plaats van het XML-lichaam dat Azure teruggeeft.
 *
 * **De foutcode komt uit de koptekst en niet uit het lichaam**, en dat is geen detail: op
 * een `HEAD` stuurt Azure per definitie geen lichaam mee, dus wie alleen daarnaar kijkt
 * houdt van een mislukte `HEAD` niets over dan "HTTP 404" — en dat zegt precies niet wat
 * je moet weten, namelijk of de container ontbreekt, het bestand ontbreekt, of het pad
 * nergens op slaat. `x-ms-error-code` staat er altijd.
 *
 * Het storage-account en het pad staan in het bericht, omdat dat bij een 404 de twee
 * dingen zijn die fout kunnen staan. Ze zijn niet geheim: de sleutel staat er niet bij.
 */
async function fout(res: Response, account: string, pad: string): Promise<Error> {
  const uitKop = res.headers.get("x-ms-error-code");
  const lichaam = uitKop ? "" : await res.text().catch(() => "");
  const code = uitKop || lichaam.match(/<Code>([^<]+)<\/Code>/)?.[1] || "";

  const uitleg: Record<string, string> = {
    AuthenticationFailed:
      "Azure wees de sleutel af. Controleer SELLIGENT_AZURE_CONNECTION_STRING; is de " +
      "accountsleutel geroteerd, dan staat hier de oude.",
    AuthorizationPermissionMismatch: "De sleutel of het SAS-token mag dit bestand niet lezen.",
    AuthorizationFailure: "Het SAS-token is verlopen of geldt niet voor dit pad.",
    BlobNotFound:
      "Het storage-account en de container kloppen, maar op dit pad staat geen bestand. " +
      "Controleer de bestandsnaam (hoofdlettergevoelig) of zet SELLIGENT_BLOB_PAD.",
    ContainerNotFound:
      "Dit storage-account heeft geen container met deze naam. Meestal betekent dat dat " +
      "de connection string van een ánder storage-account is dan het account waar de " +
      "export op staat. Controleer AccountName, of zet SELLIGENT_BLOB_CONTAINER.",
    ResourceNotFound: "Azure vindt op dit pad niets onder dit storage-account.",
    InvalidUri:
      "Azure kan dit pad niet lezen. Staat er een schuine streep te veel of te weinig in " +
      "SELLIGENT_BLOB_CONTAINER of SELLIGENT_BLOB_PAD?",
    AccountIsDisabled: "Dit storage-account staat uit in Azure.",
    InvalidAuthenticationInfo:
      "Azure begreep de legitimatie niet. Meestal is de connection string onvolledig " +
      "geplakt — hij hoort te eindigen op EndpointSuffix=core.windows.net.",
  };

  const kern =
    (code && uitleg[code]) ||
    (res.status === 404
      ? "Azure vond hier niets. Meestal wijst het storage-account of de container ergens " +
        "anders heen dan waar de export staat."
      : "") ||
    code ||
    `HTTP ${res.status}`;

  return new Error(
    `Azure Blob Storage: ${kern} (gevraagd: ${account} → ${pad}${code ? `, ${code}` : ""})`,
  );
}

/**
 * De eigenschappen van het bestand ophalen, zonder het te downloaden.
 *
 * Dit is wat de cache goedkoop houdt: een HEAD kost één verzoek en een paar honderd
 * bytes, en vertelt via de ETag of de 36 MB eronder nog hetzelfde zijn.
 */
export async function haalBlobKop(signaal?: AbortSignal): Promise<BlobKop> {
  const { url, headers, account, pad } = doelwit("HEAD");
  const res = await fetch(url, { method: "HEAD", headers, cache: "no-store", signal: signaal });
  if (!res.ok) throw await fout(res, account, pad);
  return {
    bytes: Number(res.headers.get("content-length") ?? 0),
    gewijzigdOp: res.headers.get("last-modified")
      ? new Date(res.headers.get("last-modified")!).toISOString()
      : null,
    etag: res.headers.get("etag"),
  };
}

/**
 * Het bestand ophalen als tekst.
 *
 * Teruggegeven als één string en niet als stream: 36 MB past ruim in het geheugen van een
 * serverless functie, en de aggregatie erna leest hem één keer door. Een echte stream zou
 * pas gaan tellen als het bestand richting een paar honderd megabyte groeit — dan is dit
 * de plek om het te veranderen.
 */
export async function haalBlobTekst(signaal?: AbortSignal): Promise<string> {
  const { url, headers, account, pad } = doelwit("GET");
  const res = await fetch(url, { headers, cache: "no-store", signal: signaal });
  if (!res.ok) throw await fout(res, account, pad);
  const tekst = await res.text();
  // Azure levert de export met een UTF-8 BOM; die hoort niet in de eerste kolomnaam.
  return tekst.charCodeAt(0) === 0xfeff ? tekst.slice(1) : tekst;
}
