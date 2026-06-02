import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

import { buildAIContext } from '@/lib/bruiloft/aiContext'
import {
  budgetItemFromRow,
  guestFromRow,
  scheduleItemFromRow,
  taskFromRow,
  vendorFromRow,
  weddingFromRow,
  websiteContentFromRow,
} from '@/lib/bruiloft/mappers'
import { withRetry, withTimeout, extractJSON, adviesResponseSchema } from '@/lib/bruiloft/aiUtils'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export interface AIAdvies {
  id: string
  titel: string
  omschrijving: string
  urgentie: 'kritiek' | 'binnenkort' | 'normaal'
  sectie: string
  sectionLabel: string
}

function buildPrompt(ctx: ReturnType<typeof buildAIContext>): string {
  const dagLabel =
    ctx.bruidspaar.dagenTotBruiloft > 0
      ? `${ctx.bruidspaar.dagenTotBruiloft} dagen te gaan`
      : ctx.bruidspaar.dagenTotBruiloft === 0
        ? 'vandaag is de dag!'
        : 'al getrouwd'

  return `Je bent een ervaren persoonlijke Nederlandse trouwplanner-assistent. \
Je helpt ${ctx.bruidspaar.partner1} en ${ctx.bruidspaar.partner2} bij de voorbereiding van hun bruiloft \
op ${ctx.bruidspaar.trouwdatum} in ${ctx.bruidspaar.locatie} (${dagLabel}).

Actuele situatie van hun planning:
${JSON.stringify(ctx, null, 2)}

Analyseer alle onderdelen (taken, budget, gasten, leveranciers, draaiboek, betalingen) grondig \
en geef precies 4 tot 5 geprioriteerde "Volgende Beste Acties" die het koppel NU moet ondernemen.

Regels:
- Baseer elke actie op concrete getallen/feiten uit de context (noem specifieke aantallen, bedragen)
- Schrijf in het Nederlands, persoonlijk en warm van toon
- urgentie: 'kritiek' = deadline verstreken of minder dan 7 dagen, 'binnenkort' = 7–30 dagen of hoog risico, 'normaal' = proactief
- sectie: pad naar de relevante pagina, een van: /bruiloft/taken | /bruiloft/budget | /bruiloft/gasten | /bruiloft/leveranciers | /bruiloft/draaiboek | /bruiloft/tafels
- sectionLabel: gebruiksvriendelijke naam van die sectie (bijv. 'Taken', 'Budget', 'Gasten', etc.)
- id: uniek per actie, gebruik 'ai-1', 'ai-2', etc.

Geef ALLEEN een JSON-array terug, geen andere tekst, in dit formaat:
[
  {
    "id": "ai-1",
    "titel": "...",
    "omschrijving": "...",
    "urgentie": "kritiek|binnenkort|normaal",
    "sectie": "/bruiloft/...",
    "sectionLabel": "..."
  }
]`
}

const GEMINI_TIMEOUT = 25_000

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

  let body: { weddingId: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldige request' }, { status: 400 })
  }

  if (!body.weddingId) {
    return NextResponse.json({ error: 'weddingId ontbreekt' }, { status: 400 })
  }

  const { weddingId } = body

  const { data: member } = await supabase
    .from('wedding_members')
    .select('role')
    .eq('wedding_id', weddingId)
    .eq('user_id', user.id)
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Geen toegang tot deze bruiloft' }, { status: 403 })
  }

  const { data: allowed } = await supabase.rpc('ai_rate_limit_increment', {
    p_wedding_id: weddingId,
    p_endpoint: 'advice',
    p_max_calls: 20,
  })
  if (!allowed) {
    return NextResponse.json(
      { error: 'Te veel verzoeken, probeer het over een uur opnieuw.' },
      { status: 429 }
    )
  }

  const [
    { data: weddingRow },
    { data: taskRows },
    { data: vendorRows },
    { data: budgetRows },
    { data: guestRows },
    { data: scheduleRows },
    { data: websiteRow },
  ] = await Promise.all([
    supabase.from('weddings').select('*').eq('id', weddingId).single(),
    supabase.from('tasks').select('*').eq('wedding_id', weddingId),
    supabase.from('vendors').select('*').eq('wedding_id', weddingId),
    supabase.from('budget_items').select('*').eq('wedding_id', weddingId),
    supabase.from('guests').select('*').eq('wedding_id', weddingId),
    supabase.from('schedule_items').select('*').eq('wedding_id', weddingId),
    supabase.from('website_content').select('*').eq('wedding_id', weddingId).single(),
  ])

  if (!weddingRow) {
    return NextResponse.json({ error: 'Bruiloft niet gevonden' }, { status: 404 })
  }

  const context = buildAIContext(
    weddingFromRow(weddingRow),
    (taskRows ?? []).map(taskFromRow),
    (vendorRows ?? []).map(vendorFromRow),
    (budgetRows ?? []).map(budgetItemFromRow),
    (guestRows ?? []).map(guestFromRow),
    (scheduleRows ?? []).map(scheduleItemFromRow),
    websiteRow ? websiteContentFromRow(websiteRow) : null,
  )

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    })

    const result = await withRetry(() =>
      withTimeout(model.generateContent(buildPrompt(context)), GEMINI_TIMEOUT)
    )

    const advies = adviesResponseSchema.parse(JSON.parse(extractJSON(result.response.text())))
    return NextResponse.json({ advies })
  } catch (err) {
    console.error('[api/ai/advice] Gemini fout:', err)
    return NextResponse.json({ error: 'AI tijdelijk niet beschikbaar' }, { status: 502 })
  }
}
