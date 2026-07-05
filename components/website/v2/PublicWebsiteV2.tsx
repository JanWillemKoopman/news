'use client'

// Publieke trouwwebsite v3: één renderer, aangestuurd door theme-tokens
// (lib/bruiloft/websiteTheme.ts) en blokken (lib/bruiloft/websiteBlocks.ts).
// De zes oude templates leven voort als theme-presets; deze renderer is de
// enige plek met markup. Zie trouwwebsite-roadmap.md.

import { ChevronDown, Gift, Lock, Menu, X } from 'lucide-react'
import * as React from 'react'

import { formatDatumNL } from '@/lib/bruiloft/format'
import type { FaqItem, GallerijFoto, WeddingLettertype, WeddingThema } from '@/lib/bruiloft/types'
import type { Block, GalerijBlock, HeroBlock, ProgrammaBlock } from '@/lib/bruiloft/websiteBlocks'
import { heeftInhoud } from '@/lib/bruiloft/websiteBlocks'
import {
  HOEK_RADIUS,
  LETTERTYPE_CSS_VAR,
  ORNAMENT_TEKEN,
  hexNaarHsl,
  themeVanLegacy,
  type ThemeTokens,
} from '@/lib/bruiloft/websiteTheme'

// ─── Datavorm van get_public_website_v2 ──────────────────────────────────────

export interface ScheduleRegel {
  tijd: string
  eindtijd: string
  titel: string
  omschrijving: string
  locatie: string
}

export interface PublicPage {
  id: string
  titel: string
  pageSlug: string
  volgorde: number
  blocks: Block[]
}

export interface PublicWebsiteV2Data {
  wedding: {
    partner1Naam: string
    partner2Naam: string
    trouwdatum: string | null
    locatie: string
  }
  theme: ThemeTokens | null
  fallback: {
    thema: WeddingThema
    kleurAccent: string
    kopLettertype: WeddingLettertype
  }
  pages: PublicPage[]
  schedule: ScheduleRegel[]
}

export interface RegistryMeta {
  enabled: boolean
  passwordRequired: boolean
  introText: string
}

interface RenderContext {
  theme: ThemeTokens
  wedding: PublicWebsiteV2Data['wedding']
  schedule: ScheduleRegel[]
  registry?: RegistryMeta | null
  slug?: string
}

// ─── Theme → CSS-variabelen ──────────────────────────────────────────────────

function themeCssVars(theme: ThemeTokens): React.CSSProperties {
  return {
    '--primary': hexNaarHsl(theme.kleuren.accent),
    '--primary-foreground': '0 0% 100%',
    '--site-bg': theme.kleuren.achtergrond,
    '--site-card': theme.kleuren.kaart,
    '--site-text': theme.kleuren.tekst,
    '--site-muted': theme.kleuren.gedempt,
    '--site-radius': HOEK_RADIUS[theme.hoeken],
    '--heading-font': LETTERTYPE_CSS_VAR[theme.kopLettertype],
  } as React.CSSProperties
}

function kopStijl(theme: ThemeTokens): React.CSSProperties {
  return {
    fontFamily: 'var(--heading-font)',
    fontStyle: theme.kopCursief ? 'italic' : 'normal',
    color: 'var(--site-text)',
  }
}

// ─── Kleine gedeelde onderdelen ──────────────────────────────────────────────

function Ornament({ theme, klein }: { theme: ThemeTokens; klein?: boolean }) {
  if (theme.ornament === 'geen') {
    return klein ? null : (
      <div className="mx-auto my-3 h-px w-14" style={{ background: 'hsl(var(--primary))' }} />
    )
  }
  const teken = ORNAMENT_TEKEN[theme.ornament]
  return (
    <div className="my-3 flex items-center justify-center gap-3">
      <div className="h-px flex-1 max-w-[70px]" style={{ background: 'hsl(var(--primary)/0.25)' }} />
      <span style={{ color: 'hsl(var(--primary)/0.55)', fontSize: klein ? '9px' : '12px', letterSpacing: '4px' }}>
        {teken}
      </span>
      <div className="h-px flex-1 max-w-[70px]" style={{ background: 'hsl(var(--primary)/0.25)' }} />
    </div>
  )
}

