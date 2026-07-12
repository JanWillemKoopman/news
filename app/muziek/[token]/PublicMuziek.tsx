'use client'

import * as React from 'react'
import { Check, Copy, ExternalLink, Printer } from 'lucide-react'

import { formatDatumNL } from '@/lib/bruiloft/format'
import {
  MUZIEK_MOMENTEN,
  groepeerPerMoment,
  muziekAlsTekst,
  spotifyZoekUrl,
} from '@/lib/bruiloft/muziek'
import type { PublicMuziekData, PublicMuziekTrack } from '@/lib/bruiloft/types'

// Alleen-lezen weergave van de muzieklijst voor de ontvanger van de deel-link
// (DJ of band). Eén taak: de lijst lezen. Printen en als tekst kopiëren zijn
// de enige twee knoppen — DJ's plakken de lijst graag in hun eigen
// voorbereiding; bij printen verdwijnen ze (print:hidden) zodat er een schoon
// A4-overzicht overblijft.
export function PublicMuziek({ data }: { data: PublicMuziekData }) {
  const [copied, setCopied] = React.useState(false)

  const groepen = React.useMemo(() => groepeerPerMoment(data.tracks), [data.tracks])

  const namen = [data.partner1Naam, data.partner2Naam].filter(Boolean).join(' & ')
  const onderschrift = data.trouwdatum ? formatDatumNL(data.trouwdatum) : ''

  const kopieer = async () => {
    try {
      await navigator.clipboard.writeText(muziekAlsTekst(data.tracks))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Klembord geweigerd: geen toast-infra op deze kale pagina; de knop
      // blijft gewoon opnieuw te proberen.
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-4 py-10 print:max-w-none print:px-0 print:py-0">
        {/* Kop: wiens lijst is dit — leesbaar voor iemand die alleen de link kreeg. */}
        <header className="text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Muzieklijst</p>
          <h1 className="mt-1 text-3xl font-medium">{namen || 'Onze bruiloft'}</h1>
          {onderschrift ? (
            <p className="mt-1 text-sm text-muted-foreground">{onderschrift}</p>
          ) : null}
        </header>

        {/* Bediening: kopiëren + printen. Verdwijnt op papier. */}
        {data.tracks.length > 0 ? (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 print:hidden">
            <button
              type="button"
              onClick={kopieer}
              className="inline-flex items-center gap-1.5 rounded-full border border-input bg-background px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Gekopieerd' : 'Kopieer als tekst'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-full border border-input bg-background px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Printer className="h-4 w-4" /> Printen
            </button>
          </div>
        ) : null}

        {/* De lijst zelf, per moment van de dag. */}
        {data.tracks.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            De muzieklijst is nog leeg — vraag het bruidspaar om nummers toe te voegen.
          </p>
        ) : (
          <div className="mt-8 space-y-8">
            {MUZIEK_MOMENTEN.map((def) => {
              const tracks = groepen.get(def.value) ?? []
              if (tracks.length === 0) return null
              return (
                <section key={def.value} aria-label={def.label} className="break-inside-avoid">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {def.label}
                    <span className="ml-1.5 font-normal normal-case tracking-normal">
                      ({tracks.length})
                    </span>
                  </h2>
                  {def.value === 'niet_draaien' ? (
                    <p className="mt-0.5 text-xs text-muted-foreground print:block">
                      Deze nummers graag overslaan — ook als een gast erom vraagt.
                    </p>
                  ) : null}
                  <ol className="mt-2 divide-y divide-border rounded-xl border border-border bg-card shadow-sm print:rounded-none print:border-0 print:shadow-none">
                    {tracks.map((track) => (
                      <PubliekeTrack key={track.id} track={track} />
                    ))}
                  </ol>
                </section>
              )
            })}
          </div>
        )}

        {/* Bescheiden herkomstregel — ook op papier, zodat de ontvanger weet
            waar deze lijst vandaan komt (en de app leert kennen). */}
        <footer className="mt-10 pb-10 text-center text-xs text-muted-foreground">
          Deze muzieklijst is gemaakt met{' '}
          <a href="/" className="font-medium text-foreground hover:underline">
            Ons Trouwplan
          </a>
          {' '}— zelf jullie bruiloft plannen is gratis.
        </footer>
      </div>
    </main>
  )
}

function PubliekeTrack({ track }: { track: PublicMuziekTrack }) {
  const details = [
    track.opmerking,
    track.bron === 'gast' && track.gastNaam ? `verzoek van ${track.gastNaam}` : '',
  ].filter(Boolean)

  // Zonder eigen link is de Spotify-zoeklink een prima vangnet om het nummer
  // snel terug te vinden; alleen op scherm, niet op papier.
  const link = track.url || spotifyZoekUrl(track.titel, track.artiest)

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {track.titel}
          {track.artiest ? (
            <span className="font-normal text-muted-foreground"> — {track.artiest}</span>
          ) : null}
        </p>
        {details.length > 0 ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{details.join(' · ')}</p>
        ) : null}
      </div>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 rounded p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring print:hidden"
        aria-label={`Open ${track.titel}${track.url ? '' : ' op Spotify'}`}
      >
        <ExternalLink className="h-4 w-4" />
      </a>
    </li>
  )
}
