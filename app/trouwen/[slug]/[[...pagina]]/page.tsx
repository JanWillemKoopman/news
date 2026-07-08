import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'

import { PublicWebsite } from '@/components/website/PublicWebsite'
import { SiteWachtwoordGate, type SiteLockMeta } from '@/components/website/SiteWachtwoordGate'
import { PublicWebsiteV2 } from '@/components/website/v2/PublicWebsiteV2'
import { cookieNaamVoor, verifieerOntgrendelCookie } from '@/lib/crypto/siteUnlockCookie'
import { getSiteData, pageSlugVan, type SiteResult } from '@/lib/bruiloft/publicSite'
import { createClient } from '@/lib/supabase/server'

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

// Handmatige SEO-omschrijving (ingesteld in de editor) heeft voorrang;
// zonder die override gokken we uit het eerste tekstblok van de pagina.
function beschrijvingVan(result: SiteResult, pageSlug: string): string {
  if (result.v2) {
    const pagina = result.v2.pages.find((p) => p.pageSlug === pageSlug) ?? result.v2.pages[0]
    if (pagina?.seoOmschrijving?.trim()) return pagina.seoOmschrijving.trim().slice(0, 160)
    const eersteTekst = pagina?.blocks.find((b) => b.type === 'tekst' && b.zichtbaar && b.tekst.trim())
    if (eersteTekst && 'tekst' in eersteTekst) return eersteTekst.tekst.slice(0, 160)
    return ''
  }
  return result.v1?.content.welkomsttekst.slice(0, 160) ?? ''
}

function seoTitelVan(result: SiteResult, pageSlug: string): string | null {
  if (!result.v2) return null
  const pagina = result.v2.pages.find((p) => p.pageSlug === pageSlug) ?? result.v2.pages[0]
  return pagina?.seoTitel?.trim() || null
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

  const result = await getSiteData(params.slug)
  if (!result) return { title: 'Trouwwebsite' }
  const pageSlug = pageSlugVan(params.pagina) ?? ''
  const wedding = result.v2?.wedding ?? result.v1!.wedding
  const beschrijving = beschrijvingVan(result, pageSlug)
  const headerFoto = headerFotoVan(result, pageSlug)
  const seoTitel = seoTitelVan(result, pageSlug)
  const titel = seoTitel || `${wedding.partner1Naam} & ${wedding.partner2Naam}`
  return {
    title: titel,
    description: beschrijving || `De trouwwebsite van ${wedding.partner1Naam} & ${wedding.partner2Naam}`,
    openGraph: {
      title: titel,
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

  const result = await getSiteData(params.slug)
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
