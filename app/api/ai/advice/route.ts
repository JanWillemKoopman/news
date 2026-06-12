import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

import type { AIWeddingContext } from '@/lib/bruiloft/aiContext'
import { deriveErvaringsniveau } from '@/lib/bruiloft/aiContext'
import { benchmarksVoorPrompt } from '@/lib/bruiloft/benchmarks'
import { checkRateLimit } from '@/lib/rateLimit'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export type AIAdviesType = 'actie' | 'benchmark' | 'tip'

export interface AIAdvies {
  id: string
  titel: string
  omschrijving: string
  urgentie: 'kritiek' | 'binnenkort' | 'normaal'
  /** actie = nu doen, benchmark = vergelijking met hoe andere koppels plannen, tip = proactief inzicht. */
  type: AIAdviesType
  sectie: string
  sectionLabel: string
}

// Oudere cache-rijen zijn gegenereerd zonder type-veld; vul 'actie' aan.
function metType(advies: Array<Omit<AIAdvies, 'type'> & { type?: AIAdviesType }>): AIAdvies[] {
  return advies.map((a) => ({ ...a, type: a.type ?? 'actie' }))
}

// 1 uur cooldown tussen regeneraties (ook als data veranderd is).
const MIN_COOLDOWN_MS = 60 * 60 * 1000
// 7 dagen veiligheidsnet: cache nooit langer dan dit gebruiken.
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000

// Vingerafdruk van de planningsdata — verandert alleen als de inhoud verandert.
// Het versievoorvoegsel dwingt eenmalige regeneratie af na promptwijzigingen
// (zoals de introductie van adviestypen en benchmarkdata).
function buildFingerprint(ctx: AIWeddingContext): string {
  const geboekt = Object.values(ctx.leveranciers.status).filter((s) => s === 'geboekt').length
  return [
    'v2',
    ctx.bruidspaar.trouwdatum,
    ctx.bruidspaar.locatie,
    ctx.taken.open,
    ctx.taken.klaar,
    ctx.taken.achterstallig,
    Math.round(ctx.budget.betaald),
    Math.round(ctx.budget.resterend),
    ctx.gasten.totaal,
    ctx.gasten.bevestigd,
    geboekt,
    ctx.draaiboek.aantalItems,
  ].join(':')
}

function buildPrompt(ctx: AIWeddingContext): string {
  const dagLabel =
    ctx.bruidspaar.dagenTotBruiloft > 0
      ? `${ctx.bruidspaar.dagenTotBruiloft} dagen te gaan`
      : ctx.bruidspaar.dagenTotBruiloft === 0
        ? 'vandaag is de dag!'
        : 'al getrouwd'

  const gebruikerSectie = ctx.gebruiker
    ? `\nGebruikerscontext:
- Profiellooptijd: ${ctx.gebruiker.profielLeeftijdDagen} dagen
- Acties afgelopen 30 dagen: ${ctx.gebruiker.actiesLaatste30Dagen}
- Ervaringsniveau: ${ctx.gebruiker.ervaringsniveau}

Pas je toon en diepgang aan op het ervaringsniveau: 'nieuw' = meer uitleg en stapsgewijze begeleiding, leg basisbegrippen uit; 'gemiddeld' = balans tussen uitleg en efficiëntie; 'ervaren' = beknopt, focus op optimalisaties en risico's zonder basisuitleg.\n`
    : ''

  return `Je bent een ervaren persoonlijke Nederlandse trouwplanner-assistent. \
Je helpt ${ctx.bruidspaar.partner1} en ${ctx.bruidspaar.partner2} bij de voorbereiding van hun bruiloft \
op ${ctx.bruidspaar.trouwdatum} in ${ctx.bruidspaar.locatie} (${dagLabel}).
${gebruikerSectie}
Actuele situatie van hun planning:
${JSON.stringify(ctx, null, 2)}

Benchmarkgegevens over hoe Nederlandse koppels doorgaans plannen (gecureerd, feitelijk):
${benchmarksVoorPrompt()}

Analyseer alle onderdelen (taken, budget, gasten, leveranciers, draaiboek, betalingen) grondig \
en geef 5 tot 6 geprioriteerde adviezen voor dit koppel.

Regels:
- type: 'actie' = iets dat het koppel NU moet doen; 'benchmark' = een vergelijking van hun situatie met de benchmarkgegevens hierboven; 'tip' = proactieve suggestie of nuttig inzicht
- Geef minstens 3 acties, 1 à 2 benchmark-inzichten en hooguit 1 tip
- Gebruik voor benchmark-inzichten UITSLUITEND de meegegeven benchmarkgegevens — verzin NOOIT zelf cijfers of statistieken
- Baseer elk advies op concrete getallen/feiten uit de context (noem specifieke aantallen, bedragen)
- Spreid de adviezen over verschillende secties waar dat logisch is, zodat het koppel op meerdere plekken in de app geholpen wordt
- Schrijf in het Nederlands, persoonlijk en warm van toon
- Houd elke omschrijving kort en scanbaar: maximaal 2 zinnen, begin met wat het koppel concreet moet dóén
- Toon: kalm en opbouwend, nooit paniekerig; vermijd uitroeptekens en woorden als 'dringend', 'kritiek' of 'achterstand' in titel en omschrijving
- Noem NOOIT interne veld- of statusnamen letterlijk (zoals 'niet-geboekt', 'Geregelde Zaken', statuswaarden of veldnamen uit de data) — beschrijf de situatie in gewone mensentaal
- Als de planning er grotendeels leeg uitziet (vrijwel geen voltooide taken, budgetitems of geboekte leveranciers), is het koppel waarschijnlijk net begonnen: geef dan een vriendelijke eerste-stappen-opbouw in plaats van een waarschuwing over achterstand
- urgentie: 'kritiek' = deadline verstreken of minder dan 7 dagen, 'binnenkort' = 7–30 dagen of hoog risico, 'normaal' = proactief; gebruik 'kritiek' spaarzaam en alleen als er echt iets misgaat zonder actie
- sectie: pad naar de relevante pagina, een van: /bruiloft/taken | /bruiloft/budget | /bruiloft/gasten | /bruiloft/leveranciers | /bruiloft/draaiboek | /bruiloft/tafels
- sectionLabel: gebruiksvriendelijke naam van die sectie (bijv. 'Taken', 'Budget', 'Gasten', etc.)
- id: uniek per advies, gebruik 'ai-1', 'ai-2', etc.

Geef ALLEEN een JSON-array terug, geen andere tekst, in dit formaat:
[
  {
    "id": "ai-1",
    "titel": "...",
    "omschrijving": "...",
    "urgentie": "kritiek|binnenkort|normaal",
    "type": "actie|benchmark|tip",
    "sectie": "/bruiloft/...",
    "sectionLabel": "..."
  }
]`
}

