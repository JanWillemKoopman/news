'use client'

import { Users } from 'lucide-react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { EmptyState } from '@/components/bruiloft/ui'

export default function GastenPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader titel="Gasten" />
      <EmptyState icon={Users} titel="Gastenmodule volgt" />
    </div>
  )
}
