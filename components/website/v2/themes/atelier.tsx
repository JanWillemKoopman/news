'use client'

// ── The Atelier (klassiek) — de gedrukte uitnodiging ─────────────────────────
// Letterpress-trouwkaart als website: alles gecentreerd en ingelijst in
// dubbele haarlijnen, monogram-medaillon, kleinkapitalen met veel spatiëring,
// ovale portretten en passe-partout-fotolijsten.
// Bewegingstaal: statig — 900–1100ms, cubic-bezier(.23,.9,.32,1); zachte
// opkomst, lijnen die zich uittekenen, knoppen die langzaam met inkt vullen.

import { ChevronDown, Gift, Lock, Menu, Play, X } from 'lucide-react'
import * as React from 'react'

import { formatDatumNL } from '@/lib/bruiloft/format'
import type { FaqItem } from '@/lib/bruiloft/types'
import type { GalerijBlock, ProgrammaBlock, RsvpBlock, TekstFotoBlock, TijdlijnBlock } from '@/lib/bruiloft/websiteBlocks'
import { ORNAMENT_TEKEN } from '@/lib/bruiloft/websiteTheme'

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
  voorletters,
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

const EASE = 'cubic-bezier(0.23, 0.9, 0.32, 1)'

const CSS = `
@keyframes at-opkomst {
  from { opacity: 0; transform: translateY(22px); }
  to   { opacity: 1; transform: none; }
}
@keyframes at-lijn {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}
.at-hero-item { opacity: 0; animation: at-opkomst 1100ms ${EASE} forwards; }
.at-hero-lijn { transform-origin: center; animation: at-lijn 1400ms ${EASE} both; }

.at-veld {
  height: 3rem;
  width: 100%;
  border: 0;
  border-bottom: 1px solid hsl(var(--primary) / 0.35);
  border-radius: 0;
  background: transparent;
  padding: 0 2px;
  color: var(--site-text);
  caret-color: hsl(var(--primary));
  transition: border-color 600ms ${EASE};
}
.at-veld::placeholder { color: var(--site-muted); opacity: 0.7; }
.at-veld:focus { outline: none; border-bottom-color: hsl(var(--primary)); }

.at-knop {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 3rem;
  padding: 0 1.75rem;
  border: 1px solid hsl(var(--primary));
  color: hsl(var(--primary));
  background: transparent;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  transition: background-color 500ms ${EASE}, color 500ms ${EASE}, border-color 500ms ${EASE};
}
.at-knop:hover:not(:disabled) { background: hsl(var(--primary)); color: #fff; }
.at-knop:focus-visible { outline: 2px solid hsl(var(--primary)); outline-offset: 3px; }
.at-knop:disabled { opacity: 0.45; cursor: default; }

.at-knop-vol {
  background: hsl(var(--primary));
  color: #fff;
}
.at-knop-vol:hover:not(:disabled) { background: hsl(var(--primary) / 0.85); border-color: hsl(var(--primary) / 0.85); }

.at-knop-actief { background: hsl(var(--primary)); color: #fff; }

.at-foto-mat {
  background: var(--site-card);
  border: 1px solid hsl(var(--primary) / 0.18);
  padding: 8px;
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.06);
}
.at-foto-mat img { transition: transform 1200ms ${EASE}; }
.at-foto-mat:hover img { transform: scale(1.035); }

.at-nav-link {
  position: relative;
  transition: color 500ms ${EASE};
}
.at-nav-link::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -3px;
  width: 0;
  height: 1px;
  background: hsl(var(--primary));
  transition: width 500ms ${EASE}, left 500ms ${EASE};
}
.at-nav-link:hover::after, .at-nav-link[data-actief='true']::after { left: 15%; width: 70%; }

.at-accordion {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 500ms ${EASE};
}
.at-accordion[data-open='true'] { grid-template-rows: 1fr; }
.at-accordion > div { overflow: hidden; }
`

const Reveal = maakReveal({
  verborgen: { opacity: 0, transform: 'translateY(22px)' },
  overgang: `opacity 1000ms ${EASE}, transform 1000ms ${EASE}`,
})

