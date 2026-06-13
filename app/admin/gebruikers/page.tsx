import { Users } from 'lucide-react'
import { createRawAdminClient } from '@/lib/supabase/admin'

export const revalidate = 60

interface AdminUser {
  id: string
  email: string
  display_name: string | null
  created_at: string
  last_sign_in_at: string | null
  wedding_count: number
  event_count_30d: number
}

async function getUsers(): Promise<AdminUser[]> {
  const admin = createRawAdminClient()
  const { data, error } = await admin.rpc('get_admin_users', { p_limit: 100, p_offset: 0 })
  if (error) return []
  return (data ?? []) as AdminUser[]
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(iso))
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

function EngagementBadge({ count }: { count: number }) {
  if (count >= 20) return <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Hoog ({count})</span>
  if (count >= 5)  return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">Matig ({count})</span>
  if (count > 0)   return <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">Laag ({count})</span>
  return               <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-xs text-gray-400">Inactief</span>
}

export default async function GebruikersPage() {
  const users = await getUsers()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gebruikers</h1>
        <p className="text-sm text-gray-500 mt-1">{users.length} accounts — gesorteerd op aanmaakdatum</p>
      </div>

      {/* Samenvatting */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Totaal" value={users.length} />
        <SummaryCard
          label="Ingelogd < 7 dagen"
          value={users.filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at) > new Date(Date.now() - 7 * 86400_000)).length}
        />
        <SummaryCard
          label="Actief (30d, ≥5 acties)"
          value={users.filter(u => u.event_count_30d >= 5).length}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Gebruiker</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Aangemaakt</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Laatste login</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Bruiloften</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Engagement (30d)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800 truncate max-w-[180px]">
                    {u.display_name ?? u.email.split('@')[0]}
                  </p>
                  <p className="text-xs text-gray-400 truncate max-w-[180px]">{u.email}</p>
                </td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(u.created_at)}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDateTime(u.last_sign_in_at)}</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-600">
                    {u.wedding_count}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <EngagementBadge count={u.event_count_30d} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-gray-400">
            <Users className="h-8 w-8" />
            <p className="text-sm">Nog geen gebruikers</p>
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 tabular-nums mt-0.5">{value}</p>
    </div>
  )
}
