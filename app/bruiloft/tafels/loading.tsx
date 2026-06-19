import { Skeleton } from '@/components/bruiloft/ui/Skeleton'

export default function TafelsLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      {/* PageHeader */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
      </div>

      {/* Lijst-weergave skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: i % 2 === 0 ? 4 : 6 }).map((_, j) => (
                <Skeleton key={j} className="h-7 w-20 rounded-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
