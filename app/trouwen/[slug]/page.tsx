import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PublicWebsite, type PublicWebsiteData } from '@/components/website/PublicWebsite'
import { createClient } from '@/lib/supabase/server'

async function getData(slug: string): Promise<PublicWebsiteData | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('get_public_website', { p_slug: slug })
  if (error || !data) return null
  return data as unknown as PublicWebsiteData
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const data = await getData(params.slug)
  if (!data) return { title: 'Trouwwebsite' }
  const { partner1Naam, partner2Naam } = data.wedding
  return {
    title: `${partner1Naam} & ${partner2Naam}`,
    description: data.content.welkomsttekst.slice(0, 160) || `De trouwwebsite van ${partner1Naam} & ${partner2Naam}`,
    openGraph: {
      title: `${partner1Naam} & ${partner2Naam}`,
      images: data.content.headerFotoUrl ? [data.content.headerFotoUrl] : [],
    },
  }
}

export default async function TrouwWebsitePage({ params }: { params: { slug: string } }) {
  const data = await getData(params.slug)
  if (!data) notFound()
  return <PublicWebsite data={data} />
}
