'use client'

import {
  CalendarHeart,
  ChevronDown,
  Gift,
  Heart,
  HelpCircle,
  Hotel,
  Image,
  MapPin,
  Menu,
  Phone,
  Shirt,
  X,
} from 'lucide-react'
import * as React from 'react'

import { formatDatumNL } from '@/lib/bruiloft/format'
import type { FaqItem, GallerijFoto, SectieConfig, WeddingLettertype, WeddingThema } from '@/lib/bruiloft/types'

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

type UitlijningClass = 'text-left' | 'text-center' | 'text-right'

function uitlijningClass(uitlijning?: string): UitlijningClass {
  if (uitlijning === 'links') return 'text-left'
  if (uitlijning === 'rechts') return 'text-right'
  return 'text-center'
}

// Default index for ordering fallback
const DEFAULT_ORDER: Record<string, number> = {
  welkom: 0, programma: 1, dresscode: 2, cadeaulijst: 3,
  hotels: 4, routebeschrijving: 5, faq: 6, fotos: 7, contact: 8,
}

export function PublicWebsite({ data }: { data: PublicWebsiteData }) {
  const { wedding, content, schedule } = data
  const config = content.sectiesConfig ?? {}
  const isZichtbaar = (s: string) => config[s]?.zichtbaar !== false

  const themaVars: React.CSSProperties = {
    '--primary': hexNaarHsl(content.kleurAccent || '#a75573'),
    '--primary-foreground': '0 0% 100%',
    '--heading-font': LETTERTYPE_VAR[content.kopLettertype ?? 'cormorant'],
  } as React.CSSProperties

  // Build and sort sections by user-defined volgorde
  const sectieDefinities = [
    {
      id: 'welkom',
      label: config['welkom']?.naam ?? 'Welkom',
      zichtbaar: isZichtbaar('welkom') && !!content.welkomsttekst,
      icoon: <Heart className="h-5 w-5" />,
      render: () => (
        <p className={`whitespace-pre-line text-lg text-foreground ${uitlijningClass(config['welkom']?.uitlijning)}`}>
          {content.welkomsttekst}
        </p>
      ),
    },
    {
      id: 'programma',
      label: config['programma']?.naam ?? 'Programma',
      zichtbaar: isZichtbaar('programma') && schedule.length > 0,
      icoon: <CalendarHeart className="h-5 w-5" />,
      render: () => (
        <ul className="space-y-3">
          {schedule.map((s, i) => (
            <li key={i} className="flex gap-4">
              <span className="w-14 shrink-0 font-serif font-semibold tabular-nums text-primary">{s.tijd}</span>
              <div>
                <p className="font-medium text-foreground">{s.titel}</p>
                {s.omschrijving && <p className="text-sm text-muted-foreground">{s.omschrijving}</p>}
                {s.locatie && <p className="text-sm text-muted-foreground">{s.locatie}</p>}
              </div>
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: 'dresscode',
      label: config['dresscode']?.naam ?? 'Dresscode',
      zichtbaar: isZichtbaar('dresscode') && !!content.dresscode,
      icoon: <Shirt className="h-5 w-5" />,
      render: () => (
        <p className={`whitespace-pre-line text-muted-foreground ${uitlijningClass(config['dresscode']?.uitlijning)}`}>
          {content.dresscode}
        </p>
      ),
    },
    {
      id: 'cadeaulijst',
      label: config['cadeaulijst']?.naam ?? 'Cadeaulijst',
      zichtbaar: isZichtbaar('cadeaulijst') && !!content.cadeaulijst,
      icoon: <Gift className="h-5 w-5" />,
      render: () => (
        <p className={`whitespace-pre-line text-muted-foreground ${uitlijningClass(config['cadeaulijst']?.uitlijning)}`}>
          {content.cadeaulijst}
        </p>
      ),
    },
    {
      id: 'hotels',
      label: config['hotels']?.naam ?? 'Overnachten',
      zichtbaar: isZichtbaar('hotels') && !!content.hotels,
      icoon: <Hotel className="h-5 w-5" />,
      render: () => (
        <p className={`whitespace-pre-line text-muted-foreground ${uitlijningClass(config['hotels']?.uitlijning)}`}>
          {content.hotels}
        </p>
      ),
    },
    {
      id: 'routebeschrijving',
      label: config['routebeschrijving']?.naam ?? 'Route',
      zichtbaar: isZichtbaar('routebeschrijving') && !!content.routebeschrijving,
      icoon: <MapPin className="h-5 w-5" />,
      render: () => (
        <p className={`whitespace-pre-line text-muted-foreground ${uitlijningClass(config['routebeschrijving']?.uitlijning)}`}>
          {content.routebeschrijving}
        </p>
      ),
    },
    {
      id: 'faq',
      label: config['faq']?.naam ?? 'FAQ',
      zichtbaar: isZichtbaar('faq') && content.faq.length > 0,
      icoon: <HelpCircle className="h-5 w-5" />,
      render: () => <FaqAccordion items={content.faq} />,
    },
    {
      id: 'fotos',
      label: config['fotos']?.naam ?? "Foto's",
      zichtbaar: isZichtbaar('fotos') && content.gallerij.length > 0,
      icoon: <Image className="h-5 w-5" />,
      render: () => (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {content.gallerij.map((f) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={f.id} src={f.url} alt={f.bijschrift || ''} className="aspect-square w-full rounded-lg object-cover" />
          ))}
        </div>
      ),
    },
    {
      id: 'contact',
      label: config['contact']?.naam ?? 'Contact',
      zichtbaar: isZichtbaar('contact') && !!content.contact,
      icoon: <Phone className="h-5 w-5" />,
      render: () => (
        <p className={`text-muted-foreground ${uitlijningClass(config['contact']?.uitlijning)}`}>
          {content.contact}
        </p>
      ),
    },
  ]

  // Sort by user-defined volgorde, falling back to DEFAULT_ORDER
  const gesorteerdeSecties = [...sectieDefinities].sort((a, b) => {
    const va = config[a.id]?.volgorde ?? DEFAULT_ORDER[a.id] ?? 99
    const vb = config[b.id]?.volgorde ?? DEFAULT_ORDER[b.id] ?? 99
    return va - vb
  })

  const zichtbareSecties = gesorteerdeSecties.filter((s) => s.zichtbaar)

  return (
    <div style={themaVars}>
      <NavBalk
        namen={`${wedding.partner1Naam} & ${wedding.partner2Naam}`}
        secties={zichtbareSecties.map((s) => ({ id: s.id, label: s.label }))}
      />

      <HeroSectie wedding={wedding} content={content} />

      <main className="mx-auto max-w-2xl px-4 pb-20">
        {zichtbareSecties.map((s) => (
          <WebsiteSectie
            key={s.id}
            id={s.id}
            titel={s.label}
            icoon={s.icoon}
            fotoUrl={config[s.id]?.fotoUrl}
          >
            {s.render()}
          </WebsiteSectie>
        ))}
      </main>
    </div>
  )
}

function NavBalk({ namen, secties }: { namen: string; secties: { id: string; label: string }[] }) {
  const [open, setOpen] = React.useState(false)
  return (
    <nav className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <span className="font-serif text-lg font-medium text-foreground">{namen}</span>
        <ul className="hidden gap-5 md:flex">
          {secties.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-sm text-muted-foreground transition-colors hover:text-primary">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border/40 bg-background px-4 py-3 md:hidden">
          <ul className="space-y-2">
            {secties.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  )
}

function HeroSectie({ wedding, content }: { wedding: PublicWebsiteData['wedding']; content: PublicWebsiteData['content'] }) {
  const heeftFoto = !!content.headerFotoUrl
  return (
    <section className="relative flex min-h-[40vh] items-center justify-center overflow-hidden">
      {heeftFoto && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={content.headerFotoUrl} alt="Header foto" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${content.headerOverlay ?? 0.35})` }} />
        </>
      )}
      <div className={`relative z-10 px-4 py-16 text-center ${heeftFoto ? 'text-white' : ''}`}>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary">
          <Heart className="h-6 w-6" />
        </div>
        <h1
          className="text-4xl font-medium md:text-6xl"
          style={{ fontFamily: 'var(--heading-font, var(--font-serif))' }}
        >
          {wedding.partner1Naam}
          <span className="mx-3 text-primary">&</span>
          {wedding.partner2Naam}
        </h1>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm opacity-80">
          {wedding.trouwdatum && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarHeart className="h-4 w-4" />
              {formatDatumNL(wedding.trouwdatum)}
            </span>
          )}
          {wedding.locatie && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {wedding.locatie}
            </span>
          )}
        </div>
      </div>
    </section>
  )
}

function WebsiteSectie({
  id,
  titel,
  icoon,
  fotoUrl,
  children,
}: {
  id: string
  titel: string
  icoon?: React.ReactNode
  fotoUrl?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-16 py-8">
      {/* Section photo banner (if configured) */}
      {fotoUrl ? (
        <div className="relative mb-4 h-36 overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fotoUrl} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent px-5 pb-4">
            <div className="flex items-center gap-2 text-white">
              {icoon && <span className="opacity-90">{icoon}</span>}
              <h2
                className="text-2xl font-medium"
                style={{ fontFamily: 'var(--heading-font, var(--font-serif))' }}
              >
                {titel}
              </h2>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex items-center gap-2">
          {icoon && <span className="text-primary">{icoon}</span>}
          <h2
            className="font-serif text-2xl text-foreground"
            style={{ fontFamily: 'var(--heading-font, var(--font-serif))' }}
          >
            {titel}
          </h2>
        </div>
      )}
      <div className="rounded-2xl border border-border bg-card p-5">
        {children}
      </div>
    </section>
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
            <ChevronDown
              className={
                'h-4 w-4 shrink-0 text-muted-foreground transition-transform ' +
                (open === item.id ? 'rotate-180' : '')
              }
            />
          </button>
          {open === item.id && (
            <p className="pb-3 text-sm text-muted-foreground">{item.antwoord}</p>
          )}
        </li>
      ))}
    </ul>
  )
}
