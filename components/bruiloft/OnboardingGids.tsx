'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  CalendarClock,
  Check,
  ChevronRight,
  Compass,
  Globe,
  ListChecks,
  PieChart,
  Sparkles,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'

import { Card, CardContent, Progress } from '@/components/bruiloft/ui'
import { cn } from '@/lib/utils'
import { canEdit } from '@/lib/bruiloft/permissions'
import { openVoorstellen } from '@/lib/bruiloft/taken/voorstellen'
import { useBruiloftStore } from '@/store/bruiloftStore'

const VERBORGEN_PREFIX = 'otp:startgids-verborgen:'

function isVerborgen(weddingId: string): boolean {
  try {
    return localStorage.getItem(VERBORGEN_PREFIX + weddingId) === '1'
  } catch {
    return false
  }
}

function verberg(weddingId: string) {
  try {
    localStorage.setItem(VERBORGEN_PREFIX + weddingId, '1')
  } catch {
    // localStorage niet beschikbaar; negeren.
  }
}

// Maakt de gids weer zichtbaar (gebruikt door de welkomstdialoog).
export function toonStartgids(weddingId: string) {
  try {
    localStorage.removeItem(VERBORGEN_PREFIX + weddingId)
  } catch {
    // localStorage niet beschikbaar; negeren.
  }
  window.dispatchEvent(new Event('otp:startgids-toon'))
}

interface Stap {
  key: string
  label: string
  uitleg: string
  icon: LucideIcon
  href: string
  klaar: boolean
}

// Begeleide startgids voor nieuwe gebruikers: zes stappen die automatisch
// afvinken op basis van echte data. Wegklikbaar, en verdwijnt vanzelf zodra
// alles staat — daarna is het dashboard zelf genoeg.
export function OnboardingGids() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const tasks = useBruiloftStore((s) => s.tasks)
  const guests = useBruiloftStore((s) => s.guests)
  const vendors = useBruiloftStore((s) => s.vendors)
  const budgetItems = useBruiloftStore((s) => s.budgetItems)
  const scheduleItems = useBruiloftStore((s) => s.scheduleItems)
  const websiteContent = useBruiloftStore((s) => s.websiteContent)
  const permissions = useBruiloftStore((s) => s.permissions)

  // localStorage pas na mount lezen (SSR-veilig), en luisteren naar de
  // welkomstdialoog die de gids expliciet kan tonen.
  const [zichtbaar, setZichtbaar] = React.useState(false)
  React.useEffect(() => {
    if (!wedding) return
    setZichtbaar(!isVerborgen(wedding.id))
    const toon = () => setZichtbaar(true)
    window.addEventListener('otp:startgids-toon', toon)
    return () => window.removeEventListener('otp:startgids-toon', toon)
  }, [wedding])

  if (!wedding || !zichtbaar || !canEdit(permissions, 'taken')) return null

  // Eerst de takenlijst samenstellen (kaart voor kaart); daarna wordt de stap
  // "vink je eerste taak af".
  const voorstellenOver = wedding.takenVoorstellen.afgerond
    ? 0
    : openVoorstellen(wedding, tasks).length
  const samengesteld = voorstellenOver === 0

  const stappen: Stap[] = [
    samengesteld
      ? {
          key: 'taak',
          label: 'Vink je eerste taak af',
          uitleg: 'De takenlijst staat voor jullie klaar.',
          icon: ListChecks,
          href: '/bruiloft/taken',
          klaar: tasks.some((t) => t.status === 'klaar'),
        }
      : {
          key: 'taak',
          label: 'Stel jullie takenlijst samen',
          uitleg: `Kies kaart voor kaart uit ${voorstellenOver} voorstellen.`,
          icon: ListChecks,
          href: '/bruiloft/taken?samenstellen=1',
          klaar: false,
        },
    {
      key: 'budget',
      label: 'Verdeel jullie budget',
      uitleg: 'Eén klik met de richtverdeling.',
      icon: PieChart,
      href: '/bruiloft/budget',
      klaar: budgetItems.length > 0,
    },
    {
      key: 'gasten',
      label: 'Zet jullie eerste gasten in de lijst',
      uitleg: 'Begin met de namen die zeker komen.',
      icon: Users,
      href: '/bruiloft/gasten',
      klaar: guests.length > 0,
    },
    {
      key: 'leverancier',
      label: 'Ontdek leveranciers die bij jullie passen',
      uitleg: 'Locaties en meer, gesorteerd op jullie profiel.',
      icon: Compass,
      href: '/bruiloft/ontdekken',
      klaar: vendors.length > 0,
    },
    {
      key: 'draaiboek',
      label: 'Zet de dagindeling klaar',
      uitleg: 'Start met een standaard draaiboek.',
      icon: CalendarClock,
      href: '/bruiloft/draaiboek',
      klaar: scheduleItems.length > 0,
    },
    {
      key: 'website',
      label: 'Begin aan jullie trouwwebsite',
      uitleg: 'Voor RSVP’s en praktische info voor gasten.',
      icon: Globe,
      href: '/bruiloft/website',
      klaar: Boolean(websiteContent && (websiteContent.slug || websiteContent.welkomsttekst.trim())),
    },
  ]

  const gedaan = stappen.filter((s) => s.klaar).length
  if (gedaan === stappen.length) return null

  return (
    <Card id="startgids" className="mb-8 border-primary/30">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-medium text-foreground">Samen aan de slag</h2>
              <p className="text-xs text-muted-foreground">
                {gedaan} van {stappen.length} stappen gedaan — in jullie eigen tempo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              verberg(wedding.id)
              setZichtbaar(false)
            }}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" /> Verberg gids
          </button>
        </div>

        <Progress value={(gedaan / stappen.length) * 100} className="mt-4 h-1.5" />

        <ul className="mt-4 grid gap-1 sm:grid-cols-2">
          {stappen.map((stap, i) => {
            const eersteActief = !stap.klaar && stappen.slice(0, i).every((s) => s.klaar)
            return (
              <li key={stap.key} className={cn(eersteActief && 'sm:col-span-2')}>
                <Link
                  href={stap.href}
                  className={cn(
                    'group flex min-h-[3rem] items-center gap-3 rounded-lg px-2.5 py-2 transition-colors',
                    stap.klaar
                      ? 'opacity-70'
                      : eersteActief
                        ? 'bg-primary/8 hover:bg-primary/12 border border-primary/20'
                        : 'hover:bg-accent'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                      stap.klaar
                        ? 'border-foreground bg-foreground text-background'
                        : eersteActief
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background text-muted-foreground'
                    )}
                  >
                    {stap.klaar ? <Check className="h-3.5 w-3.5" /> : <stap.icon className="h-3.5 w-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'block truncate text-sm font-medium',
                        stap.klaar
                          ? 'text-muted-foreground line-through'
                          : eersteActief
                            ? 'text-primary'
                            : 'text-foreground'
                      )}
                    >
                      {stap.label}
                    </span>
                    {!stap.klaar ? (
                      <span className="block truncate text-xs text-muted-foreground">{stap.uitleg}</span>
                    ) : null}
                  </span>
                  {!stap.klaar ? (
                    <ChevronRight className={cn(
                      'h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5',
                      eersteActief ? 'text-primary' : 'text-muted-foreground'
                    )} />
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
