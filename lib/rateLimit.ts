import 'server-only'

import { createRawAdminClient } from '@/lib/supabase/admin'

export interface RateLimitResult {
  allowed: boolean
  currentCount: number
  resetAt: Date
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
