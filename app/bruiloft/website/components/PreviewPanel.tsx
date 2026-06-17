'use client'

import { Monitor, Smartphone, X } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'
import { PublicWebsite, type PublicWebsiteData } from '@/components/website/PublicWebsite'
import type { ScheduleItem, WebsiteContent, Wedding } from '@/lib/bruiloft/types'

interface Props {
  open: boolean
  onClose: () => void
  websiteContent: WebsiteContent
  wedding: Wedding
  scheduleItems: ScheduleItem[]
}

export function PreviewPanel({ open, onClose, websiteContent, wedding, scheduleItems }: Props) {
  const [modus, setModus] = React.useState<'desktop' | 'mobiel'>('desktop')

  if (!open) return null

  const data: PublicWebsiteData = {
    wedding: {
      partner1Naam: wedding.partner1Naam,
      partner2Naam: wedding.partner2Naam,
      trouwdatum: wedding.trouwdatum,
      locatie: wedding.locatie,
    },
    content: {
      thema: websiteContent.thema,
      kleurAccent: websiteContent.kleurAccent,
      kopLettertype: websiteContent.kopLettertype,
      headerFotoUrl: websiteContent.headerFotoUrl,
      headerOverlay: websiteContent.headerOverlay,
      welkomsttekst: websiteContent.welkomsttekst,
      dresscode: websiteContent.dresscode,
      cadeaulijst: websiteContent.cadeaulijst,
      hotels: websiteContent.hotels,
      routebeschrijving: websiteContent.routebeschrijving,
      contact: websiteContent.contact,
      faq: websiteContent.faq,
      gallerij: websiteContent.gallerij,
      sectiesConfig: websiteContent.sectiesConfig,
    },
    schedule: scheduleItems.map((s) => ({
      tijd: s.tijd,
      eindtijd: s.eindtijd,
      titel: s.titel,
      omschrijving: s.omschrijving,
      locatie: s.locatie,
    })),
  }

  return (
    <div
      className={cn(
        'fixed z-40 flex flex-col bg-background',
        // Mobile: full screen
        'inset-0',
        // Desktop: right panel below sticky header
        'md:inset-auto md:right-0 md:top-16 md:bottom-0 md:w-[min(480px,40vw)] md:border-l md:border-border md:shadow-2xl'
      )}
    >
      {/* Panel header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted/30 px-4 py-2">
        <span className="flex-1 text-sm font-medium text-foreground">Voorbeeld</span>
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
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Voorbeeld sluiten"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Preview area */}
      <div className="flex flex-1 overflow-y-auto bg-muted/20">
        <div
          className={cn(
            'w-full origin-top overflow-x-hidden bg-white',
            modus === 'mobiel' ? 'mx-auto max-w-sm border-x border-border shadow-sm' : ''
          )}
        >
          <PublicWebsite data={data} />
        </div>
      </div>
    </div>
  )
}
