'use client'

import { Sparkles } from 'lucide-react'

import { aankomendeTermijnen } from '@/lib/bruiloft/derived'
import { dagenTot } from '@/lib/bruiloft/format'
import type { BudgetItem, Guest, Task, Vendor, Wedding } from '@/lib/bruiloft/types'
import { Card, CardContent } from '@/components/bruiloft/ui'
import { useAIAdvies } from '@/components/bruiloft/ai/useAIAdvies'

interface DashboardIntroProps {
  wedding: Wedding
  tasks: Task[]
  budgetItems: BudgetItem[]
  vendors: Vendor[]
  guests: Guest[]
  faseLabel: string
}

// Korte statusbevestiging bovenaan het dashboard: in één oogopslag waar het
// koppel staat, gevolgd door de harde feiten (taken/betalingen). De kop komt bij
// voorkeur van de AI (samenvatting uit dezelfde /api/ai/advice-call — geen extra
// API-call), met een deterministische terugval tijdens het laden of bij oudere
// cache zonder samenvatting. De feitenregel eronder is altijd deterministisch.
function meervoud(n: number, enkel: string, meerv: string): string {
  return `${n} ${n === 1 ? enkel : meerv}`
}

export function DashboardIntro({
  wedding,
  tasks,
  budgetItems,
  vendors,
  guests,
  faseLabel,
}: DashboardIntroProps) {
  // Deelt de gecachte advieslaag met het AI-paneel; geen extra AI-call.
  const { samenvatting } = useAIAdvies()

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

  // Nog nauwelijks begonnen: geen budget, leveranciers of gasten ingevuld én
  // geen openstaande takenlijst (een afgevinkte onboarding-taak telt niet als
  // voortgang). Voor deze koppels is "op schema" misleidend.
  const nauwelijksBegonnen =
    budgetItems.length === 0 &&
    vendors.length === 0 &&
    guests.length === 0 &&
    openTaken.length === 0

  // Deterministische terugval-kop — feitelijk, zonder loze 'op schema'-claim.
  let fallbackKop: string
  if (dagen < 0) {
    fallbackKop = 'Gefeliciteerd met jullie huwelijk! Nog een paar dingen om af te ronden.'
  } else if (nauwelijksBegonnen) {
    fallbackKop = 'Tijd om te beginnen — zet jullie eerste stappen voor de bruiloft.'
  } else if (achterstallig > 0) {
    fallbackKop = 'Een paar dingen vragen jullie aandacht.'
  } else if (aankomendeTaken === 0 && aankomendeBetalingen === 0) {
    fallbackKop = 'Goed bijgewerkt — niets wat nu dringend is.'
  } else {
    fallbackKop = 'Een paar dingen om binnenkort op te pakken.'
  }

  // AI-samenvatting heeft voorrang zodra die binnen is.
  const aiKop = samenvatting?.trim()
  const kop = aiKop && aiKop.length > 0 ? aiKop : fallbackKop

  // Tweede regel: de harde feiten, kort opgesomd (altijd deterministisch).
  const feiten: string[] = []
  if (achterstallig > 0) feiten.push(`${meervoud(achterstallig, 'taak', 'taken')} over de deadline`)
  if (aankomendeTaken > 0) feiten.push(`${meervoud(aankomendeTaken, 'taak', 'taken')} binnenkort`)
  if (aankomendeBetalingen > 0)
    feiten.push(`${meervoud(aankomendeBetalingen, 'betaling', 'betalingen')} op komst`)

  const detail = dagen >= 0 && feiten.length > 0 ? `Op de planning: ${feiten.join(' · ')}.` : null

  return (
    <Card className="mb-8">
      <CardContent className="flex items-start gap-3 p-5 sm:p-6">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rhino-800 text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {wedding.trouwdatum ? `${faseLabel} · waar jullie nu staan` : 'Waar jullie nu staan'}
          </p>
          <p className="mt-1 font-medium text-foreground">{kop}</p>
          {detail ? <p className="mt-0.5 text-sm text-muted-foreground">{detail}</p> : null}
        </div>
      </CardContent>
    </Card>
  )
}
