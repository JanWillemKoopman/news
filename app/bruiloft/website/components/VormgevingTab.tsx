'use client'

import { Check, Loader2 } from 'lucide-react'
import * as React from 'react'

import { Button, Card, CardContent, Field, Input } from '@/components/bruiloft/ui'
import type { WebsiteContent, WebsiteContentInput, WeddingLettertype, WeddingThema } from '@/lib/bruiloft/types'
import { useBruiloftStore } from '@/store/bruiloftStore'

import { useDebounceOpslaan } from './useDebounceOpslaan'

const THEMAS: { id: WeddingThema; naam: string; beschrijving: string; accentKleur: string }[] = [
  { id: 'klassiek', naam: 'Klassiek', beschrijving: 'Elegant en tijdloos', accentKleur: '#a75573' },
  { id: 'modern',   naam: 'Modern',   beschrijving: 'Strak en minimaal',   accentKleur: '#334155' },
  { id: 'romantisch', naam: 'Romantisch', beschrijving: 'Warm en florerend', accentKleur: '#c2785e' },
]

const LETTERTYPES: { id: WeddingLettertype; naam: string; voorbeeld: string }[] = [
  { id: 'cormorant', naam: 'Cormorant', voorbeeld: 'Aa' },
  { id: 'playfair',  naam: 'Playfair',  voorbeeld: 'Aa' },
  { id: 'lora',      naam: 'Lora',      voorbeeld: 'Aa' },
]

interface Props {
  content: WebsiteContent
}

