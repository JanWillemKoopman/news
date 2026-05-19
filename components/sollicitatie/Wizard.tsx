'use client'

import Link from 'next/link'
import { Check, Sparkles } from 'lucide-react'
import { useCoverLetterStore } from '@/store/coverLetterStore'
import { cn } from '@/lib/utils'
import Step1Input from './Step1Input'
import Step2Questions from './Step2Questions'
import Step3Loading from './Step3Loading'
import Step4Result from './Step4Result'

const STEPS = ['Invoer', 'Verdiepende vragen', 'Genereren', 'Resultaat']

export default function Wizard() {
  const step = useCoverLetterStore((s) => s.step)

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-card/40 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
                <Sparkles size={14} className="text-primary" />
              </div>
              <span className="text-sm font-semibold tracking-tight">
                The Ultimate Cover Letter Agent
              </span>
            </div>
            <Link
              href="/"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Advisor &rarr;
            </Link>
          </div>

          <ol className="flex items-center gap-2">
            {STEPS.map((label, i) => {
              const n = (i + 1) as 1 | 2 | 3 | 4
              const done = step > n
              const active = step === n
              return (
                <li key={label} className="flex items-center gap-2 flex-1 last:flex-none">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 border transition-colors',
                        done && 'bg-primary border-primary text-primary-foreground',
                        active && 'border-primary text-primary',
                        !done && !active && 'border-border text-muted-foreground'
                      )}
                    >
                      {done ? <Check size={12} strokeWidth={3} /> : n}
                    </span>
                    <span
                      className={cn(
                        'text-xs font-medium truncate hidden sm:block',
                        active ? 'text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={cn(
                        'h-px flex-1 transition-colors',
                        done ? 'bg-primary' : 'bg-border'
                      )}
                    />
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      </header>

      <main className="flex-1">
        {step === 1 && <Step1Input />}
        {step === 2 && <Step2Questions />}
        {step === 3 && <Step3Loading />}
        {step === 4 && <Step4Result />}
      </main>
    </div>
  )
}
