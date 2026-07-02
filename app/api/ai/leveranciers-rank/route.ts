import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

import { mapBusinessRow, type BusinessRow } from '@/lib/bruiloft/suppliers/business-types'
import { bouwProfiel, rangschik, type SupplierMatch } from '@/lib/bruiloft/suppliers/match'
import type { VendorType } from '@/lib/bruiloft/types'
import { logAiUsage } from '@/lib/ai/usage'
import { createClient } from '@/lib/supabase/server'
import { createRawAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Hybride leveranciers-ranking (#24/#16): de snelle rekenregel maakt een
// voorselectie, Gemini herrangschikt de beste opties op stijl/sfeer (tags +
// ai_context_tekst) die een formule niet kan wegen. Alleen voor de kleine
// dashboard-set (top 6); resultaat wordt per bruiloft gecachet. Faalt altijd
// zacht terug op de rekenregel, zodat het dashboard nooit zonder suggesties zit.

const KANDIDATEN = 14
const TOP = 6
const FETCH_CAP = 400
const COOLDOWN_MS = 12 * 60 * 60 * 1000

export interface AISupplierMatch extends SupplierMatch {
  aiReden?: string
}

interface ProfielBody {
  budget?: number
  woonplaats?: string
  provincie?: string
  daggasten?: number
  avondgasten?: number
  geboekt?: string[]
  dagen?: number
  richtbudget?: Record<string, number>
}

function buildRankPrompt(kandidaten: SupplierMatch[]): string {
  const lijst = kandidaten.map((m) => ({
    id: m.supplier.id,
    naam: m.supplier.naam,
    soort: m.supplier.type || m.supplier.categorie,
    categorie: m.supplier.categorie,
    plaats: m.supplier.plaats,
    prijsVanaf: m.supplier.prijsVanaf,
    score: m.score,
    badges: m.badges,
    tags: m.supplier.tags,
    context: m.supplier.aiContextTekst || m.supplier.omschrijvingKort,
  }))
  return `Je bent een Nederlandse trouwplanner. Hieronder staat een voorselectie van leveranciers voor een bruidspaar, met een berekende matchscore, badges, tags en een korte omschrijving.

Kies de ${TOP} leveranciers die het béste bij dit paar passen en zet ze in volgorde van geschiktheid. Weeg naast budget, regio en capaciteit (die al in score/badges zitten) vooral de sfeer en stijl uit de tags en omschrijving mee, en zorg voor een logische spreiding over categorieën waar dat kan.

Kandidaten:
${JSON.stringify(lijst, null, 2)}

Geef ALLEEN een JSON-array van precies ${TOP} objecten terug, in volgorde van best naar minder:
[{ "id": "<supplier id>", "reden": "één korte zin in het Nederlands waarom dit bij hen past" }]`
}

function parseRanking(text: string): Array<{ id: string; reden: string }> {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  const parsed = JSON.parse(cleaned)
  if (!Array.isArray(parsed)) return []
  return parsed
    .filter((x) => x && typeof x.id === 'string')
    .map((x) => ({ id: x.id as string, reden: typeof x.reden === 'string' ? x.reden : '' }))
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  let body: { weddingId?: string; profiel?: ProfielBody }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldige request' }, { status: 400 })
  }
  const weddingId = body.weddingId
  if (!weddingId) return NextResponse.json({ error: 'weddingId ontbreekt' }, { status: 400 })

  const { data: member } = await supabase
    .from('wedding_members')
    .select('role')
    .eq('wedding_id', weddingId)
    .eq('user_id', user.id)
    .single()
  if (!member) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })

  const p = body.profiel ?? {}
  const profiel = bouwProfiel(
    {
      totaalBudget: p.budget ?? 0,
      woonplaats: p.woonplaats ?? '',
      provincie: p.provincie,
      aantalDaggasten: p.daggasten ?? 0,
      aantalAvondgasten: p.avondgasten ?? 0,
      dagenTotBruiloft: p.dagen,
      richtbudgetPerBudgetCategorie: p.richtbudget,
    },
    (p.geboekt ?? []) as VendorType[]
  )

  const admin = createRawAdminClient()

  // Rekenregel-voorselectie (de veilige basis + fallback). Bron: businesses,
  // dezelfde directory als /api/businesses/search — daar staat de daadwerkelijk
  // gevulde data (Trouwlocaties, Weddingplanners, Trouwambtenaren, ...), niet in
  // de oudere (grotendeels lege) public.suppliers-tabel.
  const { data: supplierRows } = await admin.from('businesses').select('*').limit(FETCH_CAP)
  const alle = ((supplierRows ?? []) as BusinessRow[]).map(mapBusinessRow)
  const gerangschikt = rangschik(alle, profiel)
  const kandidaten = gerangschikt.slice(0, KANDIDATEN)
  const regelTop: AISupplierMatch[] = kandidaten.slice(0, TOP)

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || kandidaten.length === 0) {
    return NextResponse.json({ matches: regelTop, source: 'regel' })
  }

  // Cache: vingerafdruk op de kandidaat-ids; herrangschik alleen bij wijziging
  // of na de cooldown.
  const fingerprint = kandidaten.map((m) => m.supplier.id).join(',')
  const { data: cacheRow } = await admin
    .from('ai_supplier_rank_cache')
    .select('cached_ranking, data_fingerprint, last_updated_at')
    .eq('wedding_id', weddingId)
    .maybeSingle()

  const kandidaatPerId = new Map(kandidaten.map((m) => [m.supplier.id, m]))
  const bouwUitRanking = (ranking: Array<{ id: string; reden: string }>): AISupplierMatch[] => {
    const uit: AISupplierMatch[] = []
    for (const r of ranking) {
      const m = kandidaatPerId.get(r.id)
      if (m) uit.push({ ...m, aiReden: r.reden })
    }
    return uit
  }

  if (cacheRow) {
    const vers = Date.now() - new Date(cacheRow.last_updated_at).getTime() < COOLDOWN_MS
    if (vers && cacheRow.data_fingerprint === fingerprint) {
      const uit = bouwUitRanking(cacheRow.cached_ranking as Array<{ id: string; reden: string }>)
      if (uit.length > 0) return NextResponse.json({ matches: uit, source: 'ai-cache' })
    }
  }

  const MODEL = 'gemini-2.5-flash'
  const start = Date.now()
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: MODEL,
      generationConfig: { responseMimeType: 'application/json' },
    })
    const prompt = buildRankPrompt(kandidaten)
    const result = await model.generateContent(prompt)
    const tekst = result.response.text()
    const ranking = parseRanking(tekst).slice(0, TOP)

    logAiUsage({
      endpoint: 'leveranciers-rank',
      model: MODEL,
      latencyMs: Date.now() - start,
      success: true,
      promptChars: prompt.length,
      responseChars: tekst.length,
      userId: user.id,
      weddingId,
    })

    const uit = bouwUitRanking(ranking)
    if (uit.length === 0) {
      return NextResponse.json({ matches: regelTop, source: 'regel' })
    }

    await admin.from('ai_supplier_rank_cache').upsert(
      {
        wedding_id: weddingId,
        cached_ranking: ranking,
        data_fingerprint: fingerprint,
        last_updated_at: new Date().toISOString(),
      },
      { onConflict: 'wedding_id' }
    )

    return NextResponse.json({ matches: uit, source: 'ai' })
  } catch (err) {
    console.error('[api/ai/leveranciers-rank] Gemini fout:', err)
    logAiUsage({
      endpoint: 'leveranciers-rank',
      model: MODEL,
      latencyMs: Date.now() - start,
      success: false,
      error: err instanceof Error ? err.message : String(err),
      userId: user.id,
      weddingId,
    })
    return NextResponse.json({ matches: regelTop, source: 'regel' })
  }
}
