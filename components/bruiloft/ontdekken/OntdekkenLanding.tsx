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
// geografische zoekbalk (die hoort op de resultatenpagina). Links staan de 4
// meest gezochte categorieën (subset van dezelfde lijst als het
// Leveranciers-megamenu) gestapeld met een brede, niet te hoge foto; rechts
// daarvan de overige categorieën als compacte blokjes. Op mobiel vervalt het
// onderscheid: daar telt overzicht zwaarder dan sfeer, dus staat alles in één
// compacte lijst zonder afbeeldingen.

const UITGELICHT_AANTAL = 4

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
  // `zichtbaar` volgt al de TPW-categorie-volgorde, dus filteren op de
  // populaire lijst geeft die namen automatisch al in POPULAIRE_CATEGORIEEN-
  // volgorde (Trouwlocaties, Trouwjurken, Trouwringen, Trouwfotografen, ...).
  const populair = zichtbaar.filter((c) => POPULAIRE_CATEGORIEEN.includes(c.categorie))
  const uitgelicht = populair.slice(0, UITGELICHT_AANTAL)
  const overig = zichtbaar.filter((c) => !uitgelicht.some((u) => u.categorie === c.categorie))
  // Uitgelicht eerst, dan de rest — zelfde volgorde op mobiel en desktop.
  const alleOpVolgorde = [...uitgelicht, ...overig]

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

      {/* Desktop/tablet: links de uitgelichte categorieën gestapeld met een
          brede, niet te hoge foto; rechts de overige categorieën als
          compacte blokjes, beide kolommen even hoog beleefd. */}
      <div className="hidden gap-6 sm:flex">
        {uitgelicht.length > 0 ? (
          <div className="flex w-64 shrink-0 flex-col gap-3 lg:w-80">
            {uitgelicht.map((c) => (
              <Link
                key={c.categorie}
                href={`/bruiloft/ontdekken/${c.slug}`}
                aria-label={`${c.categorie}: ${c.omschrijving}`}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
              >
                <Card interactive className="overflow-hidden">
                  {/* Plek voor de definitieve categoriefoto: vul
                      `afbeeldingUrl` in lib/bruiloft/discovery/categorieConfig.ts —
                      zolang die leeg is toont dit vlak de neutrale icoon-placeholder. */}
                  <CategorieAfbeelding
                    categorie={c.categorie}
                    afbeeldingUrl={c.afbeeldingUrl}
                    className="aspect-[2/1]"
                  />
                  <CardContent className="p-3">
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
        ) : null}

        {overig.length > 0 ? (
          <div className="grid min-w-0 flex-1 auto-rows-min grid-cols-2 gap-2 lg:grid-cols-3">
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
        ) : null}
      </div>
    </div>
  )
}
