'use client'

// ── The Savoy (artdeco) — de glamourclub ─────────────────────────────────────
// Jaren-'20 art-decoglamour: goud op diep smaragd — het enige volledig
// donkere thema onder de negen. Geometrische zonnestraal-motieven, getrapte
// ziggoerat-lijsten, symmetrische diamant-scheidingen i.p.v. organische
// ornamenten. Bewegingstaal: glamoureus — 500–700ms met lichte overshoot,
// een gouden glans die bij hover over knoppen "veegt", waaiers die bij
// binnenkomst openklappen.

import { ChevronDown, Gift, Lock, Menu, Play, X } from 'lucide-react'
import * as React from 'react'

import { formatDatumNL } from '@/lib/bruiloft/format'
import type { FaqItem } from '@/lib/bruiloft/types'
import type { GalerijBlock, ProgrammaBlock, RsvpBlock, TekstFotoBlock, TijdlijnBlock } from '@/lib/bruiloft/websiteBlocks'

import {
  AchtergrondFoto,
  KopFoto,
  Lightbox,
  UITLIJN_KLASSE,
  achtergrondVan,
  breedte,
  kopStijl,
  maakReveal,
  naarEmbedUrl,
  uitlijning,
  useCountdown,
  useLightbox,
  useRsvpFormulier,
  vh,
} from './shared'
import type {
  ContentProps,
  FooterProps,
  HeroProps,
  NavProps,
  RenderContext,
  SectionProps,
  ThemeRenderer,
} from './types'

const EASE = 'cubic-bezier(0.34, 1.2, 0.4, 1)'

const CSS = `
@keyframes sv-open {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to   { opacity: 1; transform: none; }
}
@keyframes sv-waaier {
  from { transform: scale(0.6) rotate(-6deg); opacity: 0; }
  to   { transform: none; opacity: 1; }
}
.sv-hero-item { opacity: 0; animation: sv-open 650ms ${EASE} forwards; }
.sv-waaier-in { animation: sv-waaier 900ms ${EASE} both; }

.sv-veld {
  height: 3rem;
  width: 100%;
  border: 1px solid hsl(var(--primary) / 0.4);
  border-radius: 0;
  background: rgba(255,255,255,0.03);
  padding: 0 1rem;
  color: var(--site-text);
  transition: border-color 350ms ${EASE}, box-shadow 350ms ${EASE};
}
.sv-veld::placeholder { color: var(--site-muted); opacity: 0.65; }
.sv-veld:focus {
  outline: none;
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 3px hsl(var(--primary) / 0.18);
}

.sv-knop {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  min-height: 3rem;
  padding: 0 2rem;
  border: 1px solid hsl(var(--primary));
  color: hsl(var(--primary));
  background: transparent;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  overflow: hidden;
  transition: color 400ms ${EASE}, transform 500ms ${EASE};
}
.sv-knop::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(115deg, transparent 30%, hsl(var(--primary) / 0.9) 50%, transparent 70%);
  transform: translateX(-120%);
  transition: transform 650ms ${EASE};
}
.sv-knop:hover:not(:disabled) { color: #0f1e1a; transform: translateY(-1px); }
.sv-knop:hover:not(:disabled)::before { transform: translateX(0); background: hsl(var(--primary)); }
.sv-knop span { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 0.55rem; }
.sv-knop:focus-visible { outline: 2px solid hsl(var(--primary)); outline-offset: 3px; }
.sv-knop:disabled { opacity: 0.4; cursor: default; }

.sv-knop-vol { background: hsl(var(--primary)); color: #0f1e1a; }
.sv-knop-vol::before { display: none; }
.sv-knop-actief { background: hsl(var(--primary)); color: #0f1e1a; }
.sv-knop-actief::before { display: none; }

.sv-nav-link { position: relative; transition: color 350ms ${EASE}; }
.sv-nav-link::after {
  content: '';
  position: absolute;
  left: 50%; bottom: -4px;
  width: 0; height: 1px;
  background: currentcolor;
  transition: width 350ms ${EASE}, left 350ms ${EASE};
}
.sv-nav-link:hover::after, .sv-nav-link[data-actief='true']::after { left: 0; width: 100%; }

.sv-accordion {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 450ms ${EASE};
}
.sv-accordion[data-open='true'] { grid-template-rows: 1fr; }
.sv-accordion > div { overflow: hidden; }
`

