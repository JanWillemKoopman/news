import { createClient } from '@/lib/supabase/server'
import { MiniLineChart } from '@/components/admin/MiniLineChart'

export const revalidate = 300

interface ActivityDay {
  dag: string
  action_count: number
  unique_weddings: number
  unique_users: number
}

interface EventType {
  event_type: string
  total_count: number
  unique_users: number
  last_7d: number
  last_seen: string | null
}

export default async function GebruikPage() {
  const supabase = createClient()

  const [activityRes, eventTypesRes] = await Promise.all([
    (supabase as any).rpc('get_admin_activity_daily'),
    (supabase as any).rpc('get_admin_event_types'),
  ])

  const activity: ActivityDay[] = activityRes.error ? [] : (activityRes.data ?? [])
  const eventTypes: EventType[] = eventTypesRes.error ? [] : (eventTypesRes.data ?? [])

  const peakUsers = activity.reduce((m, d) => Math.max(m, d.unique_users), 0)
  const avgUsers7d = (() => {
    const last7 = activity.slice(-7)
    return last7.length === 0 ? 0 : Math.round(last7.reduce((s, d) => s + d.unique_users, 0) / last7.length)
  })()
  const totalActions = activity.reduce((s, d) => s + d.action_count, 0)

  const anyError = activityRes.error || eventTypesRes.error

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">App Gebruik</h1>
      <p className="text-sm text-gray-400 mb-8">Dagelijkse activiteit en event-types — afgelopen 30 dagen</p>

      {anyError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-6">
          Sommige statistieken konden niet worden geladen.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Peak actieve gebruikers" value={peakUsers} />
        <StatCard label="Gem. actieve gebruikers (7d)" value={avgUsers7d} />
        <StatCard label="Acties (30d)" value={totalActions} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <MiniLineChart
          data={activity}
          lines={[
            { dataKey: 'unique_users', color: '#6366f1', label: 'Actieve gebruikers' },
            { dataKey: 'unique_weddings', color: '#10b981', label: 'Actieve bruiloften' },
          ]}
          xKey="dag"
          height={240}
          title="Dagelijkse actieve gebruikers"
          subtitle="Afgelopen 30 dagen"
        />
        <MiniLineChart
          data={activity}
          lines={[{ dataKey: 'action_count', color: '#f59e0b', label: 'Acties' }]}
          xKey="dag"
          height={240}
          title="Acties per dag"
          subtitle="Alle activiteiten in de app"
        />
      </div>

      {eventTypes.length > 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <p className="text-sm font-semibold text-gray-800">Event-types</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Event</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Totaal</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Unieke gebruikers</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Afgelopen 7d</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {eventTypes.map((et) => (
                  <tr key={et.event_type} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{et.event_type}</td>
                    <td className="px-4 py-2.5 text-right text-xs tabular-nums text-gray-600">{et.total_count.toLocaleString('nl-NL')}</td>
                    <td className="px-4 py-2.5 text-right text-xs tabular-nums text-gray-600">{et.unique_users.toLocaleString('nl-NL')}</td>
                    <td className="px-4 py-2.5 text-right text-xs tabular-nums text-gray-600">{et.last_7d.toLocaleString('nl-NL')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm text-center">
          <p className="text-sm text-gray-400">
            Nog geen activiteitsdata beschikbaar via <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">wedding_activity</code> of <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">analytics_events</code>.
          </p>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1 tabular-nums">{value.toLocaleString('nl-NL')}</p>
    </div>
  )
}
