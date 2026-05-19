import { NextRequest, NextResponse } from 'next/server'
import { ai, MODEL } from '@/lib/gemini'
import { LETTER_EXTRACT_PROMPT } from '@/lib/cover-letter/prompts'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { data, mimeType } = (await req.json()) as { data: string; mimeType: string }

    if (!data || mimeType !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Een geldig PDF-bestand is vereist' },
        { status: 400 }
      )
    }

    const res = await ai.models.generateContent({
      model: MODEL,
      contents: [{ text: LETTER_EXTRACT_PROMPT }, { inlineData: { mimeType, data } }],
    })

    const text = (res.text ?? '').trim()
    if (!text) {
      return NextResponse.json(
        { error: 'Kon geen tekst uit het PDF halen' },
        { status: 422 }
      )
    }

    return NextResponse.json({ text })
  } catch (err) {
    console.error('[API /extract-letter]', err)
    return NextResponse.json({ error: 'Interne serverfout' }, { status: 500 })
  }
}
