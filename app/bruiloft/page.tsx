'use client'

import * as React from 'react'
import Link from 'next/link'
import { CalendarHeart, ListChecks, MapPin, Settings2, Users, Wallet } from 'lucide-react'

import { ActivityFeed } from '@/components/bruiloft/ActivityFeed'
import { PageHeader } from '@/components/bruiloft/PageHeader'
import { WeddingSettingsForm } from '@/components/bruiloft/WeddingSettingsForm'
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  Money,
  Progress,
  StatCard,
  StatusBadge,
} from '@/components/bruiloft/ui'
import {
  aankomendeTaken,
  aankomendeTermijnen,
  budgetTotalen,
  gastTellingen,
  taakTellingen,
} from '@/lib/bruiloft/derived'
import { dagLabel, dagenTot, formatDatumKort, formatDatumNL } from '@/lib/bruiloft/format'
import { useBruiloftStore } from '@/store/bruiloftStore'

export default function DashboardPage() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const guests = useBruiloftStore((s) => s.guests)
  const tasks = useBruiloftStore((s) => s.tasks)
  const vendors = useBruiloftStore((s) => s.vendors)
  const budgetItems = useBruiloftStore((s) => s.budgetItems)

  const [settingsOpen, setSettingsOpen] = React.useState(false)

  if (!wedding) return null

  const dagen = dagenTot(wedding.trouwdatum)
  const budget = budgetTotalen(budgetItems, vendors, wedding)
  const gasten = gastTellingen(guests)
  const taken = taakTellingen(tasks)
  const nogTeDoen = taken.open + taken.bezig
  const komendeTaken = aankomendeTaken(tasks, 5)
  const komendeBetalingen = aankomendeTermijnen(budgetItems, 5)

  const budgetPct =
    wedding.totaalBudget > 0
      ? Math.min(100, Math.round((budget.totaalBetaald / wedding.totaalBudget) * 100))
      : 0

  return (
    <div className="mx-auto max-w-6xl">
      {/* Aftelteller */}
      <Card className="relative mb-8 overflow-hidden border-none bg-gradient-to-br from-primary/15 via-card to-card">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Gegevens bewerken"
          className="absolute right-3 top-3"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings2 className="h-5 w-5" />
        </Button>
        <CardContent className="flex flex-col items-center px-6 py-12 text-center">
          <p className="font-serif text-2xl text-foreground md:text-3xl">
            {wedding.partner1Naam} <span className="text-primary">&amp;</span>{' '}
            {wedding.partner2Naam}
          </p>
          <div className="my-4">
            {dagen > 0 ? (
              <p className="font-serif text-[clamp(2.5rem,11vw,4.5rem)] leading-[1.05] text-primary">
                nog {dagen} {dagen === 1 ? 'dag' : 'dagen'}
              </p>
            ) : dagen === 0 ? (
              <p className="font-serif text-[clamp(2rem,9vw,3.75rem)] leading-tight text-primary">
                Vandaag is de dag!
              </p>
            ) : (
              <p className="font-serif text-[clamp(1.75rem,7vw,3rem)] leading-tight text-foreground">
                Gefeliciteerd met jullie huwelijk
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarHeart className="h-4 w-4" />
              {formatDatumNL(wedding.trouwdatum)}
            </span>
            {wedding.locatie ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {wedding.locatie}
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <PageHeader titel="Overzicht" beschrijving="Alles in één oogopslag." />

      {/* Overzichtskaarten */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Wallet} label="Budget besteed" href="/bruiloft/budget">
          <p className="text-2xl font-semibold text-foreground">
            <Money bedrag={budget.totaalBetaald} />
            <span className="text-base font-normal text-muted-foreground">
              {' '}
              / <Money bedrag={wedding.totaalBudget} />
            </span>
          </p>
          <Progress value={budgetPct} className="mt-3" />
          <p className="mt-1.5 text-xs text-muted-foreground">{budgetPct}% van het budget besteed</p>
        </StatCard>

        <StatCard icon={Users} label="Bevestigde gasten" href="/bruiloft/gasten">
          <p className="text-2xl font-semibold text-foreground">{gasten.bevestigd}</p>
          <p className="mt-3 text-sm text-muted-foreground">
            {gasten.bevestigdeDaggasten} daggasten · {gasten.bevestigdeAvondgasten} avondgasten
          </p>
        </StatCard>

        <StatCard icon={ListChecks} label="Taken" href="/bruiloft/taken">
          <p className="text-2xl font-semibold text-foreground">
            {nogTeDoen}
            <span className="text-base font-normal text-muted-foreground"> te doen</span>
          </p>
          <p className="mt-3 text-sm text-muted-foreground">{taken.klaar} afgerond</p>
        </StatCard>
      </div>

      {/* Eerstvolgende taken + betalingen */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-xl text-foreground">Eerstvolgende taken</h2>
              <Link href="/bruiloft/taken" className="text-sm font-medium text-primary hover:underline">
                Alles bekijken
              </Link>
            </div>
            {komendeTaken.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Geen openstaande taken. Goed bezig!
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {komendeTaken.map((t) => {
                  const d = dagenTot(t.deadline)
                  return (
                    <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{t.titel}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDatumKort(t.deadline)} · {dagLabel(d)}
                        </p>
                      </div>
                      <StatusBadge kind="taak" value={t.status} />
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-xl text-foreground">Aankomende betalingen</h2>
              <Link href="/bruiloft/budget" className="text-sm font-medium text-primary hover:underline">
                Naar budget
              </Link>
            </div>
            {komendeBetalingen.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Geen openstaande betaaltermijnen.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {komendeBetalingen.map(({ term, item, dagen }) => (
                  <li key={term.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium capitalize text-foreground">
                        {item.omschrijving || item.categorie}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDatumKort(term.vervaldatum)} · {dagLabel(dagen)}
                      </p>
                    </div>
                    <Money bedrag={term.bedrag} className="font-semibold text-foreground" />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <ActivityFeed />

      <WeddingSettingsForm
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        wedding={wedding}
      />
    </div>
  )
}
