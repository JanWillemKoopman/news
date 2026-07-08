'use client'

// ── Het Landgoed (rustiek) — het veldjournaal ────────────────────────────────
// Warm, geaard en tactiel: linnen texturen, gestempelde datumbadges,
// polaroid-foto's met handgeschreven bijschriften, scheurkaartjes-countdown
// en een antwoordbriefkaart met postzegelvak.
// Bewegingstaal: geaard — 420–520ms ease-out; alles schuift subtiel vanaf
// links binnen (als aantekeningen in een journaal), warme lift op hover.

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

const EASE = 'cubic-bezier(0, 0, 0.2, 1)'

const CSS = `
@keyframes rs-schuif {
  from { opacity: 0; transform: translateX(-16px); }
  to   { opacity: 1; transform: none; }
}
@keyframes rs-stempel-in {
  from { opacity: 0; transform: rotate(-9deg) scale(1.18); }
  to   { opacity: 1; transform: rotate(-4deg) scale(1); }
}
.rs-hero-item { opacity: 0; animation: rs-schuif 480ms ${EASE} forwards; }
.rs-stempel { transform: rotate(-4deg); animation: rs-stempel-in 380ms ${EASE} both; }

/* Fijne linnen-weving over de kaartkleur. */
.rs-linnen {
  background-image:
    repeating-linear-gradient(0deg, rgba(60, 42, 20, 0.03) 0 1px, transparent 1px 3px),
    repeating-linear-gradient(90deg, rgba(60, 42, 20, 0.022) 0 1px, transparent 1px 3px);
}

.rs-veld {
  height: 3rem;
  width: 100%;
  border: 0;
  border-bottom: 2px dashed hsl(var(--primary) / 0.45);
  border-radius: 0;
  background: transparent;
  padding: 0 2px;
  color: var(--site-text);
  transition: border-color 260ms ${EASE};
}
.rs-veld::placeholder { color: var(--site-muted); opacity: 0.7; }
.rs-veld:focus { outline: none; border-bottom-style: solid; border-bottom-color: hsl(var(--primary)); }

.rs-knop {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 3rem;
  padding: 0 1.75rem;
  border: 1.5px solid hsl(var(--primary));
  background: hsl(var(--primary));
  color: #fff;
  border-radius: var(--site-radius);
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: transform 240ms ${EASE}, box-shadow 240ms ${EASE}, background-color 240ms ${EASE}, color 240ms ${EASE};
}
.rs-knop:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 20px -10px rgba(76, 50, 22, 0.55); }
.rs-knop:focus-visible { outline: 2px solid hsl(var(--primary)); outline-offset: 3px; }
.rs-knop:disabled { opacity: 0.5; cursor: default; }

.rs-knop-omtrek { background: transparent; color: hsl(var(--primary)); }
.rs-knop-omtrek:hover:not(:disabled) { background: hsl(var(--primary)); color: #fff; }

.rs-polaroid {
  background: #fff;
  padding: 10px;
  border: 1px solid rgba(60, 42, 20, 0.1);
  box-shadow: 0 8px 18px -10px rgba(60, 42, 20, 0.4);
  transition: transform 240ms ${EASE}, box-shadow 240ms ${EASE};
}
.rs-polaroid:nth-child(odd) { transform: rotate(-1.6deg); }
.rs-polaroid:nth-child(even) { transform: rotate(1.3deg); }
.rs-polaroid:hover { transform: rotate(0deg) translateY(-4px); box-shadow: 0 14px 26px -12px rgba(60, 42, 20, 0.5); }

.rs-nav-link {
  border-bottom: 2px solid transparent;
  transition: border-color 240ms ${EASE}, color 240ms ${EASE};
  padding-bottom: 2px;
}
.rs-nav-link:hover, .rs-nav-link[data-actief='true'] { border-color: currentcolor; }

.rs-accordion {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 380ms ${EASE};
}
.rs-accordion[data-open='true'] { grid-template-rows: 1fr; }
.rs-accordion > div { overflow: hidden; }
`

const Reveal = maakReveal({
  verborgen: { opacity: 0, transform: 'translateX(-16px)' },
  overgang: `opacity 480ms ${EASE}, transform 480ms ${EASE}`,
})

