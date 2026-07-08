'use client'

// ── The Editor (modern) — het magazine ───────────────────────────────────────
// Editorial print: links uitgelijnd, asymmetrisch, genummerde katernen
// (Nº 01), dikke regels, marquee-strip, contactvel-portretten in zwart-wit
// die op hover in kleur springen, Fig.-bijschriften bij foto's.
// Bewegingstaal: snappy — 140–220ms, cubic-bezier(.16,1,.3,1); verschuivende
// blokschaduwen, direct invertende knoppen, cijfers die omhoog snappen.

import { Gift, Lock, Menu, Minus, Play, Plus, X } from 'lucide-react'
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

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'

const CSS = `
@keyframes ed-in {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: none; }
}
@keyframes ed-marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
@keyframes ed-cijfer {
  from { opacity: 0; transform: translateY(45%); }
  to   { opacity: 1; transform: none; }
}
.ed-hero-item { opacity: 0; animation: ed-in 300ms ${EASE} forwards; }
.ed-marquee-baan { display: flex; width: max-content; animation: ed-marquee 16s linear infinite; }
.ed-cijfer { display: inline-block; animation: ed-cijfer 220ms ${EASE}; }

.ed-veld {
  height: 3rem;
  width: 100%;
  border: 0;
  border-bottom: 2px solid var(--site-text);
  border-radius: 0;
  background: transparent;
  padding: 0 2px;
  color: var(--site-text);
  transition: box-shadow 140ms ${EASE};
}
.ed-veld::placeholder { color: var(--site-muted); opacity: 0.6; }
.ed-veld:focus { outline: none; box-shadow: 0 2px 0 0 var(--site-text); }

.ed-knop {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  min-height: 3rem;
  padding: 0 1.6rem;
  border: 2px solid var(--site-text);
  background: var(--site-text);
  color: var(--site-bg);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  border-radius: 0;
  transition: background-color 140ms ${EASE}, color 140ms ${EASE};
}
.ed-knop:hover:not(:disabled) { background: transparent; color: var(--site-text); }
.ed-knop:active:not(:disabled) { transform: translateY(1px); }
.ed-knop:focus-visible { outline: 2px solid var(--site-text); outline-offset: 3px; }
.ed-knop:disabled { opacity: 0.4; cursor: default; }

.ed-knop-omtrek { background: transparent; color: var(--site-text); }
.ed-knop-omtrek:hover:not(:disabled) { background: var(--site-text); color: var(--site-bg); }

.ed-schaduw { transition: transform 140ms ${EASE}, box-shadow 140ms ${EASE}; }
.ed-schaduw:hover { transform: translate(-3px, -3px); box-shadow: 7px 7px 0 hsl(var(--primary)); }

.ed-foto { filter: grayscale(1); transition: filter 120ms linear; }
.ed-foto:hover { filter: grayscale(0); }

.ed-link {
  background-image: linear-gradient(currentColor, currentColor);
  background-size: 0% 1px;
  background-repeat: no-repeat;
  background-position: left calc(100% - 1px);
  transition: background-size 180ms ${EASE};
  padding-bottom: 2px;
}
.ed-link:hover, .ed-link[data-actief='true'] { background-size: 100% 1px; }
`

const Reveal = maakReveal({
  verborgen: { opacity: 0, transform: 'translateY(12px)' },
  overgang: `opacity 220ms ${EASE}, transform 220ms ${EASE}`,
})

const pad2 = (n: number) => String(n).padStart(2, '0')

// ─── Bouwstenen ──────────────────────────────────────────────────────────────

function Kicker({ children, kleur }: { children: React.ReactNode; kleur?: string }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: kleur ?? 'var(--site-muted)' }}>
      {children}
    </p>
  )
}

