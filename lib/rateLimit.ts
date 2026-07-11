import 'server-only'

import { createRawAdminClient } from '@/lib/supabase/admin'

export interface RateLimitResult {
  allowed: boolean
  currentCount: number
  resetAt: Date
}

/**
 * Bepaalt het client-IP voor rate-limiting. Gebruikt bij voorkeur x-real-ip:
 * dat zet het platform (o.a. Vercel) op het échte client-IP en is — anders dan
 * de meest linkse waarde van x-forwarded-for — niet door de client zelf te
 * spoofen. Val terug op de eerste x-forwarded-for-hop voor andere omgevingen.
 * Zonder betrouwbare bron: 'unknown' (dan deelt verkeer één bucket, wat de
 * limiet juist strenger maakt i.p.v. omzeilbaar).
 */
export function getClientIp(request: Request): string {
  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || 'unknown'
}

/**
 * Atomisch rate limit via Postgres — werkt correct over meerdere serverless instanties.
 * Bij een DB-fout wordt het verzoek doorgelaten (fail open) om legitieme gebruikers
 * niet te blokkeren bij een tijdelijk infrastructuurprobleem.
 */
export async function checkRateLimit(
  key: string,
  max: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const admin = createRawAdminClient()
  const { data, error } = await admin.rpc('increment_rate_limit', {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  })

  if (error || !data || (Array.isArray(data) && data.length === 0)) {
    console.error('[rateLimit] DB-check mislukt, verzoek doorgelaten:', error)
    return { allowed: true, currentCount: 0, resetAt: new Date() }
  }

  const row = Array.isArray(data) ? data[0] : data
  return {
    allowed: row.allowed as boolean,
    currentCount: row.current_count as number,
    resetAt: new Date(row.reset_at as string),
  }
}
