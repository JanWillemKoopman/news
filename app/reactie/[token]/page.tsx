'use client'

import * as React from 'react'
import { CheckCircle2, MailX } from 'lucide-react'

import { formatDatumNL } from '@/lib/bruiloft/format'

// Publieke reactiepagina voor leveranciers: bereikbaar via de token-link in de
// offerte-/contact-e-mail, zonder account of login (zelfde model als de
// persoonlijke RSVP-links). Bewust een kale, rustige pagina in de huisstijl:
// één taak (reageren), geen navigatie naar de rest van de app.

interface Gesprek {
  onderwerp: string
  bericht: string
  verzondenOp: string
  partnerNamen: string
  vendorNaam: string
  reacties: { inhoud: string; createdAt: string }[]
}

export default function ReactiePage({ params }: { params: { token: string } }) {
  const [gesprek, setGesprek] = React.useState<Gesprek | null>(null)
  const [laadstatus, setLaadstatus] = React.useState<'laden' | 'ok' | 'ongeldig'>('laden')
  const [reactie, setReactie] = React.useState('')
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

  const versturen = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reactie.trim() || verzendt) return
    setVerzendt(true)
    setFout(null)
    try {
      const res = await fetch(`/api/reactie/${params.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bericht: reactie }),
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
                <label htmlFor="reactie" className="block text-sm font-medium text-foreground">
                  Jouw reactie aan {gesprek.partnerNamen}
                </label>
                <textarea
                  id="reactie"
                  rows={6}
                  maxLength={5000}
                  value={reactie}
                  onChange={(e) => setReactie(e.target.value)}
                  placeholder="Schrijf hier je reactie…"
                  className="mt-2 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                />
                {fout ? <p className="mt-2 text-sm text-rose-600">{fout}</p> : null}
                <div className="mt-4 flex items-center justify-between gap-4">
                  <p className="text-xs text-muted-foreground">
                    Geen account nodig — je reactie komt rechtstreeks bij het bruidspaar terecht.
                  </p>
                  <button
                    type="submit"
                    disabled={!reactie.trim() || verzendt}
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
