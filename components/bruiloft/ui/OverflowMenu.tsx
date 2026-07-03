'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
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

interface Positie {
  top: number
  left?: number
  right?: number
}

// Ingetogen "•••"-menu voor secundaire acties, zodat de header één primaire
// knop houdt. Het paneel rendert via een portal naar document.body met een
// vaste positie t.o.v. de knop, zodat het niet afgesneden wordt zodra de knop
// in een container met overflow staat (bv. een horizontaal scrollbare tabel —
// overflow-x: auto dwingt overflow-y ook naar auto, wat een absoluut
// gepositioneerd paneel binnen die container zou clippen).
export function OverflowMenu({ items, label = 'Meer acties', align = 'right' }: OverflowMenuProps) {
  const [open, setOpen] = React.useState(false)
  const [positie, setPositie] = React.useState<Positie | null>(null)
  const btnRef = React.useRef<HTMLButtonElement>(null)
  const panelRef = React.useRef<HTMLDivElement>(null)

  const berekenPositie = React.useCallback(() => {
    const rect = btnRef.current?.getBoundingClientRect()
    if (!rect) return
    setPositie(
      align === 'right'
        ? { top: rect.bottom + 4, right: window.innerWidth - rect.right }
        : { top: rect.bottom + 4, left: rect.left }
    )
  }, [align])

  React.useEffect(() => {
    if (!open) return
    berekenPositie()

    function handler(e: PointerEvent) {
      const target = e.target as Node
      if (btnRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
    }
    function keyHandler(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    // Sluiten bij scroll/resize i.p.v. herpositioneren: eenvoudiger en
    // voorkomt een paneel dat losraakt van de knop.
    function sluiten() {
      setOpen(false)
    }
    document.addEventListener('pointerdown', handler)
    document.addEventListener('keydown', keyHandler)
    window.addEventListener('scroll', sluiten, true)
    window.addEventListener('resize', sluiten)
    return () => {
      document.removeEventListener('pointerdown', handler)
      document.removeEventListener('keydown', keyHandler)
      window.removeEventListener('scroll', sluiten, true)
      window.removeEventListener('resize', sluiten)
    }
  }, [open, berekenPositie])

  if (items.length === 0) return null

  return (
    <>
      <button
        ref={btnRef}
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

      {open && positie
        ? createPortal(
            <div
              ref={panelRef}
              role="menu"
              style={{ position: 'fixed', top: positie.top, left: positie.left, right: positie.right }}
              className="z-50 w-56 overflow-hidden rounded-lg border border-border bg-background p-1 shadow-lg"
            >
              {items.map((item) => (
                <button
                  key={item.label}
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
                  {item.icon ? (
                    <item.icon className={cn('h-4 w-4 shrink-0', item.danger ? 'text-rose-500' : 'text-muted-foreground')} />
                  ) : null}
                  {item.label}
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </>
  )
}
