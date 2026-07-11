'use client'

// Gedeelde, "headless" logica voor de zes thema-renderers: alle gedrag
// (RSVP-API-contract, countdown-tik, reveal-on-scroll, video-embeds,
// blok-layout-overrides, lightbox) staat hier één keer — de thema's
// leveren uitsluitend hun eigen markup en bewegingstaal eromheen.

import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import * as React from 'react'

import type { GallerijFoto, RsvpStatus } from '@/lib/bruiloft/types'
import type { BlockBreedte, BlockLayout, BlockUitlijning } from '@/lib/bruiloft/websiteBlocks'
import { PREVIEW_VH_CSS_VAR, type ThemeTokens } from '@/lib/bruiloft/websiteTheme'

import type { GevondenGast, RenderContext, WeddingInfo } from './types'

// Kopstijl volgens de gebruikers-tokens (lettertype + cursief).
export function kopStijl(theme: ThemeTokens, extra?: React.CSSProperties): React.CSSProperties {
  return {
    fontFamily: 'var(--heading-font)',
    fontStyle: theme.kopCursief ? 'italic' : 'normal',
    ...extra,
  }
}

// Voorletters voor monogrammen ("J" & "E").
export function voorletters(wedding: WeddingInfo): [string, string] {
  return [
    (wedding.partner1Naam.trim()[0] ?? '').toUpperCase(),
    (wedding.partner2Naam.trim()[0] ?? '').toUpperCase(),
  ]
}

// 1% viewporthoogte: valt terug op de echte `1vh` als de editor-preview de
// variabele niet heeft gezet (zie PREVIEW_VH_CSS_VAR in websiteTheme.ts).
export const vh = (percentage: number) => `calc(var(${PREVIEW_VH_CSS_VAR}, 1vh) * ${percentage})`

// ─── Countdown ───────────────────────────────────────────────────────────────

export interface CountdownRest {
  dagen: number
  uren: number
  minuten: number
  seconden: number
  voorbij: boolean
}

export function useCountdown(trouwdatum: string | null): CountdownRest {
  const [rest, setRest] = React.useState<CountdownRest>({
    dagen: 0, uren: 0, minuten: 0, seconden: 0, voorbij: false,
  })

  React.useEffect(() => {
    if (!trouwdatum) return
    function bereken() {
      const diff = new Date(trouwdatum + 'T00:00:00').getTime() - Date.now()
      if (diff <= 0) {
        setRest({ dagen: 0, uren: 0, minuten: 0, seconden: 0, voorbij: true })
        return
      }
      setRest({
        dagen: Math.floor(diff / 86400000),
        uren: Math.floor((diff % 86400000) / 3600000),
        minuten: Math.floor((diff % 3600000) / 60000),
        seconden: Math.floor((diff % 60000) / 1000),
        voorbij: false,
      })
    }
    bereken()
    const id = setInterval(bereken, 1000)
    return () => clearInterval(id)
  }, [trouwdatum])

  return rest
}

// ─── Video-embed ─────────────────────────────────────────────────────────────

