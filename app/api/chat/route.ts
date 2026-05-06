import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  AGENT_SYSTEM_PROMPTS,
  INTAKE_MODERATOR_PROMPT,
  DEBATE_MODERATOR_PROMPT,
  SYNTHESIS_MODERATOR_PROMPT,
  AGENT_ID_TO_NAME,
  AGENT_NAME_TO_ID,
} from '@/lib/agents'
import type { AgentId, ConversationEntry } from '@/types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    switch (body.action) {
      case 'moderate':
        return handleModerate(body)
      case 'ask_agent':
        return handleAskAgent(body)
      case 'debate_moderate':
        return handleDebateModerate(body)
      case 'debate_turn':
        return handleDebateTurn(body)
      case 'synthesize':
        return handleSynthesize(body)
      case 'final_advice':
        return handleFinalAdvice(body)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (err) {
    console.error('[API /chat]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── Intake moderator ────────────────────────────────────────────────────────

async function handleModerate(body: {
  selectedAgents: AgentId[]
  messages: ConversationEntry[]
}) {
  const { selectedAgents, messages } = body
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const agentNames = selectedAgents.map((id) => AGENT_ID_TO_NAME[id])
  const conversation = messages
    .map((m) => `${m.role === 'user' ? 'Gebruiker' : 'Adviseur'}: ${m.content}`)
    .join('\n\n')

  const prompt = `${INTAKE_MODERATOR_PROMPT}

Beschikbare experts: ${agentNames.join(', ')}

Gesprekgeschiedenis:
${conversation}

Geef je JSON-beslissing. Uitsluitend JSON, geen andere tekst.`

  const result = await model.generateContent(prompt)
  let text = result.response.text().trim()
  text = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()

  try {
    const decision = JSON.parse(text)
    return NextResponse.json({ decision })
  } catch {
    return NextResponse.json({
      decision: {
        action: 'ask_agent',
        selected_agent: agentNames[0],
        reasoning: 'Fallback to first agent',
      },
    })
  }
}

// ─── Ask agent for a clarifying question (intake phase) ──────────────────────

async function handleAskAgent(body: {
  selectedAgents: AgentId[]
  messages: ConversationEntry[]
  agentName: string
}) {
  const { messages, agentName } = body
  const agentId = AGENT_NAME_TO_ID[agentName]

  if (!agentId) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 400 })
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: AGENT_SYSTEM_PROMPTS[agentId],
  })

  const conversation = messages
    .map((m) => `${m.role === 'user' ? 'Gebruiker' : 'Adviseur'}: ${m.content}`)
    .join('\n\n')

  const prompt = `Dit is het gesprek tot nu toe:

${conversation}

Stel als ${agentName} nu EEN gerichte vervolgvraag. De vraag moet:
- Specifiek zijn voor jouw expertisegebied
- Informatie ophalen die je nodig hebt voor goed advies
- Beknopt zijn (max 2 zinnen)
- In het Nederlands zijn
- Direct en to-the-point, geen lange inleiding

Stel alleen de vraag, geen inleiding of afsluiting.`

  const result = await model.generateContent(prompt)

  return NextResponse.json({
    response: result.response.text().trim(),
    agentId,
    agentName,
  })
}

// ─── Debate moderator: determines speaking order + angles ────────────────────

async function handleDebateModerate(body: {
  selectedAgents: AgentId[]
  messages: ConversationEntry[]
}) {
  const { selectedAgents, messages } = body
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const agentNames = selectedAgents.map((id) => AGENT_ID_TO_NAME[id])
  const conversation = messages
    .map((m) => m.content)
    .join('\n\n')

  const prompt = `${DEBATE_MODERATOR_PROMPT}

Beschikbare experts: ${agentNames.join(', ')}

Gesprekcontext (intake + businessidee):
${conversation}

Geef je JSON-beslissing. Uitsluitend JSON, geen andere tekst.`

  const result = await model.generateContent(prompt)
  let text = result.response.text().trim()
  text = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()

  try {
    const plan = JSON.parse(text)
    return NextResponse.json({ plan })
  } catch {
    // Fallback: agents in selection order, empty angles
    const fallbackPlan = {
      debate_order: agentNames,
      angles: Object.fromEntries(agentNames.map((n) => [n, ''])),
    }
    return NextResponse.json({ plan: fallbackPlan })
  }
}

// ─── Debate turn: agent responds in chat style ───────────────────────────────

