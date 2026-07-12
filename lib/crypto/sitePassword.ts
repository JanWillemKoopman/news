import 'server-only'
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'crypto'

import { verifyPassword } from './password'

// Omkeerbare versleuteling van het site-brede trouwwebsite-wachtwoord.
// In tegenstelling tot lib/crypto/password.ts (onomkeerbare scrypt-hash,
// gebruikt voor de cadeaulijst-beveiliging) moet dít wachtwoord door de
// eigenaar teruggezien kunnen worden in de editor — het is geen persoonlijk
// account-wachtwoord maar een gedeelde "deurcode" voor de trouwwebsite.
// AES-256-GCM met een sleutel afgeleid van SITE_PASSWORD_SECRET (dezelfde
// env-var als siteUnlockCookie.ts, met domeinscheiding zodat er nooit
// dezelfde afgeleide sleutel voor twee cryptografische doelen wordt gebruikt).

const ALGORITME = 'aes-256-gcm'
const IV_LEN = 12
const PREFIX = 'aesgcm'

function sleutel(): Buffer {
  const geheim = process.env.SITE_PASSWORD_SECRET
  if (!geheim) throw new Error('SITE_PASSWORD_SECRET ontbreekt in de omgeving')
  return createHash('sha256').update(`site-password-encryption:${geheim}`).digest()
}

export function encryptSitePassword(plain: string): string {
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGORITME, sleutel(), iv)
  const versleuteld = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}:${iv.toString('hex')}:${tag.toString('hex')}:${versleuteld.toString('hex')}`
}

// Retourneert null als stored niet (meer) omkeerbaar is (oud scrypt-hash-
// formaat van vóór deze wijziging, of corrupte data) — de aanroeper toont
// dan geen waarde i.p.v. te crashen.
export function decryptSitePassword(stored: string | null): string | null {
  if (!stored || !stored.startsWith(`${PREFIX}:`)) return null
  const delen = stored.split(':')
  if (delen.length !== 4) return null
  const [, ivHex, tagHex, dataHex] = delen
  try {
    const decipher = createDecipheriv(ALGORITME, sleutel(), Buffer.from(ivHex, 'hex'))
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
    const plain = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()])
    return plain.toString('utf8')
  } catch {
    return null
  }
}

// Wachtwoorden die vóór deze wijziging zijn ingesteld staan nog als
// onomkeerbare scrypt-hash opgeslagen ('scrypt:...') — die blijven werken
// om in te loggen (vandaar de fallback naar de oude verifyPassword), maar
// zijn niet terug te tonen totdat de gebruiker opnieuw opslaat.
export async function verifySitePassword(plain: string, stored: string): Promise<boolean> {
  if (stored.startsWith(`${PREFIX}:`)) {
    const decrypted = decryptSitePassword(stored)
    if (decrypted === null) return false
    const a = Buffer.from(plain)
    const b = Buffer.from(decrypted)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  }
  return verifyPassword(plain, stored)
}
