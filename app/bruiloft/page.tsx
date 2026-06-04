'use client'

import Link from 'next/link'
import { CalendarHeart, ListChecks, MapPin, Users, Wallet } from 'lucide-react'

import { AIAdviesPanel } from '@/components/bruiloft/AIAdviesPanel'
import { PageHeader } from '@/components/bruiloft/PageHeader'
import { ProfielKaart } from '@/components/bruiloft/ProfielKaart'
import { Routekaart } from '@/components/bruiloft/Routekaart'
import {
  Card,
  CardContent,
  Money,
  Progress,
  StatCard,
} from '@/components/bruiloft/ui'
import {
  aankomendeTermijnen,
  budgetTotalen,
  gastTellingen,
  taakTellingen,
} from '@/lib/bruiloft/derived'
import { dagLabel, dagenTot, formatDatumKort, formatDatumNL } from '@/lib/bruiloft/format'
import { berekenGuidance } from '@/lib/bruiloft/guidance'
import { useBruiloftStore } from '@/store/bruiloftStore'

export default function DashboardPage() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const guests = useBruiloftStore((s) => s.guests)
  const tasks = useBruiloftStore((s) => s.tasks)
  const vendors = useBruiloftStore((s) => s.vendors)
  const budgetItems = useBruiloftStore((s) => s.budgetItems)
  const openWeddingSettings = useBruiloftStore((s) => s.openWeddingSettings)

  if (!wedding) return null

  const dagen = dagenTot(wedding.trouwdatum)
  const budget = budgetTotalen(budgetItems, vendors, wedding)
  const gasten = gastTellingen(guests)
  const taken = taakTellingen(tasks)
  const nogTeDoen = taken.open + taken.bezig
  const komendeBetalingen = aankomendeTermijnen(budgetItems, 5)
  const guidance = berekenGuidance({ wedding, tasks, vendors, budgetItems, guests })

  const budgetPct =
    wedding.totaalBudget > 0
      ? Math.min(100, Math.round((budget.totaalBetaald / wedding.totaalBudget) * 100))
      : 0

  return (
    <div className="mx-auto max-w-6xl">
      {/* Hero: aftelteller. Lichte rhino-achtige kaart met serif headline. */}
      <Card className="mb-8 overflow-hidden border-border bg-white">
        <CardContent className="flex flex-col items-center px-4 py-8 text-center sm:px-6 sm:py-14">
          <p className="text-2xl md:text-3xl lg:text-lg font-medium text-[#101828]">
            {wedding.partner1Naam} <span>&amp;</span>{' '}
            {wedding.partner2Naam}
          </p>
          <div className="my-4">
            {dagen > 0 ? (
              <p className="font-serif text-[clamp(2.5rem,11vw,4.5rem)] font-medium leading-[1.05] tracking-tight text-[#101828]">
                nog {dagen} {dagen === 1 ? 'dag' : 'dagen'}
              </p>
            ) : dagen === 0 ? (
              <p className="font-serif text-[clamp(2rem,9vw,3.75rem)] font-medium leading-tight text-[#101828]">
                Vandaag is de dag!
              </p>
            ) : (
              <p className="font-serif text-[clamp(1.75rem,7vw,3rem)] font-medium leading-tight text-[#101828]">
                Gefeliciteerd met jullie huwelijk
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-gray-600">
            <span className="inline-flex items-center gap-1.5">
              <CalendarHeart className="h-4 w-4 text-rose-600" />
              {formatDatumNL(wedding.trouwdatum)}
            </span>
            {wedding.locatie ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-rose-600" />
                {wedding.locatie}
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Onze gegevens: de essentiële profielgegevens prominent in beeld. */}
      <div className="mb-8">
        <ProfielKaart wedding={wedding} onBewerk={openWeddingSettings} />
      </div>

      <PageHeader titel="Overzicht" beschrijving="Alles in één oogopslag." />

      {/* AI "Volgende stappen": wat moet ik nú doen? */}
      <div className="mb-8">
        <AIAdviesPanel fallbackSteps={guidance.stappen} trouwdatum={wedding.trouwdatum} />
      </div>

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

      {/* Routekaart: fasevoortgang */}
      <div className="mt-8">
        <Routekaart route={guidance.route} />
      </div>

      {/* Aankomende betalingen */}
      <div className="mt-8">
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-medium text-foreground">Aankomende betalingen</h2>
              <Link
                href="/bruiloft/budget"
                className="text-sm font-medium text-rose-600 transition-colors hover:text-rose-700"
              >
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
    </div>
  )
}
