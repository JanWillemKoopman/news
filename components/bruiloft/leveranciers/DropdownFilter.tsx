'use client'

import * as React from 'react'
import { Check, ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface DropdownFilterOption {
  value: string
  label: string
  count: number
  // Toont een vinkje vóór het label (bv. een categorie die al geboekt is).
  geboekt?: boolean
}

interface DropdownFilterProps {
  value: string
  onChange: (value: string) => void
  options: DropdownFilterOption[]
  ariaLabel: string
  className?: string
}

// Zelfde ontwerp als de statusfilter naast "Uitklappen" op /bruiloft/budget:
// een knop met de huidige keuze + aantal, die een lijst met opties opent
// (elk met een eigen aantal, sluit bij een klik buiten het paneel).
export function DropdownFilter({ value, onChange, options, ariaLabel, className }: DropdownFilterProps) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const actief = options.find((o) => o.value === value)

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors',
          open
            ? 'border-foreground/20 bg-muted text-foreground'
            : 'border-input bg-background text-foreground hover:bg-muted'
        )}
      >
        {actief?.geboekt ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : null}
        <span>{actief?.label}</span>
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-xs font-semibold',
            value !== 'all' ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
          )}
        >
          {actief?.count ?? 0}
        </span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-border bg-background shadow-lg"
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center justify-between gap-2 px-3 py-2.5 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg',
                opt.value === value ? 'bg-muted font-medium text-foreground' : 'text-foreground hover:bg-muted'
              )}
            >
              <span className="inline-flex min-w-0 items-center gap-1.5">
                {opt.geboekt ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : null}
                <span className="truncate">{opt.label}</span>
              </span>
              <span
                className={cn(
                  'shrink-0 rounded-full px-1.5 py-0.5 text-xs font-semibold',
                  opt.value === value ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
                )}
              >
                {opt.count}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
