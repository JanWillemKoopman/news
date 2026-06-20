import { NextRequest, NextResponse } from 'next/server'

import { bouwProfiel, rangschik, type SupplierMatch } from '@/lib/bruiloft/suppliers/match'
import { mapSupplierRow, type SupplierRow } from '@/lib/bruiloft/suppliers/types'
import type { VendorType } from '@/lib/bruiloft/types'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Maximaal aantal kandidaten dat we voor een "beste match"-sortering uit de DB
// halen en in het geheugen rangschikken. Filters knijpen de set meestal ruim
// hieronder; bij grotere sets dekt dit de relevante kop af.
const CANDIDATE_CAP = 400
const DEFAULT_LIMIT = 24
const MAX_LIMIT = 48

function intParam(v: string | null, fallback: number): number {
  const n = v == null ? NaN : parseInt(v, 10)
  return Number.isFinite(n) ? n : fallback
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

  // Filters
  const categorie = sp.get('categorie')
  const plaats = sp.get('plaats')
  const provincie = sp.get('provincie') // harde filter (door gebruiker gekozen)
  const q = sp.get('q')?.trim()
  const prijsMin = sp.get('prijsMin')
  const prijsMax = sp.get('prijsMax')
  const buitenTrouwen = sp.get('buitenTrouwen') === 'true'
  const overnachting = sp.get('overnachting') === 'true'

  // Sortering + paginatie
  const sort = (sp.get('sort') ?? 'match') as 'match' | 'naam' | 'prijs'
  const page = Math.max(1, intParam(sp.get('page'), 1))
  const limit = Math.min(MAX_LIMIT, Math.max(1, intParam(sp.get('limit'), DEFAULT_LIMIT)))

  // Profiel voor de ranking (door de client meegegeven uit de store).
  const profiel = bouwProfiel(
    {
      totaalBudget: intParam(sp.get('budget'), 0),
      woonplaats: sp.get('woonplaats') ?? '',
      // Woonprovincie van het bruidspaar: stuurt de "in jullie regio"-weging.
      // Los van de harde provinciefilter, zodat aanbevelingen niet onnodig
      // worden ingeperkt maar regio wél meeweegt in de score.
      provincie: sp.get('profielProvincie')?.trim() || provincie?.trim() || undefined,
      aantalDaggasten: intParam(sp.get('daggasten'), 0),
      aantalAvondgasten: intParam(sp.get('avondgasten'), 0),
      // Dagen tot de bruiloft stuurt de boekvolgorde-prioriteit (#3).
      dagenTotBruiloft: sp.get('dagen') != null ? intParam(sp.get('dagen'), 0) : undefined,
    },
    (sp.get('geboekt') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean) as VendorType[]
  )

  // Basale, herbruikbare filterquery. `suppliers` staat nog niet in
  // database.types.ts, dus we benaderen de tabel ongetypeerd (zoals de
  // bestaande AI-routes met cache-tabellen doen).
  const build = () => {
    let query = (supabase as any).from('suppliers').select('*', { count: 'exact' })
    if (categorie) query = query.eq('categorie', categorie)
    if (plaats) query = query.ilike('plaats', `%${plaats}%`)
    if (provincie) query = query.eq('provincie', provincie)
    if (buitenTrouwen) query = query.eq('buiten_trouwen', true)
    if (overnachting) query = query.eq('overnachting_mogelijk', true)
    if (prijsMin) query = query.gte('prijs_vanaf', Number(prijsMin))
    if (prijsMax) query = query.lte('prijs_vanaf', Number(prijsMax))
    if (q) query = query.textSearch('search_vector', q, { type: 'websearch', config: 'dutch' })
    return query
  }

  try {
    if (sort === 'naam' || sort === 'prijs') {
      // Lichte paden: laat Postgres sorteren en pagineren.
      const from = (page - 1) * limit
      let query = build()
      query =
        sort === 'naam'
          ? query.order('naam', { ascending: true })
          : query.order('prijs_vanaf', { ascending: true, nullsFirst: false })
      const { data, error, count } = await query.range(from, from + limit - 1)
      if (error) throw error
      const rows = (data ?? []) as SupplierRow[]
      const matches: SupplierMatch[] = rows
        .map(mapSupplierRow)
        .map((supplier) => ({ supplier, score: 0, badges: [], binnenBudget: false, uitleg: '' }))
      return NextResponse.json({ matches, total: count ?? rows.length, page, limit })
    }

    // "Beste match": haal een begrensde kandidatenset op en rangschik in geheugen.
    const { data, error, count } = await build().limit(CANDIDATE_CAP)
    if (error) throw error
    const rows = (data ?? []) as SupplierRow[]
    const gerangschikt = rangschik(rows.map(mapSupplierRow), profiel)
    const from = (page - 1) * limit
    const matches = gerangschikt.slice(from, from + limit)
    return NextResponse.json({ matches, total: count ?? gerangschikt.length, page, limit })
  } catch (err) {
    console.error('[api/suppliers/search] fout:', err)
    return NextResponse.json({ error: 'Zoeken mislukt' }, { status: 500 })
  }
}
