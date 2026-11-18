/**
 * De regels voor een met de hand ingetypt groeipercentage op KPI's 2027 (Syntec). Puur en
 * zonder server-imports, zodat de kaart in de browser dezelfde grenzen aanhoudt als de
 * route en de tabel (`0036_kpi_2027_groei.sql`). Getest in `groeiInvoer.test.ts`.
 */

export type KpiTabblad = "kpi-2027" | "kpi-2027-syntec";

export const KPI_TABBLADEN: readonly KpiTabblad[] = ["kpi-2027", "kpi-2027-syntec"];

/** De grenzen die de tabel ook afdwingt: meer dan −100% en hooguit +1000%. */
export const GROEI_MIN = -1;
export const GROEI_MAX = 10;

export function isGeldigeGroei(groei: unknown): groei is number {
  return typeof groei === "number" && Number.isFinite(groei) && groei > GROEI_MIN && groei <= GROEI_MAX;
}

/** Sleutel voor een aangepast percentage: website en KPI. Bij Syntec is de website "". */
export function groeiSleutel(website: string, kpi: string): string {
  return `${website}|${kpi}`;
}

/**
 * Wat iemand in het veld typt → een fractie. "7,5" en "7.5%" en "+7,5" worden 0,075;
 * "-3" wordt −0,03. Null als het geen getal is of buiten de grenzen valt.
 */
export function leesPercentage(invoer: string): number | null {
  const schoon = invoer.trim().replace(/%$/, "").trim().replace(",", ".").replace(/^\+/, "").replace(/^[−–]/, "-");
  if (!/^-?\d+(\.\d+)?$/.test(schoon)) return null;
  // Afronden op vier decimalen (0,01%), zodat 7,1 niet als 0,07099999… wordt bewaard.
  const groei = Math.round(Number(schoon) * 100) / 10_000;
  return isGeldigeGroei(groei) ? groei : null;
}

/** Een fractie als tekst voor in het veld: 0,075 → "7,5". */
export function percentageInvoer(groei: number): string {
  return String(Math.round(groei * 10_000) / 100).replace(".", ",");
}
