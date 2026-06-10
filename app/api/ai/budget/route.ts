import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

import type { AIWeddingContext } from '@/lib/bruiloft/aiContext'
import { checkRateLimit } from '@/lib/rateLimit'
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

function buildBudgetPrompt(ctx: AIWeddingContext): string {
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

function parseBudgetAdvies(text: string): AIBudgetAdvies {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(cleaned) as AIBudgetAdvies
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

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    })
    const result = await model.generateContent(buildBudgetPrompt(body.context))
    const advies = parseBudgetAdvies(result.response.text())
    return NextResponse.json({ advies })
  } catch (err) {
    console.error('[api/ai/budget] Gemini fout:', err)
    return NextResponse.json({ error: 'AI tijdelijk niet beschikbaar' }, { status: 502 })
  }
}
