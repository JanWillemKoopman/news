'use client'

import Link from 'next/link'
import { AlertTriangle, CreditCard, Users, Building2 } from 'lucide-react'

import { aankomendeTermijnen, gastTellingen } from '@/lib/bruiloft/derived'
import { dagenTot } from '@/lib/bruiloft/format'
import { canView } from '@/lib/bruiloft/permissions'
import type { PermissionMap } from '@/lib/bruiloft/permissions'
import type { BudgetItem, Guest, Task, Vendor, Wedding } from '@/lib/bruiloft/types'

interface UrgenteAandachtspuntenProps {
  tasks: Task[]
  budgetItems: BudgetItem[]
  vendors: Vendor[]
  guests: Guest[]
  wedding: Wedding
  permissions: PermissionMap
}

interface Melding {
  id: string
  icon: React.ElementType
  tekst: string
  href: string
  niveau: 'kritiek' | 'waarschuwing'
}

function heeftGeboekt(vendors: Vendor[], type: Vendor['type']): boolean {
  return vendors.some((v) => v.type === type && v.status === 'geboekt')
}

export function UrgenteAandachtspunten({
  tasks,
  budgetItems,
  vendors,
  guests,
  wedding,
  permissions,
}: UrgenteAandachtspuntenProps) {
  const meldingen: Melding[] = []
  const dagen = dagenTot(wedding.trouwdatum)

  // 1. Achterstallige taken — altijd tonen (iedereen ziet zijn eigen taken)
  const achterstallig = tasks.filter(
    (t) => t.status !== 'klaar' && dagenTot(t.deadline) < 0
  )
  if (achterstallig.length > 0) {
    meldingen.push({
      id: 'taken-achterstallig',
      icon: AlertTriangle,
      tekst: `${achterstallig.length} ${achterstallig.length === 1 ? 'taak is voorbij' : 'taken zijn voorbij'} de deadline`,
      href: '/bruiloft/taken',
      niveau: 'kritiek',
    })
  }

  // 2. Betalingen die ≤ 3 dagen vervallen — alleen met budget-toegang
  if (canView(permissions, 'budget')) {
    const kritiekBetalingen = aankomendeTermijnen(budgetItems, 20).filter(
      (t) => t.dagen <= 3
    )
    if (kritiekBetalingen.length > 0) {
      const eerste = kritiekBetalingen[0]
      const dagTekst =
        eerste.dagen < 0
          ? 'is te laat'
          : eerste.dagen === 0
            ? 'vervalt vandaag'
            : `vervalt over ${eerste.dagen} ${eerste.dagen === 1 ? 'dag' : 'dagen'}`
      meldingen.push({
        id: 'betaling-kritiek',
        icon: CreditCard,
        tekst: `Betaling "${eerste.item.omschrijving || eerste.item.categorie}" ${dagTekst}`,
        href: '/bruiloft/budget',
        niveau: 'kritiek',
      })
    }
  }

  // 3. RSVP urgentie: gasten zonder reactie ≤ 30 dagen — alleen met gasten-toegang
  if (canView(permissions, 'gasten')) {
    const gasten = gastTellingen(guests)
    if (gasten.geenReactie > 0 && dagen >= 0 && dagen <= 30) {
      meldingen.push({
        id: 'rsvp-urgentie',
        icon: Users,
        tekst: `${gasten.geenReactie} ${gasten.geenReactie === 1 ? 'gast heeft' : 'gasten hebben'} nog niet gereageerd op de uitnodiging`,
        href: '/bruiloft/gasten',
        niveau: 'waarschuwing',
      })
    }
  }

  // 4. Kritieke leveranciers niet geboekt — alleen met leveranciers-toegang
  if (canView(permissions, 'leveranciers') && dagen >= 0 && dagen <= 90) {
    const kritiekTypes: Array<{ type: Vendor['type']; label: string }> = [
      { type: 'locatie', label: 'Trouwlocatie' },
      { type: 'catering', label: 'Catering' },
    ]
    for (const { type, label } of kritiekTypes) {
      if (!heeftGeboekt(vendors, type)) {
        meldingen.push({
          id: `leverancier-${type}`,
          icon: Building2,
          tekst: `${label} is nog niet geboekt — nog ${dagen} dagen te gaan`,
          href: '/bruiloft/leveranciers',
          niveau: 'kritiek',
        })
      }
    }
  }

  if (meldingen.length === 0) return null

  return (
    <div className="mb-8 flex flex-col gap-2">
      {meldingen.map((m) => {
        const Icon = m.icon
        const stijl =
          m.niveau === 'kritiek'
            ? 'border-rose-200 bg-rose-50 text-rose-800'
            : 'border-amber-200 bg-amber-50 text-amber-800'
        const iconStijl = m.niveau === 'kritiek' ? 'text-rose-500' : 'text-amber-500'
        return (
          <Link
            key={m.id}
            href={m.href}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition-opacity hover:opacity-80 ${stijl}`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${iconStijl}`} />
            <span className="flex-1">{m.tekst}</span>
            <span className="shrink-0 text-xs opacity-70">Bekijken →</span>
          </Link>
        )
      })}
    </div>
  )
}
