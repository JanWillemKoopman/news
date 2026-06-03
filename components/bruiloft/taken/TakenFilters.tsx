'use client'

import * as React from 'react'
import { CalendarDays, LayoutList, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react'

import { Input, Select } from '@/components/bruiloft/ui'
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
  aiActive: boolean
  onAiToggle: (v: boolean) => void
}

export function TakenFilters({
  filters,
  onChange,
  members,
  view,
  onViewChange,
  aiActive,
  onAiToggle,
}: TakenFiltersProps) {
  const [filterOpen, setFilterOpen] = React.useState(false)
  const panelRef = React.useRef<HTMLDivElement>(null)

  const activeFilterCount = [
    filters.status !== 'all',
    filters.prioriteit !== 'all',
    filters.toegewezen !== 'all',
  ].filter(Boolean).length

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

  return (
    <div className="mb-6 space-y-3">
      {/* Toolbar row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.zoek}
            onChange={(e) => onChange({ ...filters, zoek: e.target.value })}
            placeholder="Zoek in taken..."
            className="pl-9 pr-3"
          />
        </div>

        {/* Filter button */}
        <div className="relative" ref={panelRef}>
          <button
            type="button"
            onClick={() => setFilterOpen((p) => !p)}
            className={cn(
              'inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors',
              filterOpen
                ? 'border-gray-400 bg-gray-100 text-gray-900'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-500 text-[11px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Filter dropdown panel */}
          {filterOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-lg border border-border bg-white p-4 shadow-lg sm:w-80">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Filters</span>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange({ ...filters, status: 'all', prioriteit: 'all', toegewezen: 'all' })
                    }
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

        {/* View switcher */}
        <div className="inline-flex rounded-lg border border-border bg-white p-1">
          <button
            type="button"
            onClick={() => onViewChange('lijst')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
              view === 'lijst'
                ? 'bg-primary text-primary-foreground'
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
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">Kalender</span>
          </button>
        </div>

        {/* AI toggle — desktop inline */}
        <div className="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2">
          <Sparkles className="h-4 w-4 text-rose-500" />
          <span className="text-sm text-muted-foreground">AI-suggesties</span>
          <Toggle checked={aiActive} onChange={onAiToggle} />
        </div>
      </div>

      {/* AI toggle — mobile row */}
      <div className="flex sm:hidden items-center justify-between rounded-lg border border-border bg-white px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-rose-500" />
          <div>
            <p className="text-sm font-medium text-foreground">AI-suggesties</p>
            <p className="text-xs text-muted-foreground">Aanbevolen taken tonen</p>
          </div>
        </div>
        <Toggle checked={aiActive} onChange={onAiToggle} />
      </div>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2',
        checked ? 'bg-rose-600' : 'bg-gray-200'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-200',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )
}
