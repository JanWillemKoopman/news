const wholeFormatter = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });

/**
 * Splitst een prijs in euro's en centen, zodat de centen als superscript naast het
 * hele bedrag gezet kunnen worden — de weergave die Nederlandse webwinkels gebruiken.
 */
export function splitPrice(value: number): { whole: string; cents: string } {
  const cents = Math.round(value * 100);
  return {
    whole: wholeFormatter.format(Math.floor(cents / 100)),
    cents: String(cents % 100).padStart(2, "0"),
  };
}

export function formatPrice(value: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

/** Kortingspercentage, afgerond naar beneden zodat we nooit meer beloven dan er is. */
export function discountPercentage(price: number, oldPrice: number | null): number | null {
  if (!oldPrice || oldPrice <= price) return null;
  return Math.floor(((oldPrice - price) / oldPrice) * 100);
}
