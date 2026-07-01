'use client'

import * as React from 'react'
import { AlertTriangle, CheckCircle2, Scale, Sparkles, Target, X } from 'lucide-react'

import { buildAIContext } from '@/lib/bruiloft/aiContext'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { Button, Card, CardContent, LoadingDots } from '@/components/bruiloft/ui'
import type { AIBudgetAdvies as AIBudgetAdviesType } from '@/app/api/ai/budget/route'

// Vier vaste secties die samen het budgetverhaal vertellen, van "wat gaat
// goed" tot "wat nu te doen". Zelfde rustige, witruimte-gedreven opmaak als
// de AI-planner-pagina: geen gekleurde vlakken, alleen een dun lijntje tussen
// secties en een gedempt icoon per kop.
const SECTIE_STIJL = {
  statusEnSuccessen: { titel: 'Huidige status & successen', icon: CheckCircle2 },
  risicosEnBlindeVlekken: { titel: "Risico's & blinde vlekken", icon: AlertTriangle },
  marktvergelijking: { titel: 'Marktvergelijking & benchmark', icon: Scale },
  conclusieEnAdvies: { titel: 'Conclusie & concreet advies', icon: Target },
} as const

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
      <span className="text-foreground">{children}</span>
    </li>
  )
}

function Sectie({
  sectie,
  eerste,
  children,
}: {
  sectie: keyof typeof SECTIE_STIJL
  eerste?: boolean
  children: React.ReactNode
}) {
  const stijl = SECTIE_STIJL[sectie]
  const Icon = stijl.icon
  return (
    <section className={eerste ? 'pt-2' : 'border-t border-border pt-6'}>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <h4 className="text-base font-semibold text-foreground">{stijl.titel}</h4>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
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
    <Card className="mb-6">
      <CardContent className="p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-rose-500" />
            <span className="text-lg font-semibold text-foreground">Budgetanalyse</span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
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
          <div>
            <Sectie sectie="statusEnSuccessen" eerste>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {advies.statusEnSuccessen.algemeneIndruk}
              </p>
              {advies.statusEnSuccessen.sterkePunten.length > 0 && (
                <ul className="space-y-2">
                  {advies.statusEnSuccessen.sterkePunten.map((punt, i) => (
                    <Bullet key={i}>{punt}</Bullet>
                  ))}
                </ul>
              )}
            </Sectie>

            <Sectie sectie="risicosEnBlindeVlekken">
              {advies.risicosEnBlindeVlekken.verbeterpunten.length > 0 && (
                <ul className="space-y-2">
                  {advies.risicosEnBlindeVlekken.verbeterpunten.map((punt, i) => (
                    <Bullet key={i}>{punt}</Bullet>
                  ))}
                </ul>
              )}
              {advies.risicosEnBlindeVlekken.ontbrekendeKosten.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Mogelijk vergeten posten
                  </p>
                  <ul className="space-y-2">
                    {advies.risicosEnBlindeVlekken.ontbrekendeKosten.map((punt, i) => (
                      <Bullet key={i}>{punt}</Bullet>
                    ))}
                  </ul>
                </div>
              )}
            </Sectie>

            <Sectie sectie="marktvergelijking">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {advies.marktvergelijking.begrootVsDaadwerkelijk}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {advies.marktvergelijking.benchmarkAnalyse}
              </p>
            </Sectie>

            <Sectie sectie="conclusieEnAdvies">
              <p className="text-sm font-medium leading-relaxed text-foreground">
                {advies.conclusieEnAdvies.haalbaarheid}
              </p>
              {advies.conclusieEnAdvies.actiepunten.length > 0 && (
                <ul className="space-y-2">
                  {advies.conclusieEnAdvies.actiepunten.map((punt, i) => (
                    <Bullet key={i}>{punt}</Bullet>
                  ))}
                </ul>
              )}
            </Sectie>

            <div className="mt-6 border-t border-border pt-4">
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
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
