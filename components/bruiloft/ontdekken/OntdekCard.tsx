'use client'

import * as React from 'react'
import { BadgeCheck } from 'lucide-react'

import { getCategorieIcoon } from '@/components/bruiloft/leveranciers/categorieIcoon'
import { Button, Card, CardContent } from '@/components/bruiloft/ui'
import { formatteerAfstand } from '@/lib/bruiloft/discovery/geo'
import type { OntdekBusiness } from '@/lib/bruiloft/discovery/types'

// Resultaatkaart in de directory. Bewust tekst-eerst: de dataset heeft nog
// geen foto's, dus de naam is de held en de kaart blijft rustig (geen lege
// beeldvlakken). Zodra er foto's zijn, krijgt deze kaart een beeld-header
// bovenop dezelfde indeling.

interface OntdekCardProps {
  business: OntdekBusiness
  toegevoegd: boolean
  kanBewerken: boolean
  onToevoegen: () => void
  onOpen: () => void
}

export function OntdekCard({
  business,
  toegevoegd,
  kanBewerken,
  onToevoegen,
  onOpen,
}: OntdekCardProps) {
  const Icoon = getCategorieIcoon(business.categorie)
  const subregel = [
    business.plaats,
    business.afstandKm != null ? formatteerAfstand(business.afstandKm) : null,
  ]
    .filter(Boolean)
    .join(' · ')

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
      className="flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CardContent className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Icoon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground">{business.naam}</p>
            {subregel ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{subregel}</p>
            ) : null}
          </div>
        </div>

        {business.beschrijving ? (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground line-clamp-3">
            {business.beschrijving}
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          {toegevoegd ? (
            <span className="inline-flex min-h-[2.25rem] items-center gap-1.5 text-sm font-medium text-foreground">
              <BadgeCheck className="h-4 w-4" /> In Mijn lijst
            </span>
          ) : kanBewerken ? (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onToevoegen()
              }}
            >
              + Mijn lijst
            </Button>
          ) : (
            <span />
          )}
          <span className="text-xs text-muted-foreground">Bekijken</span>
        </div>
      </CardContent>
    </Card>
  )
}
