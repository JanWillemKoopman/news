import { NextResponse } from 'next/server'

import { TPW_CATEGORIEEN } from '@/lib/bruiloft/options'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Aantal leveranciers per categorie, voor het categorie-overzicht op
// /bruiloft/ontdekken. De directory verandert hooguit dagelijks, dus de
// tellingen worden per serverinstantie een uur in het geheugen bewaard —
// twintig count-queries per uur i.p.v. per paginabezoek.

const CACHE_TTL_MS = 60 * 60 * 1000
let cache: { tellingen: Record<string, number>; ts: number } | null = null

export async function GET() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json({ tellingen: cache.tellingen })
  }

  try {
    const paren = await Promise.all(
      TPW_CATEGORIEEN.map(async (categorie) => {
        const { count, error } = await (supabase as any)
          .from('tpw_businesses')
          .select('tpw_id', { count: 'exact', head: true })
          .eq('categorie', categorie)
        if (error) throw error
        return [categorie, count ?? 0] as const
      })
    )
    const tellingen = Object.fromEntries(paren)
    cache = { tellingen, ts: Date.now() }
    return NextResponse.json({ tellingen })
  } catch (err) {
    console.error('[api/ontdekken/categorieen] fout:', err)
    return NextResponse.json({ error: 'Tellingen ophalen mislukt' }, { status: 500 })
  }
}
