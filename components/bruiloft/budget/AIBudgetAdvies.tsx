'use client'

import * as React from 'react'
import { AlertTriangle, CheckCircle2, Info, Loader2, Sparkles, X } from 'lucide-react'

import { buildAIContext } from '@/lib/bruiloft/aiContext'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { Button, Card, CardContent } from '@/components/bruiloft/ui'
import type { AIBudgetAdvies } from '@/app/api/ai/budget/route'

const TYPE_STIJL = {
  waarschuwing: {
    icon: AlertTriangle,
    klasse: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
    iconKlasse: 'text-amber-500',
  },
  tip: {
    icon: Info,
    klasse: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300',
    iconKlasse: 'text-blue-500',
  },
  positief: {
    icon: CheckCircle2,
    klasse: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300',
    iconKlasse: 'text-emerald-500',
  },
}

export function AIBudgetAdvies() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const tasks = useBruiloftStore((s) => s.tasks)
  const vendors = useBruiloftStore((s) => s.vendors)
  const budgetItems = useBruiloftStore((s) => s.budgetItems)
  const guests = useBruiloftStore((s) => s.guests)
  const scheduleItems = useBruiloftStore((s) => s.scheduleItems)

  const [advies, setAdvies] = React.useState<AIBudgetAdvies | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [zichtbaar, setZichtbaar] = React.useState(false)

  async function analyseer() {
    if (!wedding || loading) return
    setLoading(true)
    setError(null)
    setZichtbaar(true)

    try {
      const context = buildAIContext(wedding, tasks, vendors, budgetItems, guests, scheduleItems)
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
  }

  function sluiten() {
    setZichtbaar(false)
    setAdvies(null)
    setError(null)
  }

  return (
    <div className="mb-6">
      {!zichtbaar ? (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={analyseer}
            className="gap-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          >
            <Sparkles className="h-4 w-4" />
            Analyseer mijn budget
          </Button>
        </div>
      ) : (
        <Card className="border-rose-100">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-rose-500" />
                <span className="font-medium text-foreground">AI Budgetanalyse</span>
              </div>
              <button
                onClick={sluiten}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label="Sluiten"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Budget wordt geanalyseerd…
              </div>
            ) : error ? (
              <p className="text-sm text-rose-600">{error}</p>
            ) : advies ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{advies.samenvatting}</p>

                {advies.aandachtspunten.length > 0 && (
                  <ul className="space-y-2">
                    {advies.aandachtspunten.map((punt, i) => {
                      const stijl = TYPE_STIJL[punt.type] ?? TYPE_STIJL.tip
                      const Icon = stijl.icon
                      return (
                        <li
                          key={i}
                          className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${stijl.klasse}`}
                        >
                          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${stijl.iconKlasse}`} />
                          <div>
                            <span className="font-medium capitalize">{punt.categorie}: </span>
                            {punt.bericht}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}

                <p className="text-sm font-medium text-foreground">{advies.algemeneRaad}</p>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={analyseer}
                  className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Opnieuw analyseren
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