export function VormgevingTab({ content }: Props) {
  const saveWebsiteContent = useBruiloftStore((s) => s.saveWebsiteContent)
  const checkSlugAvailable = useBruiloftStore((s) => s.checkSlugAvailable)

  const [slug, setSlug] = React.useState(content.slug ?? '')
  const [slugStatus, setSlugStatus] = React.useState<'idle' | 'checking' | 'beschikbaar' | 'bezet' | 'ongeldig'>('idle')
  const slugTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const { stel } = useDebounceOpslaan<WebsiteContentInput>(saveWebsiteContent)

  function valideerSlugFormaat(s: string) {
    return /^[a-z0-9-]{3,50}$/.test(s)
  }

  function onSlugWijziging(e: React.ChangeEvent<HTMLInputElement>) {
    const waarde = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    setSlug(waarde)
    setSlugStatus('idle')
    if (slugTimerRef.current) clearTimeout(slugTimerRef.current)
    if (!valideerSlugFormaat(waarde)) {
      if (waarde.length > 0) setSlugStatus('ongeldig')
      return
    }
    setSlugStatus('checking')
    slugTimerRef.current = setTimeout(async () => {
      try {
        const beschikbaar = await checkSlugAvailable(waarde)
        if (waarde === content.slug) {
          setSlugStatus('beschikbaar')
        } else {
          setSlugStatus(beschikbaar ? 'beschikbaar' : 'bezet')
        }
        if (beschikbaar || waarde === content.slug) {
          await saveWebsiteContent({ slug: waarde })
        }
      } catch {
        setSlugStatus('idle')
      }
    }, 600)
  }

  const herkomst = typeof window !== 'undefined' ? window.location.origin : ''
  const slugFeedback =
    slugStatus === 'checking' ? 'Beschikbaarheid controleren…' :
    slugStatus === 'beschikbaar' ? `✓ ${herkomst}/trouwen/${slug}` :
    slugStatus === 'bezet' ? 'Deze URL is al in gebruik' :
    slugStatus === 'ongeldig' ? 'Gebruik alleen kleine letters, cijfers en koppeltekens (min. 3 tekens)' :
    slug ? `${herkomst}/trouwen/${slug}` : ''

  return (
    <div className="space-y-6">
      {/* Publicatie */}
      <Card>
        <CardContent className="p-5">
          <h3 className="mb-3 font-medium text-foreground">Publicatie</h3>
          <div className="flex items-center gap-3">
            <button
              role="switch"
              aria-checked={content.websiteGepubliceerd}
              onClick={() => saveWebsiteContent({ websiteGepubliceerd: !content.websiteGepubliceerd })}
              className={
                'relative h-6 w-11 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ' +
                (content.websiteGepubliceerd ? 'bg-primary' : 'bg-input')
              }
            >
              <span
                className={
                  'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ' +
                  (content.websiteGepubliceerd ? 'translate-x-5' : 'translate-x-0.5')
                }
              />
            </button>
            <span className="text-sm text-foreground">
              {content.websiteGepubliceerd ? 'Website is live' : 'Website is verborgen'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Publieke URL / Slug */}
      <Card>
        <CardContent className="p-5">
          <h3 className="mb-1 font-medium text-foreground">Jullie trouwwebsite-adres</h3>
          <p className="mb-3 text-sm text-muted-foreground">
            Kies een persoonlijke URL voor jullie publieke trouwwebsite.
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
            <span className="shrink-0 text-muted-foreground">/trouwen/</span>
            <input
              value={slug}
              onChange={onSlugWijziging}
              placeholder="jan-en-ellemiek"
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground/60"
            />
            {slugStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {slugStatus === 'beschikbaar' && <Check className="h-4 w-4 text-emerald-500" />}
          </div>
          {slugFeedback && (
            <p className={
              'mt-1.5 break-all text-xs ' +
              (slugStatus === 'bezet' || slugStatus === 'ongeldig' ? 'text-destructive' :
               slugStatus === 'beschikbaar' ? 'text-emerald-600' : 'text-muted-foreground')
            }>
              {slugFeedback}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Thema */}
      <Card>
        <CardContent className="p-5">
          <h3 className="mb-3 font-medium text-foreground">Thema</h3>
          <div className="grid grid-cols-3 gap-3">
            {THEMAS.map((t) => (
              <button
                key={t.id}
                onClick={() => saveWebsiteContent({ thema: t.id })}
                className={
                  'relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-sm transition-all ' +
                  (content.thema === t.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50')
                }
              >
                {content.thema === t.id && (
                  <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                    <Check className="h-3 w-3" />
                  </span>
                )}
                <div
                  className="h-10 w-full rounded-lg"
                  style={{ background: `linear-gradient(135deg, ${t.accentKleur}30 0%, ${t.accentKleur}80 100%)` }}
                />
                <div className="text-center">
                  <p className="font-medium text-foreground">{t.naam}</p>
                  <p className="text-xs text-muted-foreground">{t.beschrijving}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Accentkleur */}
      <Card>
        <CardContent className="p-5">
          <h3 className="mb-3 font-medium text-foreground">Accentkleur</h3>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="color"
              value={content.kleurAccent}
              onChange={(e) => stel({ kleurAccent: e.target.value })}
              className="h-10 w-10 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
            />
            <Input
              value={content.kleurAccent}
              onChange={(e) => stel({ kleurAccent: e.target.value })}
              className="w-32 font-mono text-sm uppercase"
              maxLength={7}
              placeholder="#a75573"
            />
            <div className="flex gap-2">
              {['#a75573', '#334155', '#c2785e', '#6b7280', '#1e6e54'].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => stel({ kleurAccent: k })}
                  className="h-7 w-7 rounded-full border-2 border-white shadow-sm ring-1 ring-border transition-transform hover:scale-110"
                  style={{ background: k }}
                  title={k}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lettertype */}
      <Card>
        <CardContent className="p-5">
          <h3 className="mb-3 font-medium text-foreground">Koplettertype</h3>
          <div className="grid grid-cols-3 gap-3">
            {LETTERTYPES.map((l) => (
              <button
                key={l.id}
                onClick={() => saveWebsiteContent({ kopLettertype: l.id })}
                className={
                  'flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all ' +
                  (content.kopLettertype === l.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50')
                }
              >
                <span className="font-serif text-2xl text-foreground">{l.voorbeeld}</span>
                <span className="text-xs text-muted-foreground">{l.naam}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
