import { Type } from '@google/genai'
import { ai, MODEL } from '@/lib/gemini'
import type {
  Analysis,
  ExampleLetter,
  QuestionAnswer,
  Verdict,
} from '@/types/cover-letter'
import {
  HUMANIZER_SYSTEM_PROMPT,
  PANEL_SYSTEM_PROMPT,
  REFINER_SYSTEM_PROMPT,
  VERDICT_SYSTEM_PROMPT,
  WRITER_SYSTEM_PROMPT,
  buildHumanizerPrompt,
  buildPanelPrompt,
  buildRefinerPrompt,
  buildVerdictPrompt,
  buildWriterPrompt,
} from './prompts'

async function generateText(
  systemInstruction: string,
  prompt: string,
  temperature: number
): Promise<string> {
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { systemInstruction, temperature },
  })
  return (res.text ?? '').trim()
}

// Agent 1: The Writer — drafts the first version.
export function runWriter(
  cvText: string,
  vacancy: string,
  analysis: Analysis,
  answers: QuestionAnswer[],
  exampleLetters: ExampleLetter[],
  extraInstructions = ''
): Promise<string> {
  return generateText(
    WRITER_SYSTEM_PROMPT,
    buildWriterPrompt(cvText, vacancy, analysis, answers, exampleLetters, extraInstructions),
    0.85
  )
}

// Agent 2: The Recruiter Panel — stress-tests the draft, returns critique.
export function runPanel(letter: string, vacancy: string, cvText: string): Promise<string> {
  return generateText(PANEL_SYSTEM_PROMPT, buildPanelPrompt(letter, vacancy, cvText), 0.5)
}

// Agent 3: The Refiner — rewrites the draft addressing the panel's critique.
export function runRefiner(
  draft: string,
  feedback: string,
  vacancy: string,
  answers: QuestionAnswer[],
  exampleLetters: ExampleLetter[]
): Promise<string> {
  return generateText(
    REFINER_SYSTEM_PROMPT,
    buildRefinerPrompt(draft, feedback, vacancy, answers, exampleLetters),
    0.7
  )
}

// Agent 4: The Humanizer — removes AI language, activates voice, sharpens opening & CTA.
export function runHumanizer(draft: string, vacancy: string): Promise<string> {
  return generateText(
    HUMANIZER_SYSTEM_PROMPT,
    buildHumanizerPrompt(draft, vacancy),
    0.75
  )
}

// Verdict — structured summary for the result dashboard.
export async function runVerdict(
  letter: string,
  vacancy: string,
  analysis: Analysis
): Promise<Verdict> {
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: buildVerdictPrompt(letter, vacancy, analysis),
    config: {
      systemInstruction: VERDICT_SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          bridgedGaps: { type: Type.ARRAY, items: { type: Type.STRING } },
          strategicChoices: { type: Type.ARRAY, items: { type: Type.STRING } },
          atsKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['strengths', 'bridgedGaps', 'strategicChoices', 'atsKeywords'],
      },
    },
  })

  const parsed = JSON.parse(res.text ?? '{}')
  return {
    strengths: parsed.strengths ?? [],
    bridgedGaps: parsed.bridgedGaps ?? [],
    strategicChoices: parsed.strategicChoices ?? [],
    atsKeywords: parsed.atsKeywords ?? [],
  }
}
