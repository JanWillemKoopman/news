'use client'

import { Check, Loader2 } from 'lucide-react'
import * as React from 'react'

import { Button, Card, CardContent, Input } from '@/components/bruiloft/ui'
import type { WebsiteContent, WebsiteContentInput, WeddingLettertype, WeddingThema } from '@/lib/bruiloft/types'
import { useBruiloftStore } from '@/store/bruiloftStore'

import { useDebounceOpslaan } from './useDebounceOpslaan'

// Google Fonts URL for live preview in the editor
const FONT_PREVIEW_URL =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;700&family=Dancing+Script:wght@400;700&family=EB+Garamond:wght@400;700&family=Great+Vibes&family=Lora:wght@400;700&family=Playfair+Display:wght@400;700&display=swap'

const THEMAS: {
  id: WeddingThema
  naam: string
  ondertitel: string
  beschrijving: string
  palette: [string, string, string]
  accentKleur: string
  kopLettertype: WeddingLettertype
}[] = [
  {
    id: 'klassiek',
    naam: 'The Atelier',
    ondertitel: 'Klassiek',
    beschrijving: 'Ornamentele typografie & tijdloos gecentreerd',
    palette: ['#a78ba8', '#faf0f5', '#3d2040'],
    accentKleur: '#a78ba8',
    kopLettertype: 'cormorant',
  },
  {
    id: 'modern',
    naam: 'The Editor',
    ondertitel: 'Modern',
    beschrijving: 'Asymmetrisch split-hero & editoriaal bold',
    palette: ['#1c1c2e', '#f8f8fc', '#4a4a6a'],
    accentKleur: '#1c1c2e',
    kopLettertype: 'playfair',
  },
  {
    id: 'romantisch',
    naam: 'Le Jardin',
    ondertitel: 'Romantisch',
    beschrijving: 'Warm blush, botanische ornamenten & zacht',
    palette: ['#c2829a', '#fef3ef', '#7a3a50'],
    accentKleur: '#c2829a',
    kopLettertype: 'dancing-script',
  },
  {
    id: 'rustiek',
    naam: 'Het Landgoed',
    ondertitel: 'Rustiek',
    beschrijving: 'Donkere nav, linnen secties & warm organisch',
    palette: ['#8b6341', '#faf5eb', '#3d2a1a'],
    accentKleur: '#8b6341',
    kopLettertype: 'lora',
  },
  {
    id: 'minimalistisch',
    naam: 'Studio',
    ondertitel: 'Puur',
    beschrijving: 'Gigantische typografie & maximale witruimte',
    palette: ['#1a1a1a', '#ffffff', '#606060'],
    accentKleur: '#1a1a1a',
    kopLettertype: 'eb-garamond',
  },
  {
    id: 'botanisch',
    naam: 'De Tuin',
    ondertitel: 'Botanisch',
    beschrijving: 'Groene nav, botanische details & masonry galerij',
    palette: ['#2d5a27', '#f0f7f0', '#1a3a16'],
    accentKleur: '#2d5a27',
    kopLettertype: 'great-vibes',
  },
]

interface LettertypeInfo {
  id: WeddingLettertype
  naam: string
  voorbeeld: string
  fontFamily: string
  stijl?: string
}

const LETTERTYPES: LettertypeInfo[] = [
  { id: 'cormorant',      naam: 'Cormorant',  voorbeeld: 'Jullie dag',    fontFamily: '"Cormorant Garamond", serif' },
  { id: 'playfair',       naam: 'Playfair',   voorbeeld: 'Jullie dag',    fontFamily: '"Playfair Display", serif' },
  { id: 'lora',           naam: 'Lora',        voorbeeld: 'Jullie dag',    fontFamily: '"Lora", serif' },
  { id: 'dancing-script', naam: 'Dancing',    voorbeeld: 'Jullie dag',    fontFamily: '"Dancing Script", cursive' },
  { id: 'eb-garamond',    naam: 'Garamond',   voorbeeld: 'Jullie dag',    fontFamily: '"EB Garamond", serif' },
  { id: 'great-vibes',    naam: 'Vibes',      voorbeeld: 'Jullie dag',    fontFamily: '"Great Vibes", cursive' },
]

