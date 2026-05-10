'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Briefcase, Loader2 } from 'lucide-react'
import ClientProfileForm from '@/components/ClientProfileForm'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { ClientProfile } from '@/types'

export default function EditClientProfilePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [initial, setInitial] = useState<ClientProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function init() {
      const supabase = createSupabaseBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
        router.replace('/login')
        return
      }
      setAuthed(true)
      try {
        const res = await fetch(`/api/profiles/${id}`)
        if (res.status === 404) {
          router.replace('/profile')
          return
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as { profile: ClientProfile }
        if (!cancelled) setInitial(data.profile)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Kon klantprofiel niet laden')
        }
      }
      if (!cancelled) {
        setLoading(false)
        window.scrollTo(0, 0)
      }
    }
    if (id) init()
    return () => {
      cancelled = true
    }
  }, [id, router])

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
            href="/profile"
            className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-700 transition-colors mb-6"
          >
            <ArrowLeft size={14} />
            Terug naar klantprofielen
          </Link>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg bg-clay-500/15 border border-clay-500/30 flex items-center justify-center">
              <Briefcase size={14} className="text-clay-600" />
            </div>
            <span className="text-[11px] font-medium text-ink-500 uppercase tracking-[0.18em]">
              Klantprofiel bewerken
            </span>
          </div>
          <h1 className="font-serif font-medium text-3xl sm:text-4xl text-ink-900 tracking-tight leading-[1.1]">
            {initial?.name ? `Werk ${initial.name} bij` : 'Klantprofiel bewerken'}
          </h1>
        </div>
      </header>

      <main className="px-4 pb-16">
        <div className="max-w-2xl mx-auto">
          {error && (
            <p className="mb-4 text-sm text-clay-700 bg-clay-100/60 border border-clay-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {initial && (
            <ClientProfileForm
              id={id}
              initial={initial}
              onSaved={() => router.push('/profile')}
              onCancel={() => router.push('/profile')}
            />
          )}
        </div>
      </main>
    </div>
  )
}
