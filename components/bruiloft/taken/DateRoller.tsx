'use client'

import * as React from 'react'

const MAANDEN = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December',
]

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function parseISO(iso: string): { year: number; month: number; day: number } {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number)
    return { year: y, month: m, day: d }
  }
  const t = new Date()
  return { year: t.getFullYear(), month: t.getMonth() + 1, day: t.getDate() }
}

interface DateRollerProps {
  value: string
  onChange: (v: string) => void
}

const sel =
  'h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 cursor-pointer'

export function DateRoller({ value, onChange }: DateRollerProps) {
  const today = new Date()
  const START_YEAR = today.getFullYear() - 1
  const END_YEAR = today.getFullYear() + 10

  const { year, month, day } = parseISO(value || todayISO())
  const maxDays = daysInMonth(year, month)
  const clampedDay = Math.min(day, maxDays)

  const update = (y: number, m: number, d: number) => {
    const max = daysInMonth(y, m)
    const safeDay = Math.min(d, max)
    onChange(`${y}-${String(m).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`)
  }

  return (
    <div className="flex gap-2">
      <select
        value={clampedDay}
        onChange={(e) => update(year, month, Number(e.target.value))}
        className={`w-16 ${sel}`}
        aria-label="Dag"
      >
        {Array.from({ length: maxDays }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>{String(d).padStart(2, '0')}</option>
        ))}
      </select>

      <select
        value={month}
        onChange={(e) => update(year, Number(e.target.value), clampedDay)}
        className={`flex-1 ${sel}`}
        aria-label="Maand"
      >
        {MAANDEN.map((naam, i) => (
          <option key={i + 1} value={i + 1}>{naam}</option>
        ))}
      </select>

      <select
        value={year}
        onChange={(e) => update(Number(e.target.value), month, clampedDay)}
        className={`w-20 ${sel}`}
        aria-label="Jaar"
      >
        {Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => START_YEAR + i).map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  )
}
