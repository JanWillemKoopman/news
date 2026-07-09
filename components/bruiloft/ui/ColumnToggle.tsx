'use client'

import { Columns2, Columns3, Square } from 'lucide-react'

import { SegmentedControl } from './SegmentedControl'

export type KolomAantal = 1 | 2 | 3

interface ColumnToggleProps {
  waarde: KolomAantal
  onChange: (v: KolomAantal) => void
  /** Welke kolomaantallen tonen — bv. [1, 2] op taken/budget (geen 3e optie). */
  opties?: KolomAantal[]
  ariaLabel?: string
  className?: string
}

const ALLE_OPTIES = [
  { waarde: 1 as const, icon: Square, ariaLabel: '1 kolom' },
  { waarde: 2 as const, icon: Columns2, ariaLabel: '2 kolommen' },
  { waarde: 3 as const, icon: Columns3, ariaLabel: '3 kolommen' },
]

// Herbruikbare kolomkeuze — dunne schil om het gedeelde SegmentedControl.
export function ColumnToggle({
  waarde,
  onChange,
  opties = [1, 2, 3],
  ariaLabel = 'Aantal kolommen',
  className,
}: ColumnToggleProps) {
  return (
    <SegmentedControl
      waarde={waarde}
      onChange={onChange}
      ariaLabel={ariaLabel}
      className={className}
      opties={ALLE_OPTIES.filter((o) => opties.includes(o.waarde)).map((o) => ({
        ...o,
        label: o.waarde,
      }))}
    />
  )
}
