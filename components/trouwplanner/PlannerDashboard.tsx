'use client'

import { useState, useEffect } from 'react'
import {
  Heart, CalendarDays, Wallet, ListChecks, Users, Building2,
  Save, Settings, X, ChevronRight, Sparkles,
} from 'lucide-react'
import { useWeddingStore } from '@/store/weddingStore'
import BudgetModule from './BudgetModule'
import TaskModule from './TaskModule'
import GuestModule from './GuestModule'
import VendorModule from './VendorModule'
import RegistrationModal from './RegistrationModal'
import { cn } from '@/lib/utils'
import type { ActiveTab } from '@/store/weddingStore'

function getDaysUntilWedding(dateStr: string | null): number | null {
  if (!dateStr) return null
  const wedding = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  wedding.setHours(0, 0, 0, 0)
  return Math.round((wedding.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

const TABS: { id: ActiveTab; label: string; icon: typeof Wallet }[] = [
  { id: 'taken', label: 'Taken', icon: ListChecks },
  { id: 'budget', label: 'Budget', icon: Wallet },
  { id: 'gasten', label: 'Gasten', icon: Users },
  { id: 'leveranciers', label: 'Leveranciers', icon: Building2 },
]

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function CountdownBanner() {
  const { wedding } = useWeddingStore()
  const days = getDaysUntilWedding(wedding.date)

  if (days === null) {
    return (
      <div className="bg-gradient-to-r from-rose-400 to-pink-500 rounded-2xl p-5 text-white mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-rose-100 text-xs font-semibold uppercase tracking-wider mb-1">Jullie grote dag</p>
            <p className="text-xl font-bold">{wedding.partner1} & {wedding.partner2}</p>
            <p className="text-rose-200 text-sm mt-1">Datum nog niet ingesteld</p>
          </div>
          <CalendarDays size={36} className="text-rose-200/60" />
        </div>
      </div>
    )
  }

  if (days === 0) {
    return (
      <div className="bg-gradient-to-r from-rose-500 to-pink-500 rounded-2xl p-5 text-white mb-6">
        <div className="text-center">
          <p className="text-4xl mb-1">💍</p>
          <p className="text-xl font-bold">Vandaag is het zover!</p>
          <p className="text-rose-200 text-sm mt-1">
            {wedding.partner1} & {wedding.partner2} — {formatDate(wedding.date)}
          </p>
        </div>
      </div>
    )
  }

  if (days < 0) {
    return (
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-5 text-white mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wider mb-1">Getrouwd!</p>
            <p className="text-xl font-bold">{wedding.partner1} & {wedding.partner2}</p>
            <p className="text-emerald-200 text-sm mt-1">{formatDate(wedding.date)} · {Math.abs(days)} dagen geleden</p>
          </div>
          <Heart size={36} className="text-emerald-200/60 fill-emerald-200/40" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-rose-500 to-pink-500 rounded-2xl p-5 text-white mb-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-rose-100 text-xs font-semibold uppercase tracking-wider mb-1">Jullie grote dag</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">{days}</span>
            <span className="text-rose-200 text-lg">dagen</span>
          </div>
          <p className="text-rose-200 text-sm mt-1">
            {wedding.partner1} & {wedding.partner2} · {formatDate(wedding.date)}
          </p>
        </div>
        <CalendarDays size={36} className="text-rose-200/60" />
      </div>
    </div>
  )
}

function SaveBanner() {
  const { isRegistered, totalActionsCount, setShowRegistrationModal } = useWeddingStore()
  const [dismissed, setDismissed] = useState(false)

  if (isRegistered || dismissed || totalActionsCount < 1) return null

  return (
    <div className="bg-gradient-to-r from-stone-800 to-stone-900 text-white rounded-2xl p-4 mb-6 flex items-center gap-3 animate-fade-in">
      <Sparkles size={18} className="text-amber-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Sla jullie plan gratis op</p>
        <p className="text-stone-400 text-xs">Zodat het altijd beschikbaar is, ook op andere apparaten.</p>
      </div>
      <button
        onClick={() => setShowRegistrationModal(true)}
        className="flex items-center gap-1.5 bg-white text-stone-900 text-xs font-semibold px-3 py-2 rounded-xl hover:bg-stone-100 transition-colors whitespace-nowrap flex-shrink-0"
      >
        Bewaar gratis
        <ChevronRight size={12} />
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="text-stone-500 hover:text-stone-300 transition-colors flex-shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  )
}

function QuickStats() {
  const { tasks, guests, budgetItems, vendors, wedding } = useWeddingStore()
  const completedTasks = tasks.filter((t) => t.completed).length
  const confirmedGuests = guests.filter((g) => g.rsvp === 'confirmed').length
  const bookedVendors = vendors.filter((v) => v.status === 'geboekt').length
  const spent = budgetItems.reduce((s, b) => s + (b.actual ?? 0), 0)

  const stats = [
    { label: 'Taken gedaan', value: `${completedTasks}/${tasks.length}`, color: 'text-blue-600' },
    { label: 'Gasten bevestigd', value: `${confirmedGuests}/${guests.length || '—'}`, color: 'text-violet-600' },
    { label: 'Leveranciers geboekt', value: `${bookedVendors}/${vendors.length || '—'}`, color: 'text-emerald-600' },
    { label: 'Besteed', value: wedding.budget ? `${Math.round((spent / wedding.budget) * 100)}%` : '—', color: 'text-amber-600' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {stats.map(({ label, value, color }) => (
        <div key={label} className="bg-white rounded-xl border border-stone-100 p-3 text-center">
          <p className={`text-xl font-bold ${color}`}>{value}</p>
          <p className="text-xs text-stone-400 mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  )
}

export default function PlannerDashboard() {
  const {
    wedding, activeTab, setActiveTab,
    showRegistrationModal, setShowRegistrationModal,
    isRegistered, updateWedding,
  } = useWeddingStore()

  const [showSettings, setShowSettings] = useState(false)
  const [editDate, setEditDate] = useState(wedding.date ?? '')
  const [editBudget, setEditBudget] = useState(wedding.budget?.toString() ?? '')

  useEffect(() => {
    setEditDate(wedding.date ?? '')
    setEditBudget(wedding.budget?.toString() ?? '')
  }, [wedding.date, wedding.budget])

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Top nav */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-stone-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart size={16} className="text-rose-500 fill-rose-500" />
            <span className="font-semibold text-stone-900 text-sm">
              {wedding.partner1} & {wedding.partner2}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!isRegistered && (
              <button
                onClick={() => setShowRegistrationModal(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors border border-rose-100"
              >
                <Save size={13} />
                Opslaan
              </button>
            )}
            {isRegistered && (
              <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-lg">
                ✓ Opgeslagen
              </span>
            )}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-stone-400 hover:text-stone-600 transition-colors p-1.5 rounded-lg hover:bg-stone-100"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Settings panel */}
      {showSettings && (
        <div className="bg-white border-b border-stone-100 shadow-sm animate-fade-in">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-stone-900 text-sm">Instellingen</p>
              <button onClick={() => setShowSettings(false)} className="text-stone-400 hover:text-stone-600">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">Trouwdatum</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  onBlur={() => updateWedding({ date: editDate || null })}
                  className="w-full border border-stone-200 focus:border-rose-400 rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">Totaalbudget (€)</label>
                <input
                  type="number"
                  placeholder="Bijv. 15000"
                  value={editBudget}
                  onChange={(e) => setEditBudget(e.target.value)}
                  onBlur={() => updateWedding({ budget: editBudget ? parseInt(editBudget) : null })}
                  className="w-full border border-stone-200 focus:border-rose-400 rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <SaveBanner />
        <CountdownBanner />
        <QuickStats />

        {/* Tab navigation */}
        <div className="bg-white rounded-2xl border border-stone-100 mb-6 overflow-hidden">
          <div className="flex border-b border-stone-100">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  'flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 px-2 text-xs sm:text-sm font-medium transition-colors border-b-2 -mb-px',
                  activeTab === id
                    ? 'border-rose-500 text-rose-600 bg-rose-50/50'
                    : 'border-transparent text-stone-400 hover:text-stone-700 hover:bg-stone-50'
                )}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-6">
            {activeTab === 'taken' && <TaskModule />}
            {activeTab === 'budget' && <BudgetModule />}
            {activeTab === 'gasten' && <GuestModule />}
            {activeTab === 'leveranciers' && <VendorModule />}
          </div>
        </div>
      </main>

      {showRegistrationModal && <RegistrationModal />}
    </div>
  )
}
