'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Briefcase, Loader2 } from 'lucide-react'
import CompanyProfileForm from '@/components/CompanyProfileForm'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { CompanyProfile } from '@/types'

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [initial, setInitial] = useState<Partial<CompanyProfile> | null>(null)
  const [savedHint, setSavedHint] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
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

      try {
        const res = await fetch('/api/profile')
        if (res.ok) {
          const data = await res.json()
          if (data.profile) setInitial(data.profile)
        }
      } catch {
        // negeer — formulier kan vanaf nul gestart
      }
      setLoading(false)
      window.scrollTo(0, 0)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [router])

  function handleSaved() {
    setSavedHint(true)
    setTimeout(() => router.push('/'), 600)
  }

  function handleSkip() {
    router.push('/')
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
              Bedrijfsprofiel
            </span>
          </div>
          <h1 className="font-serif font-medium text-3xl sm:text-4xl text-ink-900 tracking-tight leading-[1.1]">
            {initial ? 'Werk je profiel bij' : 'Vertel ons over je bedrijf'}
          </h1>
          <p className="text-ink-500 mt-3 text-base leading-relaxed">
            Eén keer invullen — daarna kent het hele bureau je context. Iris en de specialisten
            slaan algemene intake-vragen over en springen direct naar de strategie.
          </p>
        </div>
      </header>

      <main className="px-4 pb-16">
        <div className="max-w-2xl mx-auto">
          {savedHint && (
            <div className="mb-6 text-sm text-ink-700 bg-clay-100/60 border border-clay-200 rounded-lg px-3 py-2">
              Profiel opgeslagen — we sturen je terug naar het bureau...
            </div>
          )}
          <CompanyProfileForm
            initial={initial}
            onSaved={handleSaved}
            onSkip={initial ? undefined : handleSkip}
          />
        </div>
      </main>
    </div>
  )
}
