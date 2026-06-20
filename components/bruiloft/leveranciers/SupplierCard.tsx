'use client'

import * as React from 'react'
import { BadgeCheck, Plus } from 'lucide-react'

import { Button, Card, CardContent, Money } from '@/components/bruiloft/ui'
import { capFirst, cn } from '@/lib/utils'
import { BADGE_STIJL } from '@/lib/bruiloft/suppliers/linked'
import type { SupplierMatch } from '@/lib/bruiloft/suppliers/match'
import { CATEGORIE_ICOON } from './categorieIcoon'

interface SupplierCardProps {
  match: SupplierMatch
  kanBewerken: boolean
  toegevoegd: boolean
  onToevoegen: () => void
  onOpen: () => void
}

// Compacte directory-kaart: identiteit, match en prijs. Alle verdere details
// (omschrijving, contact, kenmerken) zitten in de detailweergave.
export function SupplierCard({
  match,
  kanBewerken,
  toegevoegd,
  onToevoegen,
  onOpen,
}: SupplierCardProps) {
  const s = match.supplier
  const Icoon = CATEGORIE_ICOON[s.categorie]
  const subregel = [capFirst(s.type || s.categorie), s.plaats].filter(Boolean).join(' · ')

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
      className="flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CardContent className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icoon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground">{s.naam}</p>
            <p className="truncate text-xs text-muted-foreground">{subregel}</p>
          </div>
          {match.score > 0 && (
            <span
              className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"
              title={match.uitleg}
            >
              {match.score}%
            </span>
          )}
        </div>

        {match.badges.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {match.badges.slice(0, 2).map((b) => (
              <span key={b} className={cn('rounded-full px-2 py-0.5 text-xs font-medium', BADGE_STIJL[b])}>
                {b}
              </span>
            ))}
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
            <span className="inline-flex min-h-[2.25rem] items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <BadgeCheck className="h-4 w-4" /> In jullie lijst
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
              <Plus className="h-4 w-4" /> Toevoegen
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
