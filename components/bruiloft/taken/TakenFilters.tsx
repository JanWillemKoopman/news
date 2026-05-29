'use client'

import * as React from 'react'
import { Search } from 'lucide-react'

import { Input, Select } from '@/components/bruiloft/ui'
import { PRIORITEITEN, TASK_STATUSSEN } from '@/lib/bruiloft/options'
import type { TaakFilters } from '@/lib/bruiloft/taken/filters'
import type { WeddingMember } from '@/lib/bruiloft/types'

interface TakenFiltersProps {
  filters: TaakFilters
  onChange: (next: TaakFilters) => void
  members: WeddingMember[]
}

export function TakenFilters({ filters, onChange, members }: TakenFiltersProps) {
  return (
    <div className="mb-6 rounded-lg border border-border bg-gray-50 p-4">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.zoek}
          onChange={(e) => onChange({ ...filters, zoek: e.target.value })}
          placeholder="Zoek in titel of omschrijving…"
          className="pl-9"
        />
      </div>
      <Select
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value as TaakFilters['status'] })}
      >
        <option value="all">Alle statussen</option>
        {TASK_STATUSSEN.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>
      <Select
        value={filters.prioriteit}
        onChange={(e) =>
          onChange({ ...filters, prioriteit: e.target.value as TaakFilters['prioriteit'] })
        }
      >
        <option value="all">Alle prioriteiten</option>
        {PRIORITEITEN.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </Select>
      <Select
        value={filters.toegewezen}
        onChange={(e) => onChange({ ...filters, toegewezen: e.target.value })}
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
  )
}
