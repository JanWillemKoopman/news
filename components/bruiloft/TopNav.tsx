'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { activeSection, visibleSections } from './nav'
import { useAIAdvies } from './ai/useAIAdvies'
import { LeveranciersMegaMenu } from './LeveranciersMegaMenu'
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

  // De AI-assistent-knop opent het coach-paneel (zie AICoach in WeddingShell).
  // Het stipje vraagt alleen aandacht als er een kritiek advies klaarstaat.
  const aiCoachOpen = useBruiloftStore((s) => s.aiCoachOpen)
  const openAICoach = useBruiloftStore((s) => s.openAICoach)
  const { zichtbaar } = useAIAdvies()
  const heeftKritiek = zichtbaar.some((a) => a.urgentie === 'kritiek')

  return (
    <header className="relative bg-header-bg text-white shadow-header md:sticky md:top-0 md:z-40">
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
            if (section.key === 'leveranciers') {
              return (
                <LeveranciersMegaMenu key={section.key} section={section} isActive={isActiveSection} />
              )
            }
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

        {/* Account-menu (rechts) + AI-knop. */}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={openAICoach}
            aria-haspopup="dialog"
            aria-expanded={aiCoachOpen}
            className={cn(
              'relative inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors border',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-rhino-800',
              aiCoachOpen
                ? 'bg-white/15 text-white border-white/40'
                : 'bg-transparent text-white/80 border-white/25 hover:bg-white/10 hover:text-white hover:border-white/40'
            )}
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            <span>AI-assistent</span>
            {heeftKritiek ? (
              <span
                aria-hidden
                className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-rhino-800"
              />
            ) : null}
          </button>
          <UserMenu variant="dark" />
        </div>
      </div>
    </header>
  )
}
