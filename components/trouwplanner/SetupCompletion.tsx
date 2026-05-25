'use client'

import { useState } from 'react'
import {
  ArrowLeft, ArrowRight, Heart, Users, Wallet, Sparkles,
  Crown, UserCheck, CheckCircle2, Circle, Plus, X, PartyPopper,
} from 'lucide-react'
import { useWeddingStore } from '@/store/weddingStore'
import {
  BUDGET_CATEGORY_LABELS, BUDGET_SPLIT, WEDDING_STYLE_LABELS,
  ARRANGED_OPTIONS, type BudgetCategory, type WeddingStyle,
} from '@/types/wedding'

type Step = 'guests' | 'budget' | 'team' | 'arranged' | 'done'

const INPUT_STEPS: Step[] = ['guests', 'budget', 'team', 'arranged']

const GUEST_PRESETS = [
  { label: '~30', value: 30 },
  { label: '~60', value: 60 },
  { label: '~100', value: 100 },
  { label: '150+', value: 150 },
]

const CATEGORIES = Object.keys(BUDGET_SPLIT) as BudgetCategory[]

function splitOf(total: number): Record<BudgetCategory, string> {
  const out = {} as Record<BudgetCategory, string>
  for (const c of CATEGORIES) out[c] = total > 0 ? String(Math.round(total * BUDGET_SPLIT[c])) : ''
  return out
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const w = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  w.setHours(0, 0, 0, 0)
  return Math.round((w.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

interface Props {
  onClose: () => void
}

export default function SetupCompletion({ onClose }: Props) {
  const {
    wedding, tasks, vendors, budgetItems,
    updateWedding, applyBudgetSplit, applyArranged, markSetupStep,
  } = useWeddingStore()

  const [step, setStep] = useState<Step>('guests')

  // Step: guests & style
  const [guestEstimate, setGuestEstimate] = useState<number | null>(wedding.guestEstimate)
  const [customGuests, setCustomGuests] = useState('')
  const [style, setStyle] = useState<WeddingStyle | null>(wedding.style)

  // Step: budget split
  const [budgetStr, setBudgetStr] = useState(wedding.budget?.toString() ?? '')
  const [amounts, setAmounts] = useState<Record<BudgetCategory, string>>(
    splitOf(wedding.budget ?? 0)
  )

  // Step: team
  const [masters, setMasters] = useState<string[]>(
    wedding.ceremonyMasters.length ? wedding.ceremonyMasters : ['']
  )
  const [witnesses, setWitnesses] = useState<string[]>(
    wedding.witnesses.length ? wedding.witnesses : ['']
  )

  // Step: arranged
  const [arranged, setArranged] = useState<Set<string>>(new Set())

  const stepIndex = INPUT_STEPS.indexOf(step)
  const budgetNum = budgetStr ? parseInt(budgetStr) : 0
  const amountsSum = CATEGORIES.reduce((s, c) => s + (parseInt(amounts[c]) || 0), 0)

  function saveGuests() {
    const g = customGuests ? parseInt(customGuests) : guestEstimate
    updateWedding({ guestEstimate: g ?? null, style })
    if (g || style) markSetupStep('guests')
  }

  function saveBudget() {
    if (budgetNum && budgetNum !== wedding.budget) updateWedding({ budget: budgetNum })
    applyBudgetSplit(CATEGORIES.map((c) => ({ category: c, estimated: parseInt(amounts[c]) || 0 })))
  }

  function saveTeam() {
    const cm = masters.map((m) => m.trim()).filter(Boolean)
    const w = witnesses.map((m) => m.trim()).filter(Boolean)
    updateWedding({ ceremonyMasters: cm, witnesses: w })
    if (cm.length || w.length) markSetupStep('team')
  }

  function saveArranged() {
    if (arranged.size > 0) applyArranged(Array.from(arranged))
  }

  function advance() {
    if (step === 'guests') setStep('budget')
    else if (step === 'budget') setStep('team')
    else if (step === 'team') setStep('arranged')
    else if (step === 'arranged') setStep('done')
  }

  function primary() {
    if (step === 'guests') saveGuests()
    else if (step === 'budget') saveBudget()
    else if (step === 'team') saveTeam()
    else if (step === 'arranged') saveArranged()
    advance()
  }

  function back() {
    if (step === 'guests') onClose()
    else if (step === 'budget') setStep('guests')
    else if (step === 'team') setStep('budget')
    else if (step === 'arranged') setStep('team')
    else onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto animate-fade-in">
      {/* Top bar */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 py-4 border-b border-stone-100">
        <button onClick={back} className="flex items-center gap-1.5 text-stone-500 hover:text-stone-700 transition-colors text-sm font-medium">
          <ArrowLeft size={16} />
          Terug
        </button>
        <div className="flex items-center gap-2">
          <Heart size={16} className="text-rose-500 fill-rose-500" />
          <span className="text-sm font-semibold text-stone-700">Maak compleet</span>
        </div>
        {step !== 'done' ? (
          <div className="flex gap-1.5">
            {INPUT_STEPS.map((s, i) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i <= stepIndex ? 'bg-rose-500 w-6' : 'bg-stone-200 w-4'
                }`}
              />
            ))}
          </div>
        ) : (
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="px-4 sm:px-6 py-10">
        <div className="w-full max-w-lg mx-auto animate-fade-in">

          {/* Step 1: guests & style */}
          {step === 'guests' && (
            <div>
              <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-6">
                <Users size={24} className="text-rose-500" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-2">
                Hoeveel gasten & welke sfeer?
              </h2>
              <p className="text-stone-500 mb-8">
                Zo stemmen we het budget per persoon en de tips beter af.
              </p>

              <p className="text-sm font-medium text-stone-700 mb-2">Aantal gasten</p>
              <div className="grid grid-cols-4 gap-2.5 mb-3">
                {GUEST_PRESETS.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => { setGuestEstimate(value); setCustomGuests('') }}
                    className={`py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                      guestEstimate === value && !customGuests
                        ? 'border-rose-500 bg-rose-50 text-rose-700'
                        : 'border-stone-200 text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                type="number"
                placeholder="Of voer een aantal in"
                value={customGuests}
                onChange={(e) => { setCustomGuests(e.target.value); setGuestEstimate(null) }}
                className="w-full border-2 border-stone-200 focus:border-rose-400 rounded-xl px-4 py-3 text-stone-900 text-base outline-none transition-colors placeholder:text-stone-300 mb-8"
              />

              <p className="text-sm font-medium text-stone-700 mb-2">Sfeer</p>
              <div className="grid grid-cols-2 gap-2.5">
                {(Object.keys(WEDDING_STYLE_LABELS) as WeddingStyle[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStyle(style === s ? null : s)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      style === s
                        ? 'border-rose-500 bg-rose-50'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <p className={`text-sm font-semibold ${style === s ? 'text-rose-700' : 'text-stone-800'}`}>
                      {WEDDING_STYLE_LABELS[s].label}
                    </p>
                    <p className="text-xs text-stone-400 mt-0.5">{WEDDING_STYLE_LABELS[s].hint}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: budget split */}
          {step === 'budget' && (
            <div>
              <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-6">
                <Wallet size={24} className="text-rose-500" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-2">
                Automatische budgetverdeling
              </h2>
              <p className="text-stone-500 mb-6">
                Een richtlijn op basis van Nederlandse bruiloften. Pas alles gerust aan.
              </p>

              <div className="relative mb-3">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-medium">€</span>
                <input
                  type="number"
                  placeholder="Totaalbudget"
                  value={budgetStr}
                  onChange={(e) => setBudgetStr(e.target.value)}
                  className="w-full border-2 border-stone-200 focus:border-rose-400 rounded-xl pl-8 pr-4 py-3 text-stone-900 text-base outline-none transition-colors placeholder:text-stone-300"
                />
              </div>
              <button
                onClick={() => setAmounts(splitOf(budgetNum))}
                disabled={!budgetNum}
                className="mb-5 flex items-center gap-1.5 text-sm font-medium text-rose-600 hover:text-rose-700 disabled:text-stone-300 transition-colors"
              >
                <Sparkles size={14} />
                Verdeel €{budgetNum.toLocaleString('nl-NL')} automatisch
              </button>

              <div className="space-y-2">
                {CATEGORIES.map((c) => (
                  <div key={c} className="flex items-center gap-3">
                    <span className="text-sm text-stone-700 flex-1">{BUDGET_CATEGORY_LABELS[c]}</span>
                    <span className="text-xs text-stone-400 w-9 text-right">{Math.round(BUDGET_SPLIT[c] * 100)}%</span>
                    <div className="relative w-32">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">€</span>
                      <input
                        type="number"
                        value={amounts[c]}
                        onChange={(e) => setAmounts((a) => ({ ...a, [c]: e.target.value }))}
                        className="w-full border border-stone-200 focus:border-rose-400 rounded-lg pl-6 pr-2 py-2 text-sm text-right outline-none transition-colors"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-stone-100">
                <span className="text-sm font-medium text-stone-600">Totaal verdeeld</span>
                <span className={`text-sm font-bold ${budgetNum > 0 && amountsSum > budgetNum ? 'text-red-500' : 'text-stone-900'}`}>
                  €{amountsSum.toLocaleString('nl-NL')}
                  {budgetNum > 0 && <span className="text-stone-400 font-normal"> / €{budgetNum.toLocaleString('nl-NL')}</span>}
                </span>
              </div>
            </div>
          )}

          {/* Step 3: team */}
          {step === 'team' && (
            <div>
              <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-6">
                <Crown size={24} className="text-rose-500" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-2">
                Jullie team
              </h2>
              <p className="text-stone-500 mb-8">
                Wie helpt jullie op de grote dag? Optioneel — later aanvullen kan ook.
              </p>

              <ListEditor
                icon={<Crown size={15} className="text-rose-400" />}
                title="Ceremoniemeester(s)"
                placeholder="Naam ceremoniemeester"
                items={masters}
                setItems={setMasters}
              />
              <div className="h-6" />
              <ListEditor
                icon={<UserCheck size={15} className="text-rose-400" />}
                title="Getuige(n)"
                placeholder="Naam getuige"
                items={witnesses}
                setItems={setWitnesses}
              />
            </div>
          )}

          {/* Step 4: arranged */}
          {step === 'arranged' && (
            <div>
              <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-6">
                <CheckCircle2 size={24} className="text-rose-500" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-2">
                Wat is al geregeld?
              </h2>
              <p className="text-stone-500 mb-8">
                We vinken de taken af en zetten leveranciers op &lsquo;geboekt&rsquo;.
              </p>

              <div className="space-y-2">
                {ARRANGED_OPTIONS.map((o) => {
                  const on = arranged.has(o.id)
                  return (
                    <button
                      key={o.id}
                      onClick={() => setArranged((prev) => {
                        const n = new Set(prev)
                        if (n.has(o.id)) n.delete(o.id); else n.add(o.id)
                        return n
                      })}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                        on ? 'border-rose-500 bg-rose-50' : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      {on
                        ? <CheckCircle2 size={20} className="text-rose-500 flex-shrink-0" />
                        : <Circle size={20} className="text-stone-300 flex-shrink-0" />}
                      <span className={`text-sm font-medium ${on ? 'text-rose-700' : 'text-stone-700'}`}>
                        {o.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Done / payoff */}
          {step === 'done' && (
            <PayoffStep
              days={daysUntil(wedding.date)}
              tasksDone={tasks.filter((t) => t.completed).length}
              tasksTotal={tasks.length}
              vendorsBooked={vendors.filter((v) => v.status === 'geboekt').length}
              budgetItems={budgetItems.length}
              onClose={onClose}
            />
          )}

          {/* CTA */}
          {step !== 'done' && (
            <div className="mt-8 flex items-center justify-between">
              <button onClick={advance} className="text-sm text-stone-400 hover:text-stone-600 transition-colors">
                Overslaan
              </button>
              <button
                onClick={primary}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/25 hover:-translate-y-0.5 transition-all duration-200"
              >
                {step === 'arranged' ? 'Afronden' : 'Volgende'}
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ListEditor({
  icon, title, placeholder, items, setItems,
}: {
  icon: React.ReactNode
  title: string
  placeholder: string
  items: string[]
  setItems: (v: string[]) => void
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-sm font-medium text-stone-700 mb-2">
        {icon}
        {title}
      </p>
      <div className="space-y-2">
        {items.map((val, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              placeholder={placeholder}
              value={val}
              onChange={(e) => setItems(items.map((v, j) => (j === i ? e.target.value : v)))}
              className="flex-1 border-2 border-stone-200 focus:border-rose-400 rounded-xl px-4 py-3 text-stone-900 text-sm outline-none transition-colors placeholder:text-stone-300"
            />
            {items.length > 1 && (
              <button
                onClick={() => setItems(items.filter((_, j) => j !== i))}
                className="text-stone-300 hover:text-red-400 transition-colors p-2"
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={() => setItems([...items, ''])}
        className="mt-2 flex items-center gap-1.5 text-sm font-medium text-stone-400 hover:text-rose-500 transition-colors"
      >
        <Plus size={14} />
        Nog iemand toevoegen
      </button>
    </div>
  )
}

function PayoffStep({
  days, tasksDone, tasksTotal, vendorsBooked, budgetItems, onClose,
}: {
  days: number | null
  tasksDone: number
  tasksTotal: number
  vendorsBooked: number
  budgetItems: number
  onClose: () => void
}) {
  const pct = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0
  const stats = [
    days !== null && days > 0 ? { value: String(days), label: 'dagen te gaan' } : null,
    { value: `${pct}%`, label: 'taken af' },
    vendorsBooked > 0 ? { value: String(vendorsBooked), label: 'leveranciers geboekt' } : null,
    budgetItems > 0 ? { value: String(budgetItems), label: 'budgetposten' } : null,
  ].filter(Boolean) as { value: string; label: string }[]

  return (
    <div className="text-center py-6">
      <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-6">
        <PartyPopper size={28} className="text-rose-500" />
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-2">
        Je planner is compleet!
      </h2>
      <p className="text-stone-500 mb-8">
        Alles staat klaar. Je kunt altijd alles aanpassen vanaf je dashboard.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-stone-50 rounded-2xl border border-stone-100 p-5">
            <p className="text-3xl font-bold text-rose-500">{s.value}</p>
            <p className="text-xs text-stone-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <button
        onClick={onClose}
        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/25 transition-all duration-200"
      >
        Naar mijn planner
        <ArrowRight size={16} />
      </button>
    </div>
  )
}
