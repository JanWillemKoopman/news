'use client'

import * as React from 'react'
import { FileText, Globe, Mail, MessageCircle, Pencil, Phone } from 'lucide-react'

import { Button, Modal, Money, StatusBadge } from '@/components/bruiloft/ui'
import { capFirst } from '@/lib/utils'
import { categorieVoorWeergave } from '@/lib/bruiloft/options'
import type { Vendor, VendorContactType } from '@/lib/bruiloft/types'
import { getCategorieIcoon } from './categorieIcoon'
import { VendorDocumenten } from './VendorDocumenten'

function websiteHref(website: string): string {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`
}

interface VendorDetailModalProps {
  vendor: Vendor | null
  onOpenChange: (open: boolean) => void
  categorieen: string[]
  kanBewerken: boolean
  onBewerk: (vendor: Vendor) => void
  onContact: (vendor: Vendor, type: VendorContactType) => void
}

// Informatiepopup voor een leverancier uit de eigen lijst — zelfde opzet als
// SupplierDetailModal op /bruiloft/ontdekken. Offerte/Contact staan als
// footer altijd zichtbaar onderaan (Modal's ingebouwde sticky footer), zodat
// ze niet wegscrollen achter de rest van de informatie.
export function VendorDetailModal({
  vendor,
  onOpenChange,
  categorieen,
  kanBewerken,
  onBewerk,
  onContact,
}: VendorDetailModalProps) {
  if (!vendor) return null
  const Icoon = getCategorieIcoon(vendor.type)
  const kanContact = kanBewerken && Boolean(vendor.email)

  const feiten: { label: string; waarde: React.ReactNode }[] = []
  if (vendor.adres) feiten.push({ label: 'Adres', waarde: vendor.adres })
  if (vendor.contactpersoon) feiten.push({ label: 'Contactpersoon', waarde: vendor.contactpersoon })
  if (vendor.geoffreerdBedrag > 0) {
    feiten.push({ label: 'Offerteprijs', waarde: <Money bedrag={vendor.geoffreerdBedrag} /> })
  }

  return (
    <Modal
      open
      onOpenChange={onOpenChange}
      title={vendor.naam}
      description={capFirst(categorieVoorWeergave(vendor.type, categorieen))}
      className="sm:max-w-lg"
      footer={
        kanContact ? (
          <div className="flex gap-3">
            <Button className="flex-1" onClick={() => onContact(vendor, 'offerte')}>
              <FileText className="h-4 w-4" /> Offerte
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => onContact(vendor, 'contact')}>
              <MessageCircle className="h-4 w-4" /> Contact
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-5 pb-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-foreground/[0.06]">
              <Icoon className="h-5 w-5 text-muted-foreground" />
            </span>
            <StatusBadge kind="leverancier" value={vendor.status} />
          </div>
          {kanBewerken ? (
            <Button variant="ghost" size="sm" onClick={() => onBewerk(vendor)}>
              <Pencil className="h-4 w-4" /> Bewerken
            </Button>
          ) : null}
        </div>

        {feiten.length > 0 ? (
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {feiten.map((f) => (
              <div key={f.label}>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">{f.label}</dt>
                <dd className="mt-0.5 text-sm text-foreground">{f.waarde}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {vendor.notitie ? (
          <p className="whitespace-pre-line rounded-lg bg-muted/50 p-3 text-sm leading-relaxed text-muted-foreground">
            {vendor.notitie}
          </p>
        ) : null}

        {vendor.website || vendor.email || vendor.telefoon ? (
          <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-4 text-sm">
            {vendor.website ? (
              <a
                href={websiteHref(vendor.website)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-primary hover:underline"
              >
                <Globe className="h-4 w-4" /> Website
              </a>
            ) : null}
            {vendor.email ? (
              <a href={`mailto:${vendor.email}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                <Mail className="h-4 w-4" /> E-mail
              </a>
            ) : null}
            {vendor.telefoon ? (
              <a href={`tel:${vendor.telefoon}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                <Phone className="h-4 w-4" /> {vendor.telefoon}
              </a>
            ) : null}
          </div>
        ) : null}

        <VendorDocumenten vendorId={vendor.id} kanBewerken={kanBewerken} />
      </div>
    </Modal>
  )
}
