import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

import type { AIWeddingContext } from '@/lib/bruiloft/aiContext'
import { deriveErvaringsniveau } from '@/lib/bruiloft/aiContext'
import { logAiUsage } from '@/lib/ai/usage'
import { teVeelVerzoekenBericht } from '@/lib/ai/rateLimitMessage'
import { checkRateLimit } from '@/lib/rateLimit'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Geldige rollen voor 'betrokkenen' (spiegelt DRAAIBOEK_ROLLEN); de AI mag
// alleen deze waarden gebruiken zodat ze 1-op-1 op het bestaande model passen.
const GELDIGE_ROLLEN = [
  'bruid',
  'bruidegom',
  'bruidspaar',
  'ceremoniemeester',
  'fotograaf',
  'videograaf',
  'dj of band',
  'catering',
  'locatie',
  'vervoer',
  'gasten',
  'overig',
] as const

export interface AIDraaiboekSuggestie {
  tijd: string // 'HH:MM'
  eindtijd: string // 'HH:MM' of leeg
  titel: string
  omschrijving: string
  locatie: string
  betrokkenen: string[]
  reden: string
}

export interface AIDraaiboekAdvies {
  samenvatting: string
  items: AIDraaiboekSuggestie[]
}

const MIN_COOLDOWN_MS = 60 * 60 * 1000 // 1 uur
const MAX_CACHE_AGE_MS = 6 * 60 * 60 * 1000 // 6 uur

function buildDraaiboekFingerprint(ctx: AIWeddingContext, bestaandeItems: string[]): string {
  return [
    'v1',
    ctx.bruidspaar.trouwdatum,
    ctx.bruidspaar.ceremonietype ?? '',
    ctx.draaiboek.aantalItems,
    bestaandeItems.length,
  ].join(':')
}

function buildDraaiboekPrompt(ctx: AIWeddingContext, bestaandeItems: string[]): string {
  const gebruikerSectie = ctx.gebruiker
    ? `\nGebruikerscontext: ervaringsniveau '${ctx.gebruiker.ervaringsniveau}'. Bij 'nieuw' meer toelichting per onderdeel.\n`
    : ''

  const geboekt = Object.entries(ctx.leveranciers.status)
    .filter(([, s]) => s === 'geboekt')
    .map(([k]) => k)

  return `Je bent een ervaren Nederlandse trouwplanner. Stel een realistisch draaiboek (dagindeling) voor de trouwdag van ${ctx.bruidspaar.partner1} en ${ctx.bruidspaar.partner2} op.${gebruikerSectie}

Bruiloftdetails:
- Trouwdatum: ${ctx.bruidspaar.trouwdatum}
- Locatie: ${ctx.bruidspaar.locatie}
- Gasten: ${ctx.gasten.daggasten} daggasten, ${ctx.gasten.avondgasten} avondgasten
- Type ceremonie: ${ctx.bruidspaar.ceremonietype ?? 'niet ingesteld'}
- Geboekte leveranciers: ${geboekt.length > 0 ? geboekt.join(', ') : '(nog geen)'}
- Aantal bestaande draaiboekonderdelen: ${ctx.draaiboek.aantalItems}

Bestaande onderdelen (NIET opnieuw voorstellen):
${bestaandeItems.length > 0 ? bestaandeItems.map((t) => `- ${t}`).join('\n') : '(geen)'}

Stel 6-9 logisch op elkaar aansluitende onderdelen voor die:
1. Nog NIET in het bestaande draaiboek staan
2. Een realistische chronologische dagindeling vormen met concrete start- en eindtijden (HH:MM)
3. Passen bij het type ceremonie (bij religieus: kerkdienst; bij gemeentelijk: ceremonie op locatie/gemeentehuis)
4. Alleen leveranciersrollen noemen die logisch zijn; gebruik voor 'betrokkenen' UITSLUITEND deze waarden: ${GELDIGE_ROLLEN.join(', ')}
5. Rekening houden met daggasten vs. avondgasten (bijv. avondprogramma als er avondgasten zijn)

Schrijf alles in het Nederlands, kort en concreet.

Geef ALLEEN een JSON-object terug:
{
  "samenvatting": "1-2 zinnen over de voorgestelde dagindeling",
  "items": [
    {
      "tijd": "HH:MM",
      "eindtijd": "HH:MM",
      "titel": "Beknopte naam van het onderdeel",
      "omschrijving": "Wat gebeurt er",
      "locatie": "Waar (mag leeg als onbekend)",
      "betrokkenen": ["bruidspaar", "fotograaf"],
      "reden": "Waarom dit onderdeel handig is"
    }
  ]
}`
}

const TIJD_REGEX = /^\d{1,2}:\d{2}$/

