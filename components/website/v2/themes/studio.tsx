'use client'

// ── Studio (minimalistisch) — de galeriecatalogus ────────────────────────────
// Radicale typografische terughoudendheid: museumcatalogus. Enorme
// witruimte, haarlijnen, indexnummers, tekst boven widgets (de countdown is
// een zin), nooit een afgeronde hoek of schaduw. De FAQ is geen accordeon —
// alles staat gewoon op de pagina.
// Bewegingstaal: vrijwel geen — één precisie-fade (opacity, geen transform),
// links met een groeiende onderstreping. Terughoudendheid ís de identiteit.

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
  type CountdownRest,
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

const EASE = 'cubic-bezier(0.33, 0, 0.67, 1)'
const HAARLIJN = 'color-mix(in srgb, var(--site-text) 18%, transparent)'

const CSS = `
@keyframes st-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.st-hero-item { opacity: 0; animation: st-fade 700ms ${EASE} forwards; }

.st-veld {
  height: 3rem;
  width: 100%;
  border: 0;
  border-bottom: 1px solid color-mix(in srgb, var(--site-text) 30%, transparent);
  border-radius: 0;
  background: transparent;
  padding: 0;
  color: var(--site-text);
  transition: border-color 200ms ${EASE};
}
.st-veld::placeholder { color: var(--site-muted); opacity: 0.6; }
.st-veld:focus { outline: none; border-bottom-color: var(--site-text); }

.st-link {
  background-image: linear-gradient(currentColor, currentColor);
  background-size: 0% 1px;
  background-repeat: no-repeat;
  background-position: left calc(100% - 2px);
  transition: background-size 200ms ${EASE};
  padding-bottom: 3px;
}
.st-link:hover, .st-link[data-actief='true'] { background-size: 100% 1px; }

.st-keuze {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 3rem;
  padding: 0 1.5rem;
  border: 1px solid color-mix(in srgb, var(--site-text) 35%, transparent);
  background: transparent;
  color: var(--site-text);
  font-size: 0.875rem;
  border-radius: 0;
  transition: background-color 200ms ${EASE}, color 200ms ${EASE}, border-color 200ms ${EASE};
}
.st-keuze:hover:not(:disabled) { border-color: var(--site-text); }
.st-keuze[aria-pressed='true'] { background: var(--site-text); color: var(--site-bg); border-color: var(--site-text); }
.st-keuze:focus-visible { outline: 1px solid var(--site-text); outline-offset: 3px; }
.st-keuze:disabled { opacity: 0.4; cursor: default; }
`

const Reveal = maakReveal({
  verborgen: { opacity: 0 },
  overgang: `opacity 500ms ${EASE}`,
})

const pad2 = (n: number) => String(n).padStart(2, '0')

// ─── Bouwstenen ──────────────────────────────────────────────────────────────

