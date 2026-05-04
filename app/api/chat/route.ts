import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  AGENT_SYSTEM_PROMPTS,
  MODERATOR_SYSTEM_PROMPT,
  AGENT_ID_TO_NAME,
  AGENT_NAME_TO_ID,
} from '@/lib/agents'
import type { AgentId, ConversationEntry } from '@/types'

const WHITELIST_IPS = ['62.45.137.45', '178.230.94.23']
const DAILY_LIMIT = 8

const requestCounts = new Map<string, { count: number; date: string }>()

function getTodayString() {
  return new Date().toISOString().slice(0, 10)
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'

  if (!WHITELIST_IPS.includes(ip)) {
    const today = getTodayString()
    const entry = requestCounts.get(ip)

    if (entry && entry.date === today && entry.count >= DAILY_LIMIT) {
      return NextResponse.json(
        { error: 'Je dagelijkse limiet is bereikt. Morgen ben je weer welkom!' },
        { status: 429 }
      )
    }
  }

  try {
    const body = await req.json()
    let response: NextResponse

    switch (body.action) {
      case 'moderate':
        response = await handleModerate(body)
        break
      case 'ask_agent':
        response = await handleAskAgent(body)
        break
      case 'final_advice':
        response = await handleFinalAdvice(body)
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    if (
      !WHITELIST_IPS.includes(ip) &&
      (body.action === 'moderate' || body.action === 'ask_agent')
    ) {
      const today = getTodayString()
      const entry = requestCounts.get(ip)
      if (!entry || entry.date !== today) {
        requestCounts.set(ip, { count: 1, date: today })
      } else {
        requestCounts.set(ip, { count: entry.count + 1, date: today })
      }
    }

    return response
  } catch (err) {
    console.error('[API /chat]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── Moderator ───────────────────────────────────────────────────────────────

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

  const prompt = `${MODERATOR_SYSTEM_PROMPT}

Beschikbare experts: ${agentNames.join(', ')}

Gesprekgeschiedenis:
${conversation}

Geef je JSON-beslissing. Uitsluitend JSON, geen andere tekst.`

  const result = await model.generateContent(prompt)
  let text = result.response.text().trim()

  // Strip potential markdown fences
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

// ─── Ask agent for a clarifying question ─────────────────────────────────────

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
- Beknopt zijn (max 2-3 zinnen)
- In het Nederlands zijn

Stel alleen de vraag, geen inleiding of afsluiting.`

  const result = await model.generateContent(prompt)

  return NextResponse.json({
    response: result.response.text().trim(),
    agentId,
    agentName,
  })
}

// ─── Final advice (all agents in parallel, then synthesize) ──────────────────

async function handleFinalAdvice(body: {
  selectedAgents: AgentId[]
  messages: ConversationEntry[]
}) {
  const { selectedAgents, messages } = body

  const conversation = messages
    .map((m) => `${m.role === 'user' ? 'Gebruiker' : 'Adviseur'}: ${m.content}`)
    .join('\n\n')

  // All selected agents advise simultaneously
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

  // Moderator synthesizes all advice into one final response
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
