'use client'

// ── Le Jardin (romantisch) — de liefdesbrief ─────────────────────────────────
// Dromerige tuinkamer: boogvormige foto's (rondgetopte arches), zachte
// blush-vlakken die per sectie afwisselen, script-koppen, pill-vormen en
// cirkelportretten. Bewegingstaal: dromerig — 900–1200ms ease-in-out,
// blur-naar-scherp reveals, zwevende ornamenten, focus-states die opbloeien.

import { ChevronDown, Gift, Heart, Lock, Menu, Play, X } from 'lucide-react'
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

const EASE = 'cubic-bezier(0.45, 0.05, 0.25, 1)'

// Boog: ronde top, tokensgestuurde onderhoeken.
const ARCH_RADIUS = '999px 999px var(--site-radius) var(--site-radius)'

const CSS = `
@keyframes ja-bloei {
  from { opacity: 0; transform: translateY(28px); filter: blur(10px); }
  to   { opacity: 1; transform: none; filter: blur(0); }
}
@keyframes ja-zweef {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-7px); }
}
@keyframes ja-adem {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.05); }
}
.ja-hero-item { opacity: 0; animation: ja-bloei 1200ms ${EASE} forwards; }
.ja-zweef { animation: ja-zweef 6s ease-in-out infinite; }
.ja-adem { animation: ja-adem 3.4s ease-in-out infinite; }

.ja-veld {
  height: 3rem;
  width: 100%;
  border-radius: 9999px;
  border: 1px solid hsl(var(--primary) / 0.25);
  background: #fff;
  padding: 0 1.25rem;
  color: #262626;
  transition: border-color 500ms ${EASE}, box-shadow 500ms ${EASE};
}
.ja-veld::placeholder { color: var(--site-muted); opacity: 0.7; }
.ja-veld:focus {
  outline: none;
  border-color: hsl(var(--primary) / 0.55);
  box-shadow: 0 0 0 6px hsl(var(--primary) / 0.12);
}

.ja-knop {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 3rem;
  padding: 0 2rem;
  border-radius: 9999px;
  border: 1px solid transparent;
  background: hsl(var(--primary));
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  transition: transform 600ms ${EASE}, box-shadow 600ms ${EASE}, background-color 600ms ${EASE}, color 600ms ${EASE};
}
.ja-knop:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px -12px hsl(var(--primary) / 0.55);
}
.ja-knop:focus-visible { outline: none; box-shadow: 0 0 0 6px hsl(var(--primary) / 0.2); }
.ja-knop:disabled { opacity: 0.5; cursor: default; }

.ja-knop-zacht {
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
  border-color: hsl(var(--primary) / 0.2);
}
.ja-knop-zacht:hover:not(:disabled) { box-shadow: 0 12px 30px -14px hsl(var(--primary) / 0.4); }

.ja-foto { overflow: hidden; }
.ja-foto img { transition: transform 1400ms ${EASE}; }
.ja-foto:hover img { transform: scale(1.06); }

.ja-nav-link { transition: color 500ms ${EASE}, background-color 500ms ${EASE}; border-radius: 9999px; }
.ja-nav-link:hover, .ja-nav-link[data-actief='true'] { background: hsl(var(--primary) / 0.1); color: hsl(var(--primary)); }

.ja-accordion {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 650ms ${EASE};
}
.ja-accordion[data-open='true'] { grid-template-rows: 1fr; }
.ja-accordion > div { overflow: hidden; }
`

const Reveal = maakReveal({
  verborgen: { opacity: 0, transform: 'translateY(26px)', filter: 'blur(8px)' },
  overgang: `opacity 1000ms ${EASE}, transform 1000ms ${EASE}, filter 1000ms ${EASE}`,
})

// ─── Bouwstenen ──────────────────────────────────────────────────────────────

function Flourish({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 22" className={className ?? 'mx-auto my-4 h-5 w-32'} aria-hidden fill="none">
      <path
        d="M4 13 C 26 3, 46 3, 66 13 M74 13 C 94 23, 114 23, 136 13"
        stroke="hsl(var(--primary)/0.5)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M70 10.5 c -1.8 -2.6 -5.4 -0.6 -3.8 2 c 0.9 1.5 3.8 3 3.8 3 s 2.9 -1.5 3.8 -3 c 1.6 -2.6 -2 -4.6 -3.8 -2 z"
        fill="hsl(var(--primary)/0.55)"
      />
    </svg>
  )
}

