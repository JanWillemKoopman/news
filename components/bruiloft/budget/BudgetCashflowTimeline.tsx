'use client'

import * as React from 'react'
import { CreditCard } from 'lucide-react'

import { dagLabel, formatDatumKort } from '@/lib/bruiloft/format'
import { aankomendeTermijnen } from '@/lib/bruiloft/derived'
import { Card, CardContent, Money } from '@/components/bruiloft/ui'
import { capFirst } from '@/lib/utils'
import type { BudgetItem } from '@/lib/bruiloft/types'

// Cashflow + "tijdlijn naar de trouwdag" zijn hier bewust gefuseerd: twee
// schaalniveaus van dezelfde databron (aankomendeTermijnen). variant="compact"
// toont een korte samenvatting, variant="volledig" (limiet=undefined) toont
// alles — zelfde urgentiekleuren, nooit uit sync. Visuele taal geleend van
// AankomendeActiesTimelijn.tsx (dashboard), hier budget-only.

interface BudgetCashflowTimelineProps {
  items: BudgetItem[]
  variant?: 'compact' | 'volledig'
  limiet?: number
}

function dagUrgentieStijl(dagen: number): string {
  if (dagen < 0) return 'text-rose-600 font-medium'
  if (dagen <= 7) return 'text-amber-600 font-medium'
  return 'text-muted-foreground'
}

function dagStreepjeStijl(dagen: number): string {
  if (dagen < 0) return 'bg-rose-500'
  if (dagen <= 7) return 'bg-amber-400'
  return 'bg-border'
}

export function BudgetCashflowTimeline({ items, variant = 'compact', limiet }: BudgetCashflowTimelineProps) {
  const termijnen = React.useMemo(
    () => aankomendeTermijnen(items, variant === 'compact' ? (limiet ?? 5) : undefined),
    [items, variant, limiet]
  )

  if (termijnen.length === 0) return null

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Aankomende betalingen</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {variant === 'compact' ? 'De eerstvolgende betaaltermijnen.' : 'Alle openstaande betaaltermijnen.'}
          </p>
        </div>

        <ul className="space-y-3">
          {termijnen.map(({ term, item, dagen }) => (
            <li key={term.id} className="flex items-center gap-3">
              <div className={`h-8 w-0.5 shrink-0 rounded-full ${dagStreepjeStijl(dagen)}`} aria-hidden />
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {capFirst(item.omschrijving || item.categorie)}
                </p>
                <p className={`text-xs ${dagUrgentieStijl(dagen)}`}>
                  Vervalt {formatDatumKort(term.vervaldatum)} · {dagLabel(dagen)}
                </p>
              </div>
              <Money bedrag={term.bedrag} className="shrink-0 text-sm font-semibold text-foreground" />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
