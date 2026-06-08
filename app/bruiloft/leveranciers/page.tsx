'use client'

import * as React from 'react'
import {
  Globe,
  LayoutGrid,
  Link2,
  List,
  Mail,
  Pencil,
  Phone,
  Plus,
  Store,
  Trash2,
  User,
} from 'lucide-react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { VendorForm } from '@/components/bruiloft/leveranciers/VendorForm'
import {
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  EmptyState,
  Money,
  Select,
  StatusBadge,
  useToast,
} from '@/components/bruiloft/ui'
import { cn } from '@/lib/utils'
import { VENDOR_STATUSSEN, VENDOR_TYPES } from '@/lib/bruiloft/options'
import { useBruiloftStore } from '@/store/bruiloftStore'
import type { BudgetItem, Vendor } from '@/lib/bruiloft/types'

export default function LeveranciersPage() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const vendors = useBruiloftStore((s) => s.vendors)
  const budgetItems = useBruiloftStore((s) => s.budgetItems)
  const addVendor = useBruiloftStore((s) => s.addVendor)
  const updateVendor = useBruiloftStore((s) => s.updateVendor)
  const deleteVendor = useBruiloftStore((s) => s.deleteVendor)
  const { toast } = useToast()

  const [fType, setFType] = React.useState('all')
  const [fStatus, setFStatus] = React.useState('all')
  const [weergave, setWeergave] = React.useState<'kaart' | 'tabel'>('kaart')
  const [sortering, setSortering] = React.useState<'naam' | 'status' | 'bedrag'>('naam')

  const [formOpen, setFormOpen] = React.useState(false)
  const [editVendor, setEditVendor] = React.useState<Vendor | null>(null)
  const [delVendor, setDelVendor] = React.useState<Vendor | null>(null)

  if (!wedding) return null

  const gefilterd = vendors.filter((v) => {
    if (fType !== 'all' && v.type !== fType) return false
    if (fStatus !== 'all' && v.status !== fStatus) return false
    return true
  })

  const gesorteerd = [...gefilterd].sort((a, b) => {
    if (sortering === 'naam') return a.naam.localeCompare(b.naam, 'nl')
    if (sortering === 'status') return a.status.localeCompare(b.status, 'nl')
    if (sortering === 'bedrag') return b.geoffreerdBedrag - a.geoffreerdBedrag
    return 0
  })

  const openNieuw = () => {
    setEditVendor(null)
    setFormOpen(true)
  }
  const openBewerk = (v: Vendor) => {
    setEditVendor(v)
    setFormOpen(true)
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        titel="Leveranciers en locaties"
        beschrijving="Vergelijk, contacteer en boek de juiste partijen."
        actie={
          <Button onClick={openNieuw}>
            <Plus className="h-4 w-4" /> Leverancier toevoegen
          </Button>
        }
      />

      {vendors.length > 0 && (() => {
        const aantallen: Record<string, number> = {}
        for (const v of vendors) {
          aantallen[v.status] = (aantallen[v.status] || 0) + 1
        }
        const statussen = [
          { label: 'Te bezoeken', key: 'te bezoeken', kleur: 'bg-secondary text-secondary-foreground' },
          { label: 'Geoffreerd', key: 'geoffreerd', kleur: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
          { label: 'Geboekt', key: 'geboekt', kleur: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
          { label: 'Afgewezen', key: 'afgewezen', kleur: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-900/40' },
        ]
        return (
          <div className="mb-6 flex flex-wrap gap-3">
            {statussen.map((s) => aantallen[s.key] ? (
              <div key={s.key} className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5">
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', s.kleur)}>
                  {aantallen[s.key]}
                </span>
                <span className="text-sm text-foreground">{s.label}</span>
              </div>
            ) : null)}
          </div>
        )
      })()}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Select value={fType} onChange={(e) => setFType(e.target.value)} className="w-auto">
          <option value="all">Alle types</option>
          {VENDOR_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="w-auto">
          <option value="all">Alle statussen</option>
          {VENDOR_STATUSSEN.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select value={sortering} onChange={(e) => setSortering(e.target.value as typeof sortering)} className="w-auto">
          <option value="naam">Naam A-Z</option>
          <option value="status">Status</option>
          <option value="bedrag">Hoogste bedrag</option>
        </Select>
        <div className="ml-auto inline-flex rounded-lg border border-border bg-background p-1">
          <button
            type="button"
            onClick={() => setWeergave('kaart')}
            className={cn('rounded-md px-3 py-1.5 text-sm transition-colors', weergave === 'kaart' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setWeergave('tabel')}
            className={cn('rounded-md px-3 py-1.5 text-sm transition-colors', weergave === 'tabel' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {vendors.length === 0 ? (
        <EmptyState
          icon={Store}
          titel="Nog geen leveranciers"
          beschrijving="Voeg locaties, catering, fotografen en meer toe om te vergelijken."
          actie={
            <Button onClick={openNieuw}>
              <Plus className="h-4 w-4" /> Leverancier toevoegen
            </Button>
          }
        />
      ) : gefilterd.length === 0 ? (
        <EmptyState
          icon={Store}
          titel="Geen leveranciers gevonden"
          beschrijving="Geen leveranciers komen overeen met de huidige filters."
          actie={<Button variant="outline" size="sm" onClick={() => { setFType('all'); setFStatus('all') }}>Wis filters</Button>}
        />
      ) : (
        <>
          {weergave === 'tabel' ? (
            <div className="rounded-lg border border-border bg-card shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Naam</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Bedrag</th>
                    <th className="px-4 py-3 font-medium">Contactpersoon</th>
                    <th className="px-4 py-3"><span className="sr-only">Acties</span></th>
                  </tr>
                </thead>
                <tbody>
                  {gesorteerd.map((v) => (
                    <tr key={v.id} className="border-b border-border last:border-0 hover:bg-accent/40">
                      <td className="px-4 py-3 font-medium text-foreground">{v.naam}</td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{v.type}</td>
                      <td className="px-4 py-3"><StatusBadge kind="leverancier" value={v.status} /></td>
                      <td className="px-4 py-3 text-foreground">{v.geoffreerdBedrag > 0 ? <Money bedrag={v.geoffreerdBedrag} /> : '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{v.contactpersoon || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" aria-label="Bewerken" onClick={() => openBewerk(v)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" aria-label="Verwijderen" onClick={() => setDelVendor(v)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {gesorteerd.map((v) => (
                <VendorCard
                  key={v.id}
                  vendor={v}
                  budgetItems={budgetItems}
                  onEdit={openBewerk}
                  onDelete={setDelVendor}
                />
              ))}
            </div>
          )}
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

function websiteHref(website: string): string {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`
}

function VendorCard({
  vendor,
  budgetItems,
  onEdit,
  onDelete,
}: {
  vendor: Vendor
  budgetItems: BudgetItem[]
  onEdit: (v: Vendor) => void
  onDelete: (v: Vendor) => void
}) {
  const gekoppeld = vendor.budgetItemId
    ? budgetItems.find((b) => b.id === vendor.budgetItemId)
    : null
  const voedtBudget = vendor.status === 'geboekt' && gekoppeld

  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{vendor.naam}</p>
            <p className="text-xs capitalize text-muted-foreground">{vendor.type}</p>
          </div>
          <StatusBadge kind="leverancier" value={vendor.status} />
        </div>

        <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
          {vendor.contactpersoon ? (
            <p className="flex items-center gap-2">
              <User className="h-4 w-4 shrink-0" /> {vendor.contactpersoon}
            </p>
          ) : null}
          {vendor.telefoon ? (
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0" />
              <a href={`tel:${vendor.telefoon}`} className="hover:text-foreground">
                {vendor.telefoon}
              </a>
            </p>
          ) : null}
          {vendor.email ? (
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0" />
              <a href={`mailto:${vendor.email}`} className="truncate hover:text-foreground">
                {vendor.email}
              </a>
            </p>
          ) : null}
          {vendor.website ? (
            <p className="flex items-center gap-2">
              <Globe className="h-4 w-4 shrink-0" />
              <a
                href={websiteHref(vendor.website)}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate hover:text-foreground"
              >
                {vendor.website}
              </a>
            </p>
          ) : null}
        </div>

        {vendor.geoffreerdBedrag > 0 ? (
          <p className="mt-4 text-lg font-semibold text-foreground">
            <Money bedrag={vendor.geoffreerdBedrag} />
          </p>
        ) : null}

        {gekoppeld ? (
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-primary">
            <Link2 className="h-3 w-3" />
            {voedtBudget ? 'telt mee in budget: ' : 'budget: '}
            <span className="capitalize">{gekoppeld.omschrijving || gekoppeld.categorie}</span>
          </p>
        ) : null}

        {vendor.notitie ? (
          <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{vendor.notitie}</p>
        ) : null}

        <div className="mt-auto flex justify-end gap-1 border-t border-border pt-3">
          <Button variant="ghost" size="icon" aria-label="Bewerken" onClick={() => onEdit(vendor)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Verwijderen" onClick={() => onDelete(vendor)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
