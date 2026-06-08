'use client'

import {
  CalendarHeart,
  ChevronDown,
  Clock,
  Gift,
  Heart,
  HelpCircle,
  Hotel,
  Image,
  Lock,
  MapPin,
  Menu,
  Phone,
  Shirt,
  X,
} from 'lucide-react'
import * as React from 'react'

import { formatDatumNL } from '@/lib/bruiloft/format'
import type { FaqItem, GallerijFoto, SectieConfig, WeddingLettertype, WeddingThema } from '@/lib/bruiloft/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PublicWebsiteData {
  wedding: {
    partner1Naam: string
    partner2Naam: string
    trouwdatum: string | null
    locatie: string
  }
  content: {
    thema: WeddingThema
    kleurAccent: string
    kopLettertype: WeddingLettertype
    headerFotoUrl: string
    headerOverlay: number
    welkomsttekst: string
    dresscode: string
    cadeaulijst: string
    hotels: string
    routebeschrijving: string
    contact: string
    faq: FaqItem[]
    gallerij: GallerijFoto[]
    sectiesConfig: Record<string, SectieConfig>
  }
  schedule: { tijd: string; titel: string; omschrijving: string; locatie: string }[]
}

interface SectieItem {
  id: string
  label: string
  icoon: React.ReactNode
  fotoUrl?: string
  bgStijl?: React.CSSProperties
  render: () => React.ReactNode
}

interface TplProps {
  data: PublicWebsiteData
  secties: SectieItem[]
  headingFont: string
  registry?: RegistryMeta | null
  slug?: string
  toonMenu?: boolean
}

