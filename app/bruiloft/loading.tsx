import { Skeleton } from '@/components/bruiloft/ui/Skeleton'

export default function BruiloftLoading() {
  return (
    <div className="wedding min-h-screen bg-white" aria-busy="true">
      <div className="h-16 w-full bg-header-bg" />
      <div className="flex min-h-[calc(100vh-4rem)]">
        <aside className="hidden w-64 shrink-0 border-r border-header-border bg-header-active p-4 md:flex md:flex-col">
          <Skeleton className="h-4 w-24" />
          <div className="mt-4 flex flex-col gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        </aside>
        <div className="flex-1 bg-gray-100 px-4 py-6 md:px-8">
          <Skeleton className="h-8 w-48" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
          <Skeleton className="mt-6 h-64 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
