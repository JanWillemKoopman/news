'use client'

import * as React from 'react'
import { Plus, Sparkles, X } from 'lucide-react'

import { dagenTot, formatDatumNL } from '@/lib/bruiloft/format'
import { effectievePrioriteit } from '@/lib/bruiloft/taken/stats'
import { cn } from '@/lib/utils'
import type { AITaakSuggestie } from '@/app/api/ai/taken/route'

const PRIORITEIT_DOT: Record<string, string> = {
  hoog: 'bg-rose-500',
  midden: 'bg-amber-400',
  laag: 'bg-slate-300',
}

const PRIORITEIT_LABEL: Record<string, string> = {
  hoog: 'Hoog',
  midden: 'Midden',
  laag: 'Laag',
}

interface AIInlineSuggestieCardProps {
  suggestie: AITaakSuggestie
  onToevoegen: (s: AITaakSuggestie) => Promise<void>
  onDismiss: (titel: string) => void
}

export function AIInlineSuggestieCard({
  suggestie,
  onToevoegen,
  onDismiss,
}: AIInlineSuggestieCardProps) {
  const [loading, setLoading] = React.useState(false)

  const d = dagenTot(suggestie.deadline)
  const prioriteit = effectievePrioriteit({
    prioriteit: suggestie.prioriteit,
    deadline: suggestie.deadline,
    status: 'open',
  })
  const datumLabel = formatDatumNL(suggestie.deadline)
  const dagenLabel =
    d === 0
      ? 'vandaag'
      : d > 0
        ? `over ${d} ${d === 1 ? 'dag' : 'dagen'}`
        : `${Math.abs(d)} ${Math.abs(d) === 1 ? 'dag' : 'dagen'} geleden`

  const handleToevoegen = async () => {
    setLoading(true)
    try {
      await onToevoegen(suggestie)
      onDismiss(suggestie.titel)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative rounded-lg border border-rose-200 bg-rose-50/60 overflow-hidden">
      <div className="absolute inset-y-0 left-0 w-1 bg-rose-400" />
      <div className="px-4 py-3 pl-5">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-rose-600">
            <Sparkles className="h-3 w-3" />
            Aanbevolen door de AI-assistent
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleToevoegen}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Toevoegen
            </button>
            <button
              type="button"
              onClick={() => onDismiss(suggestie.titel)}
              aria-label="Suggestie verwijderen"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-rose-100 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <h3 className="mt-2 font-semibold text-foreground">{suggestie.titel}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{suggestie.omschrijving}</p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>{datumLabel}</span>
          <span>·</span>
          <span>{dagenLabel}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <span className={cn('h-2 w-2 rounded-full', PRIORITEIT_DOT[prioriteit])} />
            {PRIORITEIT_LABEL[prioriteit]}
          </span>
        </div>
      </div>
    </div>
  )
}
