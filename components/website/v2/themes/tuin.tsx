'use client'

// ── De Tuin (botanisch) — de serre ───────────────────────────────────────────
// Weelderige kas: bladvormige foto's en knoppen (asymmetrische
// border-radius), SVG-takjes als ornamenten, en een meanderend pad — secties
// schuiven om en om naar links en rechts, als een wandeling door de tuin.
// Bewegingstaal: organische groei — 550–700ms met veer-easing
// cubic-bezier(.34,1.56,.64,1), schaal 94%→100%, wiegende takjes en
// focus-onderlijnen die van links "aangroeien".

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

const VEER = 'cubic-bezier(0.34, 1.56, 0.64, 1)'

// Bladvormen: één ronde diagonaal, wisselend van richting.
const BLAD_A = '58% 6% 58% 6%'
const BLAD_B = '6% 58% 6% 58%'

const CSS = `
@keyframes tu-groei {
  from { opacity: 0; transform: scale(0.94) translateY(12px); }
  to   { opacity: 1; transform: none; }
}
@keyframes tu-wieg {
  0%, 100% { transform: rotate(-2.5deg); }
  50%      { transform: rotate(2.5deg); }
}
.tu-hero-item { opacity: 0; animation: tu-groei 650ms ${VEER} forwards; }
.tu-wieg { animation: tu-wieg 5.5s ease-in-out infinite; transform-origin: bottom center; }

.tu-veld {
  height: 3rem;
  width: 100%;
  border: 1px solid hsl(var(--primary) / 0.3);
  border-radius: 10px;
  background: #fff;
  padding: 0 1rem;
  color: #262626;
  background-image: linear-gradient(hsl(var(--primary)), hsl(var(--primary)));
  background-size: 0% 2.5px;
  background-repeat: no-repeat;
  background-position: left bottom;
  transition: background-size 480ms ${VEER}, border-color 300ms ease;
}
.tu-veld::placeholder { color: var(--site-muted); opacity: 0.7; }
.tu-veld:focus { outline: none; border-color: hsl(var(--primary) / 0.6); background-size: 100% 2.5px; }

.tu-knop {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 3rem;
  padding: 0 2rem;
  border: 1px solid transparent;
  border-radius: 999px 10px 999px 10px;
  background: hsl(var(--primary));
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  transition: transform 500ms ${VEER}, box-shadow 300ms ease, background-color 300ms ease, color 300ms ease;
}
.tu-knop:hover:not(:disabled) { transform: scale(1.045); box-shadow: 0 12px 26px -14px hsl(var(--primary) / 0.7); }
.tu-knop:focus-visible { outline: 2px solid hsl(var(--primary)); outline-offset: 3px; }
.tu-knop:disabled { opacity: 0.5; cursor: default; }

.tu-knop-zacht {
  background: hsl(var(--primary) / 0.12);
  color: hsl(var(--primary));
  border-color: hsl(var(--primary) / 0.25);
}

.tu-foto { overflow: hidden; }
.tu-foto img { transition: transform 700ms ${VEER}; }
.tu-foto:hover img { transform: scale(1.05) rotate(0.6deg); }

.tu-nav-link {
  border-bottom: 2px solid transparent;
  padding-bottom: 2px;
  transition: border-color 350ms ${VEER}, opacity 300ms ease;
}
.tu-nav-link:hover, .tu-nav-link[data-actief='true'] { border-color: currentcolor; }

.tu-accordion {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 520ms ${VEER};
}
.tu-accordion[data-open='true'] { grid-template-rows: 1fr; }
.tu-accordion > div { overflow: hidden; }
`

const Reveal = maakReveal({
  verborgen: { opacity: 0, transform: 'scale(0.96) translateY(14px)' },
  overgang: `opacity 620ms ${VEER}, transform 620ms ${VEER}`,
})

// ─── Botanische ornamenten ───────────────────────────────────────────────────

