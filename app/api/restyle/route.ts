import { NextRequest, NextResponse } from 'next/server'
import { ai, MODEL } from '@/lib/gemini'
import { RESTYLE_SYSTEM_PROMPT, buildRestylePrompt } from '@/lib/cover-letter/prompts'
import type { LetterStyle } from '@/types/cover-letter'

export const runtime = 'nodejs'
export const maxDuration = 60

const VALID_STYLES: LetterStyle[] = ['challenger', 'expert', 'culture']

export async function POST(req: NextRequest) {
  try {
    const { letter, style } = (await req.json()) as { letter: string; style: LetterStyle }

    if (!letter?.trim() || !VALID_STYLES.includes(style)) {
      return NextResponse.json(
        { error: 'Brief en geldige stijl zijn vereist' },
        { status: 400 }
      )
    }

    const res = await ai.models.generateContent({
      model: MODEL,
      contents: buildRestylePrompt(letter, style),
      config: { systemInstruction: RESTYLE_SYSTEM_PROMPT, temperature: 0.8 },
    })

    return NextResponse.json({ letter: (res.text ?? '').trim() })
  } catch (err) {
    console.error('[API /restyle]', err)
    return NextResponse.json({ error: 'Interne serverfout' }, { status: 500 })
  }
}
