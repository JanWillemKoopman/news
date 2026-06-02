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
import { withRetry, withTimeout, extractJSON, takenAdviesSchema } from '@/lib/bruiloft/aiUtils'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export interface AITaakSuggestie {
  titel: string
  omschrijving: string
  fase: string
  prioriteit: 'hoog' | 'midden' | 'laag'
  toegewezenAan: 'samen' | 'partner 1' | 'partner 2'
  deadline: string
  reden: string
}

export interface AITakenAdvies {
  samenvatting: string
  taken: AITaakSuggestie[]
}

function buildTakenPrompt(
  ctx: ReturnType<typeof buildAIContext>,
  bestaandeTaken: string[]
): string {
  const vandaag = new Date().toISOString().slice(0, 10)
  return `Je bent een ervaren Nederlandse trouwplanner. Stel een persoonlijke takenlijst voor ${ctx.bruidspaar.partner1} en ${ctx.bruidspaar.partner2} op.

Bruiloftdetails:
- Trouwdatum: ${ctx.bruidspaar.trouwdatum}
- Dagen te gaan: ${ctx.bruidspaar.dagenTotBruiloft}
- Locatie: ${ctx.bruidspaar.locatie}
- Vandaag: ${vandaag}

Huidige situatie:
- Taken: ${ctx.taken.totaal} totaal (${ctx.taken.open} open, ${ctx.taken.bezig} bezig, ${ctx.taken.klaar} klaar, ${ctx.taken.achterstallig} achterstallig)
- Budget: €${ctx.budget.totaal} totaal, €${ctx.budget.resterend} resterend
- Leveranciersstatus: ${JSON.stringify(ctx.leveranciers.status)}
- Gasten: ${ctx.gasten.totaal} totaal (${ctx.gasten.bevestigd} bevestigd, ${ctx.gasten.geenReactie} geen reactie)
- Draaiboek items: ${ctx.draaiboek.aantalItems}
- Urgente taken: ${JSON.stringify(ctx.taken.urgenteTaken)}
- Aankomende betalingen: ${JSON.stringify(ctx.betalingen.aankomend)}

Bestaande taken (NIET opnieuw voorstellen):
${bestaandeTaken.length > 0 ? bestaandeTaken.map((t) => `- ${t}`).join('\n') : '(geen)'}

Stel 8-12 relevante en persoonlijke taken voor die:
1. Nog NIET in de bestaande takenlijst staan
2. Aansluiten bij de huidige fase (${ctx.bruidspaar.dagenTotBruiloft} dagen te gaan)
3. Rekening houden met niet-geboekte leveranciers
4. Prioriteit geven aan wat ontbreekt of dringend is

Bereken concrete deadlines als ISO-datums (YYYY-MM-DD) op basis van de trouwdatum en de huidige situatie.
Gebruik "partner 1" voor taken specifiek voor ${ctx.bruidspaar.partner1}, "partner 2" voor ${ctx.bruidspaar.partner2}, of "samen".
Schrijf alles in het Nederlands.

Geef ALLEEN een JSON-object terug:
{
  "samenvatting": "1-2 zinnen waarom deze taken nu relevant zijn voor hun planning",
  "taken": [
    {
      "titel": "Beknopte taaknaam",
      "omschrijving": "Concrete uitleg wat er gedaan moet worden",
      "fase": "bijv. '6 maanden van tevoren' of 'Laatste maand'",
      "prioriteit": "hoog|midden|laag",
      "toegewezenAan": "samen|partner 1|partner 2",
      "deadline": "YYYY-MM-DD",
      "reden": "Waarom deze taak nu relevant is"
    }
  ]
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

  const { data: allowed } = await supabase.rpc('ai_rate_limit_increment', {
    p_wedding_id: weddingId,
    p_endpoint: 'taken',
    p_max_calls: 10,
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

  const bestaandeTaken = (taskRows ?? []).map((t) => t.titel as string).filter(Boolean)

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    })

    const result = await withRetry(() =>
      withTimeout(model.generateContent(buildTakenPrompt(context, bestaandeTaken)), GEMINI_TIMEOUT)
    )

    const advies = takenAdviesSchema.parse(JSON.parse(extractJSON(result.response.text())))
    return NextResponse.json({ advies })
  } catch (err) {
    console.error('[api/ai/taken] Gemini fout:', err)
    return NextResponse.json({ error: 'AI tijdelijk niet beschikbaar' }, { status: 502 })
  }
}
