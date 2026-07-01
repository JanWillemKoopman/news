'use client'

import { ActivityFeed } from '@/components/bruiloft/ActivityFeed'
import { PageHeader } from '@/components/bruiloft/PageHeader'

export default function ActiviteitPage() {
  return (
    <div className="mx-auto max-w-3xl pb-24 min-h-screen">
      <PageHeader
        titel="Recente activiteit"
      />
      <ActivityFeed toonKop={false} />
    </div>
  )
}
