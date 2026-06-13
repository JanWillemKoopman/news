import { LayoutDashboard, Users, Bug, TrendingUp, CalendarHeart } from 'lucide-react'

import { createRawAdminClient } from '@/lib/supabase/admin'

export const revalidate = 60

interface AdminStats {
  total_users: number
  new_users_7d: number
  new_users_30d: number
  active_users_7d: number
  active_users_30d: number
  total_weddings: number
  new_weddings_7d: number
  errors_24h: number
  errors_7d: number
}

async function getStats(): Promise<AdminStats | null> {
  const admin = createRawAdminClient()
  const { data, error } = await admin.rpc('get_admin_stats')
  if (error) return null
  return data as AdminStats
}

export default async function AdminOverviewPage() {
  const stats = await getStats()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Overzicht</h1>
        <p className="text-sm text-gray-500 mt-1">Live inzicht in de app-prestaties</p>
      </div>

      {!stats && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Kon statistieken niet laden.
        </div>
      )}

      {stats && (
        <>
          {/* Gebruikers */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Gebruikers</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                icon={<Users className="h-5 w-5 text-blue-500" />}
                label="Totaal accounts"
                value={stats.total_users}
              />
              <StatCard
                icon={<TrendingUp className="h-5 w-5 text-green-500" />}
                label="Nieuw (7 dagen)"
                value={stats.new_users_7d}
                sub={`${stats.new_users_30d} in 30 dagen`}
              />
              <StatCard
                icon={<LayoutDashboard className="h-5 w-5 text-purple-500" />}
                label="Actief (7 dagen)"
                value={stats.active_users_7d}
                sub={`${stats.active_users_30d} in 30 dagen`}
              />
              <StatCard
                icon={<CalendarHeart className="h-5 w-5 text-rose-400" />}
                label="Bruiloften totaal"
                value={stats.total_weddings}
                sub={`${stats.new_weddings_7d} nieuw (7d)`}
              />
            </div>
          </section>

          {/* Technisch */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Technisch</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
              <StatCard
                icon={<Bug className={`h-5 w-5 ${stats.errors_24h > 0 ? 'text-red-500' : 'text-gray-400'}`} />}
                label="Fouten (24 uur)"
                value={stats.errors_24h}
                highlight={stats.errors_24h > 0}
              />
              <StatCard
                icon={<Bug className={`h-5 w-5 ${stats.errors_7d > 5 ? 'text-orange-500' : 'text-gray-400'}`} />}
                label="Fouten (7 dagen)"
                value={stats.errors_7d}
                highlight={stats.errors_7d > 5}
              />
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ReactNode
  label: string
  value: number
  sub?: string
  highlight?: boolean
}) {
  return (
    <div className={`rounded-xl border bg-white px-4 py-4 shadow-sm ${highlight ? 'border-red-200 bg-red-50' : 'border-gray-100'}`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-gray-500">{label}</span></div>
      <p className={`text-3xl font-bold tabular-nums ${highlight ? 'text-red-700' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}
