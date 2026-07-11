'use client'

import * as React from 'react'
import Link from 'next/link'
import { Copy, Music } from 'lucide-react'

import { Button, Modal, useToast } from '@/components/bruiloft/ui'
import { useBruiloftStore } from '@/store/bruiloftStore'

interface GastenWensenModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Wat gasten via de RSVP achterlieten: muziekwensen (verzoeknummers) en
// persoonlijke berichten. De muziekwensen zijn met één klik te kopiëren —
// klaar om aan de DJ te geven; is er nog geen DJ geboekt, dan wijst één
// rustige regel naar de leveranciersdirectory (de natuurlijke vervolgstap).
export function GastenWensenModal({ open, onOpenChange }: GastenWensenModalProps) {
  const guests = useBruiloftStore((s) => s.guests)
  const vendors = useBruiloftStore((s) => s.vendors)
  const { toast } = useToast()

  const metWens = guests.filter((g) => (g.verzoeknummer ?? '').trim().length > 0)
  const metBericht = guests.filter((g) => (g.rsvpBericht ?? '').trim().length > 0)
  const heeftDj = vendors.some((v) => v.type === 'dj of band' && v.status === 'geboekt')

  const kopieerWensen = async () => {
    const tekst = metWens
      .map((g) => `${g.verzoeknummer!.trim()} — verzoek van ${g.voornaam} ${g.achternaam}`.trim())
      .join('\n')
    try {
      await navigator.clipboard.writeText(tekst)
      toast({ title: 'Muziekwensen gekopieerd', description: 'Klaar om aan jullie DJ te sturen.', variant: 'success' })
    } catch {
      toast({ title: 'Kopiëren mislukt', description: 'Geef toegang tot het klembord en probeer opnieuw.', variant: 'error' })
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Van jullie gasten"
      description="Muziekwensen en berichten die gasten bij hun RSVP achterlieten."
      className="sm:max-w-lg"
    >
      {metWens.length === 0 && metBericht.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nog niets binnen. Zodra gasten via de RSVP een muziekwens of een
          bericht achterlaten, verschijnt dat hier vanzelf.
        </p>
      ) : (
        <div className="space-y-6 pb-2">
          {metWens.length > 0 ? (
            <section>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Muziekwensen ({metWens.length})
                </p>
                <Button variant="outline" size="sm" onClick={kopieerWensen}>
                  <Copy className="h-4 w-4" /> Kopieer alles
                </Button>
              </div>
              <ul className="mt-2 divide-y divide-border">
                {metWens.map((g) => (
                  <li key={g.id} className="py-2.5">
                    <p className="flex items-start gap-2 text-sm text-foreground">
                      <Music className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0">
                        {g.verzoeknummer}
                        <span className="text-muted-foreground"> — {g.voornaam} {g.achternaam}</span>
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
              {!heeftDj ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Nog geen DJ of band geboekt?{' '}
                  <Link
                    href="/bruiloft/ontdekken"
                    className="font-medium text-rose-700 underline-offset-2 hover:underline"
                    onClick={() => onOpenChange(false)}
                  >
                    Ontdek leveranciers
                  </Link>{' '}
                  en deel deze lijst bij je offerteaanvraag.
                </p>
              ) : null}
            </section>
          ) : null}

          {metBericht.length > 0 ? (
            <section>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Berichten ({metBericht.length})
              </p>
              <ul className="mt-2 space-y-3">
                {metBericht.map((g) => (
                  <li key={g.id} className="rounded-lg bg-muted/50 p-3">
                    <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                      {g.rsvpBericht}
                    </p>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      — {g.voornaam} {g.achternaam}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </Modal>
  )
}
