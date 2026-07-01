'use client'

import { AlertTriangle, CheckCircle2, Info, RefreshCw, Sparkles } from 'lucide-react'

import { capFirst, cn } from '@/lib/utils'
import { Button, Card, CardContent, LoadingDots } from '@/components/bruiloft/ui'
import type { BudgetWaarschuwing } from '@/lib/bruiloft/derived'
import type { AIBudgetAdvies } from '@/app/api/ai/budget/route'

// Coach-inzichten: verdieping ná de Briefing, niet de briefing zelf. Altijd
// zichtbaar zodra er iets te tonen is — geen modal, geen klik om te openen.
// Zelfde kleuren/iconen als de vorige (modal-)versie, voor continuïteit.

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
} as const

// Zet een deterministische waarschuwing om naar hetzelfde weergaveformaat als
// een AI-aandachtspunt, zodat de sectie nooit leeg is — ook niet als de
// AI-call faalt of rate-limited is.
function waarschuwingNaarType(type: BudgetWaarschuwing['type']): keyof typeof TYPE_STIJL {
  if (type === 'reserve_laag' || type === 'geen_leverancier') return 'tip'
  return 'waarschuwing'
}

interface BudgetAICoachPanelProps {
  advies: AIBudgetAdvies | null
  loading: boolean
  error: string | null
  onRefresh: () => void
  waarschuwingenFallback: BudgetWaarschuwing[]
}

export function BudgetAICoachPanel({
  advies,
  loading,
  error,
  onRefresh,
  waarschuwingenFallback,
}: BudgetAICoachPanelProps) {
  const toontFallback = !advies

  return (
    <Card className="mb-6">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-rose-500" aria-hidden />
            <span className="font-medium text-foreground">Coach-inzichten</span>
          </div>
          {!loading ? (
            <button
              type="button"
              onClick={onRefresh}
              aria-label="Inzichten verversen"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        {advies ? (
          <div className="space-y-4 animate-fade-in">
            {advies.aandachtspunten.length > 0 ? (
              <ul className="space-y-2">
                {advies.aandachtspunten.map((punt, i) => {
                  const stijl = TYPE_STIJL[punt.type] ?? TYPE_STIJL.tip
                  const Icon = stijl.icon
                  return (
                    <li
                      key={i}
                      className={cn('flex items-start gap-3 rounded-lg border px-4 py-3 text-sm', stijl.klasse)}
                    >
                      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', stijl.iconKlasse)} aria-hidden />
                      <div>
                        <span className="font-medium">{capFirst(punt.categorie)}: </span>
                        {punt.bericht}
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : null}
            {advies.algemeneRaad ? (
              <p className="text-sm font-medium text-foreground">{advies.algemeneRaad}</p>
            ) : null}
          </div>
        ) : toontFallback ? (
          <div className="space-y-3">
            {waarschuwingenFallback.length > 0 ? (
              <ul className="space-y-2">
                {waarschuwingenFallback.map((w) => {
                  const stijl = TYPE_STIJL[waarschuwingNaarType(w.type)]
                  const Icon = stijl.icon
                  return (
                    <li
                      key={w.id}
                      className={cn('flex items-start gap-3 rounded-lg border px-4 py-3 text-sm', stijl.klasse)}
                    >
                      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', stijl.iconKlasse)} aria-hidden />
                      <div>{w.bericht}</div>
                    </li>
                  )
                })}
              </ul>
            ) : !loading ? (
              <div
                className={cn('flex items-start gap-3 rounded-lg border px-4 py-3 text-sm', TYPE_STIJL.positief.klasse)}
              >
                <CheckCircle2 className={cn('mt-0.5 h-4 w-4 shrink-0', TYPE_STIJL.positief.iconKlasse)} aria-hidden />
                <div>Geen bijzonderheden op dit moment. Goed bezig!</div>
              </div>
            ) : null}
            {loading ? (
              <div className="flex items-center gap-3 py-1 text-sm text-muted-foreground">
                <LoadingDots />
                AI verrijkt deze inzichten…
              </div>
            ) : error ? (
              <p className="text-xs text-muted-foreground">
                Uitgebreide AI-analyse tijdelijk niet beschikbaar — bovenstaande signalen zijn automatisch berekend.
              </p>
            ) : null}
          </div>
        ) : null}

        {advies ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            className="mt-4 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Opnieuw analyseren
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
