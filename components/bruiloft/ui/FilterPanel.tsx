'use client'

import * as React from 'react'
import { SlidersHorizontal, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useDismiss } from './useDismiss'

interface FilterPanelProps {
  /** Aantal actieve (niet-default) filters — getoond als badge op de knop. */
  activeCount: number
  /** Zet alle filters terug naar de default. */
  onWis: () => void
  /** De filtervelden (gelabelde Selects) in het paneel. */
  children: React.ReactNode
  className?: string
}

// Hét mobiele filterpaneel van de app: één "Filters"-knop met telbadge die
// een klein verankerd paneel opent met gelabelde velden. Desktop-toolbars
// tonen hun filters los (FilterDropdown); onder de lg-breakpoint is dit
// paneel de enige weg naar de filters.
export function FilterPanel({ activeCount, onWis, children, className }: FilterPanelProps) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const close = React.useCallback(() => setOpen(false), [])
  useDismiss(open, close, ref)

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          open ? 'border-foreground/20 bg-muted text-foreground' : 'border-input bg-background text-foreground hover:bg-muted'
        )}
      >
        <SlidersHorizontal className="h-4 w-4" />
        <span className="hidden sm:inline">Filters</span>
        {activeCount > 0 && (
          <span className="rounded-full bg-foreground px-1.5 py-0.5 text-xs font-semibold text-background">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-background p-4 shadow-lg sm:w-80">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Filters</span>
            {activeCount > 0 && <WisFilters onClick={onWis} />}
          </div>
          <div className="space-y-3">{children}</div>
        </div>
      )}
    </div>
  )
}

// Neutrale "Wis filters"-actie — opruimen is een secundaire actie en krijgt
// dus géén rose (dat betekent "vraagt aandacht"), gewoon grijs.
export function WisFilters({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 whitespace-nowrap rounded-sm text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className
      )}
    >
      <X className="h-3.5 w-3.5" />
      Wis filters
    </button>
  )
}

// Gelabeld veld binnen het paneel (label + Select), zodat elk paneel dezelfde
// typografie houdt.
export function FilterVeld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}
