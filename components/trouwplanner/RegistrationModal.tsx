'use client'

import { useState } from 'react'
import { X, Heart, CheckCircle2, ArrowRight, Shield } from 'lucide-react'
import { useWeddingStore } from '@/store/weddingStore'

export default function RegistrationModal() {
  const { setShowRegistrationModal, register, wedding, budgetItems, tasks, guests, vendors } = useWeddingStore()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const completedTasks = tasks.filter((t) => t.completed).length
  const savedItems = budgetItems.length + guests.length + vendors.length + completedTasks

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    // In production: call your auth API here (e.g. POST /api/auth/register)
    await new Promise((r) => setTimeout(r, 800))
    setLoading(false)
    setDone(true)
    register(email.trim(), name.trim() || email.split('@')[0])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm"
        onClick={() => setShowRegistrationModal(false)}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 animate-slide-up">
        <button
          onClick={() => setShowRegistrationModal(false)}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 transition-colors"
        >
          <X size={20} />
        </button>

        {done ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} className="text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-2">Jullie plan is opgeslagen!</h3>
            <p className="text-stone-500 text-sm">
              We sturen jullie een bevestigingsmail naar <strong>{email}</strong>.
            </p>
            <button
              onClick={() => setShowRegistrationModal(false)}
              className="mt-6 w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3.5 rounded-2xl transition-colors"
            >
              Ga verder met plannen
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-5">
              <Heart size={18} className="text-rose-500 fill-rose-500" />
              <span className="font-semibold text-stone-700 text-sm">Trouwplanner</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-stone-900 mb-2">
              Sla jullie plan gratis op
            </h3>
            <p className="text-stone-500 text-sm mb-5">
              Bewaar alles veilig zodat jullie plan altijd beschikbaar is — ook op andere apparaten.
            </p>

            {savedItems > 0 && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 mb-5">
                <p className="text-sm text-rose-700 font-medium">
                  Jullie plan bevat al {savedItems} opgeslagen {savedItems === 1 ? 'item' : 'items'}.
                </p>
                <p className="text-xs text-rose-500 mt-0.5">
                  Registreer nu zodat je dit niet kwijtraakt.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Jouw naam
                </label>
                <input
                  type="text"
                  placeholder={wedding.partner1 || 'Bijv. Emma'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border-2 border-stone-200 focus:border-rose-400 rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  E-mailadres <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="jullie@email.nl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border-2 border-stone-200 focus:border-rose-400 rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={!email.trim() || loading}
                className="w-full flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 disabled:bg-stone-100 disabled:text-stone-400 text-white font-semibold py-3.5 rounded-2xl text-sm transition-all"
              >
                {loading ? (
                  <span className="animate-pulse">Opslaan...</span>
                ) : (
                  <>
                    Plan opslaan
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center gap-1.5 justify-center mt-4">
              <Shield size={12} className="text-stone-400" />
              <p className="text-xs text-stone-400">Geen spam. Jullie data blijft privé.</p>
            </div>

            <button
              onClick={() => setShowRegistrationModal(false)}
              className="w-full text-center text-xs text-stone-400 hover:text-stone-600 mt-3 transition-colors"
            >
              Later, ga verder als gast
            </button>
          </>
        )}
      </div>
    </div>
  )
}
