'use client'

import { ActivityFeed } from '@/components/bruiloft/ActivityFeed'
import { PageHeader } from '@/components/bruiloft/PageHeader'

export default function ActiviteitPage() {
  return (
    <div className="mx-auto max-w-3xl pb-24">
      <PageHeader
        titel="Recente activiteit"
        beschrijving="Wijzigingen van jou en je medeplanners."
      />
      <ActivityFeed />
    </div>
  )
}
