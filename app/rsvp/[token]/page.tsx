import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PublicRsvp, type PublicWeddingData } from '@/components/rsvp/PublicRsvp'
import { createClient } from '@/lib/supabase/server'

async function getData(token: string): Promise<PublicWeddingData | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('get_public_wedding', { p_token: token })
  if (error || !data) return null
  return data as unknown as PublicWeddingData
}

export async function generateMetadata({
  params,
}: {
  params: { token: string }
}): Promise<Metadata> {
  const data = await getData(params.token)
  if (!data) return { title: 'Uitnodiging', robots: { index: false } }
  const { partner1Naam, partner2Naam } = data.wedding
  return {
    title: `${partner1Naam} & ${partner2Naam} — Uitnodiging`,
    description: 'Je persoonlijke uitnodiging. Laat weten of je erbij bent.',
    robots: { index: false },
  }
}

export default async function RsvpPage({ params }: { params: { token: string } }) {
  const data = await getData(params.token)
  if (!data) notFound()
  return <PublicRsvp token={params.token} data={data} />
}