function parseResponse(text: string): AIDraaiboekAdvies {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  const parsed = JSON.parse(cleaned) as AIDraaiboekAdvies
  // Normaliseer/valideer zodat de suggesties direct op het ScheduleItem-model passen.
  const items = (Array.isArray(parsed.items) ? parsed.items : [])
    .filter((i) => i && typeof i.titel === 'string' && TIJD_REGEX.test(i.tijd ?? ''))
    .map((i) => ({
      tijd: i.tijd,
      eindtijd: TIJD_REGEX.test(i.eindtijd ?? '') ? i.eindtijd : '',
      titel: String(i.titel).slice(0, 200),
      omschrijving: String(i.omschrijving ?? '').slice(0, 500),
      locatie: String(i.locatie ?? '').slice(0, 200),
      betrokkenen: (Array.isArray(i.betrokkenen) ? i.betrokkenen : []).filter((r) =>
        (GELDIGE_ROLLEN as readonly string[]).includes(r)
      ),
      reden: String(i.reden ?? '').slice(0, 300),
    }))
    .sort((a, b) => a.tijd.localeCompare(b.tijd))
  return { samenvatting: String(parsed.samenvatting ?? ''), items }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI niet geconfigureerd' }, { status: 503 })
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  void (supabase as any).from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', user.id)

  let body: { context: AIWeddingContext; weddingId: string; bestaandeItems?: string[] }
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

  const bestaandeItems = (body.bestaandeItems ?? []).slice(0, 100).map((t) => String(t).slice(0, 200))

  // Cache check eerst — kost geen Gemini-call, mag dus nooit door de rate
  // limiter geblokkeerd worden.
  const fingerprint = buildDraaiboekFingerprint(body.context, bestaandeItems)
  const now = Date.now()
  const { data: cacheRow } = await (supabase as any)
    .from('ai_draaiboek_cache')
    .select('cached_advies, data_fingerprint, last_updated_at')
    .eq('wedding_id', body.weddingId)
    .maybeSingle()

  if (cacheRow) {
    const cacheAge = now - new Date(cacheRow.last_updated_at).getTime()
    if (cacheAge < MAX_CACHE_AGE_MS && (cacheRow.data_fingerprint === fingerprint || cacheAge < MIN_COOLDOWN_MS)) {
      const nextAvailableAt = new Date(new Date(cacheRow.last_updated_at).getTime() + MIN_COOLDOWN_MS)
      return NextResponse.json({
        advies: cacheRow.cached_advies as AIDraaiboekAdvies,
        cached: true,
        next_available_at: nextAvailableAt.toISOString(),
      })
    }
  }

  // Alleen bij een echte generatie telt dit mee voor de limiet van 1x per uur.
  const rl = await checkRateLimit(`ai:draaiboek:${body.weddingId}`, 1, 60 * 60)
  if (!rl.allowed) {
    if (cacheRow?.cached_advies) {
      return NextResponse.json({
        advies: cacheRow.cached_advies as AIDraaiboekAdvies,
        cached: true,
        next_available_at: rl.resetAt.toISOString(),
      })
    }
    return NextResponse.json(
      { error: teVeelVerzoekenBericht(rl.resetAt), next_available_at: rl.resetAt.toISOString() },
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

  const MODEL = 'gemini-2.5-flash'
  const startTijd = Date.now()
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: MODEL,
      generationConfig: { responseMimeType: 'application/json' },
    })
    const prompt = buildDraaiboekPrompt(enrichedContext, bestaandeItems)
    const result = await model.generateContent(prompt)
    const tekst = result.response.text()
    const advies = parseResponse(tekst)

    logAiUsage({
      endpoint: 'draaiboek',
      model: MODEL,
      latencyMs: Date.now() - startTijd,
      success: true,
      promptChars: prompt.length,
      responseChars: tekst.length,
      userId: user.id,
      weddingId: body.weddingId,
    })

    void (supabase as any).from('ai_draaiboek_cache').upsert(
      { wedding_id: body.weddingId, cached_advies: advies, data_fingerprint: fingerprint, last_updated_at: new Date().toISOString() },
      { onConflict: 'wedding_id' }
    )
    return NextResponse.json({
      advies,
      cached: false,
      next_available_at: new Date(now + MIN_COOLDOWN_MS).toISOString(),
    })
  } catch (err) {
    console.error('[api/ai/draaiboek] Gemini fout:', err)
    logAiUsage({
      endpoint: 'draaiboek',
      model: MODEL,
      latencyMs: Date.now() - startTijd,
      success: false,
      error: err instanceof Error ? err.message : String(err),
      userId: user.id,
      weddingId: body.weddingId,
    })
    if (cacheRow?.cached_advies) {
      return NextResponse.json({
        advies: cacheRow.cached_advies as AIDraaiboekAdvies,
        cached: true,
        next_available_at: new Date(now + MIN_COOLDOWN_MS).toISOString(),
      })
    }
    return NextResponse.json({ error: 'AI tijdelijk niet beschikbaar' }, { status: 502 })
  }
}
