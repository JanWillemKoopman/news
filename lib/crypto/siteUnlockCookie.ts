import 'server-only'
import { createHmac, timingSafeEqual } from 'crypto'

// Server-side HMAC-ondertekende "ontgrendel"-cookie voor het site-brede
// trouwwebsite-wachtwoord (fase 3). In tegenstelling tot de sessionStorage-
// "onthoud toegang" van de cadeaulijst is dit een echte, verifieerbare
// server-side grens: de publieke route rendert de eigenlijke inhoud pas
// nadat deze cookie hier is geverifieerd (zie
// app/trouwen/[slug]/[[...pagina]]/page.tsx).

const COOKIE_PREFIX = 'trouwen_unlocked_'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 dagen

function secret(): string {
  const s = process.env.SITE_PASSWORD_SECRET
  if (!s) throw new Error('SITE_PASSWORD_SECRET ontbreekt in de omgeving')
  return s
}

function hmac(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('hex')
}

export function cookieNaamVoor(weddingId: string): string {
  return `${COOKIE_PREFIX}${weddingId}`
}

// Bouwt de ondertekende cookie-waarde voor een succesvol geverifieerd
// wachtwoord. maxAge in seconden voor gebruik als cookie-optie.
export function maakOntgrendelCookieWaarde(weddingId: string): { waarde: string; maxAge: number } {
  const verlooptOp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS
  const payload = `${weddingId}.${verlooptOp}`
  return { waarde: `${payload}.${hmac(payload)}`, maxAge: MAX_AGE_SECONDS }
}

// Verifieert een cookie-waarde tegen een specifieke wedding_id. Retourneert
// false bij ontbrekende/verlopen/ongeldige/gemanipuleerde waarden.
export function verifieerOntgrendelCookie(waarde: string | undefined, weddingId: string): boolean {
  if (!waarde) return false
  const delen = waarde.split('.')
  if (delen.length !== 3) return false
  const [cookieWeddingId, verlooptOpStr, ontvangenHmac] = delen
  if (cookieWeddingId !== weddingId) return false

  const verlooptOp = Number(verlooptOpStr)
  if (!Number.isFinite(verlooptOp) || verlooptOp < Math.floor(Date.now() / 1000)) return false

  const verwacht = hmac(`${cookieWeddingId}.${verlooptOpStr}`)
  const a = Buffer.from(ontvangenHmac)
  const b = Buffer.from(verwacht)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
