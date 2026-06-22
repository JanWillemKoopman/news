'use client'

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface LineConfig {
  dataKey: string
  color: string
  label: string
}

interface Props {
  data: Record<string, string | number>[]
  lines: LineConfig[]
  xKey: string
  height?: number
  title: string
  subtitle?: string
}

export function MiniLineChart({ data, lines, xKey, height = 200, title, subtitle }: Props) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-gray-800">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}

      {/* Legenda */}
      {lines.length > 1 && (
        <div className="flex flex-wrap gap-4 mb-3">
          {lines.map((l) => (
            <div key={l.dataKey} className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-4 rounded-full" style={{ backgroundColor: l.color }} />
              <span className="text-xs text-gray-500">{l.label}</span>
            </div>
          ))}
        </div>
      )}

      {data.length === 0 ? (
        <div className="flex items-center justify-center text-gray-400 text-xs" style={{ height }}>
          Nog geen data beschikbaar
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '11px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              }}
              cursor={{ stroke: '#e5e7eb' }}
            />
            {lines.map((l) => (
              <Line
                key={l.dataKey}
                type="monotone"
                dataKey={l.dataKey}
                stroke={l.color}
                strokeWidth={2}
                dot={false}
                name={l.label}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
