import 'server-only'

import type { GenerativeModel } from '@google/generative-ai'

import { buildAIContext, buildAIFingerprint, deriveErvaringsniveau, matchProfielUitContext } from '@/lib/bruiloft/aiContext'
import { buildConsolidatedPrompt, parseConsolidated } from '@/lib/bruiloft/ai/consolidatedPrompt'
import { bouwLeveranciersAanbod } from '@/lib/bruiloft/ai/leveranciersAanbod'
import {
  budgetItemFromRow,
  guestFromRow,
  scheduleItemFromRow,
  taskFromRow,
  vendorFromRow,
  weddingFromRow,
  websiteContentFromRow,
} from '@/lib/bruiloft/mappers'
import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

// Cache geldt als 'stale' (te ververst) na 6 uur of als hij ontbreekt.
export const PREWARM_STALE_AFTER_MS = 6 * 60 * 60 * 1000

/** Bepaalt of de AI-cache van een bruiloft ververst moet worden. */
export function isCacheStale(lastUpdatedAt: string | null | undefined, now = Date.now()): boolean {
  if (!lastUpdatedAt) return true
  return now - new Date(lastUpdatedAt).getTime() > PREWARM_STALE_AFTER_MS
}

/**
 * Genereert verse AI-adviezen voor één bruiloft via één geconsolideerde Gemini-call
 * en schrijft het resultaat naar zowel de planner- als de advies-cache.
 *
 * Gedeeld door de nachtelijke prewarm-cron en de eerste-login-prewarm, zodat de
 * generatielogica op één plek leeft.
 *
 * @returns true als er succesvol gegenereerd en opgeslagen is.
 */
export async function prewarmWedding(
  admin: AdminClient,
  model: GenerativeModel,
  weddingId: string,
  ownerId: string | null
): Promise<boolean> {
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

  if (!weddingRow) return false

  const wedding = weddingFromRow(weddingRow)
  const tasks = (taskRows ?? []).map(taskFromRow)
  const vendors = (vendorRows ?? []).map(vendorFromRow)
  const budgetItems = (budgetRows ?? []).map(budgetItemFromRow)
  const guests = (guestRows ?? []).map(guestFromRow)
  const scheduleItems = (scheduleRows ?? []).map(scheduleItemFromRow)
  const websiteContent = websiteRow ? websiteContentFromRow(websiteRow) : null

  // Haal eigenaar-profiel op voor ervaringsniveau (toon-afstemming)
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

  const aanbod = await bouwLeveranciersAanbod(admin, matchProfielUitContext(ctx))
  const result = await model.generateContent(buildConsolidatedPrompt({ ...ctx, leveranciersAanbod: aanbod }))
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

  return true
}