// ─── Bouwstenen ──────────────────────────────────────────────────────────────

function Stempel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`rs-stempel inline-block border-2 p-1 ${className ?? ''}`}
      style={{ borderColor: 'hsl(var(--primary)/0.55)', color: 'hsl(var(--primary))', borderRadius: '4px' }}
    >
      <span
        className="block border border-dashed px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em]"
        style={{ borderColor: 'hsl(var(--primary)/0.4)' }}
      >
        {children}
      </span>
    </span>
  )
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'hsl(var(--primary))' }}>
      {children}
    </p>
  )
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function HeroPaneel({ block, ctx }: HeroProps) {
  const { wedding, theme } = ctx
  return (
    <div className="flex flex-col items-start justify-center px-7 py-12 sm:px-12">
      <div className="rs-hero-item" style={{ animationDelay: '80ms' }}>
        {wedding.locatie && <Kicker>{wedding.locatie}</Kicker>}
      </div>
      <h1
        className="rs-hero-item mt-4"
        style={{ ...kopStijl(theme), animationDelay: '180ms', fontSize: 'clamp(2.6rem, 6vw, 4.5rem)', lineHeight: 1.08, color: 'var(--site-text)' }}
      >
        {wedding.partner1Naam}
        <br />
        <span style={{ color: 'hsl(var(--primary))' }}>&amp;</span> {wedding.partner2Naam}
      </h1>
      <div className="rs-hero-item mt-5 h-px w-24" style={{ animationDelay: '280ms', background: 'hsl(var(--primary)/0.5)' }} />
      {wedding.trouwdatum && (
        <div className="rs-hero-item mt-6" style={{ animationDelay: '380ms' }}>
          <Stempel>{formatDatumNL(wedding.trouwdatum)}</Stempel>
        </div>
      )}
      {block.ondertitel && (
        <p className="rs-hero-item mt-6 max-w-md text-sm leading-relaxed" style={{ animationDelay: '460ms', color: 'var(--site-muted)' }}>
          {block.ondertitel}
        </p>
      )}
    </div>
  )
}

