'use client'

import * as React from 'react'
import { MoreHorizontal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface OverflowMenuItem {
  label: string
  icon?: LucideIcon
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}

interface OverflowMenuProps {
  items: OverflowMenuItem[]
  label?: string
  align?: 'left' | 'right'
}

// Ingetogen "•••"-menu voor secundaire acties, zodat de header één primaire
// knop houdt. Zelfde hand-gerolde dropdown als TakenFilters: knop + absoluut
// panel + buiten-klik om te sluiten.
export function OverflowMenu({ items, label = 'Meer acties', align = 'right' }: OverflowMenuProps) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    function handler(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function keyHandler(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('pointerdown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [open])

  if (items.length === 0) return null

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((p) => !p)}
        className={cn(
          'inline-flex h-10 w-10 items-center justify-center rounded-md border transition-colors',
          open
            ? 'border-border bg-accent text-foreground'
            : 'border-input bg-background text-foreground hover:bg-accent'
        )}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute top-full z-20 mt-1 w-56 overflow-hidden rounded-lg border border-border bg-background p-1 shadow-lg',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {items.map((item, i) => (
            <button
              key={`${item.label}-${i}`}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false)
                item.onClick()
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors disabled:pointer-events-none disabled:opacity-50',
                item.danger
                  ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                  : 'text-foreground hover:bg-accent'
              )}
            >
              {item.icon ? <item.icon className={cn('h-4 w-4 shrink-0', item.danger ? 'text-rose-500' : 'text-muted-foreground')} /> : null}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
