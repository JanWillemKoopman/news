'use client'

import { Card, CardContent } from '@/components/bruiloft/ui'
import { BudgetDonutChart } from './BudgetDonutChart'
import { BudgetVarianceBarChart } from './BudgetVarianceBarChart'
import type { BudgetTotalen } from '@/lib/bruiloft/derived'

// Grafieken als tab binnen "Details per categorie" — geen eigen topsectie.
// Dit component wordt door de aanroeper via next/dynamic(..., { ssr: false })
// geladen, want recharts is vandaag alleen in /admin actief en introduceert
// hier een echte nieuwe bundle-chunk voor bruiloft-gebruikers.

interface BudgetChartDashboardProps {
  perCategorie: BudgetTotalen['perCategorie']
}

export default function BudgetChartDashboard({ perCategorie }: BudgetChartDashboardProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-2 text-sm font-medium text-foreground">Budgetverdeling</h3>
          <BudgetDonutChart perCategorie={perCategorie} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-2 text-sm font-medium text-foreground">Begroot versus werkelijk</h3>
          <BudgetVarianceBarChart perCategorie={perCategorie} />
        </CardContent>
      </Card>
    </div>
  )
}
