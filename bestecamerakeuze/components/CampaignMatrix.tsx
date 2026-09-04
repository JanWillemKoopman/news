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
    <div className="overflow-hidden rounded-panel border border-line bg-card shadow-card">
      <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 min-w-[160px] rounded-tl-card border-b border-r border-line bg-accent px-4 py-3 text-left font-sans-w7 font-semibold text-ink">
              Campagne
            </th>
            {campagnes.map((c, i) => (
              <th
                key={c.naam}
                className={`min-w-[190px] border-b border-line bg-accent px-4 py-3 text-left font-sans-w7 font-semibold text-ink ${
                  i === campagnes.length - 1 ? "rounded-tr-card" : ""
                }`}
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
          {ROWS.map((row, i, arr) => {
            const last = i === arr.length - 1;
            return (
              <tr key={row.label} className={i % 2 === 1 ? "bg-surface" : "bg-card"}>
                <th
                  className={`sticky left-0 z-10 border-r border-line px-4 py-3 text-left font-medium text-ink-muted ${
                    i % 2 === 1 ? "bg-surface" : "bg-card"
                  } ${last ? "rounded-bl-card" : "border-b"}`}
                >
                  {row.label}
                </th>
                {campagnes.map((c, j) => (
                  <td
                    key={c.naam}
                    className={`px-4 py-3 text-ink ${last ? (j === campagnes.length - 1 ? "rounded-br-card" : "") : "border-b border-line"}`}
                  >
                    {row.render(c)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
