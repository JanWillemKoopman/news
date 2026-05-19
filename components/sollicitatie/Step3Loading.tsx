'use client'

import { useEffect, useRef } from 'react'
import { Check, Loader2, PenLine, ScanSearch, Sparkles, Users } from 'lucide-react'
import { useCoverLetterStore } from '@/store/coverLetterStore'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { IterationEvent, IterationStage, QuestionAnswer } from '@/types/cover-letter'

const STAGES: { stage: IterationStage; label: string; icon: typeof PenLine }[] = [
  { stage: 'writing', label: 'De Schrijver', icon: PenLine },
  { stage: 'reviewing', label: 'Het Recruiterpanel', icon: Users },
  { stage: 'refining', label: 'De Verfijner', icon: Sparkles },
  { stage: 'verdict', label: 'Het Eindoordeel', icon: ScanSearch },
]

const STAGE_PROGRESS: Record<IterationStage, number> = {
  writing: 12,
  reviewing: 42,
  refining: 70,
  verdict: 92,
  done: 100,
  error: 100,
}

const STAGE_ORDER: IterationStage[] = ['writing', 'reviewing', 'refining', 'verdict', 'done']

export default function Step3Loading() {
  const { streamStage, streamLabel, setStream, setResult, setStep, setError } =
    useCoverLetterStore()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const handleEvent = (event: IterationEvent) => {
      if (event.stage === 'done' && event.letter && event.verdict) {
        setResult(event.letter, event.verdict)
        setStream(null)
        setStep(4)
      } else if (event.stage === 'error') {
        setError(event.message ?? 'Er ging iets mis bij het genereren.')
        setStep(2)
      } else {
        setStream(event.stage, event.label ?? '')
      }
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

      setStream('writing', 'Voorbereiden…')

      try {
        const res = await fetch('/api/iterate-letter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cvText: analysis.cvText,
            vacancy: state.vacancyText,
            analysis,
            answers,
          }),
        })
        if (!res.ok || !res.body) throw new Error('stream mislukt')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (line.trim()) handleEvent(JSON.parse(line) as IterationEvent)
          }
        }
        if (buffer.trim()) handleEvent(JSON.parse(buffer) as IterationEvent)
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
            Dit duurt doorgaans één tot twee minuten. Laat dit tabblad open staan.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
