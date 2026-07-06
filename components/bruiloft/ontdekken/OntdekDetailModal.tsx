'use client'

import * as React from 'react'
import Link from 'next/link'
import { BadgeCheck, Globe, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'

import { LeverancierBerichtModal } from '@/components/bruiloft/leveranciers/LeverancierBerichtModal'
import { Button, Modal } from '@/components/bruiloft/ui'
import { formatteerAfstand } from '@/lib/bruiloft/discovery/geo'
import type { OntdekBusiness } from '@/lib/bruiloft/discovery/types'
import type { VendorContactType } from '@/lib/bruiloft/types'

function websiteHref(website: string): string {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`
}

// Detailweergave van één leverancier uit de directory: volledige
// beschrijving, adres en contact, plus de drie acties (Mijn lijst, offerte,
// contact). Offerte/contact hergebruikt dezelfde berichtenflow als
// /bruiloft/leveranciers.

interface OntdekDetailModalProps {
  business: OntdekBusiness | null
  onOpenChange: (open: boolean) => void
  kanBewerken: boolean
  toegevoegd: boolean
  onToevoegen: () => void
}

export function OntdekDetailModal({
  business,
  onOpenChange,
  kanBewerken,
  toegevoegd,
  onToevoegen,
}: OntdekDetailModalProps) {
  const [berichtType, setBerichtType] = React.useState<VendorContactType | null>(null)

  if (!business) return null
  const b = business

  const subtitel = [
    b.categorie,
    b.plaats,
    b.afstandKm != null ? `op ${formatteerAfstand(b.afstandKm)}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const adresRegels = [b.straat, [b.postcode, b.plaats].filter(Boolean).join(' ')].filter(
    (regel) => regel && regel.trim().length > 0
  )

  const heeftEmail = Boolean(b.email)
  const heeftContact = Boolean(b.website || b.email || b.telefoon)

  return (
    <Modal open onOpenChange={onOpenChange} title={b.naam} description={subtitel} className="sm:max-w-2xl">
      <div className="space-y-5 pb-2">
        {b.beschrijving ? (
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {b.beschrijving}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Er is nog geen beschrijving van deze leverancier beschikbaar.
          </p>
        )}

        {adresRegels.length > 0 ? (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{adresRegels.join(', ')}</span>
          </div>
        ) : null}

        {heeftContact ? (
          <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-4 text-sm">
            {b.website ? (
              <a
                href={websiteHref(b.website)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-primary hover:underline"
              >
                <Globe className="h-4 w-4" /> Website
              </a>
            ) : null}
            {b.email ? (
              <a
                href={`mailto:${b.email}`}
                className="inline-flex items-center gap-1.5 text-primary hover:underline"
              >
                <Mail className="h-4 w-4" /> E-mail
              </a>
            ) : null}
            {b.telefoon ? (
              <a
                href={`tel:${b.telefoon}`}
                className="inline-flex items-center gap-1.5 text-primary hover:underline"
              >
                <Phone className="h-4 w-4" /> {b.telefoon}
              </a>
            ) : null}
          </div>
        ) : null}

        {kanBewerken ? (
          <div className="space-y-3 border-t border-border pt-4">
            {toegevoegd ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <BadgeCheck className="h-4 w-4" /> Staat in Mijn lijst
                </span>
                <Button asChild variant="outline" size="sm">
                  <Link href="/bruiloft/leveranciers">Bekijk in Mijn lijst</Link>
                </Button>
              </div>
            ) : (
              <Button className="w-full" onClick={onToevoegen}>
                + Mijn lijst
              </Button>
            )}

            {heeftEmail ? (
              <div className="flex gap-3">
                <Button
                  variant={toegevoegd ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setBerichtType('offerte')}
                >
                  Offerte aanvragen
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setBerichtType('contact')}>
                  <MessageCircle className="h-4 w-4" /> Contact
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Geen e-mailadres bekend — bekijk de website of bel voor een offerte.
              </p>
            )}
          </div>
        ) : null}
      </div>

      {berichtType ? (
        <LeverancierBerichtModal
          open
          onOpenChange={(o) => !o && setBerichtType(null)}
          type={berichtType}
          vendor={{
            tpwBusinessId: b.id,
            naam: b.naam,
            type: b.categorie,
            email: b.email,
            telefoon: b.telefoon,
            website: b.website,
          }}
          onSent={() => setBerichtType(null)}
        />
      ) : null}
    </Modal>
  )
}
