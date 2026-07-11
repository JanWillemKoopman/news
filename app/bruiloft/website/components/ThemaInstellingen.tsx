'use client'

import { Check, ChevronDown, Menu, Palette } from 'lucide-react'
import * as React from 'react'

import { Input } from '@/components/bruiloft/ui'
import { extraheerPaletUitAfbeelding } from '@/lib/bruiloft/colorExtract'
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

// Elk thema is een eigen structurele renderer (layout, componenten en
// bewegingstaal) — zie components/website/v2/themes/README.md.
const PRESET_INFO: { id: WeddingThema; naam: string; beschrijving: string }[] = [
  { id: 'klassiek', naam: 'The Atelier', beschrijving: 'Gedrukte uitnodiging — ingelijst & gecentreerd' },
  { id: 'modern', naam: 'The Editor', beschrijving: 'Magazine — genummerde katernen & marquee' },
  { id: 'romantisch', naam: 'Le Jardin', beschrijving: 'Liefdesbrief — bogen, script & blush' },
  { id: 'rustiek', naam: 'Het Landgoed', beschrijving: 'Veldjournaal — linnen, stempels & polaroids' },
  { id: 'minimalistisch', naam: 'Studio', beschrijving: 'Galeriecatalogus — louter typografie' },
  { id: 'botanisch', naam: 'De Tuin', beschrijving: 'Serre — bladvormen & rankende takken' },
  { id: 'gala', naam: 'The Crest', beschrijving: 'Zwarte-das-uitnodiging — wapenschild, marmer & goud' },
  { id: 'artdeco', naam: 'The Savoy', beschrijving: 'Glamourclub — jaren ’20, waaiers & smaragd' },
  { id: 'couture', naam: 'The Cover', beschrijving: 'Modetijdschrift — Bodoni-koppen in zwart-wit' },
]

