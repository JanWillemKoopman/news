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
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ---- Types ------------------------------------------------------------------

export type AIModuleStatus = 'op_schema' | 'actie_vereist' | 'kritiek' | 'niet_gestart'

export interface AIConcreteActie {
  tekst: string
  link?: string
}

export interface AIModuleAdvies {
  status: AIModuleStatus
  globaal_advies: string
  concrete_acties: AIConcreteActie[]
}

export interface AIGlobaleStatus {
  status: 'op_schema' | 'actie_vereist' | 'kritiek'
  samenvatting: string
  score: number
}

export type AIModuleKey = 'taken' | 'budget' | 'leveranciers' | 'draaiboek' | 'gasten' | 'website'

export interface AIWeddingPlannerAdvies {
  globaal: AIGlobaleStatus
  modules: Record<AIModuleKey, AIModuleAdvies>
  generatedAt: string
}

export interface AIWeddingPlannerResponse {
  advies: AIWeddingPlannerAdvies | null
  cached: boolean
  next_available_at: string
}

// ---- Rate limit -------------------------------------------------------------

const COOLDOWN_MS = 10 * 60 * 1000 // 10 minuten

function nextAvailableAt(lastUpdatedAt: string | null): Date {
  if (!lastUpdatedAt) return new Date()
  return new Date(new Date(lastUpdatedAt).getTime() + COOLDOWN_MS)
}

function isWithinCooldown(lastUpdatedAt: string | null): boolean {
  if (!lastUpdatedAt) return false
  return Date.now() < new Date(lastUpdatedAt).getTime() + COOLDOWN_MS
}

// ---- Prompt builders --------------------------------------------------------

type AIWeddingContext = ReturnType<typeof buildAIContext>

const PLANNER_PERSONA = `Je bent een professionele, empathische maar daadkrachtige Nederlandse trouwplanner met 15 jaar ervaring. Je helpt koppels stap voor stap hun droombruiloft te organiseren. Je schrijft in het Nederlands, persoonlijk en warm maar ook concreet en to-the-point. Geef nooit vage adviezen — wees altijd specifiek en stuur het koppel aan tot actie.`

function buildModulePrompt(key: AIModuleKey, ctx: AIWeddingContext): string {
  const dagLabel =
    ctx.bruidspaar.dagenTotBruiloft > 0
      ? `${ctx.bruidspaar.dagenTotBruiloft} dagen te gaan`
      : ctx.bruidspaar.dagenTotBruiloft === 0
        ? 'vandaag is de dag!'
        : 'al getrouwd'

  const moduleData: Record<AIModuleKey, unknown> = {
    taken: ctx.taken,
    budget: { ...ctx.budget, betalingen: ctx.betalingen },
    leveranciers: ctx.leveranciers,
    draaiboek: ctx.draaiboek,
    gasten: ctx.gasten,
    website: ctx.website,
  }

  const moduleNamen: Record<AIModuleKey, string> = {
    taken: 'Taken',
    budget: 'Budget',
    leveranciers: 'Leveranciers',
    draaiboek: 'Draaiboek',
    gasten: 'Gastenbeheer',
    website: 'Website',
  }

  const moduleLinks: Record<AIModuleKey, string> = {
    taken: '/bruiloft/taken',
    budget: '/bruiloft/budget',
    leveranciers: '/bruiloft/leveranciers',
    draaiboek: '/bruiloft/draaiboek',
    gasten: '/bruiloft/gasten',
    website: '/bruiloft/website',
  }

  return `${PLANNER_PERSONA}

Je analyseert het onderdeel "${moduleNamen[key]}" voor ${ctx.bruidspaar.partner1} en ${ctx.bruidspaar.partner2}, bruiloft op ${ctx.bruidspaar.trouwdatum} in ${ctx.bruidspaar.locatie} (${dagLabel}).

Actuele data voor dit onderdeel:
${JSON.stringify(moduleData[key], null, 2)}

Geef als wedding planner een eerlijk en concreet advies over dit onderdeel. Wees specifiek: noem aantallen, bedragen en deadlines als die beschikbaar zijn. Stuur het koppel aan tot directe actie. Gebruik de link "${moduleLinks[key]}" in concrete_acties wanneer je verwijst naar dit onderdeel.

Status-regels:
- "niet_gestart": er is nog niets ingevuld/gedaan in dit onderdeel
- "op_schema": alles ziet er goed uit, kleine verbeterpunten mogelijk
- "actie_vereist": er zijn duidelijke aandachtspunten die opgepakt moeten worden
- "kritiek": er zijn dringende problemen die direct aandacht vereisen (verlopen deadlines, ontbrekende kritieke leveranciers, etc.)

Geef ALLEEN een JSON-object terug in dit exacte formaat:
{
  "status": "op_schema|actie_vereist|kritiek|niet_gestart",
  "globaal_advies": "2-3 zinnen over de status van dit onderdeel als professionele wedding planner",
  "concrete_acties": [
    { "tekst": "Specifieke actie die het koppel moet ondernemen", "link": "/bruiloft/..." }
  ]
}

Geef 2 tot 4 concrete acties. Elke actie is een duidelijke instructie, geen vage tip.`
}