// ─── Bouwstenen ──────────────────────────────────────────────────────────────

function ornamentTeken(ctx: RenderContext): string {
  return ctx.theme.ornament === 'geen' ? '◆' : ORNAMENT_TEKEN[ctx.theme.ornament]
}

// Haarlijn — ornament — haarlijn.
function OrnamentRegel({ ctx, breed }: { ctx: RenderContext; breed?: boolean }) {
  return (
    <div className="my-3 flex items-center justify-center gap-3" aria-hidden>
      <span className={`h-px ${breed ? 'w-20' : 'w-12'}`} style={{ background: 'hsl(var(--primary)/0.3)' }} />
      <span style={{ color: 'hsl(var(--primary)/0.6)', fontSize: '10px', letterSpacing: '2px' }}>
        {ornamentTeken(ctx)}
      </span>
      <span className={`h-px ${breed ? 'w-20' : 'w-12'}`} style={{ background: 'hsl(var(--primary)/0.3)' }} />
    </div>
  )
}

function Kleinkapitaal({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <p className={`text-[11px] font-medium uppercase tracking-[0.28em] ${className ?? ''}`} style={style}>
      {children}
    </p>
  )
}

// Monogram-medaillon met de voorletters in een dubbele cirkel.
function Medaillon({ ctx, kleur }: { ctx: RenderContext; kleur?: string }) {
  const [a, b] = voorletters(ctx.wedding)
  if (!a && !b) return null
  const rand = kleur ?? 'hsl(var(--primary)/0.5)'
  return (
    <div
      className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border p-1"
      style={{ borderColor: rand }}
      aria-hidden
    >
      <div
        className="flex h-full w-full items-center justify-center rounded-full border text-base"
        style={{ borderColor: rand, ...kopStijl(ctx.theme), color: kleur ?? 'hsl(var(--primary))', letterSpacing: '0.1em' }}
      >
        {a}·{b}
      </div>
    </div>
  )
}

// Dubbele haarlijn-passe-partout om de hero.
function HeroKader({ licht }: { licht: boolean }) {
  const kleur = licht ? 'rgba(255,255,255,0.55)' : 'hsl(var(--primary)/0.3)'
  const kleurBinnen = licht ? 'rgba(255,255,255,0.35)' : 'hsl(var(--primary)/0.18)'
  return (
    <div className="at-hero-lijn pointer-events-none absolute inset-3 z-10 sm:inset-5" aria-hidden>
      <div className="absolute inset-0 border" style={{ borderColor: kleur }} />
      <div className="absolute inset-2 border" style={{ borderColor: kleurBinnen }} />
    </div>
  )
}

