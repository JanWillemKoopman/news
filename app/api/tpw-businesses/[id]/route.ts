import { NextRequest, NextResponse } from 'next/server'

import { mapOntdekRow, ONTDEK_KOLOMMEN, type OntdekRow } from '@/lib/bruiloft/discovery/types'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Eén leverancier voor de detailpagina (/bruiloft/ontdekken/[categorie]/[id]).

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  const tpwId = parseInt(params.id, 10)
  if (!Number.isFinite(tpwId)) {
    return NextResponse.json({ error: 'Ongeldig id' }, { status: 400 })
  }

  try {
    const { data, error } = await (supabase as any)
      .from('tpw_businesses')
      .select(ONTDEK_KOLOMMEN)
      .eq('tpw_id', tpwId)
      .maybeSingle()
    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })
    }
    return NextResponse.json({ item: mapOntdekRow(data as OntdekRow) })
  } catch (err) {
    console.error('[api/tpw-businesses/[id]] fout:', err)
    return NextResponse.json({ error: 'Ophalen mislukt' }, { status: 500 })
  }
}
