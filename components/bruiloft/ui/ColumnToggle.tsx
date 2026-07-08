'use client'

import { Columns2, Columns3, Square } from 'lucide-react'

import { cn } from '@/lib/utils'

export type KolomAantal = 1 | 2 | 3

interface ColumnToggleProps {
  waarde: KolomAantal
  onChange: (v: KolomAantal) => void
  /** Welke kolomaantallen tonen — bv. [1, 2] op taken/budget (geen 3e optie). */
  opties?: KolomAantal[]
  ariaLabel?: string
  className?: string
}

const ALLE_OPTIES: { waarde: KolomAantal; icon: typeof Square; label: string }[] = [
  { waarde: 1, icon: Square, label: '1 kolom' },
  { waarde: 2, icon: Columns2, label: '2 kolommen' },
  { waarde: 3, icon: Columns3, label: '3 kolommen' },
]

// Herbruikbare kolomkeuze, zoals eerst alleen op het draaiboek. De actieve
// stand is neutraal grijs (blend met het theme) — geen accentkleur, want
// kiezen van een weergave vraagt geen aandacht zoals de rose-accent dat
// betekent.
export function ColumnToggle({
  waarde,
  onChange,
  opties = [1, 2, 3],
  ariaLabel = 'Aantal kolommen',
  className,
}: ColumnToggleProps) {
  return (
    <div
      className={cn('inline-flex shrink-0 rounded-lg border border-border bg-background p-1', className)}
      role="group"
      aria-label={ariaLabel}
    >
      {ALLE_OPTIES.filter((o) => opties.includes(o.waarde)).map(({ waarde: w, icon: Icon, label }) => (
        <button
          key={w}
          type="button"
          onClick={() => onChange(w)}
          aria-label={label}
          aria-pressed={waarde === w}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
            waarde === w
              ? 'bg-muted-foreground/80 text-background'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Icon className="h-4 w-4" />
          {w}
        </button>
      ))}
    </div>
  )
}
