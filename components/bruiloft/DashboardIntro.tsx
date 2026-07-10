'use client'

import type { ReactNode } from 'react'
import { Sparkles } from 'lucide-react'

import {
  aankomendeTaken as eerstvolgendeTaken,
  aankomendeTermijnen,
  budgetTotalen,
  gastTellingen,
} from '@/lib/bruiloft/derived'
import { dagenTot, formatDatumKort } from '@/lib/bruiloft/format'
import { canView } from '@/lib/bruiloft/permissions'
import type { PermissionMap } from '@/lib/bruiloft/permissions'
import type { BudgetItem, Guest, Task, Vendor, Wedding } from '@/lib/bruiloft/types'
import { Card, CardContent, Money } from '@/components/bruiloft/ui'

interface DashboardIntroProps {
  wedding: Wedding
  tasks: Task[]
  budgetItems: BudgetItem[]
  vendors: Vendor[]
  guests: Guest[]
  faseLabel: string
  permissions: PermissionMap
}

// Rose accent voor het kritieke fragment binnen een zin — kleur blijft
// betekenisvol ("dit vraagt aandacht"), de rest van de zin is neutraal.
function Kritiek({ children }: { children: ReactNode }) {
  return <span className="font-medium text-rose-700">{children}</span>
}

const KRITIEKE_LEVERANCIERS: { type: Vendor['type']; label: string }[] = [
  { type: 'locatie', label: 'Locatie' },
  { type: 'catering', label: 'Catering' },
  { type: 'fotograaf', label: 'Fotograaf' },
  { type: 'dj of band', label: 'DJ/band' },
]

function labelLijst(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? ''
  return `${labels.slice(0, -1).join(', ')} en ${labels[labels.length - 1]}`
}

