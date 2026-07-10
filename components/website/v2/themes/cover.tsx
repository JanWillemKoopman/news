'use client'

// ── The Cover (couture) — de tijdschriftomslag ───────────────────────────────
// Hoge-mode-editorial: monumentale Bodoni-koppen over dramatische
// zwart-witfotografie, alsof het bruidspaar op de cover van een
// modetijdschrift staat. Een steekvlam roodaccent (cover-line/prijskaartje)
// tegen verder puur zwart-wit. Bewegingstaal: zelfverzekerd-elegant —
// 400–600ms, zachte cross-fades met een vleug schaal, onderstrepingen die
// bij hover langzaam groeien; nooit een bounce of snap.

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

const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)'

const CSS = `
@keyframes co-fade {
  from { opacity: 0; transform: translateY(10px) scale(0.99); }
  to   { opacity: 1; transform: none; }
}
.co-hero-item { opacity: 0; animation: co-fade 600ms ${EASE} forwards; }

.co-veld {
  height: 3rem;
  width: 100%;
  border: 0;
  border-bottom: 1px solid color-mix(in srgb, var(--site-text) 30%, transparent);
  border-radius: 0;
  background: transparent;
  padding: 0;
  color: var(--site-text);
  transition: border-color 300ms ${EASE};
}
.co-veld::placeholder { color: var(--site-muted); opacity: 0.6; }
.co-veld:focus { outline: none; border-bottom-color: var(--site-text); }

.co-knop {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  min-height: 3rem;
  padding: 0 2rem;
  border: 1px solid var(--site-text);
  background: var(--site-text);
  color: var(--site-bg);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  border-radius: 0;
  position: relative;
  transition: background-color 400ms ${EASE}, color 400ms ${EASE};
}
.co-knop::after {
  content: '';
  position: absolute;
  left: 0; bottom: -1px; right: 0;
  height: 2px;
  background: hsl(var(--primary));
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 400ms ${EASE};
}
.co-knop:hover:not(:disabled) { background: var(--site-bg); color: var(--site-text); }
.co-knop:hover:not(:disabled)::after { transform: scaleX(1); }
.co-knop:focus-visible { outline: 2px solid hsl(var(--primary)); outline-offset: 3px; }
.co-knop:disabled { opacity: 0.4; cursor: default; }

.co-knop-omtrek { background: transparent; color: var(--site-text); }
.co-knop-omtrek:hover:not(:disabled) { background: var(--site-text); color: var(--site-bg); }

.co-link {
  background-image: linear-gradient(currentColor, currentColor);
  background-size: 0% 1px;
  background-repeat: no-repeat;
  background-position: left 100%;
  transition: background-size 450ms ${EASE};
  padding-bottom: 2px;
}
.co-link:hover, .co-link[data-actief='true'] { background-size: 100% 1px; }

.co-foto { filter: grayscale(1) contrast(1.05); transition: transform 700ms ${EASE}; }
.co-foto-wrap:hover .co-foto { transform: scale(1.02); }

.co-accordion {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 450ms ${EASE};
}
.co-accordion[data-open='true'] { grid-template-rows: 1fr; }
.co-accordion > div { overflow: hidden; }
`

const Reveal = maakReveal({
  verborgen: { opacity: 0, transform: 'translateY(10px) scale(0.99)' },
  overgang: `opacity 550ms ${EASE}, transform 550ms ${EASE}`,
})

const pad2 = (n: number) => String(n).padStart(2, '0')

// ─── Bouwstenen ──────────────────────────────────────────────────────────────

function CoverTag({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.2em]"
      style={{ color: 'hsl(var(--primary))' }}
    >
      {children}
    </span>
  )
}

function Mastkop({ ctx, nummer }: { ctx: RenderContext; nummer?: number }) {
  const { wedding } = ctx
  return (
    <div className="flex items-center justify-between border-b border-t py-2.5" style={{ borderColor: 'currentcolor' }}>
      <CoverTag>N&ordm; {pad2(nummer ?? 1)}</CoverTag>
      <CoverTag>
        {wedding.trouwdatum ? formatDatumNL(wedding.trouwdatum) : wedding.locatie}
      </CoverTag>
    </div>
  )
}

