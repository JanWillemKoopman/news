'use client'

import { Eye, EyeOff } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'
import type { SectieConfig } from '@/lib/bruiloft/types'

export type SectieSleutel =
  | 'home'
  | 'programma'
  | 'dresscode'
  | 'cadeaulijst'
  | 'hotels'
  | 'routebeschrijving'
  | 'contact'
  | 'faq'
  | 'fotos'

export const SECTIES_VOLGORDE: SectieSleutel[] = [
  'home',
  'programma',
  'dresscode',
  'cadeaulijst',
  'hotels',
  'routebeschrijving',
  'contact',
  'faq',
  'fotos',
]

interface Props {
  sectiesConfig: Record<string, SectieConfig>
  actief: SectieSleutel
  onSelecteer: (s: SectieSleutel) => void
  onToggle: (s: SectieSleutel, zichtbaar: boolean) => void
}

export function PaginaSidebar({ sectiesConfig, actief, onSelecteer, onToggle }: Props) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const activeButtonRef = React.useRef<HTMLButtonElement>(null)

  const zichtbaar = SECTIES_VOLGORDE.filter((s) => {
    if (s === 'home') return true
    return sectiesConfig[s]?.zichtbaar !== false
  })
  const verborgen = SECTIES_VOLGORDE.filter((s) => {
    if (s === 'home') return false
    return sectiesConfig[s]?.zichtbaar === false
  })

  const naamVan = (s: SectieSleutel) =>
    s === 'home' ? 'Home' : (sectiesConfig[s]?.naam ?? s)

  const isVerborgen = (s: SectieSleutel) =>
    s !== 'home' && sectiesConfig[s]?.zichtbaar === false

  // Scroll de actieve tab automatisch in beeld op mobiel
  React.useEffect(() => {
    if (activeButtonRef.current && scrollContainerRef.current) {
      activeButtonRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      })
    }
  }, [actief])

  return (
    <>
      {/* Mobiel: horizontale scrollbare tabstrip */}
      <div className="lg:hidden">
        <div
          ref={scrollContainerRef}
          className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
        >
          {SECTIES_VOLGORDE.map((s) => {
            const verborgenItem = isVerborgen(s)
            const isActief = actief === s
            return (
              <div key={s} className="relative flex-none">
                <button
                  ref={isActief ? activeButtonRef : undefined}
                  type="button"
                  onClick={() => onSelecteer(s)}
                  className={cn(
                    'flex min-h-[44px] items-center whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors',
                    isActief
                      ? 'bg-primary text-primary-foreground'
                      : verborgenItem
                        ? 'bg-muted text-muted-foreground/40'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  {naamVan(s)}
                  {verborgenItem && !isActief && (
                    <EyeOff className="ml-1.5 h-3.5 w-3.5 shrink-0 opacity-60" />
                  )}
                </button>
                {/* Verberg/toon knop voor niet-home secties op mobiel */}
                {s !== 'home' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggle(s, !(sectiesConfig[s]?.zichtbaar ?? true))
                    }}
                    className={cn(
                      'absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-background text-white shadow-sm transition-opacity',
                      isActief ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                      sectiesConfig[s]?.zichtbaar !== false ? 'bg-primary/80' : 'bg-muted-foreground/60'
                    )}
                    title={sectiesConfig[s]?.zichtbaar !== false ? 'Verbergen' : 'Tonen'}
                  >
                    {sectiesConfig[s]?.zichtbaar !== false ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3" />
                    )}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Desktop: verticale zijbalk */}
      <nav className="hidden lg:flex w-52 shrink-0 flex-col gap-4 border-r border-border pr-4">
        <div>
          <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Actief
          </p>
          <ul className="space-y-0.5">
            {zichtbaar.map((s) => (
              <SidebarRij
                key={s}
                s={s}
                actief={actief}
                naam={naamVan(s)}
                sectiesConfig={sectiesConfig}
                onSelecteer={onSelecteer}
                onToggle={onToggle}
              />
            ))}
          </ul>
        </div>
        {verborgen.length > 0 && (
          <div>
            <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Verborgen
            </p>
            <ul className="space-y-0.5">
              {verborgen.map((s) => (
                <SidebarRij
                  key={s}
                  s={s}
                  actief={actief}
                  naam={naamVan(s)}
                  sectiesConfig={sectiesConfig}
                  onSelecteer={onSelecteer}
                  onToggle={onToggle}
                />
              ))}
            </ul>
          </div>
        )}
      </nav>
    </>
  )
}

function SidebarRij({
  s,
  actief,
  naam,
  sectiesConfig,
  onSelecteer,
  onToggle,
}: {
  s: SectieSleutel
  actief: SectieSleutel
  naam: string
  sectiesConfig: Record<string, SectieConfig>
  onSelecteer: (s: SectieSleutel) => void
  onToggle: (s: SectieSleutel, zichtbaar: boolean) => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelecteer(s)}
        className={cn(
          'group flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
          actief === s
            ? 'bg-primary/10 font-medium text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        )}
      >
        <span className="truncate">{naam}</span>
        {s !== 'home' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggle(s, !(sectiesConfig[s]?.zichtbaar ?? true))
            }}
            className="ml-2 shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent"
            title={sectiesConfig[s]?.zichtbaar !== false ? 'Verbergen' : 'Tonen'}
          >
            {sectiesConfig[s]?.zichtbaar !== false ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        )}
      </button>
    </li>
  )
}
