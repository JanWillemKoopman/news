import 'server-only'

// Gedeelde server-only data-laag voor alles wat een publieke trouwwebsite
// rendert: de publieke route (/trouwen/[slug]) én de persoonlijke RSVP-link
// (/rsvp/[token]) — beide tonen precies dezelfde thematische site, alleen
// bereikt via een ander toegangsmechanisme (slug vs. token). Door de data-
// ophaal-logica hier één keer te definiëren kan de token-route nooit uit de
// pas lopen met wat de publieke route laat zien.

import type { PublicWebsiteData } from '@/components/website/PublicWebsite'
import type { PublicWebsiteV2Data } from '@/components/website/v2/PublicWebsiteV2'
import { createAdminClient, createRawAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export interface RegistryMeta {
  enabled: boolean
  passwordRequired: boolean
  introText: string
}

export interface SiteResult {
  registry: RegistryMeta | null
  // v2 (blokkenmodel) heeft voorrang; v1 is het legacy-pad voor sites die
  // nog niet naar blokken zijn geconverteerd (v1 kent geen sub-pagina's).
  v2: PublicWebsiteV2Data | null
  v1: PublicWebsiteData | null
}

export async function getRegistryMeta(slug: string): Promise<RegistryMeta | null> {
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
      enabled: !!settings.is_enabled,
      passwordRequired: !!settings.password,
      introText: (settings.intro_text as string) ?? '',
    }
  } catch {
    return null
  }
}

export async function getSiteData(slug: string): Promise<SiteResult | null> {
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

// `pagina` is 0 of 1 segment (optionele catch-all): [] = home,
// ['programma'] = de pagina met page_slug 'programma'. Meer dan 1 segment
// bestaat niet in dit model. Gedeeld door de publieke route en de
// persoonlijke RSVP-route — zelfde sub-pagina-structuur, ander toegangspad.
export function pageSlugVan(pagina: string[] | undefined): string | null {
  if (!pagina || pagina.length === 0) return ''
  if (pagina.length === 1) return pagina[0]
  return null
}
