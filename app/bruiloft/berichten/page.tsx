'use client'

import { BerichtenOverzicht } from '@/components/bruiloft/berichten/BerichtenOverzicht'
import { PageHeader } from '@/components/bruiloft/PageHeader'

export default function BerichtenPage() {
  return (
    <div className="mx-auto max-w-7xl min-h-screen pb-24">
      <PageHeader titel="Berichten" />
      <BerichtenOverzicht />
    </div>
  )
}
