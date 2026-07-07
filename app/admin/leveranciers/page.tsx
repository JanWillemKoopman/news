import { createClient } from '@/lib/supabase/server'
import { PromoteVendorButton } from '@/components/admin/PromoteVendorButton'

export const revalidate = 30

interface VendorRow {
  id: string
  naam: string
  type: string
  contactpersoon: string
  telefoon: string
  email: string
  website: string
  adres: string
  supplier_id: string | null
  created_at: string
  weddings: { partner1_naam: string; partner2_naam: string } | null
}

async function getVendors(): Promise<VendorRow[]> {
  const supabase = createClient()
  // platform_admin ziet via RLS (can_view -> is_platform_admin()) alle rijen
  // over alle bruiloften heen, niet alleen de eigen — geen admin-client nodig.
  const { data, error } = await supabase
    .from('vendors')
    .select('id, naam, type, contactpersoon, telefoon, email, website, adres, supplier_id, created_at, weddings(partner1_naam, partner2_naam)')
    .order('created_at', { ascending: false })
    .limit(300)
  if (error) return []
  return (data ?? []) as unknown as VendorRow[]
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
}

export default async function AdminLeveranciersPage() {
  const vendors = await getVendors()
  const gekoppeld = vendors.filter((v) => v.supplier_id).length
  const handmatig = vendors.length - gekoppeld

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leveranciers</h1>
        <p className="text-sm text-gray-500 mt-1">
          Leveranciers die stellen zelf aan hun eigen lijst hebben toegevoegd — laatste 300, over alle
          bruiloften heen. Los van de landelijke catalogus (public.suppliers), die alleen via het
          import-script gevuld wordt.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <CountCard label="Totaal" value={vendors.length} />
        <CountCard label="Handmatig toegevoegd" value={handmatig} />
        <CountCard label="Gekoppeld aan catalogus" value={gekoppeld} />
      </div>

      {vendors.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-16 text-gray-400">
          <p className="text-sm">Nog geen door gebruikers toegevoegde leveranciers</p>
        </div>
      )}

      {vendors.length > 0 && (
        <div className="space-y-2">
          {vendors.map((v) => (
            <div key={v.id} className="rounded-xl border border-gray-100 bg-white shadow-sm px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800">{v.naam || '(naamloos)'}</p>
                    {v.type && <span className="text-xs text-gray-400">{v.type}</span>}
                    {v.supplier_id ? (
                      <span className="inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                        in catalogus
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        handmatig
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {v.weddings ? `${v.weddings.partner1_naam} & ${v.weddings.partner2_naam}` : 'onbekende bruiloft'}
                    {' · '}{formatDate(v.created_at)}
                  </p>
                  {(v.website || v.email || v.telefoon || v.adres) && (
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {[v.adres, v.telefoon, v.email, v.website].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                {!v.supplier_id && <PromoteVendorButton vendorId={v.id} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CountCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-bold tabular-nums mt-0.5 text-gray-900">{value}</p>
    </div>
  )
}
