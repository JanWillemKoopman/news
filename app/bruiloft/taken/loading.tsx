import { Skeleton } from '@/components/bruiloft/ui/Skeleton'

export default function TakenLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      {/* PageHeader */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Stat-kaartjes */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="col-span-1 rounded-xl border border-border bg-card p-4">
            <Skeleton className="h-3 w-12 mb-2" />
            <Skeleton className="h-7 w-8" />
          </div>
        ))}
      </div>

      {/* Filter + zoek */}
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-48 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>

      {/* Taakkaarten */}
      <div className="space-y-2.5">
        {[80, 64, 96, 72, 80].map((h, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="mt-0.5 h-6 w-6 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4" style={{ width: `${h}%` }} />
                <div className="flex gap-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>
              <Skeleton className="h-7 w-7 rounded-md shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
