'use client'

import * as React from 'react'
import Link from 'next/link'
import { Compass, FileText, MessageCircle, Pencil, Plus, Search, Store, Tags, Trash2 } from 'lucide-react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { PageInfoButton } from '@/components/bruiloft/PageInfoButton'
import { leveranciersInfo } from '@/components/bruiloft/faqContent'
import { AIInsightCard } from '@/components/bruiloft/ai/AIInsightCard'
import { CategorieVoortgang } from '@/components/bruiloft/leveranciers/CategorieVoortgang'
import { DropdownFilter } from '@/components/bruiloft/leveranciers/DropdownFilter'
import { LeveranciersTabs } from '@/components/bruiloft/leveranciers/LeveranciersTabs'
import { LeverancierBerichtModal } from '@/components/bruiloft/leveranciers/LeverancierBerichtModal'
import { MijnLijstFilters } from '@/components/bruiloft/leveranciers/MijnLijstFilters'
import { VendorCategoryManageModal } from '@/components/bruiloft/leveranciers/VendorCategoryManageModal'
import { VendorForm } from '@/components/bruiloft/leveranciers/VendorForm'
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  Money,
  OverflowMenu,
  SortableTh,
  StatusBadge,
  useToast,
} from '@/components/bruiloft/ui'
import { capFirst, cn } from '@/lib/utils'
import { canEdit } from '@/lib/bruiloft/permissions'
import { categorieVoorWeergave, VENDOR_STATUSSEN, VENDOR_TYPES } from '@/lib/bruiloft/options'
import { geboektePerCategorie } from '@/lib/bruiloft/derived'
import { useBruiloftStore } from '@/store/bruiloftStore'
import type { Vendor, VendorContactType } from '@/lib/bruiloft/types'

type SortKolom = 'naam' | 'type' | 'status' | 'bedrag' | 'adres'

