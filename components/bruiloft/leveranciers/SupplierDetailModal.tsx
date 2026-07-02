'use client'

import * as React from 'react'
import Link from 'next/link'
import { BadgeCheck, Globe, Mail, MessageCircle, Phone, Sparkles } from 'lucide-react'

import { LeverancierBerichtModal } from './LeverancierBerichtModal'
import { Button, Modal, Money } from '@/components/bruiloft/ui'
import type { SupplierMatch } from '@/lib/bruiloft/suppliers/match'
import type { VendorContactType } from '@/lib/bruiloft/types'

function websiteHref(website: string): string {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`
}

interface SupplierDetailModalProps {
  match: SupplierMatch | null
  onOpenChange: (open: boolean) => void
  kanBewerken: boolean
  toegevoegd: boolean
  onToevoegen: () => void
  // Eén zin AI-uitleg — alleen aanwezig als deze leverancier via de
  // "AI aanbevolen voor jullie"-sectie geopend is. Geen synthetische score of
  // badge-lijst meer (zie DESIGN_PHILOSOPHY.md: zinnen boven badges).
  aiReden?: string
}

export function SupplierDetailModal({
  match,
  onOpenChange,
  kanBewerken,
  toegevoegd,
  onToevoegen,
  aiReden,
}: SupplierDetailModalProps) {
  const [berichtType, setBerichtType] = React.useState<VendorContactType | null>(null)

  if (!match) return null
  const s = match.supplier
  const heeftEmail = Boolean(s.email)
  const vendorSnapshot = {
    businessId: s.id,
    naam: s.naam,
    type: s.categorie,
    email: s.email,
    telefoon: s.telefoon,
    website: s.website,
  }

  const feiten: { label: string; waarde: React.ReactNode }[] = []
  if (s.plaats) feiten.push({ label: 'Locatie', waarde: `${s.plaats}${s.provincie ? `, ${s.provincie}` : ''}` })
  if (s.capaciteitMax > 0) {
    feiten.push({
      label: 'Capaciteit',
      waarde: s.capaciteitMin > 0 ? `${s.capaciteitMin}–${s.capaciteitMax} gasten` : `tot ${s.capaciteitMax} gasten`,
    })
  }
  if (s.prijsVanaf != null || s.prijsIndicatieTekst) {
    feiten.push({
      label: 'Prijsindicatie',
      waarde:
        s.prijsVanaf == null ? (
          s.prijsIndicatieTekst
        ) : (
          <>
            vanaf <Money bedrag={s.prijsVanaf} />
            {s.prijsTot != null ? <> tot <Money bedrag={s.prijsTot} /></> : null}
          </>
        ),
    })
  }

  return (
    <Modal
      open
      onOpenChange={onOpenChange}
      title={s.naam}
      description={[s.type || s.categorie, s.plaats].filter(Boolean).join(' · ')}
      className="sm:max-w-2xl"
    >
      <div className="space-y-5 pb-2">
        {aiReden ? (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="flex items-start gap-2 text-sm text-foreground">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{aiReden}</span>
            </p>
          </div>
        ) : null}

        {s.omschrijvingKort ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{s.omschrijvingKort}</p>
        ) : null}

        {s.aiContextTekst && s.aiContextTekst !== s.omschrijvingKort ? (
          <p className="whitespace-pre-line rounded-lg bg-muted/50 p-3 text-sm leading-relaxed text-muted-foreground">
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

        {kanBewerken ? (
          <div className="space-y-3 border-t border-border pt-4">
            {toegevoegd ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <BadgeCheck className="h-4 w-4" /> Staat in Mijn lijst
                </span>
                <Button asChild variant="outline" size="sm">
                  <Link href="/bruiloft/leveranciers">Bekijk in mijn lijst</Link>
                </Button>
              </div>
            ) : (
              <Button className="w-full" onClick={onToevoegen}>
                Mijn lijst
              </Button>
            )}

            {heeftEmail ? (
              <div className="flex gap-3">
                <Button className="flex-1" onClick={() => setBerichtType('offerte')}>
                  Offerte
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setBerichtType('contact')}>
                  <MessageCircle className="h-4 w-4" /> Contact
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Geen e-mailadres bekend — bekijk de website of bel voor meer info.
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
          vendor={vendorSnapshot}
          onSent={() => setBerichtType(null)}
        />
      ) : null}
    </Modal>
  )
}
