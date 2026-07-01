'use client'

import { draaiboekStats } from '@/lib/bruiloft/derived'
import type { ScheduleItem } from '@/lib/bruiloft/types'

interface DraaiboekStatsStripProps {
  items: ScheduleItem[]
  minPauze: number
}

export function DraaiboekStatsStrip({ items, minPauze }: DraaiboekStatsStripProps) {
  const s = draaiboekStats(items, minPauze)

  const uren = Math.floor(s.geplandMinuten / 60)
  const min = s.geplandMinuten % 60
  const geplandLabel = s.geplandMinuten === 0
    ? 'Nog geen eindtijden ingevuld'
    : uren > 0
      ? min > 0 ? `${uren}u ${min}min gepland` : `${uren}u gepland`
      : `${min}min gepland`

  const subLabel = [
    s.aantalOverlaps > 0 ? `${s.aantalOverlaps} overlap${s.aantalOverlaps > 1 ? 'pen' : ''}` : null,
    s.aantalGaten > 0 ? `${s.aantalGaten} pauze${s.aantalGaten > 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(' · ')

  return (
    <div className="mb-6 rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-4 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">DAGINDELING</p>
          <p className="text-base font-semibold leading-tight text-foreground">
            {s.totaalItems} {s.totaalItems === 1 ? 'onderdeel' : 'onderdelen'} &middot; {geplandLabel}
          </p>
          {subLabel ? (
            <p className={`mt-0.5 text-xs ${s.aantalOverlaps > 0 ? 'text-rose-600' : 'text-muted-foreground'}`}>
              {subLabel}
            </p>
          ) : null}
        </div>

        <div className="hidden items-center divide-x divide-border sm:flex">
          <StatNum value={s.totaalItems} label="onderdelen" />
          <StatNum value={s.aantalGaten} label="pauzes" />
          <StatNum value={s.aantalOverlaps} label="overlaps" danger={s.aantalOverlaps > 0} />
        </div>
      </div>

      <div className="flex divide-x divide-border border-t border-border sm:hidden">
        <StatNumMobile value={s.totaalItems} label="onderdelen" />
        <StatNumMobile value={s.aantalGaten} label="pauzes" />
        <StatNumMobile value={s.aantalOverlaps} label="overlaps" danger={s.aantalOverlaps > 0} />
      </div>
    </div>
  )
}

function StatNum({ value, label, danger }: { value: number; label: string; danger?: boolean }) {
  return (
    <div className="px-5 text-center">
      <p className={`text-2xl font-bold tabular-nums ${danger ? 'text-rose-600' : 'text-foreground'}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function StatNumMobile({ value, label, danger }: { value: number; label: string; danger?: boolean }) {
  return (
    <div className="flex-1 py-2.5 text-center">
      <p className={`text-lg font-bold tabular-nums ${danger ? 'text-rose-600' : 'text-foreground'}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