function DatumRegel({ ctx, kleur }: { ctx: RenderContext; kleur?: string }) {
  const { wedding } = ctx
  if (!wedding.trouwdatum && !wedding.locatie) return null
  return (
    <Kleinkapitaal className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1" style={{ color: kleur }}>
      {wedding.trouwdatum && <span>{formatDatumNL(wedding.trouwdatum)}</span>}
      {wedding.trouwdatum && wedding.locatie && <span aria-hidden style={{ fontSize: '7px' }}>◆</span>}
      {wedding.locatie && <span>{wedding.locatie}</span>}
    </Kleinkapitaal>
  )
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function HeroInhoud({ ctx, licht, ondertitel }: { ctx: RenderContext; licht: boolean; ondertitel: string }) {
  const { wedding, theme } = ctx
  const tekstKleur = licht ? '#ffffff' : 'var(--site-text)'
  const zacht = licht ? 'rgba(255,255,255,0.8)' : 'var(--site-muted)'
  return (
    <div className="relative z-20 px-10 py-24 text-center" style={{ color: tekstKleur }}>
      <div className="at-hero-item" style={{ animationDelay: '100ms' }}>
        <Medaillon ctx={ctx} kleur={licht ? 'rgba(255,255,255,0.85)' : undefined} />
      </div>
      <h1
        className="at-hero-item mt-8"
        style={{
          ...kopStijl(theme),
          animationDelay: '300ms',
          fontSize: 'clamp(2.5rem, 7vw, 4.75rem)',
          lineHeight: 1.15,
        }}
      >
        {wedding.partner1Naam}
        <span className="mx-3" style={{ color: licht ? 'rgba(255,255,255,0.7)' : 'hsl(var(--primary))' }}>&amp;</span>
        {wedding.partner2Naam}
      </h1>
      <div className="at-hero-item" style={{ animationDelay: '500ms' }}>
        <OrnamentRegel ctx={ctx} breed />
        <DatumRegel ctx={ctx} kleur={zacht} />
        {ondertitel && (
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed" style={{ color: zacht }}>
            {ondertitel}
          </p>
        )}
      </div>
    </div>
  )
}

function Hero({ block, ctx }: HeroProps) {
  const heeftFoto = !!block.fotoUrl

  if (block.variant === 'split') {
    return (
      <section className="relative grid grid-cols-1 md:grid-cols-2" style={{ minHeight: vh(78) }}>
        <div className="relative order-2 flex items-center justify-center p-8 md:order-1 md:p-14" style={{ background: 'var(--site-card)' }}>
          {heeftFoto ? (
            <div className="at-foto-mat at-hero-item w-full max-w-md overflow-hidden" style={{ animationDelay: '200ms' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={block.fotoUrl} alt="" className="aspect-[3/4] w-full object-cover" />
            </div>
          ) : (
            <Medaillon ctx={ctx} />
          )}
        </div>
        <div className="order-1 flex items-center justify-center md:order-2">
          <HeroInhoud ctx={ctx} licht={false} ondertitel={block.ondertitel} />
        </div>
        <HeroKader licht={false} />
      </section>
    )
  }

  if (block.variant === 'typografisch') {
    return (
      <section className="relative flex items-center justify-center overflow-hidden" style={{ minHeight: vh(80) }}>
        {heeftFoto && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={block.fotoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ opacity: 0.1 }} />
            <div className="absolute inset-0" style={{ background: 'color-mix(in srgb, var(--site-bg) 82%, transparent)' }} />
          </>
        )}
        <HeroKader licht={false} />
        <HeroInhoud ctx={ctx} licht={false} ondertitel={block.ondertitel} />
      </section>
    )
  }

  // fullscreen (standaard)
  return (
    <section className="relative flex items-center justify-center overflow-hidden" style={{ minHeight: vh(72) }}>
      {heeftFoto ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.fotoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${block.overlay ?? 0.35})` }} />
        </>
      ) : (
        <div className="absolute inset-0" style={{ background: 'var(--site-card)' }} />
      )}
      <HeroKader licht={heeftFoto} />
      <HeroInhoud ctx={ctx} licht={heeftFoto} ondertitel={block.ondertitel} />
    </section>
  )
}

// ─── Navigatie ───────────────────────────────────────────────────────────────

function Nav({ items, ctx }: NavProps) {
  const { wedding, registry, slug } = ctx
  const [open, setOpen] = React.useState(false)
  const [a, b] = voorletters(wedding)

  return (
    <nav
      className="sticky top-0 z-40 backdrop-blur-sm"
      style={{
        background: 'color-mix(in srgb, var(--site-bg) 92%, transparent)',
        borderBottom: '1px solid hsl(var(--primary)/0.15)',
      }}
    >
      <div className="relative mx-auto max-w-4xl px-5 py-3 text-center">
        <a href="#" className="inline-block text-lg" style={{ ...kopStijl(ctx.theme), color: 'var(--site-text)', letterSpacing: '0.15em' }}>
          {a}·{b}
        </a>
        <button
          className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center md:hidden"
          style={{ color: 'var(--site-text)' }}
          onClick={() => setOpen(!open)}
          aria-label="Menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <ul className="mt-1.5 hidden items-center justify-center gap-7 md:flex">
          {items.map((item) => (
            <li key={item.key}>
              <a
                href={item.href}
                data-actief={item.actief || undefined}
                className="at-nav-link text-[10px] font-medium uppercase tracking-[0.22em]"
                style={{ color: item.actief ? 'var(--site-text)' : 'var(--site-muted)' }}
              >
                {item.label}
              </a>
            </li>
          ))}
          {registry?.enabled && slug && (
            <li>
              <a
                href={`/trouwen/${slug}/cadeaulijst`}
                className="at-nav-link inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.22em]"
                style={{ color: 'hsl(var(--primary))' }}
              >
                <Gift className="h-3 w-3" /> Cadeaulijst
                {registry.passwordRequired && <Lock className="h-2.5 w-2.5 opacity-70" />}
              </a>
            </li>
          )}
        </ul>
      </div>
      {open && (
        <div className="border-t px-5 py-4 text-center md:hidden" style={{ borderColor: 'hsl(var(--primary)/0.12)' }}>
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.key}>
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block py-2.5 text-[11px] uppercase tracking-[0.22em]"
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
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-2 py-2.5 text-[11px] font-semibold uppercase tracking-[0.22em]"
                  style={{ color: 'hsl(var(--primary))' }}
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

function Section({ block, ctx, children }: SectionProps) {
  if (block.type === 'scheiding') {
    return (
      <section id={`b-${block.id}`} className="scroll-mt-24 px-4 py-4">
        {children}
      </section>
    )
  }

  const layout = block.layout
  const titel = 'titel' in block ? block.titel : ''
  const b = breedte(layout, block.type === 'galerij' || block.type === 'video' || block.type === 'locatie' ? 'breed' : 'smal')
  const achtergrond = achtergrondVan(layout)
  const uitlijnKlas = UITLIJN_KLASSE[uitlijning(layout, 'midden')]

  // Antwoordkaart (rsvp) is altijd omkaderd; verder volgt de sectiestijl de
  // kaart-token: 'kaart' → passe-partout-plaat, anders open typografie.
  const omkaderd = !achtergrond.eigen && (block.type === 'rsvp' || ctx.theme.kaartStijl === 'kaart')

  return (
    <section
      id={`b-${block.id}`}
      className={`relative scroll-mt-24 overflow-hidden px-4 py-12 sm:py-14 ${uitlijnKlas}`}
      style={achtergrond.stijl}
    >
      <AchtergrondFoto layout={layout} />
      <div className={`mx-auto ${BREEDTE_KLASSE[b]}`}>
        <Reveal>
          <KopFoto layout={layout} className="mx-auto mb-8 h-44 w-full object-cover at-foto-mat" />
          {titel && (
            <header className="mb-8 text-center">
              <h2 className="text-3xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>{titel}</h2>
              <OrnamentRegel ctx={ctx} />
            </header>
          )}
          {omkaderd ? (
            <div
              className="border p-6 sm:p-9"
              style={{
                background: 'var(--site-card)',
                borderColor: 'hsl(var(--primary)/0.15)',
                borderRadius: 'var(--site-radius)',
                boxShadow: '0 1px 3px rgb(0 0 0 / 0.05)',
              }}
            >
              {children}
            </div>
          ) : (
            children
          )}
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
        <p className="text-2xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>Voor altijd begonnen</p>
        <Kleinkapitaal className="mt-2" style={{ color: 'var(--site-muted)' }}>Wij zijn getrouwd</Kleinkapitaal>
      </div>
    )
  }
  const delen = [
    { val: rest.dagen, label: 'Dagen' },
    { val: rest.uren, label: 'Uren' },
    { val: rest.minuten, label: 'Minuten' },
    { val: rest.seconden, label: 'Seconden' },
  ]
  return (
    <div className="mx-auto flex max-w-md items-stretch justify-center">
      {delen.map(({ val, label }, i) => (
        <React.Fragment key={label}>
          {i > 0 && <span aria-hidden className="mx-3 w-px self-stretch sm:mx-5" style={{ background: 'hsl(var(--primary)/0.25)' }} />}
          <div className="flex min-w-[3.25rem] flex-col items-center gap-2">
            <span className="text-4xl tabular-nums sm:text-5xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>
              {String(val).padStart(2, '0')}
            </span>
            <Kleinkapitaal style={{ color: 'var(--site-muted)' }}>{label}</Kleinkapitaal>
          </div>
        </React.Fragment>
      ))}
    </div>
  )
}

function Tijdlijn({ block, ctx }: { block: TijdlijnBlock; ctx: RenderContext }) {
  return (
    <ol className="relative mx-auto max-w-2xl">
      {/* Ruggengraat: mobiel links, desktop in het midden. */}
      <span aria-hidden className="absolute bottom-2 top-2 left-[5px] w-px md:left-1/2 md:-translate-x-1/2" style={{ background: 'hsl(var(--primary)/0.25)' }} />
      {block.momenten.map((m, i) => {
        const links = i % 2 === 0
        return (
          <li key={m.id} className="relative pb-10 pl-8 last:pb-0 md:grid md:grid-cols-2 md:gap-14 md:pl-0">
            <span
              aria-hidden
              className="absolute left-[5px] top-1.5 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border md:left-1/2"
              style={{ borderColor: 'hsl(var(--primary))', background: 'var(--site-bg)' }}
            />
            <div className={`text-left ${links ? 'md:col-start-1 md:pr-2 md:text-right' : 'md:col-start-2 md:pl-2'}`}>
              <Kleinkapitaal style={{ color: 'hsl(var(--primary))' }}>{m.datum}</Kleinkapitaal>
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
        <div style={{ columns: '2', columnGap: '12px' }}>
          {block.fotos.map((f, i) => (
            <button
              key={f.id}
              type="button"
              onClick={() => lightbox.open(i)}
              className="at-foto-mat mb-3 block w-full overflow-hidden"
              style={{ breakInside: 'avoid' }}
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {block.fotos.map((f, i) => (
          <button
            key={f.id}
            type="button"
            onClick={() => lightbox.open(i)}
            className={`at-foto-mat overflow-hidden ${i === 0 ? 'col-span-2 row-span-2' : ''}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.url} alt={f.bijschrift || ''} className="aspect-square h-full w-full object-cover" />
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
    <ol className="mx-auto max-w-md">
      {ctx.schedule.map((s, i) => (
        <li key={i} className="text-center">
          {i > 0 && <OrnamentRegel ctx={ctx} />}
          <div className="py-1">
            <Kleinkapitaal style={{ color: 'hsl(var(--primary))' }}>
              {s.tijd}
              {s.eindtijd && <span> — {s.eindtijd}</span>}
            </Kleinkapitaal>
            <p className="mt-1.5 text-xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>{s.titel}</p>
            {s.omschrijving && <p className="mt-1 text-sm" style={{ color: 'var(--site-muted)' }}>{s.omschrijving}</p>}
            {s.locatie && <p className="mt-0.5 text-sm italic" style={{ color: 'var(--site-muted)' }}>{s.locatie}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}

function Faq({ items, ctx }: { items: FaqItem[]; ctx: RenderContext }) {
  const [open, setOpen] = React.useState<string | null>(null)
  return (
    <ul className="mx-auto max-w-lg text-center">
      {items.map((item, i) => (
        <li key={item.id} style={{ borderTop: i > 0 ? '1px solid hsl(var(--primary)/0.12)' : undefined }}>
          <button
            onClick={() => setOpen(open === item.id ? null : item.id)}
            className="flex min-h-12 w-full items-center justify-center gap-2 px-2 py-4"
            aria-expanded={open === item.id}
          >
            <span className="text-lg italic" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>{item.vraag}</span>
            <ChevronDown
              className="h-4 w-4 shrink-0"
              style={{ color: 'var(--site-muted)', transition: `transform 500ms ${EASE}`, transform: open === item.id ? 'rotate(180deg)' : undefined }}
            />
          </button>
          <div className="at-accordion" data-open={open === item.id}>
            <div>
              <p className="mx-auto max-w-md pb-5 text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{item.antwoord}</p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

function Rsvp({ block, ctx }: { block: RsvpBlock; ctx: RenderContext }) {
  const form = useRsvpFormulier(ctx.slug)

  if (form.fase === 'bevestigen' && form.bevestig) {
    const b = form.bevestig
    return (
      <form onSubmit={b.submit} className="space-y-6 text-center">
        <p className="text-xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>
          Hoi {b.gast.voornaam}, ben je erbij?
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => b.setKeuze('bevestigd')} className={`at-knop flex-1 ${b.keuze === 'bevestigd' ? 'at-knop-actief' : ''}`} aria-pressed={b.keuze === 'bevestigd'}>
            Met veel plezier
          </button>
          <button type="button" onClick={() => b.setKeuze('afgemeld')} className={`at-knop flex-1 ${b.keuze === 'afgemeld' ? 'at-knop-actief' : ''}`} aria-pressed={b.keuze === 'afgemeld'}>
            Helaas niet
          </button>
        </div>
        {b.komt && (
          <div className="space-y-5 text-left">
            <input value={b.dieet} onChange={(e) => b.setDieet(e.target.value)} placeholder="Dieetwensen (optioneel)" className="at-veld" />
            <label className="flex min-h-12 cursor-pointer items-center gap-3 text-sm" style={{ color: 'var(--site-text)' }}>
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
              <input value={b.partnerNaam} onChange={(e) => b.setPartnerNaam(e.target.value)} placeholder="Naam van je partner" className="at-veld" />
            )}
            <input
              type="number"
              min={0}
              value={b.kinderen || ''}
              onChange={(e) => b.setKinderen(Number(e.target.value) || 0)}
              placeholder="Aantal kinderen"
              className="at-veld"
            />
          </div>
        )}
        <button type="submit" disabled={!b.gekozen || b.bezig} className="at-knop at-knop-vol w-full">
          {b.bezig ? 'Bezig…' : 'Verstuur reactie'}
        </button>
        {b.opgeslagen && (
          <div>
            <OrnamentRegel ctx={ctx} />
            <Kleinkapitaal style={{ color: 'hsl(var(--primary))' }}>Bedankt, je reactie is opgeslagen</Kleinkapitaal>
          </div>
        )}
        {b.fout && <p className="text-sm font-medium text-red-600">{b.fout}</p>}
      </form>
    )
  }

  return (
    <div className="text-center">
      <Kleinkapitaal style={{ color: 'hsl(var(--primary))' }}>Répondez s&apos;il vous plaît</Kleinkapitaal>
      {block.introTekst && (
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{block.introTekst}</p>
      )}
      <form onSubmit={form.zoek.submit} className="mt-6 space-y-5 text-left">
        <div className="flex flex-col gap-5 sm:flex-row">
          <input
            value={form.zoek.voornaam}
            onChange={(e) => form.zoek.setVoornaam(e.target.value)}
            placeholder="Voornaam"
            required
            className="at-veld flex-1"
          />
          <input
            value={form.zoek.achternaam}
            onChange={(e) => form.zoek.setAchternaam(e.target.value)}
            placeholder="Achternaam"
            required
            className="at-veld flex-1"
          />
        </div>
        <button type="submit" disabled={form.zoek.status === 'zoeken'} className="at-knop w-full">
          {form.zoek.status === 'zoeken' ? 'Bezig…' : 'Zoek mij op'}
        </button>
      </form>
      {form.zoek.melding && (
        <p className="mt-4 text-sm" style={{ color: 'var(--site-muted)' }}>{form.zoek.melding}</p>
      )}
    </div>
  )
}

function TekstFoto({ block }: { block: TekstFotoBlock; ctx: RenderContext }) {
  const foto = block.fotoUrl ? (
    <div className="at-foto-mat overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={block.fotoUrl} alt="" className="h-56 w-full object-cover sm:h-full" />
    </div>
  ) : null
  const tekst = (
    <p className="whitespace-pre-line text-base leading-relaxed" style={{ color: 'var(--site-text)' }}>{block.tekst}</p>
  )
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
        <figure className="mx-auto max-w-lg">
          <span aria-hidden className="block text-6xl leading-none" style={kopStijl(ctx.theme, { color: 'hsl(var(--primary)/0.35)' })}>
            &ldquo;
          </span>
          <blockquote className="whitespace-pre-line text-2xl italic leading-snug" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>
            {block.citaat}
          </blockquote>
          {block.bron && (
            <figcaption className="mt-4">
              <OrnamentRegel ctx={ctx} />
              <Kleinkapitaal style={{ color: 'var(--site-muted)' }}>{block.bron}</Kleinkapitaal>
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
              <div className="rounded-[50%] border p-1.5" style={{ borderColor: 'hsl(var(--primary)/0.3)' }}>
                {p.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.fotoUrl} alt="" className="h-28 w-[5.5rem] rounded-[50%] object-cover" />
                ) : (
                  <div className="h-28 w-[5.5rem] rounded-[50%]" style={{ background: 'hsl(var(--primary)/0.1)' }} />
                )}
              </div>
              <div>
                <p className="text-lg" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>{p.naam}</p>
                {p.rol && <Kleinkapitaal className="mt-1" style={{ color: 'var(--site-muted)' }}>{p.rol}</Kleinkapitaal>}
              </div>
            </div>
          ))}
        </div>
      )
    case 'locatie':
      return (
        <div className="space-y-5">
          <div>
            {block.naam && <p className="text-xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>{block.naam}</p>}
            {block.adres && <Kleinkapitaal className="mt-1.5" style={{ color: 'var(--site-muted)' }}>{block.adres}</Kleinkapitaal>}
          </div>
          {block.tekst && <p className="mx-auto max-w-md whitespace-pre-line text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{block.tekst}</p>}
          {block.kaartInsluitUrl && (
            <div className="at-foto-mat overflow-hidden">
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
          <a href={block.videoUrl} target="_blank" rel="noopener noreferrer" className="at-knop">
            <Play className="h-3.5 w-3.5" /> Bekijk de video
          </a>
        ) : null
      }
      return (
        <div className="at-foto-mat overflow-hidden">
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
          <div className="space-y-6">
            {ctx.registry.introText && (
              <p className="mx-auto max-w-md whitespace-pre-line text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>
                {ctx.registry.introText}
              </p>
            )}
            <div className="flex justify-center">
              <a href={`/trouwen/${ctx.slug}/cadeaulijst`} className="at-knop at-knop-vol">
                <Gift className="h-4 w-4" />
                Bekijk de cadeaulijst
                {ctx.registry.passwordRequired && <Lock className="h-3.5 w-3.5 opacity-70" />}
              </a>
            </div>
          </div>
        )
      }
      return <p className="whitespace-pre-line leading-relaxed" style={{ color: 'var(--site-muted)' }}>{block.tekst}</p>
    case 'contact':
      return <p className="whitespace-pre-line leading-relaxed" style={{ color: 'var(--site-muted)' }}>{block.tekst}</p>
    case 'rsvp':
      return <Rsvp block={block} ctx={ctx} />
    case 'scheiding':
      return <OrnamentRegel ctx={ctx} breed />
  }
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function Footer({ ctx }: FooterProps) {
  const { wedding } = ctx
  return (
    <footer className="px-4 pb-16 pt-10 text-center">
      <OrnamentRegel ctx={ctx} breed />
      <p className="mt-4 text-2xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>
        {wedding.partner1Naam} &amp; {wedding.partner2Naam}
      </p>
      {wedding.trouwdatum && (
        <Kleinkapitaal className="mt-2" style={{ color: 'var(--site-muted)' }}>
          {formatDatumNL(wedding.trouwdatum)}
        </Kleinkapitaal>
      )}
    </footer>
  )
}

export const atelierTheme: ThemeRenderer = {
  css: CSS,
  bodyFont: 'var(--font-garamond), "EB Garamond", Georgia, serif',
  Nav,
  Hero,
  Section,
  Content,
  Footer,
}
