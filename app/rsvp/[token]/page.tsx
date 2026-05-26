import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PublicRsvp, type PublicWeddingData } from '@/components/rsvp/PublicRsvp'
import { ThemeProvider } from '@/components/rsvp/ThemeProvider'
import { createClient } from '@/lib/supabase/server'
import { themeConfigSchema, type ThemeConfig } from '@/lib/bruiloft/theme'

interface PublicResponse extends PublicWeddingData {
  theme?: unknown
}

async function getData(token: string): Promise<{ data: PublicWeddingData; theme: ThemeConfig | null } | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('get_public_wedding', { p_token: token })
  if (error || !data) return null
  const payload = data as unknown as PublicResponse
  // Onbekend thema (oude pagina's, geknoeide JSON): val terug op default in
  // plaats van crashen.
  const parsed = themeConfigSchema.safeParse(payload.theme ?? null)
  const theme = parsed.success ? parsed.data : null
  return { data: payload, theme }
}

export async function generateMetadata({
  params,
}: {
  params: { token: string }
}): Promise<Metadata> {
  const result = await getData(params.token)
  if (!result) return { title: 'Uitnodiging', robots: { index: false } }
  const { partner1Naam, partner2Naam } = result.data.wedding
  return {
    title: `${partner1Naam} & ${partner2Naam} — Uitnodiging`,
    description: 'Je persoonlijke uitnodiging. Laat weten of je erbij bent.',
    robots: { index: false },
  }
}

export default async function RsvpPage({ params }: { params: { token: string } }) {
  const result = await getData(params.token)
  if (!result) notFound()
  return (
    <ThemeProvider theme={result.theme} className="min-h-screen bg-background text-foreground">
      <PublicRsvp token={params.token} data={result.data} />
    </ThemeProvider>
  )
}
