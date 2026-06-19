import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { GuestWall } from '@/components/fotomuur/GuestWall'
import { createRawAdminClient } from '@/lib/supabase/admin'

// Altijd vers uit de database renderen. Zonder dit cachet Next.js de
// server-render (Full Route Cache) en toont een reload een verouderde
// momentopname waarin recent geüploade foto's ontbreken. De gastpagina
// moet altijd de actuele foto's tonen.
export const dynamic = 'force-dynamic'

async function getData(slug: string) {
  const supabase = createRawAdminClient()
  const { data, error } = await supabase.rpc('get_photo_wall', { p_slug: slug })
  if (error || !data) return null
  return data as any
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await getData(params.slug)
  if (!data) return { title: 'Fotomuur' }
  return {
    title: `Fotomuur · ${data.partner1Naam} & ${data.partner2Naam}`,
    description: `Deel jouw foto's van de bruiloft van ${data.partner1Naam} & ${data.partner2Naam}`,
  }
}

export default async function FotoPage({ params }: { params: { slug: string } }) {
  const data = await getData(params.slug)
  if (!data) notFound()

  const { weddingId, partner1Naam, partner2Naam, trouwdatum, settings, photos } = data

  // Muur niet actief: vriendelijke boodschap
  if (!settings?.isActive) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
        <p className="text-4xl mb-4">📷</p>
        <h1 className="text-xl font-semibold text-stone-800">
          {partner1Naam} & {partner2Naam}
        </h1>
        <p className="mt-3 text-stone-500 text-sm">
          De fotomuur is op dit moment niet actief.
        </p>
        <p className="mt-1 text-stone-400 text-xs">
          Vraag het bruidspaar wanneer hij opengaat.
        </p>
      </div>
    )
  }

  return (
    <GuestWall
      weddingId={weddingId}
      slug={params.slug}
      partner1Naam={partner1Naam}
      partner2Naam={partner2Naam}
      trouwdatum={trouwdatum}
      settings={settings}
      initialPhotos={photos ?? []}
    />
  )
}
