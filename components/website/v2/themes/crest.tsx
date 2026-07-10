'use client'

// ── The Crest (gala) — de zwarte-das-uitnodiging ─────────────────────────────
// Formeel, heraldisch, gegraveerd staatsiedrukwerk: ivoor/marmerwit met
// marineblauw en mat goud, een wapenschild-monogram i.p.v. een medaillon,
// dubbele graveerlijnen als kader, strikt symmetrisch, scherpe hoeken.
// Bewegingstaal: statig-plechtig — 1200–1600ms, cubic-bezier(.19,1,.22,1);
// goudlijnen die zich van het midden naar buiten uittekenen, knoppen die
// "ingedrukt" ogen (inset-gloed) i.p.v. optillen.

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

const EASE = 'cubic-bezier(0.19, 1, 0.22, 1)'

const CSS = `
@keyframes cr-opkomst {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: none; }
}
@keyframes cr-lijn {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}
.cr-hero-item { opacity: 0; animation: cr-opkomst 1400ms ${EASE} forwards; }
.cr-lijn-uit { transform-origin: center; animation: cr-lijn 1600ms ${EASE} both; }

.cr-veld {
  height: 3rem;
  width: 100%;
  border: 0;
  border-bottom: 2px double hsl(var(--primary) / 0.5);
  border-radius: 0;
  background: transparent;
  padding: 0 2px;
  color: var(--site-text);
  transition: border-color 700ms ${EASE};
}
.cr-veld::placeholder { color: var(--site-muted); opacity: 0.65; }
.cr-veld:focus { outline: none; border-bottom-color: hsl(var(--primary)); }

.cr-knop {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  min-height: 3rem;
  padding: 0 2rem;
  border: 1px solid hsl(var(--primary));
  color: hsl(var(--primary));
  background: transparent;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  transition: box-shadow 500ms ${EASE}, background-color 700ms ${EASE}, color 700ms ${EASE};
}
.cr-knop:hover:not(:disabled) {
  background: hsl(var(--primary));
  color: #fff;
  box-shadow: inset 0 0 0 1px hsl(var(--primary)), 0 0 18px hsl(var(--primary) / 0.35);
}
.cr-knop:active:not(:disabled) { box-shadow: inset 0 2px 6px rgb(0 0 0 / 0.35); }
.cr-knop:focus-visible { outline: 2px solid hsl(var(--primary)); outline-offset: 3px; }
.cr-knop:disabled { opacity: 0.45; cursor: default; }

.cr-knop-vol { background: hsl(var(--primary)); color: #fff; }
.cr-knop-actief { background: hsl(var(--primary)); color: #fff; box-shadow: inset 0 2px 6px rgb(0 0 0 / 0.3); }

.cr-kader {
  border: 1px solid hsl(var(--primary) / 0.55);
  position: relative;
}
.cr-kader::before {
  content: '';
  position: absolute;
  inset: 5px;
  border: 1px solid hsl(var(--primary) / 0.28);
  pointer-events: none;
}

.cr-lijst { border: 6px solid #fff; outline: 1px solid hsl(var(--primary) / 0.6); box-shadow: 0 1px 3px rgb(0 0 0 / 0.12); }

.cr-nav-link { position: relative; transition: color 500ms ${EASE}; }
.cr-nav-link::after {
  content: '';
  position: absolute;
  left: 0; right: 0; bottom: -4px;
  height: 1px;
  background: hsl(var(--primary));
  transform: scaleX(0);
  transition: transform 500ms ${EASE};
}
.cr-nav-link:hover::after, .cr-nav-link[data-actief='true']::after { transform: scaleX(1); }

.cr-accordion {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 600ms ${EASE};
}
.cr-accordion[data-open='true'] { grid-template-rows: 1fr; }
.cr-accordion > div { overflow: hidden; }
`

const Reveal = maakReveal({
  verborgen: { opacity: 0, transform: 'translateY(18px)' },
  overgang: `opacity 1200ms ${EASE}, transform 1200ms ${EASE}`,
})

// ─── Romeinse cijfers ────────────────────────────────────────────────────────

const ROMAN_MAP: [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
]
function naarRomeins(n: number): string {
  if (n <= 0) return 'N'
  let rest = n, out = ''
  for (const [waarde, teken] of ROMAN_MAP) {
    while (rest >= waarde) {
      out += teken
      rest -= waarde
    }
  }
  return out
}

