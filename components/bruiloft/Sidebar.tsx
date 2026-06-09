'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { activeSection, isActive, visibleSections } from './nav'

export function Sidebar() {
  const pathname = usePathname()
  const permissions = useBruiloftStore((s) => s.permissions)
  const sections = visibleSections(permissions)
  const current = activeSection(pathname)
  const currentSection = sections.find((s) => s.key === current.key) ?? sections[0]

  if (!currentSection) return null

  const renderItem = (item: (typeof currentSection.items)[number]) => {
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
      </Link>
    )
  }

  const groupLabelClass =
    'px-3 pb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-header-muted/70'

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-header-border bg-header-active px-3 py-6 md:flex">
      {currentSection.groups && currentSection.groups.length > 0 ? (
        // Sectie met subkoppen: elke groep krijgt een eigen (niet-klikbare) kop.
        currentSection.groups.map((group, i) => (
          <div key={group.label} className={cn('flex flex-col', i > 0 && 'mt-6')}>
            <p className={groupLabelClass}>{group.label}</p>
            <nav className="flex flex-col gap-0.5" aria-label={group.label}>
              {group.items.map(renderItem)}
            </nav>
          </div>
        ))
      ) : (
        <>
          <p className={groupLabelClass}>{currentSection.label}</p>
          <nav className="flex flex-col gap-0.5" aria-label="Sub-navigatie">
            {currentSection.items.map(renderItem)}
          </nav>
        </>
      )}
    </aside>
  )
}
