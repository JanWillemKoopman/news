'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { activeSection, isActive, visibleSections } from './nav'

// Linker sub-zijbalk — Riley & Grey-stijl. Toont uitsluitend de items van de
// momenteel actieve top-sectie (zie TopNav). Lichte achtergrond, hairline
// rechterrand, sober iconen-naar-tekst layout.
export function Sidebar() {
  const pathname = usePathname()
  const permissions = useBruiloftStore((s) => s.permissions)
  const sections = visibleSections(permissions)
  const current = activeSection(pathname)
  const currentSection = sections.find((s) => s.key === current.key) ?? sections[0]

  if (!currentSection) return null

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-white px-3 py-6 md:flex">
      <p className="px-3 pb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
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
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                active
                  ? 'bg-rose-50 font-medium text-rose-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon
                className={cn(
                  'h-[18px] w-[18px] shrink-0 transition-colors',
                  active ? 'text-rose-600' : 'text-gray-400 group-hover:text-gray-600'
                )}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
