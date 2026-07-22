import type { ClientSummary } from "@/lib/types";

// De door de adviseur gegenereerde samenvatting in klanttaal (model_runs.client_summary).
// Deze werd wel geproduceerd maar nog nergens aan de klant getoond — hij hoort bovenaan het
// dashboard als leesbare context bij alle cijfers die eronder volgen. Bewust open (geen
// details-inklap): dit is het verhaal, niet een voetnoot.
export function ClientSummaryCard({ summary }: { summary: ClientSummary }) {
  const paragraphs = summary.text.split("\n\n").filter((p) => p.trim().length > 0);
  if (paragraphs.length === 0) return null;
  return (
    <section className="print-avoid-break rounded-xl border border-border-strong bg-surface-2/60 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-faint">Samenvatting</h2>
      <div className="mt-2 space-y-2.5 text-sm leading-relaxed text-fg">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </section>
  );
}
