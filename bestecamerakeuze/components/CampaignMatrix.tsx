import type { Campagne } from "@/lib/sheet";
import { formatCurrency, formatDate, formatNumber, formatPercent, ratio, withPercent } from "@/lib/format";

type Row = {
  label: string;
  render: (campagne: Campagne) => string;
};

/**
 * Volgorde en selectie van rijen zoals afgesproken: dit is een eerste opzet, verdere
 * metrics komen hier later bij zonder dat de rest van de tabel hoeft te veranderen.
 */
const ROWS: Row[] = [
  { label: "Startdatum", render: (c) => formatDate(c.startdatum) },
  { label: "Einddatum", render: (c) => formatDate(c.einddatum) },
  {
    label: "Budget",
    render: (c) => withPercent(formatCurrency(c.budget), formatPercent(ratio(c.uitgaven, c.budget))),
  },
  { label: "Doel orders", render: (c) => formatNumber(c.doelOrders) },
  {
    label: "Order totaal",
    render: (c) =>
      withPercent(formatNumber(c.orderTotaal), formatPercent(ratio(c.orderTotaal, c.doelOrders))),
  },
  { label: "Doel leads", render: (c) => formatNumber(c.doelLeads) },
  {
    label: "Leads",
    render: (c) => withPercent(formatNumber(c.leads), formatPercent(ratio(c.leads, c.doelLeads))),
  },
];

function StatusBadge({ status }: { status: string }) {
  const isOpen = status.trim().toLowerCase() === "open";
  return (
    <span
      className={`inline-block w-fit rounded-pill px-2.5 py-0.5 text-xs font-semibold ${
        isOpen ? "bg-open-light text-open" : "bg-closed-light text-closed"
      }`}
    >
      {status || "—"}
    </span>
  );
}

export default function CampaignMatrix({ campagnes }: { campagnes: Campagne[] }) {
  if (campagnes.length === 0) {
    return <p className="text-sm text-ink-muted">Geen campagnes gevonden voor deze filters.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-panel border border-line bg-card shadow-card">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 min-w-[160px] border-b border-r border-line bg-page px-4 py-3 text-left font-semibold text-ink">
              Campagne
            </th>
            {campagnes.map((c) => (
              <th
                key={c.naam}
                className="min-w-[190px] border-b border-line bg-page px-4 py-3 text-left font-semibold text-ink"
              >
                <div className="flex flex-col gap-1.5">
                  <span>{c.naam}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {c.merk && (
                      <span className="inline-block w-fit rounded-pill bg-brand-light px-2.5 py-0.5 text-xs font-medium text-brand">
                        {c.merk}
                      </span>
                    )}
                    <StatusBadge status={c.status} />
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, i) => (
            <tr key={row.label} className={i % 2 === 1 ? "bg-page/60" : undefined}>
              <th className="sticky left-0 z-10 border-r border-b border-line bg-card px-4 py-3 text-left font-medium text-ink-muted">
                {row.label}
              </th>
              {campagnes.map((c) => (
                <td key={c.naam} className="border-b border-line px-4 py-3 text-ink">
                  {row.render(c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
