import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PublicWebsite, type PublicWebsiteData } from '@/components/website/PublicWebsite'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, createRawAdminClient } from '@/lib/supabase/admin'

async function getRegistryMeta(slug: string): Promise<{ enabled: boolean; passwordRequired: boolean; introText: string } | null> {
  try {
    const admin = createAdminClient()
    const rawAdmin = createRawAdminClient()

    const { data: content } = await admin
      .from('website_content')
      .select('wedding_id')
      .eq('slug', slug)
      .maybeSingle()
    if (!content) return null

    const { data: settings } = await rawAdmin
      .from('registry_settings')
      .select('is_enabled, password, intro_text')
      .eq('wedding_id', content.wedding_id)
      .maybeSingle()

    if (!settings) return null

    return {
      enabled: !!(settings.is_enabled),
      passwordRequired: !!(settings.password),
      introText: (settings.intro_text as string) ?? '',
    }
  } catch {
    return null
  }
}

async function getData(slug: string): Promise<{ site: PublicWebsiteData; registry: { enabled: boolean; passwordRequired: boolean; introText: string } | null } | null> {
  const supabase = createClient()
  const [siteRes, registry] = await Promise.all([
    supabase.rpc('get_public_website', { p_slug: slug }),
    getRegistryMeta(slug),
  ])
  if (siteRes.error || !siteRes.data) return null
  const site = siteRes.data as unknown as PublicWebsiteData
  return { site, registry }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const result = await getData(params.slug)
  if (!result) return { title: 'Trouwwebsite' }
  const { partner1Naam, partner2Naam } = result.site.wedding
  return {
    title: `${partner1Naam} & ${partner2Naam}`,
    description: result.site.content.welkomsttekst.slice(0, 160) || `De trouwwebsite van ${partner1Naam} & ${partner2Naam}`,
    openGraph: {
      title: `${partner1Naam} & ${partner2Naam}`,
      images: result.site.content.headerFotoUrl ? [result.site.content.headerFotoUrl] : [],
    },
  }
}

export default async function TrouwWebsitePage({ params }: { params: { slug: string } }) {
  const result = await getData(params.slug)
  if (!result) notFound()
  return <PublicWebsite data={result.site} registry={result.registry} slug={params.slug} />
}
