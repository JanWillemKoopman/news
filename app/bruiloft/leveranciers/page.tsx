'use client'

import { Store } from 'lucide-react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { EmptyState } from '@/components/bruiloft/ui'

export default function LeveranciersPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader titel="Leveranciers en locaties" />
      <EmptyState icon={Store} titel="Leveranciersmodule volgt" />
    </div>
  )
}
