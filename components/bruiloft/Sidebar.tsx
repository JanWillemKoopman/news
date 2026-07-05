'use client'

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'

import { cn } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { activeSection, isActive, visibleSections } from './nav'

// Onthoud de inklap-voorkeur over pagina's en sessies heen.
const INGEKLAPT_KEY = 'bruiloft-sidebar-ingeklapt'

export function Sidebar() {
  const pathname = usePathname()
  const permissions = useBruiloftStore((s) => s.permissions)
  const sections = visibleSections(permissions)
  const current = activeSection(pathname)
  const currentSection = sections.find((s) => s.key === current.key) ?? sections[0]

  // Na mount uit localStorage lezen (SSR rendert altijd uitgeklapt).
  const [ingeklapt, setIngeklapt] = React.useState(false)
  React.useEffect(() => {
    try {
      setIngeklapt(localStorage.getItem(INGEKLAPT_KEY) === '1')
    } catch {
      // localStorage niet beschikbaar — laat uitgeklapt.
    }
  }, [])

  function toggle() {
    const volgende = !ingeklapt
    setIngeklapt(volgende)
    try {
      localStorage.setItem(INGEKLAPT_KEY, volgende ? '1' : '0')
    } catch {
      // Voorkeur niet kunnen bewaren is geen probleem.
    }
  }

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
        title={ingeklapt ? item.label : undefined}
        className={cn(
          'group flex items-center gap-3 rounded-md py-2 text-sm transition-colors',
          ingeklapt ? 'justify-center px-0' : 'px-3',
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
        {!ingeklapt && item.label}
      </Link>
    )
  }

  const groupLabelClass =
    'px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-header-muted/70 first:pt-0'

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col border-r border-header-border bg-header-active transition-[width] duration-200 md:flex',
        ingeklapt ? 'w-14' : 'w-64'
      )}
    >
      <div
        className={cn(
          'flex flex-1 flex-col overflow-y-auto py-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-rhino-700',
          ingeklapt ? 'px-2' : 'px-3'
        )}
      >
        {currentSection.groups && currentSection.groups.length > 0 ? (
          currentSection.groups.map((group, i) => (
            <div key={group.label} className="flex flex-col">
              {ingeklapt ? (
                i > 0 && <div className="mx-2 my-3 h-px bg-header-border" />
              ) : (
                <p className={groupLabelClass}>{group.label}</p>
              )}
              <nav className="flex flex-col gap-0.5" aria-label={group.label}>
                {group.items.map(renderItem)}
              </nav>
            </div>
          ))
        ) : (
          <>
            {!ingeklapt && <p className={groupLabelClass}>{currentSection.label}</p>}
            <nav className="flex flex-col gap-0.5" aria-label="Sub-navigatie">
              {currentSection.items.map(renderItem)}
            </nav>
          </>
        )}
      </div>

      {/* Inklap-/uitklapknop */}
      <div className={cn('border-t border-header-border py-2', ingeklapt ? 'px-2' : 'px-3')}>
        <button
          type="button"
          onClick={toggle}
          title={ingeklapt ? 'Zijbalk uitklappen' : 'Zijbalk inklappen'}
          className={cn(
            'flex w-full items-center gap-3 rounded-md py-2 text-sm text-header-muted/70 transition-colors hover:bg-rhino-800 hover:text-header-muted',
            ingeklapt ? 'justify-center px-0' : 'px-3',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-header-active'
          )}
        >
          {ingeklapt ? (
            <PanelLeftOpen className="h-[18px] w-[18px] shrink-0 text-rhino-300/70" />
          ) : (
            <>
              <PanelLeftClose className="h-[18px] w-[18px] shrink-0 text-rhino-300/70" />
              Zijbalk inklappen
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
