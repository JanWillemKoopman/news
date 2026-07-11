'use client'

import * as React from 'react'
import { CheckCircle2 } from 'lucide-react'

// Bewust een zelfstandig, licht formulier (geen app-componenten): dit is een
// publieke pagina voor gasten zonder account, net als de RSVP. Eén taak:
// je adres doorgeven. Klaar-scherm nodigt uit om nog iemand door te geven
// (partners/ouders geven vaak meerdere adressen door vanaf één telefoon).

interface AdresFormulierProps {
  token: string
  namen: string
}

const LEEG = {
  voornaam: '',
  achternaam: '',
  straat: '',
  postcode: '',
  plaats: '',
  email: '',
  telefoon: '',
}

export function AdresFormulier({ token, namen }: AdresFormulierProps) {
  const [form, setForm] = React.useState(LEEG)
  const [bezig, setBezig] = React.useState(false)
  const [klaar, setKlaar] = React.useState(false)
  const [fout, setFout] = React.useState('')

  const set = (key: keyof typeof LEEG) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBezig(true)
    setFout('')
    try {
      const res = await fetch('/api/adres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...form }),
      })
      if (res.status === 429) {
        setFout('Te veel pogingen achter elkaar — probeer het over een kwartier nog eens.')
        return
      }
      if (!res.ok) {
        setFout('Er ging iets mis bij het opslaan. Probeer het opnieuw.')
        return
      }
      setKlaar(true)
    } catch {
      setFout('Er ging iets mis bij het opslaan. Probeer het opnieuw.')
    } finally {
      setBezig(false)
    }
  }

  const veldClass =
    'w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-rose-300'

  return (
    <main className="min-h-screen bg-rhino-50 px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-xl border border-border bg-white p-6 shadow-sm sm:p-8">
          {klaar ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" aria-hidden />
              <h1 className="mt-3 text-xl font-medium text-foreground">Dankjewel!</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Je adres is doorgegeven aan {namen || 'het bruidspaar'}.
              </p>
              <button
                type="button"
                onClick={() => {
                  setForm(LEEG)
                  setKlaar(false)
                }}
                className="mt-6 text-sm font-medium text-rose-700 underline-offset-4 hover:underline"
              >
                Nog een adres doorgeven
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Adres doorgeven
              </p>
              <h1 className="mt-1 text-2xl font-medium text-foreground">
                {namen || 'Ons bruidspaar'} gaat trouwen
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Laat je adres achter voor de uitnodiging. Het komt alleen bij{' '}
                {namen || 'het bruidspaar'} terecht.
              </p>

              <form onSubmit={submit} className="mt-6 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    required
                    autoComplete="given-name"
                    placeholder="Voornaam"
                    aria-label="Voornaam"
                    value={form.voornaam}
                    onChange={set('voornaam')}
                    className={veldClass}
                  />
                  <input
                    required
                    autoComplete="family-name"
                    placeholder="Achternaam"
                    aria-label="Achternaam"
                    value={form.achternaam}
                    onChange={set('achternaam')}
                    className={veldClass}
                  />
                </div>
                <input
                  required
                  autoComplete="street-address"
                  placeholder="Straat en huisnummer"
                  aria-label="Straat en huisnummer"
                  value={form.straat}
                  onChange={set('straat')}
                  className={veldClass}
                />
                <div className="grid grid-cols-[1fr_1.6fr] gap-3">
                  <input
                    autoComplete="postal-code"
                    placeholder="Postcode"
                    aria-label="Postcode"
                    value={form.postcode}
                    onChange={set('postcode')}
                    className={veldClass}
                  />
                  <input
                    required
                    autoComplete="address-level2"
                    placeholder="Plaats"
                    aria-label="Plaats"
                    value={form.plaats}
                    onChange={set('plaats')}
                    className={veldClass}
                  />
                </div>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="E-mail (optioneel)"
                  aria-label="E-mail (optioneel)"
                  value={form.email}
                  onChange={set('email')}
                  className={veldClass}
                />
                <input
                  type="tel"
                  autoComplete="tel"
                  placeholder="Telefoon (optioneel)"
                  aria-label="Telefoon (optioneel)"
                  value={form.telefoon}
                  onChange={set('telefoon')}
                  className={veldClass}
                />

                {fout ? (
                  <p className="text-sm text-rose-700" role="alert">
                    {fout}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={bezig}
                  className="w-full rounded-md bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-800 disabled:opacity-60"
                >
                  {bezig ? 'Versturen…' : 'Adres doorgeven'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Gemaakt met{' '}
          <a href="/" className="font-medium text-foreground hover:underline">
            Ons Trouwplan
          </a>{' '}
          — zelf jullie bruiloft plannen is gratis.
        </p>
      </div>
    </main>
  )
}
