'use client'

import * as React from 'react'
import { CalendarDays, LayoutList } from 'lucide-react'

import {
  ColumnToggle,
  FilterDropdown,
  FilterPanel,
  FilterVeld,
  SearchInput,
  SegmentedControl,
  Select,
  WisFilters,
  type KolomAantal,
} from '@/components/bruiloft/ui'
import { PRIORITEITEN, TASK_STATUSSEN } from '@/lib/bruiloft/options'
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
  const activeFilterCount = [
    filters.status !== 'all',
    filters.prioriteit !== 'all',
    filters.toegewezen !== 'all',
  ].filter(Boolean).length

  const wisFilters = () =>
    onChange({ ...filters, status: 'all', prioriteit: 'all', toegewezen: 'all' })

  const statusOpties = [
    { value: 'all', label: 'Alle statussen' },
    ...TASK_STATUSSEN.map((s) => ({
      value: s,
      label: s === 'bezig' ? 'In uitvoering' : s.charAt(0).toUpperCase() + s.slice(1),
    })),
  ]
  const prioriteitOpties = [
    { value: 'all', label: 'Alle prioriteiten' },
    ...PRIORITEITEN.map((p) => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) })),
  ]
  const toegewezenOpties = [
    { value: 'all', label: 'Iedereen' },
    { value: 'unassigned', label: 'Niet toegewezen' },
    ...members.map((m) => ({ value: m.userId, label: m.displayName || m.email })),
  ]

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <SearchInput
        value={filters.zoek}
        onValueChange={(v) => onChange({ ...filters, zoek: v })}
        placeholder="Zoek in taken…"
        aria-label="Zoek in taken"
        containerClassName="min-w-0 flex-1"
      />

      {/* Status/Prioriteit/Toegewezen aan — inline op desktop, naast de zoekbalk */}
      <div className="hidden items-center gap-2 lg:flex">
        <FilterDropdown
          value={filters.status}
          options={statusOpties}
          onChange={(v) => onChange({ ...filters, status: v as TaakFilters['status'] })}
          ariaLabel="Filter op status"
        />
        <FilterDropdown
          value={filters.prioriteit}
          options={prioriteitOpties}
          onChange={(v) => onChange({ ...filters, prioriteit: v as TaakFilters['prioriteit'] })}
          ariaLabel="Filter op prioriteit"
        />
        <FilterDropdown
          value={filters.toegewezen}
          options={toegewezenOpties}
          onChange={(v) => onChange({ ...filters, toegewezen: v })}
          ariaLabel="Filter op toegewezen persoon"
        />
        {activeFilterCount > 0 && <WisFilters onClick={wisFilters} />}
      </div>

      {/* Filterknop + paneel — enige weg naar de filters onder de lg-breakpoint */}
      <FilterPanel activeCount={activeFilterCount} onWis={wisFilters} className="lg:hidden">
        <FilterVeld label="Status">
          <Select
            value={filters.status}
            onChange={(e) => onChange({ ...filters, status: e.target.value as TaakFilters['status'] })}
            className="w-full"
          >
            {statusOpties.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </FilterVeld>
        <FilterVeld label="Prioriteit">
          <Select
            value={filters.prioriteit}
            onChange={(e) =>
              onChange({ ...filters, prioriteit: e.target.value as TaakFilters['prioriteit'] })
            }
            className="w-full"
          >
            {prioriteitOpties.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </FilterVeld>
        <FilterVeld label="Toegewezen aan">
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
        </FilterVeld>
      </FilterPanel>

      {/* Kolom-keuze — alleen relevant in de lijstweergave, alleen op desktop
          (mobiel/tablet altijd 1 kolom), zelfde plek als op het draaiboek. */}
      {view === 'lijst' && (
        <div className="hidden items-center gap-2 lg:flex">
          <ColumnToggle waarde={kolommen} onChange={onKolommenChange} opties={[1, 2]} />
        </div>
      )}

      {/* View switcher */}
      <SegmentedControl
        waarde={view}
        onChange={onViewChange}
        ariaLabel="Weergave"
        opties={[
          {
            waarde: 'lijst',
            icon: LayoutList,
            label: <span className="hidden sm:inline">Lijst</span>,
            ariaLabel: 'Lijstweergave',
          },
          {
            waarde: 'kalender',
            icon: CalendarDays,
            label: <span className="hidden sm:inline">Kalender</span>,
            ariaLabel: 'Kalenderweergave',
          },
        ]}
      />
    </div>
  )
}
