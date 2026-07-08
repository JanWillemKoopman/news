'use client'

import * as React from 'react'
import { CalendarDays, ChevronDown, LayoutList, Search, SlidersHorizontal, X } from 'lucide-react'

import { ColumnToggle, Input, Select, type KolomAantal } from '@/components/bruiloft/ui'
import { PRIORITEITEN, TASK_STATUSSEN } from '@/lib/bruiloft/options'
import { cn } from '@/lib/utils'
import type { TaakFilters } from '@/lib/bruiloft/taken/filters'
import type { WeddingMember } from '@/lib/bruiloft/types'

type View = 'lijst' | 'kalender'

interface TakenFiltersProps {
  filters: TaakFilters
  onChange: (next: TaakFilters) => void
  members: WeddingMember[]
  view: View
  onViewChange: (v: View) => void
  kolommen: KolomAantal
  onKolommenChange: (v: KolomAantal) => void
}

export function TakenFilters({
  filters,
  onChange,
  members,
  view,
  onViewChange,
  kolommen,
  onKolommenChange,
}: TakenFiltersProps) {
  const [filterOpen, setFilterOpen] = React.useState(false)
  const panelRef = React.useRef<HTMLDivElement>(null)

  const activeFilterCount = [
    filters.status !== 'all',
    filters.prioriteit !== 'all',
    filters.toegewezen !== 'all',
  ].filter(Boolean).length

  const wisFilters = () =>
    onChange({ ...filters, status: 'all', prioriteit: 'all', toegewezen: 'all' })

  // Close filter panel on outside click
  React.useEffect(() => {
    if (!filterOpen) return
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [filterOpen])

  const statusOpties = [
    { key: 'all', label: 'Alle statussen' },
    ...TASK_STATUSSEN.map((s) => ({
      key: s,
      label: s === 'bezig' ? 'In uitvoering' : s.charAt(0).toUpperCase() + s.slice(1),
    })),
  ]
  const prioriteitOpties = [
    { key: 'all', label: 'Alle prioriteiten' },
    ...PRIORITEITEN.map((p) => ({ key: p, label: p.charAt(0).toUpperCase() + p.slice(1) })),
  ]
  const toegewezenOpties = [
    { key: 'all', label: 'Iedereen' },
    { key: 'unassigned', label: 'Niet toegewezen' },
    ...members.map((m) => ({ key: m.userId, label: m.displayName || m.email })),
  ]

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.zoek}
          onChange={(e) => onChange({ ...filters, zoek: e.target.value })}
          placeholder="Zoek in taken..."
          className="pl-9 pr-9"
        />
        {filters.zoek && (
          <button
            type="button"
            onClick={() => onChange({ ...filters, zoek: '' })}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Status/Prioriteit/Toegewezen aan — inline op desktop, naast de zoekbalk */}
      <div className="hidden items-center gap-2 lg:flex">
        <FilterKnop
          waarde={filters.status}
          opties={statusOpties}
          onSelect={(v) => onChange({ ...filters, status: v as TaakFilters['status'] })}
        />
        <FilterKnop
          waarde={filters.prioriteit}
          opties={prioriteitOpties}
          onSelect={(v) => onChange({ ...filters, prioriteit: v as TaakFilters['prioriteit'] })}
        />
        <FilterKnop
          waarde={filters.toegewezen}
          opties={toegewezenOpties}
          onSelect={(v) => onChange({ ...filters, toegewezen: v })}
        />
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={wisFilters}
            className="flex items-center gap-1 whitespace-nowrap text-xs text-rose-600 hover:text-rose-700"
          >
            <X className="h-3 w-3" />
            Wis filters
          </button>
        )}
      </div>

      {/* Filter button + paneel — enige weg naar de filters onder de lg-breakpoint */}
      <div className="relative lg:hidden" ref={panelRef}>
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
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Filter dropdown panel */}
        {filterOpen && (
          <div className="absolute right-0 top-full z-20 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-background p-4 shadow-lg sm:w-80">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Filters</span>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={wisFilters}
                  className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700"
                >
                  <X className="h-3 w-3" />
                  Wis filters
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Status
                </label>
                <Select
                  value={filters.status}
                  onChange={(e) =>
                    onChange({ ...filters, status: e.target.value as TaakFilters['status'] })
                  }
                  className="w-full"
                >
                  <option value="all">Alle statussen</option>
                  {TASK_STATUSSEN.map((s) => (
                    <option key={s} value={s}>
                      {s === 'bezig' ? 'In uitvoering' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Prioriteit
                </label>
                <Select
                  value={filters.prioriteit}
                  onChange={(e) =>
                    onChange({
                      ...filters,
                      prioriteit: e.target.value as TaakFilters['prioriteit'],
                    })
                  }
                  className="w-full"
                >
                  <option value="all">Alle prioriteiten</option>
                  {PRIORITEITEN.map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Toegewezen aan
                </label>
                <Select
                  value={filters.toegewezen}
                  onChange={(e) => onChange({ ...filters, toegewezen: e.target.value })}
                  className="w-full"
                >
                  <option value="all">Iedereen</option>
                  <option value="unassigned">Niet toegewezen</option>
                  {members.length > 0 ? (
                    <optgroup label="Leden">
                      {members.map((m) => (
                        <option key={m.userId} value={m.userId}>
                          {m.displayName || m.email}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Kolom-keuze — alleen relevant in de lijstweergave, alleen op desktop
          (mobiel/tablet altijd 1 kolom), zelfde plek als op het draaiboek. */}
      {view === 'lijst' && (
        <div className="hidden items-center gap-2 lg:flex">
          <ColumnToggle waarde={kolommen} onChange={onKolommenChange} />
        </div>
      )}

      {/* View switcher */}
      <div className="inline-flex rounded-lg border border-border bg-background p-1">
        <button
          type="button"
          onClick={() => onViewChange('lijst')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
            view === 'lijst'
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <LayoutList className="h-4 w-4" />
          <span className="hidden sm:inline">Lijst</span>
        </button>
        <button
          type="button"
          onClick={() => onViewChange('kalender')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
            view === 'kalender'
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <CalendarDays className="h-4 w-4" />
          <span className="hidden sm:inline">Kalender</span>
        </button>
      </div>
    </div>
  )
}

// Eén filterdimensie als knop + dropdown-paneel, in dezelfde vormgeving als de
// filterknop op de budgetpagina (rounded-lg, zelfde hover/actief-tinten),
// i.p.v. een kale native <select> naast de zoekbalk.
function FilterKnop({
  waarde,
  opties,
  onSelect,
}: {
  waarde: string
  opties: { key: string; label: string }[]
  onSelect: (v: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const isActief = waarde !== (opties[0]?.key ?? 'all')

  React.useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const huidigLabel = opties.find((o) => o.key === waarde)?.label ?? opties[0]?.label

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={cn(
          'inline-flex h-10 max-w-40 items-center gap-2 whitespace-nowrap rounded-lg border px-3 text-sm font-medium transition-colors',
          open
            ? 'border-primary/60 bg-primary/10 text-primary'
            : isActief
              ? 'border-primary/30 bg-primary/5 text-foreground hover:bg-muted'
              : 'border-input bg-background text-foreground hover:bg-muted'
        )}
      >
        <span className="truncate">{huidigLabel}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 max-h-72 w-56 overflow-y-auto rounded-lg border border-border bg-background shadow-lg">
          {opties.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => {
                onSelect(o.key)
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center px-3 py-2.5 text-left text-sm transition-colors first:rounded-t-lg last:rounded-b-lg',
                waarde === o.key
                  ? 'bg-primary/10 font-medium text-primary'
                  : 'text-foreground hover:bg-muted'
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
