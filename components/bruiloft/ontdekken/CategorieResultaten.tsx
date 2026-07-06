'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Compass } from 'lucide-react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { getCategorieIcoon } from '@/components/bruiloft/leveranciers/categorieIcoon'
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  Select,
  Skeleton,
} from '@/components/bruiloft/ui'
import { configVoorCategorie, ONTDEK_CATEGORIEEN } from '@/lib/bruiloft/discovery/categorieConfig'
import { STRAAL_OPTIES } from '@/lib/bruiloft/discovery/geo'
import type { OntdekBusiness } from '@/lib/bruiloft/discovery/types'
import type { TpwCategorie } from '@/lib/bruiloft/options'
import { useBruiloftStore } from '@/store/bruiloftStore'
import {
  FilterKolom,
  LEGE_FILTERS,
  MobieleFilterKnop,
  type OntdekFilters,
  type OntdekSort,
} from './FilterKolom'
import { OntdekCard } from './OntdekCard'
import { PlaatsZoeker } from './PlaatsZoeker'
import { locatieQuery, useOntdekLocatie } from './useOntdekLocatie'

const LIMIT = 24

// Categoriepagina van de directory: de geografische zoekbalk (categorie +
// plaats + straal) staat als belangrijkste filter horizontaal bovenaan en
// blijft plakken bij het scrollen; overige filters staan in de kolom links
// (desktop) of achter de Filters-knop (mobiel).

interface CategorieResultatenProps {
  categorie: TpwCategorie
}

