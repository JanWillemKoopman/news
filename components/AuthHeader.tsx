'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Settings, Users } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export default function AuthHeader() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function init() {
      const supabase = createSupabaseBrowserClient()
      await supabase.auth.getUser()
      if (!cancelled) setReady(true)
    }
    init()
    return () => {
      cancelled = true
    }
  }, [])

  if (!ready) return <div className="h-7" />

  return (
    <div className="flex items-center gap-3 text-xs">
      <Link
        href="/profile"
        className="inline-flex items-center gap-1.5 text-ink-500 hover:text-ink-700 transition-colors"
      >
        <Users size={13} />
        <span>Klanten</span>
      </Link>
      <span className="text-ink-400">·</span>
      <Link
        href="/account"
        className="inline-flex items-center gap-1.5 text-ink-500 hover:text-ink-700 transition-colors"
      >
        <Settings size={13} />
        <span>Account</span>
      </Link>
    </div>
  )
}