// Doorlopende tekststrip: twee identieke helften, samen 16s per lus.
function Marquee({ ctx, omkeren }: { ctx: RenderContext; omkeren?: boolean }) {
  const { wedding } = ctx
  const delen = [
    `${wedding.partner1Naam} & ${wedding.partner2Naam}`,
    wedding.trouwdatum ? formatDatumNL(wedding.trouwdatum) : '',
    wedding.locatie,
  ].filter(Boolean)
  const segment = delen.join('  ✦  ') + '  ✦  '
  const helft = segment.repeat(3)
  return (
    <div
      className="overflow-hidden py-2.5"
      style={{
        borderTop: '2px solid var(--site-text)',
        borderBottom: omkeren ? undefined : '1px solid var(--site-text)',
        background: 'var(--site-bg)',
        color: 'var(--site-text)',
      }}
      aria-hidden
    >
      <div className="ed-marquee-baan">
        <span className="whitespace-pre text-[11px] font-bold uppercase tracking-[0.22em]">{helft}</span>
        <span className="whitespace-pre text-[11px] font-bold uppercase tracking-[0.22em]">{helft}</span>
      </div>
    </div>
  )
}

// Cijfer dat bij verandering opnieuw mount en dus omhoog snapt.
function SnapCijfer({ waarde }: { waarde: number }) {
  const tekens = pad2(waarde).split('')
  return (
    <span className="inline-flex overflow-hidden">
      {tekens.map((c, i) => (
        <span key={`${i}-${c}`} className="ed-cijfer">{c}</span>
      ))}
    </span>
  )
}

function FigCaption({ nummer, tekst }: { nummer: number; tekst?: string }) {
  return (
    <figcaption className="mt-1.5 flex items-baseline gap-2 text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--site-muted)' }}>
      <span className="font-bold" style={{ color: 'var(--site-text)' }}>Fig. {pad2(nummer)}</span>
      {tekst && <span className="truncate normal-case tracking-normal">{tekst}</span>}
    </figcaption>
  )
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function HeroNamen({ ctx, licht, klein }: { ctx: RenderContext; licht: boolean; klein?: boolean }) {
  const { wedding, theme } = ctx
  const kleur = licht ? '#fff' : 'var(--site-text)'
  const maat = klein ? 'clamp(2.6rem, 6.5vw, 5.5rem)' : 'clamp(3rem, 9.5vw, 7.5rem)'
  return (
    <h1 style={{ ...kopStijl(theme), color: kleur, fontSize: maat, lineHeight: 0.98, letterSpacing: '-0.02em' }}>
      <span className="ed-hero-item block" style={{ animationDelay: '60ms' }}>{wedding.partner1Naam}</span>
      <span className="ed-hero-item block" style={{ animationDelay: '140ms' }}>
        <em className="not-italic" style={{ color: licht ? 'rgba(255,255,255,0.6)' : 'hsl(var(--primary))' }}>&amp;&nbsp;</em>
        {wedding.partner2Naam}
      </span>
    </h1>
  )
}

function HeroByline({ ctx, licht }: { ctx: RenderContext; licht: boolean }) {
  const { wedding } = ctx
  const kleur = licht ? 'rgba(255,255,255,0.85)' : 'var(--site-muted)'
  return (
    <div className="flex items-center gap-4">
      <Kicker kleur={licht ? 'rgba(255,255,255,0.85)' : undefined}>De bruiloft van</Kicker>
      <span aria-hidden className="h-px flex-1" style={{ background: licht ? 'rgba(255,255,255,0.5)' : 'var(--site-text)' }} />
      <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: kleur }}>
        {wedding.trouwdatum ? formatDatumNL(wedding.trouwdatum) : wedding.locatie}
      </p>
    </div>
  )
}