// Takje met blaadjes langs een gebogen stengel. Spiegelen/omdraaien gaat
// via Tailwind-klassen van de aanroeper (-scale-x-100, rotate-180) zodat
// transforms composeren.
function Takje({ className, kleur }: { className?: string; kleur?: string }) {
  const c = kleur ?? 'hsl(var(--primary))'
  return (
    <svg viewBox="0 0 96 30" className={className ?? 'h-6 w-20'} fill="none" aria-hidden>
      <path d="M4 26 C 30 18, 62 10, 92 12" stroke={c} strokeWidth="1.4" strokeLinecap="round" opacity="0.75" />
      <path d="M22 21.5 q 3 -11 13 -12 q -2 11 -13 12 z" fill={c} opacity="0.55" />
      <path d="M43 16.5 q 9 -7 16 -2 q -8 7 -16 2 z" fill={c} opacity="0.75" />
      <path d="M66 13 q 2 -10 12 -11.5 q -1.5 10 -12 11.5 z" fill={c} opacity="0.6" />
    </svg>
  )
}

// Grote hoektak voor de hero: twee stengels vol blad.
function HoekTak({ className, kleur }: { className?: string; kleur?: string }) {
  const c = kleur ?? 'hsl(var(--primary))'
  return (
    <svg viewBox="0 0 180 120" className={className} fill="none" aria-hidden>
      <path d="M6 6 C 40 30, 70 64, 92 112" stroke={c} strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
      <path d="M10 12 C 48 26, 100 38, 158 34" stroke={c} strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
      <path d="M38 32 q -1 -15 12 -20 q 3 14 -12 20 z" fill={c} opacity="0.5" />
      <path d="M62 62 q -2 -15 11 -21 q 4 14 -11 21 z" fill={c} opacity="0.62" />
      <path d="M80 92 q -3 -14 9 -21 q 5 13 -9 21 z" fill={c} opacity="0.5" />
      <path d="M64 32 q 10 -11 22 -7 q -6 12 -22 7 z" fill={c} opacity="0.65" />
      <path d="M104 38 q 11 -10 22 -5 q -7 12 -22 5 z" fill={c} opacity="0.5" />
      <path d="M136 36 q 12 -9 22 -3 q -8 11 -22 3 z" fill={c} opacity="0.6" />
    </svg>
  )
}

function SprigKop({ children, ctx, uitlijnen }: { children: React.ReactNode; ctx: RenderContext; uitlijnen: 'links' | 'midden' }) {
  return (
    <header className={`mb-8 ${uitlijnen === 'midden' ? 'text-center' : ''}`}>
      <Takje className={`h-6 w-20 ${uitlijnen === 'midden' ? 'mx-auto' : ''}`} />
      <h2 className="mt-3 text-4xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>{children}</h2>
    </header>
  )
}

