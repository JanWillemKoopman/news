'use client'

import * as React from 'react'
import { ExternalLink } from 'lucide-react'

import { Button, Field, Input, Modal, Select, Textarea, useToast } from '@/components/bruiloft/ui'
import { MUZIEK_MOMENTEN, spotifyZoekUrl } from '@/lib/bruiloft/muziek'
import type { MusicTrack, MusicTrackInput, MuziekMoment } from '@/lib/bruiloft/types'
import { useBruiloftStore } from '@/store/bruiloftStore'

interface MuziekNummerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Bestaand nummer = bewerken; null = nieuw nummer toevoegen.
  track: MusicTrack | null
  // Bij toevoegen vanuit een sectie start het moment-veld op die sectie.
  standaardMoment: MuziekMoment
}

// Eén formulier voor toevoegen én bewerken van een nummer. Titel is het enige
// verplichte veld — een nummer noteren moet net zo snel gaan als het in je
// hoofd opkomt; artiest, opmerking en link zijn er voor wie preciezer wil zijn.
export function MuziekNummerModal({ open, onOpenChange, track, standaardMoment }: MuziekNummerModalProps) {
  const addMusicTrack = useBruiloftStore((s) => s.addMusicTrack)
  const updateMusicTrack = useBruiloftStore((s) => s.updateMusicTrack)
  const { toast } = useToast()

  const [titel, setTitel] = React.useState('')
  const [artiest, setArtiest] = React.useState('')
  const [moment, setMoment] = React.useState<MuziekMoment>(standaardMoment)
  const [opmerking, setOpmerking] = React.useState('')
  const [url, setUrl] = React.useState('')
  const [bezig, setBezig] = React.useState(false)

  // Velden verversen bij elke keer openen: prefill bij bewerken, schoon (met
  // het aangeklikte moment) bij toevoegen.
  React.useEffect(() => {
    if (!open) return
    setTitel(track?.titel ?? '')
    setArtiest(track?.artiest ?? '')
    setMoment(track?.moment ?? standaardMoment)
    setOpmerking(track?.opmerking ?? '')
    setUrl(track?.url ?? '')
  }, [open, track, standaardMoment])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const schoneTitel = titel.trim()
    if (!schoneTitel) return
    setBezig(true)
    const input: MusicTrackInput = {
      titel: schoneTitel,
      artiest: artiest.trim(),
      moment,
      opmerking: opmerking.trim(),
      url: url.trim(),
    }
    try {
      if (track) await updateMusicTrack(track.id, input)
      else await addMusicTrack(input)
      onOpenChange(false)
    } catch {
      toast({ title: 'Opslaan mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    } finally {
      setBezig(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={track ? 'Nummer bewerken' : 'Nummer toevoegen'}
      className="sm:max-w-md"
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Titel" htmlFor="muziek-titel" required>
          <Input
            id="muziek-titel"
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            placeholder="Bijv. Perfect"
            maxLength={200}
            required
          />
        </Field>

        <Field label="Artiest" htmlFor="muziek-artiest">
          <Input
            id="muziek-artiest"
            value={artiest}
            onChange={(e) => setArtiest(e.target.value)}
            placeholder="Bijv. Ed Sheeran"
            maxLength={200}
          />
        </Field>

        <Field label="Moment" htmlFor="muziek-moment">
          <Select
            id="muziek-moment"
            value={moment}
            onChange={(e) => setMoment(e.target.value as MuziekMoment)}
          >
            {MUZIEK_MOMENTEN.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Opmerking voor de DJ" htmlFor="muziek-opmerking">
          <Textarea
            id="muziek-opmerking"
            value={opmerking}
            onChange={(e) => setOpmerking(e.target.value)}
            placeholder="Bijv. onze openingsdans, of: alleen de akoestische versie"
            rows={2}
            maxLength={500}
          />
        </Field>

        <Field label="Link (optioneel)" htmlFor="muziek-url">
          <Input
            id="muziek-url"
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Spotify- of YouTube-link"
            maxLength={500}
          />
        </Field>

        {titel.trim() ? (
          // Handigheidje zonder API-koppeling: zoek het nummer op Spotify om
          // de juiste titel/versie te checken en de link te kopiëren.
          <a
            href={spotifyZoekUrl(titel.trim(), artiest.trim())}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-rose-700 underline-offset-2 hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            Zoek dit nummer op Spotify
          </a>
        ) : null}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button type="submit" loading={bezig} disabled={!titel.trim()}>
            {track ? 'Opslaan' : 'Toevoegen'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
