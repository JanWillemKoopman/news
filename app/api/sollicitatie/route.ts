import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI, SchemaType, type Part } from '@google/generative-ai'
import {
  COACH_SYSTEM_PROMPT,
  buildAnalyzePrompt,
  buildFollowupPrompt,
  buildLetterPrompt,
} from '@/lib/sollicitatie'
import type { CvInput, LetterMessage } from '@/types/sollicitatie'

export const runtime = 'nodejs'
export const maxDuration = 60

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const MODEL = 'gemini-2.5-flash'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    switch (body.action) {
      case 'analyze':
        return handleAnalyze(body)
      case 'followup':
        return handleFollowup(body)
      case 'letter':
        return handleLetter(body)
      default:
        return NextResponse.json({ error: 'Ongeldige actie' }, { status: 400 })
    }
  } catch (err) {
    console.error('[API /sollicitatie]', err)
    return NextResponse.json({ error: 'Interne serverfout' }, { status: 500 })
  }
}

// ─── Transcript helper ───────────────────────────────────────────────────────

function buildTranscript(messages: LetterMessage[]): string {
  return messages
    .filter((m) => m.role === 'user' || m.kind === 'question')
    .map((m) => `${m.role === 'user' ? 'Kandidaat' : 'Coach'}: ${m.content}`)
    .join('\n\n')
}

// ─── Analyze CV + vacancy, return first question and extracted CV text ───────

async function handleAnalyze(body: { cv: CvInput; vacancy: string }) {
  const { cv, vacancy } = body

  if (!cv || !vacancy?.trim()) {
    return NextResponse.json({ error: 'CV en vacaturetekst zijn vereist' }, { status: 400 })
  }
  if (cv.kind === 'pdf' && cv.mimeType !== 'application/pdf') {
    return NextResponse.json({ error: 'Alleen PDF-bestanden worden ondersteund' }, { status: 400 })
  }

  const isPdf = cv.kind === 'pdf'

  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: COACH_SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          analysis: { type: SchemaType.STRING },
          question: { type: SchemaType.STRING },
          cvText: { type: SchemaType.STRING },
        },
        required: ['analysis', 'question', 'cvText'],
      },
    },
  })

  const promptText = buildAnalyzePrompt(vacancy, isPdf ? null : cv.text)
  const parts: Part[] = isPdf
    ? [{ text: promptText }, { inlineData: { mimeType: cv.mimeType, data: cv.data } }]
    : [{ text: promptText }]

  const result = await model.generateContent(parts)
  const parsed = JSON.parse(result.response.text())

  return NextResponse.json({
    analysis: String(parsed.analysis ?? '').trim(),
    question: String(parsed.question ?? '').trim(),
    cvText: String(parsed.cvText ?? (isPdf ? '' : cv.text)).trim(),
  })
}

// ─── Generate the next clarifying question ───────────────────────────────────

async function handleFollowup(body: {
  cvText: string
  vacancy: string
  messages: LetterMessage[]
  questionNumber: number
}) {
  const { cvText, vacancy, messages, questionNumber } = body

  const model = genAI.getGenerativeModel({ model: MODEL, systemInstruction: COACH_SYSTEM_PROMPT })
  const prompt = buildFollowupPrompt(cvText, vacancy, buildTranscript(messages), questionNumber)
  const result = await model.generateContent(prompt)

  return NextResponse.json({ question: result.response.text().trim() })
}

// ─── Write the final cover letter ────────────────────────────────────────────

async function handleLetter(body: {
  cvText: string
  vacancy: string
  messages: LetterMessage[]
}) {
  const { cvText, vacancy, messages } = body

  const model = genAI.getGenerativeModel({ model: MODEL, systemInstruction: COACH_SYSTEM_PROMPT })
  const prompt = buildLetterPrompt(cvText, vacancy, buildTranscript(messages))
  const result = await model.generateContent(prompt)

  return NextResponse.json({ letter: result.response.text().trim() })
}
