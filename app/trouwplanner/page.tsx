'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWeddingStore } from '@/store/weddingStore'
import Landing from '@/components/trouwplanner/Landing'

export default function TrouwplannerPage() {
  const router = useRouter()
  const hasCompletedOnboarding = useWeddingStore((s) => s.hasCompletedOnboarding)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated && hasCompletedOnboarding) {
      router.push('/trouwplanner/plan')
    }
  }, [hydrated, hasCompletedOnboarding, router])

  if (!hydrated) return null

  return <Landing />
}
