import { NextRequest, NextResponse } from 'next/server'
import { runPanel, runRefiner, runVerdict, runWriter } from '@/lib/cover-letter/pipeline'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Eén AI-stap per request. De client (Step3Loading) orkestreert de volledige
 * lus — Writer -> 2x(Panel -> Refiner) -> Verdict — door deze route herhaald
 * aan te roepen. Zo blijft elke functie-aanroep binnen de 60s-limiet van het
 * Vercel Hobby-plan.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const step = body.step as string

    switch (step) {
      case 'write': {
        if (!body.cvText?.trim() || !body.vacancy?.trim()) {
          return NextResponse.json({ error: 'Ontbrekende invoer' }, { status: 400 })
        }
        const draft = await runWriter(
          body.cvText,
          body.vacancy,
          body.analysis,
          body.answers ?? [],
          body.exampleLetters ?? [],
          body.extraInstructions ?? ''
        )
        return NextResponse.json({ draft })
      }

      case 'review': {
        const feedback = await runPanel(body.draft, body.vacancy, body.cvText)
        return NextResponse.json({ feedback })
      }

      case 'refine': {
        const draft = await runRefiner(
          body.draft,
          body.feedback,
          body.vacancy,
          body.answers ?? [],
          body.exampleLetters ?? []
        )
        return NextResponse.json({ draft })
      }

      case 'verdict': {
        const verdict = await runVerdict(body.letter, body.vacancy, body.analysis)
        return NextResponse.json({ verdict })
      }

      default:
        return NextResponse.json({ error: 'Onbekende stap' }, { status: 400 })
    }
  } catch (err) {
    console.error('[API /letter-step]', err)
    return NextResponse.json({ error: 'Interne serverfout' }, { status: 500 })
  }
}
