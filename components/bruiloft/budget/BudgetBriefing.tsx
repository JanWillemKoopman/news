'use client'

import * as React from 'react'
import { Check, Pencil } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useCountUp } from '@/lib/bruiloft/useCountUp'
import type { BudgetBriefingRegels, BudgetForecast, BudgetHealthScore, VolgendeActie } from '@/lib/bruiloft/derived'
import { Money } from '@/components/bruiloft/ui'
import { BudgetHealthScoreRing } from './BudgetHealthScoreRing'

// De hoofdrolspeler van de pagina: een persoonlijk geschreven briefing i.p.v.
// een grid met cijfers. Deterministische tekstbouwstenen (regels) staan er
// altijd meteen — de AI-samenvatting verrijkt/vervangt de middelste alinea
// zodra die binnenkomt, maar bepaalt nooit de score of de acties zelf.

interface BudgetBriefingProps {
  healthScore: BudgetHealthScore
  forecast: BudgetForecast
  regels: BudgetBriefingRegels
  volgendeActies: VolgendeActie[]
  reserveBedrag: number
  aiSamenvatting?: string
  kanBewerken: boolean
  onEditReserve?: (bedrag: number) => Promise<void>
}

export function BudgetBriefing({
  healthScore,
  forecast,
  regels,
  volgendeActies,
  reserveBedrag,
  aiSamenvatting,
  kanBewerken,
  onEditReserve,
}: BudgetBriefingProps) {
  const [reserveBewerken, setReserveBewerken] = React.useState(false)
  const [reserveInvoer, setReserveInvoer] = React.useState(String(reserveBedrag))
  const [opslaan, setOpslaan] = React.useState(false)

  const uitgegeven = useCountUp(forecast.uitgegeven)
  const verwacht = useCountUp(forecast.verwachtTotaal)
  const boven = forecast.verschilMetBudget > 0

  const beginReserveBewerken = () => {
    if (!kanBewerken) return
    setReserveInvoer(String(reserveBedrag))
    setReserveBewerken(true)
  }

  const submitReserve = async () => {
    if (!onEditReserve) return
    const bedrag = Math.max(0, Number(reserveInvoer) || 0)
    setOpslaan(true)
    try {
      await onEditReserve(bedrag)
      setReserveBewerken(false)
    } finally {
      setOpslaan(false)
    }
  }

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start">
        <BudgetHealthScoreRing score={healthScore.score} status={healthScore.status} size="lg" className="mx-auto sm:mx-0" />

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-lg font-semibold text-foreground">{regels.groet}</p>
          {regels.countdownRegel ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{regels.countdownRegel}</p>
          ) : null}

          <div className="mt-3 space-y-1 text-[15px] leading-relaxed">
            {aiSamenvatting ? (
              <p className="animate-fade-in text-foreground">{aiSamenvatting}</p>
            ) : (
              <>
                <p className="text-foreground">{regels.scoreRegel}</p>
                <p className="text-muted-foreground">{regels.weekRegel}</p>
                {regels.maandWaarschuwing ? (
                  <p className="text-amber-700">{regels.maandWaarschuwing}</p>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Forecast-triplet + reservefonds */}
      <div className="grid grid-cols-2 gap-4 border-t border-border px-6 py-4 sm:grid-cols-4">
        <BriefingStat label="Uitgegeven" bedrag={uitgegeven} />
        <BriefingStat label="Verwacht totaal" bedrag={verwacht} />
        <BriefingStat
          label={boven ? 'Waarschijnlijk boven budget' : 'Ruimte over t.o.v. budget'}
          bedrag={Math.abs(forecast.verschilMetBudget)}
          kleur={boven ? 'amber' : 'groen'}
        />
        <div>
          <p className="text-xs text-muted-foreground">Reserve</p>
          {reserveBewerken ? (
            <div className="mt-0.5 flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                step={1}
                autoFocus
                value={reserveInvoer}
                onChange={(e) => setReserveInvoer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitReserve()
                  if (e.key === 'Escape') setReserveBewerken(false)
                }}
                className="h-7 w-24 rounded border border-input bg-background px-1.5 text-sm tabular-nums outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={submitReserve}
                disabled={opslaan}
                className="rounded text-xs font-medium text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                Opslaan
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={beginReserveBewerken}
              disabled={!kanBewerken}
              aria-label="Reserve bewerken"
              className={cn(
                'group mt-0.5 flex items-center gap-1 rounded text-lg font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                kanBewerken ? 'cursor-pointer hover:text-primary' : 'cursor-default'
              )}
            >
              <Money bedrag={reserveBedrag} />
              {kanBewerken ? (
                <Pencil className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              ) : null}
            </button>
          )}
        </div>
      </div>

      {/* Volgende acties — nooit meer dan 3, dat is de bedoeling. */}
      {volgendeActies.length > 0 ? (
        <div className="border-t border-border px-6 py-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Vandaag zouden wij doen
          </p>
          <ul className="space-y-2">
            {volgendeActies.map((actie, i) => (
              <li
                key={actie.id}
                className="flex items-start gap-2 animate-slide-up"
                style={{ animationDelay: `${i * 90}ms`, animationFillMode: 'both' }}
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                <span className="text-sm text-foreground">
                  {actie.label}
                  <span className="text-muted-foreground"> — {actie.toelichting}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="border-t border-border bg-muted/30 px-6 py-3">
        <p className="text-sm text-muted-foreground">{regels.afsluiter}</p>
      </div>
    </div>
  )
}

function BriefingStat({
  label,
  bedrag,
  kleur,
}: {
  label: string
  bedrag: number
  kleur?: 'amber' | 'groen'
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <Money
        bedrag={bedrag}
        className={cn(
          'text-lg font-bold',
          kleur === 'amber' && 'text-amber-600',
          kleur === 'groen' && 'text-emerald-600',
          !kleur && 'text-foreground'
        )}
      />
    </div>
  )
}
