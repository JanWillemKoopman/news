/**
 * Queryresultaat als CSV, voor wie er in Excel mee verder wil.
 *
 * Puntkomma als scheidingsteken en een UTF-8 BOM: dat is wat Nederlandse Excel
 * verwacht. Met komma's opent Excel het bestand in één kolom, en zonder BOM worden
 * accenten en het euroteken onleesbaar.
 */

function ontsnap(waarde: unknown): string {
  if (waarde === null || waarde === undefined) return "";
  const tekst = waarde instanceof Date ? waarde.toISOString().slice(0, 10) : String(waarde);
  // Aanhalingstekens verdubbelen en het veld omsluiten zodra er een scheidingsteken,
  // aanhalingsteken of regeleinde in staat.
  if (/[";\n\r]/.test(tekst)) return `"${tekst.replace(/"/g, '""')}"`;
  return tekst;
}

export function naarCsv(kolommen: string[], rijen: Record<string, unknown>[]): string {
  const regels = [
    kolommen.map(ontsnap).join(";"),
    ...rijen.map((rij) => kolommen.map((k) => ontsnap(rij[k])).join(";")),
  ];
  return `﻿${regels.join("\r\n")}`;
}

/** Maakt een bestandsnaam van een titel: "Omzet per merk, Q3" → "omzet-per-merk-q3.csv" */
export function bestandsnaam(titel: string): string {
  const kern =
    titel
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "resultaat";
  return `${kern}.csv`;
}

export function downloadCsv(
  kolommen: string[],
  rijen: Record<string, unknown>[],
  titel: string,
): void {
  const blob = new Blob([naarCsv(kolommen, rijen)], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = bestandsnaam(titel);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
