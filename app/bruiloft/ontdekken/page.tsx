'use client'

import * as React from 'react'
import { Compass, Search } from 'lucide-react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { PageInfoButton } from '@/components/bruiloft/PageInfoButton'
import { ontdekkenInfo } from '@/components/bruiloft/faqContent'
import { FilterChips } from '@/components/bruiloft/leveranciers/FilterChips'
import { FilterSidebar } from '@/components/bruiloft/leveranciers/FilterSidebar'
import { LeveranciersTabs } from '@/components/bruiloft/leveranciers/LeveranciersTabs'
import { SupplierCard } from '@/components/bruiloft/leveranciers/SupplierCard'
import { SupplierDetailModal } from '@/components/bruiloft/leveranciers/SupplierDetailModal'
import {
  STANDAARD_FILTERS,
  type OntdekFilters,
  type OntdekSort,
} from '@/components/bruiloft/leveranciers/FilterSheet'
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  Input,
  Select,
  Skeleton,
  useToast,
} from '@/components/bruiloft/ui'
import { canEdit } from '@/lib/bruiloft/permissions'
import { dagenTot } from '@/lib/bruiloft/format'
import { budgetTotalen } from '@/lib/bruiloft/derived'
import { TPW_CATEGORIEEN } from '@/lib/bruiloft/options'
import { isToegevoegd } from '@/lib/bruiloft/suppliers/linked'
import { richtbudgetMap, type SupplierMatch } from '@/lib/bruiloft/suppliers/match'
import type { Supplier } from '@/lib/bruiloft/suppliers/types'
import { useBruiloftStore } from '@/store/bruiloftStore'

const LIMIT = 24

function aantalActiefFilters(f: OntdekFilters): number {
  let n = 0
  if (f.provincie !== 'all') n++
  if (f.plaats.trim()) n++
  if (f.prijsMin || f.prijsMax) n++
  if (f.overnachting) n++
  return n
}

