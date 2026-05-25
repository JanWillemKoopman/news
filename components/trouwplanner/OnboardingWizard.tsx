'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Heart, CalendarDays, Users, Wallet, Check } from 'lucide-react'
import { useWeddingStore } from '@/store/weddingStore'

type Step = 'date' | 'names' | 'budget'

const STEPS: Step[] = ['date', 'names', 'budget']

const BUDGET_PRESETS = [
  { label: '< €10.000', value: 9000 },
  { label: '€10.000 – €15.000', value: 12500 },
  { label: '€15.000 – €25.000', value: 20000 },
  { label: '€25.000 – €40.000', value: 32500 },
  { label: '> €40.000', value: 50000 },
]

interface Props {
  onBack: () => void
}

export default function OnboardingWizard({ onBack }: Props) {
  const router = useRouter()
  const completeOnboarding = useWeddingStore((s) => s.completeOnboarding)

  const [step, setStep] = useState<Step>('date')
  const [date, setDate] = useState('')
  const [noDate, setNoDate] = useState(false)
  const [partner1, setPartner1] = useState('')
  const [partner2, setPartner2] = useState('')
  const [budget, setBudget] = useState<number | null>(null)
  const [customBudget, setCustomBudget] = useState('')

  const stepIndex = STEPS.indexOf(step)

  function next() {
    if (step === 'date') setStep('names')
    else if (step === 'names') setStep('budget')
    else finish()
  }

  function prev() {
    if (step === 'date') onBack()
    else if (step === 'names') setStep('date')
    else if (step === 'budget') setStep('names')
  }

  function finish() {
    completeOnboarding({
      date: noDate ? null : date || null,
      partner1: partner1.trim() || 'Partner 1',
      partner2: partner2.trim() || 'Partner 2',
      budget: customBudget ? parseInt(customBudget) : budget,
    })
    router.push('/trouwplanner/plan')
  }

  const canNext =
    step === 'date' ? (noDate || date !== '') :
    step === 'names' ? (partner1.trim() !== '' && partner2.trim() !== '') :
    true

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-stone-100">
        <button onClick={prev} className="flex items-center gap-1.5 text-stone-500 hover:text-stone-700 transition-colors text-sm font-medium">
          <ArrowLeft size={16} />
          Terug
        </button>
        <div className="flex items-center gap-2">
          <Heart size={16} className="text-rose-500 fill-rose-500" />
          <span className="text-sm font-semibold text-stone-700">Trouwplanner</span>
        </div>
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i <= stepIndex ? 'bg-rose-500 w-8' : 'bg-stone-200 w-6'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
        <div className="w-full max-w-lg animate-fade-in">

          {/* Step 1: Date */}
          {step === 'date' && (
            <div>
              <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-6">
                <CalendarDays size={24} className="text-rose-500" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-2">
                Wanneer is jullie grote dag?
              </h2>
              <p className="text-stone-500 mb-8">
                We maken direct een persoonlijke tijdlijn aan.
              </p>

              <input
                type="date"
                value={date}
                onChange={(e) => { setDate(e.target.value); setNoDate(false) }}
                disabled={noDate}
                className="w-full border-2 border-stone-200 focus:border-rose-400 rounded-xl px-4 py-3.5 text-stone-900 text-base outline-none transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              />

              <button
                onClick={() => { setNoDate(!noDate); setDate('') }}
                className={`mt-3 flex items-center gap-2 text-sm font-medium transition-colors ${
                  noDate ? 'text-rose-600' : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${noDate ? 'bg-rose-500 border-rose-500' : 'border-stone-300'}`}>
                  {noDate && <Check size={10} className="text-white" strokeWidth={3} />}
                </div>
                Hebben we nog geen datum
              </button>
            </div>
          )}

          {/* Step 2: Names */}
          {step === 'names' && (
            <div>
              <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-6">
                <Users size={24} className="text-rose-500" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-2">
                Wie gaan er trouwen?
              </h2>
              <p className="text-stone-500 mb-8">
                Dit gebruiken we om jullie planner te personaliseren.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Jouw naam
                  </label>
                  <input
                    type="text"
                    placeholder="Bijv. Emma"
                    value={partner1}
                    onChange={(e) => setPartner1(e.target.value)}
                    className="w-full border-2 border-stone-200 focus:border-rose-400 rounded-xl px-4 py-3.5 text-stone-900 text-base outline-none transition-colors placeholder:text-stone-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Naam van je partner
                  </label>
                  <input
                    type="text"
                    placeholder="Bijv. Daan"
                    value={partner2}
                    onChange={(e) => setPartner2(e.target.value)}
                    className="w-full border-2 border-stone-200 focus:border-rose-400 rounded-xl px-4 py-3.5 text-stone-900 text-base outline-none transition-colors placeholder:text-stone-300"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Budget */}
          {step === 'budget' && (
            <div>
              <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-6">
                <Wallet size={24} className="text-rose-500" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-2">
                Wat is jullie globale budget?
              </h2>
              <p className="text-stone-500 mb-6">
                Geen zorgen — dit kun je later aanpassen.
              </p>

              <div className="grid grid-cols-2 gap-2.5 mb-4">
                {BUDGET_PRESETS.map(({ label, value }) => (
                  <button
                    key={label}
                    onClick={() => { setBudget(value); setCustomBudget('') }}
                    className={`py-3 px-4 rounded-xl text-sm font-medium border-2 transition-all ${
                      budget === value && !customBudget
                        ? 'border-rose-500 bg-rose-50 text-rose-700'
                        : 'border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-medium">€</span>
                <input
                  type="number"
                  placeholder="Of voer een bedrag in"
                  value={customBudget}
                  onChange={(e) => { setCustomBudget(e.target.value); setBudget(null) }}
                  className="w-full border-2 border-stone-200 focus:border-rose-400 rounded-xl pl-8 pr-4 py-3.5 text-stone-900 text-base outline-none transition-colors placeholder:text-stone-300"
                />
              </div>

              <button
                onClick={finish}
                className="mt-3 text-sm text-stone-400 hover:text-stone-600 transition-colors"
              >
                Later instellen →
              </button>
            </div>
          )}

          {/* CTA */}
          <div className="mt-8 flex items-center justify-between">
            <span className="text-xs text-stone-400">
              Stap {stepIndex + 1} van {STEPS.length}
            </span>
            <button
              onClick={next}
              disabled={!canNext}
              className={`flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                canNext
                  ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/25 hover:-translate-y-0.5'
                  : 'bg-stone-100 text-stone-400 cursor-not-allowed'
              }`}
            >
              {step === 'budget' ? 'Maak mijn planner' : 'Volgende'}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
