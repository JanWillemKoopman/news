'use client'

import { Check, Copy, Link2 } from 'lucide-react'
import * as React from 'react'

import { Button, Card, CardContent, useToast } from '@/components/bruiloft/ui'
import { gastTellingen } from '@/lib/bruiloft/derived'
import { useBruiloftStore } from '@/store/bruiloftStore'

export function RsvpSectie() {
  const guests = useBruiloftStore((s) => s.guests)
  const ensureRsvpCodes = useBruiloftStore((s) => s.ensureRsvpCodes)
  const { toast } = useToast()
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
        {/* Header: op mobiel gestapeld, op desktop naast elkaar */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-xl text-foreground">RSVP &amp; deellinks</h2>
            <p className="text-sm text-muted-foreground">
              {t.bevestigd} bevestigd · {t.afgemeld} afgemeld · {t.geenReactie} geen reactie
            </p>
          </div>
          <Button
            onClick={async () => {
              try {
                await ensureRsvpCodes()
                toast({ title: 'Deellinks klaar', description: 'Elke gast heeft nu een persoonlijke RSVP-link.', variant: 'success' })
              } catch {
                toast({ title: 'Aanmaken mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
              }
            }}
            disabled={guests.length === 0}
            className="w-full sm:w-auto"
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
                <li key={g.id} className="flex min-h-[48px] items-center justify-between gap-3 py-2">
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
                        <><Check className="h-4 w-4" /> Gekopieerd</>
                      ) : (
                        <><Copy className="h-4 w-4" /> Kopieer</>
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
  )
}
