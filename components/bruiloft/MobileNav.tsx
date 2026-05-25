'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MoreHorizontal } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { MoreSheet } from './MoreSheet'
import { isActive, MOBILE_PRIMARY, NAV_ITEMS, visibleItems } from './nav'

// Onderbalk op mobiel: ~4 hoofditems + "Meer" voor de overige secties.
export function MobileNav() {
  const pathname = usePathname()
  const permissions = useBruiloftStore((s) => s.permissions)
  const [meer, setMeer] = React.useState(false)

  const primary = visibleItems(MOBILE_PRIMARY, permissions)
  const primaryHrefs = new Set(primary.map((i) => i.href))
  const meerActief = visibleItems(NAV_ITEMS, permissions).some(
    (i) => !primaryHrefs.has(i.href) && isActive(pathname, i.href)
  )

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/90 backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-between px-1">
          {primary.map((item) => {
            const active = isActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
          <button
            type="button"
            onClick={() => setMeer(true)}
            aria-haspopup="dialog"
            className={cn(
              'flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
              meerActief ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            Meer
          </button>
        </div>
      </nav>
      <MoreSheet open={meer} onOpenChange={setMeer} />
    </>
  )
}
