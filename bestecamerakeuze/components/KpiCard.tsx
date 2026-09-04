export default function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-line bg-card p-5 shadow-card">
      <p className="text-sm font-medium text-ink-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}
