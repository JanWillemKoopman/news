'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogOut, Users } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

type AuthState = 'loading' | 'guest' | 'authed' | 'anon'

export default function AuthHeader() {
  const router = useRouter()
  const [state, setState] = useState<AuthState>('loading')
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function init() {
      const supabase = createSupabaseBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (cancelled) return

      if (user) {
        setEmail(user.email ?? null)
        setState('authed')
        return
      }

      const guest =
        typeof window !== 'undefined' && localStorage.getItem('marketing-bureau-guest') === 'true'
      setState(guest ? 'guest' : 'anon')
    }
    init()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleLogout() {
    if (typeof window !== 'undefined') localStorage.removeItem('marketing-bureau-guest')
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (state === 'loading') return <div className="h-7" />

  if (state === 'guest') {
    return (
      <div className="flex items-center gap-3 text-xs">
        <span className="hidden sm:inline px-2 py-0.5 rounded-full bg-cream-400 border border-cream-500 text-ink-500">Gast</span>
        <Link
          href="/login"
          className="text-clay-600 hover:text-clay-700 font-medium transition-colors"
        >
          Inloggen/account aanmaken
        </Link>
      </div>
    )
  }

  if (state === 'anon') {
    return (
      <div className="flex items-center gap-3 text-xs">
        <Link
          href="/login"
          className="text-ink-500 hover:text-ink-700 transition-colors"
        >
          Inloggen
        </Link>
        <Link
          href="/login?mode=signup"
          className="px-3 py-1.5 rounded-full bg-clay-500 hover:bg-clay-600 text-white font-medium transition-colors"
        >
          Account aanmaken
        </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 text-xs">
      <Link
        href="/profile"
        className="inline-flex items-center gap-1.5 text-ink-500 hover:text-ink-700 transition-colors"
        title={email ?? undefined}
      >
        <Users size={13} />
        <span>Klanten</span>
      </Link>
      <span className="text-ink-400">·</span>
      <button
        onClick={handleLogout}
        className="inline-flex items-center gap-1.5 text-ink-500 hover:text-ink-700 transition-colors"
      >
        <LogOut size={13} />
        Uitloggen
      </button>
    </div>
  )
}