const Reveal = maakReveal({
  verborgen: { opacity: 0, transform: 'translateY(20px) scale(0.97)' },
  overgang: `opacity 650ms ${EASE}, transform 650ms ${EASE}`,
})

// ─── Geometrische bouwstenen ─────────────────────────────────────────────────

function Kicker({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-[0.34em]" style={{ color: 'hsl(var(--primary))', ...style }}>
      {children}
    </p>
  )
}

// Zonnestraal-motief — het herkenningspunt van dit thema.
function Zonnestraal({ className, stralen = 11 }: { className?: string; stralen?: number }) {
  const items = Array.from({ length: stralen })
  return (
    <svg viewBox="0 0 200 100" className={className} aria-hidden preserveAspectRatio="xMidYMax meet">
      {items.map((_, i) => {
        const hoek = -90 + (i - (stralen - 1) / 2) * (140 / (stralen - 1))
        const rad = (hoek * Math.PI) / 180
        const x2 = 100 + 95 * Math.cos(rad)
        const y2 = 100 + 95 * Math.sin(rad)
        return (
          <line key={i} x1="100" y1="100" x2={x2} y2={y2} stroke="hsl(var(--primary) / 0.4)" strokeWidth="1" />
        )
      })}
      <circle cx="100" cy="100" r="6" fill="hsl(var(--primary))" />
    </svg>
  )
}

// Getrapte ziggoerat-hoek — vervangt organische ornamenten door geometrie.
function Trapmotief({
  className,
  spiegel,
  style,
}: {
  className?: string
  spiegel?: boolean
  style?: React.CSSProperties
}) {
  return (
    <svg
      viewBox="0 0 80 80"
      className={className}
      aria-hidden
      style={spiegel ? { transform: 'scaleX(-1)', ...style } : style}
    >
      <rect x="0" y="0" width="80" height="4" fill="hsl(var(--primary))" />
      <rect x="0" y="0" width="4" height="80" fill="hsl(var(--primary))" />
      <rect x="14" y="0" width="4" height="30" fill="hsl(var(--primary) / 0.7)" />
      <rect x="0" y="14" width="30" height="4" fill="hsl(var(--primary) / 0.7)" />
      <rect x="28" y="0" width="4" height="16" fill="hsl(var(--primary) / 0.45)" />
      <rect x="0" y="28" width="16" height="4" fill="hsl(var(--primary) / 0.45)" />
    </svg>
  )
}

function DiamantScheiding() {
  return (
    <div className="flex items-center justify-center gap-3" aria-hidden>
      <span className="h-px w-16" style={{ background: 'hsl(var(--primary)/0.4)' }} />
      <span className="h-2.5 w-2.5 rotate-45" style={{ background: 'hsl(var(--primary))' }} />
      <span className="h-px w-16" style={{ background: 'hsl(var(--primary)/0.4)' }} />
    </div>
  )
}

