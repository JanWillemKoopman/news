'use client'

// Live voorbeeld van de trouwwebsite in de editor: rendert dezelfde
// PublicWebsiteV2 als de publieke route, met een desktop/mobiel-toggle.

import { Monitor, Smartphone, X } from 'lucide-react'
import * as React from 'react'

import { PublicWebsiteV2, type PublicWebsiteV2Data } from '@/components/website/v2/PublicWebsiteV2'
import { cn } from '@/lib/utils'

export function LivePreview({
  data,
  onClose,
}: {
  data: PublicWebsiteV2Data
  // Aanwezig = overlay-variant (mobiel), afwezig = ingebed paneel (desktop).
  onClose?: () => void
}) {
  const [modus, setModus] = React.useState<'desktop' | 'mobiel'>('desktop')

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-background">
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

      <div className="flex flex-1 overflow-y-auto bg-muted/20">
        <div
          className={cn(
            'w-full overflow-x-hidden bg-white',
            modus === 'mobiel' ? 'mx-auto max-w-sm border-x border-border shadow-sm' : ''
          )}
        >
          <PublicWebsiteV2 data={data} />
        </div>
      </div>
    </div>
  )
}
