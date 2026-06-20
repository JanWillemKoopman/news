'use client'

import * as React from 'react'
import Link from 'next/link'
import { BadgeCheck, Globe, Mail, Phone, Plus, Sparkles } from 'lucide-react'

import { Button, Modal, Money } from '@/components/bruiloft/ui'
import { cn } from '@/lib/utils'
import { BADGE_STIJL } from '@/lib/bruiloft/suppliers/linked'
import type { MatchBadge, SupplierMatch } from '@/lib/bruiloft/suppliers/match'

// Uitleg in mensentaal bij elke matchbadge ("Waarom dit past").
const BADGE_UITLEG: Record<MatchBadge, string> = {
  'binnen budget': 'De vanafprijs past binnen jullie richtbudget voor deze categorie.',
  'net erboven': 'De vanafprijs ligt net boven jullie richtbudget voor deze categorie.',
  'in jullie plaats': 'Gevestigd in jullie woonplaats.',
  'in jullie regio': 'Gevestigd in jullie provincie.',
  'past bij gezelschap': 'De capaciteit past bij jullie gastenaantal.',
  'boek dit binnenkort': 'Dit is een goed moment om deze te boeken gezien jullie trouwdatum.',
}

function websiteHref(website: string): string {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`
}

interface SupplierDetailModalProps {
  match: SupplierMatch | null
  onOpenChange: (open: boolean) => void
  kanBewerken: boolean
  toegevoegd: boolean
  onToevoegen: () => void
}

// Volledige leveranciersinformatie in een dialog (desktop) / bottom sheet
// (mobiel). De kaarten blijven hierdoor compact.
export function SupplierDetailModal({
  match,
  onOpenChange,
  kanBewerken,
  toegevoegd,
  onToevoegen,
}: SupplierDetailModalProps) {
  if (!match) return null
  const s = match.supplier

  const feiten: { label: string; waarde: React.ReactNode }[] = []
  if (s.plaats) feiten.push({ label: 'Locatie', waarde: `${s.plaats}${s.provincie ? `, ${s.provincie}` : ''}` })
  if (s.capaciteitMax > 0) {
    feiten.push({
      label: 'Capaciteit',
      waarde: s.capaciteitMin > 0 ? `${s.capaciteitMin}–${s.capaciteitMax} gasten` : `tot ${s.capaciteitMax} gasten`,
    })
  }
  if (s.categorie === 'locatie') {
    feiten.push({ label: 'Buiten trouwen', waarde: s.buitenTrouwen ? 'Ja' : 'Nee' })
    feiten.push({ label: 'Overnachten', waarde: s.overnachtingMogelijk ? 'Mogelijk' : 'Nee' })
  }
  feiten.push({
    label: 'Prijsindicatie',
    waarde:
      s.isPrijsOpAanvraag || s.prijsVanaf == null ? (
        s.prijsIndicatieTekst || 'Op aanvraag'
      ) : (
        <>
          vanaf <Money bedrag={s.prijsVanaf} />
          {s.prijsTot != null ? <> tot <Money bedrag={s.prijsTot} /></> : null}
        </>
      ),
  })

  return (
    <Modal
      open
      onOpenChange={onOpenChange}
      title={s.naam}
      description={[s.type || s.categorie, s.plaats].filter(Boolean).join(' · ')}
      className="sm:max-w-2xl"
    >
      <div className="space-y-5 pb-2">
        {match.badges.length > 0 && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Sparkles className="h-4 w-4 text-primary" /> Waarom dit bij jullie past
              {match.score > 0 ? (
                <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {match.score}% match
                </span>
              ) : null}
            </p>
            <ul className="mt-2 space-y-1.5">
              {match.badges.map((b) => (
                <li key={b} className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', BADGE_STIJL[b])}>{b}</span>
                  {BADGE_UITLEG[b]}
                </li>
              ))}
            </ul>
          </div>
        )}

        {s.omschrijvingKort ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{s.omschrijvingKort}</p>
        ) : null}

        {s.aiContextTekst && s.aiContextTekst !== s.omschrijvingKort ? (
          <p className="rounded-lg bg-muted/50 p-3 text-sm leading-relaxed text-muted-foreground">
            {s.aiContextTekst}
          </p>
        ) : null}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          {feiten.map((f) => (
            <div key={f.label}>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">{f.label}</dt>
              <dd className="mt-0.5 text-sm text-foreground">{f.waarde}</dd>
            </div>
          ))}
        </dl>

        {s.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {s.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-foreground/[0.06] px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {(s.website || s.email || s.telefoon) && (
          <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-4 text-sm">
            {s.website ? (
              <a
                href={websiteHref(s.website)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-primary hover:underline"
              >
                <Globe className="h-4 w-4" /> Website
              </a>
            ) : null}
            {s.email ? (
              <a href={`mailto:${s.email}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                <Mail className="h-4 w-4" /> E-mail
              </a>
            ) : null}
            {s.telefoon ? (
              <a href={`tel:${s.telefoon}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                <Phone className="h-4 w-4" /> {s.telefoon}
              </a>
            ) : null}
          </div>
        )}

        <div className="border-t border-border pt-4">
          {toegevoegd ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <BadgeCheck className="h-4 w-4" /> Staat in jullie lijst
              </span>
              <Button asChild variant="outline" size="sm">
                <Link href="/bruiloft/leveranciers">Bekijk in mijn lijst</Link>
              </Button>
            </div>
          ) : kanBewerken ? (
            <Button className="w-full" onClick={onToevoegen}>
              <Plus className="h-4 w-4" /> Toevoegen aan mijn lijst
            </Button>
          ) : null}
        </div>
      </div>
    </Modal>
  )
}
