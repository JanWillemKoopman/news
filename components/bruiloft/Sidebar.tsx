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
    <aside className="hidden w-64 shrink-0 flex-col border-r border-[#2a3250] bg-[#365473] px-3 py-6 md:flex">
      <p className="px-3 pb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#dce5ee]/70">
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
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#365473]',
                active
                  ? 'bg-[#304862] font-medium text-[#dce5ee]'
                  : 'text-[#dce5ee]/80 hover:bg-[#304862] hover:text-[#dce5ee]'
              )}
            >
              <item.icon
                className={cn(
                  'h-[18px] w-[18px] shrink-0 transition-colors',
                  active ? 'text-[#83a1be]' : 'text-[#83a1be]/70 group-hover:text-[#83a1be]'
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
