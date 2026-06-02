const store = new Map<string, { count: number; resetAt: number }>()

export function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const rec = store.get(key)
  if (!rec || rec.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }
  if (rec.count >= max) return true
  rec.count++
  return false
}
