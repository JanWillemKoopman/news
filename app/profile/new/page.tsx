'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Briefcase, Loader2 } from 'lucide-react'
import ClientProfileForm from '@/components/ClientProfileForm'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export default function NewClientProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function check() {
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
      setLoading(false)
      window.scrollTo(0, 0)
    }
    check()
    return () => {
      cancelled = true
    }
  }, [router])

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
              Nieuw klantprofiel
            </span>
          </div>
          <h1 className="font-serif font-medium text-3xl sm:text-4xl text-ink-900 tracking-tight leading-[1.1]">
            Vertel ons over je klant
          </h1>
          <p className="text-ink-500 mt-3 text-base leading-relaxed">
            Eenmalig invullen — daarna kent het hele bureau de context. Iris en de
            specialisten slaan algemene profielvragen over en richten zich direct
            op de vragen voor déze klant.
          </p>
        </div>
      </header>

      <main className="px-4 pb-16">
        <div className="max-w-2xl mx-auto">
          <ClientProfileForm
            onSaved={() => router.push('/profile')}
            onCancel={() => router.push('/profile')}
          />
        </div>
      </main>
    </div>
  )
}
