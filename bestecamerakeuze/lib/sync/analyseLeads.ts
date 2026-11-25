import type { GeparsteRij } from "@/lib/sync/bronnen";

/**
 * De leads-kopie voor Marketing analyse (`dataloket.marketing_analyse_leads`).
 *
 * Besluit van de eigenaar (november 2026, zie campagne-analyse-tool.md §3.1): de analyse
 * gebruikt voor leads alleen een smalle kopie van het sheet-tabblad "Data leads":
 *
 *  - **zeven kolommen, 1-op-1** zoals in de sheet: Kanaal, Ordersoort, Onderwerp, Kanaalgroep,
 *    Merk, Model, Aangelegd (plus Aangelegd als tijdstip, om op periode te filteren). Kanaal kwam
 *    er op 25 november 2026 bij: zonder Kanaal is de leadregel hieronder niet toe te passen;
 *  - **de laatste 365 dagen** (Nederlandse kalender, op Aangelegd);
 *  - **zonder rijen met "FW:" in Onderwerp** (doorgestuurde mails; hoofdletterongevoelig);
 *  - zonder lege opvulregels (de sync keurt rijen zonder Kanaal al af).
 *
 * Wordt elke nacht gevuld in `/api/sync`, uit dezelfde keer lezen van de sheet als
 * `leads_raw`, maar hangt daar niet van af. Pure functies: geen database.
 */

export const ANALYSE_LEADS_DAGEN = 365;

/** De sheetkolommen, in de volgorde van de tabel. */
export const ANALYSE_LEADS_KOLOMMEN = {
  Kanaal: "kanaal",
  Ordersoort: "ordersoort",
  Onderwerp: "onderwerp",
  Kanaalgroep: "kanaalgroep",
  Merk: "merk",
  Model: "model",
  Aangelegd: "aangelegd",
} as const;

export interface AnalyseLeadRecord {
  kanaal: string | null;
  ordersoort: string | null;
  onderwerp: string | null;
  kanaalgroep: string | null;
  merk: string | null;
  model: string | null;
  aangelegd: string | null;
  /** ISO-tijdstip met de Nederlandse tijdzone erin, of null. */
  aangelegd_op: string | null;
}

/** De UTC-afwijking van Nederland op een datum: "+01:00" in de winter, "+02:00" in de zomer. */
function nlAfwijking(jaar: number, maand: number, dag: number): string {
  // Laatste zondag van maart en oktober, om 01:00 UTC.
  const laatsteZondag = (m: number) => {
    const d = new Date(Date.UTC(jaar, m + 1, 0));
    return d.getUTCDate() - d.getUTCDay();
  };
  const zomerVan = Date.UTC(jaar, 2, laatsteZondag(2), 1);
  const zomerTot = Date.UTC(jaar, 9, laatsteZondag(9), 1);
  const t = Date.UTC(jaar, maand - 1, dag, 12);
  return t >= zomerVan && t < zomerTot ? "+02:00" : "+01:00";
}

/**
 * "23-11-2026 7:40" (of zonder tijd) → { datum: "2026-11-23", tijdstip: "2026-11-23T07:40:00+01:00" }.
 * Null bij iets onherkenbaars.
 */
export function leesAangelegd(waarde: string | null | undefined): { datum: string; tijdstip: string } | null {
  if (!waarde) return null;
  const m = /^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/.exec(waarde.trim());
  if (!m) return null;
  const [, d, mnd, j, u = "0", min = "00"] = m;
  const dag = Number(d);
  const maand = Number(mnd);
  const jaar = Number(j);
  if (maand < 1 || maand > 12 || dag < 1 || dag > 31 || Number(u) > 23) return null;
  const datum = `${j}-${String(maand).padStart(2, "0")}-${String(dag).padStart(2, "0")}`;
  const tijdstip = `${datum}T${u.padStart(2, "0")}:${min}:00${nlAfwijking(jaar, maand, dag)}`;
  return { datum, tijdstip };
}