function FigCaption({ nummer, tekst }: { nummer: number; tekst?: string }) {
  return (
    <figcaption className="mt-2 flex gap-3 text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--site-muted)' }}>
      <span className="italic normal-case tracking-normal">Foto {pad2(nummer)}</span>
      {tekst && <span className="truncate normal-case tracking-normal">{tekst}</span>}
    </figcaption>
  )
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function Hero({ block, ctx }: HeroProps) {
  const { wedding, theme } = ctx
  const heeftFoto = !!block.fotoUrl

  const namen = (kleur: string, maat: string) => (
    <h1 style={{ ...kopStijl(theme), color: kleur, fontSize: maat, lineHeight: 0.95, letterSpacing: '-0.01em' }}>
      {wedding.partner1Naam}
      <br />
      <span style={{ fontStyle: 'italic' }}>&amp;</span> {wedding.partner2Naam}
    </h1>
  )

  if (block.variant === 'split') {
    return (
      <section className="grid grid-cols-1 md:grid-cols-2" style={{ minHeight: vh(84) }}>
        <div className="relative order-1 min-h-[62vw] overflow-hidden md:min-h-0">
          {heeftFoto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={block.fotoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ filter: 'grayscale(1) contrast(1.05)' }} />
          )}
        </div>
        <div className="order-2 flex flex-col justify-between p-7 sm:p-12">
          <div className="co-hero-item" style={{ animationDelay: '80ms' }}>
            <Mastkop ctx={ctx} />
          </div>
          <div className="co-hero-item py-8" style={{ animationDelay: '220ms' }}>
            {namen('var(--site-text)', 'clamp(2.5rem, 6vw, 4.5rem)')}
          </div>
          {block.ondertitel && (
            <p className="co-hero-item text-sm leading-relaxed" style={{ animationDelay: '380ms', color: 'var(--site-muted)' }}>
              {block.ondertitel}
            </p>
          )}
        </div>
      </section>
    )
  }

  if (block.variant === 'typografisch') {
    return (
      <section className="flex flex-col justify-between p-7 sm:p-12" style={{ minHeight: vh(86) }}>
        <div className="co-hero-item" style={{ animationDelay: '80ms' }}>
          <Mastkop ctx={ctx} />
        </div>
        <div className="co-hero-item py-10" style={{ animationDelay: '250ms' }}>
          {namen('var(--site-text)', 'clamp(3.5rem, 12vw, 10rem)')}
        </div>
        <div className="co-hero-item flex flex-wrap items-end justify-between gap-4 border-t pt-5" style={{ animationDelay: '420ms', borderColor: 'var(--site-text)' }}>
          <CoverTag>Editie limitée</CoverTag>
          {block.ondertitel ? (
            <p className="max-w-xs text-right text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{block.ondertitel}</p>
          ) : (
            wedding.locatie && <p className="text-sm" style={{ color: 'var(--site-muted)' }}>{wedding.locatie}</p>
          )}
        </div>
      </section>
    )
  }

  // fullscreen (standaard) — namen vallen over de foto.
  return (
    <section className="relative flex flex-col justify-end overflow-hidden p-7 sm:p-12" style={{ minHeight: vh(90) }}>
      {heeftFoto && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.fotoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ filter: 'grayscale(1) contrast(1.05)' }} />
          <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${block.overlay ?? 0.25})` }} />
          <div className="absolute inset-x-0 top-0 h-1/3" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.35), transparent)' }} />
        </>
      )}
      <div className="co-hero-item relative z-10" style={{ animationDelay: '60ms', color: heeftFoto ? '#fff' : 'var(--site-text)' }}>
        <Mastkop ctx={ctx} />
      </div>
      <div className="relative z-10 flex flex-wrap items-end justify-between gap-6 pt-10">
        <div className="co-hero-item" style={{ animationDelay: '260ms' }}>
          {namen(heeftFoto ? '#fff' : 'var(--site-text)', 'clamp(3rem, 9vw, 7.5rem)')}
          {block.ondertitel && (
            <p className="mt-5 max-w-sm text-sm leading-relaxed" style={{ color: heeftFoto ? 'rgba(255,255,255,0.85)' : 'var(--site-muted)' }}>
              {block.ondertitel}
            </p>
          )}
        </div>
        <div className="co-hero-item pb-2" style={{ animationDelay: '420ms' }}>
          <CoverTag>
            <span style={{ color: heeftFoto ? '#fff' : undefined }}>
              {wedding.trouwdatum ? formatDatumNL(wedding.trouwdatum) : ''}
            </span>
          </CoverTag>
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
    <nav className="sticky top-0 z-40" style={{ background: 'var(--site-bg)', borderBottom: '1px solid var(--site-text)' }}>
      <div className="flex items-center justify-between px-7 py-4 sm:px-12">
        <span style={{ ...kopStijl(ctx.theme), fontSize: '1.1rem', color: 'var(--site-text)' }}>
          {wedding.partner1Naam} <span style={{ fontStyle: 'italic' }}>&amp;</span> {wedding.partner2Naam}
        </span>
        <ul className="hidden items-center gap-7 md:flex">
          {items.map((item) => (
            <li key={item.key}>
              <a
                href={item.href}
                data-actief={item.actief || undefined}
                className="co-link text-[10px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: 'var(--site-text)' }}
              >
                {item.label}
              </a>
            </li>
          ))}
          {registry?.enabled && slug && (
            <li>
              <a href={`/trouwen/${slug}/cadeaulijst`} className="co-link text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'hsl(var(--primary))' }}>
                Cadeaulijst
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
        <ul className="px-7 pb-5 sm:px-12 md:hidden">
          {items.map((item) => (
            <li key={item.key} style={{ borderTop: '1px solid color-mix(in srgb, var(--site-text) 15%, transparent)' }}>
              <a href={item.href} onClick={() => setOpen(false)} className="block py-3 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--site-text)' }}>
                {item.label}
              </a>
            </li>
          ))}
          {registry?.enabled && slug && (
            <li style={{ borderTop: '1px solid color-mix(in srgb, var(--site-text) 15%, transparent)' }}>
              <a href={`/trouwen/${slug}/cadeaulijst`} onClick={() => setOpen(false)} className="block py-3 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'hsl(var(--primary))' }}>
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
    <section id={`b-${block.id}`} className="relative scroll-mt-24 overflow-hidden px-7 py-14 sm:px-12 sm:py-20" style={achtergrond.stijl}>
      <AchtergrondFoto layout={layout} />
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <KopFoto layout={layout} className="co-foto mb-10 h-52 w-full object-cover" />
          {titel && (
            <header className="mb-9 flex items-baseline justify-between border-t pt-3" style={{ borderColor: 'var(--site-text)' }}>
              <h2 style={kopStijl(ctx.theme, { color: 'var(--site-text)', fontSize: 'clamp(1.75rem, 4vw, 3rem)', lineHeight: 1.05 })}>
                {titel}
              </h2>
              <CoverTag>N&ordm; {pad2(Math.max(nummer, 1))}</CoverTag>
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
      <div className="border-b pb-4" style={{ borderColor: 'var(--site-text)' }}>
        <p style={kopStijl(ctx.theme, { color: 'var(--site-text)', fontSize: 'clamp(2.25rem, 6vw, 3.75rem)' })}>Getrouwd.</p>
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
    <div className="flex flex-wrap items-end gap-x-9 gap-y-5 border-b pb-4" style={{ borderColor: 'var(--site-text)' }}>
      {delen.map(({ val, label }) => (
        <div key={label}>
          <CoverTag>{label}</CoverTag>
          <p className="font-bold tabular-nums" style={{ color: 'var(--site-text)', fontSize: 'clamp(2.5rem, 7vw, 4.5rem)', lineHeight: 1, ...kopStijl(ctx.theme) }}>
            {pad2(val)}
          </p>
        </div>
      ))}
    </div>
  )
}

function Tijdlijn({ block, ctx }: { block: TijdlijnBlock; ctx: RenderContext }) {
  return (
    <ol style={{ borderTop: '1px solid var(--site-text)' }}>
      {block.momenten.map((m, i) => (
        <li key={m.id} className="py-5" style={{ borderBottom: '1px solid color-mix(in srgb, var(--site-text) 20%, transparent)' }}>
          <div className="flex items-baseline gap-3">
            <span className="shrink-0 text-sm" style={{ color: 'var(--site-muted)' }}>{m.datum}</span>
            <span className="min-w-0 flex-1 border-b border-dotted" style={{ borderColor: 'var(--site-muted)', marginBottom: '5px' }} aria-hidden />
            <span className="shrink-0 text-right text-lg" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>{m.titel}</span>
            <span className="shrink-0 text-xs tabular-nums" style={{ color: 'hsl(var(--primary))' }}>{pad2(i + 1)}</span>
          </div>
          {m.tekst && (
            <p className="mt-2 max-w-lg text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{m.tekst}</p>
          )}
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
        <div className="md:columns-3" style={{ columns: '2', columnGap: '18px' }}>
          {block.fotos.map((f, i) => (
            <figure key={f.id} className="co-foto-wrap mb-5 overflow-hidden" style={{ breakInside: 'avoid' }}>
              <button type="button" onClick={() => lightbox.open(i)} className="block w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt={f.bijschrift || ''} className="co-foto block w-full" />
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
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
        {block.fotos.map((f, i) => {
          const groot = i % 5 === 0
          return (
            <figure key={f.id} className={`co-foto-wrap overflow-hidden ${groot ? 'col-span-2' : ''}`}>
              <button type="button" onClick={() => lightbox.open(i)} className="block w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt={f.bijschrift || ''} className="co-foto w-full object-cover" style={{ aspectRatio: groot ? '16/9' : '1/1' }} />
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
    <ol style={{ borderTop: '1px solid var(--site-text)' }}>
      {ctx.schedule.map((s, i) => (
        <li key={i} className="grid grid-cols-[80px_1fr] gap-4 py-4" style={{ borderBottom: '1px solid color-mix(in srgb, var(--site-text) 20%, transparent)' }}>
          <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--site-text)' }}>{s.tijd}</span>
          <div>
            <p className="font-semibold" style={{ color: 'var(--site-text)' }}>{s.titel}</p>
            {s.omschrijving && <p className="mt-0.5 text-sm" style={{ color: 'var(--site-muted)' }}>{s.omschrijving}</p>}
            {s.locatie && <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--site-muted)' }}>{s.locatie}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}

function Faq({ items }: { items: FaqItem[]; ctx: RenderContext }) {
  const [open, setOpen] = React.useState<string | null>(null)
  return (
    <ul style={{ borderTop: '1px solid var(--site-text)' }}>
      {items.map((item) => {
        const isOpen = open === item.id
        return (
          <li key={item.id} style={{ borderBottom: '1px solid color-mix(in srgb, var(--site-text) 20%, transparent)' }}>
            <button onClick={() => setOpen(isOpen ? null : item.id)} className="flex min-h-12 w-full items-center justify-between gap-4 py-3.5 text-left" aria-expanded={isOpen}>
              <span className="font-semibold" style={{ color: 'var(--site-text)' }}>{item.vraag}</span>
              <ChevronDown className="h-4 w-4 shrink-0" style={{ color: 'var(--site-text)', transition: `transform 400ms ${EASE}`, transform: isOpen ? 'rotate(180deg)' : undefined }} />
            </button>
            <div className="co-accordion" data-open={isOpen}>
              <div>
                <p className="max-w-xl pb-4 text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{item.antwoord}</p>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function Veld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--site-muted)' }}>{label}</span>
      {children}
    </label>
  )
}

function Rsvp({ block, ctx }: { block: RsvpBlock; ctx: RenderContext }) {
  const form = useRsvpFormulier(ctx)

  if (form.fase === 'bevestigen' && form.bevestig) {
    const b = form.bevestig
    return (
      <form onSubmit={b.submit} className="max-w-xl space-y-7">
        <CoverTag>Abonneer u op ons ja-woord</CoverTag>
        <p style={kopStijl(ctx.theme, { color: 'var(--site-text)', fontSize: 'clamp(1.6rem, 4vw, 2.5rem)' })}>
          {b.gast.voornaam}, bent u erbij?
        </p>
        <div className="grid grid-cols-2">
          <button type="button" onClick={() => b.setKeuze('bevestigd')} className="co-knop co-knop-omtrek" style={b.keuze === 'bevestigd' ? { background: 'var(--site-text)', color: 'var(--site-bg)' } : undefined} aria-pressed={b.keuze === 'bevestigd'}>
            Ja, ik kom
          </button>
          <button type="button" onClick={() => b.setKeuze('afgemeld')} className="co-knop co-knop-omtrek" style={{ marginLeft: '-1px', ...(b.keuze === 'afgemeld' ? { background: 'var(--site-text)', color: 'var(--site-bg)' } : {}) }} aria-pressed={b.keuze === 'afgemeld'}>
            Helaas niet
          </button>
        </div>
        {b.komt && (
          <div className="space-y-5">
            <Veld label="Dieetwensen (optioneel)"><input value={b.dieet} onChange={(e) => b.setDieet(e.target.value)} className="co-veld" /></Veld>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 text-sm font-medium" style={{ color: 'var(--site-text)' }}>
              <input type="checkbox" checked={b.heeftPartner} onChange={(e) => b.setHeeftPartner(e.target.checked)} className="h-4 w-4" style={{ accentColor: 'var(--site-text)' }} />
              Ik neem een partner mee
            </label>
            {b.heeftPartner && <Veld label="Naam van uw partner"><input value={b.partnerNaam} onChange={(e) => b.setPartnerNaam(e.target.value)} className="co-veld" /></Veld>}
            <Veld label="Aantal kinderen"><input type="number" min={0} value={b.kinderen || ''} onChange={(e) => b.setKinderen(Number(e.target.value) || 0)} className="co-veld" /></Veld>
          </div>
        )}
        <button type="submit" disabled={!b.gekozen || b.bezig} className="co-knop w-full">
          {b.bezig ? 'Bezig…' : 'Antwoord verzenden'}
        </button>
        {b.opgeslagen && <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--primary))' }}>Genoteerd — dank u wel</p>}
        {b.fout && <p className="text-sm text-red-600">{b.fout}</p>}
      </form>
    )
  }

  return (
    <div className="max-w-xl">
      <CoverTag>Répondez s&apos;il vous plaît</CoverTag>
      {block.introTekst && <p className="mb-6 mt-3 leading-relaxed" style={{ color: 'var(--site-muted)' }}>{block.introTekst}</p>}
      <form onSubmit={form.zoek.submit} className="mt-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Veld label="Voornaam"><input value={form.zoek.voornaam} onChange={(e) => form.zoek.setVoornaam(e.target.value)} required className="co-veld" /></Veld>
          <Veld label="Achternaam"><input value={form.zoek.achternaam} onChange={(e) => form.zoek.setAchternaam(e.target.value)} required className="co-veld" /></Veld>
        </div>
        <button type="submit" disabled={form.zoek.status === 'zoeken'} className="co-knop w-full">
          {form.zoek.status === 'zoeken' ? 'Bezig…' : 'Zoek mij op'}
        </button>
      </form>
      {form.zoek.melding && <p className="mt-5 text-sm" style={{ color: 'var(--site-muted)' }}>{form.zoek.melding}</p>}
    </div>
  )
}

function TekstFoto({ block, nummer }: { block: TekstFotoBlock; nummer: number }) {
  const foto = block.fotoUrl ? (
    <figure className="co-foto-wrap overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={block.fotoUrl} alt="" className="co-foto h-64 w-full object-cover sm:h-80" />
      <FigCaption nummer={nummer} />
    </figure>
  ) : null
  const tekst = <p className="whitespace-pre-line text-base leading-relaxed" style={{ color: 'var(--site-text)' }}>{block.tekst}</p>
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
        <figure className="border-l-4 pl-6 sm:pl-8" style={{ borderColor: 'hsl(var(--primary))' }}>
          <blockquote className="whitespace-pre-line italic" style={kopStijl(ctx.theme, { color: 'var(--site-text)', fontSize: 'clamp(1.6rem, 4vw, 2.5rem)', lineHeight: 1.25 })}>
            &ldquo;{block.citaat}&rdquo;
          </blockquote>
          {block.bron && <figcaption className="mt-4"><CoverTag>— {block.bron}</CoverTag></figcaption>}
        </figure>
      )
    case 'tijdlijn':
      return <Tijdlijn block={block} ctx={ctx} />
    case 'personen':
      return (
        <ul>
          {block.mensen.map((p, i) => (
            <li key={p.id} className="flex min-h-16 items-center gap-5 py-4" style={{ borderTop: i > 0 ? '1px solid color-mix(in srgb, var(--site-text) 15%, transparent)' : undefined }}>
              {p.fotoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.fotoUrl} alt="" className="co-foto h-14 w-14 shrink-0 object-cover" />
              )}
              <p className="flex-1 text-xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>{p.naam}</p>
              {p.rol && <CoverTag>{p.rol}</CoverTag>}
            </li>
          ))}
        </ul>
      )
    case 'locatie':
      return (
        <div className="space-y-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            {block.naam && <p style={kopStijl(ctx.theme, { color: 'var(--site-text)', fontSize: 'clamp(1.6rem, 4vw, 2.5rem)' })}>{block.naam}</p>}
            {block.adres && <CoverTag>{block.adres}</CoverTag>}
          </div>
          {block.tekst && <p className="max-w-xl whitespace-pre-line text-sm leading-loose" style={{ color: 'var(--site-muted)' }}>{block.tekst}</p>}
          {block.kaartInsluitUrl && (
            <div style={{ border: '1px solid var(--site-text)' }}>
              <iframe src={block.kaartInsluitUrl} className="h-72 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" title={block.naam || 'Locatie'} />
            </div>
          )}
        </div>
      )
    case 'video': {
      const embedUrl = naarEmbedUrl(block.videoUrl)
      if (!embedUrl) {
        return block.videoUrl ? (
          <a href={block.videoUrl} target="_blank" rel="noopener noreferrer" className="co-knop co-knop-omtrek">
            <Play className="h-3.5 w-3.5" /> Bekijk de video
          </a>
        ) : null
      }
      return (
        <div className="co-foto-wrap" style={{ border: '1px solid var(--site-text)' }}>
          <iframe
            src={embedUrl}
            className="co-foto aspect-video w-full border-0"
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
            {ctx.registry.introText && <p className="max-w-xl whitespace-pre-line leading-loose" style={{ color: 'var(--site-muted)' }}>{ctx.registry.introText}</p>}
            <a href={`/trouwen/${ctx.slug}/cadeaulijst`} className="co-knop">
              <Gift className="h-4 w-4" />
              Bekijk de cadeaulijst
              {ctx.registry.passwordRequired && <Lock className="h-3.5 w-3.5 opacity-70" />}
            </a>
          </div>
        )
      }
      return <p className="whitespace-pre-line leading-loose" style={{ color: 'var(--site-muted)' }}>{block.tekst}</p>
    case 'contact':
      return <p className="whitespace-pre-line leading-loose" style={{ color: 'var(--site-muted)' }}>{block.tekst}</p>
    case 'rsvp':
      return <Rsvp block={block} ctx={ctx} />
    case 'scheiding':
      return <div aria-hidden className="h-px w-full" style={{ background: 'var(--site-text)' }} />
  }
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function Footer({ ctx }: FooterProps) {
  const { wedding } = ctx
  return (
    <footer className="px-7 pb-14 sm:px-12">
      <div className="mx-auto flex max-w-6xl flex-wrap items-baseline justify-between gap-3 border-t pt-5" style={{ borderColor: 'var(--site-text)' }}>
        <p style={{ ...kopStijl(ctx.theme), fontSize: '1.1rem', color: 'var(--site-text)' }}>
          {wedding.partner1Naam} &amp; {wedding.partner2Naam}
        </p>
        <CoverTag>
          {wedding.trouwdatum ? formatDatumNL(wedding.trouwdatum) : ''}
          {wedding.trouwdatum && wedding.locatie ? ' — ' : ''}
          {wedding.locatie}
        </CoverTag>
      </div>
    </footer>
  )
}

export const coverTheme: ThemeRenderer = {
  css: CSS,
  bodyFont: 'var(--font-garamond), "EB Garamond", Georgia, serif',
  Nav,
  Hero,
  Section,
  Content,
  Footer,
}
