'use client'

import * as React from 'react'
import { Check, ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useDismiss } from './useDismiss'

export interface FilterDropdownOption {
  value: string
  label: string
  /** Optioneel aantal achter de optie (en op de knop bij de actieve keuze). */
  count?: number
  /** Toont een vinkje vóór het label (bv. een categorie die al geboekt is). */
  check?: boolean
}

interface FilterDropdownProps {
  value: string
  onChange: (value: string) => void
  options: FilterDropdownOption[]
  ariaLabel?: string
  className?: string
}

// Hét dropdown-filter van de app: knop met de huidige keuze (+ optioneel
// aantal), die een optielijst opent. De actieve staat is bewust neutraal
// grijs — een gekozen filter "vraagt geen aandacht" in de zin van de
// rose-regel; het aantal-badge communiceert de actieve toestand al.
export function FilterDropdown({ value, onChange, options, ariaLabel, className }: FilterDropdownProps) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const close = React.useCallback(() => setOpen(false), [])
  useDismiss(open, close, ref)

  const actief = options.find((o) => o.value === value) ?? options[0]
  const isActief = value !== (options[0]?.value ?? 'all')
  const heeftCounts = options.some((o) => o.count !== undefined)

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'inline-flex h-10 max-w-44 items-center gap-2 whitespace-nowrap rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          open || isActief
            ? 'border-foreground/20 bg-muted text-foreground'
            : 'border-input bg-background text-foreground hover:bg-muted'
        )}
      >
        {actief?.check ? <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" /> : null}
        <span className="truncate">{actief?.label}</span>
        {heeftCounts ? <CountBadge actief={isActief} count={actief?.count ?? 0} /> : null}
        <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full z-20 mt-1 max-h-72 w-56 overflow-y-auto rounded-lg border border-border bg-background shadow-lg"
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
                'flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors first:rounded-t-lg last:rounded-b-lg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                opt.value === value ? 'bg-muted font-medium text-foreground' : 'text-foreground hover:bg-muted'
              )}
            >
              <span className="inline-flex min-w-0 items-center gap-1.5">
                {opt.check ? <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" /> : null}
                <span className="truncate">{opt.label}</span>
              </span>
              {opt.count !== undefined ? (
                <CountBadge actief={opt.value === value} count={opt.count} />
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function CountBadge({ actief, count }: { actief: boolean; count: number }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-1.5 py-0.5 text-xs font-semibold',
        actief ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
      )}
    >
      {count}
    </span>
  )
}
