'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface WeekRow {
  week: string
  new_users: number
  active_users: number
}

interface Props {
  data: WeekRow[]
}

function ChartCard({
  title,
  subtitle,
  data,
  dataKey,
  color,
}: {
  title: string
  subtitle: string
  data: WeekRow[]
  dataKey: keyof WeekRow
  color: string
}) {
  const maxVal = Math.max(...data.map((d) => d[dataKey] as number), 1)
  const yTicks = Array.from({ length: maxVal + 1 }, (_, i) => i).filter(
    (n) => maxVal <= 5 || n % Math.ceil(maxVal / 5) === 0
  )

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-gray-800">{title}</p>
      <p className="text-xs text-gray-400 mt-0.5 mb-4">{subtitle}</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            ticks={yTicks}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              fontSize: '12px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            }}
            cursor={{ fill: '#f9fafb' }}
            formatter={(value: number) => [value, title]}
            labelFormatter={(label) => `Week ${label}`}
          />
          <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function WeeklyCharts({ data }: Props) {
  if (!data.length) return null

  return (
    <section className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        Groei per week (ISO-week)
      </h2>
      <ChartCard
        title="Nieuwe accounts"
        subtitle="Aantal aanmeldingen per ISO-week"
        data={data}
        dataKey="new_users"
        color="#3b82f6"
      />
      <ChartCard
        title="Actieve accounts"
        subtitle="Unieke gebruikers met activiteit per ISO-week"
        data={data}
        dataKey="active_users"
        color="#8b5cf6"
      />
    </section>
  )
}
