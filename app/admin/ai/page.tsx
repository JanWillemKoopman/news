import { createClient } from '@/lib/supabase/server'
import { MiniLineChart } from '@/components/admin/MiniLineChart'

export const revalidate = 300

interface AiStats {
  total_calls: number
  calls_24h: number
  calls_7d: number
  cached_total: number
  cache_hit_rate: number | null
  avg_latency_ms: number | null
  p95_latency_ms: number | null
  failures: number
  success_rate: number | null
  unique_weddings: number
  feedback_up: number
  feedback_down: number
  active_caches: number
  rate_limit_incidents: number
}

interface DailyRow {
  dag: string
  total_calls: number
  cached_calls: number
  failures: number
}

interface EndpointRow {
  endpoint: string
  total_calls: number
  cached_calls: number
  cache_hit_pct: number | null
  avg_latency: number | null
  p95_latency: number | null
  failures: number
}

export default async function AiMonitorPage() {
  const supabase = createClient()

  const [statsRes, dailyRes, endpointRes] = await Promise.all([
    (supabase as any).rpc('get_admin_ai_stats'),
    (supabase as any).rpc('get_admin_ai_daily'),
    (supabase as any).rpc('get_admin_ai_by_endpoint'),
  ])

  const s = statsRes.error ? null : (statsRes.data as AiStats)
  const daily: DailyRow[] = dailyRes.error ? [] : (dailyRes.data ?? [])
  const endpoints: EndpointRow[] = endpointRes.error ? [] : (endpointRes.data ?? [])

  const anyError = statsRes.error || dailyRes.error || endpointRes.error

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">AI Monitor</h1>
      <p className="text-sm text-gray-400 mb-8">Claude API gebruik en cache-prestaties</p>

      {anyError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-6">
          Sommige statistieken konden niet worden geladen.
        </div>
      )}

      {s && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Totaal aanroepen" value={s.total_calls.toLocaleString('nl-NL')} />
          <StatCard label="Aanroepen (7d)" value={s.calls_7d.toLocaleString('nl-NL')} sub={`${s.calls_24h} vandaag`} />
          <StatCard
            label="Cache hit-rate"
            value={s.cache_hit_rate != null ? `${s.cache_hit_rate}%` : '—'}
            sub={`${s.cached_total} gecachede calls`}
          />
          <StatCard
            label="Succespercentage"
            value={s.success_rate != null ? `${s.success_rate}%` : '—'}
            sub={`${s.failures} fouten totaal`}
            accent={s.success_rate != null && s.success_rate < 95}
          />
        </div>
      )}

      {s && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Gem. latency"
            value={s.avg_latency_ms != null ? `${s.avg_latency_ms}ms` : '—'}
          />
          <StatCard
            label="P95 latency"
            value={s.p95_latency_ms != null ? `${s.p95_latency_ms}ms` : '—'}
          />
          <StatCard label="Unieke bruiloften" value={s.unique_weddings.toLocaleString('nl-NL')} />
          <StatCard
            label="Rate-limit incidenten"
            value={s.rate_limit_incidents.toLocaleString('nl-NL')}
            accent={s.rate_limit_incidents > 0}
          />
        </div>
      )}

      {/* Dagelijkse grafieken */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <MiniLineChart
          data={daily}
          lines={[
            { dataKey: 'total_calls', color: '#6366f1', label: 'Aanroepen' },
            { dataKey: 'cached_calls', color: '#10b981', label: 'Gecached' },
            { dataKey: 'failures', color: '#ef4444', label: 'Fouten' },
          ]}
          xKey="dag"
          title="AI aanroepen per dag"
          subtitle="Afgelopen 30 dagen"
        />
        <MiniLineChart
          data={daily.map((d) => ({
            ...d,
            niet_gecached: d.total_calls - d.cached_calls,
          }))}
          lines={[
            { dataKey: 'niet_gecached', color: '#f59e0b', label: 'Live calls (niet gecached)' },
          ]}
          xKey="dag"
          title="Live API calls per dag"
          subtitle="Gecachede calls uitgefilterd"
        />
      </div>

      {/* Endpoint breakdown */}
      {endpoints.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <p className="text-sm font-semibold text-gray-800">Per endpoint</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Endpoint</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Calls</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Cache %</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Gem. ms</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">P95 ms</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Fouten</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {endpoints.map((ep) => (
                  <tr key={ep.endpoint} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-700 max-w-[200px] truncate">{ep.endpoint}</td>
                    <td className="px-4 py-2.5 text-right text-xs tabular-nums text-gray-600">{ep.total_calls.toLocaleString('nl-NL')}</td>
                    <td className="px-4 py-2.5 text-right text-xs tabular-nums text-gray-600">
                      {ep.cache_hit_pct != null ? `${ep.cache_hit_pct}%` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs tabular-nums text-gray-600">
                      {ep.avg_latency != null ? ep.avg_latency : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs tabular-nums text-gray-600">
                      {ep.p95_latency != null ? ep.p95_latency : '—'}
                    </td>
                    <td className={`px-4 py-2.5 text-right text-xs tabular-nums font-semibold ${ep.failures > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                      {ep.failures}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Feedback */}
      {s && (s.feedback_up + s.feedback_down) > 0 && (
        <div className="mt-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-800 mb-3">AI feedback</p>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <span className="text-lg">👍</span>
              <span className="text-sm font-semibold text-gray-800">{s.feedback_up}</span>
              <span className="text-xs text-gray-400">positief</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">👎</span>
              <span className="text-sm font-semibold text-gray-800">{s.feedback_down}</span>
              <span className="text-xs text-gray-400">negatief</span>
            </div>
            {(s.feedback_up + s.feedback_down) > 0 && (
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-xs text-gray-400">score:</span>
                <span className="text-sm font-bold text-gray-800">
                  {Math.round((s.feedback_up / (s.feedback_up + s.feedback_down)) * 100)}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-2xl font-bold mt-1 tabular-nums ${accent ? 'text-red-500' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}
