import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PublicWebsite } from '@/components/website/PublicWebsite'
import { AutoUnlock } from '@/components/website/v2/AutoUnlock'
import { PublicWebsiteV2 } from '@/components/website/v2/PublicWebsiteV2'
import type { GevondenGast, TokenGast } from '@/components/website/v2/themes/types'
import { getSiteData, pageSlugVan } from '@/lib/bruiloft/publicSite'
import { createClient } from '@/lib/supabase/server'

// Persoonlijke RSVP-link: fase 1 van de RSVP-herziening (zie
// trouwwebsite-roadmap.md). Toont voortaan dezelfde thematische site als de
// publieke /trouwen/[slug]-route — zelfde data (getSiteData), zelfde
// thema-renderer — met één verschil: de gast is al herkend vóór de pagina
// rendert (resolve_rsvp_guest), dus het RSVP-blok slaat de zoekstap over en
// start meteen gepersonaliseerd (zie themes/shared.tsx). Deze route
// controleert het sitewachtwoord zelf nooit — de token is het bewijs dat
// deze bezoeker is uitgenodigd — en <AutoUnlock> zet daarnaast (best-effort,
// zie app/api/rsvp/auto-unlock) dezelfde ontgrendel-cookie die de publieke
// /trouwen/{slug}-route zelf ook leest, zodat een gast die van hieruit
// doorklikt naar de kale sitelink niet alsnog tegen het wachtwoordscherm
// aanloopt.

interface ResolvedGuest {
  slug: string
  guest: GevondenGast
}

async function resolveGuest(token: string): Promise<ResolvedGuest | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('resolve_rsvp_guest', { p_token: token })
  if (error || !data) return null
  return data as unknown as ResolvedGuest
}

export async function generateMetadata({
  params,
}: {
  params: { token: string; pagina?: string[] }
}): Promise<Metadata> {
  const resolved = await resolveGuest(params.token)
  // Nooit indexeren: dit is een persoonlijke link, geen publieke pagina.
  if (!resolved) return { title: 'Persoonlijke uitnodiging', robots: { index: false } }

  const result = await getSiteData(resolved.slug)
  const wedding = result?.v2?.wedding ?? result?.v1?.wedding
  const titel = wedding ? `${wedding.partner1Naam} & ${wedding.partner2Naam}` : 'Persoonlijke uitnodiging'
  return {
    title: titel,
    description: `Hoi ${resolved.guest.voornaam}, dit is je persoonlijke uitnodiging. Laat weten of je erbij bent.`,
    robots: { index: false },
  }
}

export default async function PersoonlijkeRsvpPage({
  params,
}: {
  params: { token: string; pagina?: string[] }
}) {
  const resolved = await resolveGuest(params.token)
  if (!resolved) notFound()

  const pageSlug = pageSlugVan(params.pagina)
  if (pageSlug === null) notFound()

  const result = await getSiteData(resolved.slug)
  if (!result) notFound()

  if (result.v2) {
    // Onbekende sub-pagina: 404 i.p.v. stilzwijgend terugvallen op home.
    if (pageSlug !== '' && !result.v2.pages.some((p) => p.pageSlug === pageSlug)) notFound()
    const tokenGast: TokenGast = { token: params.token, gast: resolved.guest }
    return (
      <>
        <AutoUnlock token={params.token} />
        <PublicWebsiteV2
          data={result.v2}
          registry={result.registry}
          slug={resolved.slug}
          activePageSlug={pageSlug}
          basisPad={`/rsvp/${params.token}`}
          tokenGast={tokenGast}
        />
      </>
    )
  }

  // Legacy (niet-geconverteerde) sites kennen geen sub-pagina's en geen
  // thema-renderers — gewoon de normale publieke weergave, zonder
  // personalisatie (beter dan de oude losse RSVP-pagina, nog niet het volle
  // gepersonaliseerde RSVP-blok van v2).
  if (pageSlug !== '') notFound()
  return (
    <>
      <AutoUnlock token={params.token} />
      <PublicWebsite data={result.v1!} registry={result.registry} slug={resolved.slug} />
    </>
  )
}
