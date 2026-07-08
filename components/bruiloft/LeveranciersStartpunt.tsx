'use client'

import Link from 'next/link'
import { Compass } from 'lucide-react'

import { Card, CardContent } from '@/components/bruiloft/ui'
import { canView } from '@/lib/bruiloft/permissions'
import { useBruiloftStore } from '@/store/bruiloftStore'
import type { VoortgangCategorie } from '@/lib/bruiloft/types'

const CATEGORIE_LABEL: Record<VoortgangCategorie, string> = {
  locatie: 'een trouwlocatie',
  fotograaf: 'een fotograaf',
  videograaf: 'een videograaf',
  catering: 'catering',
  dj_of_band: 'een DJ of band',
  trouwambtenaar: 'een trouwambtenaar',
  trouwkleding: 'trouwkleding',
  bloemist: 'een bloemist',
}

const GEBOEKT_LABEL: Record<VoortgangCategorie, string> = {
  locatie: 'trouwlocatie',
  fotograaf: 'fotograaf',
  videograaf: 'videograaf',
  catering: 'catering',
  dj_of_band: 'DJ of band',
  trouwambtenaar: 'trouwambtenaar',
  trouwkleding: 'trouwkleding',
  bloemist: 'bloemist',
}

function opsomming(delen: string[]): string {
  if (delen.length === 1) return delen[0]
  return `${delen.slice(0, -1).join(', ')} en ${delen[delen.length - 1]}`
}

// Verzilvert de wizard-antwoorden op het dashboard: wat het bruidspaar nog
// zoekt wordt een directe brug naar Ontdekken, en wat al geboekt is een
// uitnodiging om het in het leveranciersoverzicht te zetten. Verdwijnt
// zodra er leveranciers in het overzicht staan — dan is de brug geslagen.
export function LeveranciersStartpunt() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const vendors = useBruiloftStore((s) => s.vendors)
  const permissions = useBruiloftStore((s) => s.permissions)

  if (!wedding || vendors.length > 0 || !canView(permissions, 'leveranciers')) return null

  const zaken = Object.entries(wedding.geregeldeZaken ?? {}) as [
    VoortgangCategorie,
    string,
  ][]
  const teDoen = zaken.filter(([, s]) => s === 'te_doen').map(([c]) => c)
  const geboekt = zaken.filter(([, s]) => s === 'geboekt').map(([c]) => c)

  if (teDoen.length === 0 && geboekt.length === 0) return null

  const plek = wedding.woonplaats || wedding.provincie

  return (
    <Card className="mb-8">
      <CardContent className="flex items-start gap-3 p-5 sm:p-6">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Compass className="h-4 w-4" />
        </span>
        <div className="min-w-0 space-y-2">
          {teDoen.length > 0 ? (
            <div>
              <p className="text-sm text-foreground">
                Jullie zoeken nog {opsomming(teDoen.slice(0, 4).map((c) => CATEGORIE_LABEL[c]))}
                {teDoen.length > 4 ? ` en ${teDoen.length - 4} andere leveranciers` : ''}.
              </p>
              <Link
                href="/bruiloft/ontdekken"
                className="mt-0.5 inline-block text-sm font-medium text-primary hover:underline"
              >
                Ontdek leveranciers{plek ? ` in de buurt van ${plek}` : ''} →
              </Link>
            </div>
          ) : null}
          {geboekt.length > 0 ? (
            <div>
              <p className="text-sm text-muted-foreground">
                Al geregeld: {opsomming(geboekt.map((c) => GEBOEKT_LABEL[c]))}. Zet ze in het
                overzicht, dan kun je er afspraken en kosten aan koppelen.
              </p>
              <Link
                href="/bruiloft/leveranciers"
                className="mt-0.5 inline-block text-sm font-medium text-primary hover:underline"
              >
                Naar mijn leveranciers →
              </Link>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
