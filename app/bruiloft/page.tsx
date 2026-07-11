'use client'

import * as React from 'react'
import { CalendarHeart, MapPin, Settings2 } from 'lucide-react'

import { BerichtenPreview } from '@/components/bruiloft/BerichtenPreview'
import { DashboardIntro } from '@/components/bruiloft/DashboardIntro'
import { ModuleStatusGrid } from '@/components/bruiloft/ModuleStatusGrid'
import { PartnerUitnodigen } from '@/components/bruiloft/PartnerUitnodigen'
import { WeddingSettingsForm } from '@/components/bruiloft/WeddingSettingsForm'
import { Card, CardContent } from '@/components/bruiloft/ui'
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

  const heeftDatum = Boolean(wedding.trouwdatum)
  const dagen = dagenTot(wedding.trouwdatum)
  const guidance = berekenGuidance({ wedding, tasks, vendors, budgetItems, guests })
  const faseLabel = FASE_LABEL[guidance.huidigeFase] ?? guidance.huidigeFase

  return (
    <div className="mx-auto max-w-6xl pb-24 min-h-screen">
      {/* Hero: aftelteller */}
      <Card className="relative mb-8 overflow-hidden border-border">
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
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70 transition-colors hover:text-foreground"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Gegevens bewerken
            </button>
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
        permissions={permissions}
      />

      {/* ── VASTE KERN: altijd zichtbaar ── */}
      <BerichtenPreview />

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

      <WeddingSettingsForm
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        wedding={wedding}
      />
    </div>
  )
}
