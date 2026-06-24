'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowRight, Compass, MapPin, Sparkles } from 'lucide-react'

import { Card, CardContent, Money } from '@/components/bruiloft/ui'
import { capFirst, cn } from '@/lib/utils'
import { dagenTot } from '@/lib/bruiloft/format'
import { budgetTotalen } from '@/lib/bruiloft/derived'
import { canView } from '@/lib/bruiloft/permissions'
import { BADGE_STIJL } from '@/lib/bruiloft/suppliers/linked'
import { richtbudgetMap } from '@/lib/bruiloft/suppliers/match'
import type { AISupplierMatch } from '@/app/api/ai/leveranciers-rank/route'
import { useBruiloftStore } from '@/store/bruiloftStore'

// Toont de top-leveranciers uit de globale directory, gerangschikt op het
// profiel van het bruidspaar. Rendert niets als er (nog) geen suggesties zijn.
export function AanbevolenLeveranciers() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const vendors = useBruiloftStore((s) => s.vendors)
  const budgetItems = useBruiloftStore((s) => s.budgetItems)
  const permissions = useBruiloftStore((s) => s.permissions)

  const [matches, setMatches] = React.useState<AISupplierMatch[]>([])

  const mag = canView(permissions, 'leveranciers')

  React.useEffect(() => {
    if (!wedding || !mag) return
    const geboekt = Array.from(
      new Set(vendors.filter((v) => v.status === 'geboekt').map((v) => v.type))
    )
    const rb = richtbudgetMap(budgetTotalen(budgetItems, vendors, wedding).perCategorie)
    const profiel = {
      budget: wedding.totaalBudget,
      woonplaats: wedding.woonplaats,
      provincie: wedding.provincie || undefined,
      daggasten: wedding.aantalDaggasten,
      avondgasten: wedding.aantalAvondgasten,
      geboekt,
      dagen: dagenTot(wedding.trouwdatum),
      richtbudget: Object.keys(rb).length > 0 ? rb : undefined,
    }

    let actief = true
    // Hybride AI-ranking (#24); het endpoint valt zelf terug op de rekenregel.
    // Bij een harde fout op het endpoint vallen we hier terug op de zoek-API.
    fetch('/api/ai/leveranciers-rank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weddingId: wedding.id, profiel }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (actief && data?.matches) setMatches(data.matches as AISupplierMatch[])
      })
      .catch(() => {
        // Terugval: rekenregel-zoekroute.
        const params = new URLSearchParams({
          sort: 'match',
          limit: '6',
          budget: String(wedding.totaalBudget),
          woonplaats: wedding.woonplaats,
          daggasten: String(wedding.aantalDaggasten),
          avondgasten: String(wedding.aantalAvondgasten),
          geboekt: geboekt.join(','),
          dagen: String(dagenTot(wedding.trouwdatum)),
        })
        if (wedding.provincie) params.set('profielProvincie', wedding.provincie)
        if (profiel.richtbudget) params.set('richtbudget', JSON.stringify(profiel.richtbudget))
        fetch(`/api/suppliers/search?${params.toString()}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (actief && data?.matches) setMatches(data.matches as AISupplierMatch[])
          })
          .catch(() => {})
      })
    return () => {
      actief = false
    }
  }, [wedding, vendors, budgetItems, mag])

  if (!mag || matches.length === 0 || (wedding?.trouwdatum ? dagenTot(wedding.trouwdatum) < 0 : false)) return null

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-medium text-foreground">
          <Compass className="h-5 w-5 text-rose-600" /> Aanbevolen leveranciers voor jullie
        </h2>
        <Link
          href="/bruiloft/ontdekken"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Alles ontdekken <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {matches.slice(0, 6).map((m) => (
          <Link key={m.supplier.id} href="/bruiloft/ontdekken" className="block">
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardContent className="p-4">
                <p className="truncate font-medium text-foreground">{m.supplier.naam}</p>
                <p className="text-xs text-muted-foreground">
                  {capFirst(m.supplier.type || m.supplier.categorie)}
                </p>
                {m.supplier.plaats ? (
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" /> {m.supplier.plaats}
                  </p>
                ) : null}
                {m.badges.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.badges.map((b) => (
                      <span key={b} className={cn('rounded-full px-2 py-0.5 text-xs font-medium', BADGE_STIJL[b])}>
                        {b}
                      </span>
                    ))}
                  </div>
                )}
                {!m.supplier.isPrijsOpAanvraag && m.supplier.prijsVanaf != null ? (
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    vanaf <Money bedrag={m.supplier.prijsVanaf} />
                  </p>
                ) : null}
                {m.aiReden ? (
                  <p className="mt-2 flex items-start gap-1.5 text-xs italic text-muted-foreground">
                    <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-rose-400" /> {m.aiReden}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}
