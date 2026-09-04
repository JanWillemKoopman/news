import type { Campagne } from "@/lib/sheet";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";

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
  { label: "Budget", render: (c) => formatCurrency(c.budget) },
  { label: "Uitgaven", render: (c) => formatCurrency(c.uitgaven) },
  { label: "Doel orders", render: (c) => formatNumber(c.doelOrders) },
  { label: "Order totaal", render: (c) => formatNumber(c.orderTotaal) },
];

export default function CampaignMatrix({ campagnes }: { campagnes: Campagne[] }) {
  if (campagnes.length === 0) {
    return <p className="text-sm text-ink-muted">Geen campagnes gevonden in de spreadsheet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-panel border border-line bg-white">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 min-w-[160px] border-b border-r border-line bg-page px-4 py-3 text-left font-semibold text-ink">
              Campagne
            </th>
            {campagnes.map((c) => (
              <th
                key={c.naam}
                className="min-w-[180px] border-b border-line bg-page px-4 py-3 text-left font-semibold text-ink"
              >
                {c.naam}
                <span className="mt-1 block w-fit rounded-full bg-brand-light px-2 py-0.5 text-xs font-medium text-brand">
                  {c.status || "—"}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, i) => (
            <tr key={row.label} className={i % 2 === 1 ? "bg-page/40" : undefined}>
              <th className="sticky left-0 z-10 border-r border-b border-line bg-white px-4 py-3 text-left font-medium text-ink-muted">
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