function DatumRegel({ ctx }: { ctx: RenderContext }) {
  const { wedding } = ctx
  if (!wedding.trouwdatum && !wedding.locatie) return null
  return (
    <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs uppercase tracking-[0.3em]" style={{ color: 'var(--site-muted)' }}>
      {wedding.trouwdatum && <span>{formatDatumNL(wedding.trouwdatum)}</span>}
      {wedding.trouwdatum && wedding.locatie && <span aria-hidden className="h-1 w-1 rotate-45" style={{ background: 'hsl(var(--primary))' }} />}
      {wedding.locatie && <span>{wedding.locatie}</span>}
    </p>
  )
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function Hero({ block, ctx }: HeroProps) {
  const { wedding, theme } = ctx
  const heeftFoto = !!block.fotoUrl

  const namen = (maat: string) => (
    <h1
      style={{ ...kopStijl(theme), fontSize: maat, lineHeight: 1.1, letterSpacing: '0.02em', color: 'var(--site-text)' }}
    >
      {wedding.partner1Naam}
      <span className="mx-3" style={{ color: 'hsl(var(--primary))' }}>&amp;</span>
      {wedding.partner2Naam}
    </h1>
  )

  if (block.variant === 'split') {
    return (
      <section className="relative grid grid-cols-1 md:grid-cols-2" style={{ minHeight: vh(78) }}>
        <div className="relative order-2 min-h-[58vw] overflow-hidden md:order-1 md:min-h-0" style={{ background: 'var(--site-card)' }}>
          {heeftFoto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={block.fotoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ filter: 'saturate(0.85)' }} />
          )}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(15,30,26,0.15), rgba(15,30,26,0.55))' }} />
          <Trapmotief className="sv-hero-item absolute left-0 top-0 h-16 w-16" style={{ animationDelay: '250ms' }} />
        </div>
        <div className="order-1 flex flex-col items-center justify-center px-8 py-16 text-center md:order-2">
          <div className="sv-hero-item" style={{ animationDelay: '100ms' }}>
            <Kicker>De verlovingsviering van</Kicker>
          </div>
          <div className="sv-hero-item mt-4" style={{ animationDelay: '250ms' }}>
            {namen('clamp(2.4rem, 6vw, 4rem)')}
          </div>
          <div className="sv-hero-item mt-5" style={{ animationDelay: '450ms' }}>
            <DiamantScheiding />
            <div className="mt-4"><DatumRegel ctx={ctx} /></div>
          </div>
          {block.ondertitel && (
            <p className="sv-hero-item mx-auto mt-5 max-w-md text-sm leading-relaxed" style={{ animationDelay: '550ms', color: 'var(--site-muted)' }}>
              {block.ondertitel}
            </p>
          )}
        </div>
      </section>
    )
  }

  if (block.variant === 'typografisch') {
    return (
      <section className="relative flex items-center justify-center overflow-hidden px-8 py-24" style={{ minHeight: vh(80) }}>
        {heeftFoto && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={block.fotoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ opacity: 0.14 }} />
            <div className="absolute inset-0" style={{ background: 'color-mix(in srgb, var(--site-bg) 78%, transparent)' }} />
          </>
        )}
        <Trapmotief className="pointer-events-none absolute left-3 top-3 h-14 w-14 opacity-70" />
        <Trapmotief className="pointer-events-none absolute bottom-3 right-3 h-14 w-14 rotate-180 opacity-70" />
        <div className="relative z-10 text-center">
          <div className="sv-hero-item" style={{ animationDelay: '100ms' }}>
            <Kicker>De verlovingsviering van</Kicker>
          </div>
          <div className="sv-hero-item mt-5" style={{ animationDelay: '300ms' }}>
            {namen('clamp(2.75rem, 9vw, 6.5rem)')}
          </div>
          <div className="sv-hero-item mt-6" style={{ animationDelay: '520ms' }}>
            <DiamantScheiding />
            <div className="mt-4"><DatumRegel ctx={ctx} /></div>
            {block.ondertitel && (
              <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{block.ondertitel}</p>
            )}
          </div>
        </div>
      </section>
    )
  }

  // fullscreen (standaard) — zonnestraal achter de namen.
  return (
    <section className="relative flex items-center justify-center overflow-hidden" style={{ minHeight: vh(82) }}>
      {heeftFoto ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.fotoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ filter: 'saturate(0.85)' }} />
          <div className="absolute inset-0" style={{ background: `rgba(10,20,17,${(block.overlay ?? 0.35) + 0.2})` }} />
        </>
      ) : (
        <div className="absolute inset-0" style={{ background: 'var(--site-bg)' }} />
      )}
      <div className="sv-waaier-in pointer-events-none absolute inset-x-0 bottom-0 h-2/3 opacity-60" style={{ animationDelay: '200ms' }}>
        <Zonnestraal className="h-full w-full" />
      </div>
      <Trapmotief className="pointer-events-none absolute left-4 top-4 h-16 w-16" />
      <Trapmotief className="pointer-events-none absolute bottom-4 right-4 h-16 w-16 rotate-180" />
      <div className="relative z-10 px-8 py-24 text-center">
        <div className="sv-hero-item" style={{ animationDelay: '150ms' }}>
          <Kicker>De verlovingsviering van</Kicker>
        </div>
        <div className="sv-hero-item mt-5" style={{ animationDelay: '350ms' }}>
          {namen('clamp(2.75rem, 8vw, 5.75rem)')}
        </div>
        <div className="sv-hero-item mt-6" style={{ animationDelay: '580ms' }}>
          <DiamantScheiding />
          <div className="mt-4"><DatumRegel ctx={ctx} /></div>
          {block.ondertitel && (
            <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{block.ondertitel}</p>
          )}
        </div>
      </div>
    </section>
  )
}

