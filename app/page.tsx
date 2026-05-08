'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useChatStore } from '@/store/chatStore'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import SelectionScreen from '@/components/SelectionScreen'
import ChatScreen from '@/components/ChatScreen'

export default function Home() {
  const router = useRouter()
  const screen = useChatStore((s) => s.screen)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function check() {
      const supabase = createSupabaseBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (cancelled) return
      if (user) {
        setReady(true)
        return
      }
      const guest =
        typeof window !== 'undefined' &&
        localStorage.getItem('marketing-bureau-guest') === 'true'
      if (guest) {
        setReady(true)
      } else {
        router.replace('/login')
      }
    }
    check()
    return () => {
      cancelled = true
    }
  }, [router])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-200">
        <Loader2 size={20} className="animate-spin text-ink-400" />
      </div>
    )
  }

  return screen === 'selection' ? <SelectionScreen /> : <ChatScreen />
}
