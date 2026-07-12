import type { Metadata } from 'next'

import { createClient } from '@/lib/supabase/server'
import type { PublicMuziekData } from '@/lib/bruiloft/types'
import { PublicMuziek } from './PublicMuziek'

// Publieke deelpagina van de muzieklijst (voor de DJ of band): géén login,
// alleen-lezen, en bewust niet indexeerbaar — de link is een onraadbare
// token en hoort niet in zoekmachines. Zelfde opzet als /draaiboek/[token].

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function laadMuziek(token: string): Promise<PublicMuziekData | null> {
  if (!UUID_RE.test(token)) return null
  const supabase = createClient()
  // any: get_public_muziek ontbreekt nog in de gegenereerde
  // database.types.ts (nieuwe migratie 0078) — zelfde drift-patroon als
  // get_public_draaiboek.
  const { data, error } = await (supabase as any).rpc('get_public_muziek', {
    p_token: token,
  })
  if (error || !data) return null
  return data as PublicMuziekData
}

export async function generateMetadata({
  params,
}: {
  params: { token: string }
}): Promise<Metadata> {
  const data = await laadMuziek(params.token)
  const namen = data
    ? [data.partner1Naam, data.partner2Naam].filter(Boolean).join(' & ')
    : ''
  return {
    title: namen ? `Muzieklijst — ${namen}` : 'Muzieklijst',
    robots: { index: false, follow: false },
  }
}

export default async function PubliekeMuziekPage({
  params,
}: {
  params: { token: string }
}) {
  const data = await laadMuziek(params.token)

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-rhino-50 px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-medium text-foreground">Deze muzieklijst is niet (meer) beschikbaar</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            De link is gestopt of klopt niet helemaal. Vraag het bruidspaar om
            een nieuwe link.
          </p>
        </div>
      </main>
    )
  }

  return <PublicMuziek data={data} />
}
