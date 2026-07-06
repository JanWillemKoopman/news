import { NextRequest, NextResponse } from 'next/server'

import type { ZoekPlaats } from '@/lib/bruiloft/discovery/types'

export const runtime = 'nodejs'

// Proxy op de PDOK Locatieserver (Kadaster) — de officiële, gratis geocoder
// met alle Nederlandse woonplaatsen, inclusief kleine kernen en gehuchten.
// Twee vormen:
//   ?q=dies   → autocomplete-suggesties (ngram-matching + typefout-herstel)
//   ?id=wpl-… → coördinaten en context van één gekozen woonplaats
// Publieke data, dus geen login vereist; wél CDN-caching per URL zodat we
// PDOK niet bij elke toetsaanslag van elke gebruiker opnieuw raken.

const PDOK_BASIS = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1'
const TIMEOUT_MS = 6000
const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=3600, s-maxage=604800, stale-while-revalidate=86400',
}

interface SuggestDoc {
  id: string
  type: string
  weergavenaam: string
}

interface LookupDoc {
  woonplaatsnaam?: string
  gemeentenaam?: string
  provincienaam?: string
  centroide_ll?: string
}

export interface PlaatsSuggestie {
  id: string
  naam: string
  context: string // "Hilvarenbeek, Noord-Brabant"
}

async function pdok(pad: string, params: Record<string, string>): Promise<any> {
  const url = new URL(`${PDOK_BASIS}/${pad}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url, {
    headers: { 'User-Agent': 'wedding-planner-app' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`PDOK ${res.status}`)
  return res.json()
}

function naarSuggestie(doc: SuggestDoc): PlaatsSuggestie {
  const [naam, ...rest] = doc.weergavenaam.split(',').map((s) => s.trim())
  return { id: doc.id, naam, context: rest.join(', ') }
}

async function zoekSuggesties(q: string): Promise<PlaatsSuggestie[]> {
  const data = await pdok('suggest', { q, fq: 'type:woonplaats', rows: '8' })
  let docs: SuggestDoc[] = data?.response?.docs ?? []

  // Typefout ("driesen") → geen directe hits, maar de spellchecker weet vaak
  // wél wat er bedoeld werd. De suggesties zijn gerangschikt op
  // tekstafstand, niet op bestaan-als-woonplaats ("driesken" kan vóór
  // "diessen" staan) — dus stil de eerste paar proberen tot er één raakt.
  if (docs.length === 0) {
    const suggesties: unknown[] = data?.spellcheck?.suggestions ?? []
    const blok = suggesties.find(
      (s): s is { suggestion: string[] } =>
        typeof s === 'object' && s != null && Array.isArray((s as any).suggestion)
    )
    for (const alternatief of blok?.suggestion?.slice(0, 4) ?? []) {
      const retry = await pdok('suggest', { q: alternatief, fq: 'type:woonplaats', rows: '8' })
      docs = retry?.response?.docs ?? []
      if (docs.length > 0) break
    }
  }
  return docs.map(naarSuggestie)
}

function parseCentroide(punt: string | undefined): { lat: number; lon: number } | null {
  // Formaat: "POINT(5.18565909 51.46855274)" — lon eerst, dan lat.
  const m = punt?.match(/POINT\(([\d.-]+)\s+([\d.-]+)\)/)
  if (!m) return null
  const lon = Number(m[1])
  const lat = Number(m[2])
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null
}

async function lookupPlaats(id: string): Promise<ZoekPlaats | null> {
  const data = await pdok('lookup', {
    id,
    fl: 'woonplaatsnaam,gemeentenaam,provincienaam,centroide_ll',
  })
  const doc: LookupDoc | undefined = data?.response?.docs?.[0]
  const coord = parseCentroide(doc?.centroide_ll)
  if (!doc?.woonplaatsnaam || !coord) return null
  return {
    naam: doc.woonplaatsnaam,
    gemeente: doc.gemeentenaam ?? '',
    provincie: doc.provincienaam ?? '',
    lat: coord.lat,
    lon: coord.lon,
  }
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const q = sp.get('q')?.trim()
  const id = sp.get('id')?.trim()

  try {
    if (id) {
      const plaats = await lookupPlaats(id)
      if (!plaats) {
        return NextResponse.json({ error: 'Plaats niet gevonden' }, { status: 404 })
      }
      return NextResponse.json({ plaats }, { headers: CACHE_HEADERS })
    }

    if (q && q.length >= 2) {
      const suggesties = await zoekSuggesties(q)
      return NextResponse.json({ suggesties }, { headers: CACHE_HEADERS })
    }

    return NextResponse.json({ suggesties: [] }, { headers: CACHE_HEADERS })
  } catch (err) {
    console.error('[api/ontdekken/plaatsen] PDOK-fout:', err)
    return NextResponse.json({ error: 'Plaatsen zoeken is nu niet beschikbaar' }, { status: 502 })
  }
}
