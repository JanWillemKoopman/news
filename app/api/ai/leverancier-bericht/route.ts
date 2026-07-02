import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

import { logAiUsage } from '@/lib/ai/usage'
import { weddingFromRow } from '@/lib/bruiloft/mappers'
import { bouwContactTemplate, bouwOfferteTemplate, type BerichtConcept } from '@/lib/bruiloft/suppliers/berichtTemplates'
import { categorieRichtbudget } from '@/lib/bruiloft/suppliers/match'
import { checkRateLimit } from '@/lib/rateLimit'
import { createRawAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// AI-conceptbericht voor de offerte-/contactknop op een leverancierskaart.
// "Offerte" roept dit altijd aan (volledig gegenereerd bericht); "Contact"
// alleen op verzoek ("Verbeter met AI"), met de eigen vraag van de gebruiker
// als extra context. Faalt altijd zacht terug op het deterministische
// sjabloon uit berichtTemplates.ts — de knop mag nooit vastlopen op Gemini.

const RATE_LIMIT_MAX = 20
const RATE_LIMIT_WINDOW_S = 60 * 60

interface RequestBody {
  weddingId?: string
  type?: 'offerte' | 'contact'
  vendor?: { naam?: string; categorie?: string }
  vraag?: string
}

function parseConcept(text: string): BerichtConcept | null {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    if (
      parsed &&
      typeof parsed.onderwerp === 'string' &&
      typeof parsed.bericht === 'string' &&
      parsed.onderwerp.trim() &&
      parsed.bericht.trim()
    ) {
      return { onderwerp: parsed.onderwerp.trim(), bericht: parsed.bericht.trim() }
    }
  } catch {
    // Ongeldige JSON: valt terug op het sjabloon.
  }
  return null
}

function buildPrompt(
  type: 'offerte' | 'contact',
  wedding: ReturnType<typeof weddingFromRow>,
  vendor: { naam: string; categorie: string },
  richtbudget: number,
  vraag?: string
): string {
  const context = {
    partner1: wedding.partner1Naam,
    partner2: wedding.partner2Naam,
    trouwdatum: wedding.trouwdatum || null,
    aantalGasten: Math.max(wedding.aantalDaggasten, wedding.aantalAvondgasten) || null,
    leverancier: vendor.naam,
    categorie: vendor.categorie || null,
    richtbudgetIndicatie: richtbudget > 0 ? Math.round(richtbudget) : null,
  }

  if (type === 'offerte') {
    return `Je schrijft namens een Nederlands bruidspaar een beknopt, beleefd e-mailbericht aan een trouwleverancier om een vrijblijvende offerte aan te vragen.

Gegevens van het bruidspaar (JSON):
${JSON.stringify(context, null, 2)}

Richtlijnen:
- Nederlands, warm en beleefd, niet overdreven formeel.
- Noem de trouwdatum als die bekend is, en het aantal gasten als dat relevant is voor deze categorie.
- Noem GEEN concreet budget of bedrag — "richtbudgetIndicatie" is alleen interne context om de toon te bepalen, niet om te vermelden.
- Vraag concreet om een vrijblijvende offerte met beschikbaarheid en prijzen.
- Maximaal ~150 woorden.
- Sluit af met "Met vriendelijke groet," gevolgd door de voornamen van het paar.

Geef ALLEEN dit JSON-object terug: { "onderwerp": "...", "bericht": "..." }`
  }

  return `Je schrijft namens een Nederlands bruidspaar een beknopt, beleefd e-mailbericht aan een trouwleverancier om een vraag te stellen. De gebruiker heeft zelf al een korte vraag getypt; weef die samen met een korte introductie tot één samenhangend, natuurlijk lopend bericht — verzin geen extra vragen die de gebruiker niet heeft gesteld.

Gegevens van het bruidspaar (JSON):
${JSON.stringify(context, null, 2)}

De vraag van de gebruiker (letterlijk, verwerk de inhoud hiervan — parafraseer gerust voor leesbaarheid maar voeg niets inhoudelijks toe):
"""
${vraag ?? ''}
"""

Richtlijnen:
- Nederlands, warm en beleefd, niet overdreven formeel.
- Noem de trouwdatum kort als die bekend is.
- Maximaal ~120 woorden.
- Sluit af met "Met vriendelijke groet," gevolgd door de voornamen van het paar.

Geef ALLEEN dit JSON-object terug: { "onderwerp": "...", "bericht": "..." }`
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  let body: RequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldige request' }, { status: 400 })
  }

  const weddingId = body.weddingId
  const type = body.type
  const vendor = { naam: body.vendor?.naam?.trim() ?? '', categorie: body.vendor?.categorie?.trim() ?? '' }
  if (!weddingId || (type !== 'offerte' && type !== 'contact')) {
    return NextResponse.json({ error: 'Ongeldige request' }, { status: 400 })
  }

  const { data: member } = await supabase
    .from('wedding_members')
    .select('role')
    .eq('wedding_id', weddingId)
    .eq('user_id', user.id)
    .single()
  if (!member) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })

  const admin = createRawAdminClient()
  const { data: weddingRow } = await admin.from('weddings').select('*').eq('id', weddingId).single()
  if (!weddingRow) return NextResponse.json({ error: 'Bruiloft niet gevonden' }, { status: 404 })
  const wedding = weddingFromRow(weddingRow)

  // Sjabloon-fallback altijd eerst berekenen: de knop mag nooit vastlopen.
  const fallback: BerichtConcept =
    type === 'offerte'
      ? bouwOfferteTemplate(wedding, vendor)
      : bouwContactTemplate(wedding, vendor, body.vraag)

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ ...fallback, source: 'sjabloon' })
  }

  const rl = await checkRateLimit(`ai:leverancier-bericht:${weddingId}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_S)
  if (!rl.allowed) {
    return NextResponse.json({ ...fallback, source: 'sjabloon' })
  }

  const richtbudget = vendor.categorie ? categorieRichtbudget(wedding, vendor.categorie) : 0
  const MODEL = 'gemini-2.5-flash'
  const start = Date.now()
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: MODEL,
      generationConfig: { responseMimeType: 'application/json' },
    })
    const prompt = buildPrompt(type, wedding, vendor, richtbudget, body.vraag)
    const result = await model.generateContent(prompt)
    const tekst = result.response.text()
    const concept = parseConcept(tekst)

    logAiUsage({
      endpoint: 'leverancier-bericht',
      model: MODEL,
      latencyMs: Date.now() - start,
      success: concept != null,
      promptChars: prompt.length,
      responseChars: tekst.length,
      userId: user.id,
      weddingId,
    })

    if (!concept) return NextResponse.json({ ...fallback, source: 'sjabloon' })
    return NextResponse.json({ ...concept, source: 'ai' })
  } catch (err) {
    console.error('[api/ai/leverancier-bericht] Gemini fout:', err)
    logAiUsage({
      endpoint: 'leverancier-bericht',
      model: MODEL,
      latencyMs: Date.now() - start,
      success: false,
      error: err instanceof Error ? err.message : String(err),
      userId: user.id,
      weddingId,
    })
    return NextResponse.json({ ...fallback, source: 'sjabloon' })
  }
}
