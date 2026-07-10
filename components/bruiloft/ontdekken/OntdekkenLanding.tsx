'use client'

import * as React from 'react'
import Link from 'next/link'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { PageInfoButton } from '@/components/bruiloft/PageInfoButton'
import { ontdekkenInfo } from '@/components/bruiloft/faqContent'
import { LeveranciersTabs } from '@/components/bruiloft/leveranciers/LeveranciersTabs'
import { getCategorieIcoon } from '@/components/bruiloft/leveranciers/categorieIcoon'
import { Card, CardContent } from '@/components/bruiloft/ui'
import { ONTDEK_CATEGORIEEN, POPULAIRE_CATEGORIEEN, type OntdekCategorieConfig } from '@/lib/bruiloft/discovery/categorieConfig'
import { CategorieAfbeelding } from './CategorieAfbeelding'
import { useBruiloftStore } from '@/store/bruiloftStore'

// Overzichtspagina van de leveranciersdirectory: puur categorieën kiezen, geen
// geografische zoekbalk (die hoort op de resultatenpagina). De 6 populairste
// categorieën (zelfde lijst als het Leveranciers-megamenu) springen eruit met
// een sfeervolle foto; de overige categorieën blijven compact vindbaar
// eronder. Op mobiel vervalt het onderscheid: daar telt overzicht zwaarder
// dan sfeer, dus staat alles in één compacte lijst zonder afbeeldingen.

// Icoon + naam + aantal — de enige informatie die op deze pagina per
// categorie getoond wordt (geen tagline, zie omschrijving die bewust alleen
// nog als aria-label meegaat voor schermlezers).
function CategorieIcoonNaamTelling({
  config,
  telling,
  iconClassName,
}: {
  config: OntdekCategorieConfig
  telling?: number
  iconClassName?: string
}) {
  const Icoon = getCategorieIcoon(config.categorie)
  return (
    <>
      <span
        className={
          iconClassName ??
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground'
        }
      >
        <Icoon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 truncate font-medium text-foreground">{config.categorie}</span>
      {telling != null ? (
        <span className="shrink-0 text-xs text-muted-foreground">{telling.toLocaleString('nl-NL')}</span>
      ) : null}
    </>
  )
}

export function OntdekkenLanding() {
  const wedding = useBruiloftStore((s) => s.wedding)

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
  const populair = zichtbaar.filter((c) => POPULAIRE_CATEGORIEEN.includes(c.categorie))
  const overig = zichtbaar.filter((c) => !POPULAIRE_CATEGORIEEN.includes(c.categorie))
  // Populair eerst, dan de rest — zelfde volgorde op mobiel en desktop.
  const alleOpVolgorde = [...populair, ...overig]

  const totaal = tellingen
    ? Object.values(tellingen).reduce((som, n) => som + n, 0)
    : null
  const titel = totaal != null ? `Ontdek ${totaal.toLocaleString('nl-NL')} leveranciers` : 'Ontdekken'

  return (
    <div className="mx-auto min-h-screen max-w-7xl pb-24">
      <PageHeader titel={titel} info={<PageInfoButton {...ontdekkenInfo} />} />
      <LeveranciersTabs />

      {/* Mobiel: één compacte lijst, geen afbeeldingen — overzicht weegt hier
          zwaarder dan sfeer. */}
      <div className="divide-y divide-border rounded-xl border border-border bg-card shadow-sm sm:hidden">
        {alleOpVolgorde.map((c) => (
          <Link
            key={c.categorie}
            href={`/bruiloft/ontdekken/${c.slug}`}
            aria-label={`${c.categorie}: ${c.omschrijving}`}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <CategorieIcoonNaamTelling config={c} telling={tellingen?.[c.categorie]} />
          </Link>
        ))}
      </div>

      {/* Desktop/tablet: top 6 prominent met foto, overige compact eronder. */}
      <div className="hidden sm:block">
        {populair.length > 0 ? (
          <div className="mb-8">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Populaire categorieën</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {populair.map((c) => (
                <Link
                  key={c.categorie}
                  href={`/bruiloft/ontdekken/${c.slug}`}
                  aria-label={`${c.categorie}: ${c.omschrijving}`}
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
                >
                  <Card interactive className="h-full overflow-hidden">
                    {/* Plek voor de definitieve categoriefoto: vul
                        `afbeeldingUrl` in lib/bruiloft/discovery/categorieConfig.ts —
                        zolang die leeg is toont dit vlak de neutrale icoon-placeholder. */}
                    <CategorieAfbeelding
                      categorie={c.categorie}
                      afbeeldingUrl={c.afbeeldingUrl}
                      className="aspect-[4/3]"
                    />
                    <CardContent className="p-4">
                      <p className="font-medium text-foreground">{c.categorie}</p>
                      {tellingen?.[c.categorie] != null ? (
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {tellingen[c.categorie].toLocaleString('nl-NL')} leveranciers
                        </p>
                      ) : null}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {overig.length > 0 ? (
          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Overige categorieën</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {overig.map((c) => (
                <Link
                  key={c.categorie}
                  href={`/bruiloft/ontdekken/${c.slug}`}
                  aria-label={`${c.categorie}: ${c.omschrijving}`}
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
                >
                  <Card interactive className="flex items-center gap-3 p-3">
                    <CategorieIcoonNaamTelling config={c} telling={tellingen?.[c.categorie]} />
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
