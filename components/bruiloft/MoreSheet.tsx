'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Modal } from '@/components/bruiloft/ui'
import { cn } from '@/lib/utils'
import { isActive, NAV_GROUPS } from './nav'

interface MoreSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Bottom-sheet met alle secties (mobiel), geopend via "Meer" in de onderbalk.
export function MoreSheet({ open, onOpenChange }: MoreSheetProps) {
  const pathname = usePathname()
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Menu">
      <div className="flex flex-col gap-5 pb-2">
        {NAV_GROUPS.map((group, i) => (
          <div key={group.label ?? `groep-${i}`} className="flex flex-col gap-1">
            {group.label ? (
              <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.label}
              </p>
            ) : null}
            {group.items.map((item) => {
              const active = isActive(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => onOpenChange(false)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm transition-colors',
                    active
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-foreground hover:bg-accent'
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </div>
    </Modal>
  )
}
