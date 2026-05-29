'use client'

import * as React from 'react'
import { AlertTriangle, CalendarClock, CheckCircle2, Heart } from 'lucide-react'

import { Progress } from '@/components/bruiloft/ui'
import { dagenTot } from '@/lib/bruiloft/format'
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
    <div className="mb-6 hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4">
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


function StatTile({
  icon: Icon,
  label,
  value,
  below,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  accent?: string
  below?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <Icon className="h-5 w-5 text-gray-500" />
        <span className="text-2xl font-semibold tabular-nums text-foreground">{value}</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{label}</p>
      {below}
    </div>
  )
}
