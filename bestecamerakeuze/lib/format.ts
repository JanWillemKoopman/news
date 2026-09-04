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
