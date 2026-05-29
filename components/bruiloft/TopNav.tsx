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
    <header className="bg-[#2a3c50] text-white shadow-header md:sticky md:top-0 md:z-40">
      <div className="flex h-16 items-center gap-6 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/bruiloft"
          aria-label="Naar het overzicht"
          className="group shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#2a3c50]"
        >
          <img
            src="/logo.png"
            alt="Logo"
            className="h-9 w-auto object-contain"
          />
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
                    ? 'bg-[#365473] text-white'
                    : 'text-white/80 hover:bg-[#365473]/70 hover:text-white'
                )}
              >
                {section.label}
              </Link>
            )
          })}
        </nav>

        {/* Spacer op mobiel zodat het account-menu rechts uitlijnt. */}
        <span className="flex-1 md:hidden" aria-hidden />

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
