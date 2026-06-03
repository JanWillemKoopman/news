import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

import type { AIWeddingContext } from '@/lib/bruiloft/aiContext'
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

const rateMap = new Map<string, { count: number; reset: number }>()

function checkRateLimit(weddingId: string): boolean {
  const now = Date.now()
  const entry = rateMap.get(weddingId)
  if (!entry || now > entry.reset) {
    rateMap.set(weddingId, { count: 1, reset: now + 60 * 60 * 1000 })
    return true
  }
  if (entry.count >= 10) return false
  entry.count++
  return true
}

function buildTakenPrompt(ctx: AIWeddingContext, bestaandeTaken: string[]): string {
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

function parseResponse(text: string): AITakenAdvies {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(cleaned) as AITakenAdvies
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

  let body: { context: AIWeddingContext; weddingId: string; bestaandeTaken?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldige request' }, { status: 400 })
  }

  if (!body.context || !body.weddingId) {
    return NextResponse.json({ error: 'Ontbrekende context of weddingId' }, { status: 400 })
  }

  if (!checkRateLimit(body.weddingId)) {
    return NextResponse.json(
      { error: 'Te veel verzoeken, probeer het over een uur opnieuw.' },
      { status: 429 }
    )
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    })
    const result = await model.generateContent(
      buildTakenPrompt(body.context, body.bestaandeTaken ?? [])
    )
    const advies = parseResponse(result.response.text())
    return NextResponse.json({ advies })
  } catch (err) {
    console.error('[api/ai/taken] Gemini fout:', err)
    return NextResponse.json({ error: 'AI tijdelijk niet beschikbaar' }, { status: 502 })
  }
}
