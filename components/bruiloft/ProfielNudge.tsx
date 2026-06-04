'use client'

import * as React from 'react'
import { Sparkles, X } from 'lucide-react'

import { Button } from '@/components/bruiloft/ui'
import { ontbrekendeProfielvelden } from '@/lib/bruiloft/profiel'
import { useBruiloftStore } from '@/store/bruiloftStore'

// "Later herinneren": na wegklikken blijft de nudge enkele dagen weg, daarna
// verschijnt hij weer zolang er nog gegevens ontbreken.
const DISMISS_MS = 3 * 24 * 60 * 60 * 1000

function dismissKey(id: string) {
  return `profiel-nudge-dismissed:${id}`
}

// Zwevend kaartje rechtsonder dat ontbrekende essentiële profielgegevens
// uitvraagt (namen, trouwdatum, trouwlocatie, woonplaats). App-breed gemount
// in WeddingShell, dus alleen zichtbaar wanneer er al een bruiloft is.
export function ProfielNudge() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const settingsOpen = useBruiloftStore((s) => s.weddingSettingsOpen)
  const openWeddingSettings = useBruiloftStore((s) => s.openWeddingSettings)
  const [visible, setVisible] = React.useState(false)

  const ontbreekt = React.useMemo(
    () => (wedding ? ontbrekendeProfielvelden(wedding) : []),
    [wedding]
  )

  // Pas na mount evalueren (localStorage is client-only) — voorkomt mismatch.
  React.useEffect(() => {
    if (!wedding || ontbreekt.length === 0) {
      setVisible(false)
      return
    }
    let recentlyDismissed = false
    try {
      const raw = localStorage.getItem(dismissKey(wedding.id))
      if (raw) recentlyDismissed = Date.now() - Number(raw) < DISMISS_MS
    } catch {
      // localStorage niet beschikbaar; gewoon tonen.
    }
    setVisible(!recentlyDismissed)
  }, [wedding, ontbreekt])

  if (!wedding || !visible || ontbreekt.length === 0 || settingsOpen) return null

  const weddingId = wedding.id

  function later() {
    try {
      localStorage.setItem(dismissKey(weddingId), String(Date.now()))
    } catch {
      // negeren
    }
    setVisible(false)
  }

  function aanvullen() {
    setVisible(false)
    openWeddingSettings()
  }

  return (
    <div className="wedding fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:justify-end sm:px-0">
      <div className="w-full max-w-sm animate-slide-up rounded-xl border border-border bg-white p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Maak je profiel compleet</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              We missen nog: {ontbreekt.map((v) => v.label.toLowerCase()).join(', ')}. Hiermee
              personaliseren we jullie trouwplan.
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={aanvullen}>
                Aanvullen
              </Button>
              <Button size="sm" variant="ghost" onClick={later}>
                Later
              </Button>
            </div>
          </div>
          <button
            type="button"
            onClick={later}
            aria-label="Sluiten"
            className="-mr-1 -mt-1 shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