function DatumRegel({ ctx, licht }: { ctx: RenderContext; licht?: boolean }) {
  const { wedding } = ctx
  if (!wedding.trouwdatum && !wedding.locatie) return null
  const kleur = licht ? 'rgba(255,255,255,0.9)' : 'var(--site-muted)'
  return (
    <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs font-medium uppercase tracking-[0.22em]" style={{ color: kleur }}>
      {wedding.trouwdatum && <span>{formatDatumNL(wedding.trouwdatum)}</span>}
      {wedding.trouwdatum && wedding.locatie && (
        <span aria-hidden className="h-1.5 w-1.5" style={{ background: licht ? 'rgba(255,255,255,0.7)' : 'hsl(var(--primary))', borderRadius: '50% 0 50% 50%' }} />
      )}
      {wedding.locatie && <span>{wedding.locatie}</span>}
    </p>
  )
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function Hero({ block, ctx }: HeroProps) {
  const { wedding, theme } = ctx
  const heeftFoto = !!block.fotoUrl

  if (block.variant === 'split') {
    return (
      <section className="relative grid grid-cols-1 items-center gap-10 overflow-hidden px-6 py-16 md:grid-cols-2 md:gap-14 md:px-12" style={{ minHeight: vh(80) }}>
        <HoekTak className="pointer-events-none absolute -left-6 -top-2 h-28 w-44 opacity-60" />
        <div className="tu-hero-item relative mx-auto w-full max-w-md" style={{ animationDelay: '120ms' }}>
          {heeftFoto ? (
            <div className="tu-foto" style={{ borderRadius: BLAD_A }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={block.fotoUrl} alt="" className="aspect-[4/5] w-full object-cover" />
            </div>
          ) : (
            <div className="aspect-[4/5] w-full" style={{ background: 'hsl(var(--primary)/0.12)', borderRadius: BLAD_A }} />
          )}
          <Takje className="tu-wieg absolute -bottom-3 -right-4 h-8 w-24" />
        </div>
        <div className="text-center md:text-left">
          <h1
            className="tu-hero-item"
            style={{ ...kopStijl(theme), animationDelay: '320ms', fontSize: 'clamp(2.9rem, 7vw, 5.5rem)', lineHeight: 1.12, color: 'var(--site-text)' }}
          >
            {wedding.partner1Naam}
            <span className="mx-2" style={{ color: 'hsl(var(--primary))' }}>&amp;</span>
            {wedding.partner2Naam}
          </h1>
          <div className="tu-hero-item mt-6 flex justify-center md:justify-start" style={{ animationDelay: '520ms' }}>
            <DatumRegel ctx={ctx} />
          </div>
          {block.ondertitel && (
            <p className="tu-hero-item mx-auto mt-5 max-w-md text-sm leading-relaxed md:mx-0" style={{ animationDelay: '620ms', color: 'var(--site-muted)' }}>
              {block.ondertitel}
            </p>
          )}
        </div>
      </section>
    )
  }

  if (block.variant === 'typografisch') {
    return (
      <section className="relative flex items-center justify-center overflow-hidden px-6 py-20" style={{ minHeight: vh(76) }}>
        {heeftFoto && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={block.fotoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ opacity: 0.1 }} />
            <div className="absolute inset-0" style={{ background: 'color-mix(in srgb, var(--site-bg) 80%, transparent)' }} />
          </>
        )}
        <HoekTak className="pointer-events-none absolute -left-8 top-4 h-32 w-52 opacity-50" />
        <HoekTak className="pointer-events-none absolute -right-8 bottom-4 h-32 w-52 rotate-180 opacity-50" />
        <div className="relative z-10 text-center">
          <div className="tu-hero-item flex justify-center" style={{ animationDelay: '100ms' }}>
            <Takje className="tu-wieg h-7 w-24" />
          </div>
          <h1
            className="tu-hero-item mt-6"
            style={{ ...kopStijl(theme), animationDelay: '300ms', fontSize: 'clamp(3rem, 10vw, 7rem)', lineHeight: 1.1, color: 'var(--site-text)' }}
          >
            {wedding.partner1Naam}
            <span className="mx-3" style={{ color: 'hsl(var(--primary))' }}>&amp;</span>
            {wedding.partner2Naam}
          </h1>
          <div className="tu-hero-item mt-6" style={{ animationDelay: '520ms' }}>
            <DatumRegel ctx={ctx} />
            {block.ondertitel && (
              <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{block.ondertitel}</p>
            )}
          </div>
          <div className="tu-hero-item mt-8 flex justify-center" style={{ animationDelay: '640ms' }}>
            <Takje className="h-7 w-24 rotate-180" />
          </div>
        </div>
      </section>
    )
  }

  // fullscreen (standaard)
  return (
    <section className="relative flex items-center justify-center overflow-hidden" style={{ minHeight: vh(78) }}>
      {heeftFoto ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.fotoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: `rgba(10,25,12,${block.overlay ?? 0.35})` }} />
        </>
      ) : (
        <div className="absolute inset-0" style={{ background: 'hsl(var(--primary)/0.1)' }} />
      )}
      <HoekTak className="pointer-events-none absolute -left-6 -top-1 z-10 h-32 w-52" kleur={heeftFoto ? 'rgba(255,255,255,0.85)' : undefined} />
      <HoekTak className="pointer-events-none absolute -bottom-1 -right-6 z-10 h-32 w-52 rotate-180" kleur={heeftFoto ? 'rgba(255,255,255,0.85)' : undefined} />
      <div className="relative z-20 px-6 py-24 text-center" style={{ color: heeftFoto ? '#fff' : 'var(--site-text)' }}>
        <h1
          className="tu-hero-item"
          style={{ ...kopStijl(theme), animationDelay: '180ms', fontSize: 'clamp(3rem, 8.5vw, 6.25rem)', lineHeight: 1.12 }}
        >
          {wedding.partner1Naam}
          <span className="mx-3" style={{ color: heeftFoto ? 'rgba(255,255,255,0.75)' : 'hsl(var(--primary))' }}>&amp;</span>
          {wedding.partner2Naam}
        </h1>
        <div className="tu-hero-item mt-6" style={{ animationDelay: '420ms' }}>
          <DatumRegel ctx={ctx} licht={heeftFoto} />
          {block.ondertitel && (
            <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed" style={{ opacity: 0.92 }}>{block.ondertitel}</p>
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
    <nav className="sticky top-0 z-40" style={{ background: 'hsl(var(--primary))', boxShadow: '0 1px 0 rgba(0,0,0,0.12)' }}>
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-3">
        <span className="flex min-w-0 items-center gap-2.5">
          <Takje className="h-5 w-14 shrink-0" kleur="rgba(255,255,255,0.9)" />
          <span className="truncate text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.95)' }}>
            {wedding.partner1Naam} &amp; {wedding.partner2Naam}
          </span>
        </span>
        <ul className="hidden items-center gap-6 md:flex">
          {items.map((item) => (
            <li key={item.key}>
              <a
                href={item.href}
                data-actief={item.actief || undefined}
                className="tu-nav-link text-[11px] font-semibold uppercase tracking-[0.16em]"
                style={{ color: item.actief ? '#fff' : 'rgba(255,255,255,0.72)' }}
              >
                {item.label}
              </a>
            </li>
          ))}
          {registry?.enabled && slug && (
            <li>
              <a
                href={`/trouwen/${slug}/cadeaulijst`}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: 'hsl(var(--primary))', background: '#fff', borderRadius: '999px 8px 999px 8px' }}
              >
                <Gift className="h-3 w-3" /> Cadeaulijst
                {registry.passwordRequired && <Lock className="h-2.5 w-2.5 opacity-70" />}
              </a>
            </li>
          )}
        </ul>
        <button
          className="flex h-11 w-11 items-center justify-center md:hidden"
          style={{ color: '#fff' }}
          onClick={() => setOpen(!open)}
          aria-label="Menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="px-5 pb-4 md:hidden" style={{ background: 'hsl(var(--primary))', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
          <ul className="space-y-0.5 pt-2">
            {items.map((item, i) => (
              <li key={item.key}>
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: 'rgba(255,255,255,0.85)', animation: `tu-groei 420ms ${VEER} both`, animationDelay: `${i * 50}ms` }}
                >
                  {item.label}
                </a>
              </li>
            ))}
            {registry?.enabled && slug && (
              <li className="pt-2">
                <a
                  href={`/trouwen/${slug}/cadeaulijst`}
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: 'hsl(var(--primary))', background: '#fff', borderRadius: '999px 8px 999px 8px' }}
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
  breed: 'max-w-2xl',
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
  const vol = breedte(layout, 'smal') === 'volledig'
  const b = breedte(layout, block.type === 'galerij' || block.type === 'video' || block.type === 'locatie' || block.type === 'personen' || block.type === 'tijdlijn' ? 'breed' : 'smal')
  const achtergrond = achtergrondVan(layout)
  const uitlijnOverride = layout?.uitlijning
  const uitlijnKlas = uitlijnOverride ? UITLIJN_KLASSE[uitlijning(layout, 'links')] : ''

  // Het meanderende tuinpad: blokken slingeren om en om naar links en
  // rechts (op bloknummer, dus in elke volgorde). Volledige breedte en
  // eigen uitlijning van het stel heffen het meanderen op.
  const meander = vol ? 'mx-auto' : nummer % 2 === 0 ? 'md:ml-auto md:mr-[6%]' : 'md:mr-auto md:ml-[6%]'

  return (
    <section
      id={`b-${block.id}`}
      className={`relative scroll-mt-24 overflow-hidden px-5 py-12 sm:py-14 ${uitlijnKlas}`}
      style={achtergrond.stijl}
    >
      <AchtergrondFoto layout={layout} />
      <div className="mx-auto max-w-5xl">
        <div className={`${BREEDTE_KLASSE[b]} mx-auto ${meander}`}>
          <Reveal>
            <KopFoto layout={layout} className="mb-8 h-48 w-full object-cover" style={{ borderRadius: nummer % 2 === 0 ? BLAD_A : BLAD_B }} />
            {titel && <SprigKop ctx={ctx} uitlijnen={vol ? 'midden' : 'links'}>{titel}</SprigKop>}
            {children}
          </Reveal>
        </div>
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
        <Takje className="tu-wieg h-7 w-24" />
        <p className="mt-3 text-3xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>In volle bloei — wij zijn getrouwd</p>
      </div>
    )
  }
  const delen = [
    { val: rest.dagen, label: 'dagen' },
    { val: rest.uren, label: 'uren' },
    { val: rest.minuten, label: 'minuten' },
    { val: rest.seconden, label: 'seconden' },
  ]
  return (
    <div className="flex flex-wrap gap-3 sm:gap-4">
      {delen.map(({ val, label }, i) => (
        <Reveal key={label} vertraging={i * 90}>
          <div
            className="flex h-24 w-24 flex-col items-center justify-center sm:h-28 sm:w-28"
            style={{
              background: i % 2 === 0 ? 'hsl(var(--primary)/0.12)' : '#ffffff',
              border: '1px solid hsl(var(--primary)/0.25)',
              borderRadius: i % 2 === 0 ? BLAD_A : BLAD_B,
            }}
          >
            <span className="text-3xl font-semibold tabular-nums sm:text-4xl" style={{ color: 'hsl(var(--primary))' }}>
              {String(val).padStart(2, '0')}
            </span>
            <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--site-muted)' }}>{label}</span>
          </div>
        </Reveal>
      ))}
    </div>
  )
}

