import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

import { buildAIContext, deriveErvaringsniveau } from '@/lib/bruiloft/aiContext'
import {
  budgetItemFromRow,
  guestFromRow,
  scheduleItemFromRow,
  taskFromRow,
  vendorFromRow,
  weddingFromRow,
  websiteContentFromRow,
} from '@/lib/bruiloft/mappers'
import { checkRateLimit } from '@/lib/rateLimit'
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

// ---- Cache-instellingen -----------------------------------------------------

// Minimale tijd tussen regeneraties (ook als data is veranderd).
const MIN_COOLDOWN_MS = 60 * 60 * 1000       // 1 uur
// Veiligheidsnet: cache nooit langer dan dit gebruiken.
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 dagen

// Rate limiter voor de handmatige Verversen-knop (max 3/uur).
// De wedding planner doet 7 parallelle AI-calls, dus conservatiever dan advice.

// ---- Vingerafdruk -----------------------------------------------------------

type AIWeddingContext = ReturnType<typeof buildAIContext>

function buildFingerprint(ctx: AIWeddingContext): string {
  const geboekt = Object.values(ctx.leveranciers.status).filter((s) => s === 'geboekt').length
  const voortgangHash = Object.entries(ctx.bruidspaar.geregeldeZaken).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${v}`).join(',')
  return [
    ctx.bruidspaar.trouwdatum,
    ctx.bruidspaar.locatie,
    ctx.bruidspaar.ceremonietype ?? '',
    ctx.taken.open,
    ctx.taken.klaar,
    ctx.taken.achterstallig,
    Math.round(ctx.budget.betaald),
    Math.round(ctx.budget.resterend),
    ctx.gasten.totaal,
    ctx.gasten.bevestigd,
    geboekt,
    ctx.draaiboek.aantalItems,
    voortgangHash,
  ].join(':')
}

// ---- Prompt builders --------------------------------------------------------

const PLANNER_PERSONA = `Je bent een professionele, empathische maar daadkrachtige Nederlandse trouwplanner met 15 jaar ervaring. Je helpt koppels stap voor stap hun droombruiloft te organiseren. Je schrijft in het Nederlands, persoonlijk en warm maar ook concreet en to-the-point. Geef nooit vage adviezen — wees altijd specifiek en stuur het koppel aan tot actie.

Belangrijke schrijfregels:
- Toon: kalm en opbouwend, nooit paniekerig; vermijd uitroeptekens en alarmwoorden als 'dringend', 'kritiek' of 'achterstand' in je lopende tekst.
- Noem NOOIT interne veld- of statusnamen letterlijk (zoals 'niet-geboekt', 'Geregelde Zaken' of andere waarden uit de data) — beschrijf de situatie in gewone mensentaal.
- Als de planning er grotendeels leeg uitziet en er nog ruim tijd is, is het koppel waarschijnlijk net begonnen: behandel dat als een normale, gezonde startpositie en geef een vriendelijke eerste-stappen-opbouw in plaats van een waarschuwing.`

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
    gasten: 'Gasten',
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

  const gebruikerSectie = ctx.gebruiker
    ? `\nGebruikerscontext: profiellooptijd ${ctx.gebruiker.profielLeeftijdDagen} dagen, ervaringsniveau '${ctx.gebruiker.ervaringsniveau}'. Stem je toon hierop af.\n`
    : ''

  return `${PLANNER_PERSONA}
${gebruikerSectie}
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
  "globaal_advies": "2-3 zinnen over de status van dit onderdeel als professionele wedding planner. Begin NOOIT met een aanhef of naam, maar spring direct in de inhoud.",
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

  const gebruikerSectie = ctx.gebruiker
    ? `\nGebruikerscontext:
- Profiellooptijd: ${ctx.gebruiker.profielLeeftijdDagen} dagen
- Acties afgelopen 30 dagen: ${ctx.gebruiker.actiesLaatste30Dagen}
- Ervaringsniveau: ${ctx.gebruiker.ervaringsniveau}

Stem je toon af op dit ervaringsniveau: 'nieuw' = meer uitleg en stapsgewijze begeleiding; 'gemiddeld' = balans; 'ervaren' = beknopt, focus op optimalisaties.\n`
    : ''

  return `${PLANNER_PERSONA}
${gebruikerSectie}
Je geeft een globaal overzicht van de volledige bruiloftplanning van ${ctx.bruidspaar.partner1} en ${ctx.bruidspaar.partner2}. Bruiloft op ${ctx.bruidspaar.trouwdatum} in ${ctx.bruidspaar.locatie} (${dagLabel}).

Volledige planning:
${JSON.stringify(ctx, null, 2)}

Geef als ervaren wedding planner een eerlijk globaal oordeel over waar dit koppel staat in hun planning. Wees warm maar realistisch. Beoordeel het algehele planningsniveau.

Score-richtlijnen (0-100) — weeg de resterende tijd ALTIJD mee:
- 80-100: planning loopt uitstekend voor dit moment, bijna alles is geregeld
- 60-79: goed op weg, maar er zijn nog duidelijke aandachtspunten
- 40-59: meerdere onderdelen vereisen actie gezien de resterende tijd
- 20-39: planning loopt echt achter op wat met deze resterende tijd nodig is
- 0-19: zeer weinig geregeld terwijl de bruiloft dichtbij is
- Een grotendeels lege planning met nog 9+ maanden te gaan is een normale startpositie, géén achterstand: scoor die 45-60 en schrijf een bemoedigende eerste-stappen-samenvatting.

Status-regels:
- "op_schema": score >= 65 en geen kritieke problemen
- "actie_vereist": score 35-64 of enkele dringende zaken
- "kritiek": alleen bij score < 35 ÉN concrete tijdsdruk (verlopen deadlines of ontbrekende kritieke leveranciers terwijl de bruiloft dichtbij is)

Geef ALLEEN een JSON-object terug:
{
  "status": "op_schema|actie_vereist|kritiek",
  "samenvatting": "3-4 zinnen als persoonlijke wedding planner. Begin NOOIT met een aanhef of naam, maar spring direct in de inhoud. Spreek het koppel aan als 'jullie'. Wees eerlijk maar motiverend.",
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

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  // Fire-and-forget: bijwerken hoeft de response niet te vertragen
  void (supabase as any).from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', user.id)

  let body: { weddingId: string; force?: boolean }
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

  // Lees bestaande cache
  const { data: cacheRow } = await (supabase as any)
    .from('ai_wedding_planner_cache')
    .select('cached_advice, data_fingerprint, last_updated_at')
    .eq('wedding_id', weddingId)
    .single()

  const now = Date.now()

  // Haal alle bruiloftdata op — nodig voor de vingerafdruk én voor generatie.
  const [
    { data: weddingRow },
    { data: taskRows },
    { data: vendorRows },
    { data: budgetRows },
    { data: guestRows },
    { data: scheduleRows },
    { data: websiteRow },
    profileResult,
    activityResult,
  ] = await Promise.all([
    supabase.from('weddings').select('*').eq('id', weddingId).single(),
    supabase.from('tasks').select('*').eq('wedding_id', weddingId),
    supabase.from('vendors').select('*').eq('wedding_id', weddingId),
    supabase.from('budget_items').select('*').eq('wedding_id', weddingId),
    supabase.from('guests').select('*').eq('wedding_id', weddingId),
    supabase.from('schedule_items').select('*').eq('wedding_id', weddingId),
    supabase.from('website_content').select('*').eq('wedding_id', weddingId).single(),
    (supabase as any).from('profiles').select('created_at').eq('id', user.id).single(),
    (supabase as any)
      .from('wedding_activity')
      .select('*', { count: 'exact', head: true })
      .eq('actor_id', user.id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
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

  const profielLeeftijdDagen = profileResult.data?.created_at
    ? Math.floor((Date.now() - new Date(profileResult.data.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0
  const actiesLaatste30Dagen = activityResult.count ?? 0

  const context = {
    ...buildAIContext(wedding, tasks, vendors, budgetItems, guests, scheduleItems, websiteContent),
    gebruiker: {
      profielLeeftijdDagen,
      actiesLaatste30Dagen,
      ervaringsniveau: deriveErvaringsniveau(profielLeeftijdDagen, actiesLaatste30Dagen),
    },
  }
  const fingerprint = buildFingerprint(context)

  // Bepaal of de cache geldig is
  if (cacheRow && !body.force) {
    const cacheAge = now - new Date(cacheRow.last_updated_at).getTime()
    const fingerprintMatch = cacheRow.data_fingerprint === fingerprint
    const withinCooldown = cacheAge < MIN_COOLDOWN_MS
    const cacheValid = cacheAge < MAX_CACHE_AGE_MS

    if (cacheValid && (fingerprintMatch || withinCooldown)) {
      const nextAvailableAt = new Date(new Date(cacheRow.last_updated_at).getTime() + MIN_COOLDOWN_MS)
      return NextResponse.json({
        advies: cacheRow.cached_advice as AIWeddingPlannerAdvies,
        cached: true,
        next_available_at: nextAvailableAt.toISOString(),
      } satisfies AIWeddingPlannerResponse)
    }
  }

  // Rate limit voor handmatig verversen
  if (body.force) {
    const rateLimit = await checkRateLimit(`ai:wedding-planner:${weddingId}`, 3, 60 * 60)
    if (!rateLimit.allowed) {
      if (cacheRow?.cached_advice) {
        const nextAvailableAt = new Date(now + MIN_COOLDOWN_MS)
        return NextResponse.json({
          advies: cacheRow.cached_advice as AIWeddingPlannerAdvies,
          cached: true,
          next_available_at: nextAvailableAt.toISOString(),
        } satisfies AIWeddingPlannerResponse)
      }
      return NextResponse.json({ error: 'Te veel verzoeken, probeer het over een uur opnieuw.' }, { status: 429 })
    }
  }

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

    const updatedAt = new Date().toISOString()
    await (supabase as any)
      .from('ai_wedding_planner_cache')
      .upsert(
        {
          wedding_id: weddingId,
          cached_advice: advies,
          data_fingerprint: fingerprint,
          last_updated_at: updatedAt,
        },
        { onConflict: 'wedding_id' }
      )

    return NextResponse.json({
      advies,
      cached: false,
      next_available_at: new Date(now + MIN_COOLDOWN_MS).toISOString(),
    } satisfies AIWeddingPlannerResponse)
  } catch (err) {
    console.error('[api/ai/wedding-planner] Gemini fout:', err)
    // Retourneer stale cache als fallback bij een AI-fout
    if (cacheRow?.cached_advice) {
      return NextResponse.json({
        advies: cacheRow.cached_advice as AIWeddingPlannerAdvies,
        cached: true,
        next_available_at: new Date(now + MIN_COOLDOWN_MS).toISOString(),
      } satisfies AIWeddingPlannerResponse)
    }
    return NextResponse.json({ error: 'AI tijdelijk niet beschikbaar' }, { status: 502 })
  }
}
