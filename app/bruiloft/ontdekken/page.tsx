'use client'

import * as React from 'react'
import { Compass, Search, SlidersHorizontal, X } from 'lucide-react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { FilterChips } from '@/components/bruiloft/leveranciers/FilterChips'
import {
  FilterSheet,
  STANDAARD_FILTERS,
  aantalSheetFilters,
  type OntdekFilters,
  type OntdekSort,
} from '@/components/bruiloft/leveranciers/FilterSheet'
import { LeveranciersTabs } from '@/components/bruiloft/leveranciers/LeveranciersTabs'
import { SupplierCard } from '@/components/bruiloft/leveranciers/SupplierCard'
import { SupplierDetailModal } from '@/components/bruiloft/leveranciers/SupplierDetailModal'
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
import { VENDOR_TYPES } from '@/lib/bruiloft/options'
import { isToegevoegd } from '@/lib/bruiloft/suppliers/linked'
import type { SupplierMatch } from '@/lib/bruiloft/suppliers/match'
import type { Supplier } from '@/lib/bruiloft/suppliers/types'
import { useBruiloftStore } from '@/store/bruiloftStore'

const LIMIT = 24

export default function OntdekkenPage() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const vendors = useBruiloftStore((s) => s.vendors)
  const addVendor = useBruiloftStore((s) => s.addVendor)
  const permissions = useBruiloftStore((s) => s.permissions)
  const { toast } = useToast()

  const kanBewerken = canEdit(permissions, 'leveranciers')

  const [filters, setFilters] = React.useState<OntdekFilters>(STANDAARD_FILTERS)
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [detail, setDetail] = React.useState<SupplierMatch | null>(null)

  const [matches, setMatches] = React.useState<SupplierMatch[]>([])
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const [laden, setLaden] = React.useState(true)
  const [fout, setFout] = React.useState<string | null>(null)

  // Profiel-parameters voor de ranking (uit de store).
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
    })
    return p.toString()
  }, [wedding, vendors])

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
      if (filters.buitenTrouwen) params.set('buitenTrouwen', 'true')
      if (filters.overnachting) params.set('overnachting', 'true')
      try {
        const res = await fetch(`/api/suppliers/search?${params.toString()}`)
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

  // Herzoek (gedebounced) bij elke filterwijziging.
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
        supplierId: s.id,
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

  // Verwijderbare chips voor de paneel-filters die actief zijn.
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
  if (filters.buitenTrouwen)
    actieveFilters.push({ key: 'buiten', label: 'buiten trouwen', wis: () => set('buitenTrouwen', false) })
  if (filters.overnachting)
    actieveFilters.push({ key: 'overnachting', label: 'overnachting', wis: () => set('overnachting', false) })

  return (
    <div className="mx-auto max-w-6xl pb-24 min-h-screen">
      <PageHeader
        titel="Leveranciers"
        beschrijving="Doorzoek alle trouwlocaties en leveranciers — gesorteerd op wat het beste bij jullie past."
      />
      <LeveranciersTabs />

      {/* Sticky zoekbalk: blijft in beeld terwijl de resultaten scrollen. */}
      <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-border bg-muted/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="mx-auto flex max-w-6xl items-center gap-2">
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

      <FilterChips
        label="Filter op categorie"
        className="mb-3"
        value={filters.categorie}
        onChange={(v) => set('categorie', v)}
        options={[
          { value: 'all', label: 'Alle' },
          ...VENDOR_TYPES.map((t) => ({ value: t, label: t })),
        ]}
      />

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
                categorie: f.categorie,
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
