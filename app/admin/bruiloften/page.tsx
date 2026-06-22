import { createClient } from '@/lib/supabase/server'
import { AdoptionBars } from '@/components/admin/AdoptionBars'

export const revalidate = 300

interface WeddingStats {
  total_weddings: number
  with_date: number
  date_future: number
  date_past: number
  avg_daggasten: number | null
  avg_budget: number | null
  weddings_with_guests: number
  weddings_with_tasks: number
  weddings_with_budget: number
  weddings_with_vendors: number
  weddings_with_schedule: number
  weddings_website_pub: number
  weddings_registry_on: number
  weddings_photowall_on: number
  weddings_multi_member: number
  total_tasks: number
  tasks_open: number
  tasks_bezig: number
  tasks_klaar: number
  tasks_overdue: number
  total_guests: number
  guests_bevestigd: number
  guests_afgemeld: number
  guests_uitgenodigd: number
  guests_daggast: number
  guests_avondgast: number
  guests_met_tafel: number
  total_budget_items: number
  total_geschat: number
  total_betaald: number
  total_vendors: number
  vendors_geboekt: number
  registry_items: number
  registry_contributions: number
  registry_amount: number
  total_photos: number
  total_invites: number
  invites_accepted: number
}

export default async function BruiloftenPage() {
  const supabase = createClient()
  const { data, error } = await (supabase as any).rpc('get_admin_wedding_stats')

  const s = error ? null : (data as WeddingStats)
  const total = s?.total_weddings ?? 0

  const featureAdoptie = s
    ? [
        { label: 'Trouwdatum ingesteld', count: s.with_date, total, color: '#6366f1' },
        { label: 'Gastenlijst gestart', count: s.weddings_with_guests, total, color: '#10b981' },
        { label: 'Takenslijst gebruikt', count: s.weddings_with_tasks, total, color: '#f59e0b' },
        { label: 'Budget ingevuld', count: s.weddings_with_budget, total, color: '#3b82f6' },
        { label: 'Leveranciers toegevoegd', count: s.weddings_with_vendors, total, color: '#8b5cf6' },
        { label: 'Draaiboek aangemaakt', count: s.weddings_with_schedule, total, color: '#ec4899' },
        { label: 'Website gepubliceerd', count: s.weddings_website_pub, total, color: '#14b8a6' },
        { label: 'Cadeaulijst actief', count: s.weddings_registry_on, total, color: '#f97316' },
        { label: 'Fotowall actief', count: s.weddings_photowall_on, total, color: '#06b6d4' },
        { label: 'Meerdere leden', count: s.weddings_multi_member, total, color: '#84cc16' },
      ]
    : []

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Bruiloften</h1>
      <p className="text-sm text-gray-400 mb-8">Profiel-completie en feature-adoptie per bruiloft</p>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-6">
          Kon statistieken niet laden.
        </div>
      )}

      {s && (
        <>
          {/* Kerncijfers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <StatCard label="Totaal bruiloften" value={s.total_weddings} />
            <StatCard label="Komende trouwdatum" value={s.date_future} sub={`${s.date_past} al geweest`} />
            <StatCard label="Gem. daggasten" value={s.avg_daggasten ?? 0} sub="bruiloften met gasten" />
            <StatCard
              label="Gem. budget"
              value={s.avg_budget ? `€${Math.round(s.avg_budget / 1000)}k` : '—'}
            />
          </div>

          {/* Feature adoptie */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <AdoptionBars items={featureAdoptie.slice(0, 5)} title="Module-adoptie (1/2)" />
            <AdoptionBars items={featureAdoptie.slice(5)} title="Module-adoptie (2/2)" />
          </div>

          {/* Taken & gasten */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-800 mb-4">Taken</p>
              <div className="space-y-2">
                <Row label="Totaal taken" value={s.total_tasks} />
                <Row label="Open" value={s.tasks_open} />
                <Row label="Bezig" value={s.tasks_bezig} />
                <Row label="Klaar" value={s.tasks_klaar} />
                <Row label="Achterstallig" value={s.tasks_overdue} accent />
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-800 mb-4">Gasten</p>
              <div className="space-y-2">
                <Row label="Totaal gasten" value={s.total_guests} />
                <Row label="Bevestigd" value={s.guests_bevestigd} />
                <Row label="Afgemeld" value={s.guests_afgemeld} />
                <Row label="Uitgenodigd" value={s.guests_uitgenodigd} />
                <Row label="Met tafelindeling" value={s.guests_met_tafel} />
              </div>
            </div>
          </div>

          {/* Budget, leveranciers, cadeaulijst */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-800 mb-4">Budget</p>
              <div className="space-y-2">
                <Row label="Budget-items" value={s.total_budget_items} />
                <Row label="Geraamd" value={`€${(s.total_geschat / 100).toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`} />
                <Row label="Betaald" value={`€${(s.total_betaald / 100).toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`} />
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-800 mb-4">Leveranciers</p>
              <div className="space-y-2">
                <Row label="Totaal" value={s.total_vendors} />
                <Row label="Geboekt" value={s.vendors_geboekt} />
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-800 mb-4">Cadeaulijst & foto's</p>
              <div className="space-y-2">
                <Row label="Cadeaulijst-items" value={s.registry_items} />
                <Row label="Bijdragen" value={s.registry_contributions} />
                <Row label="Totaal ontvangen" value={`€${(s.registry_amount / 100).toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`} />
                <Row label="Fotowall-foto's" value={s.total_photos} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: number | string
  sub?: string
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1 tabular-nums">
        {typeof value === 'number' ? value.toLocaleString('nl-NL') : value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function Row({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-600">{label}</span>
      <span className={`text-xs font-semibold tabular-nums ${accent ? 'text-red-500' : 'text-gray-800'}`}>
        {typeof value === 'number' ? value.toLocaleString('nl-NL') : value}
      </span>
    </div>
  )
}
