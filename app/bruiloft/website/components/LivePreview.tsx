'use client'

// Live voorbeeld van de trouwwebsite in de editor: rendert dezelfde
// PublicWebsiteV2 als de publieke route, in een eigen <iframe> zodat de
// Tailwind-breakpoints (sm:/md:/lg:) reageren op de virtuele
// schermbreedte van het voorbeeld, en niet op de breedte van de
// editor-pagina zelf. Zonder iframe zou "mobiel" bijvoorbeeld gewoon de
// desktop-layout tonen zodra de browser van de gebruiker breed genoeg is —
// CSS media queries kijken altijd naar de echte viewport, nooit naar hoe
// klein een element visueel is gemaakt met transform:scale().
//
// De iframe krijgt zijn eigen (ongeschaalde) breedte/hoogte — dát bepaalt
// zijn interne viewport voor media queries — en wordt daarna, samen met
// zijn wrapper, visueel verkleind met CSS transform zodat het in het
// paneel past. Transform is puur cosmetisch en verandert niets aan de
// layout-berekening binnen de iframe.

import { Monitor, Smartphone, X } from 'lucide-react'
import * as React from 'react'
import { createPortal } from 'react-dom'

import { PublicWebsiteV2, type PublicWebsiteV2Data } from '@/components/website/v2/PublicWebsiteV2'
import type { WeddingLettertype } from '@/lib/bruiloft/types'
import { cn } from '@/lib/utils'
import {
  FONT_PREVIEW_URL,
  LETTERTYPE_CSS_VAR,
  LETTERTYPE_FONT_STACK,
  PREVIEW_VH_CSS_VAR,
} from '@/lib/bruiloft/websiteTheme'

const DESKTOP_BREEDTE = 1440
const MOBIEL_BREEDTE = 390
const MIN_HOOGTE = 480

// Vaste referentiehoogte voor vh-afhankelijke secties (bijv. een fullscreen
// hero), los van de werkelijke (aan de inhoud aangepaste) iframe-hoogte —
// zie PREVIEW_VH_CSS_VAR. Deze waarden benaderen een gangbare browservenster-
// hoogte per apparaattype, zodat een "65vh"-hero er in de preview net zo
// proportioneel uitziet als op de live website.
const DESKTOP_REFERENTIE_HOOGTE = 900
const MOBIEL_REFERENTIE_HOOGTE = 844

// De publieke route laadt de wedding-lettertypes via next/font
// (app/trouwen/layout.tsx); die CSS-variabelen bestaan niet in de losse
// iframe-preview. Definieer ze hier zelf, afgeleid van dezelfde
// bron (websiteTheme.ts) zodat een nieuw lettertype daar automatisch
// ook in de preview verschijnt.
const FONT_VAR_CSS = (Object.keys(LETTERTYPE_CSS_VAR) as WeddingLettertype[])
  .map((key) => {
    const varNaam = LETTERTYPE_CSS_VAR[key].slice(4, -1) // 'var(--font-x)' -> '--font-x'
    return `${varNaam}: ${LETTERTYPE_FONT_STACK[key]};`
  })
  .join(' ')

const IFRAME_SHELL = '<!DOCTYPE html><html><head></head><body style="margin:0"></body></html>'

// ─── Iframe-canvas: eigen document + gekloonde stylesheets + portal ─────────

function IframeCanvas({
  breedte,
  hoogte,
  referentieHoogte,
  onHoogteWijziging,
  titel,
  children,
}: {
  breedte: number
  hoogte: number
  // Vaste vh-referentiehoogte (zie PREVIEW_VH_CSS_VAR), los van `hoogte`.
  referentieHoogte: number
  onHoogteWijziging: (h: number) => void
  titel: string
  children: React.ReactNode
}) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null)
  const [mountEl, setMountEl] = React.useState<HTMLElement | null>(null)
  const gekopieerd = React.useRef<Set<string>>(new Set())
  const wpVhStyleRef = React.useRef<HTMLStyleElement | null>(null)
  const referentieHoogteRef = React.useRef(referentieHoogte)
  referentieHoogteRef.current = referentieHoogte

  const kopieerStylesheets = React.useCallback((doc: Document) => {
    const nodes = Array.from(window.document.head.querySelectorAll('link[rel="stylesheet"], style'))
    for (const node of nodes) {
      const sleutel = node.tagName === 'LINK' ? (node as HTMLLinkElement).href : node.textContent ?? ''
      if (!sleutel || gekopieerd.current.has(sleutel)) continue
      gekopieerd.current.add(sleutel)
      doc.head.appendChild(node.cloneNode(true))
    }
  }, [])

  React.useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    function initialiseer() {
      const doc = iframe!.contentDocument
      if (!doc) return
      kopieerStylesheets(doc)

      const fontLink = doc.createElement('link')
      fontLink.rel = 'stylesheet'
      fontLink.href = FONT_PREVIEW_URL
      doc.head.appendChild(fontLink)

      const fontVars = doc.createElement('style')
      fontVars.textContent = `:root { ${FONT_VAR_CSS} }`
      doc.head.appendChild(fontVars)

      const wpVhStyle = doc.createElement('style')
      wpVhStyle.textContent = `:root { ${PREVIEW_VH_CSS_VAR}: ${referentieHoogteRef.current / 100}px; }`
      doc.head.appendChild(wpVhStyle)
      wpVhStyleRef.current = wpVhStyle

      const root = doc.createElement('div')
      doc.body.appendChild(root)
      setMountEl(root)
    }

    iframe.addEventListener('load', initialiseer)
    return () => iframe.removeEventListener('load', initialiseer)
  }, [kopieerStylesheets])

  // Vang stylesheets die pas ná de eerste keer worden toegevoegd (bijv.
  // dev-mode hot-reload chunks) alsnog op.
  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      const doc = iframeRef.current?.contentDocument
      if (doc) kopieerStylesheets(doc)
    })
    observer.observe(window.document.head, { childList: true })
    return () => observer.disconnect()
  }, [kopieerStylesheets])

  // Referentiehoogte kan wisselen (desktop/mobiel-toggle) zonder dat de
  // iframe opnieuw laadt; werk de al aanwezige <style> dan bij.
  React.useEffect(() => {
    const style = wpVhStyleRef.current
    if (!style) return
    style.textContent = `:root { ${PREVIEW_VH_CSS_VAR}: ${referentieHoogte / 100}px; }`
  }, [referentieHoogte])

  // Meet de natuurlijke inhoudshoogte en meld wijzigingen (bijv. na het
  // toevoegen/verwijderen van blokken) terug aan de ouder.
  React.useEffect(() => {
    if (!mountEl) return
    const meet = () => onHoogteWijziging(mountEl.scrollHeight)
    meet()
    const ro = new ResizeObserver(meet)
    ro.observe(mountEl)
    return () => ro.disconnect()
  }, [mountEl, onHoogteWijziging])

  return (
    <iframe
      ref={iframeRef}
      title={titel}
      srcDoc={IFRAME_SHELL}
      style={{ width: breedte, height: hoogte, border: 0, display: 'block' }}
    >
      {mountEl && createPortal(children, mountEl)}
    </iframe>
  )
}

