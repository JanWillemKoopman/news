'use client'

import { Inbox } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { ongelezenBerichten } from '@/lib/bruiloft/derived'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { activeSection, visibleSections } from './nav'
import { LeveranciersMegaMenu } from './LeveranciersMegaMenu'
import { SectionMegaMenu } from './SectionMegaMenu'
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
  const ongelezen = useBruiloftStore((s) =>
    ongelezenBerichten(s.messages, s.messageReads, s.currentUser?.id)
  )

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
            return <SectionMegaMenu key={section.key} section={section} isActive={isActiveSection} />
          })}
        </nav>

        {/* Spacer op mobiel zodat het account-menu rechts uitlijnt. */}
        <span className="flex-1 md:hidden" aria-hidden />

        {/* Account-menu (rechts). */}
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/bruiloft/berichten"
            aria-label={ongelezen > 0 ? `Berichten (${ongelezen} ongelezen)` : 'Berichten'}
            className="relative rounded-md p-2 text-white transition-colors hover:bg-rhino-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-rhino-800"
          >
            <Inbox className="h-5 w-5" />
            {ongelezen > 0 ? (
              <span
                aria-hidden
                className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-header-bg"
              >
                {ongelezen > 99 ? '99+' : ongelezen}
              </span>
            ) : null}
          </Link>
          <UserMenu variant="dark" />
        </div>
      </div>
    </header>
  )
}
