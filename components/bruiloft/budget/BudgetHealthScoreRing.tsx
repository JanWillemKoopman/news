'use client'

import { cn } from '@/lib/utils'
import { useCountUp } from '@/lib/bruiloft/useCountUp'
import type { BudgetHealthScore } from '@/lib/bruiloft/derived'

// Grote cirkelindicator voor de Budget Briefing. Bouwt voort op het bestaande
// SVG-cirkelpatroon uit BudgetSummary.tsx, nu met kleurstatus (currentColor
// + Tailwind text-kleur i.p.v. hardcoded hex — geen ad-hoc kleuren) en een
// count-up-animatie bij het laden.

const STATUS_KLEUR: Record<BudgetHealthScore['status'], string> = {
  gezond: 'text-emerald-500',
  aandacht: 'text-amber-500',
  actie_vereist: 'text-rose-500',
  onvoldoende_data: 'text-muted-foreground',
}

interface BudgetHealthScoreRingProps {
  score: number | null
  status: BudgetHealthScore['status']
  size?: 'sm' | 'lg'
  className?: string
}

export function BudgetHealthScoreRing({ score, status, size = 'lg', className }: BudgetHealthScoreRingProps) {
  const dimensie = size === 'lg' ? 96 : 64
  const r = size === 'lg' ? 42 : 26
  const strokeWidth = size === 'lg' ? 7 : 5
  const circumference = 2 * Math.PI * r
  const center = dimensie / 2

  const animatedScore = useCountUp(score ?? 0, 700)
  const pct = score === null ? 0 : Math.max(0, Math.min(100, animatedScore))
  const offset = circumference - (pct / 100) * circumference

  return (
    <svg
      width={dimensie}
      height={dimensie}
      viewBox={`0 0 ${dimensie} ${dimensie}`}
      className={cn('shrink-0 -rotate-90', STATUS_KLEUR[status], className)}
      role="img"
      aria-label={score === null ? 'Budgetgezondheid nog onbekend' : `Budgetgezondheid ${score} van 100`}
    >
      <circle cx={center} cy={center} r={r} fill="none" stroke="currentColor" strokeOpacity={0.14} strokeWidth={strokeWidth} />
      {score !== null ? (
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      ) : null}
      <text
        x={center}
        y={center}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground font-semibold"
        style={{
          transform: 'rotate(90deg)',
          transformOrigin: `${center}px ${center}px`,
          fontSize: size === 'lg' ? 22 : 13,
        }}
      >
        {score === null ? '–' : Math.round(animatedScore)}
      </text>
    </svg>
  )
}
