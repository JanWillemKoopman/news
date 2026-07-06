'use client'

import { getCategorieIcoon } from '@/components/bruiloft/leveranciers/categorieIcoon'
import { Card, CardContent } from '@/components/bruiloft/ui'
import { formatteerAfstand } from '@/lib/bruiloft/discovery/geo'
import type { OntdekBusiness } from '@/lib/bruiloft/discovery/types'
import { HartKnop } from './HartKnop'
import { OntdekAfbeelding } from './OntdekAfbeelding'
import { useMijnLijstActie } from './useMijnLijstActie'

// Resultaatkaart in de directory: foto (of neutrale placeholder) met een
// hartje om te bewaren, daaronder naam, afstand en plaats+provincie. Bewust
// geen beschrijving en geen aparte knoprij meer — het hartje op de foto
// dekt "bewaren", de rest van de kaart is puur oriëntatie; wie meer wil
// weten klikt door naar het detailpaneel.

interface OntdekCardProps {
  business: OntdekBusiness
  onOpen: () => void
}

export function OntdekCard({ business, onOpen }: OntdekCardProps) {
  const { kanBewerken, toegevoegd, voegToe } = useMijnLijstActie(business)
  const Icoon = getCategorieIcoon(business.categorie)
  const plaatsProvincie = [business.plaats, business.provincie].filter(Boolean).join(', ')

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`Bekijk ${business.naam}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      interactive
      className="flex flex-col overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
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