// Mini-wireframe per archetype: laat het structuurverschil zien, niet
// alleen de kleuren.
function ThumbnailSchets({ id, tokens }: { id: WeddingThema; tokens: ThemeTokens }) {
  const accent = tokens.kleuren.accent
  const basis = 'relative h-16 overflow-hidden rounded-lg border border-border/50'
  const stijl = { background: tokens.kleuren.achtergrond }

  switch (id) {
    case 'klassiek': // ingelijst & gecentreerd, medaillon
      return (
        <div className={basis} style={stijl}>
          <div className="absolute inset-1.5 rounded-[2px] border" style={{ borderColor: accent + '66' }} />
          <div className="absolute inset-2.5 rounded-[2px] border" style={{ borderColor: accent + '33' }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <div className="h-2.5 w-2.5 rounded-full border" style={{ borderColor: accent }} />
            <div className="h-1 w-1/2 rounded" style={{ background: accent + 'aa' }} />
            <div className="h-0.5 w-1/4 rounded" style={{ background: accent + '55' }} />
          </div>
        </div>
      )
    case 'modern': // genummerd katern, links uitgelijnd, marquee
      return (
        <div className={basis} style={stijl}>
          <div className="absolute inset-x-2 top-2 h-0.5" style={{ background: tokens.kleuren.tekst }} />
          <span className="absolute left-2 top-3 text-[7px] font-bold leading-none" style={{ color: accent }}>Nº 01</span>
          <div className="absolute left-2 top-6 h-1.5 w-3/5 rounded-sm" style={{ background: tokens.kleuren.tekst + 'dd' }} />
          <div className="absolute left-2 top-9 h-1 w-2/5 rounded-sm" style={{ background: tokens.kleuren.tekst + '66' }} />
          <div className="absolute inset-x-0 bottom-0 flex h-3 items-center gap-1 border-t px-1" style={{ borderColor: tokens.kleuren.tekst }}>
            {[8, 5, 7, 4, 6].map((w, i) => (
              <span key={i} className="h-0.5 rounded" style={{ width: w * 3, background: tokens.kleuren.tekst + '99' }} />
            ))}
          </div>
        </div>
      )
    case 'romantisch': // boogfoto, script, pill
      return (
        <div className={basis} style={stijl}>
          <div
            className="absolute left-1/2 top-2 h-9 w-8 -translate-x-1/2 border"
            style={{ background: accent + '44', borderColor: accent + '66', borderRadius: '999px 999px 3px 3px' }}
          />
          <div className="absolute bottom-4 left-1/2 h-1 w-1/2 -translate-x-1/2 rounded" style={{ background: accent + 'aa' }} />
          <div className="absolute bottom-1.5 left-1/2 h-1.5 w-1/3 -translate-x-1/2 rounded-full border" style={{ borderColor: accent + '77' }} />
        </div>
      )
    case 'rustiek': // split + stempel
      return (
        <div className={basis} style={stijl}>
          <div className="absolute inset-y-0 left-0 w-2/5" style={{ background: accent + '55' }} />
          <div className="absolute right-2 top-2 h-4 w-6 rotate-[-6deg] border border-dashed" style={{ borderColor: accent, borderRadius: '2px' }} />
          <div className="absolute left-[45%] top-7 h-1 w-2/5 rounded" style={{ background: tokens.kleuren.tekst + 'aa' }} />
          <div className="absolute left-[45%] top-10 h-0.5 w-1/4 rounded" style={{ background: tokens.kleuren.tekst + '55' }} />
        </div>
      )
    case 'minimalistisch': // haarlijnen, indexnummer, poster-typo linksonder
      return (
        <div className={basis} style={stijl}>
          <div className="absolute inset-x-2 top-2 h-px" style={{ background: tokens.kleuren.tekst }} />
          <span className="absolute left-2 top-3 text-[6px] uppercase tracking-widest" style={{ color: tokens.kleuren.gedempt }}>01</span>
          <div className="absolute bottom-3 left-2 h-2 w-3/5 rounded-sm" style={{ background: tokens.kleuren.tekst + 'cc' }} />
          <span className="absolute bottom-3 right-2 text-[6px]" style={{ color: tokens.kleuren.gedempt }}>—</span>
        </div>
      )
    case 'botanisch': // bladvormen + meander
      return (
        <div className={basis} style={stijl}>
          <div className="absolute left-2 top-2 h-7 w-7" style={{ background: accent + '77', borderRadius: '58% 6% 58% 6%' }} />
          <div className="absolute right-2 top-3 h-1 w-2/5 rounded" style={{ background: tokens.kleuren.tekst + 'aa' }} />
          <div className="absolute right-2 top-6 h-0.5 w-1/4 rounded" style={{ background: tokens.kleuren.tekst + '55' }} />
          <div className="absolute bottom-2 right-3 h-5 w-5" style={{ background: accent + '44', borderRadius: '6% 58% 6% 58%' }} />
          <div className="absolute bottom-4 left-2 h-0.5 w-1/3 rounded" style={{ background: accent + '88' }} />
        </div>
      )
    case 'gala': // wapenschild, dubbele graveerlijst
      return (
        <div className={basis} style={stijl}>
          <div className="absolute inset-1.5 border" style={{ borderColor: accent + '88' }} />
          <div className="absolute inset-[7px] border" style={{ borderColor: accent + '40' }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <div className="h-2 w-2 rounded-sm border" style={{ borderColor: accent, transform: 'rotate(45deg)' }} />
            <div className="h-1 w-2/5 rounded-sm" style={{ background: tokens.kleuren.tekst + 'aa' }} />
          </div>
        </div>
      )
    case 'artdeco': // donker, zonnestraal + getrapte hoek
      return (
        <div className={basis} style={stijl}>
          <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 120%, ' + accent + '33, transparent 60%)' }} />
          <div className="absolute left-0 top-0 h-4 w-4" style={{ borderTop: `2px solid ${accent}`, borderLeft: `2px solid ${accent}` }} />
          <div className="absolute bottom-0 right-0 h-4 w-4" style={{ borderBottom: `2px solid ${accent}`, borderRight: `2px solid ${accent}` }} />
          <div className="absolute inset-x-0 bottom-3 flex justify-center">
            <div className="h-1.5 w-1.5 rounded-sm" style={{ background: accent, transform: 'rotate(45deg)' }} />
          </div>
        </div>
      )
    case 'couture': // mastkop-balk + monumentale letter
      return (
        <div className={basis} style={stijl}>
          <div className="absolute inset-x-2 top-2 flex items-center justify-between border-b border-t py-0.5" style={{ borderColor: tokens.kleuren.tekst }}>
            <span className="text-[6px] font-bold" style={{ color: accent }}>Nº 01</span>
            <span className="text-[6px] font-bold" style={{ color: accent }}>—</span>
          </div>
          <div className="absolute inset-x-0 bottom-1.5 text-center text-xl font-bold leading-none" style={{ color: tokens.kleuren.tekst, fontFamily: 'Georgia, serif' }}>
            Aa
          </div>
        </div>
      )
  }
}

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

interface Props {
  content: WebsiteContent
  theme: ThemeTokens
  // Fase 4: huidige headerfoto (uit het hero-blok) — als aanwezig, worden
  // hieruit automatisch een paar accentkleur-suggesties gehaald.
  headerFotoUrl?: string
}

export function ThemaInstellingen({ content, theme, headerFotoUrl }: Props) {
  const saveWebsiteContent = useBruiloftStore((s) => s.saveWebsiteContent)
  const [open, setOpen] = React.useState(false)
  const [kleurSuggesties, setKleurSuggesties] = React.useState<string[]>([])

  React.useEffect(() => {
    let actief = true
    if (!headerFotoUrl) {
      setKleurSuggesties([])
      return
    }
    void extraheerPaletUitAfbeelding(headerFotoUrl).then((kleuren) => {
      if (actief) setKleurSuggesties(kleuren)
    })
    return () => { actief = false }
  }, [headerFotoUrl])

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
                    <ThumbnailSchets id={p.id} tokens={tokens} />
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

            {kleurSuggesties.length > 0 && (
              <div className="mt-3">
                <p className="mb-1.5 text-xs text-muted-foreground">Suggesties uit je headerfoto</p>
                <div className="flex gap-1.5">
                  {kleurSuggesties.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => saveTheme({ ...theme, kleuren: { ...theme.kleuren, accent: k } })}
                      className={cn(
                        'h-8 w-8 rounded-md border-2 transition-transform hover:scale-110',
                        theme.kleuren.accent === k ? 'border-foreground shadow-sm' : 'border-transparent'
                      )}
                      style={{ background: k }}
                      title={k}
                    />
                  ))}
                </div>
              </div>
            )}
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
        </div>
      )}
    </div>
  )
}
