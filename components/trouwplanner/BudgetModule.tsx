'use client'

import { useState } from 'react'
import { Plus, Trash2, CheckCircle2, Circle } from 'lucide-react'
import { useWeddingStore } from '@/store/weddingStore'
import { BUDGET_CATEGORY_LABELS, type BudgetCategory } from '@/types/wedding'

const CATEGORIES = Object.keys(BUDGET_CATEGORY_LABELS) as BudgetCategory[]

const CATEGORY_COLORS: Record<BudgetCategory, string> = {
  locatie: 'bg-blue-100 text-blue-700',
  catering: 'bg-orange-100 text-orange-700',
  fotografie: 'bg-violet-100 text-violet-700',
  kleding: 'bg-pink-100 text-pink-700',
  bloemen: 'bg-green-100 text-green-700',
  muziek: 'bg-yellow-100 text-yellow-700',
  transport: 'bg-cyan-100 text-cyan-700',
  overig: 'bg-stone-100 text-stone-600',
}

export default function BudgetModule() {
  const { budgetItems, wedding, addBudgetItem, updateBudgetItem, removeBudgetItem } = useWeddingStore()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState<BudgetCategory>('locatie')
  const [estimated, setEstimated] = useState('')

  const totalBudget = wedding.budget ?? 0
  const totalEstimated = budgetItems.reduce((s, b) => s + b.estimated, 0)
  const totalActual = budgetItems.reduce((s, b) => s + (b.actual ?? 0), 0)
  const pctUsed = totalBudget > 0 ? Math.min((totalEstimated / totalBudget) * 100, 100) : 0

  function handleAdd() {
    if (!name.trim() || !estimated) return
    addBudgetItem({
      category,
      name: name.trim(),
      estimated: parseInt(estimated),
      actual: null,
      paid: false,
    })
    setName('')
    setEstimated('')
    setCategory('locatie')
    setShowForm(false)
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-white rounded-2xl border border-stone-100 p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Totaal budget</p>
            <p className="text-2xl font-bold text-stone-900">
              €{totalEstimated.toLocaleString('nl-NL')}
              {totalBudget > 0 && (
                <span className="text-stone-400 text-base font-normal"> / €{totalBudget.toLocaleString('nl-NL')}</span>
              )}
            </p>
            {totalBudget > 0 && totalEstimated > totalBudget && (
              <p className="text-xs text-red-500 font-medium mt-1">
                ⚠ €{(totalEstimated - totalBudget).toLocaleString('nl-NL')} over budget
              </p>
            )}
          </div>
          {totalBudget === 0 && (
            <span className="text-xs text-stone-400 bg-stone-50 px-2 py-1 rounded-lg border border-stone-100">
              Stel budget in via instellingen
            </span>
          )}
        </div>

        {totalBudget > 0 && (
          <div>
            <div className="h-2 bg-stone-100 rounded-full overflow-hidden mb-1.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${totalEstimated > totalBudget ? 'bg-red-500' : 'bg-rose-500'}`}
                style={{ width: `${pctUsed}%` }}
              />
            </div>
            <p className="text-xs text-stone-400">{Math.round(pctUsed)}% van het budget gepland</p>
          </div>
        )}
      </div>

      {/* Items list */}
      {budgetItems.length > 0 && (
        <div className="space-y-2">
          {budgetItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-stone-100 p-4 flex items-center gap-3"
            >
              <button
                onClick={() => updateBudgetItem(item.id, { paid: !item.paid })}
                className="flex-shrink-0 text-stone-300 hover:text-emerald-500 transition-colors"
              >
                {item.paid
                  ? <CheckCircle2 size={20} className="text-emerald-500" />
                  : <Circle size={20} />
                }
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-stone-900 text-sm">{item.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[item.category]}`}>
                    {BUDGET_CATEGORY_LABELS[item.category]}
                  </span>
                  {item.paid && (
                    <span className="text-xs text-emerald-600 font-medium">Betaald</span>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-semibold text-stone-900 text-sm">€{item.estimated.toLocaleString('nl-NL')}</p>
              </div>
              <button
                onClick={() => removeBudgetItem(item.id)}
                className="flex-shrink-0 text-stone-200 hover:text-red-400 transition-colors ml-1"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-rose-200 p-5 space-y-3 animate-fade-in">
          <p className="font-semibold text-stone-800 text-sm">Nieuwe uitgave</p>
          <input
            type="text"
            placeholder="Naam (bijv. Trouwlocatie De Orangerie)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-stone-200 focus:border-rose-400 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-colors"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as BudgetCategory)}
              className="border border-stone-200 focus:border-rose-400 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-colors bg-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{BUDGET_CATEGORY_LABELS[c]}</option>
              ))}
            </select>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-sm">€</span>
              <input
                type="number"
                placeholder="Bedrag"
                value={estimated}
                onChange={(e) => setEstimated(e.target.value)}
                className="w-full border border-stone-200 focus:border-rose-400 rounded-xl pl-7 pr-3.5 py-2.5 text-sm outline-none transition-colors"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!name.trim() || !estimated}
              className="flex-1 bg-rose-500 hover:bg-rose-600 disabled:bg-stone-100 disabled:text-stone-400 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
            >
              Toevoegen
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-stone-500 hover:bg-stone-100 transition-colors"
            >
              Annuleer
            </button>
          </div>
        </div>
      )}

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-stone-200 hover:border-rose-300 text-stone-400 hover:text-rose-500 rounded-2xl py-4 text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Voeg uitgave toe
        </button>
      )}
    </div>
  )
}
