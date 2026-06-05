'use client'

import { Card, CardContent, Money } from '@/components/bruiloft/ui'
import { budgetTotalen } from '@/lib/bruiloft/derived'
import { formatEuro } from '@/lib/bruiloft/format'
import { cn } from '@/lib/utils'
import type { BudgetItem, Vendor, Wedding } from '@/lib/bruiloft/types'

interface BudgetSummaryProps {
  items: BudgetItem[]
  vendors: Vendor[]
  wedding: Wedding
}

export function BudgetSummary({ items, vendors, wedding }: BudgetSummaryProps) {
  const totalen = budgetTotalen(items, vendors, wedding)

  const pct =
    wedding.totaalBudget > 0
      ? Math.min(100, Math.round((totalen.totaalBetaald / wedding.totaalBudget) * 100))
      : 0

  const overBudget = totalen.totaalGeschat > wedding.totaalBudget
  const overBudgetBedrag = totalen.totaalGeschat - wedding.totaalBudget
  const nogTeBetalen = Math.max(0, totalen.totaalGeschat - totalen.totaalBetaald)

  const r = 28
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
          {/* Progress donut + voortgang */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <svg width="68" height="68" viewBox="0 0 68 68" className="-rotate-90">
                <circle
                  cx="34" cy="34" r={r}
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="8"
                />
                <circle
                  cx="34" cy="34" r={r}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="8"
                  strokeDasharray={circ}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground">
                {pct}%
              </span>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground">Voortgang</p>
              <p className="font-bold text-foreground">
                <Money bedrag={totalen.totaalBetaald} /> van <Money bedrag={wedding.totaalBudget} /> betaald
              </p>
              {overBudget ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Geschat {formatEuro(totalen.totaalGeschat)} · {formatEuro(overBudgetBedrag)} boven budget
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Geschat {formatEuro(totalen.totaalGeschat)}
                </p>
              )}
            </div>
          </div>

          <div className="hidden h-12 w-px bg-border sm:block" />

          {/* Stat tiles */}
          <div className="grid grid-cols-3 gap-4 sm:flex sm:gap-8">
            <Stat label="geschat" bedrag={totalen.totaalGeschat} />
            <Stat label="nog te betalen" bedrag={nogTeBetalen} />
            {overBudget ? (
              <Stat label="boven budget" bedrag={overBudgetBedrag} kleur="amber" />
            ) : (
              <Stat label="resterend budget" bedrag={totalen.resterendBudget} kleur="groen" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function Stat({
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
      <Money
        bedrag={bedrag}
        className={cn(
          'text-xl font-bold',
          kleur === 'amber' && 'text-amber-600 dark:text-amber-400',
          kleur === 'groen' && 'text-emerald-600 dark:text-emerald-400',
          !kleur && 'text-foreground'
        )}
      />
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
