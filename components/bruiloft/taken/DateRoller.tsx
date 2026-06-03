'use client'

import * as React from 'react'

const MAANDEN = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']
const ITEM_H = 44

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

function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

interface ColumnProps {
  items: string[]
  selectedIndex: number
  onSelect: (i: number) => void
}

function Column({ items, selectedIndex, onSelect }: ColumnProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const programmatic = React.useRef(false)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    programmatic.current = true
    el.scrollTo({ top: selectedIndex * ITEM_H, behavior: 'smooth' })
    const t = setTimeout(() => { programmatic.current = false }, 400)
    return () => clearTimeout(t)
  }, [selectedIndex])

  const handleScroll = () => {
    if (programmatic.current) return
    const el = ref.current
    if (!el) return
    const i = Math.round(el.scrollTop / ITEM_H)
    const clamped = Math.max(0, Math.min(items.length - 1, i))
    if (clamped !== selectedIndex) onSelect(clamped)
  }

  return (
    <div className="relative flex-1 overflow-hidden select-none">
      {/* Gradient fades */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[88px] bg-gradient-to-b from-white via-white/80 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[88px] bg-gradient-to-t from-white via-white/80 to-transparent" />
      {/* Selection band */}
      <div
        className="pointer-events-none absolute inset-x-0 z-10 border-y border-border bg-gray-50/60"
        style={{ top: '50%', height: ITEM_H, transform: 'translateY(-50%)' }}
      />
      <div
        ref={ref}
        onScroll={handleScroll}
        className="overflow-y-scroll overscroll-contain"
        style={{ height: ITEM_H * 5, scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        {/* top padding */}
        <div style={{ height: ITEM_H * 2 }} />
        {items.map((item, i) => (
          <div
            key={i}
            style={{ height: ITEM_H, scrollSnapAlign: 'center' }}
            className={`flex cursor-pointer items-center justify-center text-sm transition-colors ${
              i === selectedIndex
                ? 'font-semibold text-foreground'
                : 'text-muted-foreground'
            }`}
            onClick={() => {
              onSelect(i)
              ref.current?.scrollTo({ top: i * ITEM_H, behavior: 'smooth' })
            }}
          >
            {item}
          </div>
        ))}
        {/* bottom padding */}
        <div style={{ height: ITEM_H * 2 }} />
      </div>
    </div>
  )
}

interface DateRollerProps {
  value: string
  onChange: (v: string) => void
}

export function DateRoller({ value, onChange }: DateRollerProps) {
  const today = new Date()
  const START_YEAR = today.getFullYear() - 1
  const END_YEAR = today.getFullYear() + 10

  const years = Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) =>
    String(START_YEAR + i)
  )
  const months = MAANDEN

  const { year, month, day } = parseISO(value || todayISO())
  const yearIdx = Math.max(0, Math.min(years.length - 1, year - START_YEAR))
  const monthIdx = Math.max(0, Math.min(11, month - 1))

  const maxDays = daysInMonth(year, month)
  const days = Array.from({ length: maxDays }, (_, i) =>
    String(i + 1).padStart(2, '0')
  )
  const dayIdx = Math.max(0, Math.min(maxDays - 1, day - 1))

  const update = (y: number, m: number, d: number) => {
    const max = daysInMonth(y, m)
    onChange(toISO(y, m, Math.min(d, max)))
  }

  return (
    <div
      className="flex overflow-hidden rounded-md border border-input bg-white"
      style={{ height: ITEM_H * 5 }}
    >
      <Column
        items={years}
        selectedIndex={yearIdx}
        onSelect={(i) => update(START_YEAR + i, month, day)}
      />
      <div className="w-px bg-border" />
      <Column
        items={months}
        selectedIndex={monthIdx}
        onSelect={(i) => update(year, i + 1, day)}
      />
      <div className="w-px bg-border" />
      <Column
        items={days}
        selectedIndex={dayIdx}
        onSelect={(i) => update(year, month, i + 1)}
      />
    </div>
  )
}
