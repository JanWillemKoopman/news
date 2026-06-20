'use client'

import { Sparkles } from 'lucide-react'

import { aankomendeTermijnen } from '@/lib/bruiloft/derived'
import { dagenTot } from '@/lib/bruiloft/format'
import type { BudgetItem, Task, Vendor, Wedding } from '@/lib/bruiloft/types'
import { Card, CardContent } from '@/components/bruiloft/ui'

interface DashboardIntroProps {
  wedding: Wedding
  tasks: Task[]
  budgetItems: BudgetItem[]
  vendors: Vendor[]
  faseLabel: string
}

// Korte statusbevestiging bovenaan het dashboard: in één oogopslag waar het
// koppel staat, gevolgd door de harde feiten (taken/betalingen) die hieronder
// in detail volgen. Bewust deterministisch — altijd correct en instant, geen
// extra AI-call of laadflits. Kan later vervangen worden door de
// AI-samenvatting (globaal.samenvatting uit /api/ai/wedding-planner).
function meervoud(n: number, enkel: string, meerv: string): string {
  return `${n} ${n === 1 ? enkel : meerv}`
}

export function DashboardIntro({
  wedding,
  tasks,
  budgetItems,
  vendors,
  faseLabel,
}: DashboardIntroProps) {
  const dagen = dagenTot(wedding.trouwdatum)

  const openTaken = tasks.filter((t) => t.status !== 'klaar')
  const achterstallig = openTaken.filter((t) => dagenTot(t.deadline) < 0).length
  const aankomendeTaken = openTaken.filter((t) => {
    const d = dagenTot(t.deadline)
    return d >= 0 && d <= 21
  }).length
  const aankomendeBetalingen = aankomendeTermijnen(budgetItems, 20).filter(
    (t) => t.dagen <= 30
  ).length
  const geboekt = vendors.filter((v) => v.status === 'geboekt').length

  // Net begonnen: vrijwel niets ingevuld — behandel als gezonde startpositie.
  const netBegonnen = tasks.length === 0 && budgetItems.length === 0 && geboekt === 0

  // Eerste zin: bevestig de status, kalm van toon.
  let kop: string
  if (dagen < 0) {
    kop = 'Gefeliciteerd met jullie huwelijk! Nog een paar dingen om af te ronden.'
  } else if (netBegonnen) {
    kop = 'Jullie zijn net begonnen — een mooie, rustige start.'
  } else if (achterstallig > 0) {
    kop = 'Een paar dingen vragen jullie aandacht.'
  } else if (aankomendeTaken === 0 && aankomendeBetalingen === 0) {
    kop = 'Jullie liggen mooi op schema — niets wat nu niet kan wachten.'
  } else {
    kop = 'Jullie liggen op schema voor deze fase.'
  }

  // Tweede zin: de harde feiten, kort opgesomd.
  const feiten: string[] = []
  if (achterstallig > 0) feiten.push(`${meervoud(achterstallig, 'taak', 'taken')} over de deadline`)
  if (aankomendeTaken > 0) feiten.push(`${meervoud(aankomendeTaken, 'taak', 'taken')} binnenkort`)
  if (aankomendeBetalingen > 0)
    feiten.push(`${meervoud(aankomendeBetalingen, 'betaling', 'betalingen')} op komst`)

  const detail = dagen >= 0 && feiten.length > 0 ? `Op de planning: ${feiten.join(' · ')}.` : null

  return (
    <Card className="mb-8 border-rhino-100 bg-rhino-50/40">
      <CardContent className="flex items-start gap-3 p-5 sm:p-6">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rhino-800 text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {faseLabel} · waar jullie nu staan
          </p>
          <p className="mt-1 font-medium text-foreground">{kop}</p>
          {detail ? <p className="mt-0.5 text-sm text-muted-foreground">{detail}</p> : null}
        </div>
      </CardContent>
    </Card>
  )
}