/** De eerste dag die nog meetelt: vandaag (NL) min 365 dagen. */
export function eersteDag(vandaag: string, dagen: number = ANALYSE_LEADS_DAGEN): string {
  const d = new Date(`${vandaag}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - dagen);
  return d.toISOString().slice(0, 10);
}

export function isDoorgestuurd(onderwerp: string | null | undefined): boolean {
  return Boolean(onderwerp && onderwerp.toUpperCase().includes("FW:"));
}

function waarde(rij: GeparsteRij, kolom: string): string | null {
  const w = rij.waarden[kolom];
  return w === undefined || w === "" ? null : w;
}

/**
 * De rijen voor de leads-kopie. `vandaag` is de Nederlandse datum ("JJJJ-MM-DD"). Rijen zonder
 * leesbare Aangelegd vallen weg: zonder datum is niet te zeggen of ze in de 365 dagen vallen.
 */
export function analyseLeadRecords(rijen: readonly GeparsteRij[], vandaag: string): AnalyseLeadRecord[] {
  const vanaf = eersteDag(vandaag);
  const uit: AnalyseLeadRecord[] = [];
  for (const rij of rijen) {
    const onderwerp = waarde(rij, "Onderwerp");
    if (isDoorgestuurd(onderwerp)) continue;
    const aangelegd = leesAangelegd(rij.waarden.Aangelegd);
    if (!aangelegd || aangelegd.datum < vanaf || aangelegd.datum > vandaag) continue;
    uit.push({
      kanaal: waarde(rij, "Kanaal"),
      ordersoort: waarde(rij, "Ordersoort"),
      onderwerp,
      kanaalgroep: waarde(rij, "Kanaalgroep"),
      merk: waarde(rij, "Merk"),
      model: waarde(rij, "Model"),
      aangelegd: waarde(rij, "Aangelegd"),
      aangelegd_op: aangelegd.tijdstip,
    });
  }
  return uit;
}

// ---------------------------------------------------------------------------
// Welke Syntec-lead telt bij een Campagne analyse
// ---------------------------------------------------------------------------

/**
 * Besluit van de eigenaar (25 november 2026, campagne-analyse-tool.md §15): bij een Campagne
 * analyse telt een Syntec-lead alleen als Kanaalgroep "Internet" is én Kanaal of Onderwerp
 * "udenhout.nl" bevat (hoofdletterongevoelig). Dezelfde regel staat in SQL in de view
 * `dataloket.marketing_analyse_leads_website` (migratie 0047); houd ze gelijk.
 */
export function isWebsiteLead(l: Pick<AnalyseLeadRecord, "kanaalgroep" | "kanaal" | "onderwerp">): boolean {
  if (l.kanaalgroep !== "Internet") return false;
  const bevat = (w: string | null) => Boolean(w && w.toLowerCase().includes("udenhout.nl"));
  return bevat(l.kanaal) || bevat(l.onderwerp);
}

export type SoortWebsiteLead = "proefrit" | "private lease" | "offerte" | "inruil" | "overig";

/**
 * De soort lead uit Onderwerp en Kanaal, in deze volgorde. Klopte in november 2026 voor 99,9%
 * met Lead type in Syntec (proefrit 2.235 van 2.236). Gelijk aan de kolom `soort` in de view.
 */
export function soortWebsiteLead(l: Pick<AnalyseLeadRecord, "kanaal" | "onderwerp">): SoortWebsiteLead {
  const t = `${l.onderwerp ?? ""} ${l.kanaal ?? ""}`.toLowerCase();
  if (t.includes("proefrit")) return "proefrit";
  if (t.includes("private lease") || t.includes("privatelease")) return "private lease";
  if (t.includes("offerte")) return "offerte";
  if (t.includes("inruil")) return "inruil";
  return "overig";
}
