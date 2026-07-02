'use client'

import * as React from 'react'
import { Sparkles } from 'lucide-react'

import { LoadingDots } from '@/components/bruiloft/ui'
import { budgetTotalen } from '@/lib/bruiloft/derived'
import { dagenTot } from '@/lib/bruiloft/format'
import { richtbudgetMap, type SupplierMatch } from '@/lib/bruiloft/suppliers/match'
import { cn } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { getCategorieIcoon } from './categorieIcoon'

export interface AISupplierMatch extends SupplierMatch {
  aiReden?: string
}

interface AIVendorAanbevelingenProps {
  onOpen: (match: AISupplierMatch) => void
  className?: string
}

// AI-laag voor de ontdekken-pagina: vervangt de vroegere zichtbare
// matchscore/badges per kaart door precies één samenvattende zin per
// aanbevolen leverancier (via /api/ai/leveranciers-rank). Zelfde visuele
// idioom als AIInsightCard elders in de app, maar met een eigen databron —
// dit vergelijkt leveranciers onderling, geen wall-of-data over één sectie.
// Faalt altijd zacht: bij een lege/mislukte respons toont dit component niets.
export function AIVendorAanbevelingen({ onOpen, className }: AIVendorAanbevelingenProps) {
  const wedding = useBruiloftStore((s) => s.wedding)
  const vendors = useBruiloftStore((s) => s.vendors)
  const budgetItems = useBruiloftStore((s) => s.budgetItems)

  const [matches, setMatches] = React.useState<AISupplierMatch[]>([])
  const [laden, setLaden] = React.useState(true)

  React.useEffect(() => {
    if (!wedding) return
    let actief = true
    setLaden(true)

    const geboekt = Array.from(new Set(vendors.filter((v) => v.status === 'geboekt').map((v) => v.type)))
    const rb = richtbudgetMap(budgetTotalen(budgetItems, vendors, wedding).perCategorie)

    fetch('/api/ai/leveranciers-rank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weddingId: wedding.id,
        profiel: {
          budget: wedding.totaalBudget,
          woonplaats: wedding.woonplaats,
          provincie: wedding.provincie || undefined,
          daggasten: wedding.aantalDaggasten,
          avondgasten: wedding.aantalAvondgasten,
          geboekt,
          dagen: dagenTot(wedding.trouwdatum),
          richtbudget: Object.keys(rb).length > 0 ? rb : undefined,
        },
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { matches?: AISupplierMatch[] } | null) => {
        if (actief && data?.matches) setMatches(data.matches.slice(0, 3))
      })
      .catch(() => {
        // Faalt zacht: de sectie toont dan simpelweg niets.
      })
      .finally(() => {
        if (actief) setLaden(false)
      })

    return () => {
      actief = false
    }
    // Alleen opnieuw ophalen wanneer de bruiloft wisselt — niet bij elke
    // vendors/budget-mutatie, dat zou de AI-aanroep te vaak triggeren.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wedding?.id])

  if (laden) {
    return (
      <div className={cn('mb-6 flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-xs', className)}>
        <LoadingDots />
        <span className="text-sm text-muted-foreground">AI zoekt de beste match voor jullie…</span>
      </div>
    )
  }

  if (matches.length === 0) return null

  return (
    <div className={cn('mb-6 rounded-xl border border-border bg-card p-4 shadow-xs animate-fade-in', className)}>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Sparkles className="h-4 w-4" />
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          AI aanbevolen voor jullie
        </p>
      </div>
      <div className="mt-3 space-y-1">
        {matches.map((m) => {
          const Icoon = getCategorieIcoon(m.supplier.categorie)
          return (
            <button
              key={m.supplier.id}
              type="button"
              onClick={() => onOpen(m)}
              className="flex w-full items-start gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icoon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{m.supplier.naam}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{m.aiReden || m.uitleg}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
