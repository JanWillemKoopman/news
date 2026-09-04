import type { Campagne } from "@/lib/sheet";
import { formatCurrency, formatDate, formatNumber, formatPercent, ratio } from "@/lib/format";
import ProgressBar from "@/components/ProgressBar";

function StatusBadge({ status }: { status: string }) {
  const isOpen = status.trim().toLowerCase() === "open";
  return (
    <span
      className={`shrink-0 rounded-pill px-2.5 py-1 text-xs font-semibold ${
        isOpen ? "bg-open-light text-open" : "bg-closed-light text-closed"
      }`}
    >
      {status || "—"}
    </span>
  );
}

type Metric = {
  label: string;
  current: number | null;
  target: number | null;
  format: (value: number | null) => string;
};

export default function CampaignCard({ campagne }: { campagne: Campagne }) {
  const metrics: Metric[] = [
    { label: "Budget", current: campagne.uitgaven, target: campagne.budget, format: formatCurrency },
    { label: "Orders", current: campagne.orderTotaal, target: campagne.doelOrders, format: formatNumber },
    { label: "Leads", current: campagne.leads, target: campagne.doelLeads, format: formatNumber },
  ];

  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-card p-5 shadow-card transition-shadow hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-ink">{campagne.naam}</h3>
          {campagne.merk && (
            <span className="mt-1.5 inline-block rounded-pill bg-brand-light px-2.5 py-0.5 text-xs font-medium text-brand">
              {campagne.merk}
            </span>
          )}
        </div>
        <StatusBadge status={campagne.status} />
      </div>

      <p className="text-sm text-ink-muted">
        {formatDate(campagne.startdatum)} – {formatDate(campagne.einddatum)}
      </p>

      <div className="flex flex-col gap-3">
        {metrics.map((metric) => {
          const percent = ratio(metric.current, metric.target);
          const percentLabel = formatPercent(percent);
          return (
            <div key={metric.label}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium text-ink">{metric.label}</span>
                <span className="truncate text-ink-muted">
                  {metric.format(metric.current)} / {metric.format(metric.target)}
                  {percentLabel ? ` (${percentLabel})` : ""}
                </span>
              </div>
              <ProgressBar value={percent} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
