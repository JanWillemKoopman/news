import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

import type { AIWeddingContext } from '@/lib/bruiloft/aiContext'
import { deriveErvaringsniveau } from '@/lib/bruiloft/aiContext'
import { checkRateLimit } from '@/lib/rateLimit'
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

function buildTakenPrompt(ctx: AIWeddingContext, bestaandeTaken: string[]): string {
  const vandaag = new Date().toISOString().slice(0, 10)
  const gebruikerSectie = ctx.gebruiker
    ? `\nGebruikerscontext: ervaringsniveau '${ctx.gebruiker.ervaringsniveau}'. Stel bij 'nieuw' ook basisstappen voor die ervaren gebruikers al kennen.\n`
    : ''

  return `Je bent een ervaren Nederlandse trouwplanner. Stel een persoonlijke takenlijst voor ${ctx.bruidspaar.partner1} en ${ctx.bruidspaar.partner2} op.${gebruikerSectie}

Bruiloftdetails:
- Trouwdatum: ${ctx.bruidspaar.trouwdatum}
- Dagen te gaan: ${ctx.bruidspaar.dagenTotBruiloft}
- Locatie: ${ctx.bruidspaar.locatie}
- Vandaag: ${vandaag}

Huidige situatie:
- Taken: ${ctx.taken.totaal} totaal (${ctx.taken.open} open, ${ctx.taken.bezig} in uitvoering, ${ctx.taken.klaar} klaar, ${ctx.taken.achterstallig} achterstallig)
- Budget: €${ctx.budget.totaal} totaal, €${ctx.budget.resterend} resterend
- Leveranciersstatus (in het systeem): ${JSON.stringify(ctx.leveranciers.status)}
- Gasten: ${ctx.gasten.totaal} totaal (${ctx.gasten.bevestigd} bevestigd, ${ctx.gasten.geenReactie} geen reactie)
- Draaiboek items: ${ctx.draaiboek.aantalItems}
- Urgente taken: ${JSON.stringify(ctx.taken.urgenteTaken)}
- Aankomende betalingen: ${JSON.stringify(ctx.betalingen.aankomend)}
${ctx.bruidspaar.ceremonietype ? `- Type ceremonie: ${ctx.bruidspaar.ceremonietype}` : ''}
${Object.keys(ctx.bruidspaar.geregeldeZaken).length > 0 ? `- Door het stel opgegeven voortgang (buiten het systeem): ${JSON.stringify(ctx.bruidspaar.geregeldeZaken)}` : ''}

Bestaande taken (NIET opnieuw voorstellen):
${bestaandeTaken.length > 0 ? bestaandeTaken.map((t) => `- ${t}`).join('\n') : '(geen)'}

Stel 8-12 relevante en persoonlijke taken voor die:
1. Nog NIET in de bestaande takenlijst staan
2. Aansluiten bij de huidige fase (${ctx.bruidspaar.dagenTotBruiloft} dagen te gaan)
3. Rekening houden met niet-geboekte leveranciers — stel NOOIT een taak voor een categorie die al als 'geboekt' is opgegeven
4. Prioriteit geven aan categorieën die als 'bezig' zijn opgegeven of nog niet geregeld zijn
5. Bij een religieuze ceremonie: voeg kerk-specifieke taken toe (priester/dominee, kerkboek)
6. Bij een symbolische ceremonie: geen taken over gemeentelijke registratie

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

  void (supabase as any).from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', user.id)

  let body: { context: AIWeddingContext; weddingId: string; bestaandeTaken?: string[] }
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

  const rl = await checkRateLimit(`ai:taken:${user.id}`, 10, 60 * 60)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Te veel verzoeken, probeer het over een uur opnieuw.' },
      { status: 429 }
    )
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

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    })
    const bestaandeTaken = (body.bestaandeTaken ?? [])
      .slice(0, 100)
      .map((t) => String(t).slice(0, 200))
    const result = await model.generateContent(
      buildTakenPrompt(enrichedContext, bestaandeTaken)
    )
    const advies = parseResponse(result.response.text())
    return NextResponse.json({ advies })
  } catch (err) {
    console.error('[api/ai/taken] Gemini fout:', err)
    return NextResponse.json({ error: 'AI tijdelijk niet beschikbaar' }, { status: 502 })
  }
}
