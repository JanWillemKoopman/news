'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { activeSection, isActive, visibleSections } from './nav'

export function Sidebar() {
  const pathname = usePathname()
  const permissions = useBruiloftStore((s) => s.permissions)
  const guests = useBruiloftStore((s) => s.guests)
  const tasks = useBruiloftStore((s) => s.tasks)
  const sections = visibleSections(permissions)
  const current = activeSection(pathname)
  const currentSection = sections.find((s) => s.key === current.key) ?? sections[0]

  const vandaag = new Date().toISOString().slice(0, 10)
  const badges: Record<string, number> = {}
  const achterstallig = tasks.filter((t) => t.status !== 'klaar' && t.deadline < vandaag).length
  const rsvpPending = guests.filter((g) => g.rsvpStatus === 'uitgenodigd').length
  if (achterstallig > 0) badges['/bruiloft/taken'] = achterstallig
  if (rsvpPending > 0) badges['/bruiloft/gasten'] = rsvpPending

  if (!currentSection) return null

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-header-border bg-header-active px-3 py-6 md:flex">
      <p className="px-3 pb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-header-muted/70">
        {currentSection.label}
      </p>

      <nav className="flex flex-col gap-0.5" aria-label="Sub-navigatie">
        {currentSection.items.map((item) => {
          const active = isActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-header-active',
                active
                  ? 'bg-rhino-800 font-medium text-header-muted'
                  : 'text-header-muted/80 hover:bg-rhino-800 hover:text-header-muted'
              )}
            >
              <item.icon
                className={cn(
                  'h-[18px] w-[18px] shrink-0 transition-colors',
                  active ? 'text-rhino-300' : 'text-rhino-300/70 group-hover:text-rhino-300'
                )}
              />
              {item.label}
              {badges[item.href] ? (
                <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white">
                  {badges[item.href] > 99 ? '99+' : badges[item.href]}
                </span>
              ) : null}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
