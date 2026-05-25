'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useWeddingStore } from '@/store/weddingStore'
import type { Vendor } from '@/types/wedding'
import { cn } from '@/lib/utils'

const VENDOR_CATEGORIES = [
  'Fotografie & Video',
  'Catering',
  'Bloemen & Decoratie',
  'Muziek & DJ',
  'Locatie',
  'Kleding',
  'Visagiste & Kapper',
  'Trouwauto',
  'Trouwambtenaar',
  'Overig',
]

const STATUS_CONFIG: Record<Vendor['status'], { label: string; color: string }> = {
  zoekend: { label: 'Zoekend', color: 'bg-stone-100 text-stone-600 border-stone-200' },
  contact: { label: 'Contact opgenomen', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  geboekt: { label: 'Geboekt', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
}

export default function VendorModule() {
  const { vendors, addVendor, updateVendor, removeVendor } = useWeddingStore()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState(VENDOR_CATEGORIES[0])
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')

  const booked = vendors.filter((v) => v.status === 'geboekt').length

  function handleAdd() {
    if (!name.trim()) return
    addVendor({
      category,
      name: name.trim(),
      status: 'zoekend',
      price: price ? parseInt(price) : null,
      notes: notes.trim(),
    })
    setName('')
    setPrice('')
    setNotes('')
    setShowForm(false)
  }

  function cycleStatus(vendor: Vendor) {
    const order: Vendor['status'][] = ['zoekend', 'contact', 'geboekt']
    const next = order[(order.indexOf(vendor.status) + 1) % order.length]
    updateVendor(vendor.id, { status: next })
  }

  const grouped = VENDOR_CATEGORIES.reduce<Record<string, Vendor[]>>((acc, cat) => {
    const items = vendors.filter((v) => v.category === cat)
    if (items.length > 0) acc[cat] = items
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {/* Summary */}
      {vendors.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-100 p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-stone-900">{booked} van {vendors.length} leveranciers geboekt</p>
            <p className="text-xs text-stone-400 mt-0.5">
              {vendors.length - booked > 0
                ? `Nog ${vendors.length - booked} te boeken`
                : 'Alles geregeld!'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-stone-500">Totaal gepland</p>
            <p className="font-bold text-stone-900">
              €{vendors.reduce((s, v) => s + (v.price ?? 0), 0).toLocaleString('nl-NL')}
            </p>
          </div>
        </div>
      )}

      {vendors.length === 0 && !showForm && (
        <div className="text-center py-8 text-stone-400">
          <p className="text-sm">Nog geen leveranciers toegevoegd.</p>
          <p className="text-xs mt-1">Voeg fotograaf, catering en meer toe.</p>
        </div>
      )}

      {/* Grouped list */}
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
          <div className="px-4 py-2.5 bg-stone-50 border-b border-stone-100">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">{cat}</p>
          </div>
          <div className="divide-y divide-stone-50">
            {items.map((vendor) => {
              const status = STATUS_CONFIG[vendor.status]
              return (
                <div key={vendor.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-stone-900 text-sm">{vendor.name}</span>
                      {vendor.price && (
                        <span className="text-xs text-stone-400">€{vendor.price.toLocaleString('nl-NL')}</span>
                      )}
                    </div>
                    {vendor.notes && (
                      <p className="text-xs text-stone-400 mt-0.5 truncate">{vendor.notes}</p>
                    )}
                  </div>
                  <button
                    onClick={() => cycleStatus(vendor)}
                    className={cn(
                      'text-xs font-medium px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap',
                      status.color
                    )}
                  >
                    {status.label}
                  </button>
                  <button
                    onClick={() => removeVendor(vendor.id)}
                    className="text-stone-200 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-rose-200 p-5 space-y-3 animate-fade-in">
          <p className="font-semibold text-stone-800 text-sm">Leverancier toevoegen</p>
          <input
            type="text"
            placeholder="Naam leverancier"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-stone-200 focus:border-rose-400 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-colors"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border border-stone-200 focus:border-rose-400 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-colors bg-white"
            >
              {VENDOR_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-sm">€</span>
              <input
                type="number"
                placeholder="Prijs (optioneel)"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full border border-stone-200 focus:border-rose-400 rounded-xl pl-7 pr-3.5 py-2.5 text-sm outline-none transition-colors"
              />
            </div>
          </div>
          <input
            type="text"
            placeholder="Notitie (optioneel)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-stone-200 focus:border-rose-400 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-colors"
          />
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
          Voeg leverancier toe
        </button>
      )}
    </div>
  )
}