const KLEUR_PRESETS = [
  '#a75573', '#c2785e', '#d4a853', '#7c6b4f',
  '#334155', '#2d6a4f', '#5c6bc0', '#8b4513',
  '#1a1a1a', '#6b7280', '#c9a96e', '#6b4c7a',
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

  // Load Google Fonts in the editor for live font preview
  React.useEffect(() => {
    if (typeof document === 'undefined') return
    const FONT_ID = 'wedding-font-preview'
    if (document.getElementById(FONT_ID)) return
    const link = document.createElement('link')
    link.id = FONT_ID
    link.rel = 'stylesheet'
    link.href = FONT_PREVIEW_URL
    document.head.appendChild(link)
  }, [])

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
    <div className="space-y-5">
      {/* Publicatie */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <h3 className="mb-3 font-medium text-foreground">Publicatie</h3>
          <div className="flex items-center gap-3">
            <button
              role="switch"
              aria-checked={content.websiteGepubliceerd}
              onClick={() => saveWebsiteContent({ websiteGepubliceerd: !content.websiteGepubliceerd })}
              className={
                'relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ' +
                (content.websiteGepubliceerd ? 'bg-primary' : 'bg-input')
              }
            >
              <span
                className={
                  'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ' +
                  (content.websiteGepubliceerd ? 'translate-x-6' : 'translate-x-1')
                }
              />
            </button>
            <div>
              <span className="text-sm font-medium text-foreground">
                {content.websiteGepubliceerd ? 'Website is live' : 'Website is verborgen'}
              </span>
              <p className="text-xs text-muted-foreground">
                {content.websiteGepubliceerd
                  ? 'Zichtbaar voor gasten via de publieke URL.'
                  : 'Alleen zichtbaar voor jou als beheerder.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Publieke URL / Slug */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <h3 className="mb-1 font-medium text-foreground">Jullie trouwwebsite-adres</h3>
          <p className="mb-3 text-sm text-muted-foreground">
            Kies een persoonlijke URL voor jullie publieke trouwwebsite.
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
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
        <CardContent className="p-4 sm:p-5">
          <h3 className="mb-1 font-medium text-foreground">Template</h3>
          <p className="mb-3 text-sm text-muted-foreground">
            Elk template heeft een uniek design-concept — inclusief aanbevolen kleur en lettertype.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {THEMAS.map((t) => {
              const gekozen = content.thema === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => saveWebsiteContent({ thema: t.id, kleurAccent: t.accentKleur, kopLettertype: t.kopLettertype })}
                  className={
                    'relative flex flex-col gap-2 rounded-xl border-2 p-3 text-left transition-all ' +
                    (gekozen ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50')
                  }
                >
                  {gekozen && (
                    <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                  {/* Mini mockup preview */}
                  <div className="relative overflow-hidden rounded-lg h-14" style={{ background: t.palette[1] }}>
                    {/* Mock nav bar */}
                    <div className="absolute top-0 inset-x-0 h-3.5 flex items-center px-2 gap-1" style={{ background: t.palette[0] }}>
                      <div className="h-0.5 flex-1 rounded" style={{ background: 'rgba(255,255,255,0.4)' }} />
                    </div>
                    {/* Mock title block */}
                    <div className="absolute inset-0 flex items-center justify-center mt-3.5">
                      <div className="space-y-1 text-center">
                        <div className="h-1.5 rounded mx-auto" style={{ background: t.palette[0] + 'aa', width: '55%' }} />
                        <div className="h-1 rounded mx-auto" style={{ background: t.palette[0] + '55', width: '35%' }} />
                      </div>
                    </div>
                  </div>
                  {/* Color palette strip */}
                  <div className="flex gap-0.5">
                    {t.palette.map((kleur, i) => (
                      <div
                        key={i}
                        className="h-2 flex-1 first:rounded-l last:rounded-r"
                        style={{ background: kleur }}
                      />
                    ))}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-tight">{t.naam}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{t.beschrijving}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Accentkleur */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <h3 className="mb-1 font-medium text-foreground">Accentkleur</h3>
          <p className="mb-3 text-sm text-muted-foreground">
            De hoofdkleur van jullie trouwwebsite — gebruikt voor knoppen, titels en accenten.
          </p>
          <div className="space-y-3">
            {/* Color picker + hex input */}
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={content.kleurAccent}
                onChange={(e) => stel({ kleurAccent: e.target.value })}
                className="h-11 w-11 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
              />
              <Input
                value={content.kleurAccent}
                onChange={(e) => stel({ kleurAccent: e.target.value })}
                className="w-32 font-mono text-sm uppercase"
                maxLength={7}
                placeholder="#a75573"
              />
            </div>
            {/* Preset swatches */}
            <div className="grid grid-cols-6 gap-2">
              {KLEUR_PRESETS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => stel({ kleurAccent: k })}
                  className={
                    'aspect-square w-full rounded-lg border-2 shadow-sm transition-transform hover:scale-110 ' +
                    (content.kleurAccent === k ? 'border-foreground' : 'border-transparent')
                  }
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
        <CardContent className="p-4 sm:p-5">
          <h3 className="mb-1 font-medium text-foreground">Koplettertype</h3>
          <p className="mb-3 text-sm text-muted-foreground">
            Het lettertype voor titels en koppen op jullie website.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {LETTERTYPES.map((l) => {
              const gekozen = content.kopLettertype === l.id
              return (
                <button
                  key={l.id}
                  onClick={() => saveWebsiteContent({ kopLettertype: l.id })}
                  className={
                    'flex flex-col items-center gap-2 rounded-xl border-2 px-2 py-4 transition-all ' +
                    (gekozen ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50')
                  }
                >
                  <span
                    className="text-2xl leading-none text-foreground"
                    style={{ fontFamily: l.fontFamily }}
                  >
                    {l.voorbeeld}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">{l.naam}</span>
                  {gekozen && <Check className="h-3 w-3 text-primary" />}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

