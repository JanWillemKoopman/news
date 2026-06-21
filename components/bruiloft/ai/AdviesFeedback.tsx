'use client'

import * as React from 'react'
import { ThumbsDown, ThumbsUp } from 'lucide-react'

import { cn } from '@/lib/utils'
import { trackEvent } from '@/lib/analytics'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { adviesKey } from './useAIAdvies'
import type { AIAdvies } from '@/app/api/ai/advice/route'

type Waardering = 'omhoog' | 'omlaag'

// Onthoud de keuze lokaal zodat de duim na navigatie/herladen geselecteerd
// blijft. De server is de bron voor analyse (#14/#30); localStorage dient
// puur de directe weergave.
function opslagSleutel(weddingId: string) {
  return `otp:ai-advies-feedback:${weddingId}`
}

function leesFeedback(weddingId: string): Record<string, Waardering> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(opslagSleutel(weddingId))
    return raw ? (JSON.parse(raw) as Record<string, Waardering>) : {}
  } catch {
    return {}
  }
}

function schrijfFeedback(weddingId: string, map: Record<string, Waardering>) {
  try {
    window.localStorage.setItem(opslagSleutel(weddingId), JSON.stringify(map))
  } catch {
    // negeren — geen blokkade voor de gebruiker
  }
}

// Kleine duim omhoog/omlaag onder een advies. Frictieloos: één klik, geen
// dialoog. Klik op de actieve duim heft de stem op.
export function AdviesFeedback({ advies }: { advies: AIAdvies }) {
  const weddingId = useBruiloftStore((s) => s.wedding?.id ?? null)
  const sleutel = adviesKey(advies)
  const [keuze, setKeuze] = React.useState<Waardering | null>(null)

  React.useEffect(() => {
    if (!weddingId) return
    setKeuze(leesFeedback(weddingId)[sleutel] ?? null)
  }, [weddingId, sleutel])

  const stem = (waardering: Waardering) => {
    if (!weddingId) return
    const nieuw = keuze === waardering ? null : waardering
    setKeuze(nieuw)

    const map = leesFeedback(weddingId)
    if (nieuw) map[sleutel] = nieuw
    else delete map[sleutel]
    schrijfFeedback(weddingId, map)

    // Niet versturen bij het intrekken van een stem; alleen positieve keuzes
    // vastleggen houdt de data schoon en de aanroep simpel.
    if (!nieuw) return

    trackEvent('ai_advies_feedback', {
      waardering: nieuw,
      type: advies.type,
      sectie: advies.sectie,
    })
    void fetch('/api/ai/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weddingId,
        adviesKey: sleutel,
        adviesTitel: advies.titel,
        adviesType: advies.type,
        sectie: advies.sectie,
        waardering: nieuw,
      }),
    }).catch(() => {})
  }

  return (
    <div className="flex items-center gap-1.5" aria-label="Was dit advies nuttig?">
      <span className="text-xs text-muted-foreground">Nuttig?</span>
      <button
        type="button"
        onClick={() => stem('omhoog')}
        aria-pressed={keuze === 'omhoog'}
        aria-label="Dit advies was nuttig"
        className={cn(
          'rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
          keuze === 'omhoog' && 'bg-emerald-50 text-emerald-600 hover:text-emerald-600'
        )}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => stem('omlaag')}
        aria-pressed={keuze === 'omlaag'}
        aria-label="Dit advies was niet nuttig"
        className={cn(
          'rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
          keuze === 'omlaag' && 'bg-rose-50 text-rose-600 hover:text-rose-600'
        )}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
