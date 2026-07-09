'use client'

import * as React from 'react'
import { CheckCircle2, MailX } from 'lucide-react'

import { AFWIJZINGSGRONDEN } from '@/lib/bruiloft/berichten/afwijzingsgronden'
import { formatDatumNL } from '@/lib/bruiloft/format'
import type { AfwijzingsGrond } from '@/lib/bruiloft/types'
import { cn } from '@/lib/utils'

// Publieke reactiepagina voor leveranciers: bereikbaar via de token-link in de
// offerte-/contact-e-mail, zonder account of login (zelfde model als de
// persoonlijke RSVP-links). Bewust een kale, rustige pagina in de huisstijl:
// één taak (reageren), geen navigatie naar de rest van de app. Bij een
// offerteaanvraag kan de leverancier ook met één klik een standaard
// afwijzingsgrond kiezen (bv. geen plek op de datum), met optionele
// persoonlijke toelichting.

interface Gesprek {
  soort: 'offerte' | 'contact'
  onderwerp: string
  bericht: string
  verzondenOp: string
  partnerNamen: string
  vendorNaam: string
  reacties: { inhoud: string; createdAt: string; afwijzingsGrond: AfwijzingsGrond | null }[]
}

export default function ReactiePage({ params }: { params: { token: string } }) {
  const [gesprek, setGesprek] = React.useState<Gesprek | null>(null)
  const [laadstatus, setLaadstatus] = React.useState<'laden' | 'ok' | 'ongeldig'>('laden')
  const [reactie, setReactie] = React.useState('')
  const [grond, setGrond] = React.useState<AfwijzingsGrond | null>(null)
  const [verzendt, setVerzendt] = React.useState(false)
  const [verzonden, setVerzonden] = React.useState(false)
  const [fout, setFout] = React.useState<string | null>(null)

  React.useEffect(() => {
    let actief = true
    fetch(`/api/reactie/${params.token}`)
      .then(async (res) => {
        if (!actief) return
        if (!res.ok) {
          setLaadstatus('ongeldig')
          return
        }
        setGesprek((await res.json()) as Gesprek)
        setLaadstatus('ok')
      })
      .catch(() => actief && setLaadstatus('ongeldig'))
    return () => {
      actief = false
    }
  }, [params.token])

  const gekozenGrond = grond ? AFWIJZINGSGRONDEN.find((g) => g.key === grond) : null
  // Al eerder afgewezen? Dan de snelkeuzes niet nóg een keer aanbieden.
  const alAfgewezen = gesprek?.reacties.some((r) => r.afwijzingsGrond) ?? false
  const kanVersturen = Boolean(grond) || reactie.trim().length > 0

  const versturen = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!kanVersturen || verzendt) return
    setVerzendt(true)
    setFout(null)
    try {
      const res = await fetch(`/api/reactie/${params.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(reactie.trim() ? { bericht: reactie } : {}),
          ...(grond ? { afwijzingsGrond: grond } : {}),
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'Versturen mislukt.')
      }
      setVerzonden(true)
    } catch (err) {
      setFout(err instanceof Error ? err.message : 'Versturen mislukt. Probeer het opnieuw.')
    } finally {
      setVerzendt(false)
    }
  }

  return (
    <div className="wedding flex min-h-screen justify-center bg-rhino-50 px-4 py-10 text-foreground sm:py-16">
      <div className="w-full max-w-xl">
        <p className="mb-6 text-center text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Ons Trouwplan
        </p>

        {laadstatus === 'laden' ? (
          <div className="rounded-xl border border-border bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">Bericht laden…</p>
          </div>
        ) : null}

        {laadstatus === 'ongeldig' ? (
          <div className="rounded-xl border border-border bg-white p-8 text-center shadow-sm">
            <MailX className="mx-auto mb-4 h-10 w-10 text-gray-400" />
            <h1 className="text-xl font-semibold text-foreground">Deze link werkt niet meer</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              De reageer-link is ongeldig of het bericht is niet gevonden. Neem eventueel
              rechtstreeks contact op via het e-mailadres in het oorspronkelijke bericht.
            </p>
          </div>
        ) : null}

        {laadstatus === 'ok' && gesprek ? (
          <div className="space-y-4">
            {/* Het oorspronkelijke bericht van het bruidspaar. */}
            <div className="rounded-xl border border-border bg-white p-6 shadow-sm sm:p-8">
              <h1 className="text-xl font-semibold text-foreground">{gesprek.onderwerp}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Van {gesprek.partnerNamen} · {formatDatumNL(gesprek.verzondenOp)}
                {gesprek.vendorNaam ? ` · aan ${gesprek.vendorNaam}` : ''}
              </p>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {gesprek.bericht}
              </p>
            </div>

            {/* Eerder gegeven reacties (mini-thread). */}
            {gesprek.reacties.map((r, i) => (
              <div key={i} className="ml-4 rounded-xl border border-border bg-white p-5 shadow-sm sm:ml-8">
                <p className="text-xs text-muted-foreground">
                  Jouw reactie · {formatDatumNL(r.createdAt)}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{r.inhoud}</p>
              </div>
            ))}

            {/* Reactieformulier of bevestiging. */}
            {verzonden ? (
              <div className="rounded-xl border border-border bg-white p-8 text-center shadow-sm">
                <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-rose-600" />
                <h2 className="text-lg font-semibold text-foreground">Reactie verstuurd</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {gesprek.partnerNamen} {gesprek.partnerNamen.includes('&') ? 'zien' : 'ziet'} je
                  reactie direct terug in hun trouwplan. Je kunt deze pagina sluiten.
                </p>
              </div>
            ) : (
              <form onSubmit={versturen} className="ml-4 rounded-xl border border-border bg-white p-6 shadow-sm sm:ml-8">
                {/* Snelkeuze: standaard afwijzingsgronden, alleen bij een
                    offerteaanvraag die nog niet eerder is afgewezen. */}
                {gesprek.soort === 'offerte' && !alAfgewezen ? (
                  <div className="mb-5">
                    <p className="text-sm font-medium text-foreground">Snel reageren</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {AFWIJZINGSGRONDEN.map((g) => {
                        const actief = grond === g.key
                        return (
                          <button
                            key={g.key}
                            type="button"
                            aria-pressed={actief}
                            onClick={() => setGrond(actief ? null : g.key)}
                            className={cn(
                              'rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500',
                              actief
                                ? 'border-rose-600 bg-rose-600 text-white'
                                : 'border-border bg-white text-foreground hover:border-rose-300'
                            )}
                          >
                            {g.knopLabel}
                          </button>
                        )
                      })}
                    </div>
                    {gekozenGrond ? (
                      <p className="mt-3 rounded-md bg-accent/50 px-3 py-2 text-sm text-muted-foreground">
                        Dit bericht gaat naar {gesprek.partnerNamen}:
                        <span className="mt-1 block whitespace-pre-wrap text-foreground">
                          &ldquo;{gekozenGrond.zin}&rdquo;
                        </span>
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <label htmlFor="reactie" className="block text-sm font-medium text-foreground">
                  {gekozenGrond
                    ? 'Persoonlijke toelichting (optioneel)'
                    : `Jouw reactie aan ${gesprek.partnerNamen}`}
                </label>
                <textarea
                  id="reactie"
                  rows={gekozenGrond ? 3 : 6}
                  maxLength={5000}
                  value={reactie}
                  onChange={(e) => setReactie(e.target.value)}
                  placeholder={
                    gekozenGrond
                      ? 'Bijvoorbeeld: rond die periode zitten we helemaal vol…'
                      : 'Schrijf hier je reactie…'
                  }
                  className="mt-2 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                />
                {fout ? <p className="mt-2 text-sm text-rose-600">{fout}</p> : null}
                <div className="mt-4 flex items-center justify-between gap-4">
                  <p className="text-xs text-muted-foreground">
                    Geen account nodig — je reactie komt rechtstreeks bij het bruidspaar terecht.
                  </p>
                  <button
                    type="submit"
                    disabled={!kanVersturen || verzendt}
                    className="shrink-0 rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {verzendt ? 'Versturen…' : 'Reactie versturen'}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
