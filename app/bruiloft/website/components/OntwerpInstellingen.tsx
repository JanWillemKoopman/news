'use client'

import { Check, ChevronDown, Loader2, Palette } from 'lucide-react'
import * as React from 'react'

import { Input } from '@/components/bruiloft/ui'
import { cn } from '@/lib/utils'
import type {
  WebsiteContent,
  WebsiteContentInput,
  WeddingLettertype,
  WeddingThema,
} from '@/lib/bruiloft/types'
import { useBruiloftStore } from '@/store/bruiloftStore'

import { useDebounceOpslaan } from './useDebounceOpslaan'

const FONT_PREVIEW_URL =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;700&family=Dancing+Script:wght@400;700&family=EB+Garamond:wght@400;700&family=Great+Vibes&family=Lora:wght@400;700&family=Playfair+Display:wght@400;700&display=swap'

const THEMAS: {
  id: WeddingThema
  naam: string
  beschrijving: string
  palette: [string, string, string]
  accentKleur: string
  kopLettertype: WeddingLettertype
}[] = [
  {
    id: 'klassiek',
    naam: 'The Atelier',
    beschrijving: 'Ornamentele typografie & tijdloos',
    palette: ['#a78ba8', '#faf0f5', '#3d2040'],
    accentKleur: '#a78ba8',
    kopLettertype: 'cormorant',
  },
  {
    id: 'modern',
    naam: 'The Editor',
    beschrijving: 'Asymmetrisch split-hero & editoriaal',
    palette: ['#1c1c2e', '#f8f8fc', '#4a4a6a'],
    accentKleur: '#1c1c2e',
    kopLettertype: 'playfair',
  },
  {
    id: 'romantisch',
    naam: 'Le Jardin',
    beschrijving: 'Warm blush & botanische details',
    palette: ['#c2829a', '#fef3ef', '#7a3a50'],
    accentKleur: '#c2829a',
    kopLettertype: 'dancing-script',
  },
  {
    id: 'rustiek',
    naam: 'Het Landgoed',
    beschrijving: 'Linnen secties & warm organisch',
    palette: ['#8b6341', '#faf5eb', '#3d2a1a'],
    accentKleur: '#8b6341',
    kopLettertype: 'lora',
  },
  {
    id: 'minimalistisch',
    naam: 'Studio',
    beschrijving: 'Gigantische typografie & witruimte',
    palette: ['#1a1a1a', '#ffffff', '#606060'],
    accentKleur: '#1a1a1a',
    kopLettertype: 'eb-garamond',
  },
  {
    id: 'botanisch',
    naam: 'De Tuin',
    beschrijving: 'Groene nav & masonry galerij',
    palette: ['#2d5a27', '#f0f7f0', '#1a3a16'],
    accentKleur: '#2d5a27',
    kopLettertype: 'great-vibes',
  },
]

const LETTERTYPES: {
  id: WeddingLettertype
  naam: string
  voorbeeld: string
  fontFamily: string
}[] = [
  { id: 'cormorant', naam: 'Cormorant', voorbeeld: 'Jullie dag', fontFamily: '"Cormorant Garamond", serif' },
  { id: 'playfair', naam: 'Playfair', voorbeeld: 'Jullie dag', fontFamily: '"Playfair Display", serif' },
  { id: 'lora', naam: 'Lora', voorbeeld: 'Jullie dag', fontFamily: '"Lora", serif' },
  { id: 'dancing-script', naam: 'Dancing', voorbeeld: 'Jullie dag', fontFamily: '"Dancing Script", cursive' },
  { id: 'eb-garamond', naam: 'Garamond', voorbeeld: 'Jullie dag', fontFamily: '"EB Garamond", serif' },
  { id: 'great-vibes', naam: 'Vibes', voorbeeld: 'Jullie dag', fontFamily: '"Great Vibes", cursive' },
]

const KLEUR_PRESETS = [
  '#1a1a1a', '#6b7280', '#c9a96e', '#7c6b4f',
  '#a75573', '#c2785e', '#d4a853', '#8b4513',
  '#334155', '#5c6bc0', '#6b4c7a', '#1e6b8a',
  '#2d6a4f', '#4a7c59', '#b5835a', '#8b7355',
  '#c2829a', '#2d5a27',
]

interface Props {
  content: WebsiteContent
}

