'use client'

import * as React from 'react'
import { BadgeCheck, Star } from 'lucide-react'

import { SafeImage } from './SafeImage'
import { Button, Card, CardContent, Money } from '@/components/bruiloft/ui'
import { capFirst } from '@/lib/utils'
import type { SupplierMatch } from '@/lib/bruiloft/suppliers/match'
import { getCategorieIcoon } from './categorieIcoon'

interface SupplierCardProps {
  match: SupplierMatch
  kanBewerken: boolean
  toegevoegd: boolean
  onToevoegen: () => void
  onOpen: () => void
}

export function SupplierCard({
  match,
  kanBewerken,
  toegevoegd,
  onToevoegen,
  onOpen,
}: SupplierCardProps) {
  const s = match.supplier
  const Icoon = getCategorieIcoon(s.categorie)
  const subregel = [capFirst(s.type || s.categorie), s.plaats].filter(Boolean).join(' · ')
  const heeftFoto = Boolean(s.afbeeldingUrl)
  const heeftRating = s.ratingGemiddeld != null && s.ratingGemiddeld > 0

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`Bekijk ${s.naam}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      interactive
      className="flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring overflow-hidden"
    >
      {heeftFoto && (
        <div className="relative h-40 w-full shrink-0 bg-muted">
          <SafeImage
            src={s.afbeeldingUrl}
            alt={s.naam}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      )}

      <CardContent className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          {!heeftFoto && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icoon className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground">{s.naam}</p>
            <p className="truncate text-xs text-muted-foreground">{subregel}</p>
          </div>
        </div>

        {heeftRating && (
          <div className="mt-2 flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-medium text-foreground">
              {s.ratingGemiddeld!.toFixed(1)}
            </span>
            {s.ratingAantal != null && (
              <span className="text-xs text-muted-foreground">({s.ratingAantal})</span>
            )}
          </div>
        )}

        <p className="mt-3 text-sm">
          {s.isPrijsOpAanvraag || s.prijsVanaf == null ? (
            <span className="text-muted-foreground">{s.prijsIndicatieTekst || 'Prijs op aanvraag'}</span>
          ) : (
            <span className="text-muted-foreground">
              vanaf <span className="font-semibold text-foreground"><Money bedrag={s.prijsVanaf} /></span>
            </span>
          )}
        </p>

        <div className="mt-auto pt-4">
          {toegevoegd ? (
            <span className="inline-flex min-h-[2.25rem] items-center gap-1.5 text-sm font-medium text-foreground">
              <BadgeCheck className="h-4 w-4" /> Staat in Mijn lijst
            </span>
          ) : kanBewerken ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation()
                onToevoegen()
              }}
            >
              Mijn lijst
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