export default function OntdekkenPage() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const vendors = useBruiloftStore((s) => s.vendors)
  const budgetItems = useBruiloftStore((s) => s.budgetItems)
  const addVendor = useBruiloftStore((s) => s.addVendor)
  const permissions = useBruiloftStore((s) => s.permissions)
  const { toast } = useToast()

  const kanBewerken = canEdit(permissions, 'leveranciers')

  const [filters, setFilters] = React.useState<OntdekFilters>(STANDAARD_FILTERS)
  const [detail, setDetail] = React.useState<SupplierMatch | null>(null)

  const [matches, setMatches] = React.useState<SupplierMatch[]>([])
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const [laden, setLaden] = React.useState(true)
  const [fout, setFout] = React.useState<string | null>(null)

  const profielParams = React.useMemo(() => {
    if (!wedding) return ''
    const geboekt = Array.from(
      new Set(vendors.filter((v) => v.status === 'geboekt').map((v) => v.type))
    ).join(',')
    const p = new URLSearchParams({
      budget: String(wedding.totaalBudget),
      woonplaats: wedding.woonplaats,
      daggasten: String(wedding.aantalDaggasten),
      avondgasten: String(wedding.aantalAvondgasten),
      geboekt,
      dagen: String(dagenTot(wedding.trouwdatum)),
    })
    if (wedding.provincie) p.set('profielProvincie', wedding.provincie)
    const rb = richtbudgetMap(budgetTotalen(budgetItems, vendors, wedding).perCategorie)
    if (Object.keys(rb).length > 0) p.set('richtbudget', JSON.stringify(rb))
    return p.toString()
  }, [wedding, vendors, budgetItems])

  const fetchPagina = React.useCallback(
    async (gewenstePage: number, vervang: boolean) => {
      if (!wedding) return
      setLaden(true)
      setFout(null)
      if (vervang) setMatches([])
      const params = new URLSearchParams(profielParams)
      params.set('sort', filters.sort)
      params.set('page', String(gewenstePage))
      params.set('limit', String(LIMIT))
      if (filters.categorie !== 'all') params.set('categorie', filters.categorie)
      if (filters.provincie !== 'all') params.set('provincie', filters.provincie)
      if (filters.plaats.trim()) params.set('plaats', filters.plaats.trim())
      if (filters.q.trim()) params.set('q', filters.q.trim())
      if (filters.prijsMin) params.set('prijsMin', filters.prijsMin)
      if (filters.prijsMax) params.set('prijsMax', filters.prijsMax)
      if (filters.overnachting) params.set('overnachting', 'true')
      try {
        const res = await fetch(`/api/tpw-businesses/search?${params.toString()}`)
        if (!res.ok) throw new Error('Zoeken mislukt')
        const data = (await res.json()) as { matches: SupplierMatch[]; total: number }
        setMatches((prev) => (vervang ? data.matches : [...prev, ...data.matches]))
        setTotal(data.total)
        setPage(gewenstePage)
      } catch {
        setFout('Er ging iets mis bij het zoeken. Probeer het opnieuw.')
      } finally {
        setLaden(false)
      }
    },
    [wedding, profielParams, filters]
  )

  React.useEffect(() => {
    const t = setTimeout(() => fetchPagina(1, true), 300)
    return () => clearTimeout(t)
  }, [fetchPagina])

  async function voegToe(s: Supplier) {
    try {
      const adres = [s.straat, s.huisnummer, s.plaats].filter(Boolean).join(' ')
      await addVendor({
        naam: s.naam,
        type: s.categorie,
        status: 'te bezoeken',
        contactpersoon: '',
        telefoon: s.telefoon,
        email: s.email,
        website: s.website,
        geoffreerdBedrag: s.prijsVanaf ?? 0,
        notitie: [s.omschrijvingKort, adres].filter(Boolean).join(' — '),
        tpwBusinessId: s.id,
      })
      toast({ title: 'Toegevoegd aan jullie lijst', variant: 'success' })
    } catch {
      toast({ title: 'Toevoegen mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    }
  }

  if (!wedding) return null

  const set = <K extends keyof OntdekFilters>(key: K, value: OntdekFilters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }))

  const heeftMeer = matches.length < total
  const aantalActief = aantalActiefFilters(filters)

  return (
    <div className="mx-auto max-w-7xl pb-24 min-h-screen">
      <PageHeader
        titel="Leveranciers"
        info={<PageInfoButton {...ontdekkenInfo} />}
      />
      <LeveranciersTabs />

      {/* Sticky zoekbalk */}
      <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-border bg-muted/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="mx-auto max-w-7xl space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filters.q}
                onChange={(e) => set('q', e.target.value)}
                placeholder="Zoek op naam, sfeer, kenmerk…"
                className="bg-background pl-9"
                aria-label="Zoek leveranciers"
              />
            </div>
            <Select
              value={filters.sort}
              onChange={(e) => set('sort', e.target.value as OntdekSort)}
              className="hidden w-auto sm:flex"
              aria-label="Sorteren op"
            >
              <option value="match">Beste match voor jullie</option>
              <option value="naam">Naam A-Z</option>
              <option value="prijs">Laagste prijs</option>
            </Select>
          </div>

          <FilterChips
            label="Filter op categorie"
            value={filters.categorie}
            onChange={(v) => set('categorie', v)}
            options={[
              { value: 'all', label: 'Alle' },
              ...TPW_CATEGORIEEN.map((c) => ({ value: c, label: c })),
            ]}
          />
        </div>
      </div>

      {/* Twee kolommen: filter sidebar + resultaten */}
      <div className="flex gap-6">
        <div className="hidden md:block">
          <FilterSidebar
            filters={filters}
            onChange={set}
            onReset={() => setFilters((f) => ({ ...STANDAARD_FILTERS, q: f.q, sort: f.sort }))}
            aantalActief={aantalActief}
          />
        </div>

        <div className="min-w-0 flex-1">
          {!laden && !fout && matches.length > 0 ? (
            <p className="mb-3 text-sm text-muted-foreground">
              {total} {total === 1 ? 'leverancier' : 'leveranciers'} gevonden
            </p>
          ) : null}

          {fout ? (
            <EmptyState icon={Compass} titel="Zoeken mislukt" beschrijving={fout} />
          ) : laden && matches.length === 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                    <Skeleton className="mt-4 h-3 w-2/3" />
                    <Skeleton className="mt-4 h-9 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : matches.length === 0 ? (
            <EmptyState
              icon={Compass}
              titel="Geen leveranciers gevonden"
              beschrijving="Pas de filters aan om meer resultaten te zien."
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {matches.map((m) => (
                  <SupplierCard
                    key={m.supplier.id}
                    match={m}
                    kanBewerken={kanBewerken}
                    toegevoegd={isToegevoegd(m.supplier, vendors)}
                    onToevoegen={() => voegToe(m.supplier)}
                    onOpen={() => setDetail(m)}
                  />
                ))}
              </div>

              <div className="mt-6 flex flex-col items-center gap-2">
                {heeftMeer ? (
                  <Button variant="outline" disabled={laden} onClick={() => fetchPagina(page + 1, false)}>
                    {laden ? 'Laden…' : 'Meer laden'}
                  </Button>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {matches.length} van {total} leveranciers weergegeven
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <SupplierDetailModal
        match={detail}
        onOpenChange={(o) => !o && setDetail(null)}
        kanBewerken={kanBewerken}
        toegevoegd={detail ? isToegevoegd(detail.supplier, vendors) : false}
        onToevoegen={() => detail && voegToe(detail.supplier)}
      />
    </div>
  )
}
