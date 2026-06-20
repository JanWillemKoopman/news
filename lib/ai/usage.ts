import 'server-only'

import { createRawAdminClient } from '@/lib/supabase/admin'

// Lichtgewicht gebruikslogging voor de Gemini-calls. Schrijft kosten-/
// snelheidssignalen weg naar ai_usage_log zodat we per endpoint zicht houden
// op latency, cache-effectiviteit en fouten (#31). Faalt altijd stil: logging
// mag een AI-response nooit vertragen of blokkeren.

export interface AiUsageRecord {
  endpoint: string
  model?: string
  latencyMs?: number
  cached?: boolean
  success?: boolean
  promptChars?: number
  responseChars?: number
  error?: string
  userId?: string | null
  weddingId?: string | null
}

export function logAiUsage(record: AiUsageRecord): void {
  // Fire-and-forget; bewust niet awaiten in de hot path.
  void (async () => {
    try {
      const admin = createRawAdminClient()
      await admin.from('ai_usage_log').insert({
        endpoint: record.endpoint,
        model: record.model ?? '',
        latency_ms: record.latencyMs ?? null,
        cached: record.cached ?? false,
        success: record.success ?? true,
        prompt_chars: record.promptChars ?? null,
        response_chars: record.responseChars ?? null,
        error: record.error ?? null,
        user_id: record.userId ?? null,
        wedding_id: record.weddingId ?? null,
      })
    } catch {
      // Bewust leeg — instrumentatie mag de app nooit raken.
    }
  })()
}