// ─── Navigatie ───────────────────────────────────────────────────────────────

function Nav({ items, ctx }: NavProps) {
  const { wedding, registry, slug } = ctx
  const [open, setOpen] = React.useState(false)

  return (
    <nav className="sticky top-0 z-40" style={{ background: 'hsl(var(--primary))', boxShadow: '0 1px 0 rgba(0,0,0,0.2)' }}>
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-3">
        <span className="truncate text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: '#0f1e1a' }}>
          {wedding.partner1Naam} &amp; {wedding.partner2Naam}
        </span>
        <ul className="hidden items-center gap-6 md:flex">
          {items.map((item) => (
            <li key={item.key}>
              <a
                href={item.href}
                data-actief={item.actief || undefined}
                className="sv-nav-link text-[10px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: '#0f1e1a' }}
              >
                {item.label}
              </a>
            </li>
          ))}
          {registry?.enabled && slug && (
            <li>
              <a
                href={`/trouwen/${slug}/cadeaulijst`}
                className="inline-flex items-center gap-1.5 border px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: '#0f1e1a', borderColor: '#0f1e1a' }}
              >
                <Gift className="h-3 w-3" /> Cadeaulijst
                {registry.passwordRequired && <Lock className="h-2.5 w-2.5 opacity-70" />}
              </a>
            </li>
          )}
        </ul>
        <button
          className="flex h-11 w-11 items-center justify-center md:hidden"
          style={{ color: '#0f1e1a' }}
          onClick={() => setOpen(!open)}
          aria-label="Menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="px-5 pb-4 md:hidden" style={{ background: 'hsl(var(--primary))', borderTop: '1px solid rgba(15,30,26,0.25)' }}>
          <ul className="space-y-0.5 pt-2">
            {items.map((item) => (
              <li key={item.key}>
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: '#0f1e1a' }}
                >
                  {item.label}
                </a>
              </li>
            ))}
            {registry?.enabled && slug && (
              <li>
                <a
                  href={`/trouwen/${slug}/cadeaulijst`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: '#0f1e1a' }}
                >
                  <Gift className="h-3.5 w-3.5" /> Cadeaulijst
                </a>
              </li>
            )}
          </ul>
        </div>
      )}
    </nav>
  )
}

// ─── Sectie-omhulsel ─────────────────────────────────────────────────────────

const BREEDTE_KLASSE = {
  smal: 'max-w-xl',
  breed: 'max-w-3xl',
  volledig: 'max-w-none',
} as const