// Statusrapportage bovenaan het dashboard: één regel per onderdeel
// (Taken/Budget/Gasten/Leveranciers), volledig regelgebaseerd (geen AI) en
// dus instant en 100% reproduceerbaar bij dezelfde data. Doel: in één keer
// de hele stand van zaken van het account kunnen overzien, met de kritieke
// feiten (rose) tussen de neutrale rest.
export function DashboardIntro({
  wedding,
  tasks,
  budgetItems,
  vendors,
  guests,
  faseLabel,
  permissions,
}: DashboardIntroProps) {
  const magBudget = canView(permissions, 'budget')
  const magGasten = canView(permissions, 'gasten')
  const magLeveranciers = canView(permissions, 'leveranciers')

  const dagen = dagenTot(wedding.trouwdatum)
  const getrouwd = dagen < 0

  const openTaken = tasks.filter((t) => t.status !== 'klaar')
  const achterstalligeTaken = openTaken.filter((t) => dagenTot(t.deadline) < 0)
  const volgendeTaak = eerstvolgendeTaken(tasks, 1)[0]

  const budget = budgetTotalen(budgetItems, vendors, wedding)
  const overBudget = wedding.totaalBudget > 0 && budget.totaalGeoffreerd > wedding.totaalBudget
  const volgendeBetaling = magBudget ? aankomendeTermijnen(budgetItems, 1)[0] : undefined

  const gasten = gastTellingen(guests, wedding.gasttypeCategorieen)

  const nietGeboekt = magLeveranciers
    ? KRITIEKE_LEVERANCIERS.filter(({ type }) => !vendors.some((v) => v.type === type && v.status === 'geboekt'))
    : []

  const nauwelijksBegonnen =
    budgetItems.length === 0 && vendors.length === 0 && guests.length === 0 && openTaken.length === 0

  // Kopregel — deterministische prioriteitsladder.
  let kop: string
  if (getrouwd) {
    kop = 'Gefeliciteerd met jullie huwelijk! Dit is de laatste stand van zaken.'
  } else if (nauwelijksBegonnen) {
    kop = 'Tijd om te beginnen — hieronder zie je met welk onderdeel je het beste kunt starten.'
  } else if (achterstalligeTaken.length > 0) {
    kop = 'Een paar dingen vragen jullie aandacht.'
  } else if (!volgendeTaak && !volgendeBetaling && nietGeboekt.length === 0) {
    kop = 'Goed bijgewerkt — dit is de volledige stand van zaken.'
  } else {
    kop = 'Dit is de volledige stand van zaken van jullie trouwplan.'
  }

  // Taken
  let takenRegel: ReactNode
  if (tasks.length === 0) {
    takenRegel = <Kritiek>nog geen takenlijst samengesteld</Kritiek>
  } else if (achterstalligeTaken.length > 0) {
    takenRegel = (
      <>
        <Kritiek>{achterstalligeTaken.length} over de deadline</Kritiek>
        {volgendeTaak ? <>, waaronder “{volgendeTaak.titel}”</> : null}
      </>
    )
  } else if (volgendeTaak) {
    takenRegel = (
      <>
        {openTaken.length} openstaand, als eerstvolgende “{volgendeTaak.titel}” op{' '}
        {formatDatumKort(volgendeTaak.deadline)}
      </>
    )
  } else {
    takenRegel = <>alles afgerond, niets openstaand</>
  }

  // Budget
  let budgetRegel: ReactNode
  if (budgetItems.length === 0) {
    budgetRegel = <Kritiek>nog geen budgetposten toegevoegd</Kritiek>
  } else if (wedding.totaalBudget === 0) {
    budgetRegel = (
      <>
        <Money bedrag={budget.totaalGeschat} /> gepland, maar{' '}
        <Kritiek>nog geen totaalbudget ingesteld</Kritiek>
      </>
    )
  } else if (overBudget) {
    budgetRegel = (
      <>
        <Kritiek>
          geoffreerd (<Money bedrag={budget.totaalGeoffreerd} />) zit boven het budget van{' '}
          <Money bedrag={wedding.totaalBudget} />
        </Kritiek>
      </>
    )
  } else if (volgendeBetaling) {
    budgetRegel = (
      <>
        <Money bedrag={budget.totaalBetaald} /> van <Money bedrag={wedding.totaalBudget} /> betaald;
        eerstvolgende betaling is “{volgendeBetaling.item.omschrijving || volgendeBetaling.item.categorie}”
        {' ('}
        <Money bedrag={volgendeBetaling.term.bedrag} />
        {') op '}
        {formatDatumKort(volgendeBetaling.term.vervaldatum)}
      </>
    )
  } else {
    budgetRegel = (
      <>
        <Money bedrag={budget.totaalBetaald} /> van <Money bedrag={wedding.totaalBudget} /> betaald, niets
        aanstaands
      </>
    )
  }

  // Gasten
  let gastenRegel: ReactNode
  if (guests.length === 0) {
    gastenRegel = <Kritiek>nog niemand toegevoegd aan de gastenlijst</Kritiek>
  } else if (gasten.geenReactie > 0) {
    gastenRegel = (
      <>
        <Kritiek>
          {gasten.geenReactie} van de {gasten.totaal} hebben nog niet gereageerd
        </Kritiek>
      </>
    )
  } else {
    gastenRegel = (
      <>
        iedereen heeft gereageerd — {gasten.bevestigd} bevestigd, {gasten.afgemeld} afgemeld
      </>
    )
  }

  // Leveranciers
  let leverancierRegel: ReactNode
  if (vendors.length === 0) {
    leverancierRegel = <Kritiek>nog geen enkele leverancier toegevoegd</Kritiek>
  } else if (nietGeboekt.length > 0) {
    leverancierRegel = (
      <>
        <Kritiek>{labelLijst(nietGeboekt.map((l) => l.label))} nog niet geboekt</Kritiek>
      </>
    )
  } else {
    leverancierRegel = <>locatie, catering, fotograaf en dj/band zijn allemaal geboekt</>
  }

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
          <div className="mt-2.5 space-y-1 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Taken: </span>
              {takenRegel}
            </p>
            {magBudget && (
              <p>
                <span className="font-medium text-foreground">Budget: </span>
                {budgetRegel}
              </p>
            )}
            {magGasten && (
              <p>
                <span className="font-medium text-foreground">Gasten: </span>
                {gastenRegel}
              </p>
            )}
            {magLeveranciers && (
              <p>
                <span className="font-medium text-foreground">Leveranciers: </span>
                {leverancierRegel}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
