import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

import type { AIWeddingContext } from '@/lib/bruiloft/aiContext'
import { deriveErvaringsniveau } from '@/lib/bruiloft/aiContext'
import { logAiUsage } from '@/lib/ai/usage'
import { checkRateLimit } from '@/lib/rateLimit'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export interface AIBudgetAdvies {
  statusEnSuccessen: {
    algemeneIndruk: string
    sterkePunten: string[]
  }
  risicosEnBlindeVlekken: {
    verbeterpunten: string[]
    ontbrekendeKosten: string[]
  }
  marktvergelijking: {
    begrootVsDaadwerkelijk: string
    benchmarkAnalyse: string
  }
  conclusieEnAdvies: {
    haalbaarheid: string
    actiepunten: string[]
  }
}

const MIN_COOLDOWN_MS = 30 * 60 * 1000   // 30 min
const MAX_CACHE_AGE_MS = 4 * 60 * 60 * 1000  // 4 uur

function buildBudgetFingerprint(ctx: AIWeddingContext): string {
  return [
    'v2',
    Math.round(ctx.budget.totaal),
    Math.round(ctx.budget.betaald),
    Math.round(ctx.budget.geoffreerd),
    ctx.budget.perCategorie.length,
    ctx.budget.ontbrekendeCategorieën.length,
    ctx.betalingen.aankomend.length,
  ].join(':')
}

function buildBudgetPrompt(ctx: AIWeddingContext): string {
  const gebruikerSectie = ctx.gebruiker
    ? `\nGebruikerscontext: ervaringsniveau '${ctx.gebruiker.ervaringsniveau}'. Pas diepgang van uitleg hierop aan.\n`
    : ''

  return `Je bent een ervaren Nederlandse trouwplanner gespecialiseerd in budgetbeheer. \
Analyseer het budget van ${ctx.bruidspaar.partner1} en ${ctx.bruidspaar.partner2} \
voor hun bruiloft op ${ctx.bruidspaar.trouwdatum} (${ctx.bruidspaar.dagenTotBruiloft} dagen te gaan).${gebruikerSectie}

Budget overzicht:
${JSON.stringify(ctx.budget, null, 2)}

Leveranciersstatus:
${JSON.stringify(ctx.leveranciers, null, 2)}

Aankomende betalingen:
${JSON.stringify(ctx.betalingen, null, 2)}

Schrijf een overzichtelijk, lopend verhaal in 4 delen — geen losse opsomming van losstaande punten, maar een samenhangende analyse waarin je de lezer meeneemt. Let op:
- Vergelijk geoffreerde bedragen per categorie met het richtbedrag (Nederlandse praktijk)
- Signaleer categorieën die over of significant onder het richtbedrag zitten
- Waarschuw voor ontbrekende categorieën die ze mogelijk vergeten zijn (denk aan servicekosten, fooien, styling, vervoer, of een onvoorziene buffer van ~10%)
- Vergelijk begrote bedragen met de daadwerkelijke offertes/betalingen tot nu toe
- Benchmark de kosten per categorie (catering, locatie, kleding, etc.) tegen het marktgemiddelde voor een bruiloft van deze omvang en stijl
- Wijs op aankomende betalingen die aandacht nodig hebben
- Schrijf in het Nederlands, concreet, vriendelijk en in volledige zinnen (geen telegramstijl)

Geef ALLEEN een JSON-object terug in dit formaat:
{
  "statusEnSuccessen": {
    "algemeneIndruk": "2-3 zinnen: korte samenvatting van het totale budget en de huidige voortgang",
    "sterkePunten": ["welke posten zijn slim ingeschat, waar zijn al deals gesloten of kosten bespaard — elk punt 1 volzin"]
  },
  "risicosEnBlindeVlekken": {
    "verbeterpunten": ["posten die nu al over budget dreigen te gaan of te optimistisch zijn begroot — elk punt 1 volzin"],
    "ontbrekendeKosten": ["cruciale 'vergeten' posten die vaak over het hoofd worden gezien — elk punt 1 volzin"]
  },
  "marktvergelijking": {
    "begrootVsDaadwerkelijk": "2-3 zinnen: hoe verhouden de initiële schattingen zich tot de werkelijke offertes en betalingen tot nu toe",
    "benchmarkAnalyse": "2-3 zinnen: hoe scoren de kosten per categorie vergeleken met het marktgemiddelde voor een bruiloft van deze omvang en stijl"
  },
  "conclusieEnAdvies": {
    "haalbaarheid": "1-2 zinnen: is het budget in de huidige vorm realistisch",
    "actiepunten": ["directe, strategische adviezen om te schuiven met budgetten of te heronderhandelen — elk punt 1 volzin"]
  }
}`
}

