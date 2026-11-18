import type { Bron, GeparsteRij } from "@/lib/sync/bronnen";

/**
 * Wegschrijven in blokken, voor de sync sheets → Postgres (`app/api/sync/route.ts`).
 *
 * ## Waarom dit bestaat
 *
 * De sync schreef elke sheetregel met een eigen `insert` weg. Bij een paar honderd regels
 * was dat prima, maar "Data leads" groeide naar ±110.000 regels (±97.000 leads plus lege
 * opvulregels). Eén rondgang naar de database per regel past dan niet meer binnen de
 * vijf minuten die Vercel een functie geeft: de functie werd afgebroken, de transactie
 * teruggedraaid, en de tabel bleef van half oktober tot half november op 99 regels staan
 * terwijl de sync elke nacht "startte". Hier gaan duizenden regels in één query.
 *
 * ## Waarom json_populate_recordset
 *
 * Eén JSON-parameter per blok, en Postgres zet elke waarde om naar het type van de
 * doelkolom (`regelnummer` is een bigint, de rest tekst). Met `unnest($1::text[], …)`
 * moest elke kolom een expliciete cast krijgen, en met losse plaatshouders loop je bij
 * dertien kolommen al snel tegen de grens van 65.535 parameters per query aan.
 */

/** Zoveel regels per query: ruim onder de parametergrens en een paar MB per blok. */
export const BLOKGROOTTE = 5000;

/** Zoveel afgekeurde regels worden per run met hun ruwe inhoud bewaard; de rest alleen geteld. */
export const MAX_AFWIJKINGEN_BEWAARD = 500;

/** Splitst een lijst in opeenvolgende stukken van hoogstens `grootte`. */
export function inBlokken<T>(lijst: readonly T[], grootte: number = BLOKGROOTTE): T[][] {
  if (grootte < 1) throw new Error("Een blok moet minstens één regel bevatten.");
  const blokken: T[][] = [];
  for (let i = 0; i < lijst.length; i += grootte) blokken.push(lijst.slice(i, i + grootte));
  return blokken;
}

/**
 * Is dit een lege opvulregel? De sheet exporteert tienduizenden regels zonder enige
 * inhoud. Die worden wel afgekeurd en geteld, maar niet elk met hun ruwe inhoud in
 * `sync_afwijkingen` gezet — dat waren duizenden nutteloze schrijfacties per nacht.
 * `regelnummer` telt niet mee: die vult de sync zelf.
 */
export function isLegeRij(rij: GeparsteRij, bron: Bron): boolean {
  return Object.keys(bron.kolommen)
    .filter((k) => k !== "regelnummer")
    .every((k) => !(rij.waarden[k] ?? "").trim());
}

/** De rijen van één blok als JSON-objecten met de databasekolommen als sleutel. */
export function rijenAlsRecords(rijen: readonly GeparsteRij[], bron: Bron): Record<string, string | null>[] {
  const paren = Object.entries(bron.kolommen);
  return rijen.map((rij) => {
    const record: Record<string, string | null> = {};
    for (const [sheetKolom, dbKolom] of paren) record[dbKolom] = rij.waarden[sheetKolom] ?? null;
    return record;
  });
}

/** Kolom- en tabelnamen komen uit `BRONNEN` en worden letterlijk in de query gezet. */
function eisNaam(naam: string): string {
  if (!/^[a-z_][a-z0-9_]*$/.test(naam)) throw new Error(`Ongeldige kolom- of tabelnaam: ${naam}`);
  return naam;
}

/** De insert van één blok: één JSON-parameter (`$1`) met de records van `rijenAlsRecords`. */
export function bouwBlokInsert(bron: Bron): string {
  const tabel = `dataloket.${eisNaam(bron.doeltabel)}`;
  const kolommen = Object.values(bron.kolommen).map(eisNaam).join(", ");
  return (
    `insert into ${tabel} (${kolommen}) ` +
    `select ${kolommen} from json_populate_recordset(null::${tabel}, $1::json) ` +
    `on conflict (${eisNaam(bron.sleutelKolom)}) do nothing`
  );
}

/** De afgekeurde regels die met hun ruwe inhoud bewaard worden: niet leeg, en hoogstens `max`. */
export function teBewarenAfwijkingen<T extends { rij: GeparsteRij }>(
  afgekeurd: readonly T[],
  bron: Bron,
  max: number = MAX_AFWIJKINGEN_BEWAARD,
): T[] {
  return afgekeurd.filter((a) => !isLegeRij(a.rij, bron)).slice(0, max);
}
