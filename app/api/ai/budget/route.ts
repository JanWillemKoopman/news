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
import { withRetry, withTimeout, extractJSON, budgetAdviesSchema } from '@/lib/bruiloft/aiUtils'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export interface AIBudgetAdvies {
  samenvatting: string
  aandachtspunten: Array<{
    categorie: string
    bericht: string
    type: 'waarschuwing' | 'tip' | 'positief'
  }>
  algemeneRaad: string
}

function buildBudgetPrompt(ctx: ReturnType<typeof buildAIContext>): string {
  return `Je bent een ervaren Nederlandse trouwplanner gespecialiseerd in budgetbeheer. \
Analyseer het budget van ${ctx.bruidspaar.partner1} en ${ctx.bruidspaar.partner2} \
voor hun bruiloft op ${ctx.bruidspaar.trouwdatum} (${ctx.bruidspaar.dagenTotBruiloft} dagen te gaan).

Budget overzicht:
${JSON.stringify(ctx.budget, null, 2)}

Leveranciersstatus:
${JSON.stringify(ctx.leveranciers, null, 2)}

Aankomende betalingen:
${JSON.stringify(ctx.betalingen, null, 2)}

Geef een beknopte maar waardevolle budgetanalyse. Let op:
- Vergelijk geoffreerde bedragen per categorie met het richtbedrag (Nederlandse praktijk)
- Signaleer categorieën die over of significant onder het richtbedrag zitten
- Waarschuw voor ontbrekende categorieën die ze mogelijk vergeten zijn
- Wijs op aankomende betalingen die aandacht nodig hebben
- Schrijf in het Nederlands, concreet en vriendelijk

Geef ALLEEN een JSON-object terug in dit formaat:
{
  "samenvatting": "2-3 zinnen over de algehele budgetstatus",
  "aandachtspunten": [
    {
      "categorie": "naam van de categorie of betaling",
      "bericht": "specifiek en concreet advies",
      "type": "waarschuwing|tip|positief"
    }
  ],
  "algemeneRaad": "1-2 zinnen algemeen advies"
}`
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

  const { data: allowed, error: rpcError } = await supabase.rpc('ai_rate_limit_increment', {
    p_wedding_id: weddingId,
    p_endpoint: 'budget',
    p_max_calls: 10,
  })
  if (!rpcError && !allowed) {
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
      withTimeout(model.generateContent(buildBudgetPrompt(context)), GEMINI_TIMEOUT)
    )

    const advies = budgetAdviesSchema.parse(JSON.parse(extractJSON(result.response.text())))
    return NextResponse.json({ advies })
  } catch (err) {
    console.error('[api/ai/budget] Gemini fout:', err)
    return NextResponse.json({ error: 'AI tijdelijk niet beschikbaar' }, { status: 502 })
  }
}
