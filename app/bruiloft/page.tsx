'use client'

import * as React from 'react'
import { CalendarHeart, MapPin, Settings2 } from 'lucide-react'

import { AanbevolenLeveranciers } from '@/components/bruiloft/AanbevolenLeveranciers'
import { AIAdviesPanel } from '@/components/bruiloft/AIAdviesPanel'
import { AankomendeActiesTimelijn } from '@/components/bruiloft/AankomendeActiesTimelijn'
import { DashboardIntro } from '@/components/bruiloft/DashboardIntro'
import { ModuleStatusGrid } from '@/components/bruiloft/ModuleStatusGrid'
import { OnboardingGids } from '@/components/bruiloft/OnboardingGids'
import { PartnerUitnodigen } from '@/components/bruiloft/PartnerUitnodigen'
import { UrgenteAandachtspunten } from '@/components/bruiloft/UrgenteAandachtspunten'
import { WelkomstDialog } from '@/components/bruiloft/WelkomstDialog'
import { WeddingSettingsForm } from '@/components/bruiloft/WeddingSettingsForm'
import { PageInfoButton } from '@/components/bruiloft/PageInfoButton'
import { overzichtInfo } from '@/components/bruiloft/faqContent'
import { Button, Card, CardContent } from '@/components/bruiloft/ui'
import { formatDatumNL } from '@/lib/bruiloft/format'
import { berekenGuidance } from '@/lib/bruiloft/guidance'
import type { NextStep } from '@/lib/bruiloft/guidance'
import { dagenTot } from '@/lib/bruiloft/format'
import type { PermissionMap } from '@/lib/bruiloft/permissions'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { useAIAdvies } from '@/components/bruiloft/ai/useAIAdvies'

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

function DashboardActieBlok({
  fallbackSteps,
  trouwdatum,
  tasks,
  budgetItems,
  vendors,
  guests,
  wedding,
  permissions,
}: {
  fallbackSteps: NextStep[]
  trouwdatum: string
  tasks: React.ComponentProps<typeof UrgenteAandachtspunten>['tasks']
  budgetItems: React.ComponentProps<typeof UrgenteAandachtspunten>['budgetItems']
  vendors: React.ComponentProps<typeof UrgenteAandachtspunten>['vendors']
  guests: React.ComponentProps<typeof UrgenteAandachtspunten>['guests']
  wedding: React.ComponentProps<typeof UrgenteAandachtspunten>['wedding']
  permissions: PermissionMap
}) {
  const { advies } = useAIAdvies()
  const heeftAIAdvies = advies !== null && advies.length > 0

  if (heeftAIAdvies) {
    return (
      <div className="mb-8">
        <AIAdviesPanel fallbackSteps={fallbackSteps} trouwdatum={trouwdatum} />
      </div>
    )
  }
  return (
    <UrgenteAandachtspunten
      tasks={tasks}
      budgetItems={budgetItems}
      vendors={vendors}
      guests={guests}
      wedding={wedding}
      permissions={permissions}
    />
  )
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

  const heeftDatum = Boolean(wedding.trouwdatum)
  const dagen = dagenTot(wedding.trouwdatum)
  const guidance = berekenGuidance({ wedding, tasks, vendors, budgetItems, guests })
  const faseLabel = FASE_LABEL[guidance.huidigeFase] ?? guidance.huidigeFase

  return (
    <div className="mx-auto max-w-6xl pb-24 min-h-screen">
      {/* Hero: aftelteller */}
      <Card className="relative mb-8 overflow-hidden border-border">
        <div className="absolute left-3 top-3 z-10">
          <PageInfoButton {...overzichtInfo} />
        </div>
        <Button
          variant="ghost"
          aria-label="Gegevens bewerken"
          className="absolute right-3 top-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">Bewerken</span>
        </Button>
        <CardContent className="flex flex-col items-center px-4 py-8 text-center sm:px-6 sm:py-14">
          {heeftDatum ? (
            <span className="mb-3 inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">
              {faseLabel}
            </span>
          ) : null}
          <p className="text-xl font-medium text-foreground sm:text-2xl md:text-3xl">
            {wedding.partner1Naam} <span>&amp;</span> {wedding.partner2Naam}
          </p>
          <div className="my-4">
            {!heeftDatum ? (
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="font-serif text-[clamp(1.75rem,7vw,3rem)] font-medium leading-tight text-foreground underline decoration-rose-300 underline-offset-4 transition-colors hover:text-rose-700"
              >
                Stel jullie trouwdatum in
              </button>
            ) : dagen > 0 ? (
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
            {heeftDatum ? (
              <span className="inline-flex items-center gap-1.5">
                <CalendarHeart className="h-4 w-4 text-rose-600" />
                {formatDatumNL(wedding.trouwdatum)}
              </span>
            ) : null}
            {wedding.locatie ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-rose-600" />
                {wedding.locatie}
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Samen plannen — direct onder de Hero, alleen zichtbaar zolang de
          partner nog geen account heeft (verbergt zichzelf zodra die meeplant). */}
      <PartnerUitnodigen />

      {/* Korte statusbevestiging: waar staan jullie nu, vóór de details. */}
      <DashboardIntro
        wedding={wedding}
        tasks={tasks}
        budgetItems={budgetItems}
        vendors={vendors}
        guests={guests}
        faseLabel={faseLabel}
      />

      {/* Begeleide start voor nieuwe gebruikers: gids + eenmalig welkom */}
      <OnboardingGids />
      <WelkomstDialog />

      {/* ── HARDE FEITEN (uit jullie profiel) — eerst wat aandacht vraagt ── */}

      {/* Advies om nu te doen (AI); valt terug op urgente aandachtspunten als er nog geen AI-advies is */}
      <DashboardActieBlok
        fallbackSteps={guidance.stappen}
        trouwdatum={wedding.trouwdatum}
        tasks={tasks}
        budgetItems={budgetItems}
        vendors={vendors}
        guests={guests}
        wedding={wedding}
        permissions={permissions}
      />

      {/* Aankomende acties: taken + betalingen gecombineerd op datum */}
      <div className="mb-8">
        <AankomendeActiesTimelijn tasks={tasks} budgetItems={budgetItems} />
      </div>

      {/* Status in één oogopslag: Budget · Gasten · Taken · Leveranciers */}
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

      {/* Ontdek leveranciers — onder de persoonlijke status, geen onderbreking */}
      <AanbevolenLeveranciers />

      <WeddingSettingsForm
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        wedding={wedding}
      />
    </div>
  )
}
