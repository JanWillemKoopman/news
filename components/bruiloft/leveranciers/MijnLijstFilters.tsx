'use client'

import * as React from 'react'
import { SlidersHorizontal, X } from 'lucide-react'

import { Select } from '@/components/bruiloft/ui'
import { cn } from '@/lib/utils'
import type { DropdownFilterOption } from '@/components/bruiloft/leveranciers/DropdownFilter'

interface MijnLijstFiltersProps {
  status: string
  onStatus: (value: string) => void
  type: string
  onType: (value: string) => void
  categorieOpties: DropdownFilterOption[]
  statusOpties: DropdownFilterOption[]
}

// Mobiele filterknop + paneel, zelfde opzet als TakenFilters op /bruiloft/taken:
// knop met SlidersHorizontal-icoon en actief-aantal, opent een klein
// verankerd paneel (geen Modal/bottom sheet) met gelabelde Select-velden.
export function MijnLijstFilters({
  status,
  onStatus,
  type,
  onType,
  categorieOpties,
  statusOpties,
}: MijnLijstFiltersProps) {
  const [filterOpen, setFilterOpen] = React.useState(false)
  const panelRef = React.useRef<HTMLDivElement>(null)

  const activeFilterCount = [type !== 'all', status !== 'all'].filter(Boolean).length

  const wisFilters = () => {
    onType('all')
    onStatus('all')
  }

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
    <div className="relative shrink-0 md:hidden" ref={panelRef}>
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
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Categorie</label>
              <Select value={type} onChange={(e) => onType(e.target.value)} className="w-full">
                {categorieOpties.map((o) => (
                  <option key={o.value} value={o.value}>
                    {(o.geboekt ? '✓ ' : '') + o.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
              <Select value={status} onChange={(e) => onStatus(e.target.value)} className="w-full">
                {statusOpties.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