interface RegistryMeta {
  enabled: boolean
  passwordRequired: boolean
  introText: string
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function hexNaarHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

const LETTERTYPE_VAR: Record<WeddingLettertype, string> = {
  cormorant:        'var(--font-serif)',
  playfair:         'var(--font-playfair)',
  lora:             'var(--font-lora)',
  'dancing-script': 'var(--font-dancing)',
  'eb-garamond':    'var(--font-garamond)',
  'great-vibes':    'var(--font-vibes)',
}

const DEFAULT_ORDER: Record<string, number> = {
  welkom: 0, programma: 1, countdown: 2, dresscode: 3, cadeaulijst: 4,
  hotels: 5, routebeschrijving: 6, faq: 7, fotos: 8, contact: 9,
}

function CountdownBlok({ trouwdatum, uitlijning }: { trouwdatum: string | null; uitlijning?: 'links' | 'midden' | 'rechts' }) {
  const [rest, setRest] = React.useState({ dagen: 0, uren: 0, minuten: 0, seconden: 0, voorbij: false })

  React.useEffect(() => {
    if (!trouwdatum) return
    function bereken() {
      const nu = Date.now()
      const doel = new Date(trouwdatum + 'T00:00:00').getTime()
      const diff = doel - nu
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
  if (rest.voorbij) return <p className="text-center text-lg font-medium text-foreground">🎉 Gefeliciteerd!</p>

  const align = uitlijning === 'links' ? 'justify-start' : uitlijning === 'rechts' ? 'justify-end' : 'justify-center'

  return (
    <div className={`flex flex-wrap gap-4 sm:gap-6 ${align}`}>
      {[
        { val: rest.dagen, label: 'Dagen' },
        { val: rest.uren, label: 'Uren' },
        { val: rest.minuten, label: 'Minuten' },
        { val: rest.seconden, label: 'Seconden' },
      ].map(({ val, label }) => (
        <div key={label} className="flex flex-col items-center gap-1.5 min-w-[3.5rem]">
          <span className="text-4xl font-bold tabular-nums leading-none" style={{ color: 'hsl(var(--primary))' }}>
            {String(val).padStart(2, '0')}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  )
}


function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = React.useState<string | null>(null)
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.id}>
          <button
            onClick={() => setOpen(open === item.id ? null : item.id)}
            className="flex w-full items-center justify-between gap-3 py-3 text-left"
          >
            <span className="font-medium text-foreground">{item.vraag}</span>
            <ChevronDown className={'h-4 w-4 shrink-0 text-muted-foreground transition-transform ' + (open === item.id ? 'rotate-180' : '')} />
          </button>
          {open === item.id && <p className="pb-3 text-sm text-muted-foreground">{item.antwoord}</p>}
        </li>
      ))}
    </ul>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 1 — THE ATELIER (Klassiek)
// Tijdloos Europese elegantie. Ornamentele typografie, gecentreerd,
// geraffineerde detaillering. Geïnspireerd op Riley & Grey "Aesthete".
// ═══════════════════════════════════════════════════════════════════════════════

function RegistryNavButton({ slug, passwordRequired, variant = 'light', absolute = false }: { slug: string; passwordRequired: boolean; variant?: 'light' | 'dark' | 'primary'; absolute?: boolean }) {
  const pos = absolute ? 'absolute right-4 top-1/2 -translate-y-1/2 hidden md:inline-flex' : 'hidden md:inline-flex'
  const base = `${pos} items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors shrink-0`
  const styles = {
    light:   `${base} border text-primary hover:bg-primary/5`,
    dark:    `${base} border-white/30 text-white/80 hover:text-white hover:border-white/60`,
    primary: `${base} bg-white/15 text-white hover:bg-white/25`,
  }
  return (
    <a href={`/trouwen/${slug}/cadeaulijst`} className={styles[variant]} style={variant === 'light' ? { borderColor: 'hsl(var(--primary)/0.35)' } : undefined}>
      <Gift className="h-3 w-3" />
      Cadeaulijst
      {passwordRequired && <Lock className="h-2.5 w-2.5 opacity-70" />}
    </a>
  )
}

function RegistryMobileMenuItem({ slug, onClose }: { slug: string; onClose: () => void }) {
  return (
    <li>
      <a
        href={`/trouwen/${slug}/cadeaulijst`}
        onClick={onClose}
        className="flex items-center gap-2 py-2.5 text-[11px] font-semibold uppercase tracking-widest"
        style={{ color: 'hsl(var(--primary))' }}
      >
        <Gift className="h-3.5 w-3.5" />
        Cadeaulijst
      </a>
    </li>
  )
}

function AterlierOrnament() {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px" style={{ background: 'hsl(var(--primary) / 0.25)' }} />
      <span style={{ color: 'hsl(var(--primary) / 0.5)', fontSize: '7px', letterSpacing: '4px' }}>◆◆◆</span>
      <div className="flex-1 h-px" style={{ background: 'hsl(var(--primary) / 0.25)' }} />
    </div>
  )
}

function KlassiekTemplate({ data, secties, headingFont, registry, slug, toonMenu }: TplProps) {
  const { wedding, content } = data
  const [mOpen, setMOpen] = React.useState(false)
  const heeftFoto = !!content.headerFotoUrl

  return (
    <div className="bg-white">
      {/* NAV: double-bar, centered, dots between items */}
      {toonMenu && <nav className="sticky top-0 z-40 bg-white/96 backdrop-blur-sm" style={{ boxShadow: '0 1px 0 hsl(var(--primary)/0.12)' }}>
        <div className="relative py-3 text-center border-b" style={{ borderColor: 'hsl(var(--primary)/0.1)' }}>
          <p className="text-[11px] tracking-[0.25em] uppercase text-muted-foreground">
            {wedding.partner1Naam} &amp; {wedding.partner2Naam}
          </p>
          {registry?.enabled && slug && (
            <RegistryNavButton slug={slug} passwordRequired={registry.passwordRequired} variant="light" absolute />
          )}
        </div>
        <div className="hidden md:flex justify-center items-center gap-1 py-2 overflow-x-auto">
          {secties.filter(s => s.id !== 'cadeaulijst').map((s, i) => (
            <React.Fragment key={s.id}>
              {i > 0 && <span className="text-muted-foreground/20 mx-2.5 text-[10px]">·</span>}
              <a href={`#${s.id}`} className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground hover:text-primary transition-colors px-1">
                {s.label}
              </a>
            </React.Fragment>
          ))}
        </div>
        <button className="md:hidden absolute right-4 top-2.5 p-2 text-muted-foreground" onClick={() => setMOpen(!mOpen)}>
          {mOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        {mOpen && (
          <div className="md:hidden bg-white border-t px-6 py-3" style={{ borderColor: 'hsl(var(--primary)/0.1)' }}>
            <ul className="space-y-0.5">
              {registry?.enabled && slug && <RegistryMobileMenuItem slug={slug} onClose={() => setMOpen(false)} />}
              {secties.filter(s => s.id !== 'cadeaulijst').map(s => (
                <li key={s.id}>
                  <a href={`#${s.id}`} onClick={() => setMOpen(false)} className="block py-2.5 text-[11px] tracking-widest uppercase text-muted-foreground hover:text-primary">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>}

      {/* HERO */}
      <section className="relative flex min-h-[65vh] items-center justify-center overflow-hidden">
        {heeftFoto
          ? <><img src={content.headerFotoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${content.headerOverlay ?? 0.35})` }} /></>
          : <div className="absolute inset-0" style={{ background: 'hsl(30 20% 97%)' }} />}
        <div className="relative z-10 px-8 py-24 text-center" style={{ color: heeftFoto ? 'white' : 'inherit' }}>
          <AterlierOrnament />
          <h1 style={{ fontFamily: headingFont, fontSize: 'clamp(2.5rem, 7vw, 5rem)', lineHeight: 1.25 }}>
            {wedding.partner1Naam}
            {' '}<em style={{ color: heeftFoto ? 'rgba(255,255,255,0.75)' : 'hsl(var(--primary))' }}>&</em>{' '}
            {wedding.partner2Naam}
          </h1>
          <AterlierOrnament />
          <div className="flex flex-wrap items-center justify-center gap-3 mt-1" style={{ opacity: 0.75, fontSize: '0.8rem', letterSpacing: '0.12em' }}>
            {wedding.trouwdatum && <span>{formatDatumNL(wedding.trouwdatum)}</span>}
            {wedding.trouwdatum && wedding.locatie && <span style={{ fontSize: '6px', color: heeftFoto ? 'white' : 'hsl(var(--primary))' }}>◆</span>}
            {wedding.locatie && <span>{wedding.locatie}</span>}
          </div>
        </div>
      </section>

      {/* SECTIONS */}
      <main className="mx-auto max-w-xl px-4 pb-24">
        {secties.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-24 py-10" style={s.bgStijl}>
            {s.fotoUrl ? (
              <div className="relative mb-6 h-40 overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.fotoUrl} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent px-6 pb-4">
                  <h2 className="text-2xl text-white" style={{ fontFamily: headingFont }}>{s.label}</h2>
                </div>
              </div>
            ) : (
              <div className="text-center mb-6">
                <h2 className="text-2xl text-foreground" style={{ fontFamily: headingFont }}>{s.label}</h2>
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex-1 h-px" style={{ background: 'hsl(var(--primary)/0.15)' }} />
                  <span style={{ color: 'hsl(var(--primary)/0.4)', fontSize: '7px' }}>◆</span>
                  <div className="flex-1 h-px" style={{ background: 'hsl(var(--primary)/0.15)' }} />
                </div>
              </div>
            )}
            <div className="rounded-2xl border bg-white p-6 shadow-sm" style={{ borderColor: 'hsl(var(--primary)/0.12)' }}>
              {s.render()}
            </div>
          </section>
        ))}
      </main>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 2 — THE EDITOR (Modern)
// Editoriaal, asymmetrisch split-hero, grote typografie, scherpe randen.
// Geïnspireerd op Riley & Grey "Rolling Stone" / "Signature".
// ═══════════════════════════════════════════════════════════════════════════════

function ModernTemplate({ data, secties, headingFont, registry, slug, toonMenu }: TplProps) {
  const { wedding, content } = data
  const [mOpen, setMOpen] = React.useState(false)
  const heeftFoto = !!content.headerFotoUrl

  return (
    <div className="bg-white">
      {/* NAV: sharp, links/rechts layout */}
      {toonMenu && <nav className="sticky top-0 z-40 bg-white border-b border-black/10">
        <div className="flex items-center justify-between px-6 md:px-12 py-4 max-w-5xl mx-auto">
          <span className="text-xs tracking-[0.2em] uppercase font-medium text-foreground">
            {wedding.partner1Naam} &amp; {wedding.partner2Naam}
          </span>
          <ul className="hidden md:flex gap-8">
            {secties.filter(s => s.id !== 'cadeaulijst').map(s => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3">
            {registry?.enabled && slug && (
              <RegistryNavButton slug={slug} passwordRequired={registry.passwordRequired} variant="light" />
            )}
            <button className="md:hidden p-2 -mr-2 text-muted-foreground" onClick={() => setMOpen(!mOpen)}>
              {mOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {mOpen && (
          <div className="md:hidden border-t border-black/10 bg-white px-6 py-4">
            <ul className="grid grid-cols-2 gap-2">
              {registry?.enabled && slug && <RegistryMobileMenuItem slug={slug} onClose={() => setMOpen(false)} />}
              {secties.filter(s => s.id !== 'cadeaulijst').map(s => (
                <li key={s.id}>
                  <a href={`#${s.id}`} onClick={() => setMOpen(false)} className="block py-2 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>}

      {/* HERO: split layout */}
      <section className="grid grid-cols-1 md:grid-cols-[55%_45%]" style={{ minHeight: '90vh' }}>
        {/* Left: photo */}
        <div className="relative min-h-[45vw] md:min-h-0 order-2 md:order-1 bg-gray-100">
          {heeftFoto && (
            <img src={content.headerFotoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
          {!heeftFoto && <div className="absolute inset-0" style={{ background: 'hsl(var(--primary)/0.07)' }} />}
        </div>
        {/* Right: text block */}
        <div className="flex flex-col justify-center p-8 md:p-14 order-1 md:order-2">
          <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground mb-6">Bruiloft</p>
          <h1 style={{ fontFamily: headingFont, fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
            {wedding.partner1Naam}<br />
            <span style={{ color: 'hsl(var(--primary))' }}>&amp;</span><br />
            {wedding.partner2Naam}
          </h1>
          <div className="mt-1 w-16 h-px" style={{ background: 'hsl(var(--primary))' }} />
          <div className="mt-6 space-y-1">
            {wedding.trouwdatum && (
              <p className="text-xs tracking-[0.15em] uppercase text-muted-foreground">{formatDatumNL(wedding.trouwdatum)}</p>
            )}
            {wedding.locatie && (
              <p className="text-xs text-muted-foreground">{wedding.locatie}</p>
            )}
          </div>
        </div>
      </section>

      {/* SECTIONS: no card boxes, clean typography */}
      <main className="max-w-3xl mx-auto px-6 md:px-12 pb-24">
        {secties.map((s, i) => (
          <section key={s.id} id={s.id} className="scroll-mt-20 py-14 border-t border-black/8" style={s.bgStijl}>
            {s.fotoUrl ? (
              <div className="relative mb-8 h-44 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.fotoUrl} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent px-6 pb-5">
                  <h2 className="text-2xl text-white tracking-tight" style={{ fontFamily: headingFont }}>{s.label}</h2>
                </div>
              </div>
            ) : (
              <div className="mb-8 flex items-baseline gap-5">
                <span className="text-xs tabular-nums" style={{ color: 'hsl(var(--primary))', letterSpacing: '0.1em' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h2 className="text-3xl tracking-tight text-foreground" style={{ fontFamily: headingFont }}>{s.label}</h2>
              </div>
            )}
            <div className="pl-0 md:pl-10">
              {s.render()}
            </div>
          </section>
        ))}
      </main>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 3 — LE JARDIN (Romantisch)
// Zacht, warm, dromerig. Blush achtergronden, vloeiende script, botanische
// ornamenten. Geïnspireerd op Riley & Grey "Drift" / "Posy".
// ═══════════════════════════════════════════════════════════════════════════════

function RomantischTemplate({ data, secties, headingFont, registry, slug, toonMenu }: TplProps) {
  const { wedding, content } = data
  const [mOpen, setMOpen] = React.useState(false)
  const heeftFoto = !!content.headerFotoUrl
  const warmBg = 'hsl(30 38% 97%)'
  const warmCard = 'hsl(30 25% 93%)'

  return (
    <div style={{ background: warmBg }}>
      {/* NAV: warm, centered, serif name */}
      {toonMenu && <nav className="sticky top-0 z-40 backdrop-blur-sm border-b" style={{ background: `${warmBg}ee`, borderColor: 'hsl(var(--primary)/0.12)' }}>
        <div className="relative max-w-xl mx-auto px-4 py-3 flex flex-col items-center gap-1.5">
          <span className="text-base font-medium text-foreground" style={{ fontFamily: headingFont }}>
            {wedding.partner1Naam} &amp; {wedding.partner2Naam}
          </span>
          <ul className="hidden md:flex gap-5 flex-wrap justify-center">
            {secties.filter(s => s.id !== 'cadeaulijst').map(s => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-[11px] text-muted-foreground hover:text-primary transition-colors">{s.label}</a>
              </li>
            ))}
          </ul>
          {registry?.enabled && slug && (
            <RegistryNavButton slug={slug} passwordRequired={registry.passwordRequired} variant="light" absolute />
          )}
          <button className="md:hidden absolute right-4 top-3 p-1.5 text-muted-foreground" onClick={() => setMOpen(!mOpen)}>
            {mOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {mOpen && (
          <div className="md:hidden border-t px-6 py-4" style={{ background: warmBg, borderColor: 'hsl(var(--primary)/0.12)' }}>
            <ul className="space-y-1 text-center">
              {registry?.enabled && slug && <RegistryMobileMenuItem slug={slug} onClose={() => setMOpen(false)} />}
              {secties.filter(s => s.id !== 'cadeaulijst').map(s => (
                <li key={s.id}>
                  <a href={`#${s.id}`} onClick={() => setMOpen(false)} className="block py-2 text-sm text-muted-foreground hover:text-primary">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>}

      {/* HERO: warm and soft */}
      <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden" style={{ background: warmBg }}>
        {heeftFoto && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={content.headerFotoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0" style={{ background: `rgba(120,70,60,${(content.headerOverlay ?? 0.35) * 0.85})` }} />
          </>
        )}
        <div className="relative z-10 px-8 py-20 text-center" style={{ color: heeftFoto ? 'white' : 'inherit' }}>
          <p className="text-xl mb-3" style={{ color: heeftFoto ? 'rgba(255,255,255,0.55)' : 'hsl(var(--primary)/0.5)' }}>✦ ✦ ✦</p>
          <h1 style={{ fontFamily: headingFont, fontSize: 'clamp(3rem, 8vw, 6rem)', lineHeight: 1.2 }}>
            {wedding.partner1Naam} &amp; {wedding.partner2Naam}
          </h1>
          <p className="text-xl mt-3" style={{ color: heeftFoto ? 'rgba(255,255,255,0.55)' : 'hsl(var(--primary)/0.5)' }}>✦ ✦ ✦</p>
          <div className="mt-5 text-sm" style={{ opacity: 0.72 }}>
            {wedding.trouwdatum && <p className="italic">{formatDatumNL(wedding.trouwdatum)}</p>}
            {wedding.locatie && <p className="mt-1">{wedding.locatie}</p>}
          </div>
        </div>
      </section>

      {/* SECTIONS: rounded warm cards */}
      <main className="mx-auto max-w-lg px-4 pb-24">
        {secties.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-20 py-8" style={s.bgStijl}>
            {s.fotoUrl ? (
              <div className="relative mb-4 h-36 overflow-hidden rounded-3xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.fotoUrl} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 to-transparent px-5 pb-4">
                  <h2 className="text-xl text-white italic" style={{ fontFamily: headingFont }}>{s.label}</h2>
                </div>
              </div>
            ) : (
              <div className="text-center mb-4">
                <span style={{ color: 'hsl(var(--primary)/0.45)', fontSize: '1.2rem' }}>❧</span>
                <h2 className="text-xl italic text-foreground" style={{ fontFamily: headingFont }}>{s.label}</h2>
                <span style={{ color: 'hsl(var(--primary)/0.45)', fontSize: '1.2rem' }}>❧</span>
              </div>
            )}
            <div className="rounded-3xl px-6 py-6" style={{ background: warmCard }}>
              {s.render()}
            </div>
          </section>
        ))}
      </main>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 4 — HET LANDGOED (Rustiek)
// Warm, organisch, landelijk erfgoed. Alternerende achtergronden,
// linker accentborder. Geïnspireerd op Riley & Grey "Nom".
// ═══════════════════════════════════════════════════════════════════════════════

function RustiekTemplate({ data, secties, headingFont, registry, slug, toonMenu }: TplProps) {
  const { wedding, content } = data
  const [mOpen, setMOpen] = React.useState(false)
  const heeftFoto = !!content.headerFotoUrl
  const donkerNav = 'hsl(35 20% 18%)'
  const linnenBg = 'hsl(42 25% 94%)'

  return (
    <div className="bg-white">
      {/* NAV: dark earthy bar */}
      {toonMenu && <nav className="sticky top-0 z-40" style={{ background: donkerNav }}>
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <span className="text-sm font-medium tracking-wide" style={{ color: 'rgba(255,255,255,0.88)' }}>
            {wedding.partner1Naam} &amp; {wedding.partner2Naam}
          </span>
          <ul className="hidden md:flex gap-6">
            {secties.filter(s => s.id !== 'cadeaulijst').map(s => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-[10px] uppercase tracking-widest transition-colors" style={{ color: 'rgba(255,255,255,0.55)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}>
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3">
            {registry?.enabled && slug && (
              <RegistryNavButton slug={slug} passwordRequired={registry.passwordRequired} variant="dark" />
            )}
            <button className="md:hidden p-2 -mr-2" style={{ color: 'rgba(255,255,255,0.7)' }} onClick={() => setMOpen(!mOpen)}>
              {mOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {mOpen && (
          <div className="md:hidden px-6 py-3 border-t" style={{ background: donkerNav, borderColor: 'rgba(255,255,255,0.1)' }}>
            <ul className="space-y-1">
              {registry?.enabled && slug && (
                <li>
                  <a href={`/trouwen/${slug}/cadeaulijst`} onClick={() => setMOpen(false)} className="flex items-center gap-2 py-2.5 text-[11px] uppercase tracking-widest font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                    <Gift className="h-3.5 w-3.5" /> Cadeaulijst
                  </a>
                </li>
              )}
              {secties.filter(s => s.id !== 'cadeaulijst').map(s => (
                <li key={s.id}>
                  <a href={`#${s.id}`} onClick={() => setMOpen(false)} className="block py-2.5 text-[11px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.65)' }}>
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>}

      {/* HERO: left-aligned with frame */}
      <section className="relative flex min-h-[56vh] items-end overflow-hidden">
        {heeftFoto
          ? <><img src={content.headerFotoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0" style={{ background: `rgba(60,40,15,${0.3 + (content.headerOverlay ?? 0.35) * 0.55})` }} /></>
          : <div className="absolute inset-0" style={{ background: linnenBg }} />}
        <div className="relative z-10 p-8 md:p-14 max-w-lg">
          <div className="border-l-4 pl-6 py-1" style={{ borderColor: 'hsl(var(--primary))' }}>
            <h1 style={{
              fontFamily: headingFont,
              fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
              lineHeight: 1.15,
              color: heeftFoto ? 'white' : 'hsl(35 20% 15%)',
            }}>
              {wedding.partner1Naam} &amp;<br />{wedding.partner2Naam}
            </h1>
            <div className="mt-3 text-sm" style={{ color: heeftFoto ? 'rgba(255,255,255,0.72)' : 'hsl(35 15% 45%)' }}>
              {wedding.trouwdatum && <span>{formatDatumNL(wedding.trouwdatum)}</span>}
              {wedding.trouwdatum && wedding.locatie && <span> — </span>}
              {wedding.locatie && <span>{wedding.locatie}</span>}
            </div>
          </div>
        </div>
      </section>

      {/* SECTIONS: alternating backgrounds, left-border titles */}
      <main>
        {secties.map((s, i) => (
          <section key={s.id} id={s.id} className="scroll-mt-16 py-12" style={s.bgStijl ?? { background: i % 2 === 0 ? 'white' : linnenBg }}>
            <div className="max-w-2xl mx-auto px-6 md:px-12">
              {s.fotoUrl ? (
                <div className="relative mb-6 h-40 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.fotoUrl} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent px-5 pb-4">
                    <h2 className="text-xl text-white" style={{ fontFamily: headingFont }}>{s.label}</h2>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-1 self-stretch rounded-full" style={{ background: 'hsl(var(--primary))' }} />
                  <h2 className="text-xl font-semibold text-foreground" style={{ fontFamily: headingFont }}>{s.label}</h2>
                </div>
              )}
              {s.render()}
            </div>
          </section>
        ))}
      </main>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 5 — STUDIO (Puur / Minimalistisch)
// Radicaal minimalistisch. Gigantische typografie als design-element.
// Geen decoratieve elementen, alleen witruimte en type.
// Geïnspireerd op Riley & Grey "Perch" + Swiss editorial design.
// ═══════════════════════════════════════════════════════════════════════════════

function PuurTemplate({ data, secties, headingFont, registry, slug, toonMenu }: TplProps) {
  const { wedding, content } = data
  const [mOpen, setMOpen] = React.useState(false)
  const heeftFoto = !!content.headerFotoUrl

  return (
    <div className="bg-white">
      {/* NAV: ultra minimal */}
      {toonMenu && <nav className="sticky top-0 z-40 bg-white border-b border-black/8">
        <div className="px-8 md:px-16 py-4 flex items-center justify-between max-w-4xl">
          <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground">
            {wedding.partner1Naam} &amp; {wedding.partner2Naam}
          </span>
          <ul className="hidden md:flex gap-10">
            {secties.filter(s => s.id !== 'cadeaulijst').map(s => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-[9px] tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3">
            {registry?.enabled && slug && (
              <RegistryNavButton slug={slug} passwordRequired={registry.passwordRequired} variant="light" />
            )}
            <button className="md:hidden p-2 -mr-2 text-muted-foreground" onClick={() => setMOpen(!mOpen)}>
              {mOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {mOpen && (
          <div className="md:hidden border-t border-black/6 px-8 py-4">
            <ul className="grid grid-cols-2 gap-1">
              {registry?.enabled && slug && <RegistryMobileMenuItem slug={slug} onClose={() => setMOpen(false)} />}
              {secties.filter(s => s.id !== 'cadeaulijst').map(s => (
                <li key={s.id}>
                  <a href={`#${s.id}`} onClick={() => setMOpen(false)} className="block py-2.5 text-[9px] tracking-widest uppercase text-muted-foreground hover:text-foreground">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>}

      {/* HERO: enormous typography */}
      <section className="relative overflow-hidden" style={{ minHeight: '85vh', display: 'flex', alignItems: 'center' }}>
        {heeftFoto && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={content.headerFotoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ opacity: 0.18 }} />
            <div className="absolute inset-0 bg-white/70" />
          </>
        )}
        <div className="relative z-10 px-8 md:px-16 w-full max-w-4xl">
          <p className="text-[9px] tracking-[0.35em] uppercase text-muted-foreground mb-10">Trouwen</p>
          <h1 style={{
            fontFamily: headingFont,
            fontSize: 'clamp(3rem, 10vw, 8.5rem)',
            lineHeight: 0.95,
            letterSpacing: '-0.03em',
            color: 'hsl(var(--primary))',
          }}>
            {wedding.partner1Naam}
          </h1>
          <h1 style={{
            fontFamily: headingFont,
            fontSize: 'clamp(3rem, 10vw, 8.5rem)',
            lineHeight: 0.95,
            letterSpacing: '-0.03em',
            color: 'hsl(20 10% 15%)',
          }}>
            &amp; {wedding.partner2Naam}
          </h1>
          <div className="mt-12 flex flex-col gap-1" style={{ color: 'hsl(0 0% 55%)', fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            {wedding.trouwdatum && <span>{formatDatumNL(wedding.trouwdatum)}</span>}
            {wedding.locatie && <span>{wedding.locatie}</span>}
          </div>
        </div>
      </section>

      {/* SECTIONS: no boxes, only type and line */}
      <main className="max-w-md mx-auto px-8 md:px-0 pb-24">
        {secties.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-20 py-14 border-t" style={{ borderColor: 'hsl(var(--primary)/0.15)', ...s.bgStijl }}>
            {s.fotoUrl ? (
              <div className="relative mb-8 h-36 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.fotoUrl} alt="" className="h-full w-full object-cover" style={{ opacity: 0.85 }} />
              </div>
            ) : null}
            <p className="text-[9px] tracking-[0.28em] uppercase text-muted-foreground mb-4">{s.label}</p>
            {s.render()}
          </section>
        ))}
      </main>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 6 — DE TUIN (Botanisch)
// Weelderig groen, botanische ornamenten, masonry galerij,
// donkergroene navigatie. Geïnspireerd op Riley & Grey "Eden".
// ═══════════════════════════════════════════════════════════════════════════════

function BotanischTemplate({ data, secties, headingFont, registry, slug, toonMenu }: TplProps) {
  const { wedding, content } = data
  const [mOpen, setMOpen] = React.useState(false)
  const heeftFoto = !!content.headerFotoUrl

  return (
    <div className="bg-white">
      {/* NAV: forest green, white text */}
      {toonMenu && <nav className="sticky top-0 z-40 text-white" style={{ background: 'hsl(var(--primary))' }}>
        <div className="max-w-2xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-2">
            <span style={{ opacity: 0.55 }}>❧</span>
            {wedding.partner1Naam} &amp; {wedding.partner2Naam}
            <span style={{ opacity: 0.55 }}>❧</span>
          </span>
          <ul className="hidden md:flex gap-5">
            {secties.filter(s => s.id !== 'cadeaulijst').map(s => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-[11px] transition-colors" style={{ color: 'rgba(255,255,255,0.65)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}>
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3">
            {registry?.enabled && slug && (
              <RegistryNavButton slug={slug} passwordRequired={registry.passwordRequired} variant="primary" />
            )}
            <button className="md:hidden p-2 -mr-2" style={{ color: 'rgba(255,255,255,0.8)' }} onClick={() => setMOpen(!mOpen)}>
              {mOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {mOpen && (
          <div className="md:hidden border-t px-5 py-3" style={{ background: 'hsl(var(--primary))', borderColor: 'rgba(255,255,255,0.15)' }}>
            <ul className="space-y-1">
              {registry?.enabled && slug && (
                <li>
                  <a href={`/trouwen/${slug}/cadeaulijst`} onClick={() => setMOpen(false)} className="flex items-center gap-2 py-2.5 text-sm font-semibold" style={{ color: 'white' }}>
                    <Gift className="h-3.5 w-3.5" /> Cadeaulijst
                  </a>
                </li>
              )}
              {secties.filter(s => s.id !== 'cadeaulijst').map(s => (
                <li key={s.id}>
                  <a href={`#${s.id}`} onClick={() => setMOpen(false)} className="block py-2.5 text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>}

      {/* HERO: green overlay with double-frame border */}
      <section className="relative flex min-h-[60vh] items-center justify-center overflow-hidden">
        {heeftFoto
          ? <><img src={content.headerFotoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0" style={{ background: `rgba(15,50,25,${0.45 + (content.headerOverlay ?? 0.35) * 0.45})` }} /></>
          : <div className="absolute inset-0" style={{ background: 'hsl(var(--primary))' }} />}
        {/* Decorative double border frame */}
        <div className="absolute inset-4 border border-white/20 pointer-events-none" />
        <div className="absolute inset-7 border border-white/10 pointer-events-none" />
        <div className="relative z-10 text-center text-white px-8 py-16">
          <p className="text-2xl mb-3" style={{ opacity: 0.45 }}>❧</p>
          <h1 style={{ fontFamily: headingFont, fontSize: 'clamp(2.5rem, 7vw, 5rem)', lineHeight: 1.25 }}>
            {wedding.partner1Naam} &amp; {wedding.partner2Naam}
          </h1>
          <div className="mt-4 flex justify-center items-center gap-3 text-sm" style={{ opacity: 0.7 }}>
            {wedding.trouwdatum && <span>{formatDatumNL(wedding.trouwdatum)}</span>}
            {wedding.trouwdatum && wedding.locatie && <span>·</span>}
            {wedding.locatie && <span>{wedding.locatie}</span>}
          </div>
          <p className="text-2xl mt-3" style={{ opacity: 0.45 }}>❧</p>
        </div>
      </section>

      {/* SECTIONS: white cards with green top border */}
      <main className="mx-auto max-w-xl px-4 pb-24" style={{ background: 'hsl(145 15% 97%)' }}>
        {secties.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-20 py-8" style={s.bgStijl}>
            {s.fotoUrl ? (
              <div className="relative mb-4 h-36 overflow-hidden rounded-2xl border-t-4" style={{ borderColor: 'hsl(var(--primary))' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.fotoUrl} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 to-transparent px-5 pb-4">
                  <h2 className="text-xl text-white" style={{ fontFamily: headingFont }}>{s.label}</h2>
                </div>
              </div>
            ) : null}
            <div className="rounded-2xl bg-white p-6 border-t-4 shadow-sm" style={{ borderColor: 'hsl(var(--primary))' }}>
              {!s.fotoUrl && (
                <h2 className="flex items-center gap-2 text-xl font-medium mb-4 text-foreground" style={{ fontFamily: headingFont }}>
                  <span style={{ color: 'hsl(var(--primary))', fontSize: '1rem' }}>❧</span>
                  {s.label}
                </h2>
              )}
              {s.render()}
            </div>
          </section>
        ))}
      </main>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED CONTENT RENDERERS (template-aware via gallerijStijl param)
// ═══════════════════════════════════════════════════════════════════════════════

function renderGalerij(gallerij: GallerijFoto[], thema: WeddingThema) {
  const useMasonry = thema === 'modern' || thema === 'botanisch'
  if (useMasonry) {
    return (
      <div style={{ columns: '2', columnGap: '8px' }}>
        {gallerij.map((f) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={f.id}
            src={f.url}
            alt={f.bijschrift || ''}
            style={{ breakInside: 'avoid', marginBottom: '8px', display: 'block', width: '100%', borderRadius: thema === 'botanisch' ? '8px' : '0' }}
          />
        ))}
      </div>
    )
  }
  const gridKlas = thema === 'romantisch' ? 'gap-3' : thema === 'rustiek' ? 'gap-1' : thema === 'minimalistisch' ? 'gap-4' : 'gap-2'
  const imgRadius = thema === 'romantisch' ? '16px' : thema === 'rustiek' || thema === 'minimalistisch' ? '0' : '8px'
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 ${gridKlas}`}>
      {gallerij.map((f) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={f.id}
          src={f.url}
          alt={f.bijschrift || ''}
          className="aspect-square w-full object-cover"
          style={{ borderRadius: imgRadius }}
        />
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN: PublicWebsite
// ═══════════════════════════════════════════════════════════════════════════════

const TEMPLATES: Record<WeddingThema, (props: TplProps) => React.ReactNode> = {
  klassiek:        (p) => <KlassiekTemplate {...p} />,
  modern:          (p) => <ModernTemplate {...p} />,
  romantisch:      (p) => <RomantischTemplate {...p} />,
  rustiek:         (p) => <RustiekTemplate {...p} />,
  minimalistisch:  (p) => <PuurTemplate {...p} />,
  botanisch:       (p) => <BotanischTemplate {...p} />,
}

export function PublicWebsite({ data, registry, slug }: { data: PublicWebsiteData; registry?: RegistryMeta | null; slug?: string }) {
  const { wedding, content, schedule } = data
  const config = content.sectiesConfig ?? {}
  const toonMenu = config['_nav']?.zichtbaar ?? false

  const thema: WeddingThema = content.thema ?? 'klassiek'
  const headingFont = LETTERTYPE_VAR[content.kopLettertype ?? 'cormorant']

  const themaVars: React.CSSProperties = {
    '--primary':            hexNaarHsl(content.kleurAccent || '#a75573'),
    '--primary-foreground': '0 0% 100%',
    '--heading-font':       headingFont,
  } as React.CSSProperties

  // Config key mapping: 'welkom' maps to 'home' in the editor
  const cfgKey = (id: string) => id === 'welkom' ? 'home' : id

  function isZichtbaar(id: string) {
    const cfg = config[cfgKey(id)]
    // countdown is opt-in; hidden by default when not explicitly configured
    if (id === 'countdown' && cfg === undefined) return false
    return cfg?.zichtbaar !== false
  }

  function bgStijlVoor(id: string): React.CSSProperties | undefined {
    const cfg = config[cfgKey(id)]
    if (!cfg?.achtergrondKleur || cfg.achtergrondKleur === 'transparant') return undefined
    return {
      backgroundColor: cfg.achtergrondKleur,
      ...(cfg.tekstKleur === 'licht' ? { color: '#ffffff' } : cfg.tekstKleur === 'donker' ? { color: '#1a1a1a' } : {}),
    }
  }

  function uitlijningKlas(id: string) {
    const u = config[cfgKey(id)]?.uitlijning
    if (u === 'links') return 'text-left'
    if (u === 'rechts') return 'text-right'
    return 'text-center'
  }

  const sectieDefinities: SectieItem[] = [
    {
      id: 'welkom',
      label: config[cfgKey('welkom')]?.naam ?? 'Welkom',
      icoon: <Heart className="h-5 w-5" />,
      fotoUrl: config[cfgKey('welkom')]?.fotoUrl,
      bgStijl: bgStijlVoor('welkom'),
      render: () => (
        <p className={`whitespace-pre-line text-lg text-foreground ${uitlijningKlas('welkom')}`}>
          {content.welkomsttekst}
        </p>
      ),
    },
    {
      id: 'countdown',
      label: config['countdown']?.naam ?? 'Aftelling',
      icoon: <Clock className="h-5 w-5" />,
      fotoUrl: config['countdown']?.fotoUrl,
      bgStijl: bgStijlVoor('countdown'),
      render: () => <CountdownBlok trouwdatum={config['countdown']?.countdownDatum ?? wedding.trouwdatum} uitlijning={config['countdown']?.uitlijning} />,
    },
    {
      id: 'programma',
      label: config['programma']?.naam ?? 'Programma',
      icoon: <CalendarHeart className="h-5 w-5" />,
      fotoUrl: config['programma']?.fotoUrl,
      bgStijl: bgStijlVoor('programma'),
      render: () => {
        const inhoud = config['programma']?.inhoud
        if (inhoud) {
          return (
            <p className={`whitespace-pre-line text-muted-foreground ${uitlijningKlas('programma')}`}>
              {inhoud}
            </p>
          )
        }
        return (
          <ul className="space-y-3">
            {schedule.map((s, i) => (
              <li key={i} className="flex gap-4">
                <span className="w-14 shrink-0 font-semibold tabular-nums" style={{ color: 'hsl(var(--primary))' }}>{s.tijd}</span>
                <div>
                  <p className="font-medium text-foreground">{s.titel}</p>
                  {s.omschrijving && <p className="text-sm text-muted-foreground">{s.omschrijving}</p>}
                  {s.locatie && <p className="text-sm text-muted-foreground">{s.locatie}</p>}
                </div>
              </li>
            ))}
          </ul>
        )
      },
    },
    {
      id: 'dresscode',
      label: config['dresscode']?.naam ?? 'Dresscode',
      icoon: <Shirt className="h-5 w-5" />,
      fotoUrl: config['dresscode']?.fotoUrl,
      bgStijl: bgStijlVoor('dresscode'),
      render: () => (
        <p className={`whitespace-pre-line text-muted-foreground ${uitlijningKlas('dresscode')}`}>
          {content.dresscode}
        </p>
      ),
    },
    {
      id: 'cadeaulijst',
      label: config['cadeaulijst']?.naam ?? 'Cadeaulijst',
      icoon: <Gift className="h-5 w-5" />,
      fotoUrl: config['cadeaulijst']?.fotoUrl,
      bgStijl: bgStijlVoor('cadeaulijst'),
      render: () =>
        registry?.enabled ? (
          <div className={`space-y-4 ${uitlijningKlas('cadeaulijst')}`}>
            {registry.introText && (
              <p className="whitespace-pre-line text-muted-foreground">{registry.introText}</p>
            )}
            <div className="flex justify-center">
              <a
                href={`/trouwen/${slug}/cadeaulijst`}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                style={{ background: 'hsl(var(--primary))' }}
              >
                <Gift className="h-4 w-4" />
                Bekijk de cadeaulijst
                {registry.passwordRequired && <Lock className="h-3.5 w-3.5 opacity-70" />}
              </a>
            </div>
          </div>
        ) : (
          <p className={`whitespace-pre-line text-muted-foreground ${uitlijningKlas('cadeaulijst')}`}>
            {content.cadeaulijst}
          </p>
        ),
    },
    {
      id: 'hotels',
      label: config['hotels']?.naam ?? 'Overnachten',
      icoon: <Hotel className="h-5 w-5" />,
      fotoUrl: config['hotels']?.fotoUrl,
      bgStijl: bgStijlVoor('hotels'),
      render: () => (
        <p className={`whitespace-pre-line text-muted-foreground ${uitlijningKlas('hotels')}`}>
          {content.hotels}
        </p>
      ),
    },
    {
      id: 'routebeschrijving',
      label: config['routebeschrijving']?.naam ?? 'Route',
      icoon: <MapPin className="h-5 w-5" />,
      fotoUrl: config['routebeschrijving']?.fotoUrl,
      bgStijl: bgStijlVoor('routebeschrijving'),
      render: () => (
        <p className={`whitespace-pre-line text-muted-foreground ${uitlijningKlas('routebeschrijving')}`}>
          {content.routebeschrijving}
        </p>
      ),
    },
    {
      id: 'faq',
      label: config['faq']?.naam ?? 'FAQ',
      icoon: <HelpCircle className="h-5 w-5" />,
      fotoUrl: config['faq']?.fotoUrl,
      bgStijl: bgStijlVoor('faq'),
      render: () => <FaqAccordion items={content.faq} />,
    },
    {
      id: 'fotos',
      label: config['fotos']?.naam ?? "Foto's",
      icoon: <Image className="h-5 w-5" />,
      fotoUrl: undefined,
      bgStijl: bgStijlVoor('fotos'),
      render: () => renderGalerij(content.gallerij, thema),
    },
    {
      id: 'contact',
      label: config['contact']?.naam ?? 'Contact',
      icoon: <Phone className="h-5 w-5" />,
      fotoUrl: config['contact']?.fotoUrl,
      bgStijl: bgStijlVoor('contact'),
      render: () => (
        <p className={`text-muted-foreground ${uitlijningKlas('contact')}`}>
          {content.contact}
        </p>
      ),
    },
  ]

  // Filter and sort sections
  const gefilterd = sectieDefinities.filter((s) => {
    // Registry section: always show when registry is enabled, regardless of website config
    if (s.id === 'cadeaulijst' && registry?.enabled) return true
    if (!isZichtbaar(s.id)) return false
    switch (s.id) {
      case 'welkom':         return !!content.welkomsttekst
      case 'countdown':      return !!wedding.trouwdatum
      case 'programma':      return schedule.length > 0 || !!config['programma']?.inhoud
      case 'dresscode':      return !!content.dresscode
      case 'cadeaulijst':    return !!content.cadeaulijst || !!registry?.enabled
      case 'hotels':         return !!content.hotels
      case 'routebeschrijving': return !!content.routebeschrijving
      case 'faq':            return content.faq.length > 0
      case 'fotos':          return content.gallerij.length > 0
      case 'contact':        return !!content.contact
      default:               return true
    }
  })

  const gesorteerd = [...gefilterd].sort((a, b) => {
    const va = config[cfgKey(a.id)]?.volgorde ?? DEFAULT_ORDER[a.id] ?? 99
    const vb = config[cfgKey(b.id)]?.volgorde ?? DEFAULT_ORDER[b.id] ?? 99
    return va - vb
  })

  const renderer = TEMPLATES[thema] ?? TEMPLATES.klassiek

  return (
    <div style={themaVars}>
      {renderer({ data, secties: gesorteerd, headingFont, registry, slug, toonMenu })}
    </div>
  )
}
