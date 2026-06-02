import 'server-only'
import { scrypt, randomBytes, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)
const SALT_LEN = 16
const KEY_LEN = 64

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_LEN).toString('hex')
  const key = (await scryptAsync(plain, salt, KEY_LEN)) as Buffer
  return `scrypt:${salt}:${key.toString('hex')}`
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (stored.startsWith('scrypt:')) {
    const parts = stored.split(':')
    if (parts.length !== 3) return false
    const [, salt, hash] = parts
    const hashBuf = Buffer.from(hash, 'hex')
    const derived = (await scryptAsync(plain, salt, KEY_LEN)) as Buffer
    if (hashBuf.length !== derived.length) return false
    return timingSafeEqual(hashBuf, derived)
  }
  // Backward compat: plaintext (migratie-periode) — timing-safe vergelijking
  const a = Buffer.from(plain)
  const b = Buffer.from(stored)
  if (a.length !== b.length) return plain === stored
  return timingSafeEqual(a, b)
}
