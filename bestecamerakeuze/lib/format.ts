export function formatCurrency(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 2 }).format(value);
}

/** Data komen als "2026-01-01" (ISO) uit de sheet; val terug op de ruwe waarde als parsen mislukt. */
export function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" }).format(
    date,
  );
}

/** Percentage van een teller t.o.v. een noemer; null zodra een van beide ontbreekt of de noemer 0 is. */
export function ratio(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null || denominator === 0) return null;
  return (numerator / denominator) * 100;
}

export function formatPercent(value: number | null): string | null {
  if (value === null || !Number.isFinite(value)) return null;
  return `${Math.round(value)}%`;
}

/** Zet een percentage tussen haakjes achter de hoofdwaarde, of laat de haakjes weg als het niet te berekenen is. */
export function withPercent(main: string, percent: string | null): string {
  return percent ? `${main} (${percent})` : main;
}

export type Deviation = {
  text: string;
  tone: "positive" | "negative" | "neutral";
};

/**
 * Doel-versus-realisatie in mensentaal ("+445 boven doel" / "−35 onder doel") in
 * plaats van een kaal percentage — sneller te scannen dan "465 (2325%)".
 */
export function deviationFromTarget(actual: number | null, target: number | null): Deviation | null {
  if (actual === null || target === null) return null;
  const diff = Math.round(actual - target);
  if (diff === 0) return { text: "op doel", tone: "neutral" };
  const formatted = new Intl.NumberFormat("nl-NL").format(Math.abs(diff));
  return diff > 0
    ? { text: `+${formatted} boven doel`, tone: "positive" }
    : { text: `−${formatted} onder doel`, tone: "negative" };
}

/** "van doel"-percentage voor metrics waarbij een absolute afwijking minder zegt (bv. leads). */
export function percentOfTarget(actual: number | null, target: number | null): string | null {
  const percent = formatPercent(ratio(actual, target));
  return percent ? `${percent} van doel` : null;
}

export function formatUpdatedAt(date: Date): string {
  return new Intl.DateTimeFormat("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  }).format(date);
}