// ─── Hoofdcomponent ──────────────────────────────────────────────────────────

export function LivePreview({
  data,
  activePageSlug,
  onClose,
}: {
  data: PublicWebsiteV2Data
  // Welke pagina getoond wordt (fase 3: multi-page); '' of weggelaten = home.
  activePageSlug?: string
  // Aanwezig = overlay-variant (mobiel), afwezig = ingebed paneel (desktop).
  onClose?: () => void
}) {
  // Op de mobiele overlay (open vanaf een telefoon) is de mobiel-weergave
  // het nuttigst als startpunt; het ingebedde desktop-paneel start desktop.
  const [modus, setModus] = React.useState<'desktop' | 'mobiel'>(onClose ? 'mobiel' : 'desktop')
  const vlakRef = React.useRef<HTMLDivElement>(null)
  const [vlakBreedte, setVlakBreedte] = React.useState(0)
  const [hoogte, setHoogte] = React.useState(MIN_HOOGTE)

  React.useEffect(() => {
    const el = vlakRef.current
    if (!el) return
    const meet = () => setVlakBreedte(el.clientWidth)
    meet()
    const ro = new ResizeObserver(meet)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const virtueleBreedte = modus === 'desktop' ? DESKTOP_BREEDTE : MOBIEL_BREEDTE
  const virtueleReferentieHoogte = modus === 'desktop' ? DESKTOP_REFERENTIE_HOOGTE : MOBIEL_REFERENTIE_HOOGTE
  const schaal = vlakBreedte > 0 ? Math.min(1, vlakBreedte / virtueleBreedte) : 0
  const zichtbareHoogte = Math.max(hoogte, MIN_HOOGTE)

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-background">
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted/30 px-4 py-2">
        <span className="flex-1 text-sm font-medium text-foreground">
          Voorbeeld
          {schaal > 0 && schaal < 1 && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {Math.round(schaal * 100)}%
            </span>
          )}
        </span>
        <div className="flex gap-0.5 rounded-lg border border-border p-0.5">
          <button
            type="button"
            onClick={() => setModus('desktop')}
            title="Desktop"
            className={cn(
              'rounded p-1.5 transition-colors',
              modus === 'desktop' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Monitor className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setModus('mobiel')}
            title="Mobiel"
            className={cn(
              'rounded p-1.5 transition-colors',
              modus === 'mobiel' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Smartphone className="h-3.5 w-3.5" />
          </button>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Voorbeeld sluiten"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Scrollgebied: bevat de geschaalde iframe op zijn ware (ongeschaalde)
          afmetingen, zodat media queries in de iframe zelf de virtuele
          breedte zien i.p.v. de paneelbreedte. */}
      <div ref={vlakRef} className="relative flex-1 overflow-y-auto overflow-x-hidden bg-muted/20">
        {schaal > 0 && (
          <div
            className={cn('mx-auto overflow-hidden bg-white', modus === 'mobiel' && 'border-x border-border shadow-sm')}
            style={{ width: virtueleBreedte * schaal, height: zichtbareHoogte * schaal }}
          >
            <div style={{ width: virtueleBreedte, height: zichtbareHoogte, transform: `scale(${schaal})`, transformOrigin: 'top left' }}>
              <IframeCanvas
                breedte={virtueleBreedte}
                hoogte={zichtbareHoogte}
                referentieHoogte={virtueleReferentieHoogte}
                onHoogteWijziging={setHoogte}
                titel="Voorbeeld trouwwebsite"
              >
                <PublicWebsiteV2 data={data} activePageSlug={activePageSlug} />
              </IframeCanvas>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