export default function LeveranciersPage() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const vendors = useBruiloftStore((s) => s.vendors)
  const budgetItems = useBruiloftStore((s) => s.budgetItems)
  const addVendor = useBruiloftStore((s) => s.addVendor)
  const updateVendor = useBruiloftStore((s) => s.updateVendor)
  const deleteVendor = useBruiloftStore((s) => s.deleteVendor)
  const updateWedding = useBruiloftStore((s) => s.updateWedding)
  const permissions = useBruiloftStore((s) => s.permissions)
  const { toast } = useToast()

  const kanBewerken = canEdit(permissions, 'leveranciers')

  const [zoek, setZoek] = React.useState('')
  const [fType, setFType] = React.useState('all')
  const [fStatus, setFStatus] = React.useState('all')

  // Standaard op Type A-Z; klik op een kolomtitel sorteert daarop (nogmaals
  // klikken keert de richting om) — zelfde patroon als /bruiloft/gasten.
  const [sortKolom, setSortKolom] = React.useState<SortKolom>('type')
  const [sortRichting, setSortRichting] = React.useState<'asc' | 'desc'>('asc')
  const toggleSort = (kolom: SortKolom) => {
    if (sortKolom === kolom) {
      setSortRichting((r) => (r === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKolom(kolom)
      setSortRichting('asc')
    }
  }

  const [categoryManageOpen, setCategoryManageOpen] = React.useState(false)

  const [formOpen, setFormOpen] = React.useState(false)
  const [editVendor, setEditVendor] = React.useState<Vendor | null>(null)
  const [delVendor, setDelVendor] = React.useState<Vendor | null>(null)
  const [contactVendor, setContactVendor] = React.useState<{ vendor: Vendor; type: VendorContactType } | null>(null)

  if (!wedding) return null

  const categorieen = wedding.vendorCategorieen?.length ? wedding.vendorCategorieen : VENDOR_TYPES

  // Afwijkende (legacy) types die niet meer in de beheerde lijst staan, maar
  // nog wel bij een leverancier hangen — blijven zichtbaar als keuze.
  const extraTypes = Array.from(new Set(vendors.map((v) => v.type).filter((t) => !categorieen.includes(t))))

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

  const vergelijk = (a: Vendor, b: Vendor): number => {
    switch (sortKolom) {
      case 'naam':
        return a.naam.localeCompare(b.naam, 'nl')
      case 'status':
        return VENDOR_STATUSSEN.indexOf(a.status) - VENDOR_STATUSSEN.indexOf(b.status)
      case 'bedrag':
        return a.geoffreerdBedrag - b.geoffreerdBedrag
      case 'adres':
        return (a.adres || '').localeCompare(b.adres || '', 'nl')
      case 'type':
      default:
        return a.type.localeCompare(b.type, 'nl')
    }
  }
  const gesorteerd = [...gefilterd].sort((a, b) => {
    const cmp = vergelijk(a, b)
    return sortRichting === 'asc' ? cmp : -cmp
  })

  // Tellers per status, in pipeline-volgorde (één bron: VENDOR_STATUSSEN).
  const statusTellers = new Map<string, number>()
  for (const v of vendors) {
    if (fType === 'all' || v.type === fType) {
      statusTellers.set(v.status, (statusTellers.get(v.status) ?? 0) + 1)
    }
  }
  const totaalBinnenType = Array.from(statusTellers.values()).reduce((a, b) => a + b, 0)
  const geboekteCategorieen = geboektePerCategorie(vendors, categorieen)

  // Tellers per categorie (afwijkende/legacy types tellen mee onder Overig).
  const categorieTellers = new Map<string, number>()
  for (const v of vendors) {
    const c = categorieVoorWeergave(v.type, categorieen)
    categorieTellers.set(c, (categorieTellers.get(c) ?? 0) + 1)
  }
  const categorieOpties = [
    { value: 'all', label: 'Alle categorieën', count: vendors.length },
    ...categorieen.map((c) => ({
      value: c,
      label: capFirst(c),
      count: categorieTellers.get(c) ?? 0,
      geboekt: geboekteCategorieen.has(c),
    })),
  ]
  const statusOpties = [
    { value: 'all', label: 'Alle statussen', count: totaalBinnenType },
    ...VENDOR_STATUSSEN.map((s) => ({
      value: s,
      label: capFirst(s),
      count: statusTellers.get(s) ?? 0,
    })),
  ]

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
  const openContact = (v: Vendor, type: VendorContactType) => {
    setContactVendor({ vendor: v, type })
  }

  return (
    <div className="mx-auto max-w-7xl pb-24 min-h-screen">
      <PageHeader
        titel="Mijn leveranciers"
        info={<PageInfoButton {...leveranciersInfo} />}
        primaryActie={
          kanBewerken ? (
            <Button onClick={openNieuw}>
              <Plus className="h-4 w-4" /> Leverancier toevoegen
            </Button>
          ) : undefined
        }
        secundaireActie={
          kanBewerken ? (
            <Button variant="outline" onClick={() => setCategoryManageOpen(true)}>
              <Tags className="h-4 w-4" /> Categorieën beheren
            </Button>
          ) : undefined
        }
        meerActies={
          kanBewerken
            ? [{ label: 'Categorieën beheren', icon: Tags, onClick: () => setCategoryManageOpen(true) }]
            : undefined
        }
        fab={kanBewerken ? { label: 'Leverancier toevoegen', onClick: openNieuw } : undefined}
      />
      <LeveranciersTabs />

      <AIInsightCard sectie="/bruiloft/leveranciers" />

      {vendors.length > 0 ? <CategorieVoortgang vendors={vendors} categorieen={categorieen} /> : null}

      {vendors.length > 0 ? (
        <div className="mb-5 flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={zoek}
              onChange={(e) => setZoek(e.target.value)}
              placeholder="Zoek leverancier…"
              className="pl-9"
              aria-label="Zoek in jullie leveranciers"
            />
          </div>

          {/* Desktop: filters direct zichtbaar naast de zoekbalk, zelfde
              ontwerp als de statusfilter op /bruiloft/budget */}
          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <DropdownFilter
              value={fType}
              onChange={setFType}
              options={categorieOpties}
              ariaLabel="Filter op categorie"
            />
            <DropdownFilter
              value={fStatus}
              onChange={setFStatus}
              options={statusOpties}
              ariaLabel="Filter op status"
            />
          </div>

          {/* Mobiel: filterknop + verankerd paneel, zelfde opzet als /bruiloft/taken */}
          <MijnLijstFilters
            status={fStatus}
            onStatus={setFStatus}
            type={fType}
            onType={setFType}
            categorieOpties={categorieOpties}
            statusOpties={statusOpties}
          />
        </div>
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
          <div className="hidden overflow-x-auto rounded-xl border border-border bg-card shadow-sm md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <SortableTh kolom="naam" actief={sortKolom === 'naam'} richting={sortRichting} onSort={toggleSort}>
                    Naam
                  </SortableTh>
                  <SortableTh kolom="type" actief={sortKolom === 'type'} richting={sortRichting} onSort={toggleSort}>
                    Categorie
                  </SortableTh>
                  <SortableTh kolom="status" actief={sortKolom === 'status'} richting={sortRichting} onSort={toggleSort}>
                    Status
                  </SortableTh>
                  <SortableTh kolom="bedrag" actief={sortKolom === 'bedrag'} richting={sortRichting} onSort={toggleSort}>
                    Offerteprijs
                  </SortableTh>
                  <SortableTh kolom="adres" actief={sortKolom === 'adres'} richting={sortRichting} onSort={toggleSort}>
                    Adres
                  </SortableTh>
                  {kanBewerken && <th className="px-4 py-3"><span className="sr-only">Acties</span></th>}
                </tr>
              </thead>
              <tbody>
                {gesorteerd.map((v) => {
                  const kanContact = kanBewerken && Boolean(v.email)
                  return (
                    <tr key={v.id} className="border-b border-border last:border-0 hover:bg-accent/40">
                      <td className="px-4 py-3 font-medium text-foreground">{v.naam}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {capFirst(categorieVoorWeergave(v.type, categorieen))}
                      </td>
                      <td className="px-4 py-3"><StatusBadge kind="leverancier" value={v.status} /></td>
                      <td className="px-4 py-3 text-foreground">
                        {v.geoffreerdBedrag > 0 ? <Money bedrag={v.geoffreerdBedrag} /> : '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{v.adres || '—'}</td>
                      {kanBewerken && (
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <OverflowMenu
                              label={`Acties voor ${v.naam}`}
                              items={[
                                { label: 'Bewerken', icon: Pencil, onClick: () => openBewerk(v) },
                                ...(kanContact
                                  ? [
                                      { label: 'Offerte aanvragen', icon: FileText, onClick: () => openContact(v, 'offerte' as const) },
                                      { label: 'Contact opnemen', icon: MessageCircle, onClick: () => openContact(v, 'contact' as const) },
                                    ]
                                  : []),
                                { label: 'Verwijderen', icon: Trash2, danger: true, onClick: () => setDelVendor(v) },
                              ]}
                            />
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobiel: compacte lijstweergave i.p.v. tabel */}
          <div className="divide-y divide-border rounded-xl border border-border bg-card shadow-sm md:hidden">
            {gesorteerd.map((v) => {
              const kanContact = kanBewerken && Boolean(v.email)
              return (
                <div
                  key={v.id}
                  role={kanBewerken ? 'button' : undefined}
                  tabIndex={kanBewerken ? 0 : undefined}
                  aria-label={kanBewerken ? `${v.naam} bewerken` : undefined}
                  onClick={kanBewerken ? () => openBewerk(v) : undefined}
                  onKeyDown={
                    kanBewerken
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') openBewerk(v)
                        }
                      : undefined
                  }
                  className={cn(
                    'flex min-h-[3.5rem] items-center gap-3 px-4 py-3 transition-colors',
                    kanBewerken && 'cursor-pointer hover:bg-accent/40 active:bg-accent/60'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{v.naam}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {capFirst(categorieVoorWeergave(v.type, categorieen))}
                      {v.adres ? ` · ${v.adres}` : ''}
                      {v.geoffreerdBedrag > 0 ? (
                        <>
                          {' · '}
                          <Money bedrag={v.geoffreerdBedrag} />
                        </>
                      ) : null}
                    </p>
                  </div>
                  <StatusBadge kind="leverancier" value={v.status} />
                  {kanBewerken ? (
                    <OverflowMenu
                      label={`Acties voor ${v.naam}`}
                      align="right"
                      items={[
                        { label: 'Bewerken', icon: Pencil, onClick: () => openBewerk(v) },
                        ...(kanContact
                          ? [
                              { label: 'Offerte aanvragen', icon: FileText, onClick: () => openContact(v, 'offerte' as const) },
                              { label: 'Contact opnemen', icon: MessageCircle, onClick: () => openContact(v, 'contact' as const) },
                            ]
                          : []),
                        { label: 'Verwijderen', icon: Trash2, danger: true, onClick: () => setDelVendor(v) },
                      ]}
                    />
                  ) : null}
                </div>
              )
            })}
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
        categorieen={categorieen}
        extraTypes={extraTypes}
        onSubmit={async (data) => {
          try {
            if (editVendor) {
              await updateVendor(editVendor.id, data)
              toast({ title: 'Leverancier bijgewerkt', variant: 'success' })
            } else {
              await addVendor(data)
              toast({ title: 'Leverancier toegevoegd', variant: 'success' })
            }
            if (!categorieen.includes(data.type)) {
              await updateWedding({ vendorCategorieen: [...categorieen, data.type] }).catch(() => {})
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

      {contactVendor ? (
        <LeverancierBerichtModal
          open
          onOpenChange={(o) => !o && setContactVendor(null)}
          type={contactVendor.type}
          vendor={{
            vendorId: contactVendor.vendor.id,
            naam: contactVendor.vendor.naam,
            type: contactVendor.vendor.type,
            email: contactVendor.vendor.email,
            telefoon: contactVendor.vendor.telefoon,
            website: contactVendor.vendor.website,
          }}
          onSent={() => setContactVendor(null)}
        />
      ) : null}

      <VendorCategoryManageModal
        open={categoryManageOpen}
        onOpenChange={setCategoryManageOpen}
        categorieen={categorieen}
        vendors={vendors}
      />
    </div>
  )
}
