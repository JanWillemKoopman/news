'use client'

import { useEffect, useRef } from 'react'
import { Check, Loader2, PenLine, ScanSearch, Sparkles, Users, Wand2 } from 'lucide-react'
import { useCoverLetterStore } from '@/store/coverLetterStore'
import { useExampleLetterStore } from '@/store/exampleLetterStore'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { IterationStage, QuestionAnswer } from '@/types/cover-letter'

const REFINE_ITERATIONS = 2

const STAGES: { stage: IterationStage; label: string; icon: typeof PenLine }[] = [
  { stage: 'writing', label: 'De Schrijver', icon: PenLine },
  { stage: 'reviewing', label: 'Het Recruiterpanel', icon: Users },
  { stage: 'refining', label: 'De Verfijner', icon: Sparkles },
  { stage: 'humanizing', label: 'De Humaniseerder', icon: Wand2 },
  { stage: 'verdict', label: 'Het Eindoordeel', icon: ScanSearch },
]

const STAGE_PROGRESS: Record<IterationStage, number> = {
  writing: 10,
  reviewing: 35,
  refining: 60,
  humanizing: 82,
  verdict: 94,
  done: 100,
  error: 100,
}

const STAGE_ORDER: IterationStage[] = ['writing', 'reviewing', 'refining', 'humanizing', 'verdict', 'done']

export default function Step3Loading() {
  const { streamStage, streamLabel, setStream, setResult, setStep, setError } =
    useCoverLetterStore()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    // One AI step per request — keeps every call within Vercel's 60s limit.
    const callStep = async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/letter-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('stap mislukt')
      return res.json()
    }

    const run = async () => {
      const state = useCoverLetterStore.getState()
      const analysis = state.analysis
      if (!analysis) {
        setError('Geen analyse gevonden. Begin opnieuw.')
        setStep(1)
        return
      }

      const answers: QuestionAnswer[] = analysis.starrQuestions.map((question, i) => ({
        question,
        answer: state.answers[i] ?? '',
      }))
      const exampleLetters = useExampleLetterStore.getState().letters
      const cvText = analysis.cvText
      const vacancy = state.vacancyText
      const extraInstructions = state.extraInstructions

      try {
        setStream('writing', 'De Schrijver stelt een eerste versie op…')
        let draft: string = (
          await callStep({
            step: 'write',
            cvText,
            vacancy,
            analysis,
            answers,
            exampleLetters,
            extraInstructions,
          })
        ).draft

        for (let i = 1; i <= REFINE_ITERATIONS; i++) {
          setStream(
            'reviewing',
            `Het recruiterpanel beoordeelt de brief (ronde ${i}/${REFINE_ITERATIONS})…`
          )
          const { feedback } = await callStep({ step: 'review', draft, vacancy, cvText })

          setStream(
            'refining',
            `De Verfijner verwerkt de feedback (ronde ${i}/${REFINE_ITERATIONS})…`
          )
          draft = (
            await callStep({
              step: 'refine',
              draft,
              feedback,
              vacancy,
              answers,
              exampleLetters,
            })
          ).draft
        }

        setStream('humanizing', 'De Humaniseerder maakt de brief menselijker…')
        draft = (await callStep({ step: 'humanize', draft, vacancy })).draft

        setStream('verdict', 'Het eindoordeel van het panel wordt opgesteld…')
        const { verdict } = await callStep({ step: 'verdict', letter: draft, vacancy, analysis })

        setResult(draft, verdict)
        setStream(null)
        setStep(4)
      } catch {
        setError('Er ging iets mis bij het genereren van de brief.')
        setStep(2)
      }
    }

    run()
  }, [setError, setResult, setStep, setStream])

  const currentStage = streamStage ?? 'writing'
  const progress = STAGE_PROGRESS[currentStage] ?? 0
  const currentIndex = STAGE_ORDER.indexOf(currentStage)

  return (
    <div className="max-w-xl mx-auto px-4 py-16">
      <Card>
        <CardContent className="pt-8 pb-8">
          <div className="text-center mb-7">
            <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto mb-4">
              <Loader2 size={22} className="text-primary animate-spin" />
            </div>
            <h2 className="text-lg font-semibold">Je brief wordt geschreven</h2>
            <p className="text-sm text-muted-foreground mt-1 min-h-[1.25rem]">
              {streamLabel || 'Voorbereiden…'}
            </p>
          </div>

          <Progress value={progress} className="mb-7" />

          <ul className="space-y-2.5">
            {STAGES.map(({ stage, label, icon: Icon }) => {
              const order = STAGE_ORDER.indexOf(stage)
              const done = currentIndex > order
              const active = currentStage === stage
              return (
                <li
                  key={stage}
                  className={cn(
                    'flex items-center gap-3 rounded-md border px-3 py-2.5 transition-colors',
                    active && 'border-primary/40 bg-primary/5',
                    !active && 'border-border'
                  )}
                >
                  <span
                    className={cn(
                      'w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0',
                      done && 'bg-primary text-primary-foreground',
                      active && 'bg-primary/15 text-primary',
                      !done && !active && 'bg-muted text-muted-foreground'
                    )}
                  >
                    {done ? (
                      <Check size={14} strokeWidth={3} />
                    ) : active ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Icon size={14} />
                    )}
                  </span>
                  <span
                    className={cn(
                      'text-sm font-medium',
                      active ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {label}
                  </span>
                </li>
              )
            })}
          </ul>

          <p className="text-xs text-muted-foreground text-center mt-6">
            Dit duurt doorgaans drie tot vier minuten. Laat dit tabblad open staan.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
