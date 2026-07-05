'use client'

import { Check, ChevronDown, Loader2, Menu, Palette } from 'lucide-react'
import * as React from 'react'

import { Input } from '@/components/bruiloft/ui'
import { cn } from '@/lib/utils'
import type { WebsiteContent, WeddingLettertype, WeddingThema } from '@/lib/bruiloft/types'
import {
  FONT_PREVIEW_URL,
  LETTERTYPE_FONT_STACK,
  THEME_PRESETS,
  themeVanPreset,
  type ThemeTokens,
} from '@/lib/bruiloft/websiteTheme'
import { useBruiloftStore } from '@/store/bruiloftStore'

const PRESET_INFO: { id: WeddingThema; naam: string; beschrijving: string }[] = [
  { id: 'klassiek', naam: 'The Atelier', beschrijving: 'Ornamentele typografie & tijdloos' },
  { id: 'modern', naam: 'The Editor', beschrijving: 'Editoriaal & scherp' },
  { id: 'romantisch', naam: 'Le Jardin', beschrijving: 'Warm blush & rond' },
  { id: 'rustiek', naam: 'Het Landgoed', beschrijving: 'Linnen & warm organisch' },
  { id: 'minimalistisch', naam: 'Studio', beschrijving: 'Typografie & witruimte' },
  { id: 'botanisch', naam: 'De Tuin', beschrijving: 'Weelderig groen' },
]

const LETTERTYPES: { id: WeddingLettertype; naam: string; fontFamily: string }[] = [
  { id: 'cormorant', naam: 'Cormorant', fontFamily: LETTERTYPE_FONT_STACK.cormorant },
  { id: 'playfair', naam: 'Playfair', fontFamily: LETTERTYPE_FONT_STACK.playfair },
  { id: 'lora', naam: 'Lora', fontFamily: LETTERTYPE_FONT_STACK.lora },
  { id: 'dancing-script', naam: 'Dancing', fontFamily: LETTERTYPE_FONT_STACK['dancing-script'] },
  { id: 'eb-garamond', naam: 'Garamond', fontFamily: LETTERTYPE_FONT_STACK['eb-garamond'] },
  { id: 'great-vibes', naam: 'Vibes', fontFamily: LETTERTYPE_FONT_STACK['great-vibes'] },
  { id: 'italiana', naam: 'Italiana', fontFamily: LETTERTYPE_FONT_STACK.italiana },
  { id: 'marcellus', naam: 'Marcellus', fontFamily: LETTERTYPE_FONT_STACK.marcellus },
  { id: 'libre-baskerville', naam: 'Baskerville', fontFamily: LETTERTYPE_FONT_STACK['libre-baskerville'] },
  { id: 'josefin-sans', naam: 'Josefin', fontFamily: LETTERTYPE_FONT_STACK['josefin-sans'] },
  { id: 'bodoni-moda', naam: 'Bodoni', fontFamily: LETTERTYPE_FONT_STACK['bodoni-moda'] },
  { id: 'parisienne', naam: 'Parisienne', fontFamily: LETTERTYPE_FONT_STACK.parisienne },
]

const KLEUR_PRESETS = [
  '#1a1a1a', '#6b7280', '#c9a96e', '#7c6b4f',
  '#a75573', '#c2785e', '#d4a853', '#8b4513',
  '#334155', '#5c6bc0', '#6b4c7a', '#1e6b8a',
  '#2d6a4f', '#4a7c59', '#b5835a', '#8b7355',
  '#c2829a', '#2d5a27',
]

function maakBaseSlug(naam1: string, naam2: string): string {
  const normalize = (s: string) =>
    s.toLowerCase()
      .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e').replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o').replace(/[ùúûü]/g, 'u').replace(/[ýÿ]/g, 'y')
      .replace(/[ñ]/g, 'n').replace(/[ç]/g, 'c')
      .replace(/[^a-z0-9]/g, '')
  return (normalize(naam1) + normalize(naam2)).slice(0, 45)
}

function valideerSlugFormaat(s: string) {
  return /^[a-z0-9-]{3,50}$/.test(s)
}

interface Props {
  content: WebsiteContent
  theme: ThemeTokens
}

