'use client'

import * as React from 'react'
import { CalendarDays, LayoutList } from 'lucide-react'

import {
  Checkbox,
  ColumnToggle,
  FilterDropdown,
  FilterPanel,
  FilterVeld,
  MultiFilterDropdown,
  SearchInput,
  SegmentedControl,
  Select,
  WisFilters,
  type KolomAantal,
} from '@/components/bruiloft/ui'
import { PRIORITEITEN, TASK_STATUSSEN } from '@/lib/bruiloft/options'
import { DEFAULT_FILTERS, isDefaultStatusSelectie, type TaakFilters } from '@/lib/bruiloft/taken/filters'
import type { TaskStatus, WeddingMember } from '@/lib/bruiloft/types'

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
    !isDefaultStatusSelectie(filters.status),
    filters.prioriteit !== 'all',
    filters.toegewezen !== 'all',
  ].filter(Boolean).length

  const wisFilters = () =>
    onChange({ ...filters, status: DEFAULT_FILTERS.status, prioriteit: 'all', toegewezen: 'all' })

  const statusOpties = TASK_STATUSSEN.map((s) => ({
    value: s,
    label: s === 'bezig' ? 'In uitvoering' : s.charAt(0).toUpperCase() + s.slice(1),
  }))

  const toggleStatus = (value: TaskStatus) => {
    onChange({
      ...filters,
      status: filters.status.includes(value)
        ? filters.status.filter((s) => s !== value)
        : [...filters.status, value],
    })
  }
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
        <MultiFilterDropdown
          label="Status"
          values={filters.status}
          options={statusOpties}
          onChange={(v) => onChange({ ...filters, status: v as TaskStatus[] })}
          isActive={!isDefaultStatusSelectie(filters.status)}
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
          <div className="flex flex-col gap-1.5">
            {statusOpties.map((o) => (
              <label
                key={o.value}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1 text-sm text-foreground"
              >
                <Checkbox
                  checked={filters.status.includes(o.value)}
                  onChange={() => toggleStatus(o.value)}
                />
                {o.label}
              </label>
            ))}
          </div>
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