// Zet een YouTube- of Vimeo-link om naar een embed-URL. Onherkende links
// (bijv. losse mp4's) geven null terug — de thema's tonen dan een link-out.
export function naarEmbedUrl(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null
  if (trimmed.includes('youtube.com/embed/') || trimmed.includes('player.vimeo.com/video/')) return trimmed
  const yt = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vimeo = trimmed.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`
  return null
}

// ─── RSVP: zelf opzoeken + bevestigen (headless) ─────────────────────────────
// Twee manieren om als gast herkend te worden, met hetzelfde formulier erna:
// (1) zelf opzoeken op voornaam + achternaam via de rate-limited
//     /api/rsvp/zoek + /api/rsvp/bevestig — nooit een rsvp_token in de
//     browser; of
// (2) een persoonlijke /rsvp/[token]-link: de gast is dan al herkend vóór
//     de pagina rendert (ctx.tokenGast, server-side opgezocht), de
//     zoekstap wordt overgeslagen en bevestigen gaat via
//     /api/rsvp/token-bevestig (matcht op token, geen naam-ambiguïteit
//     mogelijk).
// Dit contract staat hier één keer; de zes thema's bouwen er hun eigen
// formulier-markup omheen.

export type ZoekStatus = 'idle' | 'zoeken' | 'niet-gevonden' | 'meerdere' | 'te-veel-pogingen'

export const RSVP_ZOEK_MELDING: Record<Exclude<ZoekStatus, 'idle' | 'zoeken'>, string> = {
  'niet-gevonden': 'We konden je niet vinden. Controleer de spelling, of gebruik je persoonlijke uitnodigingslink.',
  'meerdere': 'Er zijn meerdere gasten met deze naam gevonden. Gebruik je persoonlijke uitnodigingslink of neem contact op met het bruidspaar.',
  'te-veel-pogingen': 'Te veel pogingen. Probeer het over een paar minuten opnieuw.',
}

export interface RsvpZoekState {
  voornaam: string
  achternaam: string
  setVoornaam: (v: string) => void
  setAchternaam: (v: string) => void
  status: ZoekStatus
  // De foutmelding bij de huidige status, of null.
  melding: string | null
  submit: (e: React.FormEvent) => void
}

export interface RsvpBevestigState {
  gast: GevondenGast
  keuze: RsvpStatus
  setKeuze: (s: RsvpStatus) => void
  dieet: string
  setDieet: (v: string) => void
  heeftPartner: boolean
  setHeeftPartner: (v: boolean) => void
  partnerNaam: string
  setPartnerNaam: (v: string) => void
  kinderen: number
  setKinderen: (n: number) => void
  verzoeknummer: string
  setVerzoeknummer: (v: string) => void
  bericht: string
  setBericht: (v: string) => void
  bezig: boolean
  opgeslagen: boolean
  fout: string
  // keuze === 'bevestigd' → extra velden (dieet/partner/kinderen) tonen.
  komt: boolean
  // Er is een keuze gemaakt → verstuurknop actief.
  gekozen: boolean
  submit: (e: React.FormEvent) => void
}

export interface RsvpFormulier {
  fase: 'zoeken' | 'bevestigen'
  zoek: RsvpZoekState
  bevestig: RsvpBevestigState | null
}

export function useRsvpFormulier(ctx: RenderContext): RsvpFormulier {
  const { slug, tokenGast } = ctx
  const initieleGast = tokenGast?.gast ?? null

  // Bij een persoonlijke link is de gast al herkend vóór de eerste render
  // (server-side opgezocht via resolve_rsvp_guest) — deze lazy initializers
  // starten het formulier dan meteen in de bevestig-fase, pre-filled. Bij
  // naam-zoeken (geen tokenGast) starten alle velden leeg, zoals voorheen.
  const [voornaam, setVoornaam] = React.useState(initieleGast?.voornaam ?? '')
  const [achternaam, setAchternaam] = React.useState(initieleGast?.achternaam ?? '')
  const [zoekStatus, setZoekStatus] = React.useState<ZoekStatus>('idle')
  const [gast, setGast] = React.useState<GevondenGast | null>(initieleGast)

  const [keuze, setKeuze] = React.useState<RsvpStatus>(initieleGast?.rsvpStatus ?? 'uitgenodigd')
  const [dieet, setDieet] = React.useState(initieleGast?.dieetwensen ?? '')
  const [heeftPartner, setHeeftPartner] = React.useState(initieleGast?.heeftPartner ?? false)
  const [partnerNaam, setPartnerNaam] = React.useState(initieleGast?.partnerNaam ?? '')
  const [kinderen, setKinderen] = React.useState(initieleGast?.aantalKinderen ?? 0)
  const [verzoeknummer, setVerzoeknummer] = React.useState(initieleGast?.verzoeknummer ?? '')
  const [bericht, setBericht] = React.useState(initieleGast?.bericht ?? '')
  const [bezig, setBezig] = React.useState(false)
  const [opgeslagen, setOpgeslagen] = React.useState(false)
  const [fout, setFout] = React.useState('')

  async function zoekSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!slug) return
    setZoekStatus('zoeken')
    try {
      const res = await fetch('/api/rsvp/zoek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, voornaam, achternaam }),
      })
      if (res.status === 429) {
        setZoekStatus('te-veel-pogingen')
        return
      }
      const data = (await res.json()) as { found: boolean; multiple: boolean; guest?: GevondenGast }
      if (data.found && data.guest) {
        setGast(data.guest)
        setKeuze(data.guest.rsvpStatus)
        setDieet(data.guest.dieetwensen)
        setHeeftPartner(data.guest.heeftPartner)
        setPartnerNaam(data.guest.partnerNaam)
        setKinderen(data.guest.aantalKinderen)
        // Bij naam-zoeken bewust leeg (privacy): eerder ingevulde wensen
        // komen alleen via de persoonlijke token-link terug.
        setVerzoeknummer(data.guest.verzoeknummer ?? '')
        setBericht(data.guest.bericht ?? '')
        setZoekStatus('idle')
      } else if (data.multiple) {
        setZoekStatus('meerdere')
      } else {
        setZoekStatus('niet-gevonden')
      }
    } catch {
      setZoekStatus('niet-gevonden')
    }
  }

  async function bevestigSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tokenGast && !slug) return
    setBezig(true)
    setFout('')
    try {
      const payload = {
        rsvpStatus: keuze,
        dieetwensen: dieet,
        heeftPartner,
        partnerNaam: heeftPartner ? partnerNaam : '',
        aantalKinderen: Number(kinderen) || 0,
        verzoeknummer,
        bericht,
      }
      // Via een persoonlijke link is de token zelf al de eenduidige
      // identiteit (geen kans op naam-ambiguïteit) — anders zoals voorheen
      // op slug + de ingevoerde naam.
      const res = tokenGast
        ? await fetch('/api/rsvp/token-bevestig', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: tokenGast.token, payload }),
          })
        : await fetch('/api/rsvp/bevestig', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug, voornaam, achternaam, payload }),
          })
      if (!res.ok) {
        setFout('Er ging iets mis bij het opslaan. Probeer het later opnieuw.')
        return
      }
      setOpgeslagen(true)
    } catch {
      setFout('Controleer je verbinding en probeer het opnieuw.')
    } finally {
      setBezig(false)
    }
  }

  const melding =
    zoekStatus === 'niet-gevonden' || zoekStatus === 'meerdere' || zoekStatus === 'te-veel-pogingen'
      ? RSVP_ZOEK_MELDING[zoekStatus]
      : null

  return {
    fase: gast ? 'bevestigen' : 'zoeken',
    zoek: { voornaam, achternaam, setVoornaam, setAchternaam, status: zoekStatus, melding, submit: zoekSubmit },
    bevestig: gast
      ? {
          gast, keuze, setKeuze, dieet, setDieet, heeftPartner, setHeeftPartner,
          partnerNaam, setPartnerNaam, kinderen, setKinderen,
          verzoeknummer, setVerzoeknummer, bericht, setBericht,
          bezig, opgeslagen, fout,
          komt: keuze === 'bevestigd',
          gekozen: keuze === 'bevestigd' || keuze === 'afgemeld',
          submit: bevestigSubmit,
        }
      : null,
  }
}

// ─── Reveal-on-scroll ────────────────────────────────────────────────────────
// IntersectionObserver-gebaseerde onthulling. In de editor-preview-iframe is
// het hele document "de viewport", dus daar verschijnt alles direct — precies
// wat je in een voorbeeld wilt. Zonder IO-ondersteuning: meteen zichtbaar.

export function useReveal(): { ref: (el: HTMLElement | null) => void; zichtbaar: boolean } {
  const [zichtbaar, setZichtbaar] = React.useState(false)
  const ioRef = React.useRef<IntersectionObserver | null>(null)

  const ref = React.useCallback((el: HTMLElement | null) => {
    ioRef.current?.disconnect()
    ioRef.current = null
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setZichtbaar(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setZichtbaar(true)
          io.disconnect()
        }
      },
      // Absolute marge (geen %): in de op inhoudshoogte gemeten preview-iframe
      // zou een procentuele marge de onderste blokken verborgen houden.
      { threshold: 0.01, rootMargin: '0px 0px -40px 0px' }
    )
    io.observe(el)
    ioRef.current = io
  }, [])

  return { ref, zichtbaar }
}

export interface RevealProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  // Vertraging in ms — voor cascades (bijv. galerijtegels). Houd de totale
  // cascade onder ~600ms zodat late items niet "achterblijven".
  vertraging?: number
}

// Fabriek voor een thema-specifiek Reveal-element: elk thema geeft zijn
// eigen verborgen-toestand en overgang mee, zodat de bewegingstaal per
// thema verschilt terwijl de IO-logica gedeeld blijft.
export function maakReveal(config: { verborgen: React.CSSProperties; overgang: string }) {
  return function Reveal({ children, className, style, vertraging = 0 }: RevealProps) {
    const { ref, zichtbaar } = useReveal()
    return (
      <div
        ref={ref}
        className={className}
        style={{
          ...style,
          transition: config.overgang,
          transitionDelay: vertraging > 0 ? `${vertraging}ms` : undefined,
          ...(zichtbaar ? {} : config.verborgen),
        }}
      >
        {children}
      </div>
    )
  }
}

// ─── Blok-layout-overrides ───────────────────────────────────────────────────
// Instellingen die het stel per blok kan zetten (uitlijning, breedte, eigen
// achtergrondkleur/-foto, tekstkleur) — elk thema respecteert ze via deze
// helpers zodat het gedrag overal identiek is.

export function uitlijning(layout: BlockLayout | undefined, standaard: BlockUitlijning): BlockUitlijning {
  return layout?.uitlijning ?? standaard
}

export const UITLIJN_KLASSE: Record<BlockUitlijning, string> = {
  links: 'text-left',
  midden: 'text-center',
  rechts: 'text-right',
}

export function breedte(layout: BlockLayout | undefined, standaard: BlockBreedte): BlockBreedte {
  return layout?.breedte ?? standaard
}

export interface AchtergrondInfo {
  heeftFoto: boolean
  // Eigen kleur of foto ingesteld → thema's laten hun eigen vlak-/kaarttint
  // dan achterwege zodat de keuze van het stel wint.
  eigen: boolean
  stijl: React.CSSProperties
}

export function achtergrondVan(layout?: BlockLayout): AchtergrondInfo {
  const heeftFoto = !!layout?.achtergrondFotoUrl
  // Een volledige achtergrondfoto vraagt (tenzij expliciet anders ingesteld)
  // om lichte tekst voor contrast.
  const tekstOverride = heeftFoto ? (layout?.tekstKleur ?? 'licht') : layout?.tekstKleur
  const stijl: React.CSSProperties = {
    ...(layout?.achtergrondKleur && !heeftFoto ? { backgroundColor: layout.achtergrondKleur } : {}),
    ...(heeftFoto ? { isolation: 'isolate' as const } : {}),
    ...(tekstOverride === 'licht'
      ? ({ '--site-text': '#ffffff', '--site-muted': 'rgba(255,255,255,0.75)' } as React.CSSProperties)
      : tekstOverride === 'donker'
        ? ({ '--site-text': '#1a1a1a', '--site-muted': 'rgba(0,0,0,0.6)' } as React.CSSProperties)
        : {}),
  }
  return { heeftFoto, eigen: heeftFoto || !!layout?.achtergrondKleur, stijl }
}

// De fotolaag achter een sectie met achtergrondfoto; hoort in een sectie
// met position:relative + isolation:isolate (zie achtergrondVan).
export function AchtergrondFoto({ layout }: { layout?: BlockLayout }) {
  if (!layout?.achtergrondFotoUrl) return null
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={layout.achtergrondFotoUrl} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
      <div className="absolute inset-0 -z-10" style={{ background: `rgba(0,0,0,${layout.achtergrondOverlay ?? 0.4})` }} />
    </>
  )
}

// Optionele kopfoto boven een sectietitel; het thema bepaalt het kader.
export function KopFoto({
  layout,
  className,
  style,
}: {
  layout?: BlockLayout
  className?: string
  style?: React.CSSProperties
}) {
  if (!layout?.kopFotoUrl) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={layout.kopFotoUrl} alt="" className={className ?? 'mb-6 h-44 w-full object-cover'} style={style} />
  )
}

// ─── Lightbox ────────────────────────────────────────────────────────────────
// Gedeelde fullscreen-fotoweergave voor de galerijen. In de editor-preview
// (iframe) openen galerijen géén lightbox: position:fixed zou daar het hele
// op inhoudshoogte gemeten document beslaan.

export function inPreviewIframe(): boolean {
  return typeof window !== 'undefined' && window.self !== window.top
}

export function Lightbox({
  fotos,
  start,
  onSluit,
}: {
  fotos: GallerijFoto[]
  start: number
  onSluit: () => void
}) {
  const [index, setIndex] = React.useState(start)
  const vorige = React.useCallback(() => setIndex((i) => (i - 1 + fotos.length) % fotos.length), [fotos.length])
  const volgende = React.useCallback(() => setIndex((i) => (i + 1) % fotos.length), [fotos.length])

  React.useEffect(() => {
    function onToets(e: KeyboardEvent) {
      if (e.key === 'Escape') onSluit()
      if (e.key === 'ArrowLeft') vorige()
      if (e.key === 'ArrowRight') volgende()
    }
    window.addEventListener('keydown', onToets)
    return () => window.removeEventListener('keydown', onToets)
  }, [onSluit, vorige, volgende])

  const foto = fotos[index]
  if (!foto) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Fotoweergave"
      onClick={onSluit}
    >
      <button
        type="button"
        onClick={onSluit}
        aria-label="Sluiten"
        className="absolute right-3 top-3 flex h-12 w-12 items-center justify-center text-white/80 transition-opacity hover:text-white"
      >
        <X className="h-6 w-6" />
      </button>
      {fotos.length > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); vorige() }}
          aria-label="Vorige foto"
          className="absolute left-1 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center text-white/80 transition-opacity hover:text-white sm:left-3"
        >
          <ChevronLeft className="h-7 w-7" />
        </button>
      )}
      <figure className="max-h-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={foto.url} alt={foto.bijschrift || ''} className="max-h-[82vh] w-auto max-w-full object-contain" />
        {foto.bijschrift && (
          <figcaption className="mt-3 text-center text-sm text-white/75">{foto.bijschrift}</figcaption>
        )}
        {fotos.length > 1 && (
          <p className="mt-1 text-center text-xs tabular-nums text-white/50">
            {index + 1} / {fotos.length}
          </p>
        )}
      </figure>
      {fotos.length > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); volgende() }}
          aria-label="Volgende foto"
          className="absolute right-1 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center text-white/80 transition-opacity hover:text-white sm:right-3"
        >
          <ChevronRight className="h-7 w-7" />
        </button>
      )}
    </div>
  )
}

// Hook die galerij-klikgedrag bundelt: geeft open-state + handlers, en
// schakelt zichzelf uit binnen de preview-iframe.
export function useLightbox(fotos: GallerijFoto[]) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null)
  const actief = fotos.length > 0
  return {
    openIndex,
    open: (i: number) => {
      if (!actief || inPreviewIframe()) return
      setOpenIndex(i)
    },
    sluit: () => setOpenIndex(null),
  }
}
