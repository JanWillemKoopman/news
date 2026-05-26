'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { activeSection, visibleSections } from './nav'
import { UserMenu } from './UserMenu'

// Donkere navy header — Riley & Grey-stijl. Bevat het logo (ampersand-mark)
// links, een horizontaal hoofdmenu in het midden en het accountmenu rechts.
// Verbergt op smalle viewports het horizontale menu; daar pakt de onderbalk
// (MobileNav) het over.
export function TopNav() {
  const pathname = usePathname()
  const permissions = useBruiloftStore((s) => s.permissions)
  const sections = visibleSections(permissions)
  const active = activeSection(pathname)

  return (
    <header className="sticky top-0 z-40 bg-rhino-800 text-white shadow-header">
      <div className="flex h-16 items-center gap-6 px-4 sm:px-6 lg:px-8">
        {/* Logo: serif ampersand in een licht vierkant. */}
        <Link
          href="/bruiloft"
          aria-label="Naar het overzicht"
          className="group flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-rhino-800"
        >
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-md bg-white text-rhino-800 shadow-sm"
          >
            <span className="font-serif text-[22px] font-medium leading-none">&amp;</span>
          </span>
          <span className="hidden font-serif text-lg tracking-tight text-white md:inline">
            Ons Trouwplan
          </span>
        </Link>

        {/* Hoofdmenu (horizontaal). */}
        <nav className="ml-2 hidden flex-1 items-center gap-1 md:flex" aria-label="Hoofdmenu">
          {sections.map((section) => {
            const isActiveSection = section.key === active.key
            return (
              <Link
                key={section.key}
                href={section.href}
                aria-current={isActiveSection ? 'page' : undefined}
                className={cn(
                  'inline-flex items-center rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-rhino-800',
                  isActiveSection
                    ? 'bg-rhino-700 text-white'
                    : 'text-rhino-100 hover:bg-rhino-700/70 hover:text-white'
                )}
              >
                {section.label}
              </Link>
            )
          })}
        </nav>

        {/* Mobiele app-titel — vult de ruimte waar het hoofdmenu zou staan. */}
        <span className="ml-auto font-serif text-base text-white md:hidden">Ons Trouwplan</span>

        {/* Account-menu (rechts). */}
        <div className="ml-auto hidden items-center md:flex">
          <UserMenu variant="dark" />
        </div>
        <div className="flex items-center md:hidden">
          <UserMenu variant="dark" compact />
        </div>
      </div>
    </header>
  )
}
