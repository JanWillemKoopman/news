'use client'

import { ListChecks } from 'lucide-react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { EmptyState } from '@/components/bruiloft/ui'

export default function TakenPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader titel="Taken en tijdlijn" />
      <EmptyState icon={ListChecks} titel="Takenmodule volgt" />
    </div>
  )
}
