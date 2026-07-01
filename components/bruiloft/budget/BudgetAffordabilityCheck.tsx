'use client'

import * as React from 'react'
import { Sparkles } from 'lucide-react'

import { cn } from '@/lib/utils'
import { beoordeelUitgave } from '@/lib/bruiloft/derived'
import type { BudgetTotalen } from '@/lib/bruiloft/derived'
import { Card, CardContent } from '@/components/bruiloft/ui'

// "Kan het nog?" — beantwoordt de vraag die een gebruiker écht heeft
// ("hebben we hier ruimte voor?") in plaats van dat ze zelf "vrij
// besteedbaar" moeten aftrekken. Puur client-side rekenwerk, geen opslag.

interface BudgetAffordabilityCheckProps {
  totalen: BudgetTotalen
  reserveBedrag: number
}

const OORDEEL_STIJL: Record<'past' | 'krap' | 'te_veel', string> = {
  past: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300',
  krap: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300',
  te_veel: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300',
}

export function BudgetAffordabilityCheck({ totalen, reserveBedrag }: BudgetAffordabilityCheckProps) {
  const [invoer, setInvoer] = React.useState('')
  const bedrag = Number(invoer) || 0
  const resultaat = bedrag > 0 ? beoordeelUitgave(bedrag, totalen, reserveBedrag) : null

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="mb-1 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="text-base font-semibold text-foreground">Kan het nog?</h2>
        </div>
        <p className="mb-3 text-sm text-muted-foreground">
          Overweeg je een extra uitgave? Vul het bedrag in en zie direct of het past.
        </p>

        <div className="relative w-40">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            €
          </span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={invoer}
            onChange={(e) => setInvoer(e.target.value)}
            placeholder="0"
            aria-label="Overwogen bedrag in euro"
            className="h-10 w-full rounded-lg border border-input bg-background pl-7 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {resultaat ? (
          <div
            className={cn(
              'mt-4 animate-fade-in rounded-lg border px-4 py-3 text-sm font-medium',
              OORDEEL_STIJL[resultaat.oordeel]
            )}
            role="status"
          >
            {resultaat.toelichting}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
