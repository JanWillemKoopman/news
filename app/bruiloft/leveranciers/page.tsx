'use client'

import * as React from 'react'
import Link from 'next/link'
import { Compass, LayoutGrid, List, Pencil, Plus, Search, Store, Trash2 } from 'lucide-react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { AIInsightCard } from '@/components/bruiloft/ai/AIInsightCard'
import { CategorieVoortgang } from '@/components/bruiloft/leveranciers/CategorieVoortgang'
import { FilterChips } from '@/components/bruiloft/leveranciers/FilterChips'
import { LeveranciersTabs } from '@/components/bruiloft/leveranciers/LeveranciersTabs'
import { VendorCard } from '@/components/bruiloft/leveranciers/VendorCard'
import { VendorForm } from '@/components/bruiloft/leveranciers/VendorForm'
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  Money,
  OverflowMenu,
  Select,
  StatusBadge,
  useToast,
} from '@/components/bruiloft/ui'
import { capFirst, cn } from '@/lib/utils'
import { canEdit } from '@/lib/bruiloft/permissions'
import { VENDOR_STATUSSEN } from '@/lib/bruiloft/options'
import { useBruiloftStore } from '@/store/bruiloftStore'
import type { Vendor } from '@/lib/bruiloft/types'

export default function LeveranciersPage() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const vendors = useBruiloftStore((s) => s.vendors)
  const budgetItems = useBruiloftStore((s) => s.budgetItems)
  const addVendor = useBruiloftStore((s) => s.addVendor)
  const updateVendor = useBruiloftStore((s) => s.updateVendor)
  const deleteVendor = useBruiloftStore((s) => s.deleteVendor)
  const permissions = useBruiloftStore((s) => s.permissions)
  const { toast } = useToast()

  const kanBewerken = canEdit(permissions, 'leveranciers')

  const [zoek, setZoek] = React.useState('')
  const [fType, setFType] = React.useState('all')
  const [fStatus, setFStatus] = React.useState('all')
  const [weergave, setWeergave] = React.useState<'kaart' | 'tabel'>('kaart')
  const [sortering, setSortering] = React.useState<'naam' | 'status' | 'bedrag'>('naam')

  const [formOpen, setFormOpen] = React.useState(false)
  const [editVendor, setEditVendor] = React.useState<Vendor | null>(null)
  const [delVendor, setDelVendor] = React.useState<Vendor | null>(null)

  if (!wedding) return null

  const zoekterm = zoek.trim().toLowerCase()
  const gefilterd = vendors.filter((v) => {
    if (fType !== 'all' && v.type !== fType) return false
    if (fStatus !== 'all' && v.status !== fStatus) return false
    if (zoekterm) {
      const doorzoekbaar = `${v.naam} ${v.contactpersoon} ${v.notitie}`.toLowerCase()
      if (!doorzoekbaar.includes(zoekterm)) return false
    }
    return true
  })

  const gesorteerd = [...gefilterd].sort((a, b) => {
    if (sortering === 'naam') return a.naam.localeCompare(b.naam, 'nl')
    if (sortering === 'status')
      return VENDOR_STATUSSEN.indexOf(a.status) - VENDOR_STATUSSEN.indexOf(b.status)
    if (sortering === 'bedrag') return b.geoffreerdBedrag - a.geoffreerdBedrag
    return 0
  })

  // Tellers per status, in pipeline-volgorde (één bron: VENDOR_STATUSSEN).
  const statusTellers = new Map<string, number>()
  for (const v of vendors) {
    if (fType === 'all' || v.type === fType) {
      statusTellers.set(v.status, (statusTellers.get(v.status) ?? 0) + 1)
    }
  }
  const totaalBinnenType = Array.from(statusTellers.values()).reduce((a, b) => a + b, 0)

  const wisFilters = () => {
    setZoek('')
    setFType('all')
    setFStatus('all')
  }

  const openNieuw = () => {
    setEditVendor(null)
    setFormOpen(true)
  }
  const openBewerk = (v: Vendor) => {
    setEditVendor(v)
    setFormOpen(true)
  }

  return (
    <div className="mx-auto max-w-6xl pb-24 min-h-screen">
      <PageHeader
        titel="Leveranciers"
        beschrijving="Vergelijk, contacteer en boek de juiste partijen."
        actie={
          kanBewerken ? (
            <Button onClick={openNieuw}>
              <Plus className="h-4 w-4" /> Leverancier toevoegen
            </Button>
          ) : undefined
        }
        fab={kanBewerken ? { label: 'Leverancier toevoegen', onClick: openNieuw } : undefined}
      />
      <LeveranciersTabs />

      <AIInsightCard sectie="/bruiloft/leveranciers" />

      {vendors.length > 0 ? (
        <CategorieVoortgang vendors={vendors} waarde={fType} onChange={setFType} />
      ) : null}

      {vendors.length > 0 ? (
        <>
          <div className="mb-3 flex items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={zoek}
                onChange={(e) => setZoek(e.target.value)}
                placeholder="Zoek leverancier…"
                className="pl-9"
                aria-label="Zoek in jullie leveranciers"
              />
            </div>
            <Select
              value={sortering}
              onChange={(e) => setSortering(e.target.value as typeof sortering)}
              className="w-auto"
              aria-label="Sorteren op"
            >
              <option value="naam">Naam A-Z</option>
              <option value="status">Status</option>
              <option value="bedrag">Hoogste bedrag</option>
            </Select>
            <div className="ml-auto hidden rounded-lg border border-border bg-background p-1 md:inline-flex">
              <button
                type="button"
                aria-label="Kaartweergave"
                aria-pressed={weergave === 'kaart'}
                onClick={() => setWeergave('kaart')}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm transition-colors',
                  weergave === 'kaart'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Tabelweergave"
                aria-pressed={weergave === 'tabel'}
                onClick={() => setWeergave('tabel')}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm transition-colors',
                  weergave === 'tabel'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          <FilterChips
            label="Filter op status"
            className="mb-5"
            value={fStatus}
            onChange={setFStatus}
            options={[
              { value: 'all', label: 'Alle', count: totaalBinnenType },
              ...VENDOR_STATUSSEN.map((s) => ({
                value: s,
                label: s,
                count: statusTellers.get(s) ?? 0,
                dimmed: !statusTellers.get(s),
              })),
            ]}
          />
        </>
      ) : null}

      {vendors.length === 0 ? (
        <EmptyState
          icon={Store}
          titel="Nog geen leveranciers"
          beschrijving={
            kanBewerken
              ? 'Ontdek locaties, catering, fotografen en meer — of voeg zelf een leverancier toe.'
              : 'Er zijn nog geen leveranciers.'
          }
          actie={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/bruiloft/ontdekken">
                  <Compass className="h-4 w-4" /> Ontdek leveranciers
                </Link>
              </Button>
              {kanBewerken ? (
                <Button variant="outline" onClick={openNieuw}>
                  <Plus className="h-4 w-4" /> Zelf toevoegen
                </Button>
              ) : null}
            </div>
          }
        />
      ) : gefilterd.length === 0 ? (
        <EmptyState
          icon={Store}
          titel="Geen leveranciers gevonden"
          beschrijving="Geen leveranciers komen overeen met de huidige filters."
          actie={
            <Button variant="outline" size="sm" onClick={wisFilters}>
              Wis filters
            </Button>
          }
        />
      ) : (
        <>
          {weergave === 'tabel' ? (
            <div className="hidden overflow-x-auto rounded-lg border border-border bg-card shadow-sm md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Naam</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Bedrag</th>
                    <th className="px-4 py-3 font-medium">Contactpersoon</th>
                    {kanBewerken && <th className="px-4 py-3"><span className="sr-only">Acties</span></th>}
                  </tr>
                </thead>
                <tbody>
                  {gesorteerd.map((v) => (
                    <tr key={v.id} className="border-b border-border last:border-0 hover:bg-accent/40">
                      <td className="px-4 py-3 font-medium text-foreground">{v.naam}</td>
                      <td className="px-4 py-3 text-muted-foreground">{capFirst(v.type)}</td>
                      <td className="px-4 py-3"><StatusBadge kind="leverancier" value={v.status} /></td>
                      <td className="px-4 py-3 text-foreground">
                        {v.geoffreerdBedrag > 0 ? <Money bedrag={v.geoffreerdBedrag} /> : '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{v.contactpersoon || '—'}</td>
                      {kanBewerken && (
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <OverflowMenu
                              label={`Acties voor ${v.naam}`}
                              items={[
                                { label: 'Bewerken', icon: Pencil, onClick: () => openBewerk(v) },
                                { label: 'Verwijderen', icon: Trash2, danger: true, onClick: () => setDelVendor(v) },
                              ]}
                            />
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {/* Mobiel altijd kaarten; desktop volgens de gekozen weergave. */}
          <div
            className={cn(
              'grid gap-4 sm:grid-cols-2 lg:grid-cols-3',
              weergave === 'tabel' && 'md:hidden'
            )}
          >
            {gesorteerd.map((v) => (
              <VendorCard
                key={v.id}
                vendor={v}
                budgetItems={budgetItems}
                onEdit={kanBewerken ? openBewerk : undefined}
                onDelete={kanBewerken ? setDelVendor : undefined}
              />
            ))}
          </div>

          <p className="mt-4 text-right text-xs text-muted-foreground">
            {gefilterd.length === vendors.length
              ? `${vendors.length} leveranciers`
              : `${gefilterd.length} van ${vendors.length} leveranciers weergegeven`}
          </p>
        </>
      )}

      <VendorForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editVendor}
        budgetItems={budgetItems}
        onSubmit={async (data) => {
          try {
            if (editVendor) {
              await updateVendor(editVendor.id, data)
              toast({ title: 'Leverancier bijgewerkt', variant: 'success' })
            } else {
              await addVendor(data)
              toast({ title: 'Leverancier toegevoegd', variant: 'success' })
            }
          } catch (e) {
            toast({ title: 'Opslaan mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
            throw e
          }
        }}
      />

      <ConfirmDialog
        open={delVendor !== null}
        onOpenChange={(o) => !o && setDelVendor(null)}
        title="Leverancier verwijderen?"
        description={delVendor ? `Weet je zeker dat je "${delVendor.naam}" wilt verwijderen?` : undefined}
        onConfirm={async () => {
          if (!delVendor) return
          try {
            await deleteVendor(delVendor.id)
            toast({ title: 'Leverancier verwijderd', variant: 'success' })
          } catch {
            toast({ title: 'Verwijderen mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
          }
        }}
      />
    </div>
  )
}
