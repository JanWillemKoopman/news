'use client'

import { CalendarHeart, Heart, MapPin } from 'lucide-react'
import * as React from 'react'

import { Button, Card, CardContent, Field, Input } from '@/components/bruiloft/ui'
import { formatDatumNL } from '@/lib/bruiloft/format'
import type { RsvpStatus } from '@/lib/bruiloft/types'
import { createClient } from '@/lib/supabase/client'

export interface PublicWeddingData {
  wedding: {
    partner1Naam: string
    partner2Naam: string
    trouwdatum: string | null
    locatie: string
  }
  content: {
    welkomsttekst: string
    dresscode: string
    cadeaulijst: string
    hotels: string
    routebeschrijving: string
    contact: string
  } | null
  schedule: { tijd: string; titel: string; omschrijving: string; locatie: string }[]
  guest: {
    voornaam: string
    achternaam: string
    rsvpStatus: RsvpStatus
    dieetwensen: string
    heeftPartner: boolean
    partnerNaam: string
    aantalKinderen: number
    rsvpSubmittedAt: string | null
  }
}

export function PublicRsvp({ token, data }: { token: string; data: PublicWeddingData }) {
  const { wedding, content, schedule } = data
  return (
    <div className="mx-auto max-w-2xl px-4 pb-20">
      <header className="py-12 text-center md:py-16">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Heart className="h-7 w-7" />
        </div>
        <h1 className="font-serif text-4xl text-foreground md:text-5xl">
          {wedding.partner1Naam} <span className="text-primary">&amp;</span> {wedding.partner2Naam}
        </h1>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-muted-foreground">
          {wedding.trouwdatum ? (
            <span className="inline-flex items-center gap-1.5">
              <CalendarHeart className="h-4 w-4" /> {formatDatumNL(wedding.trouwdatum)}
            </span>
          ) : null}
          {wedding.locatie ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" /> {wedding.locatie}
            </span>
          ) : null}
        </div>
      </header>

      {content?.welkomsttekst ? (
        <p className="mb-8 whitespace-pre-line text-center text-lg text-foreground">
          {content.welkomsttekst}
        </p>
      ) : null}

      <RsvpForm token={token} guest={data.guest} />

      {schedule.length > 0 ? (
        <Sectie titel="Programma">
          <ul className="space-y-2">
            {schedule.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-14 shrink-0 font-serif font-semibold tabular-nums text-primary">
                  {s.tijd}
                </span>
                <span className="text-foreground">
                  {s.titel}
                  {s.locatie ? <span className="text-muted-foreground"> · {s.locatie}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </Sectie>
      ) : null}

      {content?.dresscode ? <Sectie titel="Dresscode">{content.dresscode}</Sectie> : null}
      {content?.cadeaulijst ? <Sectie titel="Cadeaulijst">{content.cadeaulijst}</Sectie> : null}
      {content?.hotels ? <Sectie titel="Overnachten">{content.hotels}</Sectie> : null}
      {content?.routebeschrijving ? <Sectie titel="Route">{content.routebeschrijving}</Sectie> : null}
      {content?.contact ? <Sectie titel="Contact">{content.contact}</Sectie> : null}
    </div>
  )
}

function Sectie({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <Card>
        <CardContent className="p-6">
          <h2 className="mb-2 font-serif text-xl text-foreground">{titel}</h2>
          <div className="whitespace-pre-line text-muted-foreground">{children}</div>
        </CardContent>
      </Card>
    </section>
  )
}

function RsvpForm({ token, guest }: { token: string; guest: PublicWeddingData['guest'] }) {
  const supabase = React.useMemo(() => createClient(), [])
  const [status, setStatus] = React.useState<RsvpStatus>(guest.rsvpStatus)
  const [dieet, setDieet] = React.useState(guest.dieetwensen)
  const [heeftPartner, setHeeftPartner] = React.useState(guest.heeftPartner)
  const [partnerNaam, setPartnerNaam] = React.useState(guest.partnerNaam)
  const [kinderen, setKinderen] = React.useState(guest.aantalKinderen)
  const [saving, setSaving] = React.useState(false)
  const [opgeslagen, setOpgeslagen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const komt = status === 'bevestigd'
  const gekozen = status === 'bevestigd' || status === 'afgemeld'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setOpgeslagen(false)
    const { error } = await supabase.rpc('submit_rsvp', {
      p_token: token,
      p_payload: {
        rsvpStatus: status,
        dieetwensen: dieet,
        heeftPartner,
        partnerNaam: heeftPartner ? partnerNaam : '',
        aantalKinderen: Number(kinderen) || 0,
      },
    })
    setSaving(false)
    if (error) {
      setError('Er ging iets mis bij het opslaan. Probeer het later opnieuw.')
      return
    }
    setOpgeslagen(true)
  }

  return (
    <section className="mb-6">
      <Card>
        <CardContent className="p-6">
          <h2 className="font-serif text-xl text-foreground">Hoi {guest.voornaam}, ben je erbij?</h2>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">Laat het ons weten.</p>

          <form onSubmit={submit} className="space-y-4">
            <div className="flex gap-3">
              <Button
                type="button"
                variant={status === 'bevestigd' ? 'default' : 'outline'}
                onClick={() => setStatus('bevestigd')}
                className="flex-1"
              >
                Ik ben erbij
              </Button>
              <Button
                type="button"
                variant={status === 'afgemeld' ? 'default' : 'outline'}
                onClick={() => setStatus('afgemeld')}
                className="flex-1"
              >
                Helaas niet
              </Button>
            </div>

            {komt ? (
              <>
                <Field label="Dieetwensen" htmlFor="dieet">
                  <Input
                    id="dieet"
                    value={dieet}
                    onChange={(e) => setDieet(e.target.value)}
                    placeholder="Bijv. vegetarisch"
                  />
                </Field>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={heeftPartner}
                    onChange={(e) => setHeeftPartner(e.target.checked)}
                    className="h-4 w-4 accent-[hsl(var(--primary))]"
                  />
                  Ik neem een partner mee
                </label>
                {heeftPartner ? (
                  <Input
                    placeholder="Naam van je partner"
                    value={partnerNaam}
                    onChange={(e) => setPartnerNaam(e.target.value)}
                  />
                ) : null}
                <Field label="Aantal kinderen" htmlFor="kind">
                  <Input
                    id="kind"
                    type="number"
                    min={0}
                    value={kinderen || ''}
                    onChange={(e) => setKinderen(Number(e.target.value) || 0)}
                  />
                </Field>
              </>
            ) : null}

            <Button type="submit" className="w-full" loading={saving} disabled={!gekozen}>
              Verstuur reactie
            </Button>
            {opgeslagen ? (
              <p className="text-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
                Bedankt! Je reactie is opgeslagen.
              </p>
            ) : null}
            {error ? (
              <p className="text-center text-sm font-medium text-destructive">{error}</p>
            ) : null}
          </form>
        </CardContent>
      </Card>
    </section>
  )
}
