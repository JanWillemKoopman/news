'use client'

import { draaiboekStats } from '@/lib/bruiloft/derived'
import type { ScheduleItem } from '@/lib/bruiloft/types'

interface DraaiboekStatsSidebarProps {
  items: ScheduleItem[]
  minPauze: number
}

export function DraaiboekStatsSidebar({ items, minPauze }: DraaiboekStatsSidebarProps) {
  const s = draaiboekStats(items, minPauze)

  const uren = Math.floor(s.geplandMinuten / 60)
  const min = s.geplandMinuten % 60
  const geplandLabel = s.geplandMinuten === 0
    ? 'Nog geen eindtijden'
    : uren > 0
      ? min > 0 ? `${uren}u ${min}min` : `${uren}u`
      : `${min}min`

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Dagindeling</p>
      <div className="space-y-2">
        <StatRij label="Onderdelen" waarde={String(s.totaalItems)} />
        <StatRij label="Gepland" waarde={geplandLabel} />
        <StatRij label="Pauzes" waarde={String(s.aantalGaten)} />
        <StatRij
          label="Overlaps"
          waarde={String(s.aantalOverlaps)}
          danger={s.aantalOverlaps > 0}
        />
      </div>
    </div>
  )
}

function StatRij({ label, waarde, danger }: { label: string; waarde: string; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${danger ? 'text-rose-600' : 'text-foreground'}`}>
        {waarde}
      </span>
    </div>
  )
}
