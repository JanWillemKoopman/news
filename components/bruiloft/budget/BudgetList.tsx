'use client'

import * as React from 'react'
import { Check, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Grid2X2, Pencil, Search, Trash2, X } from 'lucide-react'

import { Button, Money } from '@/components/bruiloft/ui'
import {
  effectiefGeoffreerd,
  geboekteLeverancierVoor,
  restBedrag,
  verwachteKost,
} from '@/lib/bruiloft/derived'
import { formatDatumKort, formatEuro } from '@/lib/bruiloft/format'
import { BUDGET_CATEGORIEEN } from '@/lib/bruiloft/options'
import { capFirst, cn } from '@/lib/utils'
import type { BudgetItem, Vendor } from '@/lib/bruiloft/types'

interface BudgetListProps {
  items: BudgetItem[]
  vendors: Vendor[]
  bevestigdeDaggasten: number
  afwijkendeItemIds?: Set<string>
  onEdit?: (item: BudgetItem) => void
  onDelete?: (item: BudgetItem) => void
  onToggleTerm?: (item: BudgetItem, termId: string, betaald: boolean) => void
}

type CategorieStatus = 'betaald' | 'boven schatting' | 'nog te plannen' | 'in uitvoering'
type Filter = 'alle' | 'aandacht' | 'nog te plannen' | 'betaald'

interface CategorieData {
  naam: string
  items: BudgetItem[]
  geschat: number
  geoffreerd: number
  betaald: number
  verwacht: number
  resterend: number
  status: CategorieStatus
}

function berekenCategorie(naam: string, catItems: BudgetItem[], vendors: Vendor[]): CategorieData {
  const geschat = catItems.reduce((s, i) => s + i.geschatBedrag, 0)
  const geoffreerd = catItems.reduce((s, i) => s + effectiefGeoffreerd(i, vendors), 0)
  const betaald = catItems.reduce((s, i) => s + i.betaaldBedrag, 0)
  const verwacht = catItems.reduce((s, i) => s + verwachteKost(i, vendors), 0)
  const resterend = verwacht - betaald

  let status: CategorieStatus = 'nog te plannen'
  if (verwacht > 0 && betaald >= verwacht) {
    status = 'betaald'
  } else if (geschat > 0 && (geoffreerd > geschat || betaald > geschat)) {
    status = 'boven schatting'
  } else if (betaald > 0 || geoffreerd > 0) {
    status = 'in uitvoering'
  }

  return { naam, items: catItems, geschat, geoffreerd, betaald, verwacht, resterend, status }
}

const STATUS_CONFIG: Record<
  CategorieStatus,
  { label: string; dotKlasse: string; badgeKlasse: string; barKlasse: string }
> = {
  betaald: {
    label: 'Betaald',
    dotKlasse: 'bg-emerald-500',
    badgeKlasse: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    barKlasse: 'bg-emerald-500',
  },
  'boven schatting': {
    label: 'Boven schatting',
    dotKlasse: 'bg-amber-500',
    badgeKlasse: 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    barKlasse: 'bg-amber-500',
  },
  'nog te plannen': {
    label: 'Nog te plannen',
    dotKlasse: 'bg-blue-400',
    badgeKlasse: 'bg-muted text-muted-foreground',
    barKlasse: 'bg-blue-400',
  },
  'in uitvoering': {
    label: 'In uitvoering',
    dotKlasse: 'bg-primary',
    badgeKlasse: 'bg-primary/10 text-primary',
    barKlasse: 'bg-primary',
  },
}

