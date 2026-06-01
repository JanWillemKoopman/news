'use client'

import * as React from 'react'
import Link from 'next/link'
import { ChevronRight, RefreshCw, Sparkles } from 'lucide-react'

import { buildAIContext } from '@/lib/bruiloft/aiContext'
import { canEdit } from '@/lib/bruiloft/permissions'
import { dagenTot } from '@/lib/bruiloft/format'
import type { NextStep } from '@/lib/bruiloft/guidance'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { Button, Card, CardContent, Skeleton } from '@/components/bruiloft/ui'
import type { AIAdvies } from '@/app/api/ai/advice/route'

interface AIAdviesPanelProps {
  fallbackSteps: NextStep[]
  trouwdatum: string
}

const URGENTIE_STIJL: Record<AIAdvies['urgentie'], string> = {
  kritiek: 'bg-rose-100 text-rose-700',
  binnenkort: 'bg-amber-100 text-amber-700',
  normaal: 'bg-muted text-muted-foreground',
}

const URGENTIE_LABEL: Record<AIAdvies['urgentie'], string> = {
  kritiek: 'Dringend',
  binnenkort: 'Binnenkort',
  normaal: 'Plannen',
}

// Module-level cache: blijft actief voor de levensduur van de browser-sessie.
const adviesCache = new Map<string, { data: AIAdvies[]; fetchedAt: number }>()
const CACHE_TTL = 10 * 60 * 1000 // 10 minuten

function useFetchAIAdvies(weddingId: string | null) {
  const wedding = useBruiloftStore((s) => s.wedding)
  const tasks = useBruiloftStore((s) => s.tasks)
  const vendors = useBruiloftStore((s) => s.vendors)
  const budgetItems = useBruiloftStore((s) => s.budgetItems)
  const guests = useBruiloftStore((s) => s.guests)
  const scheduleItems = useBruiloftStore((s) => s.scheduleItems)

  const [advies, setAdvies] = React.useState<AIAdvies[] | null>(() => {
    if (!weddingId) return null
    const cached = adviesCache.get(weddingId)
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached.data
    return null
  })
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const fetch = React.useCallback(
    async (forceRefresh = false) => {
      if (!wedding || !weddingId) return
      const cached = adviesCache.get(weddingId)
      if (!forceRefresh && cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
        setAdvies(cached.data)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const context = buildAIContext(wedding, tasks, vendors, budgetItems, guests, scheduleItems)
        const res = await window.fetch('/api/ai/advice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context, weddingId }),
        })
        if (!res.ok) throw new Error(await res.text())
        const json = await res.json()
        if (json.advies?.length > 0) {
          adviesCache.set(weddingId, { data: json.advies, fetchedAt: Date.now() })
          setAdvies(json.advies)
        } else {
          throw new Error('Leeg antwoord van AI')
        }
      } catch (err) {
        console.warn('[AIAdviesPanel] Fetch mislukt, fallback naar rule-based guidance:', err)
        setError('AI tijdelijk niet beschikbaar')
      } finally {
        setLoading(false)
      }
    },
    [wedding, weddingId, tasks, vendors, budgetItems, guests, scheduleItems]
  )

  React.useEffect(() => {
    if (!weddingId) return
    const cached = adviesCache.get(weddingId)
    if (!cached || Date.now() - cached.fetchedAt >= CACHE_TTL) {
      fetch(false)
    }
  }, [weddingId, fetch])

  return { advies, loading, error, refresh: () => fetch(true) }
}

export function AIAdviesPanel({ fallbackSteps, trouwdatum }: AIAdviesPanelProps) {
  const wedding = useBruiloftStore((s) => s.wedding)
  const updateTask = useBruiloftStore((s) => s.updateTask)
  const permissions = useBruiloftStore((s) => s.permissions)
  const mayEditTaken = canEdit(permissions, 'taken')
  const [bezig, setBezig] = React.useState<string | null>(null)

  const { advies, loading, error, refresh } = useFetchAIAdvies(wedding?.id ?? null)

  const dagen = dagenTot(trouwdatum)

  async function afrondenFallback(taskId: string) {
    if (bezig) return
    setBezig(taskId)
    try {
      await updateTask(taskId, { status: 'klaar' })
    } finally {
      setBezig(null)
    }
  }

  return (
    <Card className="border-rhino-100">
      <CardContent className="p-6">
        <div className="mb-5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-rose-500" />
            <h2 className="font-serif text-2xl font-medium text-foreground">Wat nu?</h2>
          </div>
          {!loading && (
            <Button
              variant="ghost"
              size="sm"
              onClick={refresh}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              aria-label="Advies verversen"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Verversen
            </Button>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-4 py-2">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24 rounded-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : advies && advies.length > 0 ? (
          <ul className="divide-y divide-border">
            {advies.map((stap) => (
              <li key={stap.id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${URGENTIE_STIJL[stap.urgentie]}`}
                    >
                      {URGENTIE_LABEL[stap.urgentie]}
                    </span>
                    <span className="text-xs text-muted-foreground">{stap.sectionLabel}</span>
                  </div>
                  <p className="font-medium text-foreground">{stap.titel}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{stap.omschrijving}</p>
                </div>
                <Link
                  href={stap.sectie}
                  className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-rose-600 hover:text-rose-700"
                >
                  Bekijken
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          // Fallback naar rule-based guidance als AI niet beschikbaar is
          <>
            {error && (
              <p className="mb-3 text-xs text-muted-foreground">
                AI-advies tijdelijk niet beschikbaar — onderstaande suggesties zijn automatisch gegenereerd.
              </p>
            )}
            {fallbackSteps.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                {dagen < 0
                  ? 'Gefeliciteerd met jullie huwelijk! Nog een paar dingen om af te ronden.'
                  : 'Jullie liggen op koers — niets dringends nu.'}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {fallbackSteps.slice(0, 3).map((stap) => (
                  <li key={stap.id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            stap.urgentie === 'kritiek'
                              ? 'bg-rose-100 text-rose-700'
                              : stap.urgentie === 'binnenkort'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {stap.urgentie === 'kritiek'
                            ? 'Dringend'
                            : stap.urgentie === 'binnenkort'
                              ? 'Binnenkort'
                              : 'Plannen'}
                        </span>
                      </div>
                      <p className="font-medium text-foreground">{stap.titel}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{stap.omschrijving}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {stap.bron === 'taak' && mayEditTaken && stap.taskId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => afrondenFallback(stap.taskId!)}
                          disabled={bezig === stap.taskId}
                          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                        >
                          Afronden
                        </Button>
                      )}
                      <Link
                        href={stap.href}
                        className="inline-flex items-center gap-1 text-sm font-medium text-rose-600 hover:text-rose-700"
                      >
                        Bekijken
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
