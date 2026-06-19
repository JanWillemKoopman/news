import { notFound } from 'next/navigation'

import { PresentationWall } from '@/components/fotomuur/PresentationWall'
import { createRawAdminClient } from '@/lib/supabase/admin'

// Altijd vers uit de database renderen. Zonder dit cachet Next.js de
// server-render (Full Route Cache) en toont een reload een verouderde
// momentopname — waardoor geüploade foto's lijken te "verdwijnen" zodra
// de pagina opnieuw wordt geladen. De fotomuur moet altijd de actuele
// foto's tonen, ongeacht wijzigingen aan de instellingen.
export const dynamic = 'force-dynamic'

async function getData(slug: string) {
  const supabase = createRawAdminClient()
  const { data, error } = await supabase.rpc('get_photo_wall', { p_slug: slug })
  if (error || !data) return null
  return data as any
}

export default async function SchermPage({ params }: { params: { slug: string } }) {
  const data = await getData(params.slug)
  if (!data) notFound()

  const { weddingId, partner1Naam, partner2Naam, trouwdatum, settings, photos } = data

  if (!settings?.isActive) {
    return (
      <div className="fixed inset-0 bg-stone-950 flex flex-col items-center justify-center text-white text-center px-8">
        <p className="text-5xl mb-6">📷</p>
        <h1 className="text-3xl font-serif">{partner1Naam} & {partner2Naam}</h1>
        <p className="mt-4 text-white/50">De fotomuur is nog niet actief.</p>
        <p className="mt-1 text-white/30 text-sm">Activeer de muur in de app om te beginnen.</p>
      </div>
    )
  }

  // Bepaal de publieke gast-URL voor de QR-instructie op het scherm
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'
  const guestUrl = `${baseUrl}/foto/${params.slug}`

  return (
    <PresentationWall
      weddingId={weddingId}
      slug={params.slug}
      partner1Naam={partner1Naam}
      partner2Naam={partner2Naam}
      trouwdatum={trouwdatum}
      settings={settings}
      initialPhotos={photos ?? []}
      guestUrl={guestUrl}
    />
  )
}
