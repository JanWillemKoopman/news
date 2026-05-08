import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  AGENTS,
  AGENT_SYSTEM_PROMPTS,
  AGENT_NAME_TO_ID,
  AGENT_ID_TO_NAME,
  ALL_AGENT_IDS,
  MANAGER_NAME,
  MANAGER_SYSTEM_PROMPT,
  INTAKE_ROUTER_PROMPT,
  PLANNING_ORCHESTRATOR_PROMPT,
  PLANNING_MANAGER_CHECK_PROMPT,
  SPECIALIST_TURN_INSTRUCTIONS,
  FINAL_PLAN_PROMPT,
} from '@/lib/agents'
import type { AgentId, ConversationEntry } from '@/types'

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

function formatConversation(messages: ConversationEntry[]): string {
  return messages
    .map((m) => (m.role === 'user' ? `Klant: ${m.content}` : m.content))
    .join('\n\n')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    switch (body.action) {
      case 'intake_turn':
        return handleIntakeTurn(body)
      case 'planning_kickoff':
        return handlePlanningKickoff(body)
      case 'specialist_turn':
        return handleSpecialistTurn(body)
      case 'manager_check':
        return handleManagerCheck(body)
      case 'finalize':
        return handleFinalize(body)
      case 'iterate_plan':
        return handleIteratePlan(body)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (err) {
    console.error('[API /chat]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── 1. Intake: Campagne Manager beslist + reageert ────────────────────────────

async function handleIntakeTurn(body: {
  messages: ConversationEntry[]
  intakeRound: number
}) {
  const { messages, intakeRound } = body
  const conversation = formatConversation(messages)

  // Step 1: router decides whether to keep asking or move to planning
  const routerModel = genAI.getGenerativeModel({ model: MODEL })
  const routerPrompt = `${INTAKE_ROUTER_PROMPT}

Huidige intake-ronde: ${intakeRound} (ronde 5 dwingt automatisch start_planning)

Gespreksgeschiedenis:
${conversation}

Geef je JSON-beslissing.`

  const routerRes = await routerModel.generateContent(routerPrompt)
  const decision = safeJSON<{ action: 'ask_followup' | 'start_planning'; reason?: string }>(
    routerRes.response.text(),
    { action: intakeRound >= 5 ? 'start_planning' : 'ask_followup' }
  )

  // Force planning after 5 rounds
  if (intakeRound >= 5) decision.action = 'start_planning'

  if (decision.action === 'start_planning') {
    return NextResponse.json({
      decision: 'start_planning',
      managerMessage: null,
    })
  }

  // Step 2: manager asks a follow-up question
  const managerModel = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: MANAGER_SYSTEM_PROMPT,
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

  const managerRes = await managerModel.generateContent(managerPrompt)
  return NextResponse.json({
    decision: 'ask_followup',
    managerMessage: managerRes.response.text().trim(),
  })
}

// ─── 2. Planning kickoff: order + briefings + intro-bericht ────────────────────

async function handlePlanningKickoff(body: {
  messages: ConversationEntry[]
}) {
  const { messages } = body
  const conversation = formatConversation(messages)

  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: MANAGER_SYSTEM_PROMPT,
  })

  const prompt = `${PLANNING_ORCHESTRATOR_PROMPT}

Klantcontext (volledige intake):
${conversation}

Geef je JSON-beslissing. Uitsluitend JSON.`

  const res = await model.generateContent(prompt)

  const fallbackPlan = {
    speaking_order: ALL_AGENT_IDS.map((id) => AGENTS[id].name),
    briefings: Object.fromEntries(
      ALL_AGENT_IDS.map((id) => [AGENTS[id].name, ''])
    ),
    kickoff_message: `Top, ik heb genoeg context om met het team aan de slag te gaan. We werken het plan op funnel-volgorde uit, beginnend met ${AGENTS.brand.name}. Daarna pakken de anderen het op.`,
  }

  const plan = safeJSON<{
    speaking_order: string[]
    briefings: Record<string, string>
    kickoff_message: string
  }>(res.response.text(), fallbackPlan)

  // sanity check: filter to known agent names
  const known = new Set(Object.values(AGENT_ID_TO_NAME))
  const filtered = (plan.speaking_order || []).filter((n) => known.has(n))
  // ensure all six agents appear (append missing in canonical order)
  for (const id of ALL_AGENT_IDS) {
    const name = AGENTS[id].name
    if (!filtered.includes(name)) filtered.push(name)
  }
  plan.speaking_order = filtered
  plan.briefings = plan.briefings || {}
  if (!plan.kickoff_message) plan.kickoff_message = fallbackPlan.kickoff_message

  return NextResponse.json({ plan })
}

// ─── 3. Specialist beurt ──────────────────────────────────────────────────────

async function handleSpecialistTurn(body: {
  agentName: string
  briefing: string
  messages: ConversationEntry[]
  round: number
}) {
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
    systemInstruction: AGENT_SYSTEM_PROMPTS[agentId],
  })

  const prompt = `Klant- en planningcontext tot nu toe:
${conversation}

JOUW BRIEFING van ${MANAGER_NAME} voor deze beurt:
${briefing || `Geef je bijdrage aan het plan vanuit jouw expertise.`}

Mede-specialisten in dit team: ${otherAgents}.
Dit is ronde ${round}.

${SPECIALIST_TURN_INSTRUCTIONS}

Geef alleen je bijdrage. Geen inleiding ("Hallo team"), geen afsluiting.`

  const res = await model.generateContent(prompt)
  return NextResponse.json({
    response: res.response.text().trim(),
    agentId,
    agentName,
  })
}

// ─── 4. Manager-check tussen rondes ───────────────────────────────────────────

async function handleManagerCheck(body: {
  messages: ConversationEntry[]
  round: number
}) {
  const { messages, round } = body
  const conversation = formatConversation(messages)

  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: MANAGER_SYSTEM_PROMPT,
  })

  const prompt = `${PLANNING_MANAGER_CHECK_PROMPT}

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

  // sanity: only known agents
  const known = new Set(Object.values(AGENT_ID_TO_NAME))
  decision.follow_up = (decision.follow_up || []).filter((f) =>
    known.has(f.agent)
  )

  return NextResponse.json({ decision })
}

// ─── 5. Finalize: manager schrijft het volledige plan ─────────────────────────

async function handleFinalize(body: { messages: ConversationEntry[] }) {
  const { messages } = body
  const conversation = formatConversation(messages)

  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: MANAGER_SYSTEM_PROMPT,
  })

  const prompt = `${FINAL_PLAN_PROMPT}

Volledige input van klant + specialisten:
${conversation}

Schrijf nu het volledige campagneplan volgens het exacte formaat. Begin direct met "# Campagneplan" — geen voorwoord.`

  const res = await model.generateContent(prompt)
  return NextResponse.json({ plan: res.response.text().trim() })
}

// ─── 6. Bijsturen na finalize: manager past plan aan ──────────────────────────

async function handleIteratePlan(body: { messages: ConversationEntry[] }) {
  const { messages } = body
  const conversation = formatConversation(messages)

  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: MANAGER_SYSTEM_PROMPT,
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

  const res = await model.generateContent(prompt)
  return NextResponse.json({ plan: res.response.text().trim() })
}