export function OntwerpInstellingen({ content }: Props) {
  const saveWebsiteContent = useBruiloftStore((s) => s.saveWebsiteContent)
  const checkSlugAvailable = useBruiloftStore((s) => s.checkSlugAvailable)
  const [open, setOpen] = React.useState(false)
  const [slug, setSlug] = React.useState(content.slug ?? '')
  const [slugStatus, setSlugStatus] = React.useState<
    'idle' | 'checking' | 'beschikbaar' | 'bezet' | 'ongeldig'
  >('idle')
  const slugTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const { stel } = useDebounceOpslaan<WebsiteContentInput>(saveWebsiteContent)

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
    slugStatus === 'checking'
      ? 'Beschikbaarheid controleren…'
      : slugStatus === 'beschikbaar'
        ? `✓ ${herkomst}/trouwen/${slug}`
        : slugStatus === 'bezet'
          ? 'Deze URL is al in gebruik'
          : slugStatus === 'ongeldig'
            ? 'Gebruik kleine letters, cijfers en koppeltekens (min. 3 tekens)'
            : slug
              ? `${herkomst}/trouwen/${slug}`
              : ''

  const huidigThema = THEMAS.find((t) => t.id === content.thema)
  const huidigFont = LETTERTYPES.find((l) => l.id === content.kopLettertype)

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-border bg-card">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/30 sm:px-5"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Palette className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Ontwerp-instellingen</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            <span>{huidigThema?.naam ?? 'Geen template'}</span>
            <span className="mx-1.5 text-border">·</span>
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm align-middle"
              style={{ background: content.kleurAccent }}
            />
            <span className="ml-1">{content.kleurAccent}</span>
            <span className="mx-1.5 text-border">·</span>
            <span>{huidigFont?.naam ?? '—'}</span>
          </p>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>

      {/* Expanded design settings */}
      {open && (
        <div className="border-t border-border px-4 py-5 sm:px-5 sm:py-6 space-y-6">
          {/* Template */}
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Template
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              Elk template heeft een uniek design-concept — inclusief aanbevolen kleur en lettertype.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {THEMAS.map((t) => {
                const gekozen = content.thema === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() =>
                      saveWebsiteContent({
                        thema: t.id,
                        kleurAccent: t.accentKleur,
                        kopLettertype: t.kopLettertype,
                      })
                    }
                    className={cn(
                      'relative flex flex-col gap-2 rounded-xl border-2 p-3 text-left transition-all',
                      gekozen
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    {gekozen && (
                      <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                    <div
                      className="relative h-14 overflow-hidden rounded-lg"
                      style={{ background: t.palette[1] }}
                    >
                      <div
                        className="absolute inset-x-0 top-0 flex h-3.5 items-center gap-1 px-2"
                        style={{ background: t.palette[0] }}
                      >
                        <div
                          className="h-0.5 flex-1 rounded"
                          style={{ background: 'rgba(255,255,255,0.4)' }}
                        />
                      </div>
                      <div className="absolute inset-0 mt-3.5 flex items-center justify-center">
                        <div className="space-y-1 text-center">
                          <div
                            className="mx-auto h-1.5 rounded"
                            style={{ background: t.palette[0] + 'aa', width: '55%' }}
                          />
                          <div
                            className="mx-auto h-1 rounded"
                            style={{ background: t.palette[0] + '55', width: '35%' }}
                          />
                        </div>
                      </div>
                    </div>
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
                      <p className="text-sm font-semibold leading-tight text-foreground">
                        {t.naam}
                      </p>
                      <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                        {t.beschrijving}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Accentkleur + Lettertype side by side */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Accentkleur */}
            <div>
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Accentkleur
              </p>
              <div className="mb-3 flex items-center gap-3">
                <input
                  type="color"
                  value={content.kleurAccent}
                  onChange={(e) => stel({ kleurAccent: e.target.value })}
                  className="h-10 w-10 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
                />
                <Input
                  value={content.kleurAccent}
                  onChange={(e) => stel({ kleurAccent: e.target.value })}
                  className="w-28 font-mono text-sm uppercase"
                  maxLength={7}
                  placeholder="#a75573"
                />
              </div>
              <div className="grid grid-cols-9 gap-1.5">
                {KLEUR_PRESETS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => stel({ kleurAccent: k })}
                    className={cn(
                      'aspect-square w-full rounded-md border-2 transition-transform hover:scale-110',
                      content.kleurAccent === k
                        ? 'border-foreground shadow-sm'
                        : 'border-transparent'
                    )}
                    style={{ background: k }}
                    title={k}
                  />
                ))}
              </div>
            </div>

            {/* Lettertype */}
            <div>
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Koplettertype
              </p>
              <div className="grid grid-cols-2 gap-2">
                {LETTERTYPES.map((l) => {
                  const gekozen = content.kopLettertype === l.id
                  return (
                    <button
                      key={l.id}
                      onClick={() => saveWebsiteContent({ kopLettertype: l.id })}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 transition-all',
                        gekozen
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <span
                        className="text-xl leading-none text-foreground"
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
            </div>
          </div>

          {/* Website-adres (slug) */}
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Website-adres
            </p>
            <p className="mb-2.5 text-xs text-muted-foreground">
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
              {slugStatus === 'checking' && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {slugStatus === 'beschikbaar' && (
                <Check className="h-4 w-4 text-emerald-500" />
              )}
            </div>
            {slugFeedback && (
              <p
                className={cn(
                  'mt-1.5 break-all text-xs',
                  slugStatus === 'bezet' || slugStatus === 'ongeldig'
                    ? 'text-destructive'
                    : slugStatus === 'beschikbaar'
                      ? 'text-emerald-600'
                      : 'text-muted-foreground'
                )}
              >
                {slugFeedback}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
