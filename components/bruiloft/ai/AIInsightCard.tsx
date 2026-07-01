'use client'

import * as React from 'react'
import { BarChart3, Lightbulb, Sparkles, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { AdviesTekst } from './AdviesTekst'
import { useAIAdvies } from './useAIAdvies'
import type { AIAdvies } from '@/app/api/ai/advice/route'

// Contextuele AI-insight op een modulepagina: toont hooguit één advies — het
// meest urgente dat bij deze sectie hoort — uit de gedeelde advieslaag. Geen
// eigen AI-call, geen skeleton: de kaart verschijnt pas (met een fade) zodra
// er daadwerkelijk een relevant advies is, en verdwijnt na wegklikken overal.

const TYPE_CONFIG: Record<AIAdvies['type'], { label: string; icon: typeof Sparkles; tone: string }> = {
  actie: { label: 'AI-advies', icon: Sparkles, tone: 'bg-rose-50 text-rose-600' },
  benchmark: { label: 'Benchmark', icon: BarChart3, tone: 'bg-rhino-50 text-rhino-700' },
  tip: { label: 'AI-tip', icon: Lightbulb, tone: 'bg-amber-50 text-amber-600' },
}

const URGENTIE_CHIP: Record<AIAdvies['urgentie'], string | null> = {
  kritiek: 'bg-rose-100 text-rose-700',
  binnenkort: 'bg-amber-100 text-amber-700',
  normaal: null,
}

const URGENTIE_LABEL: Record<AIAdvies['urgentie'], string> = {
  kritiek: 'Dringend',
  binnenkort: 'Binnenkort',
  normaal: '',
}

interface AIInsightCardProps {
  /** Sectiepad van de huidige pagina, bijv. '/bruiloft/budget'. */
  sectie: string
  className?: string
}

export function AIInsightCard({ sectie, className }: AIInsightCardProps) {
  const { zichtbaar, loading, klikWegSectie } = useAIAdvies()

  // `zichtbaar` is al op urgentie gesorteerd; pak het eerste advies voor deze sectie.
  const item = React.useMemo(
    () => zichtbaar.find((a) => a.sectie === sectie) ?? null,
    [zichtbaar, sectie]
  )

  if (loading || !item) return null

  const { label, icon: Icon, tone } = TYPE_CONFIG[item.type]
  const urgentieChip = URGENTIE_CHIP[item.urgentie]

  return (
    <div
      className={cn(
        'mb-6 flex items-start gap-3.5 rounded-xl border border-border bg-card p-4 shadow-xs animate-fade-in',
        className
      )}
    >
      <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full', tone)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </span>
          {urgentieChip ? (
            <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', urgentieChip)}>
              {URGENTIE_LABEL[item.urgentie]}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm font-medium text-foreground">{item.titel}</p>
        <AdviesTekst tekst={item.omschrijving} className="mt-0.5 text-sm leading-relaxed text-muted-foreground" />
      </div>
      <button
        type="button"
        onClick={() => klikWegSectie(item.sectie)}
        aria-label="Advies wegklikken"
        className="-m-1 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
