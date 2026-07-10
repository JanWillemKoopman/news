'use client'

import * as React from 'react'

import { dagenTot } from '@/lib/bruiloft/format'
import { berekenTaakStats } from '@/lib/bruiloft/taken/stats'
import type { Task, Wedding } from '@/lib/bruiloft/types'

interface TakenStatsStripProps {
  tasks: Task[]
  wedding: Wedding
}

function CircularProgress({ pct }: { pct: number }) {
  const r = 22
  const circumference = 2 * Math.PI * r
  const offset = circumference - (pct / 100) * circumference

  return (
    <svg width={56} height={56} className="shrink-0 -rotate-90">
      <circle
        cx={28}
        cy={28}
        r={r}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={4}
      />
      <circle
        cx={28}
        cy={28}
        r={r}
        fill="none"
        stroke="#be123c"
        strokeWidth={4}
        strokeOpacity={0.6}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-500"
      />
      <text
        x={28}
        y={28}
        textAnchor="middle"
        dominantBaseline="central"
        style={{ transform: 'rotate(90deg)', transformOrigin: '28px 28px', fontSize: 11, fontWeight: 500, fill: '#6b7280' }}
      >
        {pct}%
      </text>
    </svg>
  )
}

export function TakenStatsStrip({ tasks, wedding }: TakenStatsStripProps) {
  const stats = berekenTaakStats(tasks)
  const dagenTotTrouw = wedding.trouwdatum ? Math.max(0, dagenTot(wedding.trouwdatum)) : null

  return (
    <div className="mb-6 rounded-xl border border-border bg-card shadow-sm">
      {/* Main progress row */}
      <div className="flex items-center gap-4 p-3">
        <CircularProgress pct={stats.pctKlaar} />

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground">Voortgang</p>
          <p className="text-base font-semibold text-foreground leading-tight">
            {stats.klaar} van {stats.totaal} taken afgerond
          </p>
        </div>

        {/* Desktop-only stat numbers */}
        <div className="hidden sm:flex items-center divide-x divide-border">
          <StatNum value={dagenTotTrouw ?? 0} label="dagen te gaan" />
          <StatNum value={stats.aankomend30Dagen} label="komende 30 dagen" />
          <StatNum
            value={stats.achterstallig}
            label="achterstallig"
            highlight={stats.achterstallig > 0}
          />
        </div>
      </div>

      {/* Mobile-only stat row */}
      <div className="flex sm:hidden border-t border-border divide-x divide-border">
        <StatNumMobile value={dagenTotTrouw ?? 0} label="dagen" />
        <StatNumMobile value={stats.aankomend30Dagen} label="30 dagen" />
        <StatNumMobile
          value={stats.achterstallig}
          label="achterstallig"
          highlight={stats.achterstallig > 0}
        />
      </div>
    </div>
  )
}

function StatNum({
  value,
  label,
  highlight,
}: {
  value: number
  label: string
  highlight?: boolean
}) {
  return (
    <div className="px-5 text-center">
      <p
        className={
          highlight
            ? 'text-xl font-bold tabular-nums text-rose-600'
            : 'text-xl font-bold tabular-nums text-foreground'
        }
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function StatNumMobile({
  value,
  label,
  highlight,
}: {
  value: number
  label: string
  highlight?: boolean
}) {
  return (
    <div className="flex-1 py-2.5 text-center">
      <p
        className={
          highlight
            ? 'text-lg font-bold tabular-nums text-rose-600'
            : 'text-lg font-bold tabular-nums text-foreground'
        }
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
