import { Skeleton } from '@/components/bruiloft/ui/Skeleton'

export default function BudgetLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      {/* PageHeader */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      {/* Budget Briefing */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <Skeleton className="mx-auto h-24 w-24 shrink-0 rounded-full sm:mx-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-4 w-2/3 max-w-sm" />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Coach-inzichten placeholder */}
      <div className="rounded-xl border border-border bg-card p-5">
        <Skeleton className="mb-4 h-4 w-36" />
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>

      {/* Categorie-cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="mt-3 h-1.5 w-full rounded-full" />
            <Skeleton className="mt-2 h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