function Meta({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[10px] uppercase tracking-[0.3em] ${className ?? ''}`} style={{ color: 'var(--site-muted)' }}>
      {children}
    </p>
  )
}

function TekstKnop({
  children,
  disabled,
  type = 'button',
  onClick,
  href,
}: {
  children: React.ReactNode
  disabled?: boolean
  type?: 'button' | 'submit'
  onClick?: () => void
  href?: string
}) {
  const inhoud = (
    <span className="st-link inline-flex min-h-12 items-center gap-2 text-base" style={{ color: 'var(--site-text)' }}>
      {children} <span aria-hidden>→</span>
    </span>
  )
  if (href) {
    return <a href={href}>{inhoud}</a>
  }
  return (
    <button type={type} disabled={disabled} onClick={onClick} className="disabled:opacity-40">
      {inhoud}
    </button>
  )
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function Hero({ block, ctx }: HeroProps) {
  const { wedding, theme } = ctx
  const heeftFoto = !!block.fotoUrl

  const namen = (licht: boolean, maat: string) => (
    <h1
      style={{
        ...kopStijl(theme),
        fontSize: maat,
        lineHeight: 1.02,
        letterSpacing: '-0.01em',
        color: licht ? '#fff' : 'var(--site-text)',
      }}
    >
      {wedding.partner1Naam}
      <br />
      &amp; {wedding.partner2Naam}
    </h1>
  )

  if (block.variant === 'split') {
    return (
      <section className="grid grid-cols-1 md:grid-cols-2" style={{ minHeight: vh(85) }}>
        <div className="relative order-1 min-h-[55vw] md:min-h-0">
          {heeftFoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={block.fotoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: 'color-mix(in srgb, var(--site-text) 5%, transparent)' }} />
          )}
        </div>
        <div className="order-2 flex flex-col justify-between p-7 sm:p-12" style={{ minHeight: '55vh' }}>
          <div className="st-hero-item" style={{ animationDelay: '150ms' }}>
            <Meta>Het huwelijk van</Meta>
          </div>
          <div>
            <div className="st-hero-item" style={{ animationDelay: '350ms' }}>
              {namen(false, 'clamp(2.6rem, 5.5vw, 4.75rem)')}
            </div>
            <div className="st-hero-item mt-8 flex flex-wrap items-baseline justify-between gap-3" style={{ animationDelay: '550ms' }}>
              {wedding.trouwdatum && <Meta>{formatDatumNL(wedding.trouwdatum)}</Meta>}
              {wedding.locatie && <Meta>{wedding.locatie}</Meta>}
            </div>
            {block.ondertitel && (
              <p className="st-hero-item mt-6 max-w-sm text-sm leading-relaxed" style={{ animationDelay: '650ms', color: 'var(--site-muted)' }}>
                {block.ondertitel}
              </p>
            )}
          </div>
        </div>
      </section>
    )
  }

  if (block.variant === 'typografisch') {
    return (
      <section className="relative flex flex-col justify-between p-7 sm:p-12" style={{ minHeight: vh(88) }}>
        <div className="st-hero-item flex items-baseline justify-between" style={{ animationDelay: '150ms' }}>
          <Meta>Het huwelijk van</Meta>
          {wedding.locatie && <Meta className="hidden sm:block">{wedding.locatie}</Meta>}
        </div>
        <div className="st-hero-item" style={{ animationDelay: '400ms' }}>
          {namen(false, 'clamp(3.25rem, 11vw, 9rem)')}
        </div>
        <div className="st-hero-item flex items-baseline justify-between border-b pb-6" style={{ animationDelay: '650ms', borderColor: HAARLIJN }}>
          {wedding.trouwdatum ? <Meta>{formatDatumNL(wedding.trouwdatum)}</Meta> : <span />}
          {block.ondertitel ? (
            <p className="max-w-xs text-right text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{block.ondertitel}</p>
          ) : (
            wedding.locatie && <Meta className="sm:hidden">{wedding.locatie}</Meta>
          )}
        </div>
      </section>
    )
  }

  // fullscreen (standaard)
  return (
    <section className="relative flex flex-col justify-between overflow-hidden p-7 sm:p-12" style={{ minHeight: vh(88) }}>
      {heeftFoto && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.fotoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${block.overlay ?? 0.35})` }} />
        </>
      )}
      <div className="st-hero-item relative z-10" style={{ animationDelay: '150ms' }}>
        <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: heeftFoto ? 'rgba(255,255,255,0.85)' : 'var(--site-muted)' }}>
          Het huwelijk van
        </p>
      </div>
      <div className="relative z-10 flex flex-wrap items-end justify-between gap-6">
        <div className="st-hero-item" style={{ animationDelay: '400ms' }}>
          {namen(heeftFoto, 'clamp(3rem, 8.5vw, 7rem)')}
          {block.ondertitel && (
            <p className="mt-5 max-w-sm text-sm leading-relaxed" style={{ color: heeftFoto ? 'rgba(255,255,255,0.85)' : 'var(--site-muted)' }}>
              {block.ondertitel}
            </p>
          )}
        </div>
        <div className="st-hero-item pb-2" style={{ animationDelay: '600ms' }}>
          <p className="text-right text-[10px] uppercase tracking-[0.3em]" style={{ color: heeftFoto ? 'rgba(255,255,255,0.85)' : 'var(--site-muted)' }}>
            {wedding.trouwdatum && <span className="block">{formatDatumNL(wedding.trouwdatum)}</span>}
            {wedding.locatie && <span className="mt-1 block">{wedding.locatie}</span>}
          </p>
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
    <nav className="sticky top-0 z-40" style={{ background: 'var(--site-bg)', borderBottom: `1px solid ${HAARLIJN}` }}>
      <div className="flex items-center justify-between px-7 py-4 sm:px-12">
        <span className="text-[10px] uppercase tracking-[0.3em]" style={{ color: 'var(--site-text)' }}>
          {wedding.partner1Naam} &amp; {wedding.partner2Naam}
        </span>
        <ul className="hidden items-center gap-7 md:flex">
          {items.map((item) => (
            <li key={item.key}>
              <a
                href={item.href}
                data-actief={item.actief || undefined}
                className="st-link text-[10px] uppercase tracking-[0.25em]"
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
                className="st-link text-[10px] uppercase tracking-[0.25em]"
                style={{ color: 'var(--site-text)' }}
              >
                Cadeaulijst
              </a>
            </li>
          )}
        </ul>
        <button
          className="st-link min-h-11 text-[10px] uppercase tracking-[0.25em] md:hidden"
          style={{ color: 'var(--site-text)' }}
          onClick={() => setOpen(!open)}
          aria-label="Menu"
          aria-expanded={open}
        >
          {open ? 'Sluiten' : 'Menu'}
        </button>
      </div>
      {open && (
        <ul className="px-7 pb-5 sm:px-12 md:hidden" style={{ animation: `st-fade 300ms ${EASE} both` }}>
          {items.map((item) => (
            <li key={item.key} style={{ borderTop: `1px solid ${HAARLIJN}` }}>
              <a
                href={item.href}
                onClick={() => setOpen(false)}
                className="block py-3 text-[11px] uppercase tracking-[0.25em]"
                style={{ color: 'var(--site-muted)' }}
              >
                {item.label}
              </a>
            </li>
          ))}
          {registry?.enabled && slug && (
            <li style={{ borderTop: `1px solid ${HAARLIJN}` }}>
              <a
                href={`/trouwen/${slug}/cadeaulijst`}
                onClick={() => setOpen(false)}
                className="block py-3 text-[11px] uppercase tracking-[0.25em]"
                style={{ color: 'var(--site-text)' }}
              >
                Cadeaulijst
              </a>
            </li>
          )}
        </ul>
      )}
    </nav>
  )
}