function Section({ block, ctx, nummer, children }: SectionProps) {
  if (block.type === 'scheiding') {
    return (
      <section id={`b-${block.id}`} className="scroll-mt-24 px-4 py-5">
        {children}
      </section>
    )
  }

  const layout = block.layout
  const titel = 'titel' in block ? block.titel : ''
  const b = breedte(layout, block.type === 'galerij' || block.type === 'video' || block.type === 'locatie' ? 'breed' : 'smal')
  const achtergrond = achtergrondVan(layout)
  const uitlijnKlas = UITLIJN_KLASSE[uitlijning(layout, 'midden')]
  // Panelen wisselen tussen paginakleur en het iets lichtere kaartpaneel, op
  // bloknummer zodat elke blokvolgorde uit de builder klopt.
  const paneel = !achtergrond.eigen && nummer % 2 === 0

  return (
    <section
      id={`b-${block.id}`}
      className={`relative scroll-mt-24 overflow-hidden px-4 py-12 sm:py-14 ${uitlijnKlas}`}
      style={{ ...(paneel ? { background: 'var(--site-card)' } : {}), ...achtergrond.stijl }}
    >
      <AchtergrondFoto layout={layout} />
      <div className={`mx-auto ${BREEDTE_KLASSE[b]}`}>
        <Reveal>
          <KopFoto layout={layout} className="mb-8 h-44 w-full object-cover" style={{ border: '1px solid hsl(var(--primary)/0.4)' }} />
          {titel && (
            <header className="mb-8 text-center">
              <Trapmotief className="mx-auto mb-3 h-8 w-8 opacity-80" />
              <h2 className="text-3xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>{titel}</h2>
              <p className="mt-1 text-[10px] uppercase tracking-[0.3em]" style={{ color: 'hsl(var(--primary))' }}>
                N&ordm; {String(Math.max(nummer, 1)).padStart(2, '0')}
              </p>
            </header>
          )}
          <div
            className="p-6 sm:p-9"
            style={{ border: '1px solid hsl(var(--primary)/0.3)', background: achtergrond.eigen ? 'transparent' : 'rgba(255,255,255,0.02)' }}
          >
            {children}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ─── Blok-inhoud ─────────────────────────────────────────────────────────────

function Countdown({ ctx, datum }: { ctx: RenderContext; datum: string | null }) {
  const rest = useCountdown(datum)
  if (rest.voorbij) {
    return (
      <div>
        <p className="text-2xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>Het feest is begonnen</p>
        <DiamantScheiding />
      </div>
    )
  }
  const delen = [
    { val: rest.dagen, label: 'Dagen' },
    { val: rest.uren, label: 'Uren' },
    { val: rest.minuten, label: 'Min' },
    { val: rest.seconden, label: 'Sec' },
  ]
  return (
    <div className="flex flex-wrap items-end justify-center gap-1">
      {delen.map(({ val, label }, i) => (
        <div
          key={label}
          className="flex flex-col items-center gap-2 px-4 py-5 sm:px-6"
          style={{
            clipPath: 'polygon(50% 0%, 100% 22%, 100% 100%, 0 100%, 0 22%)',
            background: i % 2 === 0 ? 'hsl(var(--primary) / 0.14)' : 'transparent',
            border: '1px solid hsl(var(--primary) / 0.35)',
          }}
        >
          <span className="text-3xl tabular-nums sm:text-4xl" style={kopStijl(ctx.theme, { color: 'hsl(var(--primary))' })}>
            {String(val).padStart(2, '0')}
          </span>
          <span className="text-[10px] uppercase tracking-[0.24em]" style={{ color: 'var(--site-muted)' }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

function Tijdlijn({ block, ctx }: { block: TijdlijnBlock; ctx: RenderContext }) {
  return (
    <ol className="relative">
      <span aria-hidden className="absolute bottom-2 top-2 left-1/2 hidden w-px -translate-x-1/2 md:block" style={{ background: 'hsl(var(--primary)/0.35)' }} />
      {block.momenten.map((m, i) => {
        const links = i % 2 === 0
        return (
          <li key={m.id} className="relative pb-9 last:pb-0 md:grid md:grid-cols-2 md:gap-14">
            <span
              aria-hidden
              className="absolute left-0 top-1 hidden h-2.5 w-2.5 rotate-45 md:left-1/2 md:block md:-translate-x-1/2"
              style={{ background: 'hsl(var(--primary))' }}
            />
            <div className={`text-left ${links ? 'md:col-start-1 md:pr-4 md:text-right' : 'md:col-start-2 md:pl-4'}`}>
              <p className="text-[11px] uppercase tracking-[0.28em]" style={{ color: 'hsl(var(--primary))' }}>{m.datum}</p>
              <p className="mt-1.5 text-xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>{m.titel}</p>
              {m.tekst && <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{m.tekst}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function Galerij({ block }: { block: GalerijBlock; ctx: RenderContext }) {
  const lightbox = useLightbox(block.fotos)

  if (block.stijl === 'masonry') {
    return (
      <>
        <div style={{ columns: '2', columnGap: '10px' }}>
          {block.fotos.map((f, i) => (
            <button
              key={f.id}
              type="button"
              onClick={() => lightbox.open(i)}
              className="mb-2.5 block w-full"
              style={{ border: '1px solid hsl(var(--primary)/0.4)', breakInside: 'avoid', filter: 'saturate(0.9)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt={f.bijschrift || ''} className="block w-full" />
            </button>
          ))}
        </div>
        {lightbox.openIndex !== null && <Lightbox fotos={block.fotos} start={lightbox.openIndex} onSluit={lightbox.sluit} />}
      </>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {block.fotos.map((f, i) => (
          <button
            key={f.id}
            type="button"
            onClick={() => lightbox.open(i)}
            className="relative block overflow-hidden"
            style={{ border: '1px solid hsl(var(--primary)/0.4)' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.url} alt={f.bijschrift || ''} className="aspect-square w-full object-cover" style={{ filter: 'saturate(0.9)' }} />
            {i % 4 === 0 && <Trapmotief className="pointer-events-none absolute right-0 top-0 h-6 w-6 opacity-80" spiegel />}
          </button>
        ))}
      </div>
      {lightbox.openIndex !== null && <Lightbox fotos={block.fotos} start={lightbox.openIndex} onSluit={lightbox.sluit} />}
    </>
  )
}

function Programma({ block, ctx }: { block: ProgrammaBlock; ctx: RenderContext }) {
  if (block.bron === 'eigen') {
    return <p className="whitespace-pre-line leading-relaxed" style={{ color: 'var(--site-text)' }}>{block.eigenTekst}</p>
  }
  return (
    <ol>
      {ctx.schedule.map((s, i) => (
        <li key={i} className="flex gap-5 py-3.5" style={{ borderBottom: i < ctx.schedule.length - 1 ? '1px solid hsl(var(--primary)/0.25)' : undefined }}>
          <span className="w-16 shrink-0 text-sm font-semibold tabular-nums" style={{ color: 'hsl(var(--primary))' }}>
            {s.tijd}
          </span>
          <div>
            <p className="font-medium" style={{ color: 'var(--site-text)' }}>{s.titel}</p>
            {s.omschrijving && <p className="mt-0.5 text-sm" style={{ color: 'var(--site-muted)' }}>{s.omschrijving}</p>}
            {s.locatie && <p className="mt-0.5 text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--site-muted)' }}>{s.locatie}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}

function Faq({ items, ctx }: { items: FaqItem[]; ctx: RenderContext }) {
  const [open, setOpen] = React.useState<string | null>(null)
  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const isOpen = open === item.id
        return (
          <li key={item.id} style={{ border: '1px solid hsl(var(--primary)/0.3)' }}>
            <button
              onClick={() => setOpen(isOpen ? null : item.id)}
              className="flex min-h-12 w-full items-center justify-between gap-3 px-5 py-3.5 text-left"
              aria-expanded={isOpen}
            >
              <span className="font-medium" style={{ color: 'var(--site-text)' }}>{item.vraag}</span>
              <ChevronDown
                className="h-4 w-4 shrink-0"
                style={{ color: 'hsl(var(--primary))', transition: `transform 450ms ${EASE}`, transform: isOpen ? 'rotate(180deg)' : undefined }}
              />
            </button>
            <div className="sv-accordion" data-open={isOpen}>
              <div>
                <p className="px-5 pb-4 text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{item.antwoord}</p>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function Rsvp({ block, ctx }: { block: RsvpBlock; ctx: RenderContext }) {
  const form = useRsvpFormulier(ctx)

  const kaart = (inhoud: React.ReactNode) => (
    <div className="relative mx-auto max-w-lg p-6 sm:p-9" style={{ border: '1px solid hsl(var(--primary)/0.4)' }}>
      <Trapmotief className="pointer-events-none absolute -left-px -top-px h-8 w-8" />
      <Trapmotief className="pointer-events-none absolute -right-px -top-px h-8 w-8" spiegel />
      {inhoud}
    </div>
  )

  if (form.fase === 'bevestigen' && form.bevestig) {
    const b = form.bevestig
    return kaart(
      <form onSubmit={b.submit} className="space-y-5 text-center">
        <Kicker>Uw aanwezigheid wordt verzocht</Kicker>
        <p className="text-2xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>
          {b.gast.voornaam}, komt u ook?
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => b.setKeuze('bevestigd')} className={`sv-knop flex-1 ${b.keuze === 'bevestigd' ? 'sv-knop-actief' : ''}`} aria-pressed={b.keuze === 'bevestigd'}>
            <span>Met genoegen</span>
          </button>
          <button type="button" onClick={() => b.setKeuze('afgemeld')} className={`sv-knop flex-1 ${b.keuze === 'afgemeld' ? 'sv-knop-actief' : ''}`} aria-pressed={b.keuze === 'afgemeld'}>
            <span>Helaas niet</span>
          </button>
        </div>
        {b.komt && (
          <div className="space-y-4 text-left">
            <input value={b.dieet} onChange={(e) => b.setDieet(e.target.value)} placeholder="Dieetwensen (optioneel)" className="sv-veld" />
            <label className="flex min-h-12 cursor-pointer items-center gap-3 text-sm" style={{ color: 'var(--site-text)' }}>
              <input type="checkbox" checked={b.heeftPartner} onChange={(e) => b.setHeeftPartner(e.target.checked)} className="h-4 w-4" style={{ accentColor: 'hsl(var(--primary))' }} />
              Ik neem een partner mee
            </label>
            {b.heeftPartner && (
              <input value={b.partnerNaam} onChange={(e) => b.setPartnerNaam(e.target.value)} placeholder="Naam van uw partner" className="sv-veld" />
            )}
            <input type="number" min={0} value={b.kinderen || ''} onChange={(e) => b.setKinderen(Number(e.target.value) || 0)} placeholder="Aantal kinderen" className="sv-veld" />
          </div>
        )}
        <button type="submit" disabled={!b.gekozen || b.bezig} className="sv-knop sv-knop-vol w-full">
          <span>{b.bezig ? 'Bezig…' : 'Antwoord verzenden'}</span>
        </button>
        {b.opgeslagen && <p className="text-sm font-semibold" style={{ color: 'hsl(var(--primary))' }}>Dank u — uw antwoord is genoteerd.</p>}
        {b.fout && <p className="text-sm font-medium text-red-400">{b.fout}</p>}
      </form>
    )
  }

  return kaart(
    <div className="text-center">
      <Kicker>Répondez s&apos;il vous plaît</Kicker>
      {block.introTekst && <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{block.introTekst}</p>}
      <form onSubmit={form.zoek.submit} className="mt-6 space-y-4">
        <input value={form.zoek.voornaam} onChange={(e) => form.zoek.setVoornaam(e.target.value)} placeholder="Voornaam" required className="sv-veld" />
        <input value={form.zoek.achternaam} onChange={(e) => form.zoek.setAchternaam(e.target.value)} placeholder="Achternaam" required className="sv-veld" />
        <button type="submit" disabled={form.zoek.status === 'zoeken'} className="sv-knop w-full">
          <span>{form.zoek.status === 'zoeken' ? 'Bezig…' : 'Zoek mij op'}</span>
        </button>
      </form>
      {form.zoek.melding && <p className="mt-4 text-sm" style={{ color: 'var(--site-muted)' }}>{form.zoek.melding}</p>}
    </div>
  )
}

function TekstFoto({ block }: { block: TekstFotoBlock; ctx: RenderContext }) {
  const foto = block.fotoUrl ? (
    <div style={{ border: '1px solid hsl(var(--primary)/0.4)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={block.fotoUrl} alt="" className="h-56 w-full object-cover sm:h-full" style={{ filter: 'saturate(0.9)' }} />
    </div>
  ) : null
  const tekst = <p className="whitespace-pre-line text-base leading-relaxed" style={{ color: 'var(--site-text)' }}>{block.tekst}</p>
  if (block.fotoPositie === 'boven') {
    return (
      <div className="space-y-6 text-left">
        {foto}
        {tekst}
      </div>
    )
  }
  return (
    <div className="grid items-center gap-8 text-left sm:grid-cols-2">
      {block.fotoPositie === 'links' && foto}
      {tekst}
      {block.fotoPositie === 'rechts' && foto}
    </div>
  )
}

function Content({ block, ctx }: ContentProps) {
  switch (block.type) {
    case 'tekst':
      return <p className="whitespace-pre-line text-lg leading-relaxed" style={{ color: 'var(--site-text)' }}>{block.tekst}</p>
    case 'tekstFoto':
      return <TekstFoto block={block} ctx={ctx} />
    case 'quote':
      return (
        <figure className="mx-auto max-w-lg text-center">
          <Zonnestraal className="mx-auto mb-4 h-10 w-24 opacity-70" stralen={7} />
          <blockquote className="whitespace-pre-line text-2xl leading-snug" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>
            &bdquo;{block.citaat}&rdquo;
          </blockquote>
          {block.bron && (
            <figcaption className="mt-4 text-[11px] uppercase tracking-[0.26em]" style={{ color: 'hsl(var(--primary))' }}>
              {block.bron}
            </figcaption>
          )}
        </figure>
      )
    case 'tijdlijn':
      return <Tijdlijn block={block} ctx={ctx} />
    case 'personen':
      return (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          {block.mensen.map((p) => (
            <div key={p.id} className="text-center">
              <div
                className="mx-auto overflow-hidden"
                style={{ width: '92px', height: '92px', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)', border: '1px solid hsl(var(--primary)/0.5)' }}
              >
                {p.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.fotoUrl} alt="" className="h-full w-full object-cover" style={{ filter: 'saturate(0.9)' }} />
                ) : (
                  <div className="h-full w-full" style={{ background: 'hsl(var(--primary)/0.15)' }} />
                )}
              </div>
              <p className="mt-2.5 text-lg" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>{p.naam}</p>
              {p.rol && <p className="mt-0.5 text-[10px] uppercase tracking-[0.22em]" style={{ color: 'hsl(var(--primary))' }}>{p.rol}</p>}
            </div>
          ))}
        </div>
      )
    case 'locatie':
      return (
        <div className="space-y-5 text-center">
          <div>
            {block.naam && <p className="text-xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>{block.naam}</p>}
            {block.adres && <p className="mt-1 text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--site-muted)' }}>{block.adres}</p>}
          </div>
          {block.tekst && <p className="mx-auto max-w-md whitespace-pre-line text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{block.tekst}</p>}
          {block.kaartInsluitUrl && (
            <div style={{ border: '1px solid hsl(var(--primary)/0.4)' }}>
              <iframe src={block.kaartInsluitUrl} className="h-64 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" title={block.naam || 'Locatie'} />
            </div>
          )}
        </div>
      )
    case 'video': {
      const embedUrl = naarEmbedUrl(block.videoUrl)
      if (!embedUrl) {
        return block.videoUrl ? (
          <a href={block.videoUrl} target="_blank" rel="noopener noreferrer" className="sv-knop">
            <span><Play className="h-3.5 w-3.5" /> Bekijk de video</span>
          </a>
        ) : null
      }
      return (
        <div style={{ border: '1px solid hsl(var(--primary)/0.4)' }}>
          <iframe
            src={embedUrl}
            className="aspect-video w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            title={block.titel || 'Video'}
          />
        </div>
      )
    }
    case 'programma':
      return <Programma block={block} ctx={ctx} />
    case 'countdown':
      return <Countdown ctx={ctx} datum={block.datum || ctx.wedding.trouwdatum} />
    case 'galerij':
      return <Galerij block={block} ctx={ctx} />
    case 'faq':
      return <Faq items={block.items} ctx={ctx} />
    case 'cadeaulijst':
      if (ctx.registry?.enabled) {
        return (
          <div className="space-y-6 text-center">
            {ctx.registry.introText && <p className="mx-auto max-w-md whitespace-pre-line text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{ctx.registry.introText}</p>}
            <a href={`/trouwen/${ctx.slug}/cadeaulijst`} className="sv-knop sv-knop-vol">
              <span>
                <Gift className="h-4 w-4" />
                Bekijk de cadeaulijst
                {ctx.registry.passwordRequired && <Lock className="h-3.5 w-3.5 opacity-70" />}
              </span>
            </a>
          </div>
        )
      }
      return <p className="whitespace-pre-line leading-relaxed" style={{ color: 'var(--site-muted)' }}>{block.tekst}</p>
    case 'contact':
      return <p className="whitespace-pre-line leading-relaxed" style={{ color: 'var(--site-muted)' }}>{block.tekst}</p>
    case 'rsvp':
      return <Rsvp block={block} ctx={ctx} />
    case 'scheiding':
      return <DiamantScheiding />
  }
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function Footer({ ctx }: FooterProps) {
  const { wedding } = ctx
  return (
    <footer className="px-4 py-14 text-center" style={{ background: 'var(--site-card)', borderTop: '1px solid hsl(var(--primary)/0.3)' }}>
      <Zonnestraal className="mx-auto mb-4 h-10 w-28 opacity-60" stralen={9} />
      <p className="text-2xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>
        {wedding.partner1Naam} &amp; {wedding.partner2Naam}
      </p>
      {wedding.trouwdatum && (
        <p className="mt-2 text-xs uppercase tracking-[0.3em]" style={{ color: 'hsl(var(--primary))' }}>
          {formatDatumNL(wedding.trouwdatum)}
        </p>
      )}
    </footer>
  )
}

export const savoyTheme: ThemeRenderer = {
  css: CSS,
  bodyFont: 'var(--font-josefin), "Josefin Sans", system-ui, sans-serif',
  Nav,
  Hero,
  Section,
  Content,
  Footer,
}
