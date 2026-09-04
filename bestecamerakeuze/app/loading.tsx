function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-card bg-line/60 ${className ?? ""}`} />;
}

export default function Loading() {
  return (
    <main className="mx-auto max-w-[1600px] px-4 py-8 sm:py-12">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-3 h-4 w-96" />

      <div className="mt-6 flex justify-end gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-pill" />
        ))}
      </div>

      <Skeleton className="mt-4 h-80 w-full border border-line shadow-card" />
    </main>
  );
}
