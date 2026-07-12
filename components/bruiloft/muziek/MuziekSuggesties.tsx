'use client'

import * as React from 'react'
import { Check, Music, X } from 'lucide-react'

import { Button, Card, useToast } from '@/components/bruiloft/ui'
import { trackRegel } from '@/lib/bruiloft/muziek'
import type { MusicTrack } from '@/lib/bruiloft/types'
import { useBruiloftStore } from '@/store/bruiloftStore'

interface MuziekSuggestiesProps {
  suggesties: MusicTrack[]
  kanBewerken: boolean
}

// Het inbakje met verzoeknummers die gasten via de RSVP achterlieten. Het
// paar houdt vetorecht: "Toevoegen" zet het nummer bij Feest (verplaatsen kan
// daarna altijd), het kruisje wijst af. Rose = vraagt aandacht — dit is het
// enige blok op de pagina dat om een beslissing vraagt.
export function MuziekSuggesties({ suggesties, kanBewerken }: MuziekSuggestiesProps) {
  const approveMusicTrack = useBruiloftStore((s) => s.approveMusicTrack)
  const deleteMusicTrack = useBruiloftStore((s) => s.deleteMusicTrack)
  const { toast } = useToast()
  const [bezigId, setBezigId] = React.useState<string | null>(null)

  if (suggesties.length === 0) return null

  const neemAan = async (track: MusicTrack) => {
    setBezigId(track.id)
    try {
      await approveMusicTrack(track.id, 'feest')
      toast({
        title: 'Toegevoegd aan Feest',
        description: 'Verplaatsen naar een ander moment kan via het menu bij het nummer.',
        variant: 'success',
      })
    } catch {
      toast({ title: 'Toevoegen mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    } finally {
      setBezigId(null)
    }
  }

  const wijsAf = async (track: MusicTrack) => {
    setBezigId(track.id)
    try {
      await deleteMusicTrack(track.id)
    } catch {
      toast({ title: 'Afwijzen mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    } finally {
      setBezigId(null)
    }
  }

  return (
    <Card className="mb-8 border-rose-200 bg-rose-50/50 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
          <Music className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">
            {suggesties.length === 1
              ? 'Eén gast stelde een nummer voor'
              : `${suggesties.length} gasten stelden een nummer voor`}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {kanBewerken
              ? 'Jullie beslissen: toevoegen zet het nummer bij Feest, het kruisje wijst af.'
              : 'Alleen het bruidspaar (of wie mag bewerken) kan deze beoordelen.'}
          </p>

          <ul className="mt-3 divide-y divide-rose-200/70">
            {suggesties.map((track) => (
              <li key={track.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{trackRegel(track)}</p>
                  {track.gastNaam ? (
                    <p className="text-xs text-muted-foreground">verzoek van {track.gastNaam}</p>
                  ) : null}
                </div>
                {kanBewerken ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => neemAan(track)}
                      disabled={bezigId === track.id}
                    >
                      <Check className="h-4 w-4" /> Toevoegen
                    </Button>
                    <button
                      type="button"
                      onClick={() => wijsAf(track)}
                      disabled={bezigId === track.id}
                      className="rounded p-2 text-muted-foreground transition-colors hover:bg-rose-100 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                      aria-label={`Wijs "${track.titel}" af`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  )
}
