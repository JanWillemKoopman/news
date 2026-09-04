function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-card bg-line/60 ${className ?? ""}`} />;
}

export default function Loading() {
  return (
    <main className="mx-auto max-w-[1600px] px-4 py-8 sm:py-12">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-3 h-4 w-96" />

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 border border-line shadow-card" />
        ))}
      </div>

      <Skeleton className="mt-6 h-10 w-full sm:w-2/3" />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-56 border border-line shadow-card" />
        ))}
      </div>
    </main>
  );
}
