'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { formatEuro } from '@/lib/bruiloft/format'
import { capFirst } from '@/lib/utils'
import type { BudgetTotalen } from '@/lib/bruiloft/derived'

// Kleuren uit het bestaande rhino/rose-palet (tailwind.config.ts) — geen
// ad-hoc hex-codes, alleen SVG-fills kunnen geen Tailwind-klassen gebruiken.
const KLEUREN = [
  '#ad5173', '#396990', '#c46f8a', '#2f5475', '#d795a9',
  '#6fa0c4', '#913f5f', '#4b83ac', '#7a3754', '#a0c0d9', '#69324b',
]

interface BudgetDonutChartProps {
  perCategorie: BudgetTotalen['perCategorie']
}

export function BudgetDonutChart({ perCategorie }: BudgetDonutChartProps) {
  const data = perCategorie
    .map((c) => ({ naam: capFirst(c.categorie), waarde: c.geschat > 0 ? c.geschat : c.geoffreerd }))
    .filter((d) => d.waarde > 0)

  if (data.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Nog geen bedragen om te verdelen.</p>
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="waarde" nameKey="naam" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
            {data.map((d, i) => (
              <Cell key={d.naam} fill={KLEUREN[i % KLEUREN.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => formatEuro(Number(value))} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
