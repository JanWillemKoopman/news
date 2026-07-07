'use client'

import Link from 'next/link'

import { cn } from '@/lib/utils'
import { Card } from '@/components/bruiloft/ui'
import { type NavSection } from './nav'
import { useHoverMegaMenu } from './useHoverMegaMenu'

interface SectionMegaMenuProps {
  section: NavSection
  isActive: boolean
}

// Eenvoudiger uitklapmenu voor de overige hoofdsecties (Thuis, Plannen,
// Gasten, Trouwpagina): een horizontale rij kaartjes met precies de
// pagina's die ook in de zijbalk onder deze sectie staan (section.items).
// Zelfde hover/klik/toetsenbord-gedrag als het Leveranciers-megamenu, maar
// zonder de titels/kolommen — alleen bij Leveranciers is het paneel groter
// omdat er meer te kiezen valt.
export function SectionMegaMenu({ section, isActive }: SectionMegaMenuProps) {
  const { open, setOpen, containerRef, panelRef, handleMouseEnter, handleMouseLeave, handleTriggerClick } =
    useHoverMegaMenu()

  return (
    <div ref={containerRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        type="button"
        onClick={handleTriggerClick}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'inline-flex items-center rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-rhino-800',
          isActive || open
            ? 'bg-header-active text-white'
            : 'text-white/80 hover:bg-header-active/70 hover:text-white'
        )}
      >
        {section.label}
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="menu"
          aria-label={section.label}
          className="absolute inset-x-0 top-full z-50 border-b border-border bg-background text-foreground shadow-xl"
        >
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-wrap gap-4">
              {section.items.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
                  >
                    <Card interactive className="flex w-36 flex-col items-center gap-2 p-4 text-center">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <span className="text-sm font-medium text-foreground">{item.label}</span>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
