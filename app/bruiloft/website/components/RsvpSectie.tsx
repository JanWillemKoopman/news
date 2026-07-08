'use client'

import { Check, Link2 } from 'lucide-react'
import * as React from 'react'

import { Button, Card, CardContent } from '@/components/bruiloft/ui'
import { gastTellingen } from '@/lib/bruiloft/derived'
import { useBruiloftStore } from '@/store/bruiloftStore'

// Elke gast krijgt bij aanmaak automatisch een unieke, geheime RSVP-code
// (databasedefault op guests.rsvp_token) — er is dus nooit iets te
// "genereren", alleen te kopiëren. De link toont voortaan dezelfde
// thematische site als de publieke trouwwebsite, gepersonaliseerd voor die
// gast (zie app/rsvp/[token]/[[...pagina]]/page.tsx).
export function RsvpSectie() {
  const guests = useBruiloftStore((s) => s.guests)
  const [gekopieerd, setGekopieerd] = React.useState<string | null>(null)
  const [origin, setOrigin] = React.useState('')

  React.useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const t = gastTellingen(guests)

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
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="mb-4">
          <h2 className="text-xl text-foreground">RSVP &amp; deellinks</h2>
          <p className="text-sm text-muted-foreground">
            {t.bevestigd} bevestigd · {t.afgemeld} afgemeld · {t.geenReactie} geen reactie
          </p>
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
                <li key={g.id} className="flex min-h-[48px] items-center justify-between gap-3 py-2">
                  <span className="min-w-0 truncate text-sm text-foreground">
                    {g.voornaam} {g.achternaam}
                  </span>
                  {link ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => kopieer(link, g.id)}
                      className="shrink-0"
                    >
                      {gekopieerd === g.id ? (
                        <><Check className="h-4 w-4" /> Gekopieerd</>
                      ) : (
                        <><Link2 className="h-4 w-4" /> Kopieer link</>
                      )}
                    </Button>
                  ) : (
                    <span className="shrink-0 text-xs text-muted-foreground">—</span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
