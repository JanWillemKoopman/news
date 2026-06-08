'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles, Search } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { activeSection, visibleSections } from './nav'
import { UserMenu } from './UserMenu'
import { GlobalSearch, useGlobalSearch } from './GlobalSearch'

// Donkere navy header — Riley & Grey-stijl. Bevat het logo (ampersand-mark)
// links, een horizontaal hoofdmenu in het midden en het accountmenu rechts.
// Verbergt op smalle viewports het horizontale menu; daar pakt de onderbalk
// (MobileNav) het over.
export function TopNav() {
  const pathname = usePathname()
  const permissions = useBruiloftStore((s) => s.permissions)
  const sections = visibleSections(permissions)
  const active = activeSection(pathname)
  const { open: searchOpen, setOpen: setSearchOpen } = useGlobalSearch()

  return (
    <>
    <header className="bg-header-bg text-white shadow-header md:sticky md:top-0 md:z-40">
      <div className="flex h-16 items-center gap-6 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/bruiloft"
          aria-label="Naar het overzicht"
          className="group shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-header-bg"
        >
          <Image
            src="/logo.png"
            alt="Logo"
            width={120}
            height={36}
            className="h-9 w-auto object-contain"
            priority
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
                    ? 'bg-header-active text-white'
                    : 'text-white/80 hover:bg-header-active/70 hover:text-white'
                )}
              >
                {section.label}
              </Link>
            )
          })}
        </nav>

        {/* Spacer op mobiel zodat het account-menu rechts uitlijnt. */}
        <span className="flex-1 md:hidden" aria-hidden />

        {/* Account-menu (rechts) + zoekknop + AI-knop. */}
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white/80 hover:bg-white/15 hover:text-white transition-colors"
            aria-label="Zoeken"
          >
            <Search className="h-4 w-4" aria-hidden />
            <span className="hidden lg:inline">Zoeken</span>
            <kbd className="hidden lg:inline ml-1 rounded border border-white/20 bg-white/10 px-1 py-0.5 text-[11px] leading-none text-white/60">⌘K</kbd>
          </button>
          <Link
            href="/bruiloft/ai-wedding-planner"
            aria-current={pathname.startsWith('/bruiloft/ai-wedding-planner') ? 'page' : undefined}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors border',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-rhino-800',
              pathname.startsWith('/bruiloft/ai-wedding-planner')
                ? 'bg-white/15 text-white border-white/40'
                : 'bg-transparent text-white/80 border-white/25 hover:bg-white/10 hover:text-white hover:border-white/40'
            )}
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            <span>AI-assistent</span>
          </Link>
          <UserMenu variant="dark" />
        </div>
        <div className="flex items-center gap-1 md:hidden">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Zoeken"
            className="inline-flex items-center justify-center rounded-md p-2 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Search className="h-4 w-4" aria-hidden />
          </button>
          <Link
            href="/bruiloft/ai-wedding-planner"
            aria-label="AI-assistent"
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-medium transition-colors border',
              pathname.startsWith('/bruiloft/ai-wedding-planner')
                ? 'bg-white/15 text-white border-white/40'
                : 'bg-transparent text-white/80 border-white/25 hover:bg-white/10 hover:text-white hover:border-white/40'
            )}
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>AI-assistent</span>
          </Link>
          <UserMenu variant="dark" compact />
        </div>
      </div>
    </header>
    <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
