'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowRight, Gauge } from 'lucide-react'

import { cn } from '@/lib/utils'
import { trackEvent } from '@/lib/analytics'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { Card, CardContent } from '@/components/bruiloft/ui'
import type { AIGlobaleStatus, AIWeddingPlannerResponse } from '@/app/api/ai/wedding-planner/route'

// Compacte "hoe liggen we ervoor"-kaart op het dashboard (#4). Hergebruikt het
// (server-side gecachte) wedding-planner-endpoint, zodat de score die op de
// volledige AI-planner staat ook meteen op de startpagina zichtbaar is — met
// een directe ingang naar de uitgebreide analyse.

const STATUS_CONFIG: Record<
  AIGlobaleStatus['status'],
  { label: string; balk: string; tekst: string }
> = {
  op_schema: { label: 'Op schema', balk: 'bg-emerald-500', tekst: 'text-emerald-700' },
  actie_vereist: { label: 'Aandacht nodig', balk: 'bg-amber-500', tekst: 'text-amber-700' },
  kritiek: { label: 'Vraagt actie', balk: 'bg-rose-500', tekst: 'text-rose-700' },
}

export function PlanningScoreKaart() {
  const weddingId = useBruiloftStore((s) => s.wedding?.id ?? null)
  const [globaal, setGlobaal] = React.useState<AIGlobaleStatus | null>(null)

  React.useEffect(() => {
    if (!weddingId) return
    let actief = true
    fetch('/api/ai/wedding-planner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weddingId }),
    })
      .then((res) => (res.ok ? (res.json() as Promise<AIWeddingPlannerResponse>) : null))
      .then((data) => {
        if (actief && data?.advies?.globaal) setGlobaal(data.advies.globaal)
      })
      .catch(() => {})
    return () => {
      actief = false
    }
  }, [weddingId])

  if (!globaal) return null

  const cfg = STATUS_CONFIG[globaal.status] ?? STATUS_CONFIG.actie_vereist
  const score = Math.max(0, Math.min(100, Math.round(globaal.score)))

  return (
    <Link
      href="/bruiloft/ai-wedding-planner"
      onClick={() => trackEvent('ai_score_klik', { score, status: globaal.status })}
      className="mb-4 block focus-visible:outline-none"
    >
      <Card className="transition-colors hover:border-primary/50">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
            <Gauge className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-semibold text-foreground">{score}</span>
              <span className="text-sm text-muted-foreground">/ 100</span>
              <span className={cn('ml-1 text-sm font-medium', cfg.tekst)}>· {cfg.label}</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className={cn('h-full rounded-full transition-all', cfg.balk)} style={{ width: `${score}%` }} />
            </div>
            <p className="mt-2 line-clamp-1 text-sm text-muted-foreground">{globaal.samenvatting}</p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  )
}