function parseAdvies(text: string): AIAdvies[] {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  const parsed = JSON.parse(cleaned)
  if (!Array.isArray(parsed)) return []
  return parsed
    .filter(
      (item): item is AIAdvies =>
        typeof item.id === 'string' &&
        typeof item.titel === 'string' &&
        typeof item.omschrijving === 'string' &&
        ['kritiek', 'binnenkort', 'normaal'].includes(item.urgentie) &&
        typeof item.sectie === 'string' &&
        typeof item.sectionLabel === 'string'
    )
    .map((item) => ({
      ...item,
      type: (['actie', 'benchmark', 'tip'] as const).includes(item.type) ? item.type : 'actie',
    }))
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

  // Fire-and-forget: bijwerken hoeft de response niet te vertragen
  void (supabase as any).from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', user.id)

  let body: { context: AIWeddingContext; weddingId: string; force?: boolean }
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

  const fingerprint = buildFingerprint(body.context)
  const now = Date.now()

  // Lees DB-cache
  const { data: cacheRow } = await (supabase as any)
    .from('ai_advice_cache')
    .select('cached_advies, data_fingerprint, last_updated_at')
    .eq('wedding_id', body.weddingId)
    .single()

  if (cacheRow && !body.force) {
    const cacheAge = now - new Date(cacheRow.last_updated_at).getTime()
    const fingerprintMatch = cacheRow.data_fingerprint === fingerprint
    const withinCooldown = cacheAge < MIN_COOLDOWN_MS
    const cacheValid = cacheAge < MAX_CACHE_AGE_MS

    // Retourneer cache als: vingerafdruk onveranderd OF nog binnen cooldown
    if (cacheValid && (fingerprintMatch || withinCooldown)) {
      return NextResponse.json({ advies: metType(cacheRow.cached_advies), cached: true, updatedAt: cacheRow?.last_updated_at })
    }
  }

  const rateLimit = await checkRateLimit(`ai:advice:${user.id}`, 5, 60 * 60)
  if (!rateLimit.allowed) {
    // Bij rate-limit: retourneer stale cache als die er is
    if (cacheRow?.cached_advies?.length > 0) {
      return NextResponse.json({ advies: metType(cacheRow.cached_advies), cached: true, updatedAt: cacheRow?.last_updated_at })
    }
    return NextResponse.json({ error: 'Te veel verzoeken, probeer het over een uur opnieuw.' }, { status: 429 })
  }

  // Haal gebruikersprofiel op voor contextuele AI-toon
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
  const actiesLaatste30Dagen = activityResult.count ?? 0

  const enrichedContext: AIWeddingContext = {
    ...body.context,
    gebruiker: {
      profielLeeftijdDagen,
      actiesLaatste30Dagen,
      ervaringsniveau: deriveErvaringsniveau(profielLeeftijdDagen, actiesLaatste30Dagen),
    },
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    })
    const result = await model.generateContent(buildPrompt(enrichedContext))
    const advies = parseAdvies(result.response.text())

    // Sla op in DB-cache
    await (supabase as any)
      .from('ai_advice_cache')
      .upsert(
        {
          wedding_id: body.weddingId,
          cached_advies: advies,
          data_fingerprint: fingerprint,
          last_updated_at: new Date().toISOString(),
        },
        { onConflict: 'wedding_id' }
      )

    return NextResponse.json({ advies, cached: false, updatedAt: new Date().toISOString() })
  } catch (err) {
    console.error('[api/ai/advice] Gemini fout:', err)
    // Retourneer stale cache als fallback bij een AI-fout
    if (cacheRow?.cached_advies?.length > 0) {
      return NextResponse.json({ advies: metType(cacheRow.cached_advies), cached: true, updatedAt: cacheRow?.last_updated_at })
    }
    return NextResponse.json({ error: 'AI tijdelijk niet beschikbaar' }, { status: 502 })
  }
}
