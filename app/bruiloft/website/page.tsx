'use client'

import * as React from 'react'
import { Check, Copy, Info, Link2 } from 'lucide-react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import {
  Button,
  Card,
  CardContent,
  Field,
  Input,
  Textarea,
  useToast,
} from '@/components/bruiloft/ui'
import { gastTellingen } from '@/lib/bruiloft/derived'
import { useBruiloftStore } from '@/store/bruiloftStore'

type Velden = {
  welkomsttekst: string
  dresscode: string
  cadeaulijst: string
  hotels: string
  routebeschrijving: string
  contact: string
}

export default function WebsitePage() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const guests = useBruiloftStore((s) => s.guests)
  const websiteContent = useBruiloftStore((s) => s.websiteContent)
  const saveWebsiteContent = useBruiloftStore((s) => s.saveWebsiteContent)
  const ensureRsvpCodes = useBruiloftStore((s) => s.ensureRsvpCodes)
  const { toast } = useToast()

  const [form, setForm] = React.useState<Velden>({
    welkomsttekst: '',
    dresscode: '',
    cadeaulijst: '',
    hotels: '',
    routebeschrijving: '',
    contact: '',
  })
  const [origin, setOrigin] = React.useState('')
  const [gekopieerd, setGekopieerd] = React.useState<string | null>(null)

  React.useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  React.useEffect(() => {
    if (websiteContent) {
      setForm({
        welkomsttekst: websiteContent.welkomsttekst,
        dresscode: websiteContent.dresscode,
        cadeaulijst: websiteContent.cadeaulijst,
        hotels: websiteContent.hotels,
        routebeschrijving: websiteContent.routebeschrijving,
        contact: websiteContent.contact,
      })
    }
  }, [websiteContent])

  if (!wedding) return null

  const t = gastTellingen(guests)

  // Bewerk lokaal en sla het gewijzigde veld direct op.
  const set = (veld: keyof Velden) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.value
    setForm((f) => ({ ...f, [veld]: value }))
    void saveWebsiteContent({ [veld]: value })
  }

  const kopieer = async (tekst: string, id: string) => {
    try {
      await navigator.clipboard.writeText(tekst)
      setGekopieerd(id)
      setTimeout(() => setGekopieerd(null), 1500)
    } catch {
      // klembord niet beschikbaar
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        titel="Trouwwebsite"
        beschrijving="Beheer de informatie voor je gasten en deel persoonlijke RSVP-links."
      />

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-border bg-card/50 px-4 py-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <span>
          Elke gast heeft een persoonlijke, niet te raden RSVP-link. Deel die link; gasten reageren
          op hun eigen telefoon en hun antwoord verschijnt direct bij jullie gasten-overzicht.
        </span>
      </div>

      <Card className="mb-6">
        <CardContent className="space-y-4 p-6">
          <Field label="Welkomsttekst" htmlFor="welkom">
            <Textarea id="welkom" value={form.welkomsttekst} onChange={set('welkomsttekst')} rows={3} />
          </Field>
          <Field label="Dresscode" htmlFor="dress">
            <Input id="dress" value={form.dresscode} onChange={set('dresscode')} />
          </Field>
          <Field label="Cadeaulijst" htmlFor="cadeau">
            <Textarea id="cadeau" value={form.cadeaulijst} onChange={set('cadeaulijst')} rows={2} />
          </Field>
          <Field label="Overnachten / hotels" htmlFor="hotels">
            <Textarea id="hotels" value={form.hotels} onChange={set('hotels')} rows={2} />
          </Field>
          <Field label="Routebeschrijving" htmlFor="route">
            <Textarea id="route" value={form.routebeschrijving} onChange={set('routebeschrijving')} rows={2} />
          </Field>
          <Field label="Contact" htmlFor="contact">
            <Input id="contact" value={form.contact} onChange={set('contact')} />
          </Field>
        </CardContent>
      </Card>

      {/* RSVP-overzicht + deellinks */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl text-foreground">RSVP &amp; deellinks</h2>
              <p className="text-sm text-muted-foreground">
                {t.bevestigd} bevestigd · {t.afgemeld} afgemeld · {t.geenReactie} geen reactie
              </p>
            </div>
            <Button
              onClick={async () => {
                await ensureRsvpCodes()
                toast({ title: 'Deellinks klaar', description: 'Elke gast heeft nu een persoonlijke RSVP-link.', variant: 'success' })
              }}
              disabled={guests.length === 0}
            >
              <Link2 className="h-4 w-4" /> Genereer deellinks
            </Button>
          </div>

          {guests.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Voeg eerst gasten toe om persoonlijke RSVP-links te maken.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {guests.map((g) => {
                const link = g.rsvpCode ? `${origin}/rsvp/${g.rsvpCode}` : ''
                return (
                  <li key={g.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0 truncate text-sm text-foreground">
                      {g.voornaam} {g.achternaam}
                    </span>
                    {g.rsvpCode ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => kopieer(link, g.id)}
                        className="shrink-0"
                      >
                        {gekopieerd === g.id ? (
                          <>
                            <Check className="h-4 w-4" /> Gekopieerd
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" /> Kopieer link
                          </>
                        )}
                      </Button>
                    ) : (
                      <span className="shrink-0 text-xs text-muted-foreground">geen code</span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
