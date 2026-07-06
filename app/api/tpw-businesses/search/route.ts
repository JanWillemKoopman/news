import { NextRequest, NextResponse } from 'next/server'

import { afstandKm, boundingBox, STANDAARD_STRAAL } from '@/lib/bruiloft/discovery/geo'
import {
  mapOntdekRow,
  ONTDEK_KOLOMMEN,
  type OntdekBusiness,
  type OntdekRow,
} from '@/lib/bruiloft/discovery/types'
import { TPW_CATEGORIEEN, type TpwCategorie } from '@/lib/bruiloft/options'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Zoek-API voor /bruiloft/ontdekken (tpw_businesses, ±23.000 leveranciers).
//
// Het geografische zoeken werkt in twee stappen, zonder PostGIS-afhankelijkheid:
//   1. een lichte bounding-box-query (tpw_id, naam, lat, lon) rond het
//      zoekpunt — de database doet de grove voorselectie;
//   2. exacte Haversine-afstand per kandidaat, filteren op de cirkel,
//      sorteren en pas dáárna de volledige kolommen ophalen voor de
//      opgevraagde pagina. Zo blijft de payload klein, ook bij brede stralen.
//
// Bewust beperkt tot de basiskolommen (zie ONTDEK_KOLOMMEN) — ratings,
// prijzen en foto's volgen in een latere fase als per-categorie filters.

const DEFAULT_LIMIT = 24
const MAX_LIMIT = 48
// Maximum aantal kandidaten binnen een bounding box. Ruim boven de dichtst
// bevolkte categorie+regio-combinatie; de stap-1-query is drie kolommen breed.
const GEO_KANDIDATEN_CAP = 3000

const MIN_STRAAL = 1
const MAX_STRAAL = 100

function intParam(v: string | null, fallback: number): number {
  const n = v == null ? NaN : parseInt(v, 10)
  return Number.isFinite(n) ? n : fallback
}

function floatParam(v: string | null): number | null {
  const n = v == null ? NaN : parseFloat(v)
  return Number.isFinite(n) ? n : null
}

// PostgREST's .or()-syntax kent komma's en haakjes als scheidingstekens —
// die mogen dus niet letterlijk vanuit de zoekterm de filterstring in.
function veiligeZoekterm(q: string): string {
  return q.replace(/[,()]/g, ' ').trim()
}

interface GeoKandidaat {
  tpw_id: number
  naam: string | null
  lat: number | string | null
  lon: number | string | null
}

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  const sp = request.nextUrl.searchParams

  const categorie = sp.get('categorie') as TpwCategorie | null
  if (!categorie || !TPW_CATEGORIEEN.includes(categorie)) {
    return NextResponse.json({ error: 'Onbekende categorie' }, { status: 400 })
  }

  const lat = floatParam(sp.get('lat'))
  const lon = floatParam(sp.get('lon'))
  const straal = Math.min(
    MAX_STRAAL,
    Math.max(MIN_STRAAL, intParam(sp.get('straal'), STANDAARD_STRAAL))
  )
  const heeftLocatie = lat != null && lon != null

  const q = veiligeZoekterm(sp.get('q') ?? '')
  const alleenMetEmail = sp.get('mail') === '1'
  const sort = sp.get('sort') === 'naam' ? 'naam' : heeftLocatie ? 'afstand' : 'naam'
  const page = Math.max(1, intParam(sp.get('page'), 1))
  const limit = Math.min(MAX_LIMIT, Math.max(1, intParam(sp.get('limit'), DEFAULT_LIMIT)))
  const from = (page - 1) * limit

  // Gedeelde filters voor beide paden.
  const metFilters = (query: any) => {
    query = query.eq('categorie', categorie)
    if (alleenMetEmail) query = query.not('email', 'is', null).neq('email', '')
    if (q) query = query.or(`naam.ilike.%${q}%,beschrijving.ilike.%${q}%`)
    return query
  }

  try {
    if (!heeftLocatie) {
      // Zonder plaats: heel Nederland, alfabetisch, paginering in de database.
      const { data, error, count } = await metFilters(
        (supabase as any).from('tpw_businesses').select(ONTDEK_KOLOMMEN, { count: 'exact' })
      )
        .order('naam', { ascending: true, nullsFirst: false })
        .range(from, from + limit - 1)
      if (error) throw error
      const items = ((data ?? []) as OntdekRow[]).map((row) => mapOntdekRow(row))
      return NextResponse.json({ items, totaal: count ?? items.length, page, limit })
    }

    // Stap 1: grove voorselectie via bounding box (alleen id, naam, coördinaten).
    const middelpunt = { lat: lat!, lon: lon! }
    const box = boundingBox(middelpunt, straal)
    const { data: kandidatenData, error: boxError } = await metFilters(
      (supabase as any).from('tpw_businesses').select('tpw_id,naam,lat,lon')
    )
      .gte('lat', box.latMin)
      .lte('lat', box.latMax)
      .gte('lon', box.lonMin)
      .lte('lon', box.lonMax)
      .limit(GEO_KANDIDATEN_CAP)
    if (boxError) throw boxError

    // Stap 2: exacte cirkel-afstand, filteren en sorteren.
    const binnenStraal = ((kandidatenData ?? []) as GeoKandidaat[])
      .map((k) => {
        const kLat = Number(k.lat)
        const kLon = Number(k.lon)
        if (!Number.isFinite(kLat) || !Number.isFinite(kLon)) return null
        return { ...k, afstand: afstandKm(middelpunt, { lat: kLat, lon: kLon }) }
      })
      .filter((k): k is GeoKandidaat & { afstand: number } => k != null && k.afstand <= straal)

    binnenStraal.sort((a, b) =>
      sort === 'naam'
        ? (a.naam ?? '').localeCompare(b.naam ?? '', 'nl') || a.afstand - b.afstand
        : a.afstand - b.afstand || (a.naam ?? '').localeCompare(b.naam ?? '', 'nl')
    )

    const totaal = binnenStraal.length
    const pagina = binnenStraal.slice(from, from + limit)
    if (pagina.length === 0) {
      return NextResponse.json({ items: [], totaal, page, limit })
    }

    // Stap 3: volledige kolommen voor alleen de rijen op deze pagina.
    const ids = pagina.map((k) => k.tpw_id)
    const { data: rijenData, error: rijenError } = await (supabase as any)
      .from('tpw_businesses')
      .select(ONTDEK_KOLOMMEN)
      .in('tpw_id', ids)
    if (rijenError) throw rijenError

    const perId = new Map<number, OntdekRow>(
      ((rijenData ?? []) as OntdekRow[]).map((r) => [r.tpw_id, r])
    )
    const items: OntdekBusiness[] = []
    for (const kandidaat of pagina) {
      const rij = perId.get(kandidaat.tpw_id)
      if (rij) items.push(mapOntdekRow(rij, Math.round(kandidaat.afstand * 10) / 10))
    }

    return NextResponse.json({ items, totaal, page, limit })
  } catch (err) {
    console.error('[api/tpw-businesses/search] fout:', err)
    return NextResponse.json({ error: 'Zoeken mislukt' }, { status: 500 })
  }
}
