'use client'

import * as React from 'react'

import { createRawClient } from '@/lib/supabase/client'
import { trackEvent } from '@/lib/analytics'

const SHOW_THRESHOLD = 5
const RE_SHOW_THRESHOLD = 10
const STORAGE_KEY_PREFIX = 'otp:ai-promotie-weggeklikt:'

type DismissalState = { dismissedAtCount: number }

export function useAIPromotiePopup(weddingId: string | null) {
  const [changeCount, setChangeCount] = React.useState(0)
  const [checked, setChecked] = React.useState(false)
  const [dismissalState, setDismissalState] = React.useState<DismissalState | null>(null)

  React.useEffect(() => {
    if (!weddingId) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PREFIX + weddingId)
      setDismissalState(raw ? (JSON.parse(raw) as DismissalState) : null)
    } catch {
      setDismissalState(null)
    }
  }, [weddingId])

  React.useEffect(() => {
    if (!weddingId) return
    let alive = true

    async function fetchCount() {
      const rawDb = createRawClient()

      const { data: cacheRow } = await rawDb
        .from('ai_advice_cache')
        .select('last_updated_at')
        .eq('wedding_id', weddingId)
        .maybeSingle()

      const baseline = (cacheRow as { last_updated_at: string } | null)?.last_updated_at ?? '1970-01-01T00:00:00Z'

      const { count } = await rawDb
        .from('wedding_activity')
        .select('*', { count: 'exact', head: true })
        .eq('wedding_id', weddingId)
        .gt('created_at', baseline)

      if (!alive) return
      setChangeCount(count ?? 0)
      setChecked(true)
    }

    void fetchCount()
    return () => {
      alive = false
    }
  }, [weddingId])

  const dismiss = React.useCallback(() => {
    if (!weddingId) return
    const state: DismissalState = { dismissedAtCount: changeCount }
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + weddingId, JSON.stringify(state))
    } catch {
      // localStorage niet beschikbaar — alleen in-memory dismissal
    }
    setDismissalState(state)
    void trackEvent('ai_promotie_weggeklikt', { weddingId, changeCount })
  }, [weddingId, changeCount])

  const showPopup = React.useMemo(() => {
    if (!checked) return false
    if (changeCount < SHOW_THRESHOLD) return false
    if (!dismissalState) return true
    return changeCount >= dismissalState.dismissedAtCount + RE_SHOW_THRESHOLD
  }, [checked, changeCount, dismissalState])

  return { showPopup, changeCount, dismiss }
}
