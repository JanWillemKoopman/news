'use client'

import * as React from 'react'
import { AlertTriangle, CheckCircle2, Info, Sparkles, X } from 'lucide-react'

import { buildAIContext } from '@/lib/bruiloft/aiContext'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { Button, Card, CardContent, LoadingDots } from '@/components/bruiloft/ui'
import { capFirst } from '@/lib/utils'
import type { AIBudgetAdvies as AIBudgetAdviesType } from '@/app/api/ai/budget/route'

// Rustige, merkeigen tonen i.p.v. felle verkeerslicht-kleuren: grijs voor een
// aandachtspunt, rhino-blauw voor een tip, paars voor iets positiefs.
const TYPE_STIJL = {
  waarschuwing: {
    icon: AlertTriangle,
    klasse: 'border-border bg-muted/50 text-foreground',
    iconKlasse: 'text-rose-500',
  },
  tip: {
    icon: Info,
    klasse: 'border-rhino-200 bg-rhino-50 text-rhino-800 dark:border-rhino-800 dark:bg-rhino-950/40 dark:text-rhino-200',
    iconKlasse: 'text-rhino-600',
  },
  positief: {
    icon: CheckCircle2,
    klasse: 'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300',
    iconKlasse: 'text-violet-500',
  },
}

interface AIBudgetAdviesProps {
  open: boolean
  onClose: () => void
}

export function AIBudgetAdvies({ open, onClose }: AIBudgetAdviesProps) {
  const wedding = useBruiloftStore((s) => s.wedding)
  const tasks = useBruiloftStore((s) => s.tasks)
  const vendors = useBruiloftStore((s) => s.vendors)
  const budgetItems = useBruiloftStore((s) => s.budgetItems)
  const guests = useBruiloftStore((s) => s.guests)
  const scheduleItems = useBruiloftStore((s) => s.scheduleItems)
  const websiteContent = useBruiloftStore((s) => s.websiteContent)

  const [advies, setAdvies] = React.useState<AIBudgetAdviesType | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const analyseer = React.useCallback(async () => {
    if (!wedding || loading) return
    setLoading(true)
    setError(null)
    setAdvies(null)

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
    if (open && !advies && !loading) {
      analyseer()
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  return (
    <Card className="mb-6 border-rose-100">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-rose-500" />
            <span className="font-medium text-foreground">Budgetanalyse</span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label="Sluiten"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
            <LoadingDots />
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
                        <span className="font-medium">{capFirst(punt.categorie)}: </span>
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
  )
}
