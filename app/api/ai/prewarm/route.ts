import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'

import { isCacheStale, prewarmWedding } from '@/lib/bruiloft/ai/prewarm'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Gemini-generatie kan een aantal seconden duren; ruim genoeg marge geven.
export const maxDuration = 60

/**
 * Eerste-login-prewarm. Wordt fire-and-forget aangeroepen door de client direct
 * na het inloggen. Doet per gebruiker hooguit één keer per kalenderdag een
 * Gemini-call, zodat de AI-content al klaarstaat wanneer het koppel hun advies
 * bekijkt. Vervangt de nachtelijke prewarm-cron (die Vercel Pro vereist).
 *
 * Idempotent: een atomaire dag-guard op `profiles.ai_prewarmed_on` voorkomt dat
 * meerdere tabs of herhaalde logins dubbele calls veroorzaken.
 */
export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)

  // Atomaire dag-guard: claim de slot voor vandaag. De WHERE matcht alleen als er
  // vandaag nog niet voorverwarmd is; bij gelijktijdige requests slaagt er hooguit
  // één (de tweede ziet de zojuist gezette datum en update 0 rijen).
  const { data: claimed } = await (supabase as any)
    .from('profiles')
    .update({ ai_prewarmed_on: today })
    .eq('id', user.id)
    .or(`ai_prewarmed_on.is.null,ai_prewarmed_on.lt.${today}`)
    .select('id')

  if (!claimed || claimed.length === 0) {
    // Vandaag al gedaan (of niets te claimen) — niets te doen.
    return NextResponse.json({ ok: true, prewarmed: 0, reason: 'already_today' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ ok: true, prewarmed: 0, reason: 'ai_unconfigured' })
  }

  const admin = createAdminClient()

  // Welke bruiloften hoort deze gebruiker bij?
  const { data: memberRows } = await (admin as any)
    .from('wedding_members')
    .select('wedding_id')
    .eq('user_id', user.id)

  const weddingIds = Array.from(
    new Set(((memberRows ?? []) as Array<{ wedding_id: string }>).map((m) => m.wedding_id))
  )
  if (weddingIds.length === 0) {
    return NextResponse.json({ ok: true, prewarmed: 0, reason: 'no_wedding' })
  }

  // Alleen toekomstige bruiloften prewarmen.
  const { data: futureWeddings } = await (admin as any)
    .from('weddings')
    .select('id')
    .in('id', weddingIds)
    .gte('trouwdatum', today)

  const futureWeddingIds = ((futureWeddings ?? []) as Array<{ id: string }>).map((w) => w.id)
  if (futureWeddingIds.length === 0) {
    return NextResponse.json({ ok: true, prewarmed: 0, reason: 'no_future_wedding' })
  }

  // Sla bruiloften over waarvan de cache nog vers is (bv. net on-demand gegenereerd).
  const { data: cacheRows } = await (admin as any)
    .from('ai_advice_cache')
    .select('wedding_id, last_updated_at')
    .in('wedding_id', futureWeddingIds)

  const cacheByWeddingId = new Map<string, string>()
  for (const row of (cacheRows ?? []) as Array<{ wedding_id: string; last_updated_at: string }>) {
    cacheByWeddingId.set(row.wedding_id, row.last_updated_at)
  }

  const staleWeddingIds = futureWeddingIds.filter((id) => isCacheStale(cacheByWeddingId.get(id)))
  if (staleWeddingIds.length === 0) {
    return NextResponse.json({ ok: true, prewarmed: 0, reason: 'fresh' })
  }

  // Bepaal de eigenaar per bruiloft (voor ervaringsniveau / toon-afstemming).
  const { data: ownerRows } = await (admin as any)
    .from('wedding_members')
    .select('wedding_id, user_id')
    .in('wedding_id', staleWeddingIds)
    .eq('role', 'owner')

  const ownerByWeddingId = new Map<string, string>()
  for (const row of (ownerRows ?? []) as Array<{ wedding_id: string; user_id: string }>) {
    ownerByWeddingId.set(row.wedding_id, row.user_id)
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  })

  let prewarmed = 0
  for (const weddingId of staleWeddingIds) {
    try {
      const generated = await prewarmWedding(admin, model, weddingId, ownerByWeddingId.get(weddingId) ?? null)
      if (generated) prewarmed++
    } catch (err) {
      console.error(`[api/ai/prewarm] Fout bij wedding ${weddingId}:`, err)
    }
  }

  return NextResponse.json({ ok: true, prewarmed })
}
