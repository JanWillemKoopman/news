'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Heart } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Card } from '@/components/bruiloft/ui'
import { TPW_CATEGORIE_ITEMS, mijnLeveranciers, type NavSection } from './nav'

// Volgorde bepaald door de gebruiker — dichtst bij de populairste categorieën
// op theperfectwedding.nl, vertaald naar onze eigen 20-categorieënlijst.
const POPULAIRE_LABELS = [
  'Trouwlocaties',
  'Trouwjurken',
  'Trouwringen',
  'Trouwfotografen',
  'Videografen',
  'Bloemen',
]

interface LeveranciersMegaMenuProps {
  section: NavSection
  isActive: boolean
}

// Uitklap-megamenu voor de "Leveranciers"-link in de donkere header. In
// tegenstelling tot de overige sectielinks navigeert een klik hier niet
// direct, maar opent een paneel met "Mijn leveranciers" + de populairste
// categorieën (links) en alle overige categorieën (rechts). Alleen
// zichtbaar op md+ (de ouder-<nav> is al hidden md:flex), dus dit is
// automatisch beperkt tot tablet/desktop.
export function LeveranciersMegaMenu({ section, isActive }: LeveranciersMegaMenuProps) {
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const panelRef = React.useRef<HTMLDivElement>(null)
  const closeTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  function clearCloseTimeout() {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current)
      closeTimeout.current = null
    }
  }

  function openNow() {
    clearCloseTimeout()
    setOpen(true)
  }

  // Kleine vertraging zodat de muis van de link naar het paneel kan bewegen
  // zonder dat het menu tussentijds dichtklapt.
  function scheduleClose() {
    clearCloseTimeout()
    closeTimeout.current = setTimeout(() => setOpen(false), 150)
  }

  React.useEffect(() => {
    setOpen(false)
  }, [pathname])

  React.useEffect(() => clearCloseTimeout, [])

  React.useEffect(() => {
    if (!open) return
    const el = panelRef.current
    if (!el) return

    const focusable = () =>
      Array.from(el.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]'))

    focusable()[0]?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
      }
    }

    // Sluit ook bij een klik/tik buiten menu en trigger — voor toetsenbord- en
    // touch-gebruikers, die geen mouseleave krijgen.
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  const populair = POPULAIRE_LABELS.map((label) =>
    TPW_CATEGORIE_ITEMS.find((c) => c.label === label)
  ).filter((c): c is (typeof TPW_CATEGORIE_ITEMS)[number] => Boolean(c))

  const overig = TPW_CATEGORIE_ITEMS.filter((c) => !POPULAIRE_LABELS.includes(c.label)).sort(
    (a, b) => a.label.localeCompare(b.label, 'nl')
  )
  const overigHelft = Math.ceil(overig.length / 2)
  const overigKolommen = [overig.slice(0, overigHelft), overig.slice(overigHelft)]

  return (
    <div ref={containerRef} onMouseEnter={openNow} onMouseLeave={scheduleClose}>
      <button
        type="button"
        onClick={openNow}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-rhino-800',
          isActive || open
            ? 'bg-header-active text-white'
            : 'text-white/80 hover:bg-header-active/70 hover:text-white'
        )}
      >
        {section.label}
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="menu"
          aria-label="Leveranciers"
          className="absolute inset-x-0 top-full z-50 border-b border-border bg-background text-foreground shadow-xl"
        >
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Link
              href={mijnLeveranciers.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-2 rounded-full bg-rhino-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rhino-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Heart className="h-4 w-4" aria-hidden />
              Mijn leveranciers
            </Link>

            <div className="my-5 h-px bg-border" />

            <div className="flex gap-4 lg:gap-8">
              {/* Populaire categorieën */}
              <div className="w-56 shrink-0 lg:w-72">
                <h3 className="text-sm font-semibold text-foreground">Begin hier met zoeken</h3>
                <div className="mt-3 grid grid-cols-2 gap-2 lg:gap-3">
                  {populair.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        onClick={() => setOpen(false)}
                        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
                      >
                        <Card interactive className="flex flex-col items-center gap-2 p-3 text-center">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <Icon className="h-5 w-5" aria-hidden />
                          </span>
                          <span className="text-xs font-medium text-foreground">{item.label}</span>
                        </Card>
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* Overige categorieën */}
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground">
                  Zoek alle leveranciers voor een complete bruiloft
                </h3>
                <div className="mt-3 flex gap-4">
                  {overigKolommen.map((kolom, i) => (
                    <div key={i} className="flex flex-col">
                      {kolom.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          role="menuitem"
                          onClick={() => setOpen(false)}
                          className="rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-accent hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
