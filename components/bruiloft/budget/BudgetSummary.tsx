'use client'

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Card, CardContent, Money } from '@/components/bruiloft/ui'
import { budgetTotalen } from '@/lib/bruiloft/derived'
import { formatEuro } from '@/lib/bruiloft/format'
import type { BudgetItem, Vendor, Wedding } from '@/lib/bruiloft/types'

// Warme kleurenreeks voor de categorieën.
const KLEUREN = [
  '#CC785C',
  '#D8A48F',
  '#B8743F',
  '#8C6A56',
  '#C9A227',
  '#7A8B6F',
  '#A65A48',
  '#D9B382',
  '#6B8E9E',
  '#9B6A8C',
  '#A8A29E',
]

interface BudgetSummaryProps {
  items: BudgetItem[]
  vendors: Vendor[]
  wedding: Wedding
}

export function BudgetSummary({ items, vendors, wedding }: BudgetSummaryProps) {
  const totalen = budgetTotalen(items, vendors, wedding)

  const donutData = totalen.perCategorie
    .map((c) => ({
      naam: c.categorie,
      waarde: c.geoffreerd > 0 ? c.geoffreerd : c.geschat,
    }))
    .filter((d) => d.waarde > 0)

  const barData = [
    { naam: 'Geschat', bedrag: totalen.totaalGeschat },
    { naam: 'Geoffreerd', bedrag: totalen.totaalGeoffreerd },
    { naam: 'Betaald', bedrag: totalen.totaalBetaald },
  ]

  const overBudget = totalen.resterendBudget < 0

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Totalen */}
      <Card className="lg:col-span-1">
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

      {/* Donut per categorie */}
      <Card className="lg:col-span-1">
        <CardContent className="p-6">
          <h3 className="mb-2 font-serif text-lg text-foreground">Verdeling per categorie</h3>
          {donutData.length === 0 ? (
            <p className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              Nog geen bedragen ingevuld.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="waarde"
                  nameKey="naam"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  stroke="none"
                >
                  {donutData.map((_, i) => (
                    <Cell key={i} fill={KLEUREN[i % KLEUREN.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, naam) => [formatEuro(value), naam as string]}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--card))',
                    color: 'hsl(var(--card-foreground))',
                    textTransform: 'capitalize',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Vergelijking geschat/geoffreerd/betaald */}
      <Card className="lg:col-span-1">
        <CardContent className="p-6">
          <h3 className="mb-2 font-serif text-lg text-foreground">Geschat vs. betaald</h3>
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
              <Bar dataKey="bedrag" radius={[8, 8, 0, 0]} fill="#CC785C" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
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