function parseBudgetAdvies(text: string): AIBudgetAdvies {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(cleaned) as AIBudgetAdvies
}

// Oude cache-rijen bevatten nog het vlakke opsommings-schema; die mogen niet
// als het nieuwe verhaal-schema teruggegeven worden.
function isNieuwSchema(advies: unknown): advies is AIBudgetAdvies {
  return Boolean(advies && typeof advies === 'object' && 'statusEnSuccessen' in advies)
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI niet geconfigureerd' }, { status: 503 })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  void (supabase as any).from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', user.id)

  let body: { context: AIWeddingContext; weddingId: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldige request' }, { status: 400 })
  }

  if (!body.context || !body.weddingId) {
    return NextResponse.json({ error: 'Ontbrekende context of weddingId' }, { status: 400 })
  }

  const { data: member } = await supabase
    .from('wedding_members')
    .select('role')
    .eq('wedding_id', body.weddingId)
    .eq('user_id', user.id)
    .single()
  if (!member) {
    return NextResponse.json({ error: 'Geen toegang tot deze bruiloft' }, { status: 403 })
  }

  const rl = await checkRateLimit(`ai:budget:${user.id}`, 10, 60 * 60)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Te veel verzoeken, probeer het over een uur opnieuw.' }, { status: 429 })
  }

  const [profileResult, activityResult] = await Promise.all([
    (supabase as any).from('profiles').select('created_at').eq('id', user.id).single(),
    (supabase as any)
      .from('wedding_activity')
      .select('*', { count: 'exact', head: true })
      .eq('actor_id', user.id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  const profielLeeftijdDagen = profileResult.data?.created_at
    ? Math.floor((Date.now() - new Date(profileResult.data.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const enrichedContext: AIWeddingContext = {
    ...body.context,
    gebruiker: {
      profielLeeftijdDagen,
      actiesLaatste30Dagen: activityResult.count ?? 0,
      ervaringsniveau: deriveErvaringsniveau(profielLeeftijdDagen, activityResult.count ?? 0),
    },
  }

  // Cache check
  const fingerprint = buildBudgetFingerprint(enrichedContext)
  const now = Date.now()
  const { data: cacheRow } = await (supabase as any)
    .from('ai_budget_cache')
    .select('cached_advies, data_fingerprint, last_updated_at')
    .eq('wedding_id', body.weddingId)
    .single()

  if (cacheRow && isNieuwSchema(cacheRow.cached_advies)) {
    const cacheAge = now - new Date(cacheRow.last_updated_at).getTime()
    if (cacheAge < MAX_CACHE_AGE_MS && (cacheRow.data_fingerprint === fingerprint || cacheAge < MIN_COOLDOWN_MS)) {
      return NextResponse.json({ advies: cacheRow.cached_advies as AIBudgetAdvies, cached: true })
    }
  }

  const MODEL = 'gemini-2.5-flash'
  const startTijd = Date.now()
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: MODEL,
      generationConfig: { responseMimeType: 'application/json' },
    })
    const prompt = buildBudgetPrompt(enrichedContext)
    const result = await model.generateContent(prompt)
    const tekst = result.response.text()
    const advies = parseBudgetAdvies(tekst)

    logAiUsage({
      endpoint: 'budget',
      model: MODEL,
      latencyMs: Date.now() - startTijd,
      success: true,
      promptChars: prompt.length,
      responseChars: tekst.length,
      userId: user.id,
      weddingId: body.weddingId,
    })

    void (supabase as any).from('ai_budget_cache').upsert(
      { wedding_id: body.weddingId, cached_advies: advies, data_fingerprint: fingerprint, last_updated_at: new Date().toISOString() },
      { onConflict: 'wedding_id' }
    )
    return NextResponse.json({ advies, cached: false })
  } catch (err) {
    console.error('[api/ai/budget] Gemini fout:', err)
    logAiUsage({
      endpoint: 'budget',
      model: MODEL,
      latencyMs: Date.now() - startTijd,
      success: false,
      error: err instanceof Error ? err.message : String(err),
      userId: user.id,
      weddingId: body.weddingId,
    })
    if (cacheRow && isNieuwSchema(cacheRow.cached_advies)) {
      return NextResponse.json({ advies: cacheRow.cached_advies as AIBudgetAdvies, cached: true })
    }
    return NextResponse.json({ error: 'AI tijdelijk niet beschikbaar' }, { status: 502 })
  }
}
