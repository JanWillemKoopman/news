'use client'

import * as React from 'react'
import { Sparkles, X } from 'lucide-react'

import { canEdit } from '@/lib/bruiloft/permissions'
import { trackEvent } from '@/lib/analytics'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { Button } from '@/components/bruiloft/ui'
import { useAIPromotiePopup } from './useAIPromotiePopup'

export function AIPromotiePopup() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const permissions = useBruiloftStore((s) => s.permissions)
  const openAICoach = useBruiloftStore((s) => s.openAICoach)

  const { showPopup, changeCount, dismiss, markShown, dismissPermanently } = useAIPromotiePopup(wedding?.id ?? null)

  const trackedRef = React.useRef(false)
  React.useEffect(() => {
    if (showPopup && !trackedRef.current) {
      trackedRef.current = true
      markShown()
      void trackEvent('ai_promotie_getoond', { weddingId: wedding?.id, changeCount })
    }
  }, [showPopup, wedding?.id, changeCount, markShown])

  const weddingAgeDays = wedding
    ? (Date.now() - new Date(wedding.createdAt).getTime()) / 86_400_000
    : 0

  if (!wedding || !showPopup || !canEdit(permissions, 'taken') || weddingAgeDays < 7) return null

  function handleCTA() {
    dismiss()
    openAICoach()
    void trackEvent('ai_promotie_cta_geklikt', { weddingId: wedding!.id, changeCount })
  }

  return (
    <div className="wedding fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:justify-end sm:px-0">
      <div className="w-full max-w-sm animate-slide-up rounded-xl border border-border bg-card p-3 shadow-lg sm:p-4">
        <div className="flex items-start gap-3">
          <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rhino-50 text-rhino-800 sm:flex">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              Wil je weten of jullie op schema liggen?
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              Jullie zijn druk bezig geweest met de planning. De AI-assistent analyseert jullie taken,
              budget en deadline en vertelt wat nu het meest urgent is.
            </p>
            <div className="mt-2.5 flex gap-2 sm:mt-3">
              <Button size="sm" onClick={handleCTA}>
                Bekijk AI-analyse
              </Button>
              <Button size="sm" variant="ghost" onClick={dismiss}>
                Niet nu
              </Button>
            </div>
            <button
              type="button"
              onClick={dismissPermanently}
              className="mt-1.5 text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Niet meer tonen
            </button>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Sluiten"
            className="-mr-1 -mt-1 shrink-0 rounded p-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