async function handleDebateTurn(body: {
  agentId: AgentId
  agentName: string
  angle: string
  messages: ConversationEntry[]
  allAgentNames: string[]
}) {
  const { agentId, agentName, angle, messages, allAgentNames } = body

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: AGENT_SYSTEM_PROMPTS[agentId],
  })

  const otherAgents = allAgentNames.filter((n) => n !== agentName).join(', ')
  const conversationText = messages.map((m) => m.content).join('\n\n')

  const angleInstruction = angle
    ? `Jouw angle voor dit debat: ${angle}`
    : `Reageer vanuit jouw eigen expertise op het businessidee.`

  const prompt = `Gesprekcontext:
${conversationText}

DEBAT-INSTRUCTIE voor ${agentName}:
${angleInstruction}
${otherAgents ? `Je mede-adviseurs in dit debat: ${otherAgents}. Spreek hen direct bij naam aan als je op ze reageert.` : ''}

STIJLREGELS — VERPLICHT:
- Maximaal 2-3 korte zinnen. Dit is een live chat, geen rapport.
- Geen opsommingen, geen koppen, geen bulletpoints.
- Directe, informele taal. Geen "AI-taal" zoals "Dat is een uitstekend punt".
- Je mag het hartgrondig oneens zijn. Je mag provoceren.
- Spreek in eerste persoon als ${agentName}.
- Als je reageert op een collega, noem dan zijn naam.

Geef alleen je debatbijdrage. Geen inleiding, geen afsluiting.`

  const result = await model.generateContent(prompt)
  return NextResponse.json({
    response: result.response.text().trim(),
    agentId,
    agentName,
  })
}

// ─── Synthesize debate into structured summary ───────────────────────────────

async function handleSynthesize(body: {
  messages: ConversationEntry[]
}) {
  const { messages } = body
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const debateHistory = messages.map((m) => m.content).join('\n\n')

  const prompt = `${SYNTHESIS_MODERATOR_PROMPT}

Debat-context:
${debateHistory}`

  const result = await model.generateContent(prompt)
  return NextResponse.json({ synthesis: result.response.text().trim() })
}

// ─── Final advice (legacy, kept for compatibility) ───────────────────────────

async function handleFinalAdvice(body: {
  selectedAgents: AgentId[]
  messages: ConversationEntry[]
}) {
  const { selectedAgents, messages } = body

  const conversation = messages
    .map((m) => `${m.role === 'user' ? 'Gebruiker' : 'Adviseur'}: ${m.content}`)
    .join('\n\n')

  const agentPromises = selectedAgents.map(async (agentId) => {
    const agentName = AGENT_ID_TO_NAME[agentId]
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: AGENT_SYSTEM_PROMPTS[agentId],
    })

    const prompt = `Gebaseerd op dit gesprek:\n\n${conversation}\n\nGeef als ${agentName} jouw definitieve advies in 2-3 alinea's. Wees specifiek, actionable en schrijf vanuit jouw unieke perspectief. In het Nederlands.`
    const result = await model.generateContent(prompt)

    return { agentId, agentName, advice: result.response.text().trim() }
  })

  const agentAdvices = await Promise.all(agentPromises)

  const synthModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const expertSummary = agentAdvices
    .map((a) => `**${a.agentName}**:\n${a.advice}`)
    .join('\n\n---\n\n')

  const expertNames = agentAdvices.map((a) => a.agentName).join(', ')

  const synthesisPrompt = `Je bent een Master Synthesizer. Schrijf ALTIJD in het Nederlands.

Adviezen van de experts (${expertNames}):

${expertSummary}

Syntheseer tot één coherent eindadvies in dit exacte formaat:

**Kernpotentieel**
[1-2 zinnen over het kernpotentieel van het idee]

**De 3 Grootste Kansen**
1. [Kans] — geïnspireerd door [Expert]
2. [Kans] — geïnspireerd door [Expert]
3. [Kans] — geïnspireerd door [Expert]

**De 3 Kritieke Risico's**
1. [Risico en hoe te adresseren]
2. [Risico en hoe te adresseren]
3. [Risico en hoe te adresseren]

**Eerste 3 Actiestappen**
1. [Concrete stap]
2. [Concrete stap]
3. [Concrete stap]

Schrijf krachtig en inspirerend.`

  const synthesis = await synthModel.generateContent(synthesisPrompt)

  return NextResponse.json({
    agentAdvices,
    finalAdvice: synthesis.response.text().trim(),
  })
}
