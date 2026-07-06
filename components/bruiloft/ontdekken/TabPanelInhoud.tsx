'use client'

import * as React from 'react'
import Link from 'next/link'
import { BadgeCheck, Globe, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'

import { LeverancierBerichtModal } from '@/components/bruiloft/leveranciers/LeverancierBerichtModal'
import { Button } from '@/components/bruiloft/ui'
import { formatteerAfstand } from '@/lib/bruiloft/discovery/geo'
import type { OntdekBusiness } from '@/lib/bruiloft/discovery/types'
import type { VendorContactType } from '@/lib/bruiloft/types'
import { HartKnop } from './HartKnop'
import { OntdekAfbeelding } from './OntdekAfbeelding'
import { useMijnLijstActie } from './useMijnLijstActie'

function websiteHref(website: string): string {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`
}

// Inhoud van één leverancier-tabblad — identiek hergebruikt in het
// desktop-paneel en de mobiele volledige-schermsheet (TabDockDesktop /
// TabDockMobile leveren alleen de omlijsting: header met minimaliseren/
// sluiten). Vervangt de vorige OntdekDetailModal.
export function TabPanelInhoud({ business }: { business: OntdekBusiness }) {
  const { kanBewerken, toegevoegd, voegToe } = useMijnLijstActie(business)
  const [berichtType, setBerichtType] = React.useState<VendorContactType | null>(null)
  const b = business

  const onderschrift = [
    b.categorie,
    [b.plaats, b.provincie].filter(Boolean).join(', '),
    b.afstandKm != null ? formatteerAfstand(b.afstandKm) : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const adresRegels = [b.straat, [b.postcode, b.plaats].filter(Boolean).join(' ')].filter(
    (regel) => regel && regel.trim().length > 0
  )
  const heeftEmail = Boolean(b.email)
  const heeftContact = Boolean(b.website || b.email || b.telefoon)

  return (
    <div className="flex flex-col pb-4">
      <OntdekAfbeelding business={b} className="h-40 shrink-0">
        <HartKnop toegevoegd={toegevoegd} zichtbaar={kanBewerken} onClick={voegToe} />
      </OntdekAfbeelding>

      <div className="space-y-4 p-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{b.naam}</h3>
          {onderschrift ? <p className="mt-0.5 text-sm text-muted-foreground">{onderschrift}</p> : null}
        </div>

        {b.beschrijving ? (
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {b.beschrijving}
          </p>
        ) : null}

        {adresRegels.length > 0 ? (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{adresRegels.join(', ')}</span>
          </div>
        ) : null}

        {heeftContact ? (
          <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-4 text-sm">
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
              <a href={`mailto:${b.email}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                <Mail className="h-4 w-4" /> E-mail
              </a>
            ) : null}
            {b.telefoon ? (
              <a href={`tel:${b.telefoon}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                <Phone className="h-4 w-4" /> {b.telefoon}
              </a>
            ) : null}
          </div>
        ) : null}

        {kanBewerken ? (
          <div className="space-y-3 border-t border-border pt-4">
            {toegevoegd ? (
              <Link
                href="/bruiloft/leveranciers"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:underline"
              >
                <BadgeCheck className="h-4 w-4" /> Staat in Mijn lijst — bekijk daar
              </Link>
            ) : null}

            {heeftEmail ? (
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={() => setBerichtType('offerte')}>
                  Offerte aanvragen
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setBerichtType('contact')}>
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
    </div>
  )
}
