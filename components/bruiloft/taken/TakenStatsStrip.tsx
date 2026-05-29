'use client'

import * as React from 'react'
import { AlertTriangle, CalendarClock, CheckCircle2, Heart } from 'lucide-react'

import { Progress } from '@/components/bruiloft/ui'
import { dagenTot } from '@/lib/bruiloft/format'
import { cn } from '@/lib/utils'
import type { Task, Wedding } from '@/lib/bruiloft/types'

import { berekenTaakStats } from '@/lib/bruiloft/taken/stats'

interface TakenStatsStripProps {
  tasks: Task[]
  wedding: Wedding
}

export function TakenStatsStrip({ tasks, wedding }: TakenStatsStripProps) {
  const stats = berekenTaakStats(tasks)
  const dagenTotTrouw = wedding.trouwdatum ? Math.max(0, dagenTot(wedding.trouwdatum)) : null

  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        icon={Heart}
        label="Tot de trouwdag"
        value={dagenTotTrouw != null ? `${dagenTotTrouw} dgn` : '—'}
        accent="rose"
      />
      <StatTile
        icon={CheckCircle2}
        label={`${stats.klaar} van ${stats.totaal} afgerond`}
        value={`${stats.pctKlaar}%`}
        accent="emerald"
        below={<Progress value={stats.pctKlaar} className="mt-2" />}
      />
      <StatTile
        icon={CalendarClock}
        label="Uiterlijke datum deze maand"
        value={String(stats.dezeMaand)}
        accent="amber"
      />
      <StatTile
        icon={AlertTriangle}
        label="Achterstallig"
        value={String(stats.achterstallig)}
        accent={stats.achterstallig > 0 ? 'rose-strong' : 'muted'}
      />
    </div>
  )
}

const ACCENTS = {
  rose: 'bg-rose-50 text-rose-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-700',
  'rose-strong': 'bg-rose-100 text-rose-700',
  muted: 'bg-secondary text-muted-foreground',
} as const

function StatTile({
  icon: Icon,
  label,
  value,
  accent,
  below,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  accent: keyof typeof ACCENTS
  below?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <div className="flex items-center justify-between">
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full',
            ACCENTS[accent]
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <span className="font-serif text-2xl text-foreground">{value}</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{label}</p>
      {below}
    </div>
  )
}
