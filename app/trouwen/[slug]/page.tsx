import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PublicWebsite, type PublicWebsiteData } from '@/components/website/PublicWebsite'
import { PublicWebsiteV2, type PublicWebsiteV2Data } from '@/components/website/v2/PublicWebsiteV2'
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

interface SiteResult {
  registry: { enabled: boolean; passwordRequired: boolean; introText: string } | null
  // v2 (blokkenmodel) heeft voorrang; v1 is het legacy-pad voor sites die
  // nog niet naar blokken zijn geconverteerd.
  v2: PublicWebsiteV2Data | null
  v1: PublicWebsiteData | null
}

async function getData(slug: string): Promise<SiteResult | null> {
  const supabase = createClient()
  const [v2Res, v1Res, registry] = await Promise.all([
    supabase.rpc('get_public_website_v2', { p_slug: slug }),
    supabase.rpc('get_public_website', { p_slug: slug }),
    getRegistryMeta(slug),
  ])
  const v2 = !v2Res.error && v2Res.data ? (v2Res.data as unknown as PublicWebsiteV2Data) : null
  const v1 = !v1Res.error && v1Res.data ? (v1Res.data as unknown as PublicWebsiteData) : null
  if (!v2 && !v1) return null
  return { v2, v1, registry }
}

function beschrijvingVan(result: SiteResult): string {
  if (result.v2) {
    const home = result.v2.pages[0]
    const eersteTekst = home?.blocks.find((b) => b.type === 'tekst' && b.zichtbaar && b.tekst.trim())
    if (eersteTekst && 'tekst' in eersteTekst) return eersteTekst.tekst.slice(0, 160)
    return ''
  }
  return result.v1?.content.welkomsttekst.slice(0, 160) ?? ''
}

function headerFotoVan(result: SiteResult): string {
  if (result.v2) {
    const hero = result.v2.pages[0]?.blocks.find((b) => b.type === 'hero')
    return hero && 'fotoUrl' in hero ? hero.fotoUrl : ''
  }
  return result.v1?.content.headerFotoUrl ?? ''
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const result = await getData(params.slug)
  if (!result) return { title: 'Trouwwebsite' }
  const wedding = result.v2?.wedding ?? result.v1!.wedding
  const beschrijving = beschrijvingVan(result)
  const headerFoto = headerFotoVan(result)
  return {
    title: `${wedding.partner1Naam} & ${wedding.partner2Naam}`,
    description: beschrijving || `De trouwwebsite van ${wedding.partner1Naam} & ${wedding.partner2Naam}`,
    openGraph: {
      title: `${wedding.partner1Naam} & ${wedding.partner2Naam}`,
      images: headerFoto ? [headerFoto] : [],
    },
  }
}

export default async function TrouwWebsitePage({ params }: { params: { slug: string } }) {
  const result = await getData(params.slug)
  if (!result) notFound()
  if (result.v2) {
    return <PublicWebsiteV2 data={result.v2} registry={result.registry} slug={params.slug} />
  }
  return <PublicWebsite data={result.v1!} registry={result.registry} slug={params.slug} />
}