// ─── Bouwstenen ──────────────────────────────────────────────────────────────

function Kleinkapitaal({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <p className={`text-[11px] font-medium uppercase tracking-[0.3em] ${className ?? ''}`} style={style}>
      {children}
    </p>
  )
}

// Goudlijn die zich vanuit het midden uittekent.
function GoudLijn({ breed }: { breed?: boolean }) {
  return (
    <div
      className={`cr-lijn-uit mx-auto my-4 h-px ${breed ? 'w-24' : 'w-14'}`}
      style={{ background: 'hsl(var(--primary))' }}
      aria-hidden
    />
  )
}

// Wapenschild met de voorletters — het herkenningspunt van dit thema.
function Wapenschild({ ctx, klein }: { ctx: RenderContext; klein?: boolean }) {
  const [a, b] = voorletters(ctx.wedding)
  const maat = klein ? 40 : 60
  return (
    <svg width={maat} height={maat * 1.15} viewBox="0 0 60 69" className="mx-auto" aria-hidden>
      <path
        d="M30 1 L58 9 V33 C58 50 46 62 30 68 C14 62 2 50 2 33 V9 Z"
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
      />
      <path
        d="M30 6 L53 13 V33 C53 47 43 57 30 62 C17 57 7 47 7 33 V13 Z"
        fill="none"
        stroke="hsl(var(--primary) / 0.4)"
        strokeWidth="1"
      />
      <text
        x="30"
        y="39"
        textAnchor="middle"
        fill="hsl(var(--primary))"
        style={{ fontFamily: 'var(--heading-font)', fontSize: klein ? 15 : 20, letterSpacing: '0.05em' }}
      >
        {a}{b}
      </text>
    </svg>
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

// Dubbele graveerlijst — het herkenbare kader om de hero.
function GraveerKader({ licht }: { licht: boolean }) {
  const kleur = licht ? 'rgba(255,255,255,0.6)' : 'hsl(var(--primary)/0.55)'
  const binnen = licht ? 'rgba(255,255,255,0.32)' : 'hsl(var(--primary)/0.25)'
  return (
    <div className="pointer-events-none absolute inset-3 z-10 sm:inset-6" aria-hidden>
      <div className="absolute inset-0 border" style={{ borderColor: kleur }} />
      <div className="absolute inset-[6px] border" style={{ borderColor: binnen }} />
    </div>
  )
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function HeroInhoud({ ctx, licht, ondertitel }: { ctx: RenderContext; licht: boolean; ondertitel: string }) {
  const { wedding, theme } = ctx
  const tekstKleur = licht ? '#ffffff' : 'var(--site-text)'
  const zacht = licht ? 'rgba(255,255,255,0.82)' : 'var(--site-muted)'
  return (
    <div className="relative z-20 px-8 py-24 text-center" style={{ color: tekstKleur }}>
      <div className="cr-hero-item" style={{ animationDelay: '150ms' }}>
        <Wapenschild ctx={ctx} />
      </div>
      <Kleinkapitaal className="cr-hero-item mt-6" style={{ animationDelay: '350ms', color: licht ? 'rgba(255,255,255,0.85)' : 'hsl(var(--primary))' }}>
        Het genoegen om u uit te nodigen
      </Kleinkapitaal>
      <h1
        className="cr-hero-item mt-3"
        style={{ ...kopStijl(theme), animationDelay: '500ms', fontSize: 'clamp(2.4rem, 6.5vw, 4.5rem)', lineHeight: 1.15 }}
      >
        {wedding.partner1Naam}
        <span className="mx-3" style={{ color: licht ? 'rgba(255,255,255,0.65)' : 'hsl(var(--primary))' }}>&amp;</span>
        {wedding.partner2Naam}
      </h1>
      <div className="cr-hero-item" style={{ animationDelay: '750ms' }}>
        <GoudLijn breed />
        <DatumRegel ctx={ctx} kleur={zacht} />
        {ondertitel && (
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed" style={{ color: zacht }}>{ondertitel}</p>
        )}
      </div>
    </div>
  )
}

function Hero({ block, ctx }: HeroProps) {
  const heeftFoto = !!block.fotoUrl

  if (block.variant === 'split') {
    return (
      <section className="relative grid grid-cols-1 md:grid-cols-2" style={{ minHeight: vh(80) }}>
        <div className="relative order-2 min-h-[58vw] md:order-1 md:min-h-0" style={{ background: 'var(--site-card)' }}>
          {heeftFoto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={block.fotoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
          <div className="pointer-events-none absolute inset-2 border" style={{ borderColor: 'hsl(var(--primary)/0.5)' }} />
        </div>
        <div className="order-1 flex items-center justify-center md:order-2">
          <HeroInhoud ctx={ctx} licht={false} ondertitel={block.ondertitel} />
        </div>
      </section>
    )
  }

  if (block.variant === 'typografisch') {
    return (
      <section className="relative flex items-center justify-center overflow-hidden" style={{ minHeight: vh(78) }}>
        {heeftFoto && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={block.fotoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ opacity: 0.08 }} />
            <div className="absolute inset-0" style={{ background: 'color-mix(in srgb, var(--site-bg) 85%, transparent)' }} />
          </>
        )}
        <GraveerKader licht={false} />
        <HeroInhoud ctx={ctx} licht={false} ondertitel={block.ondertitel} />
      </section>
    )
  }

  // fullscreen (standaard)
  return (
    <section className="relative flex items-center justify-center overflow-hidden" style={{ minHeight: vh(76) }}>
      {heeftFoto ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.fotoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: `rgba(10,16,22,${block.overlay ?? 0.45})` }} />
        </>
      ) : (
        <div className="absolute inset-0" style={{ background: 'var(--site-card)' }} />
      )}
      <GraveerKader licht={heeftFoto} />
      <HeroInhoud ctx={ctx} licht={heeftFoto} ondertitel={block.ondertitel} />
    </section>
  )
}

