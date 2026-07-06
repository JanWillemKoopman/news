'use client'

import Link from 'next/link'

import { getCategorieIcoon } from '@/components/bruiloft/leveranciers/categorieIcoon'
import { Card, CardContent } from '@/components/bruiloft/ui'
import { formatteerAfstand } from '@/lib/bruiloft/discovery/geo'
import type { OntdekBusiness } from '@/lib/bruiloft/discovery/types'
import { HartKnop } from './HartKnop'
import { OntdekAfbeelding } from './OntdekAfbeelding'
import { useMijnLijstActie } from './useMijnLijstActie'

// Resultaatkaart in de directory: foto (of neutrale placeholder) met een
// hartje om te bewaren, daaronder naam, afstand en plaats+provincie. De hele
// kaart is een gewone link naar de detailpagina (via een onzichtbare
// "gestretchte" link, zodat het hartje er los bovenop klikbaar naast kan
// bestaan zonder een knop-in-een-link te nestelen) — geen popup, geen eigen
// klik-state: rechtermuisknop/nieuw tabblad werken zoals verwacht.

interface OntdekCardProps {
  business: OntdekBusiness
  categorieSlug: string
}

export function OntdekCard({ business, categorieSlug }: OntdekCardProps) {
  const { kanBewerken, toegevoegd, voegToe } = useMijnLijstActie(business)
  const Icoon = getCategorieIcoon(business.categorie)
  const plaatsProvincie = [business.plaats, business.provincie].filter(Boolean).join(', ')

  return (
    <Card interactive className="relative flex flex-col overflow-hidden">
      {/* z-10: zonder expliciete waarde wint de later-in-de-DOM staande
          afbeelding/placeholder de klik alsnog (gelijke stacking-laag →
          DOM-volgorde beslist), ook al staat deze link ervóór. */}
      <Link
        href={`/bruiloft/ontdekken/${categorieSlug}/${business.id}`}
        aria-label={`Bekijk ${business.naam}`}
        className="absolute inset-0 z-10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      <OntdekAfbeelding business={business} className="h-44 shrink-0">
        <HartKnop toegevoegd={toegevoegd} zichtbaar={kanBewerken} onClick={voegToe} />
      </OntdekAfbeelding>

      <CardContent className="flex flex-1 flex-col gap-1 p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Icoon className="h-3.5 w-3.5" />
          </span>
          <p className="truncate font-medium text-foreground">{business.naam}</p>
        </div>
        {business.afstandKm != null ? (
          <p className="text-sm text-muted-foreground">{formatteerAfstand(business.afstandKm)}</p>
        ) : null}
        {plaatsProvincie ? <p className="text-sm text-muted-foreground">{plaatsProvincie}</p> : null}
      </CardContent>
    </Card>
  )
}
