import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  AGENTS,
  AGENT_SYSTEM_PROMPTS,
  AGENT_NAME_TO_ID,
  ALL_AGENT_IDS,
  MANAGER_NAME,
  MANAGER_SYSTEM_PROMPT,
  INTAKE_ROUTER_PROMPT,
  PLANNING_ORCHESTRATOR_PROMPT,
  PLANNING_MANAGER_CHECK_PROMPT,
  SPECIALIST_TURN_INSTRUCTIONS,
  FINAL_PLAN_PROMPT,
  briefCompanyContext,
} from '@/lib/agents'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { AgentId, CompanyProfile, ConversationEntry } from '@/types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const MODEL = 'gemini-2.5-flash'

function stripFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\n?/m, '')
    .replace(/\n?```$/m, '')
    .trim()
}

function safeJSON<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(stripFences(text)) as T
  } catch {
    return fallback
  }
}

// ─── NDJSON streaming helpers ────────────────────────────────────────────────

type StreamWriter = {
  send: (event: Record<string, unknown>) => void
  close: () => void
  fail: (message: string) => void
}

function ndjsonResponse(
  run: (writer: StreamWriter) => Promise<void>
): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const writer: StreamWriter = {
        send: (event) =>
          controller.enqueue(encoder.encode(JSON.stringify(event) + '\n')),
        close: () => controller.close(),
        fail: (message) => {
          controller.enqueue(
            encoder.encode(JSON.stringify({ type: 'error', message }) + '\n')
          )
          controller.close()
        },
      }
      try {
        await run(writer)
        writer.send({ type: 'done' })
        writer.close()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Onbekende fout'
        console.error('[stream]', err)
        writer.fail(message)
      }
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    },
  })
}

async function pumpModelStream(
  writer: StreamWriter,
  result: { stream: AsyncIterable<{ text: () => string }> }
): Promise<void> {
  for await (const chunk of result.stream) {
    const text = chunk.text()
    if (text) writer.send({ type: 'chunk', text })
  }
}

function formatConversation(messages: ConversationEntry[]): string {
  return messages
    .map((m) => (m.role === 'user' ? `Klant: ${m.content}` : m.content))
    .join('\n\n')
}

async function loadCompanyProfile(): Promise<CompanyProfile | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null
  }
  try {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    return (data as CompanyProfile | null) ?? null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const profile = await loadCompanyProfile()
    const profileContext = briefCompanyContext(profile)
    switch (body.action) {
      case 'intake_turn':
        return handleIntakeTurn(body, profileContext)
      case 'planning_kickoff':
        return handlePlanningKickoff(body, profileContext)
      case 'specialist_turn':
        return handleSpecialistTurn(body, profileContext)
      case 'manager_check':
        return handleManagerCheck(body, profileContext)
      case 'finalize':
        return handleFinalize(body, profileContext)
      case 'iterate_plan':
        return handleIteratePlan(body, profileContext)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (err) {
    console.error('[API /chat]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── 1. Intake: Campagne Manager beslist + reageert ────────────────────────────

function handleIntakeTurn(
  body: { messages: ConversationEntry[]; intakeRound: number },
  profileContext: string
) {
  const { messages, intakeRound } = body
  const conversation = formatConversation(messages)

  return ndjsonResponse(async (writer) => {
    // Step 1: router decides whether to keep asking or move to planning
    const routerModel = genAI.getGenerativeModel({ model: MODEL })
    const routerPrompt = `${INTAKE_ROUTER_PROMPT}
${profileContext}
Huidige intake-ronde: ${intakeRound} (ronde 5 dwingt automatisch start_planning)

Gespreksgeschiedenis:
${conversation}

Geef je JSON-beslissing.`

    const routerRes = await routerModel.generateContent(routerPrompt)
    const decision = safeJSON<{ action: 'ask_followup' | 'start_planning'; reason?: string }>(
      routerRes.response.text(),
      { action: intakeRound >= 5 ? 'start_planning' : 'ask_followup' }
    )

    if (intakeRound >= 5) decision.action = 'start_planning'

    if (decision.action === 'start_planning') {
      writer.send({ type: 'decision', action: 'start_planning' })
      return
    }

    writer.send({ type: 'decision', action: 'ask_followup' })

    // Step 2: manager asks a follow-up question
    const managerModel = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: MANAGER_SYSTEM_PROMPT + profileContext,
    })

    const isFirstTurn = messages.filter((m) => m.role === 'user').length <= 1

    const managerPrompt = isFirstTurn
      ? `De klant heeft zojuist zijn/haar campagne-aanvraag ingediend. Dit is je eerste reactie.

Briefing van de klant:
${conversation}

Schrijf je antwoord:
- Begin met een korte, warme bevestiging (1-2 zinnen) dat je de aanvraag hebt ontvangen.
- Vat in 2-3 bullets samen wat je hebt begrepen (doel, product/dienst, eventueel doelgroep/budget).
- Stel daarna 2 tot 4 GERICHTE vervolgvragen die nog ontbreken voor een sterk plan (denk aan: doelgroep details, budget, locatie/regio, website/kanalen, eerdere campagnes, succescriteria, looptijd).
- Sluit af met een uitnodigende zin om de antwoorden te delen.

Hou het strak: geen overdaad aan tekst. Schrijf in het Nederlands, jij-vorm.`
      : `De klant heeft net gereageerd. Stel als ${MANAGER_NAME} de volgende set gerichte vervolgvragen om de intake compleet te maken.

Gespreksgeschiedenis:
${conversation}

Regels:
- Maximaal 3 vragen.
- Vraag alleen naar wat nog ontbreekt of vaag is voor een goed plan.
- Geen herhaling van wat al duidelijk is.
- Eventueel 1 korte zin van bevestiging vooraf, daarna direct de vragen.
- Schrijf in het Nederlands, jij-vorm.`

    const managerRes = await managerModel.generateContentStream(managerPrompt)
    await pumpModelStream(writer, managerRes)
  })
}

// ─── 2. Planning kickoff: order + briefings + intro-bericht ────────────────────

async function handlePlanningKickoff(
  body: { messages: ConversationEntry[]; selectedAgents?: AgentId[] },
  profileContext: string
) {
  const { messages, selectedAgents } = body
  const conversation = formatConversation(messages)

  const activeIds: AgentId[] =
    selectedAgents && selectedAgents.length > 0 ? selectedAgents : ALL_AGENT_IDS
  const activeNames = activeIds.map((id) => AGENTS[id].name)

  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: MANAGER_SYSTEM_PROMPT + profileContext,
  })

  const prompt = `${PLANNING_ORCHESTRATOR_PROMPT}
${profileContext}
INGESCHAKELDE SPECIALISTEN voor deze campagne (gebruik UITSLUITEND deze namen, ongeacht eerdere instructies):
${activeNames.map((n) => `- ${n}`).join('\n')}

Klantcontext (volledige intake):
${conversation}

Geef je JSON-beslissing. Uitsluitend JSON.`

  const res = await model.generateContent(prompt)

  const fallbackPlan = {
    speaking_order: activeNames,
    briefings: Object.fromEntries(activeNames.map((n) => [n, ''])),
    kickoff_message: `Top, ik heb genoeg context om met het team aan de slag te gaan. We werken het plan uit, beginnend met ${activeNames[0]}. Daarna pakken de anderen het op.`,
  }

  const plan = safeJSON<{
    speaking_order: string[]
    briefings: Record<string, string>
    kickoff_message: string
  }>(res.response.text(), fallbackPlan)

  // Filter naar alleen de geselecteerde specialisten
  const activeNameSet = new Set(activeNames)
  const filtered = (plan.speaking_order || []).filter((n) => activeNameSet.has(n))
  // Zorg dat elke geselecteerde specialist één keer voorkomt
  for (const name of activeNames) {
    if (!filtered.includes(name)) filtered.push(name)
  }
  plan.speaking_order = filtered
  plan.briefings = plan.briefings || {}
  if (!plan.kickoff_message) plan.kickoff_message = fallbackPlan.kickoff_message

  return NextResponse.json({ plan })
}

// ─── 3. Specialist beurt ──────────────────────────────────────────────────────

function handleSpecialistTurn(
  body: {
    agentName: string
    briefing: string
    messages: ConversationEntry[]
    round: number
  },
  profileContext: string
) {
  const { agentName, briefing, messages, round } = body
  const agentId = AGENT_NAME_TO_ID[agentName] as AgentId | undefined

  if (!agentId) {
    return NextResponse.json({ error: 'Onbekende specialist' }, { status: 400 })
  }

  const otherAgents = ALL_AGENT_IDS.map((id) => AGENTS[id].name)
    .filter((n) => n !== agentName)
    .join(', ')

  const conversation = formatConversation(messages)

  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: AGENT_SYSTEM_PROMPTS[agentId] + profileContext,
  })

  const prompt = `Klant- en planningcontext tot nu toe:
${conversation}

JOUW BRIEFING van ${MANAGER_NAME} voor deze beurt:
${briefing || `Geef je bijdrage aan het plan vanuit jouw expertise.`}

Mede-specialisten in dit team: ${otherAgents}.
Dit is ronde ${round}.

${SPECIALIST_TURN_INSTRUCTIONS}

Geef alleen je bijdrage. Geen inleiding ("Hallo team"), geen afsluiting.`

  return ndjsonResponse(async (writer) => {
    writer.send({ type: 'meta', agentId, agentName })
    const res = await model.generateContentStream(prompt)
    await pumpModelStream(writer, res)
  })
}

// ─── 4. Manager-check tussen rondes ───────────────────────────────────────────

async function handleManagerCheck(
  body: {
    messages: ConversationEntry[]
    selectedAgents?: AgentId[]
    round: number
  },
  profileContext: string
) {
  const { messages, selectedAgents, round } = body
  const conversation = formatConversation(messages)

  const activeIds: AgentId[] =
    selectedAgents && selectedAgents.length > 0 ? selectedAgents : ALL_AGENT_IDS
  const activeNames = activeIds.map((id) => AGENTS[id].name)

  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: MANAGER_SYSTEM_PROMPT + profileContext,
  })

  const prompt = `${PLANNING_MANAGER_CHECK_PROMPT}
${profileContext}
INGESCHAKELDE SPECIALISTEN (gebruik alleen deze namen in follow_up):
${activeNames.map((n) => `- ${n}`).join('\n')}

Huidige planningsronde: ${round} (na 2 rondes verplicht "finalize").

Volledige conversatie tot nu toe:
${conversation}

Geef je JSON-beslissing. Uitsluitend JSON.`

  const res = await model.generateContent(prompt)
  const decision = safeJSON<{
    action: 'second_round' | 'finalize'
    follow_up: { agent: string; briefing: string }[]
    reason?: string
  }>(res.response.text(), { action: 'finalize', follow_up: [] })

  if (round >= 2) decision.action = 'finalize'

  // sanity: alleen geselecteerde specialisten
  const activeNameSet = new Set(activeNames)
  decision.follow_up = (decision.follow_up || []).filter((f) =>
    activeNameSet.has(f.agent)
  )

  return NextResponse.json({ decision })
}

// ─── 5. Finalize: manager schrijft het volledige plan ─────────────────────────

function handleFinalize(
  body: { messages: ConversationEntry[] },
  profileContext: string
) {
  const { messages } = body
  const conversation = formatConversation(messages)

  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: MANAGER_SYSTEM_PROMPT + profileContext,
  })

  const prompt = `${FINAL_PLAN_PROMPT}
${profileContext}
Volledige input van klant + specialisten:
${conversation}

Schrijf nu het volledige campagneplan volgens het exacte formaat. Begin direct met "# Campagneplan" — geen voorwoord.`

  return ndjsonResponse(async (writer) => {
    const res = await model.generateContentStream(prompt)
    await pumpModelStream(writer, res)
  })
}

// ─── 6. Bijsturen na finalize: manager past plan aan ──────────────────────────

function handleIteratePlan(
  body: { messages: ConversationEntry[] },
  profileContext: string
) {
  const { messages } = body
  const conversation = formatConversation(messages)

  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: MANAGER_SYSTEM_PROMPT + profileContext,
  })

  const prompt = `Je bent ${MANAGER_NAME}, Campagne Manager. Je hebt al een compleet campagneplan opgeleverd. De klant geeft nu bijstuur-feedback.

Volledige conversatie inclusief plan en feedback:
${conversation}

TAAK:
- Lees de feedback van de klant goed.
- Lever een aangepaste versie van het plan in DEZELFDE structuur als het oorspronkelijke plan (zelfde 9 secties met markdown headings).
- Pas alléén aan wat geraakt wordt door de feedback; behoud de rest. Wees expliciet over wat is gewijzigd in een korte regel bovenaan ("**Wijzigingen op basis van je feedback:** ...").
- Sluit af met de uitnodiging om verder bij te sturen.

Schrijf in het Nederlands, jij-vorm. Begin direct met de wijzigingsregel en daarna het plan. Geen voorwoord.`

  return ndjsonResponse(async (writer) => {
    const res = await model.generateContentStream(prompt)
    await pumpModelStream(writer, res)
  })
}
