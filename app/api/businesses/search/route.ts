import { NextRequest, NextResponse } from 'next/server'

import { mapBusinessRow, type BusinessRow } from '@/lib/bruiloft/suppliers/business-types'
import { bouwProfiel, rangschik, type SupplierMatch } from '@/lib/bruiloft/suppliers/match'
import type { VendorType } from '@/lib/bruiloft/types'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

  const categorie = sp.get('categorie')
  const plaats = sp.get('plaats')
  const provincie = sp.get('provincie')
  const q = sp.get('q')?.trim()

  const sort = (sp.get('sort') ?? 'match') as 'match' | 'naam'
  const page = Math.max(1, intParam(sp.get('page'), 1))
  const limit = Math.min(MAX_LIMIT, Math.max(1, intParam(sp.get('limit'), DEFAULT_LIMIT)))

  let richtbudgetMap: Record<string, number> | undefined
  const richtbudgetRaw = sp.get('richtbudget')
  if (richtbudgetRaw) {
    try {
      const parsed = JSON.parse(richtbudgetRaw)
      if (parsed && typeof parsed === 'object') richtbudgetMap = parsed as Record<string, number>
    } catch {
      // Ongeldige JSON: negeer.
    }
  }

  const profiel = bouwProfiel(
    {
      totaalBudget: intParam(sp.get('budget'), 0),
      woonplaats: sp.get('woonplaats') ?? '',
      provincie: sp.get('profielProvincie')?.trim() || provincie?.trim() || undefined,
      aantalDaggasten: intParam(sp.get('daggasten'), 0),
      aantalAvondgasten: intParam(sp.get('avondgasten'), 0),
      dagenTotBruiloft: sp.get('dagen') != null ? intParam(sp.get('dagen'), 0) : undefined,
      richtbudgetPerBudgetCategorie: richtbudgetMap,
    },
    (sp.get('geboekt') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean) as VendorType[]
  )

  const build = () => {
    let query = (supabase as any).from('businesses').select('*', { count: 'exact' })
    if (categorie) query = query.eq('categorie', categorie)
    if (plaats) query = query.ilike('plaats', `%${plaats}%`)
    if (provincie) query = query.eq('provincie', provincie)
    if (q) {
      query = query.textSearch('search_vector', q, { type: 'websearch', config: 'dutch' })
    }
    return query
  }

  try {
    if (sort === 'naam') {
      const from = (page - 1) * limit
      const { data, error, count } = await build()
        .order('naam', { ascending: true })
        .range(from, from + limit - 1)
      if (error) throw error
      const rows = (data ?? []) as BusinessRow[]
      const matches: SupplierMatch[] = rows
        .map(mapBusinessRow)
        .map((supplier) => ({ supplier, score: 0, badges: [], binnenBudget: false, uitleg: '' }))
      return NextResponse.json({ matches, total: count ?? rows.length, page, limit })
    }

    const { data, error, count } = await build().limit(CANDIDATE_CAP)
    if (error) throw error
    const rows = (data ?? []) as BusinessRow[]
    const gerangschikt = rangschik(rows.map(mapBusinessRow), profiel)
    const from = (page - 1) * limit
    const matches = gerangschikt.slice(from, from + limit)
    return NextResponse.json({ matches, total: count ?? gerangschikt.length, page, limit })
  } catch (err) {
    console.error('[api/businesses/search] fout:', err)
    return NextResponse.json({ error: 'Zoeken mislukt' }, { status: 500 })
  }
}
