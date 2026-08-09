/**
 * Canonieke basis-URL. Structured data heeft absolute URL's nodig; zonder deze waarde
 * zouden we relatieve paden in de JSON-LD zetten, en die negeert Google.
 *
 * Overschrijfbaar via NEXT_PUBLIC_SITE_URL zodat een preview-deploy naar zichzelf
 * verwijst in plaats van naar productie.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://bestecamerakeuze.nl"
).replace(/\/$/, "");

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
