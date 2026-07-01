'use client'

import { Pencil } from 'lucide-react'

import { Button, Money } from '@/components/bruiloft/ui'
import { budgetTotalen } from '@/lib/bruiloft/derived'
import { formatEuro } from '@/lib/bruiloft/format'
import { cn } from '@/lib/utils'
import type { BudgetItem, Vendor, Wedding } from '@/lib/bruiloft/types'

interface BudgetSummaryProps {
  items: BudgetItem[]
  vendors: Vendor[]
  wedding: Wedding
  onEditTotaalBudget?: () => void
}

function CircularProgress({ pct }: { pct: number }) {
  const r = 26
  const circumference = 2 * Math.PI * r
  const offset = circumference - (pct / 100) * circumference

  return (
    <svg width={64} height={64} className="shrink-0 -rotate-90">
      <circle cx={32} cy={32} r={r} fill="none" stroke="#e5e7eb" strokeWidth={4} />
      <circle
        cx={32} cy={32} r={r}
        fill="none"
        stroke="#be123c"
        strokeWidth={4}
        strokeOpacity={0.6}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-500"
      />
      <text
        x={32} y={32}
        textAnchor="middle"
        dominantBaseline="central"
        style={{ transform: 'rotate(90deg)', transformOrigin: '32px 32px', fontSize: 11, fontWeight: 500, fill: '#6b7280' }}
      >
        {pct}%
      </text>
    </svg>
  )
}

export function BudgetSummary({ items, vendors, wedding, onEditTotaalBudget }: BudgetSummaryProps) {
  const totalen = budgetTotalen(items, vendors, wedding)

  const pct =
    wedding.totaalBudget > 0
      ? Math.min(100, Math.round((totalen.totaalBetaald / wedding.totaalBudget) * 100))
      : 0

  const overBudget = totalen.totaalGeschat > wedding.totaalBudget
  const overBudgetBedrag = totalen.totaalGeschat - wedding.totaalBudget
  const nogTeBetalen = Math.max(0, totalen.totaalGeschat - totalen.totaalBetaald)

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      {/* Totaalbudget + bewerken */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Totaalbudget</p>
          <Money bedrag={wedding.totaalBudget} className="text-base font-semibold text-foreground" />
        </div>
        {onEditTotaalBudget ? (
          <Button variant="ghost" size="icon" aria-label="Totaalbudget bewerken" onClick={onEditTotaalBudget}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>

      {/* Main progress row */}
      <div className="flex items-center gap-4 p-4">
        <CircularProgress pct={pct} />

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">Voortgang</p>
          <p className="text-base font-semibold leading-tight text-foreground">
            <Money bedrag={totalen.totaalBetaald} /> van <Money bedrag={wedding.totaalBudget} /> betaald
          </p>
          {overBudget ? (
            <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
              Geschat {formatEuro(totalen.totaalGeschat)} · {formatEuro(overBudgetBedrag)} boven budget
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Geschat {formatEuro(totalen.totaalGeschat)}
            </p>
          )}
        </div>

        {/* Desktop stats */}
        <div className="hidden items-center divide-x divide-border sm:flex">
          <StatNum label="geschat" bedrag={totalen.totaalGeschat} />
          <StatNum label="nog te betalen" bedrag={nogTeBetalen} />
          {overBudget ? (
            <StatNum label="boven budget" bedrag={overBudgetBedrag} kleur="amber" />
          ) : (
            <StatNum label="budget over" bedrag={totalen.resterendBudget} kleur="groen" />
          )}
        </div>
      </div>

      {/* Mobile stats row */}
      <div className="flex divide-x divide-border border-t border-border sm:hidden">
        <StatNumMobile label="geschat" bedrag={totalen.totaalGeschat} />
        <StatNumMobile label="nog te betalen" bedrag={nogTeBetalen} />
        {overBudget ? (
          <StatNumMobile label="boven budget" bedrag={overBudgetBedrag} kleur="amber" />
        ) : (
          <StatNumMobile label="budget over" bedrag={totalen.resterendBudget} kleur="groen" />
        )}
      </div>
    </div>
  )
}

function StatNum({
  label,
  bedrag,
  kleur,
}: {
  label: string
  bedrag: number
  kleur?: 'amber' | 'groen'
}) {
  return (
    <div className="px-5 text-center">
      <Money
        bedrag={bedrag}
        className={cn(
          'text-2xl font-bold tabular-nums',
          kleur === 'amber' && 'text-amber-600 dark:text-amber-400',
          kleur === 'groen' && 'text-emerald-600 dark:text-emerald-400',
          !kleur && 'text-foreground'
        )}
      />
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function StatNumMobile({
  label,
  bedrag,
  kleur,
}: {
  label: string
  bedrag: number
  kleur?: 'amber' | 'groen'
}) {
  return (
    <div className="flex-1 py-2.5 text-center">
      <Money
        bedrag={bedrag}
        className={cn(
          'text-lg font-bold tabular-nums',
          kleur === 'amber' && 'text-amber-600 dark:text-amber-400',
          kleur === 'groen' && 'text-emerald-600 dark:text-emerald-400',
          !kleur && 'text-foreground'
        )}
      />
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
