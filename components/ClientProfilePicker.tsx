'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Briefcase, Loader2, Plus, X } from 'lucide-react'
import type { ClientProfileSummary } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: (profileId: string) => void
}

export default function ClientProfilePicker({ open, onClose, onConfirm }: Props) {
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<ClientProfileSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/profiles', { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as { profiles: ClientProfileSummary[] }
        if (cancelled) return
        const list = data.profiles ?? []
        setProfiles(list)
        // Voorselectie: meest recent gewijzigde klant.
        if (list.length > 0 && list[0].id) setSelectedId(list[0].id)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Kon klantprofielen niet laden')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [open])

  if (!open) return null

  const empty = !loading && profiles.length === 0

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center px-4 py-8 bg-ink-900/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-picker-title"
    >
      <div className="w-full max-w-md bg-cream-50 rounded-3xl shadow-xl border border-cream-500 overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-3">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-clay-500/15 border border-clay-500/30 flex items-center justify-center">
                <Briefcase size={13} className="text-clay-600" />
              </div>
              <span className="text-[10px] font-medium text-ink-500 uppercase tracking-[0.18em]">
                Voor welke klant?
              </span>
            </div>
            <h2
              id="client-picker-title"
              className="font-serif font-medium text-2xl text-ink-900 tracking-tight leading-tight"
            >
              {empty ? 'Maak eerst een klantprofiel aan' : 'Kies een klant voor deze sessie'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="w-8 h-8 rounded-full hover:bg-cream-300 flex items-center justify-center flex-shrink-0"
          >
            <X size={15} className="text-ink-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-3">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={18} className="animate-spin text-ink-400" />
            </div>
          )}

          {error && (
            <p className="mb-3 text-sm text-clay-700 bg-clay-100/60 border border-clay-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {empty && (
            <div className="py-2">
              <p className="text-sm text-ink-500 leading-relaxed mb-5">
                Het bureau werkt het beste als het weet voor wie het werkt. Maak eerst
                een klantprofiel aan met de basics (naam, branche, korte omschrijving)
                en kom dan terug om de sessie te starten.
              </p>
              <Link
                href="/profile/new"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-clay-500 hover:bg-clay-600 text-white text-sm font-medium transition-colors"
              >
                <Plus size={14} />
                Eerste klantprofiel aanmaken
              </Link>
            </div>
          )}

          {!loading && profiles.length > 0 && (
            <>
              <p className="text-sm text-ink-500 leading-relaxed mb-4">
                De gekozen klant levert context aan Iris en het team. Snapshot wordt
                bevroren in deze sessie — latere wijzigingen aan het klantprofiel
                vervuilen oude sessies niet.
              </p>
              <ul className="space-y-2 mb-2">
                {profiles.map((p) => {
                  const checked = p.id === selectedId
                  return (
                    <li key={p.id}>
                      <label
                        className={[
                          'flex items-start gap-3 px-4 py-3 rounded-2xl border cursor-pointer transition-colors',
                          checked
                            ? 'bg-cream-200 border-clay-500/40'
                            : 'bg-cream-50 border-cream-500 hover:border-cream-600',
                        ].join(' ')}
                      >
                        <input
                          type="radio"
                          name="client-profile"
                          checked={checked}
                          onChange={() => p.id && setSelectedId(p.id)}
                          className="mt-1 accent-clay-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-ink-900 truncate">
                            {p.name}
                          </p>
                          {p.industry && (
                            <p className="text-xs text-ink-500 truncate">{p.industry}</p>
                          )}
                        </div>
                      </label>
                    </li>
                  )
                })}
              </ul>
              <Link
                href="/profile/new"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-clay-600 hover:text-clay-700 mt-1"
              >
                <Plus size={11} />
                Klant toevoegen
              </Link>
            </>
          )}
        </div>

        {!empty && (
          <div className="px-6 py-4 border-t border-cream-500 bg-cream-100">
            <button
              type="button"
              disabled={!selectedId || loading}
              onClick={() => selectedId && onConfirm(selectedId)}
              className={[
                'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full text-sm font-medium transition-all duration-200',
                selectedId && !loading
                  ? 'bg-clay-500 hover:bg-clay-600 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5'
                  : 'bg-cream-400 text-ink-400 cursor-not-allowed',
              ].join(' ')}
            >
              Start sessie voor deze klant
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
