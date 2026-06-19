import { Skeleton } from '@/components/bruiloft/ui/Skeleton'

export default function BudgetLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      {/* PageHeader */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      {/* Budget-overzicht kaartjes */}
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <Skeleton className="h-3 w-24 mb-3" />
            <Skeleton className="h-8 w-28 mb-2" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>

      {/* Grafiek placeholder */}
      <div className="rounded-xl border border-border bg-card p-5">
        <Skeleton className="h-4 w-40 mb-4" />
        <Skeleton className="h-44 w-full rounded-lg" />
      </div>

      {/* Budgetposten */}
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-7 w-7 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
