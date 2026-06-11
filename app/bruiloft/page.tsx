'use client'

import * as React from 'react'
import { CalendarHeart, MapPin, Settings2 } from 'lucide-react'

import { AanbevolenLeveranciers } from '@/components/bruiloft/AanbevolenLeveranciers'
import { AIAdviesPanel } from '@/components/bruiloft/AIAdviesPanel'
import { AankomendeActiesTimelijn } from '@/components/bruiloft/AankomendeActiesTimelijn'
import { ModuleStatusGrid } from '@/components/bruiloft/ModuleStatusGrid'
import { OnboardingGids } from '@/components/bruiloft/OnboardingGids'
import { Routekaart } from '@/components/bruiloft/Routekaart'
import { UrgenteAandachtspunten } from '@/components/bruiloft/UrgenteAandachtspunten'
import { WelkomstDialog } from '@/components/bruiloft/WelkomstDialog'
import { WeddingSettingsForm } from '@/components/bruiloft/WeddingSettingsForm'
import { Button, Card, CardContent } from '@/components/bruiloft/ui'
import { formatDatumNL } from '@/lib/bruiloft/format'
import { berekenGuidance } from '@/lib/bruiloft/guidance'
import { dagenTot } from '@/lib/bruiloft/format'
import { useBruiloftStore } from '@/store/bruiloftStore'

const FASE_LABEL: Record<string, string> = {
  '12 maanden voor': '12 maanden voor de bruiloft',
  '9 maanden voor': '9 maanden voor de bruiloft',
  '6 maanden voor': '6 maanden voor de bruiloft',
  '3 maanden voor': '3 maanden voor de bruiloft',
  '1 maand voor': '1 maand voor de bruiloft',
  'laatste week': 'Laatste week',
  trouwweek: 'Trouwweek',
  'na de bruiloft': 'Na de bruiloft',
}

export default function DashboardPage() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const guests = useBruiloftStore((s) => s.guests)
  const tasks = useBruiloftStore((s) => s.tasks)
  const vendors = useBruiloftStore((s) => s.vendors)
  const budgetItems = useBruiloftStore((s) => s.budgetItems)
  const currentUser = useBruiloftStore((s) => s.currentUser)
  const permissions = useBruiloftStore((s) => s.permissions)

  const [settingsOpen, setSettingsOpen] = React.useState(false)

  if (!wedding) return null

  const dagen = dagenTot(wedding.trouwdatum)
  const guidance = berekenGuidance({ wedding, tasks, vendors, budgetItems, guests })
  const faseLabel = FASE_LABEL[guidance.huidigeFase] ?? guidance.huidigeFase

  return (
    <div className="mx-auto max-w-6xl pb-24 min-h-screen">
      {/* Hero: aftelteller */}
      <Card className="relative mb-8 overflow-hidden border-border">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Gegevens bewerken"
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings2 className="h-5 w-5" />
        </Button>
        <CardContent className="flex flex-col items-center px-4 py-8 text-center sm:px-6 sm:py-14">
          <span className="mb-3 inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">
            {faseLabel}
          </span>
          <p className="text-xl font-medium text-foreground sm:text-2xl md:text-3xl">
            {wedding.partner1Naam} <span>&amp;</span> {wedding.partner2Naam}
          </p>
          <div className="my-4">
            {dagen > 0 ? (
              <p className="font-serif text-[clamp(2.5rem,11vw,4.5rem)] font-medium leading-[1.05] tracking-tight text-foreground">
                nog {dagen} {dagen === 1 ? 'dag' : 'dagen'}
              </p>
            ) : dagen === 0 ? (
              <p className="font-serif text-[clamp(2rem,9vw,3.75rem)] font-medium leading-tight text-foreground">
                Vandaag is de dag!
              </p>
            ) : (
              <p className="font-serif text-[clamp(1.75rem,7vw,3rem)] font-medium leading-tight text-foreground">
                Gefeliciteerd met jullie huwelijk
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
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

      {/* Begeleide start voor nieuwe gebruikers: gids + eenmalig welkom */}
      <OnboardingGids />
      <WelkomstDialog />

      {/* Urgente aandachtspunten: alleen zichtbaar als er iets mis is */}
      <UrgenteAandachtspunten
        tasks={tasks}
        budgetItems={budgetItems}
        vendors={vendors}
        guests={guests}
        wedding={wedding}
        permissions={permissions}
      />

      {/* AI Assistent: geprioriteerde volgende stappen */}
      <div className="mb-8">
        <AIAdviesPanel fallbackSteps={guidance.stappen} trouwdatum={wedding.trouwdatum} />
      </div>

      {/* Module status grid: Budget · Gasten · Taken · Leveranciers */}
      <div className="mb-8">
        <ModuleStatusGrid
          wedding={wedding}
          guests={guests}
          tasks={tasks}
          vendors={vendors}
          budgetItems={budgetItems}
          currentUser={currentUser}
          permissions={permissions}
        />
      </div>

      {/* Aanbevolen leveranciers uit de globale directory, op profiel gerankt */}
      <AanbevolenLeveranciers />

      {/* Aankomende acties: taken + betalingen gecombineerd op datum */}
      <div className="mb-8">
        <AankomendeActiesTimelijn tasks={tasks} budgetItems={budgetItems} />
      </div>

      {/* Routekaart: fasevoortgang */}
      <Routekaart route={guidance.route} />

      <WeddingSettingsForm
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        wedding={wedding}
      />
    </div>
  )
}
