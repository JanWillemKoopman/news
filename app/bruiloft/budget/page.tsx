'use client'

import { Wallet } from 'lucide-react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { EmptyState } from '@/components/bruiloft/ui'

export default function BudgetPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader titel="Budget" />
      <EmptyState icon={Wallet} titel="Budgetmodule volgt" />
    </div>
  )
}
