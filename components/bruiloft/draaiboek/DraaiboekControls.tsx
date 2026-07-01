'use client'

import { Columns2, Columns3, Search, Square, X } from 'lucide-react'

import { Input } from '@/components/bruiloft/ui'
import { cn } from '@/lib/utils'

export type KolomAantal = 1 | 2 | 3

interface DraaiboekControlsProps {
  zoek: string
  onZoekChange: (v: string) => void
  kolommen: KolomAantal
  onKolommenChange: (v: KolomAantal) => void
}

const OPTIES: { waarde: KolomAantal; icon: typeof Square; label: string }[] = [
  { waarde: 1, icon: Square, label: '1 kolom' },
  { waarde: 2, icon: Columns2, label: '2 kolommen' },
  { waarde: 3, icon: Columns3, label: '3 kolommen' },
]

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
        <div
          className="inline-flex rounded-lg border border-border bg-background p-1"
          role="group"
          aria-label="Aantal kolommen"
        >
          {OPTIES.map(({ waarde, icon: Icon, label }) => (
            <button
              key={waarde}
              type="button"
              onClick={() => onKolommenChange(waarde)}
              aria-label={label}
              aria-pressed={kolommen === waarde}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
                kolommen === waarde
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {waarde}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
