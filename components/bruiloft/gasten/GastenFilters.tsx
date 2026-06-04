'use client'

import * as React from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'

import { Input, Select } from '@/components/bruiloft/ui'
import { GASTTYPES, GUEST_CATEGORIEEN, RSVP_STATUSSEN } from '@/lib/bruiloft/options'
import { cn } from '@/lib/utils'

interface GastenFiltersProps {
  zoek: string
  onZoek: (v: string) => void
  categorie: string
  onCategorie: (v: string) => void
  type: string
  onType: (v: string) => void
  rsvp: string
  onRsvp: (v: string) => void
}

// Zelfde toolbar-patroon als TakenFilters: zoekveld blijft zichtbaar, de drie
// selects zitten ingeklapt achter één "Filters"-knop met telbadge. Dit haalt de
// permanente filterbalk weg en geeft de pagina rust.
export function GastenFilters({
  zoek,
  onZoek,
  categorie,
  onCategorie,
  type,
  onType,
  rsvp,
  onRsvp,
}: GastenFiltersProps) {
  const [open, setOpen] = React.useState(false)
  const panelRef = React.useRef<HTMLDivElement>(null)

  const activeCount = [categorie !== 'all', type !== 'all', rsvp !== 'all'].filter(Boolean).length

  React.useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {/* Zoekveld */}
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={zoek}
          onChange={(e) => onZoek(e.target.value)}
          placeholder="Zoek op naam…"
          className="pl-9 pr-3"
        />
      </div>

      {/* Filterknop + dropdown */}
      <div className="relative" ref={panelRef}>
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          className={cn(
            'inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors',
            open
              ? 'border-gray-400 bg-gray-100 text-gray-900'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-500 text-[11px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-lg border border-border bg-white p-4 shadow-lg sm:w-80">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Filters</span>
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onCategorie('all')
                    onType('all')
                    onRsvp('all')
                  }}
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
                  Categorie
                </label>
                <Select value={categorie} onChange={(e) => onCategorie(e.target.value)} className="w-full">
                  <option value="all">Alle categorieën</option>
                  {GUEST_CATEGORIEEN.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Type</label>
                <Select value={type} onChange={(e) => onType(e.target.value)} className="w-full">
                  <option value="all">Alle types</option>
                  {GASTTYPES.map((tp) => (
                    <option key={tp} value={tp}>
                      {tp}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">RSVP</label>
                <Select value={rsvp} onChange={(e) => onRsvp(e.target.value)} className="w-full">
                  <option value="all">Alle RSVP-statussen</option>
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