function CountdownBlok({ trouwdatum, uitlijning }: { trouwdatum: string | null; uitlijning?: 'links' | 'midden' | 'rechts' }) {
  const [rest, setRest] = React.useState({ dagen: 0, uren: 0, minuten: 0, seconden: 0, voorbij: false })

  React.useEffect(() => {
    if (!trouwdatum) return
    function bereken() {
      const diff = new Date(trouwdatum + 'T00:00:00').getTime() - Date.now()
      if (diff <= 0) {
        setRest({ dagen: 0, uren: 0, minuten: 0, seconden: 0, voorbij: true })
        return
      }
      setRest({
        dagen: Math.floor(diff / 86400000),
        uren: Math.floor((diff % 86400000) / 3600000),
        minuten: Math.floor((diff % 3600000) / 60000),
        seconden: Math.floor((diff % 60000) / 1000),
        voorbij: false,
      })
    }
    bereken()
    const id = setInterval(bereken, 1000)
    return () => clearInterval(id)
  }, [trouwdatum])

  if (!trouwdatum) return null
  if (rest.voorbij) return <p className="text-center text-lg font-medium">🎉 Gefeliciteerd!</p>

  const align = uitlijning === 'links' ? 'justify-start' : uitlijning === 'rechts' ? 'justify-end' : 'justify-center'
  return (
    <div className={`flex flex-wrap gap-4 sm:gap-6 ${align}`}>
      {[
        { val: rest.dagen, label: 'Dagen' },
        { val: rest.uren, label: 'Uren' },
        { val: rest.minuten, label: 'Minuten' },
        { val: rest.seconden, label: 'Seconden' },
      ].map(({ val, label }) => (
        <div key={label} className="flex min-w-[3.5rem] flex-col items-center gap-1.5">
          <span className="text-4xl font-bold tabular-nums leading-none" style={{ color: 'hsl(var(--primary))' }}>
            {String(val).padStart(2, '0')}
          </span>
          <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--site-muted)' }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = React.useState<string | null>(null)
  return (
    <ul className="divide-y" style={{ borderColor: 'hsl(var(--primary)/0.12)' }}>
      {items.map((item) => (
        <li key={item.id}>
          <button
            onClick={() => setOpen(open === item.id ? null : item.id)}
            className="flex w-full items-center justify-between gap-3 py-3 text-left"
          >
            <span className="font-medium" style={{ color: 'var(--site-text)' }}>{item.vraag}</span>
            <ChevronDown
              className={'h-4 w-4 shrink-0 transition-transform ' + (open === item.id ? 'rotate-180' : '')}
              style={{ color: 'var(--site-muted)' }}
            />
          </button>
          {open === item.id && (
            <p className="pb-3 text-sm" style={{ color: 'var(--site-muted)' }}>{item.antwoord}</p>
          )}
        </li>
      ))}
    </ul>
  )
}

function Galerij({ fotos, stijl }: { fotos: GallerijFoto[]; stijl: 'raster' | 'masonry' }) {
  if (stijl === 'masonry') {
    return (
      <div style={{ columns: '2', columnGap: '8px' }}>
        {fotos.map((f) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={f.id}
            src={f.url}
            alt={f.bijschrift || ''}
            style={{ breakInside: 'avoid', marginBottom: '8px', display: 'block', width: '100%', borderRadius: 'var(--site-radius)' }}
          />
        ))}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {fotos.map((f) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={f.id}
          src={f.url}
          alt={f.bijschrift || ''}
          className="aspect-square w-full object-cover"
          style={{ borderRadius: 'var(--site-radius)' }}
        />
      ))}
    </div>
  )
}

function Programma({ block, schedule }: { block: ProgrammaBlock; schedule: ScheduleRegel[] }) {
  if (block.bron === 'eigen') {
    return <p className="whitespace-pre-line" style={{ color: 'var(--site-muted)' }}>{block.eigenTekst}</p>
  }
  return (
    <ul className="space-y-3">
      {schedule.map((s, i) => (
        <li key={i} className="flex gap-4 text-left">
          <div className="shrink-0 text-center" style={{ minWidth: '3.5rem' }}>
            <span className="font-semibold tabular-nums" style={{ color: 'hsl(var(--primary))' }}>{s.tijd}</span>
            {s.eindtijd && (
              <p className="text-xs tabular-nums" style={{ color: 'var(--site-muted)' }}>&ndash;&nbsp;{s.eindtijd}</p>
            )}
          </div>
          <div>
            <p className="font-medium" style={{ color: 'var(--site-text)' }}>{s.titel}</p>
            {s.omschrijving && <p className="text-sm" style={{ color: 'var(--site-muted)' }}>{s.omschrijving}</p>}
            {s.locatie && <p className="text-sm" style={{ color: 'var(--site-muted)' }}>{s.locatie}</p>}
          </div>
        </li>
      ))}
    </ul>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero({ block, ctx }: { block: HeroBlock; ctx: RenderContext }) {
  const { wedding, theme } = ctx
  const heeftFoto = !!block.fotoUrl
  return (
    <section className="relative flex min-h-[65vh] items-center justify-center overflow-hidden">
      {heeftFoto ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.fotoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${block.overlay ?? 0.35})` }} />
        </>
      ) : (
        <div className="absolute inset-0" style={{ background: 'var(--site-card)' }} />
      )}
      <div className="relative z-10 px-8 py-24 text-center" style={{ color: heeftFoto ? 'white' : 'var(--site-text)' }}>
        <Ornament theme={theme} />
        <h1
          style={{
            fontFamily: 'var(--heading-font)',
            fontStyle: theme.kopCursief ? 'italic' : 'normal',
            fontSize: 'clamp(2.5rem, 7vw, 5rem)',
            lineHeight: 1.2,
          }}
        >
          {wedding.partner1Naam}
          {' '}
          <em style={{ color: heeftFoto ? 'rgba(255,255,255,0.75)' : 'hsl(var(--primary))' }}>&amp;</em>
          {' '}
          {wedding.partner2Naam}
        </h1>
        <Ornament theme={theme} />
        <div className="mt-1 flex flex-wrap items-center justify-center gap-3" style={{ opacity: 0.8, fontSize: '0.85rem', letterSpacing: '0.1em' }}>
          {wedding.trouwdatum && <span>{formatDatumNL(wedding.trouwdatum)}</span>}
          {wedding.trouwdatum && wedding.locatie && <span style={{ fontSize: '7px' }}>◆</span>}
          {wedding.locatie && <span>{wedding.locatie}</span>}
        </div>
        {block.ondertitel && (
          <p className="mx-auto mt-4 max-w-md text-sm" style={{ opacity: 0.85 }}>{block.ondertitel}</p>
        )}
      </div>
    </section>
  )
}

// ─── Sectie-omhulsel (kaartstijl uit het thema) ──────────────────────────────

function SectieOmhulsel({
  block,
  theme,
  children,
}: {
  block: Exclude<Block, HeroBlock>
  theme: ThemeTokens
  children: React.ReactNode
}) {
  const layout = block.layout
  const titel = 'titel' in block ? block.titel : ''
  const uitlijnKlas =
    layout?.uitlijning === 'links' ? 'text-left' : layout?.uitlijning === 'rechts' ? 'text-right' : 'text-center'

  const sectieStijl: React.CSSProperties = layout?.achtergrondKleur
    ? {
        backgroundColor: layout.achtergrondKleur,
        ...(layout.tekstKleur === 'licht'
          ? ({ '--site-text': '#ffffff', '--site-muted': 'rgba(255,255,255,0.72)' } as React.CSSProperties)
          : layout.tekstKleur === 'donker'
            ? ({ '--site-text': '#1a1a1a', '--site-muted': 'rgba(0,0,0,0.6)' } as React.CSSProperties)
            : {}),
      }
    : {}

  const kop = titel ? (
    layout?.kopFotoUrl ? (
      <div className="relative mb-6 h-40 overflow-hidden" style={{ borderRadius: 'var(--site-radius)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={layout.kopFotoUrl} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent px-6 pb-4">
          <h2 className="text-2xl text-white" style={{ fontFamily: 'var(--heading-font)', fontStyle: theme.kopCursief ? 'italic' : 'normal' }}>
            {titel}
          </h2>
        </div>
      </div>
    ) : theme.kaartStijl === 'accentlijn' ? (
      <div className="mb-6 flex items-center gap-4">
        <div className="w-1 self-stretch rounded-full" style={{ background: 'hsl(var(--primary))' }} />
        <h2 className="text-2xl" style={kopStijl(theme)}>{titel}</h2>
      </div>
    ) : (
      <div className="mb-6 text-center">
        <h2 className="text-2xl" style={kopStijl(theme)}>{titel}</h2>
        <Ornament theme={theme} klein />
      </div>
    )
  ) : null

  const inhoud =
    theme.kaartStijl === 'kaart' ? (
      <div
        className="border p-6 shadow-sm"
        style={{
          background: layout?.achtergrondKleur ? 'transparent' : 'var(--site-card)',
          borderColor: 'hsl(var(--primary)/0.12)',
          borderRadius: 'var(--site-radius)',
        }}
      >
        {children}
      </div>
    ) : (
      children
    )

  return (
    <section id={`b-${block.id}`} className={`scroll-mt-24 px-4 py-10 ${uitlijnKlas}`} style={sectieStijl}>
      <div className="mx-auto max-w-xl">
        {theme.kaartStijl === 'open' && (
          <div className="mb-8 h-px w-full" style={{ background: 'hsl(var(--primary)/0.15)' }} />
        )}
        {kop}
        {inhoud}
      </div>
    </section>
  )
}

// ─── Blok-inhoud ─────────────────────────────────────────────────────────────

function BlockInhoud({ block, ctx }: { block: Exclude<Block, HeroBlock>; ctx: RenderContext }) {
  switch (block.type) {
    case 'tekst':
      return <p className="whitespace-pre-line text-lg" style={{ color: 'var(--site-text)' }}>{block.tekst}</p>
    case 'tekstFoto': {
      const foto = block.fotoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={block.fotoUrl} alt="" className="h-56 w-full object-cover sm:h-full" style={{ borderRadius: 'var(--site-radius)' }} />
      )
      return (
        <div className="grid items-center gap-6 text-left sm:grid-cols-2">
          {block.fotoPositie === 'links' && foto}
          <p className="whitespace-pre-line" style={{ color: 'var(--site-text)' }}>{block.tekst}</p>
          {block.fotoPositie === 'rechts' && foto}
        </div>
      )
    }
    case 'programma':
      return <Programma block={block} schedule={ctx.schedule} />
    case 'countdown':
      return <CountdownBlok trouwdatum={block.datum || ctx.wedding.trouwdatum} uitlijning={block.layout?.uitlijning} />
    case 'galerij':
      return <Galerij fotos={block.fotos} stijl={block.stijl} />
    case 'faq':
      return <FaqAccordion items={block.items} />
    case 'cadeaulijst':
      if (ctx.registry?.enabled) {
        return (
          <div className="space-y-4">
            {ctx.registry.introText && (
              <p className="whitespace-pre-line" style={{ color: 'var(--site-muted)' }}>{ctx.registry.introText}</p>
            )}
            <div className="flex justify-center">
              <a
                href={`/trouwen/${ctx.slug}/cadeaulijst`}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                style={{ background: 'hsl(var(--primary))', borderRadius: 'var(--site-radius)' }}
              >
                <Gift className="h-4 w-4" />
                Bekijk de cadeaulijst
                {ctx.registry.passwordRequired && <Lock className="h-3.5 w-3.5 opacity-70" />}
              </a>
            </div>
          </div>
        )
      }
      return <p className="whitespace-pre-line" style={{ color: 'var(--site-muted)' }}>{block.tekst}</p>
    case 'contact':
      return <p className="whitespace-pre-line" style={{ color: 'var(--site-muted)' }}>{block.tekst}</p>
    case 'scheiding':
      return <Ornament theme={ctx.theme} />
  }
}

// ─── Navigatie ───────────────────────────────────────────────────────────────

function Navigatie({ blokken, ctx }: { blokken: Block[]; ctx: RenderContext }) {
  const { theme, wedding, registry, slug } = ctx
  const [open, setOpen] = React.useState(false)

  const items = blokken
    .filter((b): b is Exclude<Block, HeroBlock> => b.type !== 'hero' && b.type !== 'scheiding')
    .filter((b) => 'titel' in b && b.titel && b.type !== 'cadeaulijst')

  const navKleuren =
    theme.navStijl === 'accent'
      ? { bg: 'hsl(var(--primary))', tekst: 'rgba(255,255,255,0.9)', link: 'rgba(255,255,255,0.65)' }
      : theme.navStijl === 'donker'
        ? { bg: 'hsl(30 15% 16%)', tekst: 'rgba(255,255,255,0.88)', link: 'rgba(255,255,255,0.55)' }
        : { bg: 'color-mix(in srgb, var(--site-bg) 92%, transparent)', tekst: 'var(--site-text)', link: 'var(--site-muted)' }

  return (
    <nav className="sticky top-0 z-40 backdrop-blur-sm" style={{ background: navKleuren.bg, boxShadow: '0 1px 0 hsl(var(--primary)/0.12)' }}>
      <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
        <span className="text-sm font-medium" style={{ color: navKleuren.tekst, fontFamily: 'var(--heading-font)' }}>
          {wedding.partner1Naam} &amp; {wedding.partner2Naam}
        </span>
        <ul className="hidden items-center gap-5 md:flex">
          {items.map((b) => (
            <li key={b.id}>
              <a
                href={`#b-${b.id}`}
                className="text-[10px] uppercase tracking-widest transition-opacity hover:opacity-100"
                style={{ color: navKleuren.link, opacity: 0.9 }}
              >
                {'titel' in b ? b.titel : ''}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-3">
          {registry?.enabled && slug && (
            <a
              href={`/trouwen/${slug}/cadeaulijst`}
              className="hidden items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] md:inline-flex"
              style={{ color: navKleuren.tekst, borderColor: 'hsl(var(--primary)/0.35)' }}
            >
              <Gift className="h-3 w-3" />
              Cadeaulijst
              {registry.passwordRequired && <Lock className="h-2.5 w-2.5 opacity-70" />}
            </a>
          )}
          <button className="p-1.5 md:hidden" style={{ color: navKleuren.tekst }} onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t px-5 py-3 md:hidden" style={{ background: navKleuren.bg, borderColor: 'hsl(var(--primary)/0.15)' }}>
          <ul className="space-y-0.5">
            {registry?.enabled && slug && (
              <li>
                <a
                  href={`/trouwen/${slug}/cadeaulijst`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 py-2.5 text-[11px] font-semibold uppercase tracking-widest"
                  style={{ color: navKleuren.tekst }}
                >
                  <Gift className="h-3.5 w-3.5" /> Cadeaulijst
                </a>
              </li>
            )}
            {items.map((b) => (
              <li key={b.id}>
                <a
                  href={`#b-${b.id}`}
                  onClick={() => setOpen(false)}
                  className="block py-2.5 text-[11px] uppercase tracking-widest"
                  style={{ color: navKleuren.link }}
                >
                  {'titel' in b ? b.titel : ''}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  )
}

// ─── Hoofdcomponent ──────────────────────────────────────────────────────────

export function PublicWebsiteV2({
  data,
  registry,
  slug,
  activePageSlug = '',
}: {
  data: PublicWebsiteV2Data
  registry?: RegistryMeta | null
  slug?: string
  activePageSlug?: string
}) {
  const theme =
    data.theme ??
    themeVanLegacy(data.fallback.thema, data.fallback.kleurAccent, data.fallback.kopLettertype)

  const pagina =
    data.pages.find((p) => p.pageSlug === activePageSlug) ?? data.pages[0]

  const ctx: RenderContext = { theme, wedding: data.wedding, schedule: data.schedule, registry, slug }

  const zichtbaar = (pagina?.blocks ?? []).filter((b) => {
    if (!b.zichtbaar) return false
    if (b.type === 'hero') return true
    // Cadeaulijst-blok toont altijd zodra de cadeaulijst-module aanstaat.
    if (b.type === 'cadeaulijst') return registry?.enabled || heeftInhoud(b)
    if (b.type === 'countdown') return !!(b.datum || data.wedding.trouwdatum)
    if (b.type === 'programma') return b.bron === 'eigen' ? b.eigenTekst.trim().length > 0 : data.schedule.length > 0
    return heeftInhoud(b)
  })

  const hero = zichtbaar.find((b): b is HeroBlock => b.type === 'hero')
  const rest = zichtbaar.filter((b): b is Exclude<Block, HeroBlock> => b.type !== 'hero')

  return (
    <div style={{ ...themeCssVars(theme), background: 'var(--site-bg)', color: 'var(--site-text)' }}>
      {theme.navZichtbaar && <Navigatie blokken={rest} ctx={ctx} />}
      {hero && <Hero block={hero} ctx={ctx} />}
      <main className="pb-24">
        {rest.map((b) => (
          <SectieOmhulsel key={b.id} block={b} theme={theme}>
            <BlockInhoud block={b} ctx={ctx} />
          </SectieOmhulsel>
        ))}
      </main>
    </div>
  )
}