export function ThemaInstellingen({ content, theme }: Props) {
  const saveWebsiteContent = useBruiloftStore((s) => s.saveWebsiteContent)
  const checkSlugAvailable = useBruiloftStore((s) => s.checkSlugAvailable)
  const wedding = useBruiloftStore((s) => s.wedding)
  const [open, setOpen] = React.useState(false)
  const [slug, setSlug] = React.useState(content.slug ?? '')
  const [slugStatus, setSlugStatus] = React.useState<
    'idle' | 'checking' | 'beschikbaar' | 'bezet' | 'ongeldig' | 'leeg'
  >('idle')
  const slugTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sla het thema op; de legacy-velden (thema/kleurAccent/kopLettertype)
  // gaan mee zodat de losse cadeaulijst-pagina (get_public_registry leest
  // die kolommen) dezelfde stijl houdt.
  function saveTheme(volgende: ThemeTokens) {
    void saveWebsiteContent({
      theme: volgende,
      thema: volgende.preset,
      kleurAccent: volgende.kleuren.accent,
      kopLettertype: volgende.kopLettertype,
    })
  }

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

  // Auto-genereer slug van partnernamen als er nog geen is.
  React.useEffect(() => {
    if (content.slug || !wedding) return
    const base = maakBaseSlug(wedding.partner1Naam, wedding.partner2Naam)
    if (base.length < 3) return

    let cancelled = false
    async function vindBeschikbareSlug() {
      const kandidaten = [base, ...Array.from({ length: 9 }, (_, i) => `${base}${i + 1}`)]
      for (const kandidaat of kandidaten) {
        if (cancelled || kandidaat.length > 50) continue
        try {
          const beschikbaar = await checkSlugAvailable(kandidaat)
          if (beschikbaar && !cancelled) {
            setSlug(kandidaat)
            setSlugStatus('beschikbaar')
            await saveWebsiteContent({ slug: kandidaat })
            return
          }
        } catch {
          return
        }
      }
    }
    void vindBeschikbareSlug()
    return () => { cancelled = true }
  }, [content.slug, wedding, checkSlugAvailable, saveWebsiteContent])

  function onSlugWijziging(e: React.ChangeEvent<HTMLInputElement>) {
    const waarde = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    setSlug(waarde)
    if (slugTimerRef.current) clearTimeout(slugTimerRef.current)
    if (waarde.length === 0) {
      setSlugStatus('leeg')
      return
    }
    setSlugStatus('idle')
    if (!valideerSlugFormaat(waarde)) {
      setSlugStatus('ongeldig')
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
    slugStatus === 'leeg'
      ? 'Vul een website-adres in'
      : slugStatus === 'checking'
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

  const huidigPreset = PRESET_INFO.find((p) => p.id === theme.preset)
  const huidigFont = LETTERTYPES.find((l) => l.id === theme.kopLettertype)

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
          <p className="text-sm font-semibold text-foreground">Ontwerp</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            <span>{huidigPreset?.naam ?? 'Eigen thema'}</span>
            <span className="mx-1.5 text-border">·</span>
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm align-middle"
              style={{ background: theme.kleuren.accent }}
            />
            <span className="ml-1">{theme.kleuren.accent}</span>
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

      {open && (
        <div className="space-y-6 border-t border-border px-4 py-5 sm:px-5 sm:py-6">
          {/* Thema-presets */}
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Thema
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              Kies een startpunt — daarna pas je kleur en lettertype los aan.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {PRESET_INFO.map((p) => {
                const tokens = THEME_PRESETS[p.id]
                const gekozen = theme.preset === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => saveTheme(themeVanPreset(p.id))}
                    className={cn(
                      'relative flex flex-col gap-2 rounded-xl border-2 p-3 text-left transition-all',
                      gekozen ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    )}
                  >
                    {gekozen && (
                      <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                    <div className="relative h-14 overflow-hidden rounded-lg" style={{ background: tokens.kleuren.achtergrond }}>
                      <div className="absolute inset-x-0 top-0 flex h-3.5 items-center gap-1 px-2" style={{ background: tokens.kleuren.accent }}>
                        <div className="h-0.5 flex-1 rounded" style={{ background: 'rgba(255,255,255,0.4)' }} />
                      </div>
                      <div className="absolute inset-0 mt-3.5 flex items-center justify-center">
                        <div className="space-y-1 text-center">
                          <div className="mx-auto h-1.5 rounded" style={{ background: tokens.kleuren.accent + 'aa', width: '55%' }} />
                          <div className="mx-auto h-1 rounded" style={{ background: tokens.kleuren.accent + '55', width: '35%' }} />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {[tokens.kleuren.accent, tokens.kleuren.achtergrond, tokens.kleuren.kaart].map((kleur, i) => (
                        <div key={i} className="h-2 flex-1 border border-border/40 first:rounded-l last:rounded-r" style={{ background: kleur }} />
                      ))}
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-tight text-foreground">{p.naam}</p>
                      <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{p.beschrijving}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Accentkleur */}
          <div>
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Accentkleur
            </p>
            <div className="mb-3 flex items-center gap-3">
              <input
                type="color"
                value={theme.kleuren.accent}
                onChange={(e) =>
                  saveTheme({ ...theme, kleuren: { ...theme.kleuren, accent: e.target.value } })
                }
                className="h-10 w-10 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
              />
              <Input
                value={theme.kleuren.accent}
                onChange={(e) =>
                  saveTheme({ ...theme, kleuren: { ...theme.kleuren, accent: e.target.value } })
                }
                className="w-28 font-mono text-sm uppercase"
                maxLength={7}
                placeholder="#a75573"
              />
            </div>
            <div className="grid grid-cols-9 gap-1.5 sm:grid-cols-[repeat(18,minmax(0,1fr))]">
              {KLEUR_PRESETS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => saveTheme({ ...theme, kleuren: { ...theme.kleuren, accent: k } })}
                  className={cn(
                    'aspect-square w-full rounded-md border-2 transition-transform hover:scale-110',
                    theme.kleuren.accent === k ? 'border-foreground shadow-sm' : 'border-transparent'
                  )}
                  style={{ background: k }}
                  title={k}
                />
              ))}
            </div>
          </div>

          {/* Overige kleuren (achtergrond, kaart, tekst, gedempt) */}
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Overige kleuren
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              Alleen nodig als je verder wilt afwijken van het gekozen thema.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  { key: 'achtergrond', label: 'Achtergrond' },
                  { key: 'kaart', label: 'Kaarten' },
                  { key: 'tekst', label: 'Tekst' },
                  { key: 'gedempt', label: 'Subtekst' },
                ] as const
              ).map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={theme.kleuren[key]}
                    onChange={(e) =>
                      saveTheme({ ...theme, kleuren: { ...theme.kleuren, [key]: e.target.value } })
                    }
                    className="h-8 w-8 shrink-0 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-foreground">{label}</p>
                    <p className="truncate font-mono text-[10px] uppercase text-muted-foreground">{theme.kleuren[key]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Koplettertype */}
          <div>
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Koplettertype
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {LETTERTYPES.map((l) => {
                const gekozen = theme.kopLettertype === l.id
                return (
                  <button
                    key={l.id}
                    onClick={() => saveTheme({ ...theme, kopLettertype: l.id })}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 transition-all',
                      gekozen ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    )}
                  >
                    <span className="text-xl leading-none text-foreground" style={{ fontFamily: l.fontFamily }}>
                      Jullie dag
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">{l.naam}</span>
                    {gekozen && <Check className="h-3 w-3 text-primary" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Vormentaal: hoeken, kaartstijl, ornament */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Hoeken
              </p>
              <div className="flex flex-col gap-1.5">
                {(
                  [
                    { val: 'scherp', label: 'Scherp' },
                    { val: 'zacht', label: 'Zacht' },
                    { val: 'rond', label: 'Rond' },
                  ] as const
                ).map(({ val, label }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => saveTheme({ ...theme, hoeken: val })}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                      theme.hoeken === val
                        ? 'border-primary bg-primary/10 font-medium text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sectiestijl
              </p>
              <div className="flex flex-col gap-1.5">
                {(
                  [
                    { val: 'kaart', label: 'Kaart' },
                    { val: 'accentlijn', label: 'Accentlijn' },
                    { val: 'open', label: 'Open' },
                  ] as const
                ).map(({ val, label }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => saveTheme({ ...theme, kaartStijl: val })}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                      theme.kaartStijl === val
                        ? 'border-primary bg-primary/10 font-medium text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Ornament
              </p>
              <div className="flex flex-col gap-1.5">
                {(
                  [
                    { val: 'geen', label: 'Geen' },
                    { val: 'diamant', label: 'Diamant ◆' },
                    { val: 'blad', label: 'Blad ❧' },
                    { val: 'ster', label: 'Ster ✦' },
                  ] as const
                ).map(({ val, label }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => saveTheme({ ...theme, ornament: val })}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                      theme.ornament === val
                        ? 'border-primary bg-primary/10 font-medium text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Navigatiemenu */}
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Navigatiemenu
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              Toon een navigatiebalk bovenaan de website met links naar de blokken.
            </p>
            <div className="flex items-center gap-3">
              <button
                role="switch"
                aria-checked={theme.navZichtbaar}
                onClick={() => saveTheme({ ...theme, navZichtbaar: !theme.navZichtbaar })}
                className={cn(
                  'relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  theme.navZichtbaar ? 'bg-primary' : 'bg-input'
                )}
              >
                <span
                  className={cn(
                    'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200',
                    theme.navZichtbaar ? 'left-6' : 'left-1'
                  )}
                />
              </button>
              <div className="flex items-center gap-2">
                <Menu className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">
                  {theme.navZichtbaar ? 'Menu zichtbaar' : 'Geen menu (standaard)'}
                </span>
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
            <div className={cn(
              'flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2.5 text-sm',
              slugStatus === 'leeg' ? 'border-destructive' : 'border-border'
            )}>
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
              <p
                className={cn(
                  'mt-1.5 break-all text-xs',
                  slugStatus === 'bezet' || slugStatus === 'ongeldig' || slugStatus === 'leeg'
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