function Hero({ block, ctx }: HeroProps) {
  const heeftFoto = !!block.fotoUrl

  if (block.variant === 'split') {
    return (
      <section className="grid grid-cols-1 md:grid-cols-12" style={{ minHeight: vh(80) }}>
        <div className="order-1 flex flex-col justify-center px-5 py-14 sm:px-10 md:col-span-7">
          <div className="ed-hero-item" style={{ animationDelay: '0ms' }}>
            <HeroByline ctx={ctx} licht={false} />
          </div>
          <div className="mt-8">
            <HeroNamen ctx={ctx} licht={false} klein />
          </div>
          {block.ondertitel && (
            <p className="ed-hero-item mt-6 max-w-md text-sm leading-relaxed" style={{ animationDelay: '220ms', color: 'var(--site-muted)' }}>
              {block.ondertitel}
            </p>
          )}
        </div>
        <div className="order-2 px-5 pb-12 sm:px-10 md:col-span-5 md:py-16 md:pl-0 md:pr-10">
          {heeftFoto ? (
            <div className="h-full" style={{ border: '2px solid var(--site-text)', boxShadow: '10px 10px 0 hsl(var(--primary))' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={block.fotoUrl} alt="" className="h-full max-h-[70vh] w-full object-cover md:max-h-none" />
            </div>
          ) : (
            <div className="h-48 md:h-full" style={{ background: 'var(--site-card)', border: '2px solid var(--site-text)' }} />
          )}
        </div>
      </section>
    )
  }

  if (block.variant === 'typografisch') {
    return (
      <section className="flex flex-col" style={{ minHeight: vh(80) }}>
        <div className="flex flex-1 flex-col justify-center px-5 pt-16 sm:px-10">
          <div className="ed-hero-item flex items-center gap-4" style={{ animationDelay: '0ms' }}>
            <span aria-hidden className="h-px flex-1" style={{ background: 'var(--site-text)' }} />
            <Kicker>De bruiloft van</Kicker>
            <span aria-hidden className="h-px flex-1" style={{ background: 'var(--site-text)' }} />
          </div>
          <div className="mt-10 text-left" style={{ borderBottom: '2px solid var(--site-text)' }}>
            <HeroNamen ctx={ctx} licht={false} />
            <div className="ed-hero-item mb-4 mt-6 flex flex-wrap gap-x-10 gap-y-2" style={{ animationDelay: '220ms' }}>
              {ctx.wedding.trouwdatum && (
                <div>
                  <Kicker>Datum</Kicker>
                  <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--site-text)' }}>{formatDatumNL(ctx.wedding.trouwdatum)}</p>
                </div>
              )}
              {ctx.wedding.locatie && (
                <div>
                  <Kicker>Locatie</Kicker>
                  <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--site-text)' }}>{ctx.wedding.locatie}</p>
                </div>
              )}
              {block.ondertitel && (
                <p className="max-w-xs self-end text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{block.ondertitel}</p>
              )}
            </div>
          </div>
          {heeftFoto && (
            <div className="ed-hero-item" style={{ animationDelay: '300ms' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={block.fotoUrl} alt="" className="ed-foto mt-8 h-44 w-full object-cover sm:h-56" />
            </div>
          )}
        </div>
        <div className="mt-10">
          <Marquee ctx={ctx} />
        </div>
      </section>
    )
  }

  // fullscreen (standaard)
  return (
    <section className="relative flex flex-col justify-end overflow-hidden" style={{ minHeight: vh(86) }}>
      {heeftFoto ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.fotoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${block.overlay ?? 0.35})` }} />
          <div className="absolute inset-x-0 bottom-0 h-2/3" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)' }} />
        </>
      ) : (
        <div className="absolute inset-0" style={{ background: 'var(--site-card)' }} />
      )}
      <div className="relative z-10 px-5 pb-10 pt-28 sm:px-10">
        <div className="ed-hero-item mb-6" style={{ animationDelay: '0ms' }}>
          <HeroByline ctx={ctx} licht={heeftFoto} />
        </div>
        <HeroNamen ctx={ctx} licht={heeftFoto} />
        {block.ondertitel && (
          <p
            className="ed-hero-item mt-5 max-w-md text-sm leading-relaxed"
            style={{ animationDelay: '240ms', color: heeftFoto ? 'rgba(255,255,255,0.85)' : 'var(--site-muted)' }}
          >
            {block.ondertitel}
          </p>
        )}
      </div>
      <div className="relative z-10">
        <Marquee ctx={ctx} />
      </div>
    </section>
  )
}

// ─── Navigatie ───────────────────────────────────────────────────────────────

function Nav({ items, ctx }: NavProps) {
  const { wedding, registry, slug } = ctx
  const [open, setOpen] = React.useState(false)

  return (
    <nav className="sticky top-0 z-40" style={{ background: 'var(--site-bg)', borderBottom: '2px solid var(--site-text)' }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <span className="truncate text-sm font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--site-text)' }}>
          {wedding.partner1Naam} &amp; {wedding.partner2Naam}
        </span>
        <ul className="hidden items-center gap-6 md:flex">
          {items.map((item, i) => (
            <li key={item.key} className="flex items-baseline gap-1.5">
              <span aria-hidden className="text-[9px] font-bold tabular-nums" style={{ color: 'hsl(var(--primary))' }}>{pad2(i + 1)}</span>
              <a
                href={item.href}
                data-actief={item.actief || undefined}
                className="ed-link text-[11px] font-bold uppercase tracking-[0.14em]"
                style={{ color: 'var(--site-text)' }}
              >
                {item.label}
              </a>
            </li>
          ))}
          {registry?.enabled && slug && (
            <li>
              <a
                href={`/trouwen/${slug}/cadeaulijst`}
                className="ed-knop ed-knop-omtrek text-[10px]"
                style={{ minHeight: '2.25rem', padding: '0 0.75rem' }}
              >
                <Gift className="h-3 w-3" /> Cadeaulijst
                {registry.passwordRequired && <Lock className="h-2.5 w-2.5 opacity-70" />}
              </a>
            </li>
          )}
        </ul>
        <button
          className="flex h-11 w-11 items-center justify-center md:hidden"
          style={{ color: 'var(--site-text)' }}
          onClick={() => setOpen(!open)}
          aria-label="Menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden" style={{ borderTop: '1px solid var(--site-text)', background: 'var(--site-bg)' }}>
          <ul>
            {items.map((item, i) => (
              <li key={item.key} style={{ borderBottom: '1px solid hsl(var(--primary)/0.15)' }}>
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-baseline gap-3 px-5 py-3.5 text-xs font-bold uppercase tracking-[0.14em]"
                  style={{ color: 'var(--site-text)', animation: `ed-in 200ms ${EASE} both`, animationDelay: `${i * 30}ms` }}
                >
                  <span aria-hidden className="text-[9px] tabular-nums" style={{ color: 'hsl(var(--primary))' }}>{pad2(i + 1)}</span>
                  {item.label}
                </a>
              </li>
            ))}
            {registry?.enabled && slug && (
              <li>
                <a
                  href={`/trouwen/${slug}/cadeaulijst`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-5 py-3.5 text-xs font-bold uppercase tracking-[0.14em]"
                  style={{ color: 'var(--site-text)' }}
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
  smal: 'max-w-2xl',
  breed: 'max-w-none',
  volledig: 'max-w-none',
} as const

function Section({ block, ctx, nummer, children }: SectionProps) {
  if (block.type === 'scheiding') {
    return (
      <section id={`b-${block.id}`} className="scroll-mt-24 px-5 py-6 sm:px-8">
        {children}
      </section>
    )
  }

  const layout = block.layout
  const titel = 'titel' in block ? block.titel : ''
  const b = breedte(layout, block.type === 'tekst' || block.type === 'quote' || block.type === 'contact' || block.type === 'cadeaulijst' ? 'smal' : 'breed')
  const achtergrond = achtergrondVan(layout)
  const uitlijnKlas = UITLIJN_KLASSE[uitlijning(layout, 'links')]

  return (
    <section
      id={`b-${block.id}`}
      className="relative scroll-mt-24 overflow-hidden px-5 py-12 sm:px-8 sm:py-16"
      style={achtergrond.stijl}
    >
      <AchtergrondFoto layout={layout} />
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <KopFoto layout={layout} className="mb-8 h-48 w-full object-cover" style={{ border: '2px solid var(--site-text)' }} />
          {titel && (
            <header className="mb-8 pt-3 sm:mb-10" style={{ borderTop: '2px solid var(--site-text)' }}>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: 'hsl(var(--primary))' }}>
                  Nº {pad2(Math.max(nummer, 1))}
                </span>
              </div>
              <h2
                className="mt-1.5"
                style={kopStijl(ctx.theme, { color: 'var(--site-text)', fontSize: 'clamp(1.9rem, 4.5vw, 3.25rem)', lineHeight: 1.05, letterSpacing: '-0.015em' })}
              >
                {titel}
              </h2>
            </header>
          )}
          <div className={`${BREEDTE_KLASSE[b]} ${uitlijnKlas}`}>{children}</div>
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
      <div className="pb-4" style={{ borderBottom: '2px solid var(--site-text)' }}>
        <p style={kopStijl(ctx.theme, { color: 'var(--site-text)', fontSize: 'clamp(2.5rem, 7vw, 4.5rem)', lineHeight: 1 })}>Getrouwd.</p>
        {ctx.wedding.trouwdatum && <Kicker>{formatDatumNL(ctx.wedding.trouwdatum)}</Kicker>}
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
    <div className="flex flex-wrap items-end gap-x-8 gap-y-5 pb-4" style={{ borderBottom: '2px solid var(--site-text)' }}>
      {delen.map(({ val, label }) => (
        <div key={label}>
          <Kicker>{label}</Kicker>
          <div
            className="font-bold tabular-nums"
            style={{ color: 'var(--site-text)', fontSize: 'clamp(2.75rem, 8vw, 5.25rem)', lineHeight: 1, letterSpacing: '-0.03em' }}
          >
            <SnapCijfer waarde={val} />
          </div>
        </div>
      ))}
    </div>
  )
}

function Tijdlijn({ block, ctx }: { block: TijdlijnBlock; ctx: RenderContext }) {
  return (
    <ol style={{ borderTop: '1px solid hsl(var(--primary)/0.25)' }}>
      {block.momenten.map((m, i) => (
        <li
          key={m.id}
          className="grid gap-2 py-6 sm:grid-cols-[120px_1fr] sm:gap-6"
          style={{ borderBottom: '1px solid hsl(var(--primary)/0.25)' }}
        >
          <div>
            <span aria-hidden className="block text-3xl font-bold tabular-nums leading-none" style={{ color: 'hsl(var(--primary)/0.35)' }}>
              {pad2(i + 1)}
            </span>
            <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--site-muted)' }}>{m.datum}</p>
          </div>
          <div>
            <p className="text-xl sm:text-2xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>{m.titel}</p>
            {m.tekst && <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{m.tekst}</p>}
          </div>
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
        <div className="md:columns-3" style={{ columns: '2', columnGap: '16px' }}>
          {block.fotos.map((f, i) => (
            <figure key={f.id} className="mb-4" style={{ breakInside: 'avoid' }}>
              <button type="button" onClick={() => lightbox.open(i)} className="ed-schaduw block w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt={f.bijschrift || ''} className="ed-foto block w-full" />
              </button>
              <FigCaption nummer={i + 1} tekst={f.bijschrift} />
            </figure>
          ))}
        </div>
        {lightbox.openIndex !== null && <Lightbox fotos={block.fotos} start={lightbox.openIndex} onSluit={lightbox.sluit} />}
      </>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {block.fotos.map((f, i) => {
          const groot = i % 5 === 0
          return (
            <figure key={f.id} className={`flex flex-col ${groot ? 'col-span-2 row-span-2' : ''}`}>
              <button type="button" onClick={() => lightbox.open(i)} className="ed-schaduw block min-h-0 w-full flex-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt={f.bijschrift || ''} className="ed-foto h-full w-full object-cover" style={{ aspectRatio: groot ? undefined : '1 / 1' }} />
              </button>
              <FigCaption nummer={i + 1} tekst={f.bijschrift} />
            </figure>
          )
        })}
      </div>
      {lightbox.openIndex !== null && <Lightbox fotos={block.fotos} start={lightbox.openIndex} onSluit={lightbox.sluit} />}
    </>
  )
}

function Programma({ block, ctx }: { block: ProgrammaBlock; ctx: RenderContext }) {
  if (block.bron === 'eigen') {
    return <p className="max-w-xl whitespace-pre-line leading-relaxed" style={{ color: 'var(--site-text)' }}>{block.eigenTekst}</p>
  }
  return (
    <ol style={{ borderTop: '1px solid hsl(var(--primary)/0.25)' }}>
      {ctx.schedule.map((s, i) => (
        <li key={i} className="grid grid-cols-[86px_1fr] gap-4 py-4" style={{ borderBottom: '1px solid hsl(var(--primary)/0.25)' }}>
          <div className="text-sm font-bold tabular-nums" style={{ color: 'var(--site-text)' }}>
            {s.tijd}
            {s.eindtijd && <span className="block text-[11px] font-normal" style={{ color: 'var(--site-muted)' }}>— {s.eindtijd}</span>}
          </div>
          <div>
            <p className="font-semibold" style={{ color: 'var(--site-text)' }}>{s.titel}</p>
            {s.omschrijving && <p className="mt-0.5 text-sm" style={{ color: 'var(--site-muted)' }}>{s.omschrijving}</p>}
            {s.locatie && <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--site-muted)' }}>{s.locatie}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}

function Faq({ items }: { items: FaqItem[]; ctx: RenderContext }) {
  const [open, setOpen] = React.useState<string | null>(null)
  return (
    <ul style={{ borderTop: '1px solid hsl(var(--primary)/0.25)' }}>
      {items.map((item, i) => {
        const isOpen = open === item.id
        return (
          <li key={item.id} style={{ borderBottom: '1px solid hsl(var(--primary)/0.25)' }}>
            <button
              onClick={() => setOpen(isOpen ? null : item.id)}
              className="flex min-h-12 w-full items-center gap-4 py-3.5 text-left"
              aria-expanded={isOpen}
            >
              <span aria-hidden className="text-[11px] font-bold tabular-nums" style={{ color: 'hsl(var(--primary))' }}>{pad2(i + 1)}</span>
              <span className="flex-1 font-semibold" style={{ color: 'var(--site-text)' }}>{item.vraag}</span>
              {isOpen ? (
                <Minus className="h-4 w-4 shrink-0" style={{ color: 'var(--site-text)' }} />
              ) : (
                <Plus className="h-4 w-4 shrink-0" style={{ color: 'var(--site-text)' }} />
              )}
            </button>
            {isOpen && (
              <p className="max-w-xl pb-4 pl-8 text-sm leading-relaxed" style={{ color: 'var(--site-muted)', animation: `ed-in 180ms ${EASE} both` }}>
                {item.antwoord}
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function Veld({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--site-muted)' }}>{label}</span>
      {children}
    </label>
  )
}

function Rsvp({ block, ctx }: { block: RsvpBlock; ctx: RenderContext }) {
  const form = useRsvpFormulier(ctx.slug, ctx.rsvpVooringevuld)

  if (form.fase === 'bevestigen' && form.bevestig) {
    const b = form.bevestig
    return (
      <form onSubmit={b.submit} className="max-w-xl space-y-7">
        <p className="text-2xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>
          Hoi {b.gast.voornaam} — ben je erbij?
        </p>
        <div className="grid grid-cols-2">
          <button
            type="button"
            onClick={() => b.setKeuze('bevestigd')}
            className="ed-knop ed-knop-omtrek"
            style={b.keuze === 'bevestigd' ? { background: 'var(--site-text)', color: 'var(--site-bg)' } : undefined}
            aria-pressed={b.keuze === 'bevestigd'}
          >
            Ja, ik kom
          </button>
          <button
            type="button"
            onClick={() => b.setKeuze('afgemeld')}
            className="ed-knop ed-knop-omtrek"
            style={{
              marginLeft: '-2px',
              ...(b.keuze === 'afgemeld' ? { background: 'var(--site-text)', color: 'var(--site-bg)' } : {}),
            }}
            aria-pressed={b.keuze === 'afgemeld'}
          >
            Helaas niet
          </button>
        </div>
        {b.komt && (
          <div className="space-y-5">
            <Veld label="Dieetwensen (optioneel)">
              <input value={b.dieet} onChange={(e) => b.setDieet(e.target.value)} className="ed-veld" />
            </Veld>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 text-sm font-semibold" style={{ color: 'var(--site-text)' }}>
              <input
                type="checkbox"
                checked={b.heeftPartner}
                onChange={(e) => b.setHeeftPartner(e.target.checked)}
                className="h-4 w-4"
                style={{ accentColor: 'var(--site-text)' }}
              />
              Ik neem een partner mee
            </label>
            {b.heeftPartner && (
              <Veld label="Naam van je partner">
                <input value={b.partnerNaam} onChange={(e) => b.setPartnerNaam(e.target.value)} className="ed-veld" />
              </Veld>
            )}
            <Veld label="Aantal kinderen">
              <input type="number" min={0} value={b.kinderen || ''} onChange={(e) => b.setKinderen(Number(e.target.value) || 0)} className="ed-veld" />
            </Veld>
          </div>
        )}
        <button type="submit" disabled={!b.gekozen || b.bezig} className="ed-knop w-full">
          {b.bezig ? 'Bezig…' : 'Verstuur reactie'} <span aria-hidden>→</span>
        </button>
        {b.opgeslagen && (
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--primary))' }}>
            Genoteerd — bedankt!
          </p>
        )}
        {b.fout && <p className="text-sm font-medium text-red-600">{b.fout}</p>}
      </form>
    )
  }

  return (
    <div className="max-w-xl">
      {block.introTekst && <p className="mb-6 leading-relaxed" style={{ color: 'var(--site-muted)' }}>{block.introTekst}</p>}
      <form onSubmit={form.zoek.submit} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Veld label="Voornaam">
            <input value={form.zoek.voornaam} onChange={(e) => form.zoek.setVoornaam(e.target.value)} required className="ed-veld" />
          </Veld>
          <Veld label="Achternaam">
            <input value={form.zoek.achternaam} onChange={(e) => form.zoek.setAchternaam(e.target.value)} required className="ed-veld" />
          </Veld>
        </div>
        <button type="submit" disabled={form.zoek.status === 'zoeken'} className="ed-knop w-full">
          {form.zoek.status === 'zoeken' ? 'Bezig…' : 'Zoek mij op'} <span aria-hidden>→</span>
        </button>
      </form>
      {form.zoek.melding && <p className="mt-4 text-sm" style={{ color: 'var(--site-muted)' }}>{form.zoek.melding}</p>}
    </div>
  )
}

function TekstFoto({ block, nummer }: { block: TekstFotoBlock; nummer: number }) {
  const foto = block.fotoUrl ? (
    <figure>
      <div className="ed-schaduw">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={block.fotoUrl} alt="" className="ed-foto h-64 w-full object-cover sm:h-80" style={{ border: '2px solid var(--site-text)' }} />
      </div>
      <FigCaption nummer={nummer} />
    </figure>
  ) : null
  const tekst = (
    <p className="whitespace-pre-line text-base leading-relaxed" style={{ color: 'var(--site-text)' }}>{block.tekst}</p>
  )
  if (block.fotoPositie === 'boven') {
    return (
      <div className="space-y-8">
        {foto}
        <div className="max-w-xl">{tekst}</div>
      </div>
    )
  }
  return (
    <div className="grid items-start gap-8 md:grid-cols-12">
      {block.fotoPositie === 'links' && <div className="md:col-span-7">{foto}</div>}
      <div className={`md:col-span-5 ${block.fotoPositie === 'links' ? '' : 'md:order-1'} md:pt-10`}>{tekst}</div>
      {block.fotoPositie === 'rechts' && <div className="md:order-2 md:col-span-7">{foto}</div>}
    </div>
  )
}

function Content({ block, ctx, nummer }: ContentProps) {
  switch (block.type) {
    case 'tekst':
      return (
        <p
          className="whitespace-pre-line text-lg leading-relaxed first-letter:float-left first-letter:mr-3 first-letter:text-6xl first-letter:font-bold first-letter:leading-[0.85]"
          style={{ color: 'var(--site-text)' }}
        >
          {block.tekst}
        </p>
      )
    case 'tekstFoto':
      return <TekstFoto block={block} nummer={nummer} />
    case 'quote':
      return (
        <figure className="border-l-4 pl-6 sm:pl-8" style={{ borderColor: 'var(--site-text)' }}>
          <blockquote
            className="whitespace-pre-line"
            style={kopStijl(ctx.theme, { color: 'var(--site-text)', fontSize: 'clamp(1.6rem, 4vw, 2.6rem)', lineHeight: 1.2 })}
          >
            &ldquo;{block.citaat}&rdquo;
          </blockquote>
          {block.bron && (
            <figcaption className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--site-muted)' }}>
              — {block.bron}
            </figcaption>
          )}
        </figure>
      )
    case 'tijdlijn':
      return <Tijdlijn block={block} ctx={ctx} />
    case 'personen':
      return (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4">
          {block.mensen.map((p) => (
            <figure key={p.id}>
              {p.fotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.fotoUrl} alt="" className="ed-foto aspect-square w-full object-cover" style={{ border: '2px solid var(--site-text)' }} />
              ) : (
                <div
                  className="flex aspect-square w-full items-center justify-center text-4xl font-bold"
                  style={{ border: '2px solid var(--site-text)', color: 'hsl(var(--primary)/0.4)' }}
                >
                  {p.naam.trim()[0]?.toUpperCase() ?? '?'}
                </div>
              )}
              <figcaption className="mt-2">
                <p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--site-text)' }}>{p.naam}</p>
                {p.rol && <p className="mt-0.5 text-[11px]" style={{ color: 'var(--site-muted)' }}>{p.rol}</p>}
              </figcaption>
            </figure>
          ))}
        </div>
      )
    case 'locatie':
      return (
        <div>
          <div className="grid gap-4 pb-5 sm:grid-cols-2">
            <div>
              {block.naam && <p className="text-xl font-semibold" style={{ color: 'var(--site-text)' }}>{block.naam}</p>}
              {block.adres && (
                <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--site-muted)' }}>{block.adres}</p>
              )}
            </div>
            {block.tekst && <p className="whitespace-pre-line text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{block.tekst}</p>}
          </div>
          {block.kaartInsluitUrl && (
            <div style={{ border: '2px solid var(--site-text)' }}>
              <iframe
                src={block.kaartInsluitUrl}
                className="h-72 w-full border-0"
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
          <a href={block.videoUrl} target="_blank" rel="noopener noreferrer" className="ed-knop ed-knop-omtrek">
            <Play className="h-3.5 w-3.5" /> Bekijk de video
          </a>
        ) : null
      }
      return (
        <figure>
          <div style={{ border: '2px solid var(--site-text)' }}>
            <iframe
              src={embedUrl}
              className="aspect-video w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              title={block.titel || 'Video'}
            />
          </div>
          <FigCaption nummer={nummer} tekst={block.titel} />
        </figure>
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
            {ctx.registry.introText && <p className="whitespace-pre-line leading-relaxed" style={{ color: 'var(--site-muted)' }}>{ctx.registry.introText}</p>}
            <a href={`/trouwen/${ctx.slug}/cadeaulijst`} className="ed-knop">
              <Gift className="h-4 w-4" />
              Bekijk de cadeaulijst
              {ctx.registry.passwordRequired && <Lock className="h-3.5 w-3.5 opacity-70" />}
              <span aria-hidden>→</span>
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
        <div aria-hidden>
          <div style={{ borderTop: '2px solid var(--site-text)' }} />
          <div className="mt-1" style={{ borderTop: '1px solid var(--site-text)' }} />
        </div>
      )
  }
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function Footer({ ctx }: FooterProps) {
  const { wedding } = ctx
  return (
    <footer className="px-5 pb-10 sm:px-8">
      <div className="mx-auto max-w-6xl pt-6" style={{ borderTop: '2px solid var(--site-text)' }}>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="text-lg font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--site-text)' }}>
            {wedding.partner1Naam} &amp; {wedding.partner2Naam}
          </p>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--site-muted)' }}>
            {wedding.trouwdatum ? formatDatumNL(wedding.trouwdatum) : ''}
            {wedding.trouwdatum && wedding.locatie ? ' — ' : ''}
            {wedding.locatie}
          </p>
        </div>
      </div>
    </footer>
  )
}

export const editorTheme: ThemeRenderer = {
  css: CSS,
  bodyFont: 'Inter, system-ui, -apple-system, sans-serif',
  Nav,
  Hero,
  Section,
  Content,
  Footer,
}
