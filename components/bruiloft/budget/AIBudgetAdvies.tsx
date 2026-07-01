'use client'

import * as React from 'react'
import { AlertTriangle, CheckCircle2, Scale, Sparkles, Target, X } from 'lucide-react'

import { buildAIContext } from '@/lib/bruiloft/aiContext'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { Button, Card, CardContent, LoadingDots } from '@/components/bruiloft/ui'
import type { AIBudgetAdvies as AIBudgetAdviesType } from '@/app/api/ai/budget/route'

// Vier vaste secties die samen het budgetverhaal vertellen, van "wat gaat
// goed" tot "wat nu te doen" — rustige, merkeigen tonen i.p.v. felle
// verkeerslicht-kleuren.
const SECTIE_STIJL = {
  statusEnSuccessen: {
    titel: 'Huidige status & successen',
    icon: CheckCircle2,
    klasse: 'border-violet-200 bg-violet-50 dark:border-violet-900 dark:bg-violet-950/40',
    iconKlasse: 'text-violet-500',
  },
  risicosEnBlindeVlekken: {
    titel: "Risico's & blinde vlekken",
    icon: AlertTriangle,
    klasse: 'border-border bg-muted/50',
    iconKlasse: 'text-rose-500',
  },
  marktvergelijking: {
    titel: 'Marktvergelijking & benchmark',
    icon: Scale,
    klasse: 'border-rhino-200 bg-rhino-50 dark:border-rhino-800 dark:bg-rhino-950/40',
    iconKlasse: 'text-rhino-600',
  },
  conclusieEnAdvies: {
    titel: 'Conclusie & concreet advies',
    icon: Target,
    klasse: 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40',
    iconKlasse: 'text-rose-500',
  },
} as const

function SectieTitel({ sectie }: { sectie: keyof typeof SECTIE_STIJL }) {
  const stijl = SECTIE_STIJL[sectie]
  const Icon = stijl.icon
  return (
    <div className="mb-2 flex items-center gap-2">
      <Icon className={`h-4 w-4 shrink-0 ${stijl.iconKlasse}`} />
      <h4 className="text-sm font-semibold text-foreground">{stijl.titel}</h4>
    </div>
  )
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
            <section className={`rounded-lg border p-4 ${SECTIE_STIJL.statusEnSuccessen.klasse}`}>
              <SectieTitel sectie="statusEnSuccessen" />
              <p className="text-sm text-foreground">{advies.statusEnSuccessen.algemeneIndruk}</p>
              {advies.statusEnSuccessen.sterkePunten.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground">
                  {advies.statusEnSuccessen.sterkePunten.map((punt, i) => (
                    <li key={i}>{punt}</li>
                  ))}
                </ul>
              )}
            </section>

            <section className={`rounded-lg border p-4 ${SECTIE_STIJL.risicosEnBlindeVlekken.klasse}`}>
              <SectieTitel sectie="risicosEnBlindeVlekken" />
              {advies.risicosEnBlindeVlekken.verbeterpunten.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
                  {advies.risicosEnBlindeVlekken.verbeterpunten.map((punt, i) => (
                    <li key={i}>{punt}</li>
                  ))}
                </ul>
              )}
              {advies.risicosEnBlindeVlekken.ontbrekendeKosten.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Mogelijk vergeten posten
                  </p>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
                    {advies.risicosEnBlindeVlekken.ontbrekendeKosten.map((punt, i) => (
                      <li key={i}>{punt}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section className={`rounded-lg border p-4 ${SECTIE_STIJL.marktvergelijking.klasse}`}>
              <SectieTitel sectie="marktvergelijking" />
              <p className="text-sm text-foreground">{advies.marktvergelijking.begrootVsDaadwerkelijk}</p>
              <p className="mt-2 text-sm text-foreground">{advies.marktvergelijking.benchmarkAnalyse}</p>
            </section>

            <section className={`rounded-lg border p-4 ${SECTIE_STIJL.conclusieEnAdvies.klasse}`}>
              <SectieTitel sectie="conclusieEnAdvies" />
              <p className="text-sm font-medium text-foreground">{advies.conclusieEnAdvies.haalbaarheid}</p>
              {advies.conclusieEnAdvies.actiepunten.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground">
                  {advies.conclusieEnAdvies.actiepunten.map((punt, i) => (
                    <li key={i}>{punt}</li>
                  ))}
                </ul>
              )}
            </section>

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
