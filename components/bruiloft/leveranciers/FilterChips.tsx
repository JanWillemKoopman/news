'use client'

import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface ChipOption {
  value: string
  label: string
  count?: number
  icon?: LucideIcon
  // Gedimd maar wel klikbaar (bijv. status zonder leveranciers), zodat de
  // pipeline ruimtelijk stabiel blijft.
  dimmed?: boolean
}

interface FilterChipsProps {
  options: ChipOption[]
  value: string
  onChange: (value: string) => void
  label: string // toegankelijk groepslabel
  className?: string
}

// Horizontale chip-rij als filter. Mobiel: edge-to-edge scrollen zonder
// zichtbare scrollbar; desktop: wrappen.
export function FilterChips({ options, value, onChange, label, className }: FilterChipsProps) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        '-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0',
        className
      )}
    >
      {options.map((opt) => {
        const actief = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={actief}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex min-h-[2.5rem] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm capitalize transition-colors',
              actief
                ? 'border-primary bg-primary font-medium text-primary-foreground'
                : 'border-border bg-card text-foreground hover:bg-accent',
              !actief && opt.dimmed && 'text-muted-foreground opacity-60'
            )}
          >
            {opt.icon ? <opt.icon className="h-3.5 w-3.5 shrink-0" /> : null}
            {opt.label}
            {opt.count !== undefined ? (
              <span
                className={cn(
                  'rounded-full px-1.5 text-xs tabular-nums',
                  actief ? 'bg-primary-foreground/20' : 'bg-foreground/[0.08] text-muted-foreground'
                )}
              >
                {opt.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
