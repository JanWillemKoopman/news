'use client'

import * as React from 'react'
import { Check } from 'lucide-react'

import { Progress } from '@/components/bruiloft/ui'
import { capFirst, cn } from '@/lib/utils'
import { VENDOR_TYPES } from '@/lib/bruiloft/options'
import type { Vendor, VendorType } from '@/lib/bruiloft/types'

interface CategorieVoortgangProps {
  vendors: Vendor[]
  // De chips zijn meteen het typefilter van de lijst eronder.
  waarde: string // 'all' of VendorType
  onChange: (waarde: string) => void
}

// Voortgangsstrip: hoeveel categorieën zijn geboekt + chips per categorie
// (vinkje = geboekt, stip = bezig, leeg = nog niets) die als typefilter werken.
export function CategorieVoortgang({ vendors, waarde, onChange }: CategorieVoortgangProps) {
  const perCategorie = React.useMemo(() => {
    const m = new Map<VendorType, { aantal: number; geboekt: boolean }>()
    for (const t of VENDOR_TYPES) m.set(t, { aantal: 0, geboekt: false })
    for (const v of vendors) {
      const cur = m.get(v.type)
      if (!cur) continue
      cur.aantal++
      if (v.status === 'geboekt') cur.geboekt = true
    }
    return m
  }, [vendors])

  const geboektAantal = Array.from(perCategorie.values()).filter((c) => c.geboekt).length

  return (
    <div className="mb-6 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          {geboektAantal} van {VENDOR_TYPES.length} categorieën geboekt
        </p>
        {waarde !== 'all' ? (
          <button
            type="button"
            onClick={() => onChange('all')}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Toon alles
          </button>
        ) : null}
      </div>
      <Progress value={(geboektAantal / VENDOR_TYPES.length) * 100} className="mt-2 h-1.5" />

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {VENDOR_TYPES.map((t) => {
          const info = perCategorie.get(t)!
          const actief = waarde === t
          return (
            <button
              key={t}
              type="button"
              aria-pressed={actief}
              onClick={() => onChange(actief ? 'all' : t)}
              className={cn(
                'inline-flex min-h-[2.25rem] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-sm transition-colors',
                actief
                  ? 'border-primary bg-primary font-medium text-primary-foreground'
                  : 'border-border bg-background text-foreground hover:bg-accent',
                !actief && info.aantal === 0 && 'text-muted-foreground'
              )}
            >
              {info.geboekt ? (
                <Check className={cn('h-3.5 w-3.5', actief ? '' : 'text-emerald-600 dark:text-emerald-400')} />
              ) : info.aantal > 0 ? (
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    actief ? 'bg-primary-foreground' : 'bg-amber-500'
                  )}
                  aria-hidden
                />
              ) : null}
              {capFirst(t)}
              {info.aantal > 0 ? (
                <span
                  className={cn(
                    'rounded-full px-1.5 text-xs tabular-nums',
                    actief ? 'bg-primary-foreground/20' : 'bg-foreground/[0.08] text-muted-foreground'
                  )}
                >
                  {info.aantal}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
