'use client'

import { useState } from 'react'
import { Plus, Trash2, Check, X, Clock } from 'lucide-react'
import { useWeddingStore } from '@/store/weddingStore'
import type { Guest } from '@/types/wedding'
import { cn } from '@/lib/utils'

const RSVP_CONFIG = {
  confirmed: { label: 'Bevestigd', icon: Check, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  declined: { label: 'Afgemeld', icon: X, color: 'text-red-500 bg-red-50 border-red-200' },
  pending: { label: 'Uitgenodigd', icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-200' },
}

export default function GuestModule() {
  const { guests, addGuest, updateGuest, removeGuest } = useWeddingStore()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [plusOne, setPlusOne] = useState(false)

  const confirmed = guests.filter((g) => g.rsvp === 'confirmed')
  const declined = guests.filter((g) => g.rsvp === 'declined')
  const pending = guests.filter((g) => g.rsvp === 'pending')
  const totalWithPlusOnes = confirmed.reduce((s, g) => s + (g.plusOne ? 2 : 1), 0)
    + pending.reduce((s, g) => s + (g.plusOne ? 2 : 1), 0)

  function handleAdd() {
    if (!name.trim()) return
    addGuest({ name: name.trim(), plusOne, rsvp: 'pending' })
    setName('')
    setPlusOne(false)
    setShowForm(false)
  }

  function cycleRsvp(guest: Guest) {
    const order: Guest['rsvp'][] = ['pending', 'confirmed', 'declined']
    const next = order[(order.indexOf(guest.rsvp) + 1) % order.length]
    updateGuest(guest.id, { rsvp: next })
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Bevestigd', count: confirmed.length, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
          { label: 'Uitgenodigd', count: pending.length, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
          { label: 'Afgemeld', count: declined.length, color: 'text-red-500', bg: 'bg-red-50 border-red-100' },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className={`rounded-2xl border p-4 text-center ${bg}`}>
            <p className={`text-2xl font-bold ${color}`}>{count}</p>
            <p className="text-xs text-stone-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {guests.length > 0 && (
        <div className="bg-stone-50 rounded-xl border border-stone-100 px-4 py-2 text-sm text-stone-500">
          Verwacht totaal (incl. +1): <span className="font-semibold text-stone-800">{totalWithPlusOnes} personen</span>
        </div>
      )}

      {/* Guest list */}
      {guests.length > 0 && (
        <div className="space-y-2">
          {guests.map((guest) => {
            const rsvp = RSVP_CONFIG[guest.rsvp]
            const Icon = rsvp.icon
            return (
              <div
                key={guest.id}
                className="bg-white rounded-xl border border-stone-100 px-4 py-3 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-stone-900 text-sm">{guest.name}</span>
                    {guest.plusOne && (
                      <span className="text-xs text-stone-400">+1</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => cycleRsvp(guest)}
                  className={cn(
                    'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors',
                    rsvp.color
                  )}
                >
                  <Icon size={11} strokeWidth={2.5} />
                  {rsvp.label}
                </button>
                <button
                  onClick={() => removeGuest(guest.id)}
                  className="text-stone-200 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {guests.length === 0 && !showForm && (
        <div className="text-center py-8 text-stone-400">
          <p className="text-sm">Nog geen gasten toegevoegd.</p>
          <p className="text-xs mt-1">Klik hieronder om te beginnen.</p>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-rose-200 p-5 space-y-3 animate-fade-in">
          <p className="font-semibold text-stone-800 text-sm">Gast toevoegen</p>
          <input
            type="text"
            placeholder="Naam van de gast"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="w-full border border-stone-200 focus:border-rose-400 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-colors"
          />
          <button
            onClick={() => setPlusOne(!plusOne)}
            className={cn(
              'flex items-center gap-2 text-sm font-medium transition-colors',
              plusOne ? 'text-rose-600' : 'text-stone-400 hover:text-stone-600'
            )}
          >
            <div className={cn(
              'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
              plusOne ? 'bg-rose-500 border-rose-500' : 'border-stone-300'
            )}>
              {plusOne && <Check size={10} className="text-white" strokeWidth={3} />}
            </div>
            Komt met +1
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!name.trim()}
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
          Voeg gast toe
        </button>
      )}
    </div>
  )
}
