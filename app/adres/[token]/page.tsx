import type { Metadata } from 'next'

import { createClient } from '@/lib/supabase/server'
import { AdresFormulier } from './AdresFormulier'

// Publieke adres-doorgeefpagina: genodigden vullen hier hun adres in voor
// de (papieren) uitnodigingen. Geen login, noindex — de link is een
// onraadbare token die het bruidspaar zelf rondstuurt.

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface AdresMeta {
  partner1Naam: string
  partner2Naam: string
}

async function laadMeta(token: string): Promise<AdresMeta | null> {
  if (!UUID_RE.test(token)) return null
  const supabase = createClient()
  // any: get_adres_share_meta ontbreekt nog in de gegenereerde
  // database.types.ts (nieuwe migratie 0072) — zelfde drift-patroon als
  // get_public_draaiboek.
  const { data, error } = await (supabase as any).rpc('get_adres_share_meta', {
    p_token: token,
  })
  if (error || !data) return null
  return data as AdresMeta
}

export async function generateMetadata({
  params,
}: {
  params: { token: string }
}): Promise<Metadata> {
  const meta = await laadMeta(params.token)
  const namen = meta ? [meta.partner1Naam, meta.partner2Naam].filter(Boolean).join(' & ') : ''
  return {
    title: namen ? `Adres doorgeven — ${namen}` : 'Adres doorgeven',
    robots: { index: false, follow: false },
  }
}

export default async function AdresPage({ params }: { params: { token: string } }) {
  const meta = await laadMeta(params.token)

  if (!meta) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-rhino-50 px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-medium text-foreground">Deze link werkt niet (meer)</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            De adreslink is gestopt of klopt niet helemaal. Vraag het bruidspaar
            om een nieuwe link.
          </p>
        </div>
      </main>
    )
  }

  const namen = [meta.partner1Naam, meta.partner2Naam].filter(Boolean).join(' & ')
  return <AdresFormulier token={params.token} namen={namen} />
}
