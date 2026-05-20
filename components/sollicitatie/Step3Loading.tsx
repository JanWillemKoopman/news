'use client'

import { useEffect, useRef } from 'react'
import { Check, Loader2, PenLine, Shield, Wand2 } from 'lucide-react'
import { useCoverLetterStore } from '@/store/coverLetterStore'
import { useExampleLetterStore } from '@/store/exampleLetterStore'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { IterationStage, QuestionAnswer, VariantType } from '@/types/cover-letter'

const VARIANT_TYPES: VariantType[] = ['Verbinding', 'Bewijs', 'Probleemoplossing']

const STAGES: { stage: IterationStage; label: string; icon: typeof PenLine }[] = [
  { stage: 'writing3',    label: 'De Schrijver — 3 varianten opstellen',   icon: PenLine },
  { stage: 'humanizing1', label: 'Variant 1 verfijnen (Verbinding)',        icon: Wand2 },
  { stage: 'humanizing2', label: 'Variant 2 verfijnen (Bewijs)',            icon: Wand2 },
  { stage: 'humanizing3', label: 'Variant 3 verfijnen (Probleemoplossing)', icon: Wand2 },
  { stage: 'critiquing1', label: 'Hiring Manager beoordeelt variant 1',    icon: Shield },
  { stage: 'critiquing2', label: 'Hiring Manager beoordeelt variant 2',    icon: Shield },
  { stage: 'critiquing3', label: 'Hiring Manager beoordeelt variant 3',    icon: Shield },
]

const STAGE_PROGRESS: Record<IterationStage, number> = {
  writing: 0, reviewing: 0, refining: 0, humanizing: 0, verdict: 0, synthesizing: 95,
  writing3:    8,
  humanizing1: 22,
  humanizing2: 36,
  humanizing3: 50,
  critiquing1: 64,
  critiquing2: 78,
  critiquing3: 92,
  done: 100,
  error: 100,
}

const STAGE_ORDER: IterationStage[] = [
  'writing3',
  'humanizing1', 'humanizing2', 'humanizing3',
  'critiquing1', 'critiquing2', 'critiquing3',
  'done',
]

export default function Step3Loading() {
  const { streamStage, streamLabel, setStream, setLetters, setStep, setError } =
    useCoverLetterStore()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const callStep = async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/letter-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`API-fout (${res.status})`)
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
      const impliedChallenges = analysis.impliedChallenges ?? []

      try {
        // ── Stap 1: Multi-Writer — 3 conceptbrieven ──────────────────────────
        setStream('writing3', 'De Schrijver stelt 3 verschillende varianten op…')
        const data = await callStep({
          step: 'write3',
          cvText,
          vacancy,
          analysis,
          answers,
          exampleLetters,
          extraInstructions: state.extraInstructions,
          motivation: state.motivation,
          uniqueValue: state.uniqueValue,
          yesNoAnswers: state.yesNoAnswers,
        })
        const drafts: unknown[] = Array.isArray(data.drafts) ? data.drafts : []
        if (drafts.length < 3 || drafts.some((d) => typeof d !== 'string' || !d)) {
          throw new Error('De schrijver retourneerde niet 3 geldige varianten.')
        }

        // ── Stap 2: Humanizer ×3 — met context ───────────────────────────────
        setStream('humanizing1', 'Variant 1 wordt verfijnd (Verbinding)…')
        const r1 = await callStep({
          step: 'humanize',
          draft: drafts[0],
          vacancy,
          variantType: VARIANT_TYPES[0],
          cvText,
          starrAnswers: answers,
        })
        const h1 = typeof r1.draft === 'string' && r1.draft ? r1.draft : (drafts[0] as string)

        setStream('humanizing2', 'Variant 2 wordt verfijnd (Bewijs)…')
        const r2 = await callStep({
          step: 'humanize',
          draft: drafts[1],
          vacancy,
          variantType: VARIANT_TYPES[1],
          cvText,
          starrAnswers: answers,
        })
        const h2 = typeof r2.draft === 'string' && r2.draft ? r2.draft : (drafts[1] as string)

        setStream('humanizing3', 'Variant 3 wordt verfijnd (Probleemoplossing)…')
        const r3 = await callStep({
          step: 'humanize',
          draft: drafts[2],
          vacancy,
          variantType: VARIANT_TYPES[2],
          cvText,
          starrAnswers: answers,
        })
        const h3 = typeof r3.draft === 'string' && r3.draft ? r3.draft : (drafts[2] as string)

        // ── Stap 3: Critic ×3 — Hiring Manager review ────────────────────────
        setStream('critiquing1', 'Hiring Manager beoordeelt variant 1…')
        const c1 = await callStep({
          step: 'critique',
          draft: h1,
          vacancy,
          cvText,
          impliedChallenges,
        })
        const letter1 = typeof c1.draft === 'string' && c1.draft ? c1.draft : h1

        setStream('critiquing2', 'Hiring Manager beoordeelt variant 2…')
        const c2 = await callStep({
          step: 'critique',
          draft: h2,
          vacancy,
          cvText,
          impliedChallenges,
        })
        const letter2 = typeof c2.draft === 'string' && c2.draft ? c2.draft : h2

        setStream('critiquing3', 'Hiring Manager beoordeelt variant 3…')
        const c3 = await callStep({
          step: 'critique',
          draft: h3,
          vacancy,
          cvText,
          impliedChallenges,
        })
        const letter3 = typeof c3.draft === 'string' && c3.draft ? c3.draft : h3

        setLetters([letter1, letter2, letter3])
        setStream(null)
        setStep(4)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Er ging iets mis bij het genereren.'
        setError(msg)
        setStep(2)
      }
    }

    run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentStage = streamStage ?? 'writing3'
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
            <h2 className="text-lg font-semibold">3 varianten worden geschreven</h2>
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
            Dit duurt doorgaans twee tot drie minuten. Laat dit tabblad open staan.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
