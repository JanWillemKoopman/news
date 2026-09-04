export default function ProgressBar({ value }: { value: number | null }) {
  const pct = value === null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-pill bg-page">
      <div className="h-full rounded-pill bg-brand transition-[width]" style={{ width: `${pct}%` }} />
    </div>
  );
}
