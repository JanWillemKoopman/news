'use client'

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Card, CardContent, Money } from '@/components/bruiloft/ui'
import { CHART_COLORS } from '@/lib/bruiloft/constants'
import { budgetTotalen } from '@/lib/bruiloft/derived'
import { formatEuro } from '@/lib/bruiloft/format'
import type { BudgetItem, Vendor, Wedding } from '@/lib/bruiloft/types'

interface BudgetSummaryProps {
  items: BudgetItem[]
  vendors: Vendor[]
  wedding: Wedding
}

export function BudgetSummary({ items, vendors, wedding }: BudgetSummaryProps) {
  const totalen = budgetTotalen(items, vendors, wedding)

  const categorieData = totalen.perCategorie
    .map((c) => ({
      naam: c.categorie,
      waarde: c.geoffreerd > 0 ? c.geoffreerd : c.geschat,
    }))
    .filter((d) => d.waarde > 0)
    .sort((a, b) => b.waarde - a.waarde)

  const maxCategorie = categorieData.length > 0 ? categorieData[0].waarde : 0

  const barData = [
    { naam: 'Geschat', bedrag: totalen.totaalGeschat },
    { naam: 'Geoffreerd', bedrag: totalen.totaalGeoffreerd },
    { naam: 'Betaald', bedrag: totalen.totaalBetaald },
  ]

  const overBudget = totalen.resterendBudget < 0

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {/* Totalen */}
      <Card className={categorieData.length === 0 ? 'sm:col-span-2 lg:col-span-3' : 'sm:col-span-2 lg:col-span-1'}>
        <CardContent className="grid grid-cols-2 gap-4 p-6">
          <Tegel label="Totaalbudget" bedrag={wedding.totaalBudget} />
          <Tegel label="Geschat" bedrag={totalen.totaalGeschat} />
          <Tegel label="Betaald" bedrag={totalen.totaalBetaald} />
          <Tegel
            label="Resterend"
            bedrag={totalen.resterendBudget}
            toon={overBudget ? 'rood' : 'groen'}
          />
        </CardContent>
      </Card>

      {/* Verdeling per categorie — horizontale balken, verborgen zolang er geen bedragen zijn */}
      {categorieData.length > 0 ? (
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <h3 className="mb-4 text-lg text-foreground">Verdeling per categorie</h3>
            <ul className="space-y-3">
              {categorieData.map((d, i) => {
                const pct = maxCategorie > 0 ? (d.waarde / maxCategorie) * 100 : 0
                return (
                  <li key={d.naam} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 truncate text-sm capitalize text-foreground sm:w-28">
                      {d.naam}
                    </span>
                    <div className="flex flex-1 items-center gap-2">
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(pct, 2)}%`,
                            backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                          }}
                        />
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {formatEuro(d.waarde)}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {/* Vergelijking geschat/geoffreerd/betaald — verborgen zolang er geen items zijn */}
      {totalen.totaalGeschat > 0 || totalen.totaalBetaald > 0 ? (
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <h3 className="mb-2 text-lg text-foreground">Geschat vs. betaald</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <XAxis
                  dataKey="naam"
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--accent))', opacity: 0.4 }}
                  formatter={(value: number) => [formatEuro(value), 'Bedrag']}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--card))',
                    color: 'hsl(var(--card-foreground))',
                  }}
                />
                <Bar dataKey="bedrag" radius={[8, 8, 0, 0]}>
                  {barData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function Tegel({
  label,
  bedrag,
  toon,
}: {
  label: string
  bedrag: number
  toon?: 'groen' | 'rood'
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={
          'mt-1 text-lg font-semibold ' +
          (toon === 'rood'
            ? 'text-rose-600 dark:text-rose-400'
            : toon === 'groen'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-foreground')
        }
      >
        <Money bedrag={bedrag} />
      </p>
    </div>
  )
}