// ─── Sectie-omhulsel ─────────────────────────────────────────────────────────

const BREEDTE_KLASSE = {
  smal: 'max-w-xl',
  breed: 'max-w-none',
  volledig: 'max-w-none',
} as const

function Section({ block, ctx, nummer, children }: SectionProps) {
  if (block.type === 'scheiding') {
    return (
      <section id={`b-${block.id}`} className="scroll-mt-24 px-7 py-8 sm:px-12">
        {children}
      </section>
    )
  }

  const layout = block.layout
  const titel = 'titel' in block ? block.titel : ''
  const b = breedte(layout, block.type === 'tekst' || block.type === 'quote' || block.type === 'contact' ? 'smal' : 'breed')
  const achtergrond = achtergrondVan(layout)
  const uitlijnKlas = UITLIJN_KLASSE[uitlijning(layout, 'links')]

  return (
    <section
      id={`b-${block.id}`}
      className="relative scroll-mt-24 overflow-hidden px-7 py-16 sm:px-12 sm:py-24"
      style={achtergrond.stijl}
    >
      <AchtergrondFoto layout={layout} />
      <Reveal>
        <KopFoto layout={layout} className="mb-10 h-52 w-full object-cover" />
        {titel && (
          <header className="mb-10 flex items-baseline justify-between border-t pt-3 sm:mb-14" style={{ borderColor: 'var(--site-text)' }}>
            <h2 className="text-sm uppercase tracking-[0.25em]" style={{ color: 'var(--site-text)' }}>{titel}</h2>
            <span className="text-[10px] tabular-nums tracking-[0.2em]" style={{ color: 'var(--site-muted)' }}>{pad2(Math.max(nummer, 1))}</span>
          </header>
        )}
        <div className={`${BREEDTE_KLASSE[b]} ${uitlijnKlas}`}>{children}</div>
      </Reveal>
    </section>
  )
}

// ─── Blok-inhoud ─────────────────────────────────────────────────────────────

// Countdown als zin — tekst boven widgets.
function countdownZin(rest: CountdownRest): string {
  const delen = [
    `${rest.dagen} ${rest.dagen === 1 ? 'dag' : 'dagen'}`,
    `${rest.uren} uur`,
    `${rest.minuten} ${rest.minuten === 1 ? 'minuut' : 'minuten'}`,
    `${rest.seconden} ${rest.seconden === 1 ? 'seconde' : 'seconden'}`,
  ]
  return `Nog ${delen.slice(0, -1).join(', ')} en ${delen[delen.length - 1]}.`
}

