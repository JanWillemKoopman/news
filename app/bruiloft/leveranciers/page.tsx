'use client'

import * as React from 'react'
import {
  Globe,
  Link2,
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

  const [formOpen, setFormOpen] = React.useState(false)
  const [editVendor, setEditVendor] = React.useState<Vendor | null>(null)
  const [delVendor, setDelVendor] = React.useState<Vendor | null>(null)

  if (!wedding) return null

  const gefilterd = vendors.filter((v) => {
    if (fType !== 'all' && v.type !== fType) return false
    if (fStatus !== 'all' && v.status !== fStatus) return false
    return true
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
            <Plus className="h-4 w-4" /> Leverancier
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Select value={fType} onChange={(e) => setFType(e.target.value)}>
          <option value="all">Alle types</option>
          {VENDOR_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Select value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="all">Alle statussen</option>
          {VENDOR_STATUSSEN.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
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
        <EmptyState icon={Store} titel="Geen leveranciers gevonden" beschrijving="Pas je filters aan." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gefilterd.map((v) => (
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

      <VendorForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editVendor}
        budgetItems={budgetItems}
        onSubmit={(data) => {
          if (editVendor) {
            void updateVendor(editVendor.id, data)
            toast({ title: 'Leverancier bijgewerkt', variant: 'success' })
          } else {
            void addVendor(data)
            toast({ title: 'Leverancier toegevoegd', variant: 'success' })
          }
        }}
      />

      <ConfirmDialog
        open={delVendor !== null}
        onOpenChange={(o) => !o && setDelVendor(null)}
        title="Leverancier verwijderen?"
        description={delVendor ? `Weet je zeker dat je "${delVendor.naam}" wilt verwijderen?` : undefined}
        onConfirm={() => {
          if (delVendor) {
            void deleteVendor(delVendor.id)
            toast({ title: 'Leverancier verwijderd', variant: 'success' })
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

        <div className="mt-4 flex justify-end gap-1 border-t border-border pt-3">
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
