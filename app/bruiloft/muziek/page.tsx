'use client'

import * as React from 'react'
import { ExternalLink, Music, Pencil, Plus, Share2, Trash2 } from 'lucide-react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { PageInfoButton } from '@/components/bruiloft/PageInfoButton'
import { muziekInfo } from '@/components/bruiloft/faqContent'
import { MuziekDeelModal } from '@/components/bruiloft/muziek/MuziekDeelModal'
import { MuziekNummerModal } from '@/components/bruiloft/muziek/MuziekNummerModal'
import { MuziekSuggesties } from '@/components/bruiloft/muziek/MuziekSuggesties'
import { Button, EmptyState, OverflowMenu, useToast } from '@/components/bruiloft/ui'
import { MUZIEK_MOMENTEN, trackRegel, type MuziekMomentDef } from '@/lib/bruiloft/muziek'
import { canEdit } from '@/lib/bruiloft/permissions'
import type { MusicTrack, MuziekMoment } from '@/lib/bruiloft/types'
import { useBruiloftStore } from '@/store/bruiloftStore'

export default function MuziekPage() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const musicTracks = useBruiloftStore((s) => s.musicTracks)
  const muziekShare = useBruiloftStore((s) => s.muziekShare)
  const permissions = useBruiloftStore((s) => s.permissions)
  const kanBewerken = canEdit(permissions, 'muziek')

  const [nummerOpen, setNummerOpen] = React.useState(false)
  const [bewerkTrack, setBewerkTrack] = React.useState<MusicTrack | null>(null)
  const [standaardMoment, setStandaardMoment] = React.useState<MuziekMoment>('feest')
  const [deelOpen, setDeelOpen] = React.useState(false)

  if (!wedding) return null

  // Nog niet beoordeelde gastsuggesties bovenaan (vraagt om een beslissing);
  // de lijst zelf toont alleen goedgekeurde nummers.
  const suggesties = musicTracks.filter((t) => t.status === 'voorgesteld')
  const goedgekeurd = musicTracks.filter((t) => t.status === 'goedgekeurd')

  const openToevoegen = (moment: MuziekMoment = 'feest') => {
    setBewerkTrack(null)
    setStandaardMoment(moment)
    setNummerOpen(true)
  }

  const openBewerken = (track: MusicTrack) => {
    setBewerkTrack(track)
    setStandaardMoment(track.moment)
    setNummerOpen(true)
  }

  return (
    <div className="mx-auto max-w-3xl pb-24">
      <PageHeader
        titel="Muziek"
        info={<PageInfoButton {...muziekInfo} />}
        primaryActie={
          kanBewerken ? (
            <Button onClick={() => openToevoegen()}>
              <Plus className="h-4 w-4" /> Nummer toevoegen
            </Button>
          ) : undefined
        }
        secundaireActie={
          kanBewerken ? (
            <Button variant="outline" onClick={() => setDeelOpen(true)}>
              <Share2 className="h-4 w-4" /> {muziekShare ? 'Gedeeld met DJ' : 'Delen met DJ'}
            </Button>
          ) : undefined
        }
        meerActies={
          kanBewerken
            ? [{ label: muziekShare ? 'Gedeeld met DJ' : 'Delen met DJ', icon: Share2, onClick: () => setDeelOpen(true) }]
            : undefined
        }
        fab={kanBewerken ? { label: 'Nummer toevoegen', onClick: () => openToevoegen() } : undefined}
      />

      <MuziekSuggesties suggesties={suggesties} kanBewerken={kanBewerken} />

      {goedgekeurd.length === 0 && suggesties.length === 0 ? (
        <EmptyState
          icon={Music}
          titel="Nog geen muziek verzameld"
          beschrijving={
            kanBewerken
              ? 'Verzamel hier de nummers voor de ceremonie, borrel, diner en het feest. Gasten die de RSVP invullen kunnen ook nummers aandragen — die verschijnen hier vanzelf.'
              : 'Er staan nog geen nummers in de muzieklijst.'
          }
          actie={
            kanBewerken ? (
              <Button onClick={() => openToevoegen()}>
                <Plus className="h-4 w-4" /> Nummer toevoegen
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-8">
          {MUZIEK_MOMENTEN.map((momentDef) => (
            <MomentSectie
              key={momentDef.value}
              def={momentDef}
              tracks={goedgekeurd.filter((t) => t.moment === momentDef.value)}
              kanBewerken={kanBewerken}
              onToevoegen={() => openToevoegen(momentDef.value)}
              onBewerken={openBewerken}
            />
          ))}
        </div>
      )}

      <MuziekNummerModal
        open={nummerOpen}
        onOpenChange={setNummerOpen}
        track={bewerkTrack}
        standaardMoment={standaardMoment}
      />

      <MuziekDeelModal open={deelOpen} onOpenChange={setDeelOpen} />
    </div>
  )
}

function MomentSectie({
  def,
  tracks,
  kanBewerken,
  onToevoegen,
  onBewerken,
}: {
  def: MuziekMomentDef
  tracks: MusicTrack[]
  kanBewerken: boolean
  onToevoegen: () => void
  onBewerken: (track: MusicTrack) => void
}) {
  return (
    <section aria-label={def.label}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {def.label}
          {tracks.length > 0 ? (
            <span className="ml-1.5 font-normal normal-case tracking-normal">({tracks.length})</span>
          ) : null}
        </h2>
        {kanBewerken ? (
          <Button variant="ghost" size="sm" onClick={onToevoegen} aria-label={`Nummer toevoegen aan ${def.label}`}>
            <Plus className="h-4 w-4" /> Toevoegen
          </Button>
        ) : null}
      </div>

      {tracks.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">{def.hint}</p>
      ) : (
        <ul className="mt-2 divide-y divide-border rounded-xl border border-border bg-card shadow-sm">
          {tracks.map((track) => (
            <TrackRij key={track.id} track={track} kanBewerken={kanBewerken} onBewerken={onBewerken} />
          ))}
        </ul>
      )}
    </section>
  )
}

function TrackRij({
  track,
  kanBewerken,
  onBewerken,
}: {
  track: MusicTrack
  kanBewerken: boolean
  onBewerken: (track: MusicTrack) => void
}) {
  const deleteMusicTrack = useBruiloftStore((s) => s.deleteMusicTrack)
  const { toast } = useToast()

  // Wat er extra over dit nummer te vertellen is, in één rustige regel —
  // geen badges (zie DESIGN_PHILOSOPHY).
  const details = [
    track.opmerking,
    track.bron === 'gast' && track.gastNaam ? `verzoek van ${track.gastNaam}` : '',
  ].filter(Boolean)

  const verwijder = async () => {
    try {
      await deleteMusicTrack(track.id)
    } catch {
      toast({ title: 'Verwijderen mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    }
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {track.titel}
          {track.artiest ? (
            <span className="font-normal text-muted-foreground"> — {track.artiest}</span>
          ) : null}
        </p>
        {details.length > 0 ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{details.join(' · ')}</p>
        ) : null}
      </div>
      {track.url ? (
        <a
          href={track.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Open link van ${trackRegel(track)}`}
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      ) : null}
      {kanBewerken ? (
        <OverflowMenu
          label={`Acties voor ${track.titel}`}
          items={[
            { label: 'Bewerken', icon: Pencil, onClick: () => onBewerken(track) },
            { label: 'Verwijderen', icon: Trash2, danger: true, onClick: verwijder },
          ]}
        />
      ) : null}
    </li>
  )
}
