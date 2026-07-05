import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'

import { PublicWebsite, type PublicWebsiteData } from '@/components/website/PublicWebsite'
import { SiteWachtwoordGate, type SiteLockMeta } from '@/components/website/SiteWachtwoordGate'
import { PublicWebsiteV2, type PublicWebsiteV2Data } from '@/components/website/v2/PublicWebsiteV2'
import { cookieNaamVoor, verifieerOntgrendelCookie } from '@/lib/crypto/siteUnlockCookie'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, createRawAdminClient } from '@/lib/supabase/admin'

// Lichte, publieke metadata (namen + thema, nooit inhoud) — bepaalt of het
// wachtwoordscherm getoond moet worden vóórdat de echte inhoud ooit wordt
// opgehaald. Zie migratie 0050_site_password.sql.
async function getLockMeta(slug: string): Promise<SiteLockMeta | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('get_trouwwebsite_lock_meta', { p_slug: slug })
  if (error || !data) return null
  return data as unknown as SiteLockMeta
}

function isOntgrendeld(meta: SiteLockMeta): boolean {
  if (!meta.sitePasswordVereist) return true
  const waarde = cookies().get(cookieNaamVoor(meta.weddingId))?.value
  return verifieerOntgrendelCookie(waarde, meta.weddingId)
}

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
  // nog niet naar blokken zijn geconverteerd (v1 kent geen sub-pagina's).
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

// `params.pagina` is 0 of 1 segment (optionele catch-all): [] = home,
// ['programma'] = de pagina met page_slug 'programma'. Meer dan 1 segment
// bestaat niet in dit model.
function pageSlugVan(pagina: string[] | undefined): string | null {
  if (!pagina || pagina.length === 0) return ''
  if (pagina.length === 1) return pagina[0]
  return null
}

function beschrijvingVan(result: SiteResult, pageSlug: string): string {
  if (result.v2) {
    const pagina = result.v2.pages.find((p) => p.pageSlug === pageSlug) ?? result.v2.pages[0]
    const eersteTekst = pagina?.blocks.find((b) => b.type === 'tekst' && b.zichtbaar && b.tekst.trim())
    if (eersteTekst && 'tekst' in eersteTekst) return eersteTekst.tekst.slice(0, 160)
    return ''
  }
  return result.v1?.content.welkomsttekst.slice(0, 160) ?? ''
}

function headerFotoVan(result: SiteResult, pageSlug: string): string {
  if (result.v2) {
    // De hero staat altijd op de homepagina; gebruik die ook als OG-afbeelding
    // voor sub-pagina's zonder eigen hero.
    const hero =
      result.v2.pages.find((p) => p.pageSlug === pageSlug)?.blocks.find((b) => b.type === 'hero') ??
      result.v2.pages[0]?.blocks.find((b) => b.type === 'hero')
    return hero && 'fotoUrl' in hero ? hero.fotoUrl : ''
  }
  return result.v1?.content.headerFotoUrl ?? ''
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string; pagina?: string[] }
}): Promise<Metadata> {
  const meta = await getLockMeta(params.slug)
  if (!meta) return { title: 'Trouwwebsite' }

  // Beveiligd en (nog) niet ontgrendeld: geen beschrijving/foto in de
  // metadata — die zou anders via social-previews of zoekresultaten
  // lekken nog vóór het wachtwoordscherm.
  if (!isOntgrendeld(meta)) {
    return {
      title: `${meta.partner1Naam} & ${meta.partner2Naam}`,
      description: 'Deze trouwwebsite is beveiligd met een wachtwoord.',
      robots: { index: false },
    }
  }

  const result = await getData(params.slug)
  if (!result) return { title: 'Trouwwebsite' }
  const pageSlug = pageSlugVan(params.pagina) ?? ''
  const wedding = result.v2?.wedding ?? result.v1!.wedding
  const beschrijving = beschrijvingVan(result, pageSlug)
  const headerFoto = headerFotoVan(result, pageSlug)
  return {
    title: `${wedding.partner1Naam} & ${wedding.partner2Naam}`,
    description: beschrijving || `De trouwwebsite van ${wedding.partner1Naam} & ${wedding.partner2Naam}`,
    openGraph: {
      title: `${wedding.partner1Naam} & ${wedding.partner2Naam}`,
      images: headerFoto ? [headerFoto] : [],
    },
  }
}

export default async function TrouwWebsitePage({
  params,
}: {
  params: { slug: string; pagina?: string[] }
}) {
  const meta = await getLockMeta(params.slug)
  if (!meta) notFound()

  const pageSlug = pageSlugVan(params.pagina)
  if (pageSlug === null) notFound()

  // Site-breed wachtwoord vereist en (nog) geen geldig ontgrendel-bewijs:
  // render het slotscherm — get_public_website_v2/get_public_website worden
  // dan nooit aangeroepen, de echte inhoud verlaat de server dus niet.
  if (!isOntgrendeld(meta)) {
    return <SiteWachtwoordGate slug={params.slug} meta={meta} />
  }

  const result = await getData(params.slug)
  if (!result) notFound()

  if (result.v2) {
    // Onbekende sub-pagina op een geconverteerde site: 404 i.p.v. stilzwijgend
    // terugvallen op de homepagina.
    if (pageSlug !== '' && !result.v2.pages.some((p) => p.pageSlug === pageSlug)) notFound()
    return (
      <PublicWebsiteV2 data={result.v2} registry={result.registry} slug={params.slug} activePageSlug={pageSlug} />
    )
  }

  // Legacy (niet-geconverteerde) sites kennen geen sub-pagina's.
  if (pageSlug !== '') notFound()
  return <PublicWebsite data={result.v1!} registry={result.registry} slug={params.slug} />
}
