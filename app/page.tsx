'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useChatStore } from '@/store/chatStore'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import SelectionScreen from '@/components/SelectionScreen'
import ChatScreen from '@/components/ChatScreen'
import LandingScreen from '@/components/LandingScreen'

type Gate = 'loading' | 'landing' | 'app'

export default function Home() {
  const screen = useChatStore((s) => s.screen)
  const [gate, setGate] = useState<Gate>('loading')

  useEffect(() => {
    let cancelled = false
    async function check() {
      const supabase = createSupabaseBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (cancelled) return
      setGate(user ? 'app' : 'landing')
    }
    check()
    return () => {
      cancelled = true
    }
  }, [])

  if (gate === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-200">
        <Loader2 size={20} className="animate-spin text-ink-400" />
      </div>
    )
  }

  if (gate === 'landing') {
    return <LandingScreen />
  }

  return screen === 'selection' ? <SelectionScreen /> : <ChatScreen />
}