function Hero({ block, ctx }: HeroProps) {
  const heeftFoto = !!block.fotoUrl

  if (block.variant === 'typografisch') {
    // Houten-bord-variant: dubbel omraamd paneel op linnen.
    return (
      <section className="rs-linnen flex items-center justify-center px-5 py-16" style={{ minHeight: vh(72), background: 'var(--site-card)' }}>
        <div className="w-full max-w-xl border-2 p-2" style={{ borderColor: 'hsl(var(--primary)/0.5)', borderRadius: 'var(--site-radius)' }}>
          <div className="border px-6 py-12 text-center sm:px-10 sm:py-16" style={{ borderColor: 'hsl(var(--primary)/0.35)', borderRadius: 'var(--site-radius)' }}>
            <div className="rs-hero-item" style={{ animationDelay: '80ms' }}>
              {ctx.wedding.locatie && <Kicker>{ctx.wedding.locatie}</Kicker>}
            </div>
            <h1
              className="rs-hero-item mt-5"
              style={{ ...kopStijl(ctx.theme), animationDelay: '180ms', fontSize: 'clamp(2.5rem, 8vw, 4.25rem)', lineHeight: 1.1, color: 'var(--site-text)' }}
            >
              {ctx.wedding.partner1Naam}
              <br />
              <span style={{ color: 'hsl(var(--primary))' }}>&amp;</span> {ctx.wedding.partner2Naam}
            </h1>
            {ctx.wedding.trouwdatum && (
              <div className="mt-7">
                <Stempel>{formatDatumNL(ctx.wedding.trouwdatum)}</Stempel>
              </div>
            )}
            {block.ondertitel && (
              <p className="rs-hero-item mx-auto mt-6 max-w-sm text-sm leading-relaxed" style={{ animationDelay: '420ms', color: 'var(--site-muted)' }}>
                {block.ondertitel}
              </p>
            )}
          </div>
        </div>
      </section>
    )
  }

  if (block.variant === 'split') {
    return (
      <section className="grid grid-cols-1 md:grid-cols-2" style={{ minHeight: vh(80) }}>
        <div className="relative order-2 min-h-[52vw] md:order-1 md:min-h-0" style={{ background: 'var(--site-card)' }}>
          {heeftFoto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={block.fotoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
        </div>
        <div className="rs-linnen order-1 md:order-2" style={{ background: 'var(--site-card)', borderLeft: '1px solid hsl(var(--primary)/0.2)' }}>
          <HeroPaneel block={block} ctx={ctx} />
        </div>
      </section>
    )
  }

  // fullscreen (standaard): full-bleed foto met een linnen band die eroverheen schuift.
  return (
    <section>
      <div className="relative overflow-hidden" style={{ minHeight: vh(58) }}>
        {heeftFoto ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={block.fotoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0" style={{ background: `rgba(30,20,10,${block.overlay ?? 0.25})` }} />
          </>
        ) : (
          <div className="rs-linnen absolute inset-0" style={{ background: 'var(--site-card)' }} />
        )}
      </div>
      <div className="relative z-10 mx-auto -mt-20 max-w-2xl px-4 pb-4 sm:-mt-24">
        <div
          className="rs-linnen relative border px-6 py-10 text-center sm:px-12"
          style={{
            background: 'var(--site-card)',
            borderColor: 'hsl(var(--primary)/0.3)',
            borderRadius: 'var(--site-radius)',
            boxShadow: '0 18px 40px -20px rgba(50,32,14,0.45)',
          }}
        >
          {ctx.wedding.trouwdatum && (
            <span className="absolute -top-5 right-5 sm:right-8">
              <Stempel>{formatDatumNL(ctx.wedding.trouwdatum)}</Stempel>
            </span>
          )}
          <div className="rs-hero-item" style={{ animationDelay: '80ms' }}>
            {ctx.wedding.locatie && <Kicker>{ctx.wedding.locatie}</Kicker>}
          </div>
          <h1
            className="rs-hero-item mt-4"
            style={{ ...kopStijl(ctx.theme), animationDelay: '200ms', fontSize: 'clamp(2.4rem, 6.5vw, 4rem)', lineHeight: 1.1, color: 'var(--site-text)' }}
          >
            {ctx.wedding.partner1Naam} <span style={{ color: 'hsl(var(--primary))' }}>&amp;</span> {ctx.wedding.partner2Naam}
          </h1>
          {block.ondertitel && (
            <p className="rs-hero-item mx-auto mt-5 max-w-md text-sm leading-relaxed" style={{ animationDelay: '320ms', color: 'var(--site-muted)' }}>
              {block.ondertitel}
            </p>
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
  const donker = { bg: 'hsl(28 22% 18%)', tekst: 'rgba(255,248,240,0.92)', link: 'rgba(255,248,240,0.62)' }

  return (
    <nav className="sticky top-0 z-40" style={{ background: donker.bg, boxShadow: '0 1px 0 rgba(0,0,0,0.25)' }}>
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-3">
        <span className="truncate text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: donker.tekst }}>
          {wedding.partner1Naam} &amp; {wedding.partner2Naam}
        </span>
        <ul className="hidden items-center gap-6 md:flex">
          {items.map((item) => (
            <li key={item.key}>
              <a
                href={item.href}
                data-actief={item.actief || undefined}
                className="rs-nav-link text-[11px] font-semibold uppercase tracking-[0.16em]"
                style={{ color: item.actief ? donker.tekst : donker.link }}
              >
                {item.label}
              </a>
            </li>
          ))}
          {registry?.enabled && slug && (
            <li>
              <a
                href={`/trouwen/${slug}/cadeaulijst`}
                className="inline-flex items-center gap-1.5 border border-dashed px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em]"
                style={{ color: donker.tekst, borderColor: 'rgba(255,248,240,0.4)', borderRadius: '4px' }}
              >
                <Gift className="h-3 w-3" /> Cadeaulijst
                {registry.passwordRequired && <Lock className="h-2.5 w-2.5 opacity-70" />}
              </a>
            </li>
          )}
        </ul>
        <button
          className="flex h-11 w-11 items-center justify-center md:hidden"
          style={{ color: donker.tekst }}
          onClick={() => setOpen(!open)}
          aria-label="Menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="px-5 py-3 md:hidden" style={{ background: donker.bg, borderTop: '1px dashed rgba(255,248,240,0.25)' }}>
          <ul className="space-y-0.5">
            {items.map((item, i) => (
              <li key={item.key}>
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: donker.link, animation: `rs-schuif 320ms ${EASE} both`, animationDelay: `${i * 40}ms` }}
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
                  className="flex items-center gap-2 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: donker.tekst }}
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
  const b = breedte(layout, block.type === 'galerij' || block.type === 'video' || block.type === 'locatie' || block.type === 'personen' ? 'breed' : 'smal')
  const achtergrond = achtergrondVan(layout)
  const uitlijnKlas = UITLIJN_KLASSE[uitlijning(layout, 'links')]

  // Journaalpagina's wisselen tussen papier en linnen, op bloknummer zodat
  // elke blokvolgorde klopt; eigen achtergronden winnen.
  const linnen = !achtergrond.eigen && nummer % 2 === 0

  return (
    <section
      id={`b-${block.id}`}
      className={`relative scroll-mt-24 overflow-hidden px-5 py-12 sm:py-14 ${linnen ? 'rs-linnen' : ''} ${uitlijnKlas}`}
      style={{ ...(linnen ? { background: 'var(--site-card)' } : {}), ...achtergrond.stijl }}
    >
      <AchtergrondFoto layout={layout} />
      <div className={`mx-auto ${BREEDTE_KLASSE[b]}`}>
        <Reveal>
          <KopFoto layout={layout} className="rs-polaroid mb-8 h-48 w-full object-cover" />
          {titel && (
            <header className="mb-7">
              <div className="h-1 w-10" style={{ background: 'hsl(var(--primary))' }} />
              <h2 className="mt-3 text-3xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>{titel}</h2>
            </header>
          )}
          {ctx.theme.kaartStijl === 'accentlijn' && !achtergrond.eigen ? (
            <div className="border-l-2 pl-5 sm:pl-7" style={{ borderColor: 'hsl(var(--primary)/0.35)' }}>
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
      <div className="inline-block">
        <Stempel>Getrouwd — {ctx.wedding.trouwdatum ? formatDatumNL(ctx.wedding.trouwdatum) : ''}</Stempel>
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
    <div
      className="inline-flex max-w-full items-stretch overflow-x-auto border-2"
      style={{ borderColor: 'hsl(var(--primary)/0.55)', borderRadius: 'var(--site-radius)', background: '#fff' }}
    >
      {delen.map(({ val, label }, i) => (
        <div
          key={label}
          className="flex min-w-[4.5rem] flex-col items-center gap-1 px-4 py-4 sm:min-w-[5.5rem] sm:px-6"
          style={i > 0 ? { borderLeft: '2px dashed hsl(var(--primary)/0.35)' } : undefined}
        >
          <span className="text-3xl tabular-nums sm:text-4xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>
            {String(val).padStart(2, '0')}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--primary))' }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

function Tijdlijn({ block, ctx }: { block: TijdlijnBlock; ctx: RenderContext }) {
  return (
    <ol>
      {block.momenten.map((m) => (
        <li key={m.id} className="grid grid-cols-[88px_1fr] gap-0 sm:grid-cols-[120px_1fr]">
          {/* Kantlijn van het journaal: datum in de marge, notitie rechts. */}
          <div className="pb-9 pr-4 pt-0.5 text-right">
            <p className="text-xs italic leading-snug" style={{ color: 'hsl(var(--primary))' }}>{m.datum}</p>
          </div>
          <div className="relative border-l-2 pb-9 pl-5" style={{ borderColor: 'hsl(var(--primary)/0.3)' }}>
            <span
              aria-hidden
              className="absolute left-0 top-2 h-2 w-2 -translate-x-[5px] rounded-full"
              style={{ background: 'hsl(var(--primary))' }}
            />
            <p className="text-xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>{m.titel}</p>
            {m.tekst && <p className="mt-1.5 max-w-lg text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{m.tekst}</p>}
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
        <div style={{ columns: '2', columnGap: '18px' }}>
          {block.fotos.map((f, i) => (
            <button key={f.id} type="button" onClick={() => lightbox.open(i)} className="rs-polaroid mb-5 block w-full" style={{ breakInside: 'avoid' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt={f.bijschrift || ''} className="block w-full" />
              <p className="truncate px-1 pb-1 pt-2 text-center text-xs italic" style={{ color: '#6b7280' }}>{f.bijschrift || ' '}</p>
            </button>
          ))}
        </div>
        {lightbox.openIndex !== null && <Lightbox fotos={block.fotos} start={lightbox.openIndex} onSluit={lightbox.sluit} />}
      </>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
        {block.fotos.map((f, i) => (
          <button key={f.id} type="button" onClick={() => lightbox.open(i)} className="rs-polaroid block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.url} alt={f.bijschrift || ''} className="aspect-square w-full object-cover" />
            <p className="truncate px-1 pb-1 pt-2 text-center text-xs italic" style={{ color: '#6b7280' }}>{f.bijschrift || ' '}</p>
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
    <ol className="relative">
      <span aria-hidden className="absolute bottom-3 top-3 left-[43px] border-l-2 border-dashed sm:left-[51px]" style={{ borderColor: 'hsl(var(--primary)/0.3)' }} />
      {ctx.schedule.map((s, i) => (
        <li key={i} className="relative flex gap-5 pb-7 last:pb-0">
          <span
            className="z-10 inline-flex h-[3.4rem] w-[5.5rem] shrink-0 flex-col items-center justify-center border-2 text-center sm:w-[6.5rem]"
            style={{ borderColor: 'hsl(var(--primary)/0.5)', background: '#fff', borderRadius: '4px' }}
          >
            <span className="text-sm font-bold tabular-nums" style={{ color: 'hsl(var(--primary))' }}>{s.tijd}</span>
            {s.eindtijd && <span className="text-[10px] tabular-nums" style={{ color: 'var(--site-muted)' }}>tot {s.eindtijd}</span>}
          </span>
          <div className="pt-1.5">
            <p className="font-semibold" style={{ color: 'var(--site-text)' }}>{s.titel}</p>
            {s.omschrijving && <p className="mt-0.5 text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{s.omschrijving}</p>}
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
    <ul>
      {items.map((item) => {
        const isOpen = open === item.id
        return (
          <li key={item.id} style={{ borderBottom: '2px dashed hsl(var(--primary)/0.25)' }}>
            <button
              onClick={() => setOpen(isOpen ? null : item.id)}
              className="flex min-h-12 w-full items-center justify-between gap-3 py-3.5 text-left"
              aria-expanded={isOpen}
            >
              <span className="font-semibold" style={{ color: 'var(--site-text)' }}>{item.vraag}</span>
              <ChevronDown
                className="h-4 w-4 shrink-0"
                style={{ color: 'hsl(var(--primary))', transition: `transform 240ms ${EASE}`, transform: isOpen ? 'rotate(180deg)' : undefined }}
              />
            </button>
            <div className="rs-accordion" data-open={isOpen}>
              <div>
                <p className="max-w-lg pb-4 text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{item.antwoord}</p>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function Rsvp({ block, ctx }: { block: RsvpBlock; ctx: RenderContext }) {
  const form = useRsvpFormulier(ctx.slug, ctx.rsvpVooringevuld)

  const briefkaart = (inhoud: React.ReactNode) => (
    <div
      className="relative mx-auto max-w-lg border-2 border-dashed p-6 sm:p-9"
      style={{ borderColor: 'hsl(var(--primary)/0.45)', background: '#fff', borderRadius: 'var(--site-radius)' }}
    >
      {/* Postzegelvak. */}
      <span
        aria-hidden
        className="absolute right-4 top-4 hidden h-14 w-12 items-center justify-center border sm:flex"
        style={{ borderColor: 'hsl(var(--primary)/0.4)', borderRadius: '3px' }}
      >
        <span className="text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'hsl(var(--primary)/0.6)' }}>Post</span>
      </span>
      {inhoud}
    </div>
  )

  if (form.fase === 'bevestigen' && form.bevestig) {
    const b = form.bevestig
    return briefkaart(
      <form onSubmit={b.submit} className="space-y-5 text-left">
        <Kicker>Antwoordkaart</Kicker>
        <p className="text-xl sm:pr-14" style={kopStijl(ctx.theme, { color: '#262626' })}>
          Beste {b.gast.voornaam}, ben je erbij?
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => b.setKeuze('bevestigd')}
            className={`rs-knop flex-1 ${b.keuze === 'bevestigd' ? '' : 'rs-knop-omtrek'}`}
            aria-pressed={b.keuze === 'bevestigd'}
          >
            Ja, ik kom
          </button>
          <button
            type="button"
            onClick={() => b.setKeuze('afgemeld')}
            className={`rs-knop flex-1 ${b.keuze === 'afgemeld' ? '' : 'rs-knop-omtrek'}`}
            aria-pressed={b.keuze === 'afgemeld'}
          >
            Helaas niet
          </button>
        </div>
        {b.komt && (
          <div className="space-y-4">
            <input value={b.dieet} onChange={(e) => b.setDieet(e.target.value)} placeholder="Dieetwensen (optioneel)" className="rs-veld" style={{ color: '#262626' }} />
            <label className="flex min-h-12 cursor-pointer items-center gap-3 text-sm" style={{ color: '#262626' }}>
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
              <input value={b.partnerNaam} onChange={(e) => b.setPartnerNaam(e.target.value)} placeholder="Naam van je partner" className="rs-veld" style={{ color: '#262626' }} />
            )}
            <input
              type="number"
              min={0}
              value={b.kinderen || ''}
              onChange={(e) => b.setKinderen(Number(e.target.value) || 0)}
              placeholder="Aantal kinderen"
              className="rs-veld"
              style={{ color: '#262626' }}
            />
          </div>
        )}
        <button type="submit" disabled={!b.gekozen || b.bezig} className="rs-knop w-full">
          {b.bezig ? 'Bezig…' : 'Verstuur antwoordkaart'}
        </button>
        {b.opgeslagen && (
          <p className="text-sm font-semibold" style={{ color: 'hsl(var(--primary))' }}>
            Ontvangen! Bedankt voor je reactie.
          </p>
        )}
        {b.fout && <p className="text-sm font-medium text-red-600">{b.fout}</p>}
      </form>
    )
  }

  return briefkaart(
    <div className="text-left">
      <Kicker>Antwoordkaart</Kicker>
      {block.introTekst && (
        <p className="mt-3 max-w-sm text-sm leading-relaxed sm:pr-14" style={{ color: 'var(--site-muted)' }}>{block.introTekst}</p>
      )}
      <form onSubmit={form.zoek.submit} className="mt-6 space-y-4">
        <input
          value={form.zoek.voornaam}
          onChange={(e) => form.zoek.setVoornaam(e.target.value)}
          placeholder="Voornaam"
          required
          className="rs-veld"
          style={{ color: '#262626' }}
        />
        <input
          value={form.zoek.achternaam}
          onChange={(e) => form.zoek.setAchternaam(e.target.value)}
          placeholder="Achternaam"
          required
          className="rs-veld"
          style={{ color: '#262626' }}
        />
        <button type="submit" disabled={form.zoek.status === 'zoeken'} className="rs-knop w-full">
          {form.zoek.status === 'zoeken' ? 'Bezig…' : 'Zoek mij op'}
        </button>
      </form>
      {form.zoek.melding && <p className="mt-4 text-sm" style={{ color: 'var(--site-muted)' }}>{form.zoek.melding}</p>}
    </div>
  )
}

function TekstFoto({ block }: { block: TekstFotoBlock; ctx: RenderContext }) {
  const foto = block.fotoUrl ? (
    <div className="rs-polaroid">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={block.fotoUrl} alt="" className="h-56 w-full object-cover sm:h-72" />
      <div className="h-7" />
    </div>
  ) : null
  const tekst = (
    <p className="whitespace-pre-line text-base leading-relaxed" style={{ color: 'var(--site-text)' }}>{block.tekst}</p>
  )
  if (block.fotoPositie === 'boven') {
    return (
      <div className="space-y-7 text-left">
        {foto}
        {tekst}
      </div>
    )
  }
  return (
    <div className="grid items-center gap-9 text-left sm:grid-cols-2">
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
        <figure className="mx-auto max-w-lg border-2 p-2" style={{ borderColor: 'hsl(var(--primary)/0.4)', borderRadius: 'var(--site-radius)' }}>
          <div className="border px-6 py-8 text-center" style={{ borderColor: 'hsl(var(--primary)/0.25)', borderRadius: 'var(--site-radius)' }}>
            <blockquote className="whitespace-pre-line text-2xl italic leading-snug" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>
              &ldquo;{block.citaat}&rdquo;
            </blockquote>
            {block.bron && (
              <figcaption className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--primary))' }}>
                — {block.bron}
              </figcaption>
            )}
          </div>
        </figure>
      )
    case 'tijdlijn':
      return <Tijdlijn block={block} ctx={ctx} />
    case 'personen':
      return (
        <div className="grid grid-cols-2 gap-7 sm:grid-cols-3">
          {block.mensen.map((p) => (
            <div key={p.id} className="rs-polaroid text-center">
              {p.fotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.fotoUrl} alt="" className="aspect-square w-full object-cover" />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center" style={{ background: 'hsl(var(--primary)/0.1)' }}>
                  <span className="text-3xl" style={kopStijl(ctx.theme, { color: 'hsl(var(--primary)/0.5)' })}>
                    {p.naam.trim()[0]?.toUpperCase() ?? '?'}
                  </span>
                </div>
              )}
              <div className="px-1 pb-2 pt-2.5">
                <p className="truncate text-lg leading-tight" style={kopStijl(ctx.theme, { color: '#262626' })}>{p.naam}</p>
                {p.rol && <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: '#6b7280' }}>{p.rol}</p>}
              </div>
            </div>
          ))}
        </div>
      )
    case 'locatie':
      return (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              {block.naam && <p className="text-2xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>{block.naam}</p>}
              {block.adres && <p className="mt-1 text-sm italic" style={{ color: 'var(--site-muted)' }}>{block.adres}</p>}
            </div>
            <Stempel>Route</Stempel>
          </div>
          {block.tekst && <p className="max-w-lg whitespace-pre-line text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{block.tekst}</p>}
          {block.kaartInsluitUrl && (
            <div className="border-2 border-dashed p-2" style={{ borderColor: 'hsl(var(--primary)/0.4)', borderRadius: 'var(--site-radius)' }}>
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
          <a href={block.videoUrl} target="_blank" rel="noopener noreferrer" className="rs-knop rs-knop-omtrek">
            <Play className="h-3.5 w-3.5" /> Bekijk de video
          </a>
        ) : null
      }
      return (
        <div className="rs-polaroid">
          <iframe
            src={embedUrl}
            className="aspect-video w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            title={block.titel || 'Video'}
          />
          <div className="h-6" />
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
              <p className="max-w-lg whitespace-pre-line text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>
                {ctx.registry.introText}
              </p>
            )}
            <a href={`/trouwen/${ctx.slug}/cadeaulijst`} className="rs-knop">
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
        <div className="mx-auto flex max-w-md items-center gap-3" aria-hidden>
          <span className="flex-1 border-t-2 border-dashed" style={{ borderColor: 'hsl(var(--primary)/0.35)' }} />
          <span className="h-1.5 w-1.5 rotate-45" style={{ background: 'hsl(var(--primary)/0.6)' }} />
          <span className="flex-1 border-t-2 border-dashed" style={{ borderColor: 'hsl(var(--primary)/0.35)' }} />
        </div>
      )
  }
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function Footer({ ctx }: FooterProps) {
  const { wedding } = ctx
  return (
    <footer className="rs-linnen mt-4 px-5 py-12 text-center" style={{ background: 'var(--site-card)', borderTop: '1px solid hsl(var(--primary)/0.2)' }}>
      <p className="text-2xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>
        {wedding.partner1Naam} &amp; {wedding.partner2Naam}
      </p>
      {wedding.trouwdatum && (
        <div className="mt-4">
          <Stempel>{formatDatumNL(wedding.trouwdatum)}</Stempel>
        </div>
      )}
    </footer>
  )
}

export const landgoedTheme: ThemeRenderer = {
  css: CSS,
  bodyFont: 'var(--font-baskerville), "Libre Baskerville", Georgia, serif',
  Nav,
  Hero,
  Section,
  Content,
  Footer,
}
