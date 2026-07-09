'use client'

import { ColumnToggle, SearchInput, type KolomAantal } from '@/components/bruiloft/ui'

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
      <SearchInput
        value={zoek}
        onValueChange={onZoekChange}
        placeholder="Zoek in draaiboek…"
        aria-label="Zoek in draaiboek"
        containerClassName="min-w-0 flex-1"
      />

      {/* Kolom-keuze — alleen op desktop (mobiel/tablet altijd 1 kolom) */}
      <div className="hidden items-center gap-2 lg:flex">
        <ColumnToggle waarde={kolommen} onChange={onKolommenChange} />
      </div>
    </div>
  )
}
