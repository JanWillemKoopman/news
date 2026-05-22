'use client'

import * as React from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { CalendarHeart, Heart, MapPin } from 'lucide-react'

import {
  Button,
  Card,
  CardContent,
  Field,
  Input,
  Textarea,
} from '@/components/bruiloft/ui'
import { formatDatumNL } from '@/lib/bruiloft/format'
import { repository } from '@/lib/bruiloft/repositoryInstance'
import type { Guest, ScheduleItem, Wedding, WebsiteContent } from '@/lib/bruiloft/types'

export default function TrouwwebsitePage() {
  return (
    <React.Suspense fallback={<p className="p-10 text-center text-muted-foreground">Even laden…</p>}>
      <TrouwwebsiteInner />
    </React.Suspense>
  )
}

function TrouwwebsiteInner() {
  const params = useParams<{ weddingId: string }>()
  const searchParams = useSearchParams()
  const code = searchParams.get('code')
  const weddingId = params.weddingId

  const [laden, setLaden] = React.useState(true)
  const [wedding, setWedding] = React.useState<Wedding | null>(null)
  const [content, setContent] = React.useState<WebsiteContent | null>(null)
  const [programma, setProgramma] = React.useState<ScheduleItem[]>([])
  const [gast, setGast] = React.useState<Guest | null>(null)

  React.useEffect(() => {
    let actief = true
    ;(async () => {
      const w = await repository.getWedding(weddingId)
      if (!actief) return
      setWedding(w)
      if (w) {
        const [c, items] = await Promise.all([
          repository.getWebsiteContent(weddingId),
          repository.listScheduleItems(weddingId),
        ])
        if (!actief) return
        setContent(c)
        setProgramma(
          items
            .filter((s) => s.betrokkenen.includes('gasten'))
            .sort((a, b) => a.tijd.localeCompare(b.tijd))
        )
        if (code) {
          const guests = await repository.listGuests(weddingId)
          if (!actief) return
          setGast(guests.find((g) => g.rsvpCode === code) ?? null)
        }
      }
      setLaden(false)
    })()
    return () => {
      actief = false
    }
  }, [weddingId, code])

  if (laden) {
    return <p className="p-10 text-center text-muted-foreground">Even laden…</p>
  }

  if (!wedding) {
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <h1 className="font-serif text-2xl text-foreground">Trouwwebsite niet gevonden</h1>
        <p className="mt-2 text-muted-foreground">
          Deze link lijkt niet (meer) te bestaan.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-20">
      {/* Hero */}
      <header className="py-12 text-center md:py-16">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Heart className="h-7 w-7" />
        </div>
        <h1 className="font-serif text-4xl text-foreground md:text-5xl">
          {wedding.partner1Naam} <span className="text-primary">&amp;</span> {wedding.partner2Naam}
        </h1>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarHeart className="h-4 w-4" /> {formatDatumNL(wedding.trouwdatum)}
          </span>
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

      {/* RSVP */}
      <RsvpSectie code={code} gast={gast} />

      {/* Programma */}
      {programma.length > 0 ? (
        <Sectie titel="Programma">
          <ul className="space-y-2">
            {programma.map((s) => (
              <li key={s.id} className="flex gap-3">
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
      {content?.routebeschrijving ? (
        <Sectie titel="Route">{content.routebeschrijving}</Sectie>
      ) : null}
      {content?.contact ? <Sectie titel="Contact">{content.contact}</Sectie> : null}

      <p className="mt-12 text-center text-xs text-muted-foreground">
        Voorbeeldversie · werkt op dit apparaat tot er een backend is.
      </p>
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

function RsvpSectie({ code, gast }: { code: string | null; gast: Guest | null }) {
  if (!code) {
    return (
      <Sectie titel="RSVP">
        Je hebt een persoonlijke link nodig om te reageren. Vraag deze op bij het bruidspaar.
      </Sectie>
    )
  }
  if (!gast) {
    return (
      <Sectie titel="RSVP">
        We herkennen deze code niet. Controleer je persoonlijke link of neem contact op met het
        bruidspaar.
      </Sectie>
    )
  }
  return <RsvpForm gast={gast} />
}

function RsvpForm({ gast }: { gast: Guest }) {
  const [status, setStatus] = React.useState(gast.rsvpStatus)
  const [dieet, setDieet] = React.useState(gast.dieetwensen)
  const [heeftPartner, setHeeftPartner] = React.useState(gast.heeftPartner)
  const [partnerNaam, setPartnerNaam] = React.useState(gast.partnerNaam)
  const [kinderen, setKinderen] = React.useState(gast.aantalKinderen)
  const [opgeslagen, setOpgeslagen] = React.useState(false)

  const komt = status === 'bevestigd'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    await repository.updateGuest(gast.id, {
      rsvpStatus: status,
      dieetwensen: dieet,
      heeftPartner,
      partnerNaam: heeftPartner ? partnerNaam : '',
      aantalKinderen: Number(kinderen) || 0,
    })
    setOpgeslagen(true)
  }

  return (
    <section className="mb-6">
      <Card>
        <CardContent className="p-6">
          <h2 className="font-serif text-xl text-foreground">
            Hoi {gast.voornaam}, ben je erbij?
          </h2>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">
            Je bent uitgenodigd als {gast.gasttype}.
          </p>

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

            <Button type="submit" className="w-full" disabled={status === 'uitgenodigd' || status === 'geen reactie'}>
              Verstuur reactie
            </Button>
            {opgeslagen ? (
              <p className="text-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
                Bedankt! Je reactie is opgeslagen.
              </p>
            ) : null}
          </form>
        </CardContent>
      </Card>
    </section>
  )
}
