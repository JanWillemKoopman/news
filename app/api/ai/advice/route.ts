import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

import type { AIWeddingContext } from '@/lib/bruiloft/aiContext'

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

// Eenvoudige in-memory rate limiter: max 20 calls per uur per wedding.
const rateMap = new Map<string, { count: number; reset: number }>()

function checkRateLimit(weddingId: string): boolean {
  const now = Date.now()
  const entry = rateMap.get(weddingId)
  if (!entry || now > entry.reset) {
    rateMap.set(weddingId, { count: 1, reset: now + 60 * 60 * 1000 })
    return true
  }
  if (entry.count >= 20) return false
  entry.count++
  return true
}

function buildPrompt(ctx: AIWeddingContext): string {
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

function parseAdvies(text: string): AIAdvies[] {
  // Verwijder eventuele markdown code blocks
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  const parsed = JSON.parse(cleaned)
  if (!Array.isArray(parsed)) return []
  return parsed.filter(
    (item): item is AIAdvies =>
      typeof item.id === 'string' &&
      typeof item.titel === 'string' &&
      typeof item.omschrijving === 'string' &&
      ['kritiek', 'binnenkort', 'normaal'].includes(item.urgentie) &&
      typeof item.sectie === 'string' &&
      typeof item.sectionLabel === 'string'
  )
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI niet geconfigureerd' }, { status: 503 })
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

  if (!checkRateLimit(body.weddingId)) {
    return NextResponse.json({ error: 'Te veel verzoeken, probeer het over een uur opnieuw.' }, { status: 429 })
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    })
    const result = await model.generateContent(buildPrompt(body.context))
    const advies = parseAdvies(result.response.text())
    return NextResponse.json({ advies })
  } catch (err) {
    console.error('[api/ai/advice] Gemini fout:', err)
    return NextResponse.json({ error: 'AI tijdelijk niet beschikbaar' }, { status: 502 })
  }
}
