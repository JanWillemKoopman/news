import type { Metadata } from 'next'

import { createClient } from '@/lib/supabase/server'
import type { PublicDraaiboekData } from '@/lib/bruiloft/types'
import { PublicDraaiboek } from './PublicDraaiboek'

// Publieke deelpagina van het draaiboek (voor ceremoniemeester/leveranciers):
// géén login, alleen-lezen, en bewust niet indexeerbaar — de link is een
// onraadbare token en hoort niet in zoekmachines.

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function laadDraaiboek(token: string): Promise<PublicDraaiboekData | null> {
  if (!UUID_RE.test(token)) return null
  const supabase = createClient()
  // any: get_public_draaiboek ontbreekt nog in de gegenereerde
  // database.types.ts (nieuwe migratie 0069) — zelfde drift-patroon als
  // messages/vendor_documents.
  const { data, error } = await (supabase as any).rpc('get_public_draaiboek', {
    p_token: token,
  })
  if (error || !data) return null
  return data as PublicDraaiboekData
}

export async function generateMetadata({
  params,
}: {
  params: { token: string }
}): Promise<Metadata> {
  const data = await laadDraaiboek(params.token)
  const namen = data
    ? [data.partner1Naam, data.partner2Naam].filter(Boolean).join(' & ')
    : ''
  return {
    title: namen ? `Draaiboek — ${namen}` : 'Draaiboek',
    robots: { index: false, follow: false },
  }
}

export default async function PubliekDraaiboekPage({
  params,
}: {
  params: { token: string }
}) {
  const data = await laadDraaiboek(params.token)

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-rhino-50 px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-medium text-foreground">Dit draaiboek is niet (meer) beschikbaar</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            De link is gestopt of klopt niet helemaal. Vraag het bruidspaar om
            een nieuwe link.
          </p>
        </div>
      </main>
    )
  }

  return <PublicDraaiboek data={data} />
}
