import type { DatasetPreview } from "@/lib/types";

function fmt(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString("nl-NL", { maximumFractionDigits: 1 });
}

const ROLE_LABEL: Record<string, string> = { kpi: "KPI", spend: "Spend", control: "Control" };

// Shows the merged master table's shape: per-column role + summary stats, and a small
// sample of the first/last weeks so the builder can eyeball whether it looks right before
// approving — without downloading the file.
export function DatasetPreviewTable({ preview }: { preview: DatasetPreview }) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-faint">
              <th className="py-2 pr-4 font-medium">Kolom</th>
              <th className="py-2 pr-4 font-medium">Rol</th>
              <th className="py-2 pr-4 font-medium">Gemiddeld</th>
              <th className="py-2 pr-4 font-medium">Bereik</th>
              <th className="py-2 pr-4 font-medium">Ontbrekend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {preview.columns.map((col) => {
              const s = preview.summary[col.name];
              return (
                <tr key={col.name}>
                  <td className="py-2 pr-4 font-medium text-fg">{col.name}</td>
                  <td className="py-2 pr-4 text-fg-muted">{col.role ? ROLE_LABEL[col.role] : "—"}</td>
                  <td className="py-2 pr-4 text-fg-muted">{s ? fmt(s.mean) : "—"}</td>
                  <td className="py-2 pr-4 text-fg-muted">{s ? `${fmt(s.min)} – ${fmt(s.max)}` : "—"}</td>
                  <td className={"py-2 pr-4 " + (s && s.n_missing > 0 ? "text-danger" : "text-fg-muted")}>
                    {s ? s.n_missing : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {preview.head.length > 0 && (
        <div className="overflow-x-auto">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-fg-faint">Eerste weken</p>
          <table className="w-full min-w-[520px] text-xs">
            <thead>
              <tr className="border-b border-border text-left text-fg-faint">
                {Object.keys(preview.head[0]).map((k) => (
                  <th key={k} className="py-1.5 pr-3 font-medium">{k}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {preview.head.map((row, i) => (
                <tr key={i}>
                  {Object.values(row).map((v, j) => (
                    <td key={j} className="py-1.5 pr-3 text-fg-muted">{v ?? "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
