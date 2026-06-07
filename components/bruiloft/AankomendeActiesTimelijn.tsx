'use client'

import * as React from 'react'
import Link from 'next/link'
import { CheckSquare, CreditCard, ChevronDown, ChevronUp } from 'lucide-react'

import { dagenTot, dagLabel, formatDatumKort } from '@/lib/bruiloft/format'
import type { BudgetItem, Task } from '@/lib/bruiloft/types'
import { Card, CardContent, Money } from '@/components/bruiloft/ui'

interface AankomendeActiesTimelijnProps {
  tasks: Task[]
  budgetItems: BudgetItem[]
}

type TimelineItem =
  | { type: 'taak'; id: string; titel: string; datum: string; dagen: number; href: string }
  | { type: 'betaling'; id: string; titel: string; bedrag: number; datum: string; dagen: number; href: string }

const DREMPEL_TAKEN_DAGEN = 21
const DREMPEL_BETALINGEN_DAGEN = 60
const INITIEEL_ZICHTBAAR = 6

function dagUrgentieStijl(dagen: number): string {
  if (dagen < 0) return 'text-rose-600 font-medium'
  if (dagen <= 7) return 'text-amber-600 font-medium'
  return 'text-muted-foreground'
}

function dagStreepjeStijl(dagen: number): string {
  if (dagen < 0) return 'bg-rose-500'
  if (dagen <= 7) return 'bg-amber-400'
  return 'bg-border'
}

export function AankomendeActiesTimelijn({
  tasks,
  budgetItems,
}: AankomendeActiesTimelijnProps) {
  const [uitgebreid, setUitgebreid] = React.useState(false)

  const items: TimelineItem[] = []

  // Taken met deadline binnen drempel en niet afgerond
  for (const t of tasks) {
    if (t.status === 'klaar') continue
    const dagen = dagenTot(t.deadline)
    if (dagen > DREMPEL_TAKEN_DAGEN) continue
    items.push({
      type: 'taak',
      id: `taak-${t.id}`,
      titel: t.titel,
      datum: t.deadline,
      dagen,
      href: '/bruiloft/taken',
    })
  }

  // Openstaande betaaltermijnen binnen drempel
  for (const item of budgetItems) {
    for (const term of item.betaaltermijnen) {
      if (term.betaald) continue
      const dagen = dagenTot(term.vervaldatum)
      if (dagen > DREMPEL_BETALINGEN_DAGEN) continue
      items.push({
        type: 'betaling',
        id: `betaling-${term.id}`,
        titel: item.omschrijving || item.categorie,
        bedrag: term.bedrag,
        datum: term.vervaldatum,
        dagen,
        href: '/bruiloft/budget',
      })
    }
  }

  // Sorteren: achterstallig eerst (meest negatief), dan oplopend op datum
  items.sort((a, b) => a.dagen - b.dagen)

  if (items.length === 0) return null

  const zichtbaar = uitgebreid ? items : items.slice(0, INITIEEL_ZICHTBAAR)
  const heeftMeer = items.length > INITIEEL_ZICHTBAAR

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-medium text-foreground">Aankomende acties</h2>
          <div className="flex items-center gap-3">
            <Link
              href="/bruiloft/taken"
              className="text-sm font-medium text-rose-600 transition-colors hover:text-rose-700"
            >
              Alle taken
            </Link>
            <span className="text-muted-foreground/40">·</span>
            <Link
              href="/bruiloft/budget"
              className="text-sm font-medium text-rose-600 transition-colors hover:text-rose-700"
            >
              Budget
            </Link>
          </div>
        </div>

        <ul className="space-y-3">
          {zichtbaar.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="group flex items-center gap-3 rounded-lg p-2 -mx-2 transition-colors hover:bg-muted/50"
              >
                {/* Kleurstreepje */}
                <div
                  className={`h-8 w-0.5 shrink-0 rounded-full ${dagStreepjeStijl(item.dagen)}`}
                />

                {/* Icoon */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  {item.type === 'taak' ? (
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground capitalize">
                    {item.titel}
                  </p>
                  <p className={`text-xs ${dagUrgentieStijl(item.dagen)}`}>
                    {formatDatumKort(item.datum)} · {dagLabel(item.dagen)}
                  </p>
                </div>

                {/* Bedrag (alleen bij betalingen) */}
                {item.type === 'betaling' && (
                  <Money
                    bedrag={item.bedrag}
                    className="shrink-0 text-sm font-semibold text-foreground"
                  />
                )}
              </Link>
            </li>
          ))}
        </ul>

        {heeftMeer && (
          <button
            type="button"
            onClick={() => setUitgebreid((v) => !v)}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {uitgebreid ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Minder tonen
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                {items.length - INITIEEL_ZICHTBAAR} meer tonen
              </>
            )}
          </button>
        )}
      </CardContent>
    </Card>
  )
}
