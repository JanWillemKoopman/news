'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWeddingStore } from '@/store/weddingStore'
import PlannerDashboard from '@/components/trouwplanner/PlannerDashboard'

export default function PlanPage() {
  const router = useRouter()
  const hasCompletedOnboarding = useWeddingStore((s) => s.hasCompletedOnboarding)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated && !hasCompletedOnboarding) {
      router.push('/trouwplanner')
    }
  }, [hydrated, hasCompletedOnboarding, router])

  if (!hydrated || !hasCompletedOnboarding) return null

  return <PlannerDashboard />
}
