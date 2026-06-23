'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowRight, BarChart3, ChevronRight, Lightbulb, RefreshCw, Sparkles, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { trackEvent } from '@/lib/analytics'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { Button, useToast } from '@/components/bruiloft/ui'
import { geledenLabel, useAIAdvies } from './useAIAdvies'
import { AdviesFeedback } from './AdviesFeedback'
import type { AIAdvies } from '@/app/api/ai/advice/route'

// AI-coach: app-breed paneel, geopend via de "AI-assistent"-knop in de
// topbalk (zie TopNav) of via de moment-nudge. Op desktop een zijpaneel
// rechts, op mobiel een bottom sheet. Toont alle (niet-weggeklikte) adviezen
// uit de gedeelde advieslaag — geen extra AI-calls. Bewust géén eigen
// zwevende knop: de trigger zit in de chrome van de app zodat er niets over
// de content heen zweeft.

const TYPE_ICON: Record<AIAdvies['type'], typeof Sparkles> = {
  actie: Sparkles,
  benchmark: BarChart3,
  tip: Lightbulb,
}

const URGENTIE_STIJL: Record<AIAdvies['urgentie'], string> = {
  kritiek: 'bg-rose-100 text-rose-700',
  binnenkort: 'bg-amber-100 text-amber-700',
  normaal: 'bg-muted text-muted-foreground',
}

const URGENTIE_LABEL: Record<AIAdvies['urgentie'], string> = {
  kritiek: 'Dringend',
  binnenkort: 'Binnenkort',
  normaal: 'Plannen',
}

// Leveranciers-advies leidt naar de ontdek-pagina met concrete matches (#1).
function adviesBestemming(sectie: string): string {
  return sectie === '/bruiloft/leveranciers' ? '/bruiloft/ontdekken' : sectie
}

// Eén nudge per paginasessie, app-breed — meer wordt opdringerig.
let nudgeAlGetoond = false

export function AICoach() {
  const open = useBruiloftStore((s) => s.aiCoachOpen)
  const openAICoach = useBruiloftStore((s) => s.openAICoach)
  const closeAICoach = useBruiloftStore((s) => s.closeAICoach)
  const { zichtbaar, loading, updatedAt, refresh, klikWeg } = useAIAdvies()
  const { toast } = useToast()

  // Scroll-lock + Escape zolang het paneel open is.
  React.useEffect(() => {
    if (!open) return
    const vorige = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAICoach()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = vorige
      window.removeEventListener('keydown', onKey)
    }
  }, [open, closeAICoach])

  // Moment-nudge: als er tijdens deze sessie een taak wordt afgerond en er
  // nog adviezen klaarstaan, wijs daar één keer subtiel op via een toast.
  const klaarAantal = useBruiloftStore(
    (s) => s.tasks.filter((t) => t.status === 'klaar').length
  )
  const vorigKlaarAantal = React.useRef<number | null>(null)
  React.useEffect(() => {
    const vorig = vorigKlaarAantal.current
    vorigKlaarAantal.current = klaarAantal
    if (vorig === null || klaarAantal <= vorig) return
    if (nudgeAlGetoond || open) return
    const volgende = zichtbaar[0]
    if (!volgende) return
    nudgeAlGetoond = true
    toast({
      title: 'Mooi bezig! Taak afgerond.',
      description: `Volgende suggestie van de AI-coach: ${volgende.titel}`,
      action: { label: 'Bekijk advies', onClick: openAICoach },
    })
  }, [klaarAantal, open, zichtbaar, toast, openAICoach])

  return (
    <>
      {open ? (
        <div className="wedding fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-rhino-950/30 animate-overlay-in"
            onClick={closeAICoach}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="AI-coach"
            className={cn(
              'absolute flex flex-col bg-card text-card-foreground shadow-xl',
              // Mobiel: bottom sheet
              'max-md:inset-x-0 max-md:bottom-0 max-md:max-h-[85dvh] max-md:rounded-t-2xl max-md:animate-sheet-in',
              // Desktop: zijpaneel rechts
              'md:inset-y-0 md:right-0 md:w-[400px] md:border-l md:border-border md:animate-drawer-in'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rhino-800 text-white">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-base font-semibold leading-tight text-foreground">AI-coach</h2>
                  {updatedAt ? (
                    <p className="text-xs text-muted-foreground">Bijgewerkt {geledenLabel(updatedAt)}</p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!loading ? (
                  <button
                    type="button"
                    onClick={refresh}
                    aria-label="Advies verversen"
                    className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={closeAICoach}
                  aria-label="AI-coach sluiten"
                  className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Advieslijst */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {loading ? (
                <div className="flex flex-col items-center gap-4 py-10">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 animate-pulse text-rose-400" />
                    <span className="text-sm text-muted-foreground">AI bekijkt jullie planning en het passende leveranciersaanbod…</span>
                  </div>
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-rose-300 [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-rose-400 [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-rose-500" />
                  </div>
                </div>
              ) : zichtbaar.length > 0 ? (
                <ul className="space-y-3">
                  {zichtbaar.map((stap, i) => {
                    const TypeIcon = TYPE_ICON[stap.type]
                    return (
                      <li
                        key={stap.id}
                        className="animate-slide-up rounded-xl border border-border p-4"
                        style={{ animationDelay: `${i * 70}ms`, animationFillMode: 'both' }}
                      >
                        <div className="mb-1.5 flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                                URGENTIE_STIJL[stap.urgentie]
                              )}
                            >
                              {URGENTIE_LABEL[stap.urgentie]}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <TypeIcon className="h-3 w-3" />
                              {stap.sectionLabel}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => klikWeg(stap)}
                            aria-label="Advies wegklikken"
                            className="-m-1 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="text-sm font-medium text-foreground">{stap.titel}</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                          {stap.omschrijving}
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <Link
                            href={adviesBestemming(stap.sectie)}
                            onClick={() => {
                              trackEvent('ai_advies_klik', {
                                bron: 'coach',
                                type: stap.type,
                                sectie: stap.sectie,
                              })
                              closeAICoach()
                            }}
                            className="inline-flex items-center gap-1 text-sm font-medium text-rose-600 hover:text-rose-700"
                          >
                            Bekijken
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                          <AdviesFeedback advies={stap} />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <div className="py-10 text-center">
                  <Sparkles className="mx-auto h-6 w-6 text-rose-300" />
                  <p className="mt-3 text-sm font-medium text-foreground">Jullie zijn helemaal bij</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Geen nieuwe adviezen op dit moment. Ververs voor een frisse analyse.
                  </p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={refresh}>
                    <RefreshCw className="h-3.5 w-3.5" />
                    Verversen
                  </Button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <Link
                href="/bruiloft/ai-wedding-planner"
                onClick={closeAICoach}
                className="flex items-center justify-between rounded-lg bg-rhino-800 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-rhino-700"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0" />
                  Volledige AI-analyse per onderdeel
                </span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
              <p className="mt-3 text-xs text-muted-foreground">
                <Sparkles className="mr-1 inline h-3 w-3 align-[-1px]" />
                AI-advies — controleer belangrijke keuzes altijd zelf.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
