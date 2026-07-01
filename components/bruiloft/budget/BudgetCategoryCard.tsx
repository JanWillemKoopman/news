'use client'

import { ChevronRight } from 'lucide-react'

import { capFirst, cn } from '@/lib/utils'
import { formatEuro } from '@/lib/bruiloft/format'
import { geboekteLeverancierVoor } from '@/lib/bruiloft/derived'
import type { CategorieData } from '@/lib/bruiloft/derived'
import { getBudgetCategorieIcoon } from '@/lib/bruiloft/budgetCategorieIcoon'
import { Card, CardContent, StatusBadge } from '@/components/bruiloft/ui'
import { VendorAvatar } from './VendorAvatar'
import type { Vendor } from '@/lib/bruiloft/types'

interface BudgetCategoryCardProps {
  data: CategorieData
  vendors: Vendor[]
  bevestigdeDaggasten?: number
  afwijkend: boolean
  onClick: () => void
}

export function BudgetCategoryCard({
  data,
  vendors,
  bevestigdeDaggasten = 0,
  afwijkend,
  onClick,
}: BudgetCategoryCardProps) {
  const Icon = getBudgetCategorieIcoon(data.naam)
  const begroot = data.verwacht > 0 ? data.verwacht : data.geschat
  const voortgangPct = data.verwacht > 0 ? Math.min(100, (data.betaald / data.verwacht) * 100) : 0

  const subtitle =
    data.naam === 'catering' && bevestigdeDaggasten > 0
      ? `referentie: ${bevestigdeDaggasten} bevestigde daggast${bevestigdeDaggasten === 1 ? '' : 'en'}`
      : data.items.length > 1
        ? `${data.items.length} posten`
        : null

  const geboekteVendors = Array.from(
    new Map(
      data.items
        .map((item) => geboekteLeverancierVoor(item, vendors))
        .filter((v): v is Vendor => v !== null)
        .map((v) => [v.id, v] as const)
    ).values()
  )

  return (
    <Card
      interactive
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        afwijkend && 'border-amber-300'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{capFirst(data.naam)}</p>
              {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
            </div>
          </div>
          <ChevronRight className="mt-1.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <StatusBadge kind="budget" value={data.status} />
          {geboekteVendors.length > 0 ? (
            <div className="flex -space-x-1">
              {geboekteVendors.slice(0, 3).map((v) => (
                <VendorAvatar key={v.id} vendor={v} size="sm" />
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              data.status === 'boven schatting'
                ? 'bg-amber-500'
                : data.status === 'betaald'
                  ? 'bg-emerald-500'
                  : 'bg-primary'
            )}
            style={{ width: `${Math.max(voortgangPct, 0)}%` }}
          />
        </div>

        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">
            {data.betaald === 0 ? 'nog niets betaald' : `${formatEuro(data.betaald)} betaald`}
          </span>
          <span className="text-sm font-semibold text-foreground">{formatEuro(begroot)}</span>
        </div>
      </CardContent>
    </Card>
  )
}