function Tijdlijn({ block, ctx }: { block: TijdlijnBlock; ctx: RenderContext }) {
  return (
    <ol className="relative">
      {/* De stengel. */}
      <span aria-hidden className="absolute bottom-3 top-3 left-[9px] w-px" style={{ background: 'hsl(var(--primary)/0.35)' }} />
      {block.momenten.map((m, i) => (
        <li key={m.id} className={`relative pb-10 pl-10 last:pb-0 ${i % 2 === 1 ? 'md:ml-16' : ''}`}>
          {/* Bladknop aan de stengel. */}
          <span
            aria-hidden
            className="tu-wieg absolute left-0 top-1 h-5 w-5"
            style={{ background: 'hsl(var(--primary)/0.8)', borderRadius: '50% 0 50% 50%', transform: 'rotate(45deg)' }}
          />
          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--primary))' }}>{m.datum}</p>
          <p className="mt-1.5 text-2xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>{m.titel}</p>
          {m.tekst && <p className="mt-1.5 max-w-md text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{m.tekst}</p>}
        </li>
      ))}
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
              className="tu-foto mb-3.5 block w-full"
              style={{ borderRadius: i % 2 === 0 ? BLAD_A : BLAD_B, breakInside: 'avoid' }}
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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {block.fotos.map((f, i) => (
          <Reveal key={f.id} vertraging={Math.min(i * 80, 480)}>
            <button
              type="button"
              onClick={() => lightbox.open(i)}
              className="tu-foto block w-full"
              style={{ borderRadius: i % 2 === 0 ? BLAD_A : BLAD_B }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt={f.bijschrift || ''} className="aspect-square w-full object-cover" />
            </button>
          </Reveal>
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
    <ol className="relative">
      <span aria-hidden className="absolute bottom-3 top-3 left-[9px] w-px" style={{ background: 'hsl(var(--primary)/0.35)' }} />
      {ctx.schedule.map((s, i) => (
        <li key={i} className="relative pb-7 pl-10 last:pb-0">
          <span
            aria-hidden
            className="absolute left-0 top-1 h-5 w-5"
            style={{ background: i % 2 === 0 ? 'hsl(var(--primary)/0.8)' : 'hsl(var(--primary)/0.35)', borderRadius: '50% 0 50% 50%', transform: 'rotate(45deg)' }}
          />
          <p className="text-sm font-semibold tabular-nums" style={{ color: 'hsl(var(--primary))' }}>
            {s.tijd}
            {s.eindtijd && <span className="font-normal" style={{ color: 'var(--site-muted)' }}> — {s.eindtijd}</span>}
          </p>
          <p className="mt-1 text-lg font-medium" style={{ color: 'var(--site-text)' }}>{s.titel}</p>
          {s.omschrijving && <p className="mt-0.5 max-w-md text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{s.omschrijving}</p>}
          {s.locatie && <p className="mt-0.5 text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--site-muted)' }}>{s.locatie}</p>}
        </li>
      ))}
    </ol>
  )
}

function Faq({ items }: { items: FaqItem[]; ctx: RenderContext }) {
  const [open, setOpen] = React.useState<string | null>(null)
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => {
        const isOpen = open === item.id
        return (
          <li
            key={item.id}
            className="border"
            style={{
              borderColor: 'hsl(var(--primary)/0.22)',
              background: '#fff',
              borderRadius: i % 2 === 0 ? '24px 8px 24px 8px' : '8px 24px 8px 24px',
            }}
          >
            <button
              onClick={() => setOpen(isOpen ? null : item.id)}
              className="flex min-h-12 w-full items-center justify-between gap-3 px-5 py-3.5 text-left"
              aria-expanded={isOpen}
            >
              <span className="flex items-center gap-3 font-medium" style={{ color: 'var(--site-text)' }}>
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0"
                  style={{ background: 'hsl(var(--primary))', borderRadius: '50% 0 50% 50%', transform: 'rotate(45deg)' }}
                />
                {item.vraag}
              </span>
              <ChevronDown
                className="h-4 w-4 shrink-0"
                style={{ color: 'hsl(var(--primary))', transition: `transform 520ms ${VEER}`, transform: isOpen ? 'rotate(180deg)' : undefined }}
              />
            </button>
            <div className="tu-accordion" data-open={isOpen}>
              <div>
                <p className="px-5 pb-4 pl-[3.25rem] text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{item.antwoord}</p>
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
      className="relative mx-auto max-w-lg overflow-hidden border p-6 sm:p-9"
      style={{ borderColor: 'hsl(var(--primary)/0.25)', background: '#fff', borderRadius: '32px 10px 32px 10px' }}
    >
      <Takje className="pointer-events-none absolute right-3 top-3 h-6 w-20 -scale-x-100 opacity-60" />
      <Takje className="pointer-events-none absolute bottom-3 left-3 h-6 w-20 opacity-60" />
      {inhoud}
    </div>
  )

  if (form.fase === 'bevestigen' && form.bevestig) {
    const b = form.bevestig
    return kaart(
      <form onSubmit={b.submit} className="space-y-5 text-left">
        <p className="text-2xl" style={kopStijl(ctx.theme, { color: '#262626' })}>
          Dag {b.gast.voornaam}, kom je ook?
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => b.setKeuze('bevestigd')}
            className={`tu-knop flex-1 ${b.keuze === 'bevestigd' ? '' : 'tu-knop-zacht'}`}
            aria-pressed={b.keuze === 'bevestigd'}
          >
            Ja, ik groei mee
          </button>
          <button
            type="button"
            onClick={() => b.setKeuze('afgemeld')}
            className={`tu-knop flex-1 ${b.keuze === 'afgemeld' ? '' : 'tu-knop-zacht'}`}
            aria-pressed={b.keuze === 'afgemeld'}
          >
            Helaas niet
          </button>
        </div>
        {b.komt && (
          <div className="space-y-4">
            <input value={b.dieet} onChange={(e) => b.setDieet(e.target.value)} placeholder="Dieetwensen (optioneel)" className="tu-veld" />
            <input value={b.verzoeknummer} onChange={(e) => b.setVerzoeknummer(e.target.value)} placeholder="Muziekwens: artiest — nummer (optioneel)" className="tu-veld" />
            <input value={b.bericht} onChange={(e) => b.setBericht(e.target.value)} placeholder="Bericht voor het bruidspaar (optioneel)" className="tu-veld" />
            <label className="flex min-h-12 cursor-pointer items-center gap-3 pl-1 text-sm" style={{ color: '#262626' }}>
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
              <input value={b.partnerNaam} onChange={(e) => b.setPartnerNaam(e.target.value)} placeholder="Naam van je partner" className="tu-veld" />
            )}
            <input
              type="number"
              min={0}
              value={b.kinderen || ''}
              onChange={(e) => b.setKinderen(Number(e.target.value) || 0)}
              placeholder="Aantal kinderen"
              className="tu-veld"
            />
          </div>
        )}
        <button type="submit" disabled={!b.gekozen || b.bezig} className="tu-knop w-full">
          {b.bezig ? 'Bezig…' : 'Verstuur reactie'}
        </button>
        {b.opgeslagen && (
          <p className="text-sm font-medium" style={{ color: 'hsl(var(--primary))' }}>
            Geplant! Bedankt voor je reactie.
          </p>
        )}
        {b.fout && <p className="text-sm font-medium text-red-600">{b.fout}</p>}
      </form>
    )
  }

  return kaart(
    <div className="text-left">
      {block.introTekst && (
        <p className="max-w-sm text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{block.introTekst}</p>
      )}
      <form onSubmit={form.zoek.submit} className="mt-5 space-y-4">
        <input
          value={form.zoek.voornaam}
          onChange={(e) => form.zoek.setVoornaam(e.target.value)}
          placeholder="Voornaam"
          required
          className="tu-veld"
        />
        <input
          value={form.zoek.achternaam}
          onChange={(e) => form.zoek.setAchternaam(e.target.value)}
          placeholder="Achternaam"
          required
          className="tu-veld"
        />
        <button type="submit" disabled={form.zoek.status === 'zoeken'} className="tu-knop w-full">
          {form.zoek.status === 'zoeken' ? 'Bezig…' : 'Zoek mij op'}
        </button>
      </form>
      {form.zoek.melding && <p className="mt-4 text-sm" style={{ color: 'var(--site-muted)' }}>{form.zoek.melding}</p>}
    </div>
  )
}

function TekstFoto({ block }: { block: TekstFotoBlock; ctx: RenderContext }) {
  const foto = (radius: string) =>
    block.fotoUrl ? (
      <div className="tu-foto" style={{ borderRadius: radius }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={block.fotoUrl} alt="" className="h-60 w-full object-cover sm:h-72" />
      </div>
    ) : null
  const tekst = (
    <p className="whitespace-pre-line text-base leading-relaxed" style={{ color: 'var(--site-text)' }}>{block.tekst}</p>
  )
  if (block.fotoPositie === 'boven') {
    return (
      <div className="space-y-6 text-left">
        {foto(BLAD_A)}
        {tekst}
      </div>
    )
  }
  return (
    <div className="grid items-center gap-8 text-left sm:grid-cols-2">
      {block.fotoPositie === 'links' && foto(BLAD_B)}
      {tekst}
      {block.fotoPositie === 'rechts' && foto(BLAD_A)}
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
          <Takje className="mx-auto h-6 w-20" />
          <blockquote
            className="mt-4 whitespace-pre-line text-3xl leading-snug"
            style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}
          >
            {block.citaat}
          </blockquote>
          {block.bron && (
            <figcaption className="mt-4 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--primary))' }}>
              {block.bron}
            </figcaption>
          )}
          <Takje className="mx-auto mt-5 h-6 w-20 rotate-180" />
        </figure>
      )
    case 'tijdlijn':
      return <Tijdlijn block={block} ctx={ctx} />
    case 'personen':
      return (
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
          {block.mensen.map((p, i) => (
            <div key={p.id} className="flex flex-col items-center gap-3 text-center">
              <div className="p-1.5" style={{ background: 'hsl(var(--primary)/0.12)', borderRadius: i % 2 === 0 ? BLAD_A : BLAD_B }}>
                {p.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.fotoUrl} alt="" className="h-24 w-24 object-cover sm:h-28 sm:w-28" style={{ borderRadius: i % 2 === 0 ? BLAD_A : BLAD_B }} />
                ) : (
                  <div
                    className="flex h-24 w-24 items-center justify-center sm:h-28 sm:w-28"
                    style={{ background: 'hsl(var(--primary)/0.15)', borderRadius: i % 2 === 0 ? BLAD_A : BLAD_B }}
                  >
                    <Takje className="h-5 w-14 opacity-70" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>{p.naam}</p>
                {p.rol && <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'hsl(var(--primary))' }}>{p.rol}</p>}
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
            {block.adres && <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'hsl(var(--primary))' }}>{block.adres}</p>}
          </div>
          {block.tekst && <p className="max-w-md whitespace-pre-line text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{block.tekst}</p>}
          {block.kaartInsluitUrl && (
            <div className="overflow-hidden border" style={{ borderColor: 'hsl(var(--primary)/0.25)', borderRadius: '32px 10px 32px 10px' }}>
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
          <a href={block.videoUrl} target="_blank" rel="noopener noreferrer" className="tu-knop tu-knop-zacht">
            <Play className="h-3.5 w-3.5" /> Bekijk de video
          </a>
        ) : null
      }
      return (
        <div className="overflow-hidden" style={{ borderRadius: '32px 10px 32px 10px' }}>
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
              <p className="max-w-md whitespace-pre-line text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>
                {ctx.registry.introText}
              </p>
            )}
            <a href={`/trouwen/${ctx.slug}/cadeaulijst`} className="tu-knop">
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
      return (
        <div className="flex items-center justify-center gap-3" aria-hidden>
          <span className="h-px w-16" style={{ background: 'hsl(var(--primary)/0.3)' }} />
          <Takje className="tu-wieg h-5 w-16" />
          <span className="h-px w-16" style={{ background: 'hsl(var(--primary)/0.3)' }} />
        </div>
      )
  }
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function Footer({ ctx }: FooterProps) {
  const { wedding } = ctx
  return (
    <footer className="mt-4 px-5 py-14 text-center" style={{ background: 'hsl(var(--primary)/0.1)' }}>
      <Takje className="mx-auto h-6 w-20" />
      <p className="mt-3 text-3xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>
        {wedding.partner1Naam} &amp; {wedding.partner2Naam}
      </p>
      <div className="mt-3 flex justify-center">
        <DatumRegel ctx={ctx} />
      </div>
    </footer>
  )
}

export const tuinTheme: ThemeRenderer = {
  css: CSS,
  bodyFont: 'var(--font-josefin), "Josefin Sans", system-ui, sans-serif',
  Nav,
  Hero,
  Section,
  Content,
  Footer,
}
