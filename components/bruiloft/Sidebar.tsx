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

  // Leveranciers en ontdekken-pagina's gebruiken een eigen inhouds-sidebar;
  // verberg de blauwe navigatiesidebar zodat de inhoud de volledige breedte krijgt.
  if (pathname === '/bruiloft/leveranciers' || pathname.startsWith('/bruiloft/ontdekken')) return null

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
    'px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-header-muted/70 first:pt-0'

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-header-border bg-header-active md:flex">
      <div className="flex flex-1 flex-col overflow-y-auto px-3 py-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-rhino-700">
        {currentSection.groups && currentSection.groups.length > 0 ? (
          currentSection.groups.map((group) => (
            <div key={group.label} className="flex flex-col">
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
      </div>
    </aside>
  )
}
