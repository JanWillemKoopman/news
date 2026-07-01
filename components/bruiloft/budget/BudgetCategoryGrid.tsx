'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { LayoutGrid, PieChart, Search, X } from 'lucide-react'

import { budgetPerCategorie, budgetTotalen } from '@/lib/bruiloft/derived'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/bruiloft/ui'
import { BudgetCategoryCard } from './BudgetCategoryCard'
import type { BudgetItem, Vendor, Wedding } from '@/lib/bruiloft/types'

// Grafieken zijn zwaarder (recharts) en worden hier vandaag voor het eerst
// gebruikt buiten /admin — pas laden zodra de gebruiker er echt voor kiest.
const BudgetChartDashboard = dynamic(() => import('./BudgetChartDashboard'), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Skeleton className="h-72 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  ),
})

// Secundaire sectie — "Details per categorie". Bewust rustiger dan de
// Briefing/Coach erboven: kleinere sectiekop, cards i.p.v. accordion. Filter
// als chip-rij (patroon geïnspireerd op CategorieVoortgang.tsx bij
// leveranciers, hier zelf gebouwd omdat dat component hard gekoppeld is aan
// vendor-types).

type Filter = 'alle' | 'aandacht' | 'nog te plannen' | 'betaald'

type Weergave = 'cards' | 'grafieken'

interface BudgetCategoryGridProps {
  items: BudgetItem[]
  vendors: Vendor[]
  wedding: Wedding
  bevestigdeDaggasten: number
  afwijkendeItemIds?: Set<string>
  onOpenCategorie: (categorie: string) => void
}

export function BudgetCategoryGrid({
  items,
  vendors,
  wedding,
  bevestigdeDaggasten,
  afwijkendeItemIds,
  onOpenCategorie,
}: BudgetCategoryGridProps) {
  const [zoekterm, setZoekterm] = React.useState('')
  const [filter, setFilter] = React.useState<Filter>('alle')
  const [weergave, setWeergave] = React.useState<Weergave>('cards')

  const categories = React.useMemo(() => budgetPerCategorie(items, vendors), [items, vendors])
  const perCategorie = React.useMemo(
    () => budgetTotalen(items, vendors, wedding).perCategorie,
    [items, vendors, wedding]
  )

  const counts = React.useMemo(
    () => ({
      alle: categories.length,
      aandacht: categories.filter((c) => c.status === 'boven schatting').length,
      'nog te plannen': categories.filter((c) => c.status === 'nog te plannen').length,
      betaald: categories.filter((c) => c.status === 'betaald').length,
    }),
    [categories]
  )

  const gefilterd = React.useMemo(() => {
    let result = categories
    if (zoekterm) {
      const q = zoekterm.toLowerCase()
      result = result.filter((c) => c.naam.toLowerCase().includes(q))
    }
    if (filter === 'aandacht') result = result.filter((c) => c.status === 'boven schatting')
    else if (filter === 'nog te plannen') result = result.filter((c) => c.status === 'nog te plannen')
    else if (filter === 'betaald') result = result.filter((c) => c.status === 'betaald')
    return result
  }, [categories, zoekterm, filter])

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'alle', label: 'Alle' },
    { key: 'aandacht', label: 'Aandacht' },
    { key: 'nog te plannen', label: 'Nog te plannen' },
    { key: 'betaald', label: 'Betaald' },
  ]

  if (categories.length === 0) return null

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Details per categorie
        </h2>
        <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setWeergave('cards')}
            aria-label="Cards weergeven"
            aria-pressed={weergave === 'cards'}
            className={cn(
              'flex items-center justify-center rounded-md p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              weergave === 'cards' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setWeergave('grafieken')}
            aria-label="Grafieken weergeven"
            aria-pressed={weergave === 'grafieken'}
            className={cn(
              'flex items-center justify-center rounded-md p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              weergave === 'grafieken' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <PieChart className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {weergave === 'grafieken' ? (
        <BudgetChartDashboard perCategorie={perCategorie} />
      ) : (
        <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            data-budget-search
            placeholder="Zoek categorie..."
            value={zoekterm}
            onChange={(e) => setZoekterm(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {zoekterm && (
            <button
              type="button"
              onClick={() => setZoekterm('')}
              aria-label="Zoekterm wissen"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="scrollbar-hide flex gap-2 overflow-x-auto sm:flex-wrap">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                filter === key
                  ? 'border-primary/60 bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {label}
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                  filter === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}
              >
                {counts[key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {gefilterd.map((cat) => {
          const heeftAfwijking = cat.items.some((i) => afwijkendeItemIds?.has(i.id))
          return (
            <BudgetCategoryCard
              key={cat.naam}
              data={cat}
              vendors={vendors}
              bevestigdeDaggasten={bevestigdeDaggasten}
              afwijkend={heeftAfwijking}
              onClick={() => onOpenCategorie(cat.naam)}
            />
          )
        })}
      </div>
        </>
      )}
    </div>
  )
}
