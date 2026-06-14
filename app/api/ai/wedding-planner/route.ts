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
import { checkRateLimit } from '@/lib/rateLimit'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ---- Types ------------------------------------------------------------------

export type AIModuleStatus = 'op_schema' | 'actie_vereist' | 'kritiek' | 'niet_gestart'

export interface AIConcreteActie {
  tekst: string
  link?: string
}

export interface AIModuleAdvies {
  status: AIModuleStatus
  globaal_advies: string
  concrete_acties: AIConcreteActie[]
}

export interface AIGlobaleStatus {
  status: 'op_schema' | 'actie_vereist' | 'kritiek'
  samenvatting: string
  score: number
}

export type AIModuleKey = 'taken' | 'budget' | 'leveranciers' | 'draaiboek' | 'gasten' | 'website'

export interface AIWeddingPlannerAdvies {
  globaal: AIGlobaleStatus
  modules: Record<AIModuleKey, AIModuleAdvies>
  generatedAt: string
}

export interface AIWeddingPlannerResponse {
  advies: AIWeddingPlannerAdvies | null
  cached: boolean
  next_available_at: string
}

// ---- Cache-instellingen -----------------------------------------------------

// Minimale tijd tussen regeneraties (ook als data is veranderd).
const MIN_COOLDOWN_MS = 60 * 60 * 1000       // 1 uur
// Veiligheidsnet: cache nooit langer dan dit gebruiken.
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 dagen

// Rate limiter voor de handmatige Verversen-knop (max 3/uur).

