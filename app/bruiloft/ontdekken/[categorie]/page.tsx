'use client'

import * as React from 'react'
import { notFound } from 'next/navigation'
import { Compass, Search, SlidersHorizontal, X } from 'lucide-react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { FilterSheet, STANDAARD_FILTERS, aantalSheetFilters, type OntdekFilters, type OntdekSort } from '@/components/bruiloft/leveranciers/FilterSheet'
import { SupplierCard } from '@/components/bruiloft/leveranciers/SupplierCard'
import { SupplierDetailModal } from '@/components/bruiloft/leveranciers/SupplierDetailModal'
import { getCategorieIcoon } from '@/components/bruiloft/leveranciers/categorieIcoon'
import { Button, Card, CardContent, EmptyState, Input, Select, Skeleton, useToast } from '@/components/bruiloft/ui'
import { canEdit } from '@/lib/bruiloft/permissions'
import { dagenTot } from '@/lib/bruiloft/format'
import { budgetTotalen } from '@/lib/bruiloft/derived'
import { slugNaarTpwCategorie, type TpwCategorie } from '@/lib/bruiloft/options'
import { isToegevoegd } from '@/lib/bruiloft/suppliers/linked'
import { richtbudgetMap, type SupplierMatch } from '@/lib/bruiloft/suppliers/match'
import type { Supplier } from '@/lib/bruiloft/suppliers/types'
import { useBruiloftStore } from '@/store/bruiloftStore'

const LIMIT = 24

interface Props {
  params: { categorie: string }
}

export default function TpwCategoriePage({ params }: Props) {
  const categorie = slugNaarTpwCategorie(params.categorie) as TpwCategorie | undefined

  if (!categorie) {
    notFound()
  }

  const wedding = useBruiloftStore((s) => s.wedding)
  const vendors = useBruiloftStore((s) => s.vendors)
  const budgetItems = useBruiloftStore((s) => s.budgetItems)
  const addVendor = useBruiloftStore((s) => s.addVendor)
  const permissions = useBruiloftStore((s) => s.permissions)
  const { toast } = useToast()

  const kanBewerken = canEdit(permissions, 'leveranciers')

  const [filters, setFilters] = React.useState<OntdekFilters>({
    ...STANDAARD_FILTERS,
    categorie: 'all',
  })
  const [sheetOpen, setSheetOpen] = React.useState(false)
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
      const p = new URLSearchParams(profielParams)
      p.set('categorie', categorie)
      p.set('sort', filters.sort)
      p.set('page', String(gewenstePage))
      p.set('limit', String(LIMIT))
      if (filters.provincie !== 'all') p.set('provincie', filters.provincie)
      if (filters.plaats.trim()) p.set('plaats', filters.plaats.trim())
      if (filters.q.trim()) p.set('q', filters.q.trim())
      if (filters.prijsMin) p.set('prijsMin', filters.prijsMin)
      if (filters.prijsMax) p.set('prijsMax', filters.prijsMax)
      try {
        const res = await fetch(`/api/tpw-businesses/search?${p.toString()}`)
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
    [wedding, profielParams, filters, categorie]
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
  const sheetActief = aantalSheetFilters(filters)

  const actieveFilters: { key: string; label: string; wis: () => void }[] = []
  if (filters.provincie !== 'all')
    actieveFilters.push({ key: 'provincie', label: filters.provincie, wis: () => set('provincie', 'all') })
  if (filters.plaats.trim())
    actieveFilters.push({ key: 'plaats', label: filters.plaats.trim(), wis: () => set('plaats', '') })
  if (filters.prijsMin || filters.prijsMax)
    actieveFilters.push({
      key: 'prijs',
      label: `€${filters.prijsMin || '0'}–€${filters.prijsMax || '∞'}`,
      wis: () => setFilters((f) => ({ ...f, prijsMin: '', prijsMax: '' })),
    })

  const CategorieIcoon = getCategorieIcoon(categorie)

  return (
    <div className="mx-auto max-w-6xl pb-24 min-h-screen">
      <PageHeader
        titel={categorie}
        beschrijving={`Bekijk alle ${categorie.toLowerCase()} en voeg jouw favorieten toe aan jullie lijst.`}
      />

      {/* Sticky zoekbalk */}
      <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-border bg-muted/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="mx-auto flex max-w-6xl items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.q}
              onChange={(e) => set('q', e.target.value)}
              placeholder={`Zoek in ${categorie.toLowerCase()}…`}
              className="bg-background pl-9"
              aria-label={`Zoek ${categorie}`}
            />
          </div>
          <Button variant="outline" onClick={() => setSheetOpen(true)} className="shrink-0">
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
            {sheetActief > 0 ? (
              <span className="rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                {sheetActief}
              </span>
            ) : null}
          </Button>
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
      </div>

      {actieveFilters.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {actieveFilters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={f.wis}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20"
            >
              {f.label} <X className="h-3 w-3" />
            </button>
          ))}
          <button
            type="button"
            onClick={() =>
              setFilters((f) => ({
                ...STANDAARD_FILTERS,
                q: f.q,
                sort: f.sort,
              }))
            }
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Wis alles
          </button>
        </div>
      )}

      {!laden && !fout && matches.length > 0 ? (
        <p className="mb-3 text-sm text-muted-foreground">
          {total} {total === 1 ? categorie.slice(0, -1).toLowerCase() : categorie.toLowerCase()} gevonden
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
          icon={CategorieIcoon}
          titel={`Geen ${categorie.toLowerCase()} gevonden`}
          beschrijving="Pas de filters aan of probeer een andere zoekterm."
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
              {matches.length} van {total} weergegeven
            </p>
          </div>
        </>
      )}

      <FilterSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        filters={filters}
        onApply={setFilters}
      />

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
