import { NextRequest, NextResponse } from 'next/server'
import { Type } from '@google/genai'
import { ai, MODEL } from '@/lib/gemini'
import { ANALYST_SYSTEM_PROMPT, buildAnalyzePrompt } from '@/lib/cover-letter/prompts'
import type { CvInput } from '@/types/cover-letter'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { cv, vacancy } = (await req.json()) as { cv: CvInput; vacancy: string }

    if (!cv || !vacancy?.trim()) {
      return NextResponse.json(
        { error: 'CV en vacaturetekst zijn vereist' },
        { status: 400 }
      )
    }

    const isFile = cv.kind === 'pdf'
    const promptText = buildAnalyzePrompt(vacancy, isFile ? null : cv.text)
    const contents = isFile
      ? [{ text: promptText }, { inlineData: { mimeType: cv.mimeType, data: cv.data } }]
      : promptText

    const res = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction: ANALYST_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            gapAnalysis: { type: Type.STRING },
            companyDna: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
            starrQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            cvText: { type: Type.STRING },
          },
          required: ['gapAnalysis', 'companyDna', 'missingSkills', 'starrQuestions', 'cvText'],
        },
      },
    })

    const parsed = JSON.parse(res.text ?? '{}')
    return NextResponse.json({
      gapAnalysis: String(parsed.gapAnalysis ?? '').trim(),
      companyDna: parsed.companyDna ?? [],
      missingSkills: parsed.missingSkills ?? [],
      starrQuestions: parsed.starrQuestions ?? [],
      cvText: isFile ? String(parsed.cvText ?? '').trim() : cv.text,
    })
  } catch (err) {
    console.error('[API /analyze]', err)
    return NextResponse.json({ error: 'Interne serverfout' }, { status: 500 })
  }
}