// ---- Route handler ----------------------------------------------------------

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI niet geconfigureerd' }, { status: 503 })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  // Fire-and-forget: bijwerken hoeft de response niet te vertragen
  void (supabase as any).from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', user.id)

  let body: { weddingId: string; force?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldige request' }, { status: 400 })
  }

  if (!body.weddingId) {
    return NextResponse.json({ error: 'weddingId ontbreekt' }, { status: 400 })
  }

  const { weddingId } = body

  // Verificeer lidmaatschap
  const { data: member } = await supabase
    .from('wedding_members')
    .select('role')
    .eq('wedding_id', weddingId)
    .eq('user_id', user.id)
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Geen toegang tot deze bruiloft' }, { status: 403 })
  }

  // Lees bestaande cache
  const { data: cacheRow } = await (supabase as any)
    .from('ai_wedding_planner_cache')
    .select('cached_advice, data_fingerprint, last_updated_at')
    .eq('wedding_id', weddingId)
    .single()

  const now = Date.now()

  // Haal alle bruiloftdata op — nodig voor de vingerafdruk én voor generatie.
  const [
    { data: weddingRow },
    { data: taskRows },
    { data: vendorRows },
    { data: budgetRows },
    { data: guestRows },
    { data: scheduleRows },
    { data: websiteRow },
    profileResult,
    activityResult,
  ] = await Promise.all([
    supabase.from('weddings').select('*').eq('id', weddingId).single(),
    supabase.from('tasks').select('*').eq('wedding_id', weddingId),
    supabase.from('vendors').select('*').eq('wedding_id', weddingId),
    supabase.from('budget_items').select('*').eq('wedding_id', weddingId),
    supabase.from('guests').select('*').eq('wedding_id', weddingId),
    supabase.from('schedule_items').select('*').eq('wedding_id', weddingId),
    supabase.from('website_content').select('*').eq('wedding_id', weddingId).single(),
    (supabase as any).from('profiles').select('created_at').eq('id', user.id).single(),
    (supabase as any)
      .from('wedding_activity')
      .select('*', { count: 'exact', head: true })
      .eq('actor_id', user.id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  if (!weddingRow) {
    return NextResponse.json({ error: 'Bruiloft niet gevonden' }, { status: 404 })
  }

  const wedding = weddingFromRow(weddingRow)
  const tasks = (taskRows ?? []).map(taskFromRow)
  const vendors = (vendorRows ?? []).map(vendorFromRow)
  const budgetItems = (budgetRows ?? []).map(budgetItemFromRow)
  const guests = (guestRows ?? []).map(guestFromRow)
  const scheduleItems = (scheduleRows ?? []).map(scheduleItemFromRow)
  const websiteContent = websiteRow ? websiteContentFromRow(websiteRow) : null

  const profielLeeftijdDagen = profileResult.data?.created_at
    ? Math.floor((Date.now() - new Date(profileResult.data.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0
  const actiesLaatste30Dagen = activityResult.count ?? 0

  const context = {
    ...buildAIContext(wedding, tasks, vendors, budgetItems, guests, scheduleItems, websiteContent),
    gebruiker: {
      profielLeeftijdDagen,
      actiesLaatste30Dagen,
      ervaringsniveau: deriveErvaringsniveau(profielLeeftijdDagen, actiesLaatste30Dagen),
    },
  }
  const fingerprint = buildAIFingerprint(context)

  // Bepaal of de cache geldig is
  if (cacheRow && !body.force) {
    const cacheAge = now - new Date(cacheRow.last_updated_at).getTime()
    const fingerprintMatch = cacheRow.data_fingerprint === fingerprint
    const withinCooldown = cacheAge < MIN_COOLDOWN_MS
    const cacheValid = cacheAge < MAX_CACHE_AGE_MS

    if (cacheValid && (fingerprintMatch || withinCooldown)) {
      const nextAvailableAt = new Date(new Date(cacheRow.last_updated_at).getTime() + MIN_COOLDOWN_MS)
      return NextResponse.json({
        advies: cacheRow.cached_advice as AIWeddingPlannerAdvies,
        cached: true,
        next_available_at: nextAvailableAt.toISOString(),
      } satisfies AIWeddingPlannerResponse)
    }
  }

  // Rate limit voor handmatig verversen
  if (body.force) {
    const rateLimit = await checkRateLimit(`ai:wedding-planner:${weddingId}`, 3, 60 * 60)
    if (!rateLimit.allowed) {
      if (cacheRow?.cached_advice) {
        const nextAvailableAt = new Date(now + MIN_COOLDOWN_MS)
        return NextResponse.json({
          advies: cacheRow.cached_advice as AIWeddingPlannerAdvies,
          cached: true,
          next_available_at: nextAvailableAt.toISOString(),
        } satisfies AIWeddingPlannerResponse)
      }
      return NextResponse.json({ error: 'Te veel verzoeken, probeer het over een uur opnieuw.' }, { status: 429 })
    }
  }

  // 1 geconsolideerde Gemini-aanroep (was: 7 parallelle aanroepen)
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash',
      generationConfig: { responseMimeType: 'application/json' },
    })

    const result = await model.generateContent(buildConsolidatedPrompt(context))
    const consolidated = parseConsolidated(result.response.text())

    const advies: AIWeddingPlannerAdvies = {
      globaal: consolidated.globaal,
      modules: consolidated.modules,
      generatedAt: new Date().toISOString(),
    }

    const updatedAt = new Date().toISOString()

    // Sla op in beide caches tegelijk
    await Promise.all([
      (supabase as any)
        .from('ai_wedding_planner_cache')
        .upsert(
          {
            wedding_id: weddingId,
            cached_advice: advies,
            data_fingerprint: fingerprint,
            last_updated_at: updatedAt,
          },
          { onConflict: 'wedding_id' }
        ),
      (supabase as any)
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

    return NextResponse.json({
      advies,
      cached: false,
      next_available_at: new Date(now + MIN_COOLDOWN_MS).toISOString(),
    } satisfies AIWeddingPlannerResponse)
  } catch (err) {
    console.error('[api/ai/wedding-planner] Gemini fout:', err)
    // Retourneer stale cache als fallback bij een AI-fout
    if (cacheRow?.cached_advice) {
      return NextResponse.json({
        advies: cacheRow.cached_advice as AIWeddingPlannerAdvies,
        cached: true,
        next_available_at: new Date(now + MIN_COOLDOWN_MS).toISOString(),
      } satisfies AIWeddingPlannerResponse)
    }
    return NextResponse.json({ error: 'AI tijdelijk niet beschikbaar' }, { status: 502 })
  }
}
