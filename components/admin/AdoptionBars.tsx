interface BarItem {
  label: string
  count: number
  total: number
  color: string
}

interface Props {
  items: BarItem[]
  title?: string
}

export function AdoptionBars({ items, title }: Props) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      {title && <p className="text-sm font-semibold text-gray-800 mb-4">{title}</p>}
      <div className="space-y-3.5">
        {items.map((item) => {
          const pct = item.total === 0 ? 0 : Math.round((item.count / item.total) * 100)
          return (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-700">{item.label}</span>
                <span className="text-xs tabular-nums text-gray-400">
                  {item.count}
                  <span className="mx-1 text-gray-300">/</span>
                  {item.total}
                  <span className="ml-2 font-semibold text-gray-700">{pct}%</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
