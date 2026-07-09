'use client'

import * as React from 'react'

import {
  FilterDropdown,
  FilterPanel,
  FilterVeld,
  SearchInput,
  Select,
  WisFilters,
} from '@/components/bruiloft/ui'
import { categorieLabelVoor, GASTTYPES, GUEST_CATEGORIEEN, RSVP_STATUSSEN } from '@/lib/bruiloft/options'
import type { Wedding } from '@/lib/bruiloft/types'

interface GastenFiltersProps {
  zoek: string
  onZoek: (v: string) => void
  categorie: string
  onCategorie: (v: string) => void
  type: string
  onType: (v: string) => void
  rsvp: string
  onRsvp: (v: string) => void
  wedding?: Wedding | null
  // Custom categorieën/gasttypes die al in gebruik zijn bij dit bruidspaar
  extraCategorieen?: string[]
  extraGasttypen?: string[]
}

// Zelfde toolbar-patroon als TakenFilters: op desktop staan de filters los
// naast de zoekbalk, pas onder de lg-breakpoint klappen ze samen achter één
// "Filters"-knop met telbadge.
export function GastenFilters({
  zoek,
  onZoek,
  categorie,
  onCategorie,
  type,
  onType,
  rsvp,
  onRsvp,
  wedding,
  extraCategorieen = [],
  extraGasttypen = [],
}: GastenFiltersProps) {
  const activeCount = [categorie !== 'all', type !== 'all', rsvp !== 'all'].filter(Boolean).length

  const wisFilters = () => {
    onCategorie('all')
    onType('all')
    onRsvp('all')
  }

  const gasttypeCategorieen = wedding?.gasttypeCategorieen?.length ? wedding.gasttypeCategorieen : GASTTYPES

  const alleCategorieen = [...GUEST_CATEGORIEEN, ...extraCategorieen.filter((c) => !GUEST_CATEGORIEEN.includes(c))]
  const alleGasttypen = [...gasttypeCategorieen, ...extraGasttypen.filter((t) => !gasttypeCategorieen.includes(t))]

  const categorieOpties = [
    { value: 'all', label: 'Alle categorieën' },
    ...alleCategorieen.map((c) => ({
      value: c,
      label: categorieLabelVoor(c, wedding?.partner1Naam, wedding?.partner2Naam),
    })),
  ]
  const typeOpties = [
    { value: 'all', label: 'Alle types' },
    ...alleGasttypen.map((tp) => ({ value: tp, label: tp })),
  ]
  const rsvpOpties = [
    { value: 'all', label: 'Alle statussen' },
    ...RSVP_STATUSSEN.map((s) => ({ value: s, label: s })),
  ]

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <SearchInput
        value={zoek}
        onValueChange={onZoek}
        placeholder="Zoek op naam…"
        aria-label="Zoek op naam"
        containerClassName="min-w-0 flex-1"
      />

      {/* Categorie/Type/RSVP — inline op desktop, naast de zoekbalk */}
      <div className="hidden items-center gap-2 lg:flex">
        <FilterDropdown value={categorie} options={categorieOpties} onChange={onCategorie} ariaLabel="Filter op categorie" />
        <FilterDropdown value={type} options={typeOpties} onChange={onType} ariaLabel="Filter op type" />
        <FilterDropdown value={rsvp} options={rsvpOpties} onChange={onRsvp} ariaLabel="Filter op RSVP-status" />
        {activeCount > 0 && <WisFilters onClick={wisFilters} />}
      </div>

      {/* Filterknop + paneel — enige weg naar de filters onder de lg-breakpoint */}
      <FilterPanel activeCount={activeCount} onWis={wisFilters} className="lg:hidden">
        <FilterVeld label="Categorie">
          <Select value={categorie} onChange={(e) => onCategorie(e.target.value)} className="w-full">
            {categorieOpties.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </FilterVeld>
        <FilterVeld label="Type">
          <Select value={type} onChange={(e) => onType(e.target.value)} className="w-full">
            {typeOpties.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </FilterVeld>
        <FilterVeld label="Status">
          <Select value={rsvp} onChange={(e) => onRsvp(e.target.value)} className="w-full">
            {rsvpOpties.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </FilterVeld>
      </FilterPanel>
    </div>
  )
}
