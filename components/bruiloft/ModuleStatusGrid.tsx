'use client'

import Link from 'next/link'
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Circle,
} from 'lucide-react'

import {
  budgetTotalen,
  gastTellingen,
  taakTellingen,
} from '@/lib/bruiloft/derived'
import { dagenTot } from '@/lib/bruiloft/format'
import { canView } from '@/lib/bruiloft/permissions'
import type { PermissionMap } from '@/lib/bruiloft/permissions'
import type { BudgetItem, Guest, Task, Vendor, Wedding } from '@/lib/bruiloft/types'
import { Money, Progress } from '@/components/bruiloft/ui'

interface ModuleStatusGridProps {
  wedding: Wedding
  guests: Guest[]
  tasks: Task[]
  vendors: Vendor[]
  budgetItems: BudgetItem[]
  currentUser: { id: string } | null
  permissions: PermissionMap
}

interface ModuleKaartProps {
  href: string
  children: React.ReactNode
}

function ModuleKaart({ href, children }: ModuleKaartProps) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-[box-shadow,border-color] duration-150 hover:border-rose-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {children}
      <ArrowUpRight className="absolute right-4 top-4 h-4 w-4 text-muted-foreground/40 transition-colors group-hover:text-rose-500" />
    </Link>
  )
}

function LeverancierCheckItem({
  type,
  label,
  vendors,
}: {
  type: Vendor['type']
  label: string
  vendors: Vendor[]
}) {
  const geboekt = vendors.some((v) => v.type === type && v.status === 'geboekt')
  const inBehandeling = !geboekt && vendors.some((v) => v.type === type)

  if (geboekt) {
    return (
      <span className="flex items-center gap-1 text-xs text-foreground">
        <CheckCircle2 className="h-3 w-3 shrink-0" />
        {label}
      </span>
    )
  }
  if (inBehandeling) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Circle className="h-3 w-3 shrink-0" />
        {label}
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Circle className="h-3 w-3 shrink-0" />
      {label}
    </span>
  )
}

export function ModuleStatusGrid({
  wedding,
  guests,
  tasks,
  vendors,
  budgetItems,
  currentUser,
  permissions,
}: ModuleStatusGridProps) {
  const budget = budgetTotalen(budgetItems, vendors, wedding)
  const gasten = gastTellingen(guests)
  const taken = taakTellingen(tasks)

  const budgetPct =
    wedding.totaalBudget > 0
      ? Math.min(100, Math.round((budget.totaalBetaald / wedding.totaalBudget) * 100))
      : 0

  const overBudget =
    wedding.totaalBudget > 0 && budget.totaalGeoffreerd > wedding.totaalBudget

  const achterstallig = tasks.filter(
    (t) => t.status !== 'klaar' && dagenTot(t.deadline) < 0
  ).length

  const nogTeDoen = taken.open + taken.bezig

  const geboektCount = vendors.filter((v) => v.status === 'geboekt').length

  const rsvpPct =
    gasten.totaal > 0
      ? Math.round((gasten.bevestigd / gasten.totaal) * 100)
      : 0

  // Taken die specifiek aan de ingelogde gebruiker zijn toegewezen en nog open staan
  const aanjouTaken =
    currentUser
      ? tasks.filter(
          (t) => t.status !== 'klaar' && t.assignees.includes(currentUser.id)
        ).length
      : 0

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Budget — alleen zichtbaar met budget-toegang */}
      {canView(permissions, 'budget') && (
        <ModuleKaart href="/bruiloft/budget">
          <p className="mb-3 text-sm font-medium text-muted-foreground">Budget</p>
          <p className="text-2xl font-semibold text-foreground">
            <Money bedrag={budget.totaalBetaald} />
            {wedding.totaalBudget > 0 && (
              <span className="text-base font-normal text-muted-foreground">
                {' '}/{' '}
                <Money bedrag={wedding.totaalBudget} />
              </span>
            )}
          </p>
          {wedding.totaalBudget > 0 ? (
            <>
              <Progress value={budgetPct} className="mt-3 mb-1.5" />
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{budgetPct}% betaald</p>
                {overBudget ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                    <AlertTriangle className="h-3 w-3" /> Over budget
                  </span>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    nog <Money bedrag={Math.max(0, wedding.totaalBudget - budget.totaalBetaald)} /> over
                  </p>
                )}
              </div>
              {budget.totaalGeoffreerd > budget.totaalBetaald && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  <Money bedrag={budget.totaalGeoffreerd} /> gereserveerd
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Nog geen totaalbudget ingesteld</p>
          )}
        </ModuleKaart>
      )}

      {/* Gasten — alleen zichtbaar met gasten-toegang */}
      {canView(permissions, 'gasten') && (
        <ModuleKaart href="/bruiloft/gasten">
          <p className="mb-3 text-sm font-medium text-muted-foreground">Gasten</p>
          {gasten.totaal === 0 ? (
            <p className="text-2xl font-semibold text-foreground">
              0{' '}
              <span className="text-base font-normal text-muted-foreground">gasten</span>
            </p>
          ) : (
            <>
              <p className="text-2xl font-semibold text-foreground">
                {gasten.bevestigd}
                <span className="text-base font-normal text-muted-foreground">
                  {' '}/ {gasten.totaal} bevestigd
                </span>
              </p>
              {gasten.totaal > 0 && (
                <Progress value={rsvpPct} className="mt-3 mb-1.5" />
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="text-xs text-muted-foreground">
                  {gasten.bevestigdeDaggasten} dag · {gasten.bevestigdeAvondgasten} avond
                </p>
                {gasten.geenReactie > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {gasten.geenReactie} geen reactie
                  </span>
                )}
              </div>
            </>
          )}
        </ModuleKaart>
      )}

      {/* Taken — altijd zichtbaar; iedereen kan zijn eigen taken inzien */}
      <ModuleKaart href="/bruiloft/taken">
        <p className="mb-3 text-sm font-medium text-muted-foreground">Taken</p>
        <p className="text-2xl font-semibold text-foreground">
          {nogTeDoen}
          <span className="text-base font-normal text-muted-foreground"> te doen</span>
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-xs text-muted-foreground">{taken.klaar} afgerond</p>
          {achterstallig > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
              <AlertTriangle className="h-3 w-3" />
              {achterstallig} achterstallig
            </span>
          )}
        </div>
        {aanjouTaken > 0 && (
          <p className="mt-2 text-xs font-medium text-foreground">
            {aanjouTaken} {aanjouTaken === 1 ? 'taak' : 'taken'} aan jou toegewezen
          </p>
        )}
      </ModuleKaart>

      {/* Leveranciers — alleen zichtbaar met leveranciers-toegang */}
      {canView(permissions, 'leveranciers') && (
        <ModuleKaart href="/bruiloft/leveranciers">
          <p className="mb-3 text-sm font-medium text-muted-foreground">Leveranciers</p>
          <p className="text-2xl font-semibold text-foreground">
            {geboektCount}
            <span className="text-base font-normal text-muted-foreground"> geboekt</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            <LeverancierCheckItem type="locatie" label="Locatie" vendors={vendors} />
            <LeverancierCheckItem type="catering" label="Catering" vendors={vendors} />
            <LeverancierCheckItem type="fotograaf" label="Fotograaf" vendors={vendors} />
            <LeverancierCheckItem type="dj of band" label="DJ / Band" vendors={vendors} />
          </div>
        </ModuleKaart>
      )}
    </div>
  )
}
