'use client'

// Live voorbeeld van de trouwwebsite in de editor: rendert dezelfde
// PublicWebsiteV2 als de publieke route. De desktop-modus toont een virtueel
// 1440px-breed scherm dat wordt geschaald naar de paneelbreedte, zodat je
// écht ziet hoe de site er op een groot scherm uitziet — ook in een smal
// paneel. De mobiel-modus toont een virtueel 390px-scherm.

import { Maximize2, Minimize2, Monitor, Smartphone, X } from 'lucide-react'
import * as React from 'react'

import { PublicWebsiteV2, type PublicWebsiteV2Data } from '@/components/website/v2/PublicWebsiteV2'
import { cn } from '@/lib/utils'

const DESKTOP_BREEDTE = 1440
const MOBIEL_BREEDTE = 390

// De publieke route laadt de wedding-lettertypes via next/font
// (app/trouwen/layout.tsx); in het editor-segment bestaan die
// CSS-variabelen niet. Voor het voorbeeld wijzen we ze naar de via
// Google Fonts geladen families (zelfde link als de lettertype-kiezer).
const FONT_PREVIEW_URL =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;700&family=Dancing+Script:wght@400;700&family=EB+Garamond:wght@400;700&family=Great+Vibes&family=Lora:wght@400;700&family=Playfair+Display:wght@400;700&display=swap'

const FONT_VARS = {
  '--font-serif': '"Cormorant Garamond", serif',
  '--font-playfair': '"Playfair Display", serif',
  '--font-lora': '"Lora", serif',
  '--font-dancing': '"Dancing Script", cursive',
  '--font-garamond': '"EB Garamond", serif',
  '--font-vibes': '"Great Vibes", cursive',
} as React.CSSProperties

export function LivePreview({
  data,
  onClose,
  volledig,
  onToggleVolledig,
}: {
  data: PublicWebsiteV2Data
  // Aanwezig = overlay-variant (mobiel), afwezig = ingebed paneel (desktop).
  onClose?: () => void
  // Ingebed paneel: of de instellingenkolom is ingeklapt (voorbeeld op
  // volledige breedte) en de knop om dat te wisselen.
  volledig?: boolean
  onToggleVolledig?: () => void
}) {
  const [modus, setModus] = React.useState<'desktop' | 'mobiel'>('desktop')
  const vlakRef = React.useRef<HTMLDivElement>(null)
  const [vlak, setVlak] = React.useState({ w: 0, h: 0 })

  React.useEffect(() => {
    const el = vlakRef.current
    if (!el) return
    const meet = () => setVlak({ w: el.clientWidth, h: el.clientHeight })
    meet()
    const ro = new ResizeObserver(meet)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  React.useEffect(() => {
    const FONT_ID = 'wedding-font-preview'
    if (document.getElementById(FONT_ID)) return
    const link = document.createElement('link')
    link.id = FONT_ID
    link.rel = 'stylesheet'
    link.href = FONT_PREVIEW_URL
    document.head.appendChild(link)
  }, [])

  const virtueleBreedte = modus === 'desktop' ? DESKTOP_BREEDTE : MOBIEL_BREEDTE
  const schaal = vlak.w > 0 ? Math.min(1, vlak.w / virtueleBreedte) : 0

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
        {onToggleVolledig && (
          <button
            type="button"
            onClick={onToggleVolledig}
            title={volledig ? 'Instellingen tonen' : 'Voorbeeld vergroten'}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {volledig ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        )}
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

      {/* Schaalvlak: een virtueel scherm van vaste breedte, geschaald naar
          de beschikbare paneelbreedte, met eigen scrollgebied. */}
      <div ref={vlakRef} className="relative flex-1 overflow-hidden bg-muted/20">
        {schaal > 0 && (
          <div
            className={cn('overflow-y-auto overscroll-contain bg-white', modus === 'mobiel' && 'border-x border-border shadow-sm')}
            style={{
              ...FONT_VARS,
              width: virtueleBreedte,
              height: vlak.h / schaal,
              transform: `scale(${schaal})`,
              transformOrigin: 'top left',
              // Mobiel in een breed paneel: centreren op ware grootte.
              marginLeft: schaal === 1 ? Math.max(0, (vlak.w - virtueleBreedte) / 2) : 0,
            }}
          >
            <PublicWebsiteV2 data={data} />
          </div>
        )}
      </div>
    </div>
  )
}
