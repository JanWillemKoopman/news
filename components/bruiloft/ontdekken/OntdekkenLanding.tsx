'use client'

import * as React from 'react'
import Link from 'next/link'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { PageInfoButton } from '@/components/bruiloft/PageInfoButton'
import { ontdekkenInfo } from '@/components/bruiloft/faqContent'
import { LeveranciersTabs } from '@/components/bruiloft/leveranciers/LeveranciersTabs'
import { ONTDEK_CATEGORIEEN, POPULAIRE_CATEGORIEEN, type OntdekCategorieConfig } from '@/lib/bruiloft/discovery/categorieConfig'
import { CategorieAfbeelding } from './CategorieAfbeelding'
import { cn } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'

// Overzichtspagina van de leveranciersdirectory: puur categorieën kiezen, geen
// geografische zoekbalk (die hoort op de resultatenpagina). Twee lagen:
//
// 1. De populaire categorieën als grote beeldkaarten in een editorial grid
//    (à la Riley & Grey): de 1e en 4e kaart nemen dubbele breedte, zodat
//    Trouwlocaties en Trouwfotografen vanzelf de blikvangers zijn. Naam en
//    aantal staan als witte tekst óp het beeldvlak — zodra `afbeeldingUrl`
//    in categorieConfig.ts gevuld wordt, is dit meteen de definitieve look;
//    tot die tijd toont hetzelfde vlak de neutrale icoon-placeholder.
// 2. De overige categorieën als rustige tekstregels (naam + aantal) met
//    hairlines ertussen, verdeeld over kolommen — vindbaar maar bewust
//    ondergeschikt aan de beeldkaarten erboven.

function formatTelling(n: number) {
  return `${n.toLocaleString('nl-NL')} leveranciers`
}

// Grote beeldkaart voor een populaire categorie. `breed` laat de kaart twee
// kolommen beslaan — dat spanpatroon bepaalt de hiërarchie binnen het grid.
function UitgelichteCategorieKaart({
  config,
  telling,
  breed,
}: {
  config: OntdekCategorieConfig
  telling?: number
  breed: boolean
}) {
  return (
    <Link
      href={`/bruiloft/ontdekken/${config.slug}`}
      aria-label={`${config.categorie}: ${config.omschrijving}`}
      className={cn(
        'group relative block h-40 overflow-hidden rounded-xl border border-border bg-card shadow-sm',
        'transition-[box-shadow,border-color] duration-150 ease-out hover:border-rose-300 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'sm:h-52 lg:h-60',
        breed && 'col-span-2'
      )}
    >
      <CategorieAfbeelding
        categorie={config.categorie}
        afbeeldingUrl={config.afbeeldingUrl}
        className="h-full transition-transform duration-300 ease-out group-hover:scale-[1.03]"
      />
      {/* Donkere verloop-scrim onderin zodat de witte tekst leesbaar blijft,
          zowel op de placeholder als straks op echte foto's. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-rhino-950/70 via-rhino-950/15 to-transparent"
      />
      <div className="absolute inset-x-0 bottom-0 p-4 lg:p-5">
        <p className="text-base font-medium text-white lg:text-lg">{config.categorie}</p>
        {telling != null ? (
          <p className="mt-0.5 text-sm text-white/80">{formatTelling(telling)}</p>
        ) : null}
      </div>
    </Link>
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
  const uitgelicht = zichtbaar.filter((c) => POPULAIRE_CATEGORIEEN.includes(c.categorie))
  const overig = zichtbaar.filter((c) => !POPULAIRE_CATEGORIEEN.includes(c.categorie))

  const totaal = tellingen
    ? Object.values(tellingen).reduce((som, n) => som + n, 0)
    : null
  const titel = totaal != null ? `Ontdek ${totaal.toLocaleString('nl-NL')} leveranciers` : 'Ontdekken'

  return (
    <div className="mx-auto min-h-screen max-w-7xl pb-24">
      <PageHeader titel={titel} info={<PageInfoButton {...ontdekkenInfo} />} />
      <LeveranciersTabs />

      {uitgelicht.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {uitgelicht.map((c, i) => (
            <UitgelichteCategorieKaart
              key={c.categorie}
              config={c}
              telling={tellingen?.[c.categorie]}
              // Het editorial-spanpatroon: kaart 1 en 4 (Trouwlocaties en
              // Trouwfotografen) beslaan twee kolommen, de rest één — zo
              // vullen zes kaarten precies twee rijen zonder gaten.
              breed={i % 3 === 0}
            />
          ))}
        </div>
      ) : null}

      {overig.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Meer categorieën
          </h2>
          <div className="mt-3 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
            {overig.map((c) => (
              <Link
                key={c.categorie}
                href={`/bruiloft/ontdekken/${c.slug}`}
                aria-label={`${c.categorie}: ${c.omschrijving}`}
                className="-mx-3 flex items-baseline justify-between gap-4 rounded-lg border-b border-border px-3 py-3.5 transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <span className="min-w-0 truncate font-medium text-foreground">{c.categorie}</span>
                {tellingen?.[c.categorie] != null ? (
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                    {tellingen[c.categorie].toLocaleString('nl-NL')}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
