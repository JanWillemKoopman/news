'use client'

import * as React from 'react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface SegmentedOption<T extends string | number> {
  waarde: T
  /** Zichtbaar label; mag een ReactNode zijn (bv. verborgen op mobiel). */
  label?: React.ReactNode
  icon?: LucideIcon
  ariaLabel?: string
}

interface SegmentedControlProps<T extends string | number> {
  waarde: T
  onChange: (v: T) => void
  opties: SegmentedOption<T>[]
  ariaLabel?: string
  className?: string
}

// Hét weergave-wisselaar-idioom van de app (kolommen, lijst/kalender, ...).
// De actieve stand is neutraal grijs — een weergavekeuze vraagt geen aandacht
// zoals de rose-accent dat betekent.
export function SegmentedControl<T extends string | number>({
  waarde,
  onChange,
  opties,
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn('inline-flex shrink-0 rounded-lg border border-border bg-background p-1', className)}
      role="group"
      aria-label={ariaLabel}
    >
      {opties.map(({ waarde: w, label, icon: Icon, ariaLabel: optieLabel }) => (
        <button
          key={String(w)}
          type="button"
          onClick={() => onChange(w)}
          aria-label={optieLabel}
          aria-pressed={waarde === w}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
            waarde === w
              ? 'bg-muted-foreground/80 text-background'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {Icon ? <Icon className="h-4 w-4" /> : null}
          {label}
        </button>
      ))}
    </div>
  )
}