export function BudgetList({
  items,
  vendors,
  bevestigdeDaggasten,
  afwijkendeItemIds,
  onEdit,
  onDelete,
  onToggleTerm,
}: BudgetListProps) {
  const [zoekterm, setZoekterm] = React.useState('')
  const [filter, setFilter] = React.useState<Filter>('alle')
  const [uitgeklapt, setUitgeklapt] = React.useState<Set<string>>(new Set())
  const [filterOpen, setFilterOpen] = React.useState(false)
  const filterPanelRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!filterOpen) return
    function handler(e: MouseEvent) {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [filterOpen])

  const categories = React.useMemo<CategorieData[]>(() => {
    return BUDGET_CATEGORIEEN.flatMap((cat) => {
      const catItems = items.filter((i) => i.categorie === cat)
      return catItems.length > 0 ? [berekenCategorie(cat, catItems, vendors)] : []
    })
  }, [items, vendors])

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

  const alleUitgeklapt = gefilterd.length > 0 && gefilterd.every((c) => uitgeklapt.has(c.naam))

  const toggleCategorie = (naam: string) =>
    setUitgeklapt((prev) => {
      const next = new Set(prev)
      next.has(naam) ? next.delete(naam) : next.add(naam)
      return next
    })

  const toggleAlles = () => {
    if (alleUitgeklapt) {
      setUitgeklapt(new Set())
    } else {
      setUitgeklapt(new Set(gefilterd.map((c) => c.naam)))
    }
  }

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'alle', label: 'Alle' },
    { key: 'aandacht', label: 'Aandacht' },
    { key: 'nog te plannen', label: 'Nog te plannen' },
    { key: 'betaald', label: 'Betaald' },
  ]

  return (
    <div className="space-y-4">
      {/* Search + expand button */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Zoek categorie..."
            value={zoekterm}
            onChange={(e) => setZoekterm(e.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-9 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          {zoekterm && (
            <button
              type="button"
              onClick={() => setZoekterm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={toggleAlles}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          {alleUitgeklapt
            ? <ChevronsDownUp className="h-4 w-4" />
            : <ChevronsUpDown className="h-4 w-4" />}
          <span>{alleUitgeklapt ? 'Inklappen' : 'Uitklappen'}</span>
        </button>
        <div className="relative" ref={filterPanelRef}>
          <button
            type="button"
            onClick={() => setFilterOpen((p) => !p)}
            className={cn(
              'inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors',
              filterOpen
                ? 'border-primary/60 bg-primary/10 text-primary'
                : 'border-input bg-background text-foreground hover:bg-muted'
            )}
          >
            <span>{FILTERS.find((f) => f.key === filter)?.label}</span>
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-xs font-semibold',
                filter !== 'alle'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {counts[filter]}
            </span>
            <ChevronDown className={cn('h-4 w-4 transition-transform', filterOpen && 'rotate-180')} />
          </button>

          {filterOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-lg border border-border bg-background shadow-lg">
              {FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setFilter(key); setFilterOpen(false) }}
                  className={cn(
                    'flex w-full items-center justify-between px-3 py-2.5 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg',
                    filter === key
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  <span>{label}</span>
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-xs font-semibold',
                      filter === key
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {counts[key]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section header */}
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Grid2X2 className="h-3.5 w-3.5" />
        <span>Per categorie</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold normal-case tracking-normal text-foreground">
          {gefilterd.length} categorieën
        </span>
      </div>

      {/* Category accordion rows */}
      <div className="space-y-2">
        {gefilterd.map((cat) => (
          <CategorieRij
            key={cat.naam}
            data={cat}
            isOpen={uitgeklapt.has(cat.naam)}
            bevestigdeDaggasten={bevestigdeDaggasten}
            afwijkendeItemIds={afwijkendeItemIds}
            vendors={vendors}
            onToggle={() => toggleCategorie(cat.naam)}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleTerm={onToggleTerm}
          />
        ))}
      </div>
    </div>
  )
}

function CategorieRij({
  data,
  isOpen,
  bevestigdeDaggasten,
  afwijkendeItemIds,
  vendors,
  onToggle,
  onEdit,
  onDelete,
  onToggleTerm,
}: {
  data: CategorieData
  isOpen: boolean
  bevestigdeDaggasten: number
  afwijkendeItemIds?: Set<string>
  vendors: Vendor[]
  onToggle: () => void
  onEdit?: (item: BudgetItem) => void
  onDelete?: (item: BudgetItem) => void
  onToggleTerm?: (item: BudgetItem, termId: string, betaald: boolean) => void
}) {
  const config = STATUS_CONFIG[data.status]
  const voortgangPct = data.verwacht > 0 ? Math.min(100, (data.betaald / data.verwacht) * 100) : 0
  const begroot = data.verwacht > 0 ? data.verwacht : data.geschat

  const subtitle =
    data.naam === 'catering' && bevestigdeDaggasten > 0
      ? `referentie: ${bevestigdeDaggasten} bevestigde daggast${bevestigdeDaggasten === 1 ? '' : 'en'}`
      : data.items.length > 1
        ? `${data.items.length} posten`
        : null

  const betaaldTekst =
    data.betaald === 0
      ? 'nog niets betaald'
      : `${formatEuro(data.betaald)} van ${formatEuro(data.verwacht)} betaald`

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40"
      >
        {/* Status dot */}
        <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', config.dotKlasse)} />

        {/* Name + subtitle */}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{capFirst(data.naam)}</p>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>

        {/* Status badge — hidden on mobile */}
        <span
          className={cn(
            'hidden shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex',
            config.badgeKlasse
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', config.dotKlasse)} />
          {config.label}
        </span>

        {/* Progress bar — hidden on small screens */}
        <div className="hidden w-44 shrink-0 lg:block">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full rounded-full transition-all duration-500', config.barKlasse)}
              style={{ width: `${Math.max(voortgangPct > 0 ? voortgangPct : 0, 0)}%` }}
            />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{betaaldTekst}</p>
        </div>

        {/* Amount */}
        <div className="shrink-0 text-right">
          <Money bedrag={begroot} className="font-semibold text-foreground" />
          <p className="text-xs text-muted-foreground">begroot</p>
        </div>

        {/* Chevron */}
        <span className="shrink-0 text-muted-foreground">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
      </button>

      {/* Expanded items */}
      {isOpen ? (
        <div className="divide-y divide-border border-t border-border bg-muted/20">
          {data.items.map((item) => (
            <ItemRij
              key={item.id}
              item={item}
              vendors={vendors}
              afwijkend={afwijkendeItemIds?.has(item.id) ?? false}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleTerm={onToggleTerm}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ItemRij({
  item,
  vendors,
  afwijkend,
  onEdit,
  onDelete,
  onToggleTerm,
}: {
  item: BudgetItem
  vendors: Vendor[]
  afwijkend: boolean
  onEdit?: (item: BudgetItem) => void
  onDelete?: (item: BudgetItem) => void
  onToggleTerm?: (item: BudgetItem, termId: string, betaald: boolean) => void
}) {
  const geboekteVendor = geboekteLeverancierVoor(item, vendors)
  const geoffreerd = effectiefGeoffreerd(item, vendors)
  const rest = restBedrag(item, vendors)

  return (
    <div className={cn('px-4 py-3', afwijkend && 'bg-amber-50/50 dark:bg-amber-950/20')}>
      {/* Item title + actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            {item.omschrijving || capFirst(item.categorie)}
          </p>
          {geboekteVendor ? (
            <p className="text-xs text-primary">via {geboekteVendor.naam}</p>
          ) : null}
        </div>
        {(onEdit || onDelete) ? (
          <div className="flex shrink-0 gap-1">
            {onEdit && (
              <Button variant="ghost" size="icon" aria-label="Bewerken" onClick={() => onEdit(item)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" aria-label="Verwijderen" onClick={() => onDelete(item)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ) : null}
      </div>

      {/* 4-column bedragen */}
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
        <Bedrag label="Geschat" bedrag={item.geschatBedrag} />
        <Bedrag label="Offerteprijs" bedrag={geoffreerd} />
        <Bedrag label="Betaald" bedrag={item.betaaldBedrag} />
        <Bedrag label="Resterend" bedrag={rest} accent={rest > 0} />
      </div>

      {/* Betaaltermijnen */}
      {item.betaaltermijnen.length > 0 ? (
        <div className="mt-3 border-t border-border pt-2">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Betaaltermijnen</p>
          <ul className="space-y-1">
            {item.betaaltermijnen.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-xs text-muted-foreground">
                  {t.vervaldatum ? formatDatumKort(t.vervaldatum) : 'Geen datum'}
                </span>
                <div className="flex items-center gap-2">
                  <Money bedrag={t.bedrag} className="text-xs font-medium text-foreground" />
                  <button
                    type="button"
                    onClick={() => onToggleTerm?.(item, t.id, !t.betaald)}
                    disabled={!onToggleTerm}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold transition-colors',
                      t.betaald
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : onToggleTerm
                          ? 'bg-stone-200 text-stone-600 hover:bg-stone-300 dark:bg-stone-700/60 dark:text-stone-300'
                          : 'bg-stone-100 text-stone-400 dark:bg-stone-800/40 dark:text-stone-500'
                    )}
                  >
                    {t.betaald ? <Check className="h-3 w-3" /> : null}
                    {t.betaald ? 'betaald' : 'markeer betaald'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function Bedrag({ label, bedrag, accent }: { label: string; bedrag: number; accent?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <Money
        bedrag={bedrag}
        className={cn('text-sm font-semibold', accent ? 'text-primary' : 'text-foreground')}
      />
    </div>
  )
}
