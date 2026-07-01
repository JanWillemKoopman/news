'use client'

import * as React from 'react'

import { buildAIContext } from '@/lib/bruiloft/aiContext'
import { useBruiloftStore } from '@/store/bruiloftStore'
import type { AIBudgetAdvies } from '@/app/api/ai/budget/route'

// Eén AI-call voor de hele budgetpagina — voedt zowel de Briefing
// (samenvatting) als de Coach-inzichten-sectie (aandachtspunten). Was eerst
// een losse fetch per modal-open; nu auto-fetch bij het laden van de
// pagina, met dezelfde server-side cache/cooldown — geen kostenstijging.
export function useBudgetAIAdvies() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const tasks = useBruiloftStore((s) => s.tasks)
  const vendors = useBruiloftStore((s) => s.vendors)
  const budgetItems = useBruiloftStore((s) => s.budgetItems)
  const guests = useBruiloftStore((s) => s.guests)
  const scheduleItems = useBruiloftStore((s) => s.scheduleItems)
  const websiteContent = useBruiloftStore((s) => s.websiteContent)

  const [advies, setAdvies] = React.useState<AIBudgetAdvies | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const gestart = React.useRef(false)

  const analyseer = React.useCallback(async () => {
    if (!wedding || loading) return
    setLoading(true)
    setError(null)
    try {
      const context = buildAIContext(wedding, tasks, vendors, budgetItems, guests, scheduleItems, websiteContent)
      const res = await fetch('/api/ai/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, weddingId: wedding.id }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Onbekende fout' }))
        throw new Error(body.error ?? 'Fout bij ophalen advies')
      }
      const json = await res.json()
      setAdvies(json.advies)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI tijdelijk niet beschikbaar')
    } finally {
      setLoading(false)
    }
  }, [wedding, tasks, vendors, budgetItems, guests, scheduleItems, websiteContent, loading])

  React.useEffect(() => {
    if (wedding && !gestart.current) {
      gestart.current = true
      analyseer()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wedding?.id])

  return { advies, loading, error, refresh: analyseer }
}
