import type { FitSummary, Interval } from "@/lib/types";

function fmt(n: number, digits = 0): string {
  return n.toLocaleString("nl-NL", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function pct(n: number): string {
  return (n * 100).toLocaleString("nl-NL", { maximumFractionDigits: 1 }) + "%";
}

// A value with its credible interval — uncertainty is never hidden.
function IntervalCell({ value, render }: { value: Interval; render: (n: number) => string }) {
  return (
    <div>
      <div className="font-medium text-neutral-900">{render(value.p50)}</div>
      <div className="text-xs text-neutral-400">
        {render(value.p3)} – {render(value.p97)}
      </div>
    </div>
  );
}

function Metric({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <div className="text-xs text-neutral-500">{label}</div>
      <div className={`text-sm font-medium ${warn ? "text-rose-600" : "text-neutral-900"}`}>{value}</div>
    </div>
  );
}

export function SummaryView({ summary }: { summary: FitSummary }) {
  const d = summary.diagnostics;
  const coverageOff = Math.abs(d.interval_coverage_94 - 0.94) > 0.1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metric label="R²" value={fmt(d.r2, 2)} />
        <Metric label="MAPE" value={pct(d.mape)} />
        <Metric label="Dekking (94%)" value={pct(d.interval_coverage_94)} warn={coverageOff} />
        <Metric label="Max R-hat" value={fmt(d.max_r_hat, 2)} warn={d.max_r_hat > 1.05} />
      </div>

      <p className="text-sm text-neutral-600">
        De periode <span className="font-medium">{summary.window[0]}</span> t/m{" "}
        <span className="font-medium">{summary.window[1]}</span> ({summary.n_weeks} weken). De
        baseline — verkoop zonder marketing — is ongeveer{" "}
        <span className="font-medium">{fmt(summary.baseline_contribution.p50)}</span>{" "}
        {summary.kpi}.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
              <th className="py-2 pr-4 font-medium">Kanaal</th>
              <th className="py-2 pr-4 font-medium">Aandeel</th>
              <th className="py-2 pr-4 font-medium">ROAS</th>
              <th className="py-2 pr-4 font-medium">Adstock half-life</th>
              <th className="py-2 pr-4 font-medium">Verzadigingspunt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {summary.channels.map((ch) => (
              <tr key={ch.name}>
                <td className="py-3 pr-4 font-medium text-neutral-900">{ch.name}</td>
                <td className="py-3 pr-4">
                  <IntervalCell value={ch.contribution_share} render={pct} />
                </td>
                <td className="py-3 pr-4">
                  <IntervalCell value={ch.roas} render={(n) => fmt(n, 2)} />
                </td>
                <td className="py-3 pr-4">
                  <IntervalCell value={ch.adstock_half_life_weeks} render={(n) => fmt(n, 1) + " wk"} />
                </td>
                <td className="py-3 pr-4">
                  <IntervalCell value={ch.saturation_point} render={(n) => fmt(n)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!d.decomposition_ok && (
        <p className="text-sm text-rose-600">
          Let op: de decompositie telt niet netjes op tot het totaal — behandel deze uitkomst met
          voorzichtigheid.
        </p>
      )}
    </div>
  );
}
