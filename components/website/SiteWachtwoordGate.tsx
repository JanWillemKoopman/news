'use client'

// Wachtwoordscherm voor een site-breed beveiligde trouwwebsite (fase 3).
// Toont alleen cosmetische info (namen, thema-kleur/lettertype) — nooit
// blokken, foto's of het schedule; die worden pas server-side opgehaald
// nadat dit scherm succesvol is doorlopen (zie
// app/trouwen/[slug]/[[...pagina]]/page.tsx).

import { Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import type { WeddingLettertype, WeddingThema } from '@/lib/bruiloft/types'
import { LETTERTYPE_CSS_VAR, hexNaarHsl, themeVanLegacy, type ThemeTokens } from '@/lib/bruiloft/websiteTheme'

export interface SiteLockMeta {
  weddingId: string
  partner1Naam: string
  partner2Naam: string
  thema: WeddingThema
  kleurAccent: string
  kopLettertype: WeddingLettertype
  theme: ThemeTokens | null
  sitePasswordVereist: boolean
}

export function SiteWachtwoordGate({ slug, meta }: { slug: string; meta: SiteLockMeta }) {
  const router = useRouter()
  const [wachtwoord, setWachtwoord] = React.useState('')
  const [bezig, setBezig] = React.useState(false)
  const [fout, setFout] = React.useState('')

  const theme = meta.theme ?? themeVanLegacy(meta.thema, meta.kleurAccent, meta.kopLettertype)
  const accentHsl = hexNaarHsl(theme.kleuren.accent)
  const font = LETTERTYPE_CSS_VAR[theme.kopLettertype]

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBezig(true)
    setFout('')
    try {
      const res = await fetch('/api/trouwen/check-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, password: wachtwoord }),
      })
      const json = (await res.json()) as { ok: boolean }
      if (json.ok) {
        router.refresh()
      } else if (res.status === 429) {
        setFout('Te veel pogingen. Probeer het over een paar minuten opnieuw.')
      } else {
        setFout('Onjuist wachtwoord. Probeer het opnieuw.')
      }
    } catch {
      setFout('Controleer je verbinding en probeer het opnieuw.')
    } finally {
      setBezig(false)
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-white px-6"
      style={{ '--primary': accentHsl, '--heading-font': font } as React.CSSProperties}
    >
      <div className="w-full max-w-sm text-center">
        <div
          className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: 'hsl(var(--primary)/0.1)' }}
        >
          <Lock className="h-5 w-5" style={{ color: 'hsl(var(--primary))' }} />
        </div>
        <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: '1.75rem' }} className="text-gray-900">
          {meta.partner1Naam} &amp; {meta.partner2Naam}
        </h1>
        <p className="mb-6 mt-2 text-sm text-gray-500">
          Deze trouwwebsite is beveiligd met een wachtwoord. Vraag het bruidspaar om de code.
        </p>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="text"
            value={wachtwoord}
            onChange={(e) => setWachtwoord(e.target.value)}
            placeholder="Wachtwoord"
            autoFocus
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-center text-sm outline-none focus:ring-2"
            style={{ '--tw-ring-color': 'hsl(var(--primary)/0.5)' } as React.CSSProperties}
          />
          {fout && <p className="text-xs text-red-600">{fout}</p>}
          <button
            type="submit"
            disabled={bezig || !wachtwoord}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
            style={{ background: 'hsl(var(--primary))' }}
          >
            {bezig ? 'Bezig…' : 'Bekijk de website'}
          </button>
        </form>
      </div>
    </div>
  )
}
