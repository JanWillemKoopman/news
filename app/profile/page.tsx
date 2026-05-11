'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Briefcase,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Users,
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { ClientProfileSummary } from '@/types'

export default function ProfileListPage() {
  const router = useRouter()
  const [authed, setAuthed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<ClientProfileSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/profiles', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { profiles: ClientProfileSummary[] }
      setProfiles(data.profiles ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kon klantprofielen niet laden')
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function init() {
      const supabase = createSupabaseBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      if (cancelled) return
      setAuthed(true)
      await load()
      if (!cancelled) {
        setLoading(false)
        window.scrollTo(0, 0)
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [router, load])

  async function handleDelete(id: string) {
    const ok = window.confirm(
      'Dit klantprofiel verwijderen? Eerdere sessies blijven behouden, maar verliezen wel hun koppeling.'
    )
    if (!ok) return
    setBusyId(id)
    try {
      const res = await fetch(`/api/profiles/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Verwijderen mislukt')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verwijderen mislukt')
    } finally {
      setBusyId(null)
    }
  }

  if (loading || !authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-200">
        <Loader2 size={20} className="animate-spin text-ink-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream-200">
      <header className="px-4 pt-12 pb-8">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-700 transition-colors mb-6"
          >
            <ArrowLeft size={14} />
            Terug
          </Link>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg bg-clay-500/15 border border-clay-500/30 flex items-center justify-center">
              <Briefcase size={14} className="text-clay-600" />
            </div>
            <span className="text-[11px] font-medium text-ink-500 uppercase tracking-[0.18em]">
              Klantprofielen
            </span>
          </div>
          <h1 className="font-serif font-medium text-3xl sm:text-4xl text-ink-900 tracking-tight leading-[1.1]">
            Jouw klanten
          </h1>
          <p className="text-ink-500 mt-3 text-base leading-relaxed">
            Maak een klantprofiel aan per klant waarvoor je werkt. Bij elke nieuwe
            sessie kies je voor welke klant het bureau aan de slag gaat.
          </p>
        </div>
      </header>

      <main className="px-4 pb-16">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-medium text-ink-500 uppercase tracking-[0.18em]">
              {profiles.length} {profiles.length === 1 ? 'klant' : 'klanten'}
            </p>
            <Link
              href="/profile/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-clay-500 hover:bg-clay-600 text-white text-sm font-medium transition-colors"
            >
              <Plus size={14} />
              Nieuw klantprofiel
            </Link>
          </div>

          {error && (
            <p className="mb-4 text-sm text-clay-700 bg-clay-100/60 border border-clay-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {profiles.length === 0 ? (
            <div className="text-center py-12 px-6 rounded-2xl bg-cream-50 border border-cream-500">
              <div className="w-12 h-12 rounded-full bg-clay-500/10 border border-clay-500/30 flex items-center justify-center mx-auto mb-4">
                <Users size={20} className="text-clay-600" />
              </div>
              <p className="font-serif text-lg text-ink-900 mb-1">
                Nog geen klantprofielen
              </p>
              <p className="text-sm text-ink-500 max-w-sm mx-auto leading-relaxed">
                Maak je eerste klantprofiel aan zodat het bureau weet voor wie het werkt.
              </p>
              <Link
                href="/profile/new"
                className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-clay-500 hover:bg-clay-600 text-white text-sm font-medium transition-colors"
              >
                <Plus size={14} />
                Eerste klant aanmaken
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {profiles.map((p) => (
                <li
                  key={p.id}
                  className="group flex items-center gap-3 px-4 py-3 rounded-2xl bg-cream-50 border border-cream-500 hover:border-cream-600 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-ink-900 truncate">{p.name}</p>
                    {p.industry && (
                      <p className="text-xs text-ink-500 truncate">{p.industry}</p>
                    )}
                  </div>
                  <Link
                    href={`/profile/${p.id}`}
                    aria-label={`Bewerk ${p.name}`}
                    className="w-8 h-8 rounded-full hover:bg-cream-300 flex items-center justify-center transition-colors"
                  >
                    <Pencil size={13} className="text-ink-500" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => p.id && handleDelete(p.id)}
                    disabled={busyId === p.id}
                    aria-label={`Verwijder ${p.name}`}
                    className="w-8 h-8 rounded-full hover:bg-clay-500/10 flex items-center justify-center transition-colors disabled:opacity-50"
                  >
                    {busyId === p.id ? (
                      <Loader2 size={13} className="text-ink-400 animate-spin" />
                    ) : (
                      <Trash2 size={13} className="text-ink-500 hover:text-clay-700" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
