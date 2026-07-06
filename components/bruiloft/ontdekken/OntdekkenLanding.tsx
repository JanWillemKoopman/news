'use client'

import * as React from 'react'
import Link from 'next/link'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { PageInfoButton } from '@/components/bruiloft/PageInfoButton'
import { ontdekkenInfo } from '@/components/bruiloft/faqContent'
import { LeveranciersTabs } from '@/components/bruiloft/leveranciers/LeveranciersTabs'
import { getCategorieIcoon } from '@/components/bruiloft/leveranciers/categorieIcoon'
import { Card, CardContent } from '@/components/bruiloft/ui'
import { ONTDEK_CATEGORIEEN } from '@/lib/bruiloft/discovery/categorieConfig'
import { PlaatsZoeker } from './PlaatsZoeker'
import { locatieQuery, useOntdekLocatie } from './useOntdekLocatie'
import { useBruiloftStore } from '@/store/bruiloftStore'

// Overzichtspagina van de leveranciersdirectory: eerst "waar zoeken jullie?",
// daaronder de categorie-keuze. Beide stappen zijn optioneel-in-volgorde:
// wie meteen een categorie kiest, kan de plaats ook op de categoriepagina
// nog kiezen (de zoekbalk staat daar bovenaan).

export function OntdekkenLanding() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const { plaats, straal, setPlaats } = useOntdekLocatie()

  const [tellingen, setTellingen] = React.useState<Record<string, number> | null>(null)

  React.useEffect(() => {
    let actueel = true
    fetch('/api/ontdekken/categorieen')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (actueel && data?.tellingen) setTellingen(data.tellingen)
      })
      .catch(() => {
        // Zonder tellingen tonen we de kaartjes gewoon zonder aantallen.
      })
    return () => {
      actueel = false
    }
  }, [])

  if (!wedding) return null

  // Zolang de tellingen laden tonen we alles; daarna verdwijnen categorieën
  // die (nog) leeg zijn vanzelf uit het overzicht.
  const zichtbaar = ONTDEK_CATEGORIEEN.filter(
    (c) => tellingen == null || (tellingen[c.categorie] ?? 0) > 0
  )

  return (
    <div className="mx-auto min-h-screen max-w-7xl pb-24">
      <PageHeader titel="Ontdekken" info={<PageInfoButton {...ontdekkenInfo} />} />
      <LeveranciersTabs />

      <div className="mb-8 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-8">
        <h2 className="font-serif text-2xl text-foreground">Leveranciers in jullie buurt</h2>
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
          Van trouwlocatie tot fotograaf: zoek op plaatsnaam en ontdek wat er in de omgeving te
          vinden is — ook in de dorpen eromheen.
        </p>
        <div className="mt-5 max-w-xl">
          <PlaatsZoeker value={plaats} onChange={setPlaats} variant="hero" inputId="ontdek-plaats" />
        </div>
        {plaats ? (
          <p className="mt-2.5 text-xs text-muted-foreground">
            Jullie zoeken rond {plaats.naam}
            {plaats.gemeente && plaats.gemeente !== plaats.naam
              ? ` (gemeente ${plaats.gemeente})`
              : ''}
            . Kies hieronder een categorie.
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {zichtbaar.map((c) => {
          const Icoon = getCategorieIcoon(c.categorie)
          const telling = tellingen?.[c.categorie]
          return (
            <Link
              key={c.categorie}
              href={`/bruiloft/ontdekken/${c.slug}${locatieQuery(plaats, straal)}`}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
            >
              <Card interactive className="h-full">
                <CardContent className="flex h-full items-start gap-3 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Icoon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{c.categorie}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{c.omschrijving}</p>
                    {telling != null && telling > 0 ? (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {telling.toLocaleString('nl-NL')} leveranciers
                      </p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