function buildGlobaalPrompt(ctx: AIWeddingContext): string {
  const dagLabel =
    ctx.bruidspaar.dagenTotBruiloft > 0
      ? `${ctx.bruidspaar.dagenTotBruiloft} dagen te gaan`
      : 'vandaag of al gepasseerd'

  return `${PLANNER_PERSONA}

Je geeft een globaal overzicht van de volledige bruiloftplanning van ${ctx.bruidspaar.partner1} en ${ctx.bruidspaar.partner2}. Bruiloft op ${ctx.bruidspaar.trouwdatum} in ${ctx.bruidspaar.locatie} (${dagLabel}).

Volledige planning:
${JSON.stringify(ctx, null, 2)}

Geef als ervaren wedding planner een eerlijk globaal oordeel over waar dit koppel staat in hun planning. Wees warm maar realistisch. Beoordeel het algehele planningsniveau.

Score-richtlijnen (0-100):
- 80-100: planning loopt uitstekend, bijna alles is geregeld
- 60-79: goed op weg, maar er zijn nog duidelijke aandachtspunten
- 40-59: meerdere onderdelen vereisen actie, enige urgentie gepast
- 20-39: planning loopt achter, directe aandacht nodig
- 0-19: planning staat nog vrijwel nergens, kritieke actie vereist

Status-regels:
- "op_schema": score >= 65 en geen kritieke problemen
- "actie_vereist": score 35-64 of enkele dringende zaken
- "kritiek": score < 35 of verlopen deadlines / ontbrekende kritieke leveranciers met weinig tijd

Geef ALLEEN een JSON-object terug:
{
  "status": "op_schema|actie_vereist|kritiek",
  "samenvatting": "3-4 zinnen als persoonlijke wedding planner. Spreek het koppel direct aan. Wees eerlijk maar motiverend.",
  "score": 0-100
}`
}

// ---- JSON parser ------------------------------------------------------------

function parseJSON<T>(text: string): T {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(cleaned) as T
}

// ---- Route handler ----------------------------------------------------------

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI niet geconfigureerd' }, { status: 503 })
  }

  // Auth
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  let body: { weddingId: string; onlyFetchCache?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldige request' }, { status: 400 })
  }

  if (!body.weddingId) {
    return NextResponse.json({ error: 'weddingId ontbreekt' }, { status: 400 })
  }

  const { weddingId } = body

  // Verificeer lidmaatschap
  const { data: member } = await supabase
    .from('wedding_members')
    .select('role')
    .eq('wedding_id', weddingId)
    .eq('user_id', user.id)
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Geen toegang tot deze bruiloft' }, { status: 403 })
  }

  // Lees bestaande cache (tabel bestaat niet in database.types.ts, vandaar de cast)
  const { data: cacheRow } = await (supabase as any)
    .from('ai_wedding_planner_cache')
    .select('cached_advice, last_updated_at')
    .eq('wedding_id', weddingId)
    .single()

  const lastUpdatedAt = cacheRow?.last_updated_at ?? null
  const nextAvailable = nextAvailableAt(lastUpdatedAt)

  // Als alleen cache ophalen of binnen cooldown: retourneer gecachede data
  if (body.onlyFetchCache || isWithinCooldown(lastUpdatedAt)) {
    const advies =
      cacheRow && Object.keys(cacheRow.cached_advice).length > 0
        ? (cacheRow.cached_advice as AIWeddingPlannerAdvies)
        : null
    return NextResponse.json({
      advies,
      cached: true,
      next_available_at: nextAvailable.toISOString(),
    } satisfies AIWeddingPlannerResponse)
  }

  // Haal alle bruiloftdata op via de geauthenticeerde client.
  // De gebruiker is al geverifieerd als lid; RLS geeft leesstoegang tot alle data.
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

  const wedding = weddingFromRow(weddingRow)
  const tasks = (taskRows ?? []).map(taskFromRow)
  const vendors = (vendorRows ?? []).map(vendorFromRow)
  const budgetItems = (budgetRows ?? []).map(budgetItemFromRow)
  const guests = (guestRows ?? []).map(guestFromRow)
  const scheduleItems = (scheduleRows ?? []).map(scheduleItemFromRow)
  const websiteContent = websiteRow ? websiteContentFromRow(websiteRow) : null

  const context = buildAIContext(wedding, tasks, vendors, budgetItems, guests, scheduleItems, websiteContent)

  // 7 parallelle Gemini-aanroepen
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    })

    const moduleKeys: AIModuleKey[] = ['taken', 'budget', 'leveranciers', 'draaiboek', 'gasten', 'website']

    const [moduleResults, globaalResult] = await Promise.all([
      Promise.all(moduleKeys.map((key) => model.generateContent(buildModulePrompt(key, context)))),
      model.generateContent(buildGlobaalPrompt(context)),
    ])

    const modules = {} as Record<AIModuleKey, AIModuleAdvies>
    for (let i = 0; i < moduleKeys.length; i++) {
      modules[moduleKeys[i]] = parseJSON<AIModuleAdvies>(moduleResults[i].response.text())
    }

    const globaal = parseJSON<AIGlobaleStatus>(globaalResult.response.text())

    const advies: AIWeddingPlannerAdvies = {
      globaal,
      modules,
      generatedAt: new Date().toISOString(),
    }

    // Sla op in cache
    const now = new Date().toISOString()
    await (supabase as any)
      .from('ai_wedding_planner_cache')
      .upsert(
        { wedding_id: weddingId, cached_advice: advies, last_updated_at: now },
        { onConflict: 'wedding_id' }
      )

    return NextResponse.json({
      advies,
      cached: false,
      next_available_at: new Date(Date.now() + COOLDOWN_MS).toISOString(),
    } satisfies AIWeddingPlannerResponse)
  } catch (err) {
    console.error('[api/ai/wedding-planner] Gemini fout:', err)
    return NextResponse.json({ error: 'AI tijdelijk niet beschikbaar' }, { status: 502 })
  }
}
