'use client'

import { Search, X } from 'lucide-react'

import { ColumnToggle, Input, type KolomAantal } from '@/components/bruiloft/ui'

export type { KolomAantal }

interface DraaiboekControlsProps {
  zoek: string
  onZoekChange: (v: string) => void
  kolommen: KolomAantal
  onKolommenChange: (v: KolomAantal) => void
}

export function DraaiboekControls({
  zoek,
  onZoekChange,
  kolommen,
  onKolommenChange,
}: DraaiboekControlsProps) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      {/* Globale zoekbalk — filtert alle kolommen */}
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={zoek}
          onChange={(e) => onZoekChange(e.target.value)}
          placeholder="Zoek in draaiboek..."
          className="pl-9 pr-9"
        />
        {zoek && (
          <button
            type="button"
            onClick={() => onZoekChange('')}
            aria-label="Zoekopdracht wissen"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Kolom-keuze — alleen op desktop (mobiel/tablet altijd 1 kolom) */}
      <div className="hidden items-center gap-2 lg:flex">
        <ColumnToggle waarde={kolommen} onChange={onKolommenChange} />
      </div>
    </div>
  )
}
