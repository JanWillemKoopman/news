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

  return (
    <>
      {/* Mobiel: horizontale scrollbare tabstrip */}
      <div className="lg:hidden">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {SECTIES_VOLGORDE.map((s) => {
            const verborgenItem = isVerborgen(s)
            const active = actief === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => onSelecteer(s)}
                className={cn(
                  'flex-none whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : verborgenItem
                      ? 'bg-muted text-muted-foreground/50'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                {naamVan(s)}
              </button>
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