function Countdown({ ctx, datum }: { ctx: RenderContext; datum: string | null }) {
  const rest = useCountdown(datum)
  const tekst = rest.voorbij
    ? `Getrouwd${ctx.wedding.trouwdatum ? ` op ${formatDatumNL(ctx.wedding.trouwdatum)}` : ''}.`
    : countdownZin(rest)
  return (
    <p
      className="max-w-4xl tabular-nums"
      style={kopStijl(ctx.theme, { color: 'var(--site-text)', fontSize: 'clamp(1.9rem, 5vw, 3.5rem)', lineHeight: 1.25 })}
    >
      {tekst}
    </p>
  )
}

function Tijdlijn({ block, ctx }: { block: TijdlijnBlock; ctx: RenderContext }) {
  return (
    <ol>
      {block.momenten.map((m, i) => (
        <li
          key={m.id}
          className="grid gap-2 py-8 sm:grid-cols-[minmax(140px,1fr)_2fr] sm:gap-10 first:pt-0"
          style={{ borderTop: i > 0 ? `1px solid ${HAARLIJN}` : undefined }}
        >
          <p style={kopStijl(ctx.theme, { color: 'var(--site-muted)', fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', lineHeight: 1.1 })}>
            {m.datum}
          </p>
          <div>
            <p className="text-xl" style={{ color: 'var(--site-text)' }}>{m.titel}</p>
            {m.tekst && <p className="mt-2 max-w-lg text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{m.tekst}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}

function Galerij({ block }: { block: GalerijBlock; ctx: RenderContext }) {
  const lightbox = useLightbox(block.fotos)
  const totaal = block.fotos.length

  if (block.stijl === 'masonry') {
    return (
      <>
        <div className="grid grid-cols-2 gap-6 sm:gap-8">
          {block.fotos.map((f, i) => (
            <figure key={f.id} className={i % 3 === 0 ? 'col-span-2' : ''}>
              <button type="button" onClick={() => lightbox.open(i)} className="block w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt={f.bijschrift || ''} className={`w-full object-cover ${i % 3 === 0 ? 'max-h-[75vh]' : 'aspect-[3/4]'}`} />
              </button>
              <figcaption className="mt-2 flex gap-3 text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--site-muted)' }}>
                <span className="tabular-nums">{pad2(i + 1)} / {pad2(totaal)}</span>
                {f.bijschrift && <span className="truncate normal-case tracking-normal">{f.bijschrift}</span>}
              </figcaption>
            </figure>
          ))}
        </div>
        {lightbox.openIndex !== null && <Lightbox fotos={block.fotos} start={lightbox.openIndex} onSluit={lightbox.sluit} />}
      </>
    )
  }

  // Raster: één kolom, groot — een catalogus bladert traag.
  return (
    <>
      <div className="space-y-14 sm:space-y-20">
        {block.fotos.map((f, i) => (
          <figure key={f.id}>
            <button type="button" onClick={() => lightbox.open(i)} className="block w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt={f.bijschrift || ''} className="max-h-[80vh] w-full object-cover" />
            </button>
            <figcaption className="mt-3 flex gap-4 text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--site-muted)' }}>
              <span className="tabular-nums">{pad2(i + 1)} / {pad2(totaal)}</span>
              {f.bijschrift && <span className="normal-case tracking-normal">{f.bijschrift}</span>}
            </figcaption>
          </figure>
        ))}
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
    <ol>
      {ctx.schedule.map((s, i) => (
        <li key={i} className="py-6 first:pt-0" style={{ borderTop: i > 0 ? `1px solid ${HAARLIJN}` : undefined }}>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <p className="tabular-nums" style={kopStijl(ctx.theme, { color: 'var(--site-text)', fontSize: '1.6rem', lineHeight: 1.1 })}>
              {s.tijd}
              {s.eindtijd && <span style={{ color: 'var(--site-muted)' }}> — {s.eindtijd}</span>}
            </p>
            <p className="text-lg" style={{ color: 'var(--site-text)' }}>{s.titel}</p>
          </div>
          {(s.omschrijving || s.locatie) && (
            <p className="mt-1.5 max-w-lg text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>
              {s.omschrijving}
              {s.omschrijving && s.locatie && ' — '}
              {s.locatie}
            </p>
          )}
        </li>
      ))}
    </ol>
  )
}

// Geen accordeon: vraag en antwoord staan er gewoon — eerlijk minimalisme.
function Faq({ items }: { items: FaqItem[]; ctx: RenderContext }) {
  return (
    <dl>
      {items.map((item, i) => (
        <div
          key={item.id}
          className="grid gap-2 py-7 first:pt-0 md:grid-cols-2 md:gap-12"
          style={{ borderTop: i > 0 ? `1px solid ${HAARLIJN}` : undefined }}
        >
          <dt className="text-lg" style={{ color: 'var(--site-text)' }}>{item.vraag}</dt>
          <dd className="text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{item.antwoord}</dd>
        </div>
      ))}
    </dl>
  )
}

function Veld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-[0.25em]" style={{ color: 'var(--site-muted)' }}>{label}</span>
      {children}
    </label>
  )
}

function Rsvp({ block, ctx }: { block: RsvpBlock; ctx: RenderContext }) {
  const form = useRsvpFormulier(ctx.slug, ctx.rsvpVooringevuld)

  if (form.fase === 'bevestigen' && form.bevestig) {
    const b = form.bevestig
    return (
      <form onSubmit={b.submit} className="max-w-xl space-y-8">
        <p style={kopStijl(ctx.theme, { color: 'var(--site-text)', fontSize: 'clamp(1.6rem, 4vw, 2.5rem)', lineHeight: 1.2 })}>
          {b.gast.voornaam}, ben je erbij?
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => b.setKeuze('bevestigd')} className="st-keuze flex-1" aria-pressed={b.keuze === 'bevestigd'}>
            Ja
          </button>
          <button type="button" onClick={() => b.setKeuze('afgemeld')} className="st-keuze flex-1" aria-pressed={b.keuze === 'afgemeld'}>
            Nee
          </button>
        </div>
        {b.komt && (
          <div className="space-y-6">
            <Veld label="Dieetwensen — optioneel">
              <input value={b.dieet} onChange={(e) => b.setDieet(e.target.value)} className="st-veld" />
            </Veld>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 text-sm" style={{ color: 'var(--site-text)' }}>
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
                <input value={b.partnerNaam} onChange={(e) => b.setPartnerNaam(e.target.value)} className="st-veld" />
              </Veld>
            )}
            <Veld label="Aantal kinderen">
              <input type="number" min={0} value={b.kinderen || ''} onChange={(e) => b.setKinderen(Number(e.target.value) || 0)} className="st-veld" />
            </Veld>
          </div>
        )}
        <div className="pt-2">
          <TekstKnop type="submit" disabled={!b.gekozen || b.bezig}>
            {b.bezig ? 'Bezig…' : 'Verstuur reactie'}
          </TekstKnop>
        </div>
        {b.opgeslagen && <Meta>Genoteerd — dank je wel</Meta>}
        {b.fout && <p className="text-sm text-red-600">{b.fout}</p>}
      </form>
    )
  }

  return (
    <div className="max-w-xl">
      {block.introTekst && <p className="mb-8 leading-relaxed" style={{ color: 'var(--site-muted)' }}>{block.introTekst}</p>}
      <form onSubmit={form.zoek.submit} className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <Veld label="Voornaam">
            <input value={form.zoek.voornaam} onChange={(e) => form.zoek.setVoornaam(e.target.value)} required className="st-veld" />
          </Veld>
          <Veld label="Achternaam">
            <input value={form.zoek.achternaam} onChange={(e) => form.zoek.setAchternaam(e.target.value)} required className="st-veld" />
          </Veld>
        </div>
        <TekstKnop type="submit" disabled={form.zoek.status === 'zoeken'}>
          {form.zoek.status === 'zoeken' ? 'Bezig…' : 'Zoek mij op'}
        </TekstKnop>
      </form>
      {form.zoek.melding && <p className="mt-5 text-sm" style={{ color: 'var(--site-muted)' }}>{form.zoek.melding}</p>}
    </div>
  )
}

function TekstFoto({ block }: { block: TekstFotoBlock; ctx: RenderContext }) {
  const foto = block.fotoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={block.fotoUrl} alt="" className="w-full object-cover" style={{ maxHeight: '70vh' }} />
  ) : null
  const tekst = (
    <p className="whitespace-pre-line text-base leading-loose" style={{ color: 'var(--site-text)' }}>{block.tekst}</p>
  )
  if (block.fotoPositie === 'boven') {
    return (
      <div className="space-y-10 text-left">
        {foto}
        <div className="max-w-xl">{tekst}</div>
      </div>
    )
  }
  return (
    <div className="grid items-start gap-10 text-left md:grid-cols-2">
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
        <figure className="max-w-2xl py-6">
          <blockquote
            className="whitespace-pre-line"
            style={kopStijl(ctx.theme, { color: 'var(--site-text)', fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)', lineHeight: 1.4 })}
          >
            {block.citaat}
          </blockquote>
          {block.bron && (
            <figcaption className="mt-6">
              <Meta>— {block.bron}</Meta>
            </figcaption>
          )}
        </figure>
      )
    case 'tijdlijn':
      return <Tijdlijn block={block} ctx={ctx} />
    case 'personen':
      return (
        <ul>
          {block.mensen.map((p, i) => (
            <li
              key={p.id}
              className="flex min-h-16 items-center gap-5 py-4 first:pt-0"
              style={{ borderTop: i > 0 ? `1px solid ${HAARLIJN}` : undefined }}
            >
              {p.fotoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.fotoUrl} alt="" className="h-14 w-14 shrink-0 object-cover" />
              )}
              <p className="flex-1 text-xl" style={{ color: 'var(--site-text)' }}>{p.naam}</p>
              {p.rol && <Meta>{p.rol}</Meta>}
            </li>
          ))}
        </ul>
      )
    case 'locatie':
      return (
        <div className="space-y-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            {block.naam && (
              <p style={kopStijl(ctx.theme, { color: 'var(--site-text)', fontSize: 'clamp(1.6rem, 4vw, 2.5rem)', lineHeight: 1.15 })}>
                {block.naam}
              </p>
            )}
            {block.adres && <Meta>{block.adres}</Meta>}
          </div>
          {block.tekst && <p className="max-w-xl whitespace-pre-line text-sm leading-loose" style={{ color: 'var(--site-muted)' }}>{block.tekst}</p>}
          {block.kaartInsluitUrl && (
            <div style={{ border: `1px solid ${HAARLIJN}` }}>
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
        return block.videoUrl ? <TekstKnop href={block.videoUrl}>Bekijk de video</TekstKnop> : null
      }
      return (
        <iframe
          src={embedUrl}
          className="aspect-video w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          title={block.titel || 'Video'}
        />
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
              <p className="max-w-xl whitespace-pre-line text-sm leading-loose" style={{ color: 'var(--site-muted)' }}>
                {ctx.registry.introText}
              </p>
            )}
            <TekstKnop href={`/trouwen/${ctx.slug}/cadeaulijst`}>Bekijk de cadeaulijst</TekstKnop>
          </div>
        )
      }
      return <p className="whitespace-pre-line leading-loose" style={{ color: 'var(--site-muted)' }}>{block.tekst}</p>
    case 'contact':
      return <p className="whitespace-pre-line leading-loose" style={{ color: 'var(--site-muted)' }}>{block.tekst}</p>
    case 'rsvp':
      return <Rsvp block={block} ctx={ctx} />
    case 'scheiding':
      return <div aria-hidden className="h-px w-10" style={{ background: 'var(--site-text)' }} />
  }
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function Footer({ ctx }: FooterProps) {
  const { wedding } = ctx
  return (
    <footer className="px-7 pb-14 sm:px-12">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-t pt-5" style={{ borderColor: 'var(--site-text)' }}>
        <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: 'var(--site-text)' }}>
          {wedding.partner1Naam} &amp; {wedding.partner2Naam}
        </p>
        {wedding.trouwdatum && <Meta>{formatDatumNL(wedding.trouwdatum)}</Meta>}
      </div>
    </footer>
  )
}

export const studioTheme: ThemeRenderer = {
  css: CSS,
  bodyFont: 'Inter, "Helvetica Neue", Arial, sans-serif',
  Nav,
  Hero,
  Section,
  Content,
  Footer,
}
