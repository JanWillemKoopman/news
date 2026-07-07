'use client'

import * as React from 'react'
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react'

import { Input, Select } from '@/components/bruiloft/ui'
import { categorieLabelVoor, GASTTYPES, GUEST_CATEGORIEEN, RSVP_STATUSSEN } from '@/lib/bruiloft/options'
import { cn } from '@/lib/utils'
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
  const [open, setOpen] = React.useState(false)
  const panelRef = React.useRef<HTMLDivElement>(null)

  const activeCount = [categorie !== 'all', type !== 'all', rsvp !== 'all'].filter(Boolean).length

  const wisFilters = () => {
    onCategorie('all')
    onType('all')
    onRsvp('all')
  }

  React.useEffect(() => {
    if (!open) return
    function handler(e: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [open])

  const alleCategorieen = [...GUEST_CATEGORIEEN, ...extraCategorieen.filter((c) => !GUEST_CATEGORIEEN.includes(c))]
  const alleGasttypen = [...GASTTYPES, ...extraGasttypen.filter((t) => !GASTTYPES.includes(t))]

  const categorieOpties = [
    { key: 'all', label: 'Alle categorieën' },
    ...alleCategorieen.map((c) => ({
      key: c,
      label: categorieLabelVoor(c, wedding?.partner1Naam, wedding?.partner2Naam),
    })),
  ]
  const typeOpties = [
    { key: 'all', label: 'Alle types' },
    ...alleGasttypen.map((tp) => ({ key: tp, label: tp })),
  ]
  const rsvpOpties = [
    { key: 'all', label: 'Alle statussen' },
    ...RSVP_STATUSSEN.map((s) => ({ key: s, label: s })),
  ]

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {/* Zoekveld */}
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={zoek}
          onChange={(e) => onZoek(e.target.value)}
          placeholder="Zoek op naam…"
          className="pl-9 pr-9"
        />
        {zoek && (
          <button
            type="button"
            aria-label="Zoekveld wissen"
            onClick={() => onZoek('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Categorie/Type/RSVP — inline op desktop, naast de zoekbalk */}
      <div className="hidden items-center gap-2 lg:flex">
        <FilterKnop waarde={categorie} opties={categorieOpties} onSelect={onCategorie} />
        <FilterKnop waarde={type} opties={typeOpties} onSelect={onType} />
        <FilterKnop waarde={rsvp} opties={rsvpOpties} onSelect={onRsvp} />
        {activeCount > 0 && (
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

      {/* Filterknop + dropdown — enige weg naar de filters onder de lg-breakpoint */}
      <div className="relative lg:hidden" ref={panelRef}>
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          className={cn(
            'inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors',
            open
              ? 'border-primary/60 bg-primary/10 text-primary'
              : 'border-input bg-background text-foreground hover:bg-muted'
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeCount > 0 && (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
              {activeCount}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full z-20 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-background p-4 shadow-lg sm:w-80">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Filters</span>
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={wisFilters}
                  className="flex items-center gap-1 py-1 px-2 text-xs text-rose-600 hover:text-rose-700"
                >
                  <X className="h-4 w-4" />
                  Wis filters
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Categorie
                </label>
                <Select value={categorie} onChange={(e) => onCategorie(e.target.value)} className="w-full">
                  <option value="all">Alle categorieën</option>
                  {alleCategorieen.map((c) => (
                    <option key={c} value={c}>
                      {categorieLabelVoor(c, wedding?.partner1Naam, wedding?.partner2Naam)}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Type</label>
                <Select value={type} onChange={(e) => onType(e.target.value)} className="w-full">
                  <option value="all">Alle types</option>
                  {alleGasttypen.map((tp) => (
                    <option key={tp} value={tp}>
                      {tp}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
                <Select value={rsvp} onChange={(e) => onRsvp(e.target.value)} className="w-full">
                  <option value="all">Alle statussen</option>
                  {RSVP_STATUSSEN.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Eén filterdimensie als knop + dropdown-paneel, zelfde vormgeving als op
// /bruiloft/taken (rounded-lg, zelfde hover/actief-tinten).
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
