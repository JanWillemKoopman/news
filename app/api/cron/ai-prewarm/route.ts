import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

import { buildAIContext, buildAIFingerprint, deriveErvaringsniveau } from '@/lib/bruiloft/aiContext'
import { buildConsolidatedPrompt, parseConsolidated } from '@/lib/bruiloft/ai/consolidatedPrompt'
import {
  budgetItemFromRow,
  guestFromRow,
  scheduleItemFromRow,
  taskFromRow,
  vendorFromRow,
  weddingFromRow,
  websiteContentFromRow,
} from '@/lib/bruiloft/mappers'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STALE_AFTER_MS = 6 * 60 * 60 * 1000  // 6 uur

/**
 * Nightly prewarm cron. Voorverwarmt AI-caches voor actieve bruiloften.
 * Beveiligd met CRON_SECRET (Bearer-header).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI niet geconfigureerd' }, { status: 503 })
  }

  const admin = createAdminClient()

  // 1. Zoek profielen die recent actief zijn geweest (laatste 7 dagen)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentProfiles } = await (admin as any)
    .from('profiles')
    .select('id')
    .gte('last_seen_at', sevenDaysAgo)

  if (!recentProfiles || recentProfiles.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, prewarmed: 0, skipped: 0 })
  }

  const recentUserIds = (recentProfiles as Array<{ id: string }>).map((p) => p.id)

  // 2. Haal wedding_members op voor deze gebruikers
  const { data: memberRows } = await (admin as any)
    .from('wedding_members')
    .select('wedding_id, user_id, role')
    .in('user_id', recentUserIds)

  if (!memberRows || memberRows.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, prewarmed: 0, skipped: 0 })
  }

  const weddingIds = [...new Set((memberRows as Array<{ wedding_id: string }>).map((m) => m.wedding_id))]

  // 3. Filter op toekomstige bruiloften
  const today = new Date().toISOString().slice(0, 10)
  const { data: futureWeddings } = await (admin as any)
    .from('weddings')
    .select('id, trouwdatum')
    .in('id', weddingIds)
    .gte('trouwdatum', today)

  if (!futureWeddings || futureWeddings.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, prewarmed: 0, skipped: 0 })
  }

  const futureWeddingIds = (futureWeddings as Array<{ id: string }>).map((w) => w.id)

  // 4. Haal ai_advice_cache op voor deze bruiloften
  const { data: cacheRows } = await (admin as any)
    .from('ai_advice_cache')
    .select('wedding_id, last_updated_at')
    .in('wedding_id', futureWeddingIds)

  const cacheByWeddingId = new Map<string, { last_updated_at: string }>()
  for (const row of (cacheRows ?? []) as Array<{ wedding_id: string; last_updated_at: string }>) {
    cacheByWeddingId.set(row.wedding_id, row)
  }

  // Bepaal welke bruiloften stale zijn (cache ontbreekt of > 6 uur oud)
  const staleWeddingIds: string[] = []
  const now = Date.now()
  for (const weddingId of futureWeddingIds) {
    const cache = cacheByWeddingId.get(weddingId)
    if (!cache) {
      staleWeddingIds.push(weddingId)
    } else {
      const age = now - new Date(cache.last_updated_at).getTime()
      if (age > STALE_AFTER_MS) {
        staleWeddingIds.push(weddingId)
      }
    }
  }

  const checked = futureWeddingIds.length
  const skipped = checked - staleWeddingIds.length
  let prewarmed = 0

  if (staleWeddingIds.length === 0) {
    return NextResponse.json({ ok: true, checked, prewarmed: 0, skipped })
  }

  // 5. Verwerk elke stale bruiloft
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  })

  // Owner-lookup voor ervaringsniveau
  const ownerByWeddingId = new Map<string, string>()
  for (const m of memberRows as Array<{ wedding_id: string; user_id: string; role: string }>) {
    if (m.role === 'owner' && staleWeddingIds.includes(m.wedding_id)) {
      ownerByWeddingId.set(m.wedding_id, m.user_id)
    }
  }

  for (const weddingId of staleWeddingIds) {
    try {
      // Haal alle bruiloftdata op in parallel
      const [
        { data: weddingRow },
        { data: taskRows },
        { data: vendorRows },
        { data: budgetRows },
        { data: guestRows },
        { data: scheduleRows },
        { data: websiteRow },
      ] = await Promise.all([
        admin.from('weddings').select('*').eq('id', weddingId).single(),
        admin.from('tasks').select('*').eq('wedding_id', weddingId),
        admin.from('vendors').select('*').eq('wedding_id', weddingId),
        admin.from('budget_items').select('*').eq('wedding_id', weddingId),
        admin.from('guests').select('*').eq('wedding_id', weddingId),
        admin.from('schedule_items').select('*').eq('wedding_id', weddingId),
        (admin as any).from('website_content').select('*').eq('wedding_id', weddingId).single(),
      ])

      if (!weddingRow) continue

      const wedding = weddingFromRow(weddingRow)
      const tasks = (taskRows ?? []).map(taskFromRow)
      const vendors = (vendorRows ?? []).map(vendorFromRow)
      const budgetItems = (budgetRows ?? []).map(budgetItemFromRow)
      const guests = (guestRows ?? []).map(guestFromRow)
      const scheduleItems = (scheduleRows ?? []).map(scheduleItemFromRow)
      const websiteContent = websiteRow ? websiteContentFromRow(websiteRow) : null

      // Haal eigenaar-profiel op voor ervaringsniveau
      const ownerId = ownerByWeddingId.get(weddingId)
      let profielLeeftijdDagen = 0
      let actiesLaatste30Dagen = 0

      if (ownerId) {
        const [profileResult, activityResult] = await Promise.all([
          (admin as any).from('profiles').select('created_at').eq('id', ownerId).single(),
          (admin as any)
            .from('wedding_activity')
            .select('*', { count: 'exact', head: true })
            .eq('actor_id', ownerId)
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        ])
        profielLeeftijdDagen = profileResult.data?.created_at
          ? Math.floor((Date.now() - new Date(profileResult.data.created_at).getTime()) / (1000 * 60 * 60 * 24))
          : 0
        actiesLaatste30Dagen = activityResult.count ?? 0
      }

      const ctx = {
        ...buildAIContext(wedding, tasks, vendors, budgetItems, guests, scheduleItems, websiteContent),
        gebruiker: {
          profielLeeftijdDagen,
          actiesLaatste30Dagen,
          ervaringsniveau: deriveErvaringsniveau(profielLeeftijdDagen, actiesLaatste30Dagen),
        },
      }

      const fingerprint = buildAIFingerprint(ctx)

      const result = await model.generateContent(buildConsolidatedPrompt(ctx))
      const consolidated = parseConsolidated(result.response.text())

      const plannerAdvies = {
        globaal: consolidated.globaal,
        modules: consolidated.modules,
        generatedAt: new Date().toISOString(),
      }

      const updatedAt = new Date().toISOString()

      await Promise.all([
        (admin as any)
          .from('ai_wedding_planner_cache')
          .upsert(
            {
              wedding_id: weddingId,
              cached_advice: plannerAdvies,
              data_fingerprint: fingerprint,
              last_updated_at: updatedAt,
            },
            { onConflict: 'wedding_id' }
          ),
        (admin as any)
          .from('ai_advice_cache')
          .upsert(
            {
              wedding_id: weddingId,
              cached_advies: consolidated.advies,
              data_fingerprint: fingerprint,
              last_updated_at: updatedAt,
            },
            { onConflict: 'wedding_id' }
          ),
      ])

      prewarmed++
    } catch (err) {
      console.error(`[cron/ai-prewarm] Fout bij wedding ${weddingId}:`, err)
    }
  }

  return NextResponse.json({ ok: true, checked, prewarmed, skipped })
}
