'use client'

import * as React from 'react'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Checkbox } from './Checkbox'
import { useDismiss } from './useDismiss'

export interface MultiFilterOption {
  value: string
  label: string
}

interface MultiFilterDropdownProps {
  /** Label op de knop zolang niet precies 1 optie is aangevinkt. */
  label: string
  values: string[]
  options: MultiFilterOption[]
  onChange: (values: string[]) => void
  /** Telt als "actief" (donkere knop) wanneer dit afwijkt van de standaardselectie. */
  isActive: boolean
  ariaLabel?: string
  className?: string
}

// Multi-select variant van FilterDropdown: knop + paneel met checkboxes i.p.v.
// losse, elkaar uitsluitende opties. Voor filters waar meerdere waarden
// tegelijk aan/uit gezet moeten kunnen worden (bv. taakstatus: "open" +
// "bezig" tegelijk tonen, "klaar" verbergen).
export function MultiFilterDropdown({
  label,
  values,
  options,
  onChange,
  isActive,
  ariaLabel,
  className,
}: MultiFilterDropdownProps) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const close = React.useCallback(() => setOpen(false), [])
  useDismiss(open, close, ref)

  const toggle = (value: string) => {
    onChange(
      values.includes(value) ? values.filter((v) => v !== value) : [...values, value]
    )
  }

  const buttonLabel =
    values.length === 1
      ? (options.find((o) => o.value === values[0])?.label ?? label)
      : values.length > 1
        ? `${label} (${values.length})`
        : label

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'inline-flex h-10 max-w-48 items-center gap-2 whitespace-nowrap rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          open || isActive
            ? 'border-foreground/20 bg-muted text-foreground'
            : 'border-input bg-background text-foreground hover:bg-muted'
        )}
      >
        <span className="truncate">{buttonLabel}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute right-0 top-full z-20 mt-1 w-52 rounded-lg border border-border bg-background p-1 shadow-lg"
        >
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-muted"
            >
              <Checkbox checked={values.includes(opt.value)} onChange={() => toggle(opt.value)} />
              {opt.label}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