// ─── Navigatie ───────────────────────────────────────────────────────────────

function Nav({ items, ctx }: NavProps) {
  const { wedding, registry, slug } = ctx
  const [open, setOpen] = React.useState(false)
  const donker = { bg: 'hsl(206 32% 12%)', tekst: 'rgba(255,255,255,0.92)', link: 'rgba(255,255,255,0.62)' }

  return (
    <nav className="sticky top-0 z-40" style={{ background: donker.bg, boxShadow: '0 1px 0 hsl(var(--primary)/0.4)' }}>
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-3.5">
        <span className="truncate text-sm" style={{ ...kopStijl(ctx.theme), color: donker.tekst, letterSpacing: '0.08em' }}>
          {wedding.partner1Naam} &amp; {wedding.partner2Naam}
        </span>
        <ul className="hidden items-center gap-7 md:flex">
          {items.map((item) => (
            <li key={item.key}>
              <a
                href={item.href}
                data-actief={item.actief || undefined}
                className="cr-nav-link text-[10px] font-medium uppercase tracking-[0.24em]"
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
                className="cr-nav-link inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.24em]"
                style={{ color: 'hsl(var(--primary))' }}
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
        <div className="px-5 py-3 md:hidden" style={{ background: donker.bg, borderTop: '1px solid hsl(var(--primary)/0.3)' }}>
          <ul className="space-y-0.5">
            {items.map((item) => (
              <li key={item.key}>
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block py-2.5 text-[11px] uppercase tracking-[0.24em]"
                  style={{ color: donker.link }}
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
                  className="flex items-center gap-2 py-2.5 text-[11px] font-semibold uppercase tracking-[0.24em]"
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
  const b = breedte(layout, block.type === 'galerij' || block.type === 'video' || block.type === 'locatie' ? 'breed' : 'smal')
  const achtergrond = achtergrondVan(layout)
  const uitlijnKlas = UITLIJN_KLASSE[uitlijning(layout, 'midden')]
  const omkaderd = !achtergrond.eigen

  return (
    <section
      id={`b-${block.id}`}
      className={`relative scroll-mt-24 overflow-hidden px-4 py-12 sm:py-14 ${uitlijnKlas}`}
      style={achtergrond.stijl}
    >
      <AchtergrondFoto layout={layout} />
      <div className={`mx-auto ${BREEDTE_KLASSE[b]}`}>
        <Reveal>
          <KopFoto layout={layout} className="cr-lijst mx-auto mb-8 h-44 w-full object-cover" />
          {titel && (
            <header className="mb-8 text-center">
              <Kleinkapitaal style={{ color: 'hsl(var(--primary))' }}>Artikel {String(nummer).padStart(2, '0')}</Kleinkapitaal>
              <h2 className="mt-1.5 text-3xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>{titel}</h2>
              <GoudLijn />
            </header>
          )}
          {omkaderd ? (
            <div className="cr-kader p-6 sm:p-9" style={{ background: 'var(--site-card)' }}>
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
        <p className="text-2xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>Voor eeuwig verbonden</p>
        <Kleinkapitaal className="mt-2" style={{ color: 'var(--site-muted)' }}>MMXX</Kleinkapitaal>
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
    <div className="mx-auto flex max-w-lg items-stretch justify-center">
      {delen.map(({ val, label }, i) => (
        <React.Fragment key={label}>
          {i > 0 && <span aria-hidden className="mx-3 w-px self-stretch sm:mx-5" style={{ background: 'hsl(var(--primary)/0.3)' }} />}
          <div className="flex min-w-[3.75rem] flex-col items-center gap-2">
            <span className="text-3xl tabular-nums sm:text-4xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>
              {naarRomeins(val)}
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
    <ol className="mx-auto max-w-lg divide-y" style={{ borderColor: 'hsl(var(--primary)/0.25)' }}>
      {block.momenten.map((m, i) => (
        <li key={m.id} className="grid grid-cols-[3rem_1fr] items-start gap-4 py-5" style={{ borderColor: 'hsl(var(--primary)/0.2)' }}>
          <div className="flex flex-col items-center pt-1">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full border text-[11px]"
              style={{ borderColor: 'hsl(var(--primary))', color: 'hsl(var(--primary))' }}
            >
              {naarRomeins(i + 1)}
            </span>
          </div>
          <div>
            <Kleinkapitaal style={{ color: 'hsl(var(--primary))' }}>{m.datum}</Kleinkapitaal>
            <p className="mt-1 text-xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>{m.titel}</p>
            {m.tekst && <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{m.tekst}</p>}
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
        <div style={{ columns: '2', columnGap: '14px' }}>
          {block.fotos.map((f, i) => (
            <button key={f.id} type="button" onClick={() => lightbox.open(i)} className="cr-lijst mb-3.5 block w-full" style={{ breakInside: 'avoid' }}>
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
          <button key={f.id} type="button" onClick={() => lightbox.open(i)} className="cr-lijst block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.url} alt={f.bijschrift || ''} className="aspect-[4/5] w-full object-cover" />
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
          {i > 0 && <GoudLijn />}
          <div className="py-1.5">
            <Kleinkapitaal style={{ color: 'hsl(var(--primary))' }}>
              Gang {naarRomeins(i + 1)} — {s.tijd}{s.eindtijd && <span> tot {s.eindtijd}</span>}
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
    <ul className="mx-auto max-w-lg divide-y text-center" style={{ borderColor: 'hsl(var(--primary)/0.25)' }}>
      {items.map((item) => (
        <li key={item.id}>
          <button
            onClick={() => setOpen(open === item.id ? null : item.id)}
            className="flex min-h-12 w-full items-center justify-center gap-2 px-2 py-4"
            aria-expanded={open === item.id}
          >
            <span className="text-lg" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>{item.vraag}</span>
            <ChevronDown
              className="h-4 w-4 shrink-0"
              style={{ color: 'hsl(var(--primary))', transition: `transform 500ms ${EASE}`, transform: open === item.id ? 'rotate(180deg)' : undefined }}
            />
          </button>
          <div className="cr-accordion" data-open={open === item.id}>
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
  const form = useRsvpFormulier(ctx)

  if (form.fase === 'bevestigen' && form.bevestig) {
    const b = form.bevestig
    return (
      <form onSubmit={b.submit} className="space-y-6 text-center">
        <Wapenschild ctx={ctx} klein />
        <p className="text-xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>
          Geachte {b.gast.voornaam}, wij verzoeken uw antwoord
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => b.setKeuze('bevestigd')} className={`cr-knop flex-1 ${b.keuze === 'bevestigd' ? 'cr-knop-actief' : ''}`} aria-pressed={b.keuze === 'bevestigd'}>
            Met genoegen aanwezig
          </button>
          <button type="button" onClick={() => b.setKeuze('afgemeld')} className={`cr-knop flex-1 ${b.keuze === 'afgemeld' ? 'cr-knop-actief' : ''}`} aria-pressed={b.keuze === 'afgemeld'}>
            Met spijt verhinderd
          </button>
        </div>
        {b.komt && (
          <div className="space-y-5 text-left">
            <input value={b.dieet} onChange={(e) => b.setDieet(e.target.value)} placeholder="Dieetwensen (optioneel)" className="cr-veld" />
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
              <input value={b.partnerNaam} onChange={(e) => b.setPartnerNaam(e.target.value)} placeholder="Naam van uw partner" className="cr-veld" />
            )}
            <input
              type="number"
              min={0}
              value={b.kinderen || ''}
              onChange={(e) => b.setKinderen(Number(e.target.value) || 0)}
              placeholder="Aantal kinderen"
              className="cr-veld"
            />
          </div>
        )}
        <button type="submit" disabled={!b.gekozen || b.bezig} className="cr-knop cr-knop-vol w-full">
          {b.bezig ? 'Bezig…' : 'Antwoord verzenden'}
        </button>
        {b.opgeslagen && (
          <div>
            <GoudLijn />
            <Kleinkapitaal style={{ color: 'hsl(var(--primary))' }}>Wij danken u voor uw antwoord</Kleinkapitaal>
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
            className="cr-veld flex-1"
          />
          <input
            value={form.zoek.achternaam}
            onChange={(e) => form.zoek.setAchternaam(e.target.value)}
            placeholder="Achternaam"
            required
            className="cr-veld flex-1"
          />
        </div>
        <button type="submit" disabled={form.zoek.status === 'zoeken'} className="cr-knop w-full">
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
    <div className="cr-lijst overflow-hidden">
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
          <blockquote className="whitespace-pre-line text-2xl italic leading-snug" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>
            &bdquo;{block.citaat}&rdquo;
          </blockquote>
          {block.bron && (
            <figcaption className="mt-4">
              <GoudLijn />
              <Kleinkapitaal style={{ color: 'var(--site-muted)' }}>{block.bron}</Kleinkapitaal>
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
              <div className="cr-lijst mx-auto overflow-hidden" style={{ width: '88px' }}>
                {p.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.fotoUrl} alt="" className="aspect-[4/5] w-full object-cover" />
                ) : (
                  <div className="aspect-[4/5] w-full" style={{ background: 'hsl(var(--primary)/0.1)' }} />
                )}
              </div>
              <p className="mt-2.5 text-lg" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>{p.naam}</p>
              {p.rol && <Kleinkapitaal className="mt-0.5" style={{ color: 'hsl(var(--primary))' }}>{p.rol}</Kleinkapitaal>}
            </div>
          ))}
        </div>
      )
    case 'locatie':
      return (
        <div className="space-y-5 text-center">
          <div>
            {block.naam && <p className="text-xl" style={kopStijl(ctx.theme, { color: 'var(--site-text)' })}>{block.naam}</p>}
            {block.adres && <Kleinkapitaal className="mt-1.5" style={{ color: 'var(--site-muted)' }}>{block.adres}</Kleinkapitaal>}
          </div>
          {block.tekst && <p className="mx-auto max-w-md whitespace-pre-line text-sm leading-relaxed" style={{ color: 'var(--site-muted)' }}>{block.tekst}</p>}
          {block.kaartInsluitUrl && (
            <div className="cr-lijst overflow-hidden">
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
          <a href={block.videoUrl} target="_blank" rel="noopener noreferrer" className="cr-knop">
            <Play className="h-3.5 w-3.5" /> Bekijk de video
          </a>
        ) : null
      }
      return (
        <div className="cr-lijst overflow-hidden">
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
            <a href={`/trouwen/${ctx.slug}/cadeaulijst`} className="cr-knop cr-knop-vol">
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
      return <GoudLijn breed />
  }
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function Footer({ ctx }: FooterProps) {
  const { wedding } = ctx
  return (
    <footer className="px-4 pb-16 pt-10 text-center" style={{ background: 'hsl(206 32% 12%)' }}>
      <div className="mx-auto max-w-2xl">
        <Wapenschild ctx={ctx} klein />
        <p className="mt-4 text-2xl" style={{ ...kopStijl(ctx.theme), color: '#fff' }}>
          {wedding.partner1Naam} &amp; {wedding.partner2Naam}
        </p>
        {wedding.trouwdatum && (
          <Kleinkapitaal className="mt-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {formatDatumNL(wedding.trouwdatum)}
          </Kleinkapitaal>
        )}
      </div>
    </footer>
  )
}

export const crestTheme: ThemeRenderer = {
  css: CSS,
  bodyFont: 'var(--font-garamond), "EB Garamond", Georgia, serif',
  Nav,
  Hero,
  Section,
  Content,
  Footer,
}
