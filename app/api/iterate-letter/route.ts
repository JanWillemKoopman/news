import { NextRequest } from 'next/server'
import { runPanel, runRefiner, runVerdict, runWriter } from '@/lib/cover-letter/pipeline'
import type {
  Analysis,
  ExampleLetter,
  IterationEvent,
  QuestionAnswer,
} from '@/types/cover-letter'

export const runtime = 'nodejs'
export const maxDuration = 300

const REFINE_ITERATIONS = 2

export async function POST(req: NextRequest) {
  const { cvText, vacancy, analysis, answers, exampleLetters } = (await req.json()) as {
    cvText: string
    vacancy: string
    analysis: Analysis
    answers: QuestionAnswer[]
    exampleLetters?: ExampleLetter[]
  }

  const examples = exampleLetters ?? []

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: IterationEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))

      try {
        if (!cvText?.trim() || !vacancy?.trim()) {
          throw new Error('Ontbrekende invoer')
        }

        emit({ stage: 'writing', label: 'De Schrijver stelt een eerste versie op…' })
        let draft = await runWriter(cvText, vacancy, analysis, answers ?? [], examples)

        for (let i = 1; i <= REFINE_ITERATIONS; i++) {
          emit({
            stage: 'reviewing',
            iteration: i,
            label: `Het recruiterpanel beoordeelt de brief (ronde ${i}/${REFINE_ITERATIONS})…`,
          })
          const feedback = await runPanel(draft, vacancy, cvText)

          emit({
            stage: 'refining',
            iteration: i,
            label: `De Verfijner verwerkt de feedback (ronde ${i}/${REFINE_ITERATIONS})…`,
          })
          draft = await runRefiner(draft, feedback, vacancy, answers ?? [], examples)
        }

        emit({ stage: 'verdict', label: 'Het eindoordeel van het panel wordt opgesteld…' })
        const verdict = await runVerdict(draft, vacancy, analysis)

        emit({ stage: 'done', letter: draft, verdict })
      } catch (err) {
        console.error('[API /iterate-letter]', err)
        emit({ stage: 'error', message: 'Er ging iets mis bij het genereren van de brief.' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
