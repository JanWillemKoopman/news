import { NextRequest, NextResponse } from 'next/server'
import { ai, MODEL } from '@/lib/gemini'
import { ADJUST_SYSTEM_PROMPT, buildAdjustPrompt } from '@/lib/cover-letter/prompts'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { letter, instruction } = (await req.json()) as {
      letter: string
      instruction: string
    }

    if (!letter?.trim() || !instruction?.trim()) {
      return NextResponse.json(
        { error: 'Brief en instructie zijn vereist' },
        { status: 400 }
      )
    }

    const res = await ai.models.generateContent({
      model: MODEL,
      contents: buildAdjustPrompt(letter, instruction),
      config: { systemInstruction: ADJUST_SYSTEM_PROMPT, temperature: 0.7 },
    })

    return NextResponse.json({ letter: (res.text ?? '').trim() })
  } catch (err) {
    console.error('[API /adjust-letter]', err)
    return NextResponse.json({ error: 'Interne serverfout' }, { status: 500 })
  }
}