function DatumPill({ ctx, licht, className }: { ctx: RenderContext; licht?: boolean; className?: string }) {
  const { wedding } = ctx
  if (!wedding.trouwdatum && !wedding.locatie) return null
  return (
    <p
      className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-xs tracking-[0.14em] ${className ?? ''}`}
      style={{
        borderColor: licht ? 'rgba(255,255,255,0.5)' : 'hsl(var(--primary)/0.35)',
        color: licht ? 'rgba(255,255,255,0.92)' : 'var(--site-muted)',
        background: licht ? 'rgba(255,255,255,0.12)' : 'transparent',
        backdropFilter: licht ? 'blur(4px)' : undefined,
      }}
    >
      {wedding.trouwdatum && <span>{formatDatumNL(wedding.trouwdatum)}</span>}
      {wedding.trouwdatum && wedding.locatie && <Heart className="h-2.5 w-2.5" style={{ fill: 'currentcolor', opacity: 0.6 }} />}
      {wedding.locatie && <span>{wedding.locatie}</span>}
    </p>
  )
}

function ScriptNamen({ ctx, licht, maat }: { ctx: RenderContext; licht?: boolean; maat?: string }) {
  const { wedding, theme } = ctx
  return (
    <h1
      style={{
        ...kopStijl(theme),
        fontSize: maat ?? 'clamp(2.75rem, 8vw, 5.5rem)',
        lineHeight: 1.15,
        color: licht ? '#fff' : 'var(--site-text)',
      }}
    >
      {wedding.partner1Naam}
      <span className="mx-2" style={{ color: licht ? 'rgba(255,255,255,0.75)' : 'hsl(var(--primary))' }}>&amp;</span>
      {wedding.partner2Naam}
    </h1>
  )
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function Hero({ block, ctx }: HeroProps) {
  const heeftFoto = !!block.fotoUrl

  if (block.variant === 'split') {
    return (
      <section className="grid grid-cols-1 items-center gap-10 px-6 py-14 md:grid-cols-2 md:gap-14 md:px-12" style={{ minHeight: vh(78) }}>
        <div className="ja-hero-item mx-auto w-full max-w-sm md:order-2" style={{ animationDelay: '150ms' }}>
          {heeftFoto ? (
            <div className="ja-foto border p-2.5" style={{ borderColor: 'hsl(var(--primary)/0.3)', borderRadius: ARCH_RADIUS, background: '#fff' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={block.fotoUrl} alt="" className="aspect-[3/4] w-full object-cover" style={{ borderRadius: ARCH_RADIUS }} />
            </div>
          ) : (
            <div className="aspect-[3/4] w-full" style={{ background: 'var(--site-card)', borderRadius: ARCH_RADIUS }} />
          )}
        </div>
        <div className="text-center md:order-1">
          <div className="ja-hero-item" style={{ animationDelay: '350ms' }}>
            <ScriptNamen ctx={ctx} />
            <Flourish />
          </div>
          <div className="ja-hero-item" style={{ animationDelay: '550ms' }}>
            <DatumPill ctx={ctx} />
            {block.ondertitel && (
              <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{block.ondertitel}</p>
            )}
          </div>
        </div>
      </section>
    )
  }

  if (block.variant === 'typografisch') {
    return (
      <section className="relative flex items-center justify-center overflow-hidden px-6 py-20" style={{ minHeight: vh(75) }}>
        {/* Zachte boogcontour achter de namen. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[130%] w-[min(88vw,34rem)] -translate-x-1/2 -translate-y-[42%] border"
          style={{ borderColor: 'hsl(var(--primary)/0.18)', borderRadius: '999px 999px 0 0', background: 'var(--site-card)' }}
        />
        {heeftFoto && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={block.fotoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ opacity: 0.12 }} />
            <div className="absolute inset-0" style={{ background: 'color-mix(in srgb, var(--site-bg) 78%, transparent)' }} />
          </>
        )}
        <div className="relative z-10 text-center">
          <div className="ja-hero-item ja-zweef" style={{ animationDelay: '100ms' }}>
            <Heart className="mx-auto h-5 w-5" style={{ color: 'hsl(var(--primary))', fill: 'hsl(var(--primary)/0.4)' }} />
          </div>
          <div className="ja-hero-item mt-6" style={{ animationDelay: '300ms' }}>
            <ScriptNamen ctx={ctx} maat="clamp(3rem, 10vw, 7rem)" />
            <Flourish />
          </div>
          <div className="ja-hero-item" style={{ animationDelay: '600ms' }}>
            <DatumPill ctx={ctx} />
            {block.ondertitel && (
              <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{block.ondertitel}</p>
            )}
          </div>
        </div>
      </section>
    )
  }

  // fullscreen (standaard): full-bleed foto met zacht oplopende gradient.
  return (
    <section className="relative flex items-end justify-center overflow-hidden" style={{ minHeight: vh(78) }}>
      {heeftFoto ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.fotoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${block.overlay ?? 0.35})` }} />
          <div className="absolute inset-x-0 bottom-0 h-3/4" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)' }} />
        </>
      ) : (
        <div className="absolute inset-0" style={{ background: 'var(--site-card)' }} />
      )}
      <div className="relative z-10 px-6 pb-20 pt-32 text-center" style={{ color: heeftFoto ? '#fff' : 'var(--site-text)' }}>
        <div className="ja-hero-item" style={{ animationDelay: '150ms' }}>
          <ScriptNamen ctx={ctx} licht={heeftFoto} />
        </div>
        <div className="ja-hero-item" style={{ animationDelay: '450ms' }}>
          <Flourish className="mx-auto my-4 h-5 w-32 opacity-90" />
          <div className="ja-zweef inline-block">
            <DatumPill ctx={ctx} licht={heeftFoto} />
          </div>
          {block.ondertitel && (
            <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed" style={{ opacity: 0.9 }}>{block.ondertitel}</p>
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
    <nav className="sticky top-3 z-40 px-4">
      <div
        className="relative mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-full border py-2 pl-5 pr-2 shadow-sm backdrop-blur-md"
        style={{ borderColor: 'hsl(var(--primary)/0.2)', background: 'color-mix(in srgb, var(--site-bg) 82%, transparent)' }}
      >
        <span className="truncate text-base" style={{ ...kopStijl(ctx.theme), color: 'var(--site-text)' }}>
          {wedding.partner1Naam} &amp; {wedding.partner2Naam}
        </span>
        <ul className="hidden items-center gap-1 md:flex">
          {items.map((item) => (
            <li key={item.key}>
              <a
                href={item.href}
                data-actief={item.actief || undefined}
                className="ja-nav-link block px-3 py-2 text-xs"
                style={{ color: 'var(--site-muted)' }}
              >
                {item.label}
              </a>
            </li>
          ))}
          {registry?.enabled && slug && (
            <li>
              <a
                href={`/trouwen/${slug}/cadeaulijst`}
                className="ja-knop ja-knop-zacht text-xs"
                style={{ minHeight: '2.5rem', padding: '0 1rem' }}
              >
                <Gift className="h-3 w-3" /> Cadeaulijst
                {registry.passwordRequired && <Lock className="h-2.5 w-2.5 opacity-70" />}
              </a>
            </li>
          )}
        </ul>
        <button
          className="flex h-11 w-11 items-center justify-center rounded-full md:hidden"
          style={{ color: 'var(--site-text)' }}
          onClick={() => setOpen(!open)}
          aria-label="Menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        {open && (
          <div
            className="absolute inset-x-0 top-full mt-2 rounded-3xl border p-3 shadow-lg backdrop-blur-md md:hidden"
            style={{
              borderColor: 'hsl(var(--primary)/0.2)',
              background: 'color-mix(in srgb, var(--site-bg) 94%, transparent)',
              animation: `ja-bloei 500ms ${EASE} both`,
            }}
          >
            <ul className="space-y-0.5">
              {items.map((item) => (
                <li key={item.key}>
                  <a
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="ja-nav-link block px-4 py-2.5 text-center text-sm"
                    style={{ color: 'var(--site-muted)' }}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
              {registry?.enabled && slug && (
                <li className="pt-1">
                  <a
                    href={`/trouwen/${slug}/cadeaulijst`}
                    onClick={() => setOpen(false)}
                    className="ja-knop ja-knop-zacht w-full text-sm"
                  >
                    <Gift className="h-3.5 w-3.5" /> Cadeaulijst
                  </a>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
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
      <section id={`b-${block.id}`} className="scroll-mt-24 px-4 py-4">
        {children}
      </section>
    )
  }

  const layout = block.layout
  const titel = 'titel' in block ? block.titel : ''
  const b = breedte(layout, block.type === 'galerij' || block.type === 'video' || block.type === 'locatie' || block.type === 'personen' ? 'breed' : 'smal')
  const achtergrond = achtergrondVan(layout)
  const uitlijnKlas = UITLIJN_KLASSE[uitlijning(layout, 'midden')]

  // Blush-vlakken wisselen per genummerd blok, ongeacht de blokvolgorde;
  // eigen achtergronden van het stel winnen altijd.
  const blush = !achtergrond.eigen && nummer % 2 === 0

  return (
    <section
      id={`b-${block.id}`}
      className={`relative scroll-mt-24 overflow-hidden px-4 py-14 sm:py-16 ${uitlijnKlas}`}
      style={{ ...(blush ? { background: 'var(--site-card)' } : {}), ...achtergrond.stijl }}
    >
      <AchtergrondFoto layout={layout} />
      <div className={`mx-auto ${BREEDTE_KLASSE[b]}`}>
        <Reveal>
          <KopFoto
            layout={layout}
            className="mx-auto mb-8 h-48 w-full object-cover"
            style={{ borderRadius: ARCH_RADIUS }}
          />
          {titel && (
            <header className="mb-8 text-center">
              <h2 className="text-4xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>{titel}</h2>
              <Flourish />
            </header>
          )}
          {children}
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
      <div className="text-center">
        <Heart className="mx-auto h-6 w-6" style={{ color: 'hsl(var(--primary))', fill: 'hsl(var(--primary)/0.4)' }} />
        <p className="mt-3 text-3xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>Wij zijn getrouwd</p>
      </div>
    )
  }
  const delen = [
    { val: rest.dagen, label: 'dagen', adem: false },
    { val: rest.uren, label: 'uren', adem: false },
    { val: rest.minuten, label: 'minuten', adem: false },
    { val: rest.seconden, label: 'seconden', adem: true },
  ]
  return (
    <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
      {delen.map(({ val, label, adem }) => (
        <div
          key={label}
          className={`flex h-24 w-24 flex-col items-center justify-center rounded-full border sm:h-28 sm:w-28 ${adem ? 'ja-adem' : ''}`}
          style={{ borderColor: 'hsl(var(--primary)/0.3)', background: 'color-mix(in srgb, var(--site-bg) 55%, #ffffff)' }}
        >
          <span className="text-3xl tabular-nums sm:text-4xl" style={kopStijl(ctx.theme, { color: 'hsl(var(--primary))' })}>
            {String(val).padStart(2, '0')}
          </span>
          <span className="mt-0.5 text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--site-muted)' }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

function Tijdlijn({ block, ctx }: { block: TijdlijnBlock; ctx: RenderContext }) {
  return (
    <ol className="relative mx-auto max-w-2xl">
      <span
        aria-hidden
        className="absolute bottom-4 top-4 left-[11px] border-l border-dashed md:left-1/2 md:-translate-x-px"
        style={{ borderColor: 'hsl(var(--primary)/0.4)' }}
      />
      {block.momenten.map((m, i) => {
        const links = i % 2 === 0
        return (
          <li key={m.id} className="relative pb-10 pl-12 last:pb-0 md:grid md:grid-cols-2 md:gap-16 md:pl-0">
            <span
              aria-hidden
              className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full md:left-1/2 md:-translate-x-1/2"
              style={{ background: 'hsl(var(--primary)/0.15)' }}
            >
              <Heart className="h-3 w-3" style={{ color: 'hsl(var(--primary))', fill: 'hsl(var(--primary))' }} />
            </span>
            <div
              className={`rounded-3xl border p-5 text-left ${links ? 'md:col-start-1' : 'md:col-start-2'}`}
              style={{ borderColor: 'hsl(var(--primary)/0.18)', background: 'color-mix(in srgb, var(--site-bg) 40%, #ffffff)' }}
            >
              <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--primary))' }}>{m.datum}</p>
              <p className="mt-1.5 text-2xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>{m.titel}</p>
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
        <div style={{ columns: '2', columnGap: '14px' }}>
          {block.fotos.map((f, i) => (
            <button
              key={f.id}
              type="button"
              onClick={() => lightbox.open(i)}
              className="ja-foto mb-3.5 block w-full"
              style={{ borderRadius: i % 3 === 0 ? ARCH_RADIUS : '1.25rem', overflow: 'hidden' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt={f.bijschrift || ''} className="block w-full" style={{ breakInside: 'avoid' }} />
            </button>
          ))}
        </div>
        {lightbox.openIndex !== null && <Lightbox fotos={block.fotos} start={lightbox.openIndex} onSluit={lightbox.sluit} />}
      </>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {block.fotos.map((f, i) => (
          <button
            key={f.id}
            type="button"
            onClick={() => lightbox.open(i)}
            className="ja-foto block"
            style={{ borderRadius: ARCH_RADIUS, overflow: 'hidden' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.url} alt={f.bijschrift || ''} className="aspect-[3/4] w-full object-cover" />
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
    <ol className="relative mx-auto max-w-md text-left">
      <span aria-hidden className="absolute bottom-5 top-5 left-[47px] border-l border-dashed" style={{ borderColor: 'hsl(var(--primary)/0.35)' }} />
      {ctx.schedule.map((s, i) => (
        <li key={i} className="relative flex gap-5 pb-8 last:pb-0">
          <span
            className="z-10 flex h-24 w-24 shrink-0 flex-col items-center justify-center self-start rounded-full border text-center"
            style={{ borderColor: 'hsl(var(--primary)/0.3)', background: 'color-mix(in srgb, var(--site-bg) 45%, #ffffff)' }}
          >
            <span className="text-sm font-semibold tabular-nums" style={{ color: 'hsl(var(--primary))' }}>{s.tijd}</span>
            {s.eindtijd && <span className="text-[10px] tabular-nums" style={{ color: 'var(--site-muted)' }}>tot {s.eindtijd}</span>}
          </span>
          <div className="pt-3">
            <p className="text-xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>{s.titel}</p>
            {s.omschrijving && <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{s.omschrijving}</p>}
            {s.locatie && <p className="mt-0.5 text-xs italic" style={{ color: 'var(--site-muted)' }}>{s.locatie}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}

function Faq({ items }: { items: FaqItem[]; ctx: RenderContext }) {
  const [open, setOpen] = React.useState<string | null>(null)
  return (
    <ul className="space-y-3 text-left">
      {items.map((item) => {
        const isOpen = open === item.id
        return (
          <li
            key={item.id}
            className="rounded-3xl border"
            style={{ borderColor: 'hsl(var(--primary)/0.18)', background: 'color-mix(in srgb, var(--site-bg) 40%, #ffffff)' }}
          >
            <button
              onClick={() => setOpen(isOpen ? null : item.id)}
              className="flex min-h-12 w-full items-center justify-between gap-3 px-5 py-3.5 text-left"
              aria-expanded={isOpen}
            >
              <span className="font-medium" style={{ color: 'var(--site-text)' }}>{item.vraag}</span>
              <ChevronDown
                className="h-4 w-4 shrink-0"
                style={{ color: 'hsl(var(--primary))', transition: `transform 650ms ${EASE}`, transform: isOpen ? 'rotate(180deg)' : undefined }}
              />
            </button>
            <div className="ja-accordion" data-open={isOpen}>
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
    <div
      className="mx-auto max-w-lg rounded-[2rem] border p-6 shadow-sm sm:p-9"
      style={{ borderColor: 'hsl(var(--primary)/0.2)', background: '#fff' }}
    >
      {inhoud}
    </div>
  )

  if (form.fase === 'bevestigen' && form.bevestig) {
    const b = form.bevestig
    return kaart(
      <form onSubmit={b.submit} className="space-y-5 text-center">
        <Heart className="mx-auto h-5 w-5" style={{ color: 'hsl(var(--primary))', fill: 'hsl(var(--primary)/0.35)' }} />
        <p className="text-2xl" style={kopStijl(ctx.theme, { color: '#262626' })}>
          Lieve {b.gast.voornaam}, ben je erbij?
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => b.setKeuze('bevestigd')}
            className={`ja-knop flex-1 ${b.keuze === 'bevestigd' ? '' : 'ja-knop-zacht'}`}
            aria-pressed={b.keuze === 'bevestigd'}
          >
            Ja, met liefde
          </button>
          <button
            type="button"
            onClick={() => b.setKeuze('afgemeld')}
            className={`ja-knop flex-1 ${b.keuze === 'afgemeld' ? '' : 'ja-knop-zacht'}`}
            aria-pressed={b.keuze === 'afgemeld'}
          >
            Helaas niet
          </button>
        </div>
        {b.komt && (
          <div className="space-y-4 text-left">
            <input value={b.dieet} onChange={(e) => b.setDieet(e.target.value)} placeholder="Dieetwensen (optioneel)" className="ja-veld" />
            <label className="flex min-h-12 cursor-pointer items-center gap-3 pl-2 text-sm" style={{ color: '#262626' }}>
              <input
                type="checkbox"
                checked={b.heeftPartner}
                onChange={(e) => b.setHeeftPartner(e.target.checked)}
                className="h-4 w-4"
                style={{ accentColor: 'hsl(var(--primary))' }}
              />
              Ik neem een partner mee
            </label>
            {b.heeftPartner && (
              <input value={b.partnerNaam} onChange={(e) => b.setPartnerNaam(e.target.value)} placeholder="Naam van je partner" className="ja-veld" />
            )}
            <input
              type="number"
              min={0}
              value={b.kinderen || ''}
              onChange={(e) => b.setKinderen(Number(e.target.value) || 0)}
              placeholder="Aantal kinderen"
              className="ja-veld"
            />
          </div>
        )}
        <button type="submit" disabled={!b.gekozen || b.bezig} className="ja-knop w-full">
          {b.bezig ? 'Bezig…' : 'Verstuur met liefde'}
        </button>
        {b.opgeslagen && (
          <p className="text-sm font-medium" style={{ color: 'hsl(var(--primary))' }}>
            Dank je wel! Je reactie is opgeslagen. ♥
          </p>
        )}
        {b.fout && <p className="text-sm font-medium text-red-600">{b.fout}</p>}
      </form>
    )
  }

  return kaart(
    <div className="text-center">
      <Heart className="mx-auto h-5 w-5" style={{ color: 'hsl(var(--primary))', fill: 'hsl(var(--primary)/0.35)' }} />
      {block.introTekst && (
        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{block.introTekst}</p>
      )}
      <form onSubmit={form.zoek.submit} className="mt-6 space-y-4">
        <input
          value={form.zoek.voornaam}
          onChange={(e) => form.zoek.setVoornaam(e.target.value)}
          placeholder="Voornaam"
          required
          className="ja-veld"
        />
        <input
          value={form.zoek.achternaam}
          onChange={(e) => form.zoek.setAchternaam(e.target.value)}
          placeholder="Achternaam"
          required
          className="ja-veld"
        />
        <button type="submit" disabled={form.zoek.status === 'zoeken'} className="ja-knop w-full">
          {form.zoek.status === 'zoeken' ? 'Bezig…' : 'Zoek mij op'}
        </button>
      </form>
      {form.zoek.melding && <p className="mt-4 text-sm" style={{ color: 'var(--site-muted)' }}>{form.zoek.melding}</p>}
    </div>
  )
}

function TekstFoto({ block }: { block: TekstFotoBlock; ctx: RenderContext }) {
  const foto = block.fotoUrl ? (
    <div className="ja-foto" style={{ borderRadius: ARCH_RADIUS, overflow: 'hidden' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={block.fotoUrl} alt="" className="aspect-[3/4] w-full object-cover" />
    </div>
  ) : null
  const tekst = (
    <p className="whitespace-pre-line text-base leading-relaxed" style={{ color: 'var(--site-text)' }}>{block.tekst}</p>
  )
  if (block.fotoPositie === 'boven') {
    return (
      <div className="space-y-6 text-left">
        {block.fotoUrl && (
          <div className="ja-foto" style={{ borderRadius: '1.5rem', overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={block.fotoUrl} alt="" className="h-64 w-full object-cover" />
          </div>
        )}
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
      return <p className="whitespace-pre-line text-lg leading-loose" style={{ color: 'var(--site-text)' }}>{block.tekst}</p>
    case 'tekstFoto':
      return <TekstFoto block={block} ctx={ctx} />
    case 'quote':
      return (
        <figure className="mx-auto max-w-lg text-center">
          <Flourish />
          <blockquote
            className="whitespace-pre-line text-3xl leading-snug"
            style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}
          >
            {block.citaat}
          </blockquote>
          {block.bron && (
            <figcaption className="mt-5">
              <span
                className="inline-block rounded-full border px-4 py-1.5 text-xs tracking-[0.14em]"
                style={{ borderColor: 'hsl(var(--primary)/0.3)', color: 'var(--site-muted)' }}
              >
                {block.bron}
              </span>
            </figcaption>
          )}
        </figure>
      )
    case 'tijdlijn':
      return <Tijdlijn block={block} ctx={ctx} />
    case 'personen':
      return (
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
          {block.mensen.map((p) => (
            <div key={p.id} className="flex flex-col items-center gap-3 text-center">
              <div className="rounded-full p-1.5" style={{ background: 'hsl(var(--primary)/0.12)' }}>
                <div className="rounded-full bg-white p-1">
                  {p.fotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.fotoUrl} alt="" className="h-24 w-24 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full" style={{ background: 'hsl(var(--primary)/0.12)' }}>
                      <Heart className="h-5 w-5" style={{ color: 'hsl(var(--primary)/0.5)' }} />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>{p.naam}</p>
                {p.rol && <p className="mt-0.5 text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--site-muted)' }}>{p.rol}</p>}
              </div>
            </div>
          ))}
        </div>
      )
    case 'locatie':
      return (
        <div className="space-y-5">
          <div>
            {block.naam && <p className="text-2xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>{block.naam}</p>}
            {block.adres && <p className="mt-1 text-sm" style={{ color: 'var(--site-muted)' }}>{block.adres}</p>}
          </div>
          {block.tekst && <p className="mx-auto max-w-md whitespace-pre-line text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{block.tekst}</p>}
          {block.kaartInsluitUrl && (
            <div className="overflow-hidden border" style={{ borderRadius: '1.75rem', borderColor: 'hsl(var(--primary)/0.2)' }}>
              <iframe
                src={block.kaartInsluitUrl}
                className="h-64 w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={block.naam || 'Locatie'}
              />
            </div>
          )}
        </div>
      )
    case 'video': {
      const embedUrl = naarEmbedUrl(block.videoUrl)
      if (!embedUrl) {
        return block.videoUrl ? (
          <a href={block.videoUrl} target="_blank" rel="noopener noreferrer" className="ja-knop ja-knop-zacht">
            <Play className="h-3.5 w-3.5" /> Bekijk de video
          </a>
        ) : null
      }
      return (
        <div className="overflow-hidden" style={{ borderRadius: '1.75rem' }}>
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
            {ctx.registry.introText && (
              <p className="mx-auto max-w-md whitespace-pre-line text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>
                {ctx.registry.introText}
              </p>
            )}
            <a href={`/trouwen/${ctx.slug}/cadeaulijst`} className="ja-knop">
              <Gift className="h-4 w-4" />
              Bekijk de cadeaulijst
              {ctx.registry.passwordRequired && <Lock className="h-3.5 w-3.5 opacity-70" />}
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
      return <Flourish />
  }
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function Footer({ ctx }: FooterProps) {
  const { wedding } = ctx
  return (
    <footer className="px-4 pb-16 pt-12 text-center">
      <Flourish />
      <p className="mt-2 text-3xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>
        {wedding.partner1Naam} &amp; {wedding.partner2Naam}
      </p>
      <div className="mt-4">
        <DatumPill ctx={ctx} />
      </div>
    </footer>
  )
}

export const jardinTheme: ThemeRenderer = {
  css: CSS,
  bodyFont: 'var(--font-lora), Lora, Georgia, serif',
  Nav,
  Hero,
  Section,
  Content,
  Footer,
}
