import { NextRequest, NextResponse } from 'next/server'
import { Type } from '@google/genai'
import { ai, MODEL } from '@/lib/gemini'
import { ANALYST_SYSTEM_PROMPT, buildAnalyzePrompt } from '@/lib/cover-letter/prompts'
import type { CvInput, SupportingFile } from '@/types/cover-letter'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { cv, vacancy, supportingFiles = [] } = (await req.json()) as {
      cv: CvInput
      vacancy: string
      supportingFiles?: SupportingFile[]
    }

    if (!cv || !vacancy?.trim()) {
      return NextResponse.json(
        { error: 'CV en vacaturetekst zijn vereist' },
        { status: 400 }
      )
    }
    const isPdf = cv.kind === 'pdf'
    if (isPdf && cv.mimeType !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Alleen PDF-bestanden worden ondersteund' },
        { status: 400 }
      )
    }

    const promptText = buildAnalyzePrompt(vacancy, isPdf ? null : cv.text)
    const fileParts = [
      ...(isPdf ? [{ inlineData: { mimeType: cv.mimeType, data: cv.data } }] : []),
      ...supportingFiles.map((f) => ({
        fileData: { fileUri: f.uri, mimeType: f.mimeType },
      })),
    ]
    const contents = fileParts.length > 0 ? [{ text: promptText }, ...fileParts] : promptText

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
      cvText: isPdf ? String(parsed.cvText ?? '').trim() : cv.text,
    })
  } catch (err) {
    console.error('[API /analyze]', err)
    return NextResponse.json({ error: 'Interne serverfout' }, { status: 500 })
  }
}
