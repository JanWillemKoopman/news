'use client'

import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Globe,
  ListChecks,
  Store,
  Users,
  Wallet,
} from 'lucide-react'

import type { BudgetItem, Guest, Task, Vendor, WebsiteContent } from '@/lib/bruiloft/types'
import { Card, CardContent } from '@/components/bruiloft/ui'
import { cn } from '@/lib/utils'

interface EersteStappenProps {
  guests: Guest[]
  tasks: Task[]
  vendors: Vendor[]
  budgetItems: BudgetItem[]
  websiteContent?: WebsiteContent | null
}

// Begeleidt nieuwe gebruikers direct na de onboarding-wizard: het dashboard is
// dan nog grotendeels leeg en zonder richting haken mensen hier af. De kaart
// verdwijnt vanzelf zodra alle modules een eerste invulling hebben.
export function EersteStappen({ guests, tasks, vendors, budgetItems, websiteContent }: EersteStappenProps) {
  const stappen = [
    {
      label: 'Voeg jullie eerste gasten toe',
      beschrijving: 'Begin met de mensen die er zeker bij zijn.',
      href: '/bruiloft/gasten',
      icon: Users,
      klaar: guests.length > 0,
    },
    {
      label: 'Verdeel jullie budget',
      beschrijving: 'Maak budgetitems aan of laat het automatisch verdelen.',
      href: '/bruiloft/budget',
      icon: Wallet,
      klaar: budgetItems.length > 0,
    },
    {
      label: 'Bekijk jullie takenlijst',
      beschrijving: 'Plan de eerste taken voor de komende maanden.',
      href: '/bruiloft/taken',
      icon: ListChecks,
      klaar: tasks.length > 0,
    },
    {
      label: 'Voeg leveranciers toe',
      beschrijving: 'Houd offertes en boekingen op één plek bij.',
      href: '/bruiloft/leveranciers',
      icon: Store,
      klaar: vendors.length > 0,
    },
    {
      label: 'Maak jullie trouwwebsite',
      beschrijving: 'Kies een stijl en deel de pagina met gasten.',
      href: '/bruiloft/website',
      icon: Globe,
      klaar: Boolean(websiteContent),
    },
  ]

  const klaarCount = stappen.filter((s) => s.klaar).length
  if (klaarCount === stappen.length) return null

  return (
    <Card className="mb-8 overflow-hidden border-rose-200">
      <CardContent className="p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-2xl font-medium text-foreground">Aan de slag</h2>
          <span className="text-sm font-medium text-muted-foreground">
            {klaarCount} van {stappen.length} gedaan
          </span>
        </div>
        <ol className="space-y-1">
          {stappen.map((stap) => (
            <li key={stap.href}>
              {stap.klaar ? (
                <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                  <span className="text-sm text-muted-foreground line-through decoration-muted-foreground/40">
                    {stap.label}
                  </span>
                </div>
              ) : (
                <Link
                  href={stap.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                    'hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  )}
                >
                  <Circle className="h-5 w-5 shrink-0 text-rose-300" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-medium text-foreground">{stap.label}</span>
                    <span className="hidden text-xs text-muted-foreground sm:block">
                      {stap.beschrijving}
                    </span>
                  </span>
                  <stap.icon className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden />
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-rose-500" />
                </Link>
              )}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
