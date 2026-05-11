import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  AGENTS,
  AGENT_SYSTEM_PROMPTS,
  AGENT_NAME_TO_ID,
  ALL_AGENT_IDS,
  MANAGER_NAME,
  MANAGER_SYSTEM_PROMPT,
  MANAGER_ROUTER_PROMPT,
  PLANNING_ORCHESTRATOR_PROMPT,
  PLANNING_MANAGER_CHECK_PROMPT,
  SPECIALIST_TURN_INSTRUCTIONS,
  FINAL_PLAN_PROMPT,
  briefCompanyContext,
} from '@/lib/agents'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { AgentId, ClientProfile, ConversationEntry } from '@/types'

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

async function loadClientProfile(
  sessionId?: string,
  clientProfileId?: string
): Promise<ClientProfile | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null
  }
  try {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    // Als de oproep bij een specifieke sessie hoort: gebruik de bevroren snapshot
    // zodat een latere wijziging van het klantprofiel oude sessies niet vervuilt.
    if (sessionId) {
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('company_profile_snapshot')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (session?.company_profile_snapshot) {
        return session.company_profile_snapshot as ClientProfile
      }
    }

    // Fallback: race-window tussen sessie-aanmaak en eerste chat-call.
    // De client stuurt het gekozen klantprofiel-id mee zodat we toch context hebben.
    if (clientProfileId) {
      const { data } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('id', clientProfileId)
        .eq('user_id', user.id)
        .maybeSingle()
      return (data as ClientProfile | null) ?? null
    }

    return null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const sessionId =
      typeof body.sessionId === 'string' && body.sessionId ? body.sessionId : undefined
    const clientProfileId =
      typeof body.clientProfileId === 'string' && body.clientProfileId
        ? body.clientProfileId
        : undefined
    const profile = await loadClientProfile(sessionId, clientProfileId)
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

// ─── 1. Gesprek: Marketing Manager regisseert de beurt ────────────────────────
// De manager-router beslist per beurt of ze (a) doorvraagt, (b) zelf antwoordt,
// (c) één specialist erbij haalt voor een korte expert-bijdrage, of (d) een
// uitwerking start waarbij meerdere specialisten een leveringsstuk bouwen.

type RouterAction =
  | 'ask_followup'
  | 'answer_directly'
  | 'consult_specialist'
  | 'start_workout'

function handleIntakeTurn(
  body: { messages: ConversationEntry[]; intakeRound: number },
  profileContext: string
) {
  const { messages, intakeRound } = body
  const conversation = formatConversation(messages)

  return ndjsonResponse(async (writer) => {
    // Step 1: router kiest tussen 4 acties
    const routerModel = genAI.getGenerativeModel({ model: MODEL })
    const allowedSpecialists = ALL_AGENT_IDS.map((id) => AGENTS[id].name)
    const routerPrompt = `${MANAGER_ROUTER_PROMPT}
${profileContext}
Huidige gespreksronde: ${intakeRound}

Gespreksgeschiedenis:
${conversation}

Geef je JSON-beslissing.`

    const routerRes = await routerModel.generateContent(routerPrompt)
    const decision = safeJSON<{
      action: RouterAction
      specialist?: string
      briefing?: string
      reason?: string
    }>(routerRes.response.text(), { action: 'ask_followup' })

    // Sanity checks
    const validActions: RouterAction[] = [
      'ask_followup',
      'answer_directly',
      'consult_specialist',
      'start_workout',
    ]
    if (!validActions.includes(decision.action)) decision.action = 'ask_followup'
    if (
      decision.action === 'consult_specialist' &&
      (!decision.specialist || !allowedSpecialists.includes(decision.specialist))
    ) {
      // Vangnet: ongeldige specialist → laat manager zelf antwoorden
      decision.action = 'answer_directly'
    }

    // Branch 1: start_workout — geen manager-tekst, alleen signaal naar FE
    if (decision.action === 'start_workout') {
      writer.send({ type: 'decision', action: 'start_workout' })
      return
    }

    // Branch 2: consult_specialist — manager kondigt kort aan + stuurt FE-signaal
    if (decision.action === 'consult_specialist') {
      writer.send({
        type: 'decision',
        action: 'consult_specialist',
        specialist: decision.specialist,
        briefing: decision.briefing ?? '',
      })

      const managerModel = genAI.getGenerativeModel({
        model: MODEL,
        systemInstruction: MANAGER_SYSTEM_PROMPT + profileContext,
      })
      const announcePrompt = `De klant heeft net iets gevraagd. Jij hebt zojuist besloten om ${decision.specialist} erbij te halen omdat die de juiste expertise heeft.

Briefing aan de specialist (intern): ${decision.briefing ?? ''}

Gespreksgeschiedenis:
${conversation}

Schrijf nu een korte aankondiging (1–2 zinnen) aan de klant waarin je vertelt waarom je ${decision.specialist} erbij haalt en wat de klant van hem/haar mag verwachten. Geen vervolgvragen, geen samenvatting van de specialist zijn antwoord — alleen de aankondiging. Nederlands, jij-vorm.`
      const res = await managerModel.generateContentStream(announcePrompt)
      await pumpModelStream(writer, res)
      return
    }

    // Branch 3: answer_directly — manager beantwoordt zelf
    if (decision.action === 'answer_directly') {
      writer.send({ type: 'decision', action: 'answer_directly' })
      const managerModel = genAI.getGenerativeModel({
        model: MODEL,
        systemInstruction: MANAGER_SYSTEM_PROMPT + profileContext,
      })
      const answerPrompt = `De klant heeft net iets gevraagd waar je als Marketing Manager zelf goed antwoord op kunt geven (zonder specialist erbij). Beantwoord de vraag of geef het gevraagde advies.

Gespreksgeschiedenis:
${conversation}

Schrijf een beknopt, concreet antwoord:
- Direct ter zake, geen "Goede vraag"-openers.
- Maximaal 5–7 zinnen of een korte bullet-lijst (max 5 bullets) waar dat helpt.
- Sluit af met een open uitnodiging om door te vragen of te zeggen waar de klant verder mee geholpen wil worden — alleen als dat natuurlijk past, niet geforceerd.
- Schrijf in het Nederlands, jij-vorm.`
      const res = await managerModel.generateContentStream(answerPrompt)
      await pumpModelStream(writer, res)
      return
    }

    // Branch 4: ask_followup — manager stelt gerichte vervolgvragen
    writer.send({ type: 'decision', action: 'ask_followup' })

    const managerModel = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: MANAGER_SYSTEM_PROMPT + profileContext,
    })
    const isFirstTurn = messages.filter((m) => m.role === 'user').length <= 1
    const managerPrompt = isFirstTurn
      ? `De klant heeft zojuist zijn/haar eerste bericht gestuurd. Dit is je eerste reactie als ${MANAGER_NAME}.

Briefing van de klant:
${conversation}

Schrijf je antwoord:
- Begin met een korte, warme bevestiging (1–2 zinnen) dat je het bericht hebt ontvangen.
- Vat in 2–3 bullets samen wat je hebt begrepen.
- Stel daarna 2 tot 4 GERICHTE vervolgvragen die nodig zijn om de klant goed verder te helpen.
- Sluit af met een uitnodigende zin.

Hou het strak: geen overdaad aan tekst. Schrijf in het Nederlands, jij-vorm.`
      : `De klant heeft net gereageerd. Stel als ${MANAGER_NAME} 1–3 gerichte vervolgvragen om de vraag scherper te krijgen.

Gespreksgeschiedenis:
${conversation}

Regels:
- Maximaal 3 vragen.
- Vraag alleen naar wat nog ontbreekt of vaag is.
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
DOOR DE KLANT GESELECTEERDE SPECIALISTEN (kies hieruit alleen wie écht relevant is voor déze uitwerking — niet automatisch allemaal):
${activeNames.map((n) => `- ${n}`).join('\n')}

Klantcontext (volledige gespreksgeschiedenis):
${conversation}

Geef je JSON-beslissing. Uitsluitend JSON.`

  const res = await model.generateContent(prompt)

  const fallbackPlan = {
    deliverable_type: 'Uitwerking',
    speaking_order: activeNames,
    briefings: Object.fromEntries(activeNames.map((n) => [n, ''])),
    kickoff_message: `Top, ik heb genoeg context om met het team aan de slag te gaan. We bouwen dit nu uit, beginnend met ${activeNames[0]}.`,
  }

  const plan = safeJSON<{
    deliverable_type?: string
    speaking_order: string[]
    briefings: Record<string, string>
    kickoff_message: string
  }>(res.response.text(), fallbackPlan)

  // Filter naar alleen de door de klant geselecteerde specialisten — manager mag
  // een subset kiezen, maar mag geen specialisten activeren die de klant uitvinkte.
  const activeNameSet = new Set(activeNames)
  const filtered = (plan.speaking_order || []).filter((n) => activeNameSet.has(n))
  // Vangnet: als de manager helemaal niemand activeerde, valt het terug op alle
  // geselecteerden zodat we niet vastlopen.
  if (filtered.length === 0) {
    plan.speaking_order = activeNames
  } else {
    plan.speaking_order = filtered
  }
  plan.briefings = plan.briefings || {}
  if (!plan.kickoff_message) plan.kickoff_message = fallbackPlan.kickoff_message
  if (!plan.deliverable_type) plan.deliverable_type = fallbackPlan.deliverable_type

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

  const prompt = `Klant- en gespreks-context tot nu toe:
${conversation}

JOUW BRIEFING van ${MANAGER_NAME} voor deze beurt:
${briefing || `Geef je bijdrage aan de vraag van de klant vanuit jouw expertise.`}

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

// ─── 5. Finalize: manager schrijft het leveringsstuk in passend format ─────────

function handleFinalize(
  body: { messages: ConversationEntry[]; deliverableType?: string },
  profileContext: string
) {
  const { messages, deliverableType } = body
  const conversation = formatConversation(messages)

  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: MANAGER_SYSTEM_PROMPT + profileContext,
  })

  const deliverableHint = deliverableType
    ? `\nHet eerder aangekondigde type leveringsstuk is: **${deliverableType}**. Houd dat aan, tenzij de vraag onmiskenbaar iets anders verlangt.\n`
    : ''

  const prompt = `${FINAL_PLAN_PROMPT}
${profileContext}${deliverableHint}
Volledige input van klant + specialisten:
${conversation}

Schrijf nu het volledige leveringsstuk volgens de regels. Begin direct met de H1-titel ("# {Type stuk} — {Onderwerp}") — geen voorwoord.`

  return ndjsonResponse(async (writer) => {
    const res = await model.generateContentStream(prompt)
    await pumpModelStream(writer, res)
  })
}

// ─── 6. Bijsturen na finalize: manager past leveringsstuk aan ─────────────────

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

  const prompt = `Je bent ${MANAGER_NAME}, Marketing Manager. Je hebt al een compleet leveringsstuk opgeleverd. De klant geeft nu bijstuur-feedback.

Volledige conversatie inclusief het stuk en feedback:
${conversation}

TAAK:
- Lees de feedback van de klant goed.
- Lever een aangepaste versie van het stuk in DEZELFDE structuur als het oorspronkelijke (zelfde H1-titel en dezelfde ## secties).
- Pas alléén aan wat geraakt wordt door de feedback; behoud de rest. Wees expliciet over wat is gewijzigd in een korte regel bovenaan ("**Wijzigingen op basis van je feedback:** ...").
- Sluit af met de uitnodiging om verder bij te sturen.

Schrijf in het Nederlands, jij-vorm. Begin direct met de wijzigingsregel en daarna het stuk. Geen voorwoord.`

  return ndjsonResponse(async (writer) => {
    const res = await model.generateContentStream(prompt)
    await pumpModelStream(writer, res)
  })
}
