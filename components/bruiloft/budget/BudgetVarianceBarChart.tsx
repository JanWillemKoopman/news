'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { formatEuro } from '@/lib/bruiloft/format'
import { capFirst } from '@/lib/utils'
import type { BudgetTotalen } from '@/lib/bruiloft/derived'

interface BudgetVarianceBarChartProps {
  perCategorie: BudgetTotalen['perCategorie']
}

export function BudgetVarianceBarChart({ perCategorie }: BudgetVarianceBarChartProps) {
  const data = perCategorie
    .filter((c) => c.geschat > 0 || c.geoffreerd > 0)
    .map((c) => ({ naam: capFirst(c.categorie), begroot: c.geschat, werkelijk: c.geoffreerd }))

  if (data.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Nog geen categorieën om te vergelijken.</p>
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="naam" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatEuro(v)} width={70} />
          <Tooltip formatter={(value: number) => formatEuro(Number(value))} />
          <Bar dataKey="begroot" fill="#a0c0d9" radius={[4, 4, 0, 0]} name="Begroot" />
          <Bar dataKey="werkelijk" fill="#ad5173" radius={[4, 4, 0, 0]} name="Werkelijk" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
