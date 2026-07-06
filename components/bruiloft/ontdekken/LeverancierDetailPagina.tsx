'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, BadgeCheck, Compass, Globe, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { LeverancierBerichtModal } from '@/components/bruiloft/leveranciers/LeverancierBerichtModal'
import { Button, EmptyState, Skeleton } from '@/components/bruiloft/ui'
import type { OntdekBusiness } from '@/lib/bruiloft/discovery/types'
import type { VendorContactType } from '@/lib/bruiloft/types'
import { HartKnop } from './HartKnop'
import { OntdekAfbeelding } from './OntdekAfbeelding'
import { useMijnLijstActie } from './useMijnLijstActie'

function websiteHref(website: string): string {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`
}

// Eigen pagina per leverancier — vervangt de eerdere popup/tabblad-dock.
// Simpel en robuust: gewone navigatie, de terug-knop van de browser werkt
// vanzelf, geen zwevende panelen of viewport-eigenaardigheden op mobiel.

interface LeverancierDetailPaginaProps {
  id: string
  categorieSlug: string
}

export function LeverancierDetailPagina({ id, categorieSlug }: LeverancierDetailPaginaProps) {
  const [business, setBusiness] = React.useState<OntdekBusiness | null>(null)
  const [laden, setLaden] = React.useState(true)
  const [nietGevonden, setNietGevonden] = React.useState(false)
  const [fout, setFout] = React.useState(false)

  const terugLink = `/bruiloft/ontdekken/${categorieSlug}`

  React.useEffect(() => {
    let actueel = true
    setLaden(true)
    setNietGevonden(false)
    setFout(false)
    fetch(`/api/tpw-businesses/${id}`)
      .then(async (res) => {
        if (res.status === 404) {
          if (actueel) setNietGevonden(true)
          return null
        }
        if (!res.ok) throw new Error('Ophalen mislukt')
        return res.json()
      })
      .then((data) => {
        if (actueel && data?.item) setBusiness(data.item)
      })
      .catch(() => {
        if (actueel) setFout(true)
      })
      .finally(() => {
        if (actueel) setLaden(false)
      })
    return () => {
      actueel = false
    }
  }, [id])

  const TerugLink = (
    <Link
      href={terugLink}
      className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> Terug naar overzicht
    </Link>
  )

  if (laden) {
    return (
      <div className="mx-auto max-w-3xl pb-24">
        {TerugLink}
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-6 h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (nietGevonden || fout || !business) {
    return (
      <div className="mx-auto max-w-3xl pb-24">
        {TerugLink}
        <EmptyState
          icon={Compass}
          titel={nietGevonden ? 'Leverancier niet gevonden' : 'Laden mislukt'}
          beschrijving={
            nietGevonden
              ? 'Deze leverancier bestaat niet (meer).'
              : 'Er ging iets mis bij het laden. Probeer het opnieuw.'
          }
          actie={
            <Button asChild variant="outline">
              <Link href={terugLink}>Terug naar overzicht</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return <LeverancierDetailInhoud business={business} terugLink={terugLink} />
}

function LeverancierDetailInhoud({
  business,
  terugLink,
}: {
  business: OntdekBusiness
  terugLink: string
}) {
  const { kanBewerken, toegevoegd, voegToe } = useMijnLijstActie(business)
  const [berichtType, setBerichtType] = React.useState<VendorContactType | null>(null)
  const b = business

  const onderschrift = [b.categorie, [b.plaats, b.provincie].filter(Boolean).join(', ')]
    .filter(Boolean)
    .join(' · ')
  const adresRegels = [b.straat, [b.postcode, b.plaats].filter(Boolean).join(' ')].filter(
    (regel) => regel && regel.trim().length > 0
  )
  const heeftEmail = Boolean(b.email)
  const heeftContact = Boolean(b.website || b.email || b.telefoon)

  return (
    <div className="mx-auto max-w-3xl pb-24">
      <Link
        href={terugLink}
        className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Terug naar {b.categorie.toLowerCase()}
      </Link>

      <PageHeader titel={b.naam} />
      {onderschrift ? <p className="-mt-4 mb-6 text-sm text-muted-foreground">{onderschrift}</p> : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <OntdekAfbeelding business={b} className="h-56 sm:h-72">
          <HartKnop toegevoegd={toegevoegd} zichtbaar={kanBewerken} onClick={voegToe} />
        </OntdekAfbeelding>

        <div className="space-y-5 p-5 sm:p-6">
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
            <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-5 text-sm">
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
            <div className="space-y-3 border-t border-border pt-5">
              {toegevoegd ? (
                <Link
                  href="/bruiloft/leveranciers"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:underline"
                >
                  <BadgeCheck className="h-4 w-4" /> Staat in Mijn lijst — bekijk daar
                </Link>
              ) : null}

              {heeftEmail ? (
                <div className="flex gap-3">
                  <Button className="flex-1" onClick={() => setBerichtType('offerte')}>
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
