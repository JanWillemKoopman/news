'use client'

import * as React from 'react'
import Link from 'next/link'
import { ChevronRight, Sparkles } from 'lucide-react'

import { canEdit } from '@/lib/bruiloft/permissions'
import { dagenTot } from '@/lib/bruiloft/format'
import { trackEvent } from '@/lib/analytics'
import type { NextStep } from '@/lib/bruiloft/guidance'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { Button, Card, CardContent, LoadingDots } from '@/components/bruiloft/ui'
import { AdviesTekst } from '@/components/bruiloft/ai/AdviesTekst'
import { AdviesFeedback } from '@/components/bruiloft/ai/AdviesFeedback'
import { geledenLabel, useAIAdvies } from '@/components/bruiloft/ai/useAIAdvies'
import type { AIAdvies } from '@/app/api/ai/advice/route'

interface AIAdviesPanelProps {
  fallbackSteps: NextStep[]
  trouwdatum: string
}

const URGENTIE_STIJL: Record<AIAdvies['urgentie'], string> = {
  kritiek: 'bg-rose-100 text-rose-700',
  binnenkort: 'bg-muted text-muted-foreground',
  normaal: 'bg-muted text-muted-foreground',
}

const URGENTIE_LABEL: Record<AIAdvies['urgentie'], string> = {
  kritiek: 'Dringend',
  binnenkort: 'Binnenkort',
  normaal: 'Plannen',
}

// Leveranciers-advies leidt naar de ontdek-pagina met concrete, gerangschikte
// opties in plaats van de (mogelijk lege) eigen lijst (#1).
function adviesBestemming(sectie: string): string {
  return sectie === '/bruiloft/leveranciers' ? '/bruiloft/ontdekken' : sectie
}

export function AIAdviesPanel({ fallbackSteps, trouwdatum }: AIAdviesPanelProps) {
  const updateTask = useBruiloftStore((s) => s.updateTask)
  const permissions = useBruiloftStore((s) => s.permissions)
  const openAICoach = useBruiloftStore((s) => s.openAICoach)
  const mayEditTaken = canEdit(permissions, 'taken')
  const [bezig, setBezig] = React.useState<string | null>(null)

  // Gedeelde advieslaag: zelfde data als de insight-kaarten en de AI-coach,
  // dus geen extra AI-calls. Weggeklikte adviezen blijven ook hier verborgen.
  const { advies, zichtbaar, loading, error, updatedAt } = useAIAdvies()

  const dagen = dagenTot(trouwdatum)
  const allesWeggeklikt = !loading && (advies?.length ?? 0) > 0 && zichtbaar.length === 0

  // Meet één keer per mount dat er advies getoond is, als denominator voor de
  // doorklik-/feedbackcijfers (#30).
  const getoondGemeten = React.useRef(false)
  React.useEffect(() => {
    if (getoondGemeten.current || loading || zichtbaar.length === 0) return
    getoondGemeten.current = true
    trackEvent('ai_advies_getoond', { aantal: zichtbaar.length })
  }, [loading, zichtbaar.length])

  async function afrondenFallback(taskId: string) {
    if (bezig) return
    setBezig(taskId)
    try {
      await updateTask(taskId, { status: 'klaar' })
    } finally {
      setBezig(null)
    }
  }

  return (
    <Card className="border-rhino-100">
      <CardContent className="p-6">
        <div className="mb-5 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-foreground" />
          <h2 className="text-2xl font-medium text-foreground">Advies om nu te doen</h2>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <span className="text-sm text-muted-foreground">AI vergelijkt jullie planning met de Nederlandse trouwbenchmarks…</span>
            <LoadingDots />
          </div>
        ) : zichtbaar.length > 0 ? (
          <>
          <ul className="divide-y divide-border">
            {zichtbaar.slice(0, 3).map((stap) => (
              <li key={stap.id} className="py-4 first:pt-0 last:pb-0">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${URGENTIE_STIJL[stap.urgentie]}`}
                    >
                      {URGENTIE_LABEL[stap.urgentie]}
                    </span>
                    <span className="text-xs text-muted-foreground">{stap.sectionLabel}</span>
                  </div>
                  <Link
                    href={adviesBestemming(stap.sectie)}
                    onClick={() =>
                      trackEvent('ai_advies_klik', {
                        bron: 'dashboard',
                        type: stap.type,
                        sectie: stap.sectie,
                      })
                    }
                    className="inline-flex items-center gap-1 text-sm font-medium text-rose-600 hover:text-rose-700"
                  >
                    Naar {stap.sectionLabel.toLowerCase()}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
                <p className="font-medium text-foreground">{stap.titel}</p>
                <AdviesTekst tekst={stap.omschrijving} className="mt-0.5 text-sm text-muted-foreground" />
                <div className="mt-2 flex justify-end">
                  <AdviesFeedback advies={stap} />
                </div>
              </li>
            ))}
          </ul>
          {zichtbaar.length > 3 ? (
            <button
              type="button"
              onClick={openAICoach}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Bekijk alle adviezen ({zichtbaar.length})
            </button>
          ) : null}
          <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
            <Sparkles className="mr-1 inline h-3 w-3 align-[-1px]" />
            AI-advies · bijgewerkt {geledenLabel(updatedAt)} · controleer belangrijke keuzes altijd zelf.
          </p>
          </>
        ) : allesWeggeklikt ? (
          <p className="py-4 text-sm text-muted-foreground">
            Jullie hebben alle adviezen bekeken en weggeklikt. Ververs voor een frisse analyse.
          </p>
        ) : (
          // Fallback naar rule-based guidance als AI niet beschikbaar is
          <>
            {error && (
              <p className="mb-3 text-xs text-muted-foreground">
                AI-advies tijdelijk niet beschikbaar — onderstaande suggesties zijn automatisch gegenereerd.
              </p>
            )}
            {fallbackSteps.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                {dagen < 0
                  ? 'Gefeliciteerd met jullie huwelijk! Nog een paar dingen om af te ronden.'
                  : 'Jullie liggen op koers — niets dringends nu.'}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {fallbackSteps.slice(0, 3).map((stap) => (
                  <li key={stap.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            stap.urgentie === 'kritiek'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {stap.urgentie === 'kritiek'
                            ? 'Dringend'
                            : stap.urgentie === 'binnenkort'
                              ? 'Binnenkort'
                              : 'Plannen'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {stap.bron === 'taak' && mayEditTaken && stap.taskId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => afrondenFallback(stap.taskId!)}
                            disabled={bezig === stap.taskId}
                            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                          >
                            Afronden
                          </Button>
                        )}
                        <Link
                          href={stap.href}
                          className="inline-flex items-center gap-1 text-sm font-medium text-rose-600 hover:text-rose-700"
                        >
                          Naar {stap.href.split('/').pop()}
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                    <p className="font-medium text-foreground">{stap.titel}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{stap.omschrijving}</p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
