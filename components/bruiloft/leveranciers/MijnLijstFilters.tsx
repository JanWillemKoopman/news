'use client'

import * as React from 'react'

import { FilterPanel, FilterVeld, Select } from '@/components/bruiloft/ui'
import type { FilterDropdownOption } from '@/components/bruiloft/ui'

interface MijnLijstFiltersProps {
  status: string
  onStatus: (value: string) => void
  type: string
  onType: (value: string) => void
  categorieOpties: FilterDropdownOption[]
  statusOpties: FilterDropdownOption[]
}

// Mobiele filterknop + paneel, zelfde FilterPanel-patroon als op
// /bruiloft/taken en /bruiloft/gasten.
export function MijnLijstFilters({
  status,
  onStatus,
  type,
  onType,
  categorieOpties,
  statusOpties,
}: MijnLijstFiltersProps) {
  const activeFilterCount = [type !== 'all', status !== 'all'].filter(Boolean).length

  const wisFilters = () => {
    onType('all')
    onStatus('all')
  }

  return (
    <FilterPanel activeCount={activeFilterCount} onWis={wisFilters} className="shrink-0 md:hidden">
      <FilterVeld label="Categorie">
        <Select value={type} onChange={(e) => onType(e.target.value)} className="w-full">
          {categorieOpties.map((o) => (
            <option key={o.value} value={o.value}>
              {(o.check ? '✓ ' : '') + o.label}
            </option>
          ))}
        </Select>
      </FilterVeld>
      <FilterVeld label="Status">
        <Select value={status} onChange={(e) => onStatus(e.target.value)} className="w-full">
          {statusOpties.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </FilterVeld>
    </FilterPanel>
  )
}