export function CategorieResultaten({ categorie }: CategorieResultatenProps) {
  const router = useRouter()
  const wedding = useBruiloftStore((s) => s.wedding)

  const config = configVoorCategorie(categorie)

  const { geladen, plaats, straal, setPlaats, setStraal } = useOntdekLocatie({ syncUrl: true })
  const [filters, setFilters] = React.useState<OntdekFilters>(LEGE_FILTERS)
  const [sort, setSort] = React.useState<OntdekSort>('afstand')

  const [items, setItems] = React.useState<OntdekBusiness[]>([])
  const [totaal, setTotaal] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const [laden, setLaden] = React.useState(true)
  const [fout, setFout] = React.useState<string | null>(null)

  const effectieveSort: OntdekSort = plaats ? sort : 'naam'

  const fetchPagina = React.useCallback(
    async (gewenstePage: number, vervang: boolean) => {
      setLaden(true)
      setFout(null)
      if (vervang) setItems([])
      const params = new URLSearchParams({
        categorie,
        sort: effectieveSort,
        page: String(gewenstePage),
        limit: String(LIMIT),
      })
      if (plaats) {
        params.set('lat', String(plaats.lat))
        params.set('lon', String(plaats.lon))
        params.set('straal', String(straal))
      }
      if (filters.q.trim()) params.set('q', filters.q.trim())
      if (filters.alleenMail) params.set('mail', '1')
      try {
        const res = await fetch(`/api/tpw-businesses/search?${params.toString()}`)
        if (!res.ok) throw new Error('Zoeken mislukt')
        const data = (await res.json()) as { items: OntdekBusiness[]; totaal: number }
        setItems((prev) => (vervang ? data.items : [...prev, ...data.items]))
        setTotaal(data.totaal)
        setPage(gewenstePage)
      } catch {
        setFout('Er ging iets mis bij het zoeken. Probeer het opnieuw.')
      } finally {
        setLaden(false)
      }
    },
    [categorie, plaats, straal, filters, effectieveSort]
  )

  React.useEffect(() => {
    if (!geladen) return
    const t = setTimeout(() => fetchPagina(1, true), 300)
    return () => clearTimeout(t)
  }, [geladen, fetchPagina])

  function wisselCategorie(nieuwe: string) {
    const doel = ONTDEK_CATEGORIEEN.find((c) => c.categorie === nieuwe)
    if (!doel || doel.categorie === categorie) return
    router.push(`/bruiloft/ontdekken/${doel.slug}${locatieQuery(plaats, straal)}`)
  }

  if (!wedding) return null

  const Icoon = getCategorieIcoon(categorie)
  const categorieLabel = categorie.toLowerCase()
  const heeftMeer = items.length < totaal
  const grotereStraal = STRAAL_OPTIES.find((s) => s > straal)

  // Eén zin die het resultaat samenvat — het getal licht op, de rest blijft rustig.
  const resultaatRest = plaats
    ? `${categorieLabel} binnen ${straal} km van ${plaats.naam}`
    : `${categorieLabel} in heel Nederland`

  return (
    <div className="mx-auto min-h-screen max-w-7xl pb-24">
      <Link
        href="/bruiloft/ontdekken"
        className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Alle categorieën
      </Link>
      <PageHeader titel={categorie} />

      {/* De belangrijkste filter: waar zoeken jullie? Blijft bovenaan staan. */}
      <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-border bg-muted/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select
            value={categorie}
            onChange={(e) => wisselCategorie(e.target.value)}
            aria-label="Categorie"
            className="bg-background sm:w-56"
          >
            {ONTDEK_CATEGORIEEN.map((c) => (
              <option key={c.categorie} value={c.categorie}>
                {c.categorie}
              </option>
            ))}
          </Select>
          <div className="flex min-w-0 flex-1 gap-2">
            <PlaatsZoeker value={plaats} onChange={setPlaats} className="min-w-0 flex-1" />
            <Select
              value={String(straal)}
              onChange={(e) => setStraal(parseInt(e.target.value, 10))}
              disabled={!plaats}
              aria-label="Zoekstraal"
              className="w-32 shrink-0 bg-background"
            >
              {STRAAL_OPTIES.map((s) => (
                <option key={s} value={s}>
                  {s} km
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-6">
        <FilterKolom filters={filters} onChange={setFilters} config={config} />

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between gap-3">
            {laden && items.length === 0 ? (
              <Skeleton className="h-5 w-56" />
            ) : (
              <p className="min-w-0 truncate text-sm text-muted-foreground" aria-live="polite">
                <span className="font-medium text-foreground">
                  {totaal.toLocaleString('nl-NL')}
                </span>{' '}
                {resultaatRest}
              </p>
            )}
            <div className="flex shrink-0 items-center gap-2">
              <MobieleFilterKnop
                filters={filters}
                onChange={setFilters}
                config={config}
                sort={effectieveSort}
                onSort={setSort}
                afstandMogelijk={plaats != null}
              />
              <Select
                value={effectieveSort}
                onChange={(e) => setSort(e.target.value as OntdekSort)}
                aria-label="Sorteren op"
                className="hidden w-auto bg-background sm:flex"
              >
                <option value="afstand" disabled={!plaats}>
                  Dichtstbij eerst
                </option>
                <option value="naam">Naam A–Z</option>
              </Select>
            </div>
          </div>

          {fout ? (
            <EmptyState icon={Compass} titel="Zoeken mislukt" beschrijving={fout} />
          ) : laden && items.length === 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                    <Skeleton className="mt-4 h-3 w-full" />
                    <Skeleton className="mt-2 h-3 w-2/3" />
                    <Skeleton className="mt-5 h-9 w-28" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Icoon}
              titel={
                plaats
                  ? `Geen ${categorieLabel} binnen ${straal} km van ${plaats.naam}`
                  : `Geen ${categorieLabel} gevonden`
              }
              beschrijving={
                plaats && grotereStraal
                  ? 'Vergroot de zoekstraal om ook iets verder weg te kijken.'
                  : 'Pas de filters aan of probeer een andere plaats.'
              }
              actie={
                plaats && grotereStraal ? (
                  <Button variant="outline" onClick={() => setStraal(grotereStraal)}>
                    Zoek binnen {grotereStraal} km
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((b) => (
                  <OntdekCard key={b.id} business={b} categorieSlug={config.slug} />
                ))}
              </div>

              <div className="mt-6 flex flex-col items-center gap-2">
                {heeftMeer ? (
                  <Button variant="outline" disabled={laden} onClick={() => fetchPagina(page + 1, false)}>
                    {laden ? 'Laden…' : 'Meer laden'}
                  </Button>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {items.length} van {totaal.toLocaleString('nl-NL')} weergegeven
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
