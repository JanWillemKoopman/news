'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MoreHorizontal } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { MoreSheet } from './MoreSheet'
import { isActive, MOBILE_PRIMARY, NAV_ITEMS, visibleItems } from './nav'

export function MobileNav() {
  const pathname = usePathname()
  const permissions = useBruiloftStore((s) => s.permissions)
  const guests = useBruiloftStore((s) => s.guests)
  const tasks = useBruiloftStore((s) => s.tasks)
  const [meer, setMeer] = React.useState(false)

  const primary = visibleItems(MOBILE_PRIMARY, permissions)
  const primaryHrefs = new Set(primary.map((i) => i.href))
  const meerActief = visibleItems(NAV_ITEMS, permissions).some(
    (i) => !primaryHrefs.has(i.href) && isActive(pathname, i.href)
  )

  const vandaag = new Date().toISOString().slice(0, 10)
  const badges: Record<string, number> = {}
  const achterstallig = tasks.filter((t) => t.status !== 'klaar' && t.deadline < vandaag).length
  const rsvpPending = guests.filter((g) => g.rsvpStatus === 'uitgenodigd').length
  if (achterstallig > 0) badges['/bruiloft/taken'] = achterstallig
  if (rsvpPending > 0) badges['/bruiloft/gasten'] = rsvpPending

  return (
    <>
      <nav className="shrink-0 border-t border-border bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_3px_rgba(15,23,42,0.04)] md:hidden">
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
                  active ? 'text-rose-600' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <div className="relative">
                  <item.icon className="h-5 w-5" />
                  {badges[item.href] ? (
                    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[10px] font-bold text-white">
                      {badges[item.href] > 99 ? '99+' : badges[item.href]}
                    </span>
                  ) : null}
                </div>
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
              meerActief ? 'text-rose-600' : 'text-muted-foreground hover:text-foreground'
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
