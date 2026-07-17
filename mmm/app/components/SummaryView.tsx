"use client";

import { ResultsCharts } from "@/components/ResultsCharts";
import { MMM_GLOSSARY, Term } from "@/components/ui";
import { useWizardChatOptional } from "@/components/WizardChatContext";
import type {
  FitSummary,
  FrontierPoint,
  Interval,
  OptimalAllocation,
  ResponseCurve,
} from "@/lib/types";

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

function Metric({ label, value, warn }: { label: React.ReactNode; value: string; warn?: boolean }) {
  return (
    <div>
      <div className="text-xs text-neutral-500">{label}</div>
      <div className={`text-sm font-medium ${warn ? "text-rose-600" : "text-neutral-900"}`}>{value}</div>
    </div>
  );
}

// Automatic verdict on whether the fit is trustworthy. Silence means "pass" — we only
// speak up (in the single rose accent) when something needs attention.
function QualityBanner({ summary }: { summary: FitSummary }) {
  const chat = useWizardChatOptional(); // null on the client dashboard — no chat there
  const gate = summary.quality_gate;
  if (!gate || gate.verdict === "pass") return null;
  const heading =
    gate.verdict === "fail"
      ? "Deze uitkomst is nog niet betrouwbaar genoeg om te publiceren."
      : "Let op bij het interpreteren van deze uitkomst.";
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
      <p className="text-sm font-medium text-rose-800">{heading}</p>
      <ul className="mt-2 space-y-1 text-sm text-rose-700">
        {gate.reasons.map((r, i) => (
          <li key={i}>• {r}</li>
        ))}
      </ul>
      {chat && (
        <button
          onClick={() =>
            chat.sendToChat(
              `De kwaliteitspoort van de laatste fit geeft "${gate.verdict === "fail" ? "mislukt" : "let op"}" met deze reden(en): ${gate.reasons.join("; ")}. Wat is hier waarschijnlijk de oorzaak, en welke aanpassing in de modelconfiguratie zou dit verbeteren?`,
            )
          }
          className="mt-3 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
        >
          Vraag de architect om dit te verbeteren
        </button>
      )}
    </div>
  );
}

// "Same weekly budget, better split" — the optimizer's suggested reallocation, next to
// what each channel currently gets and what the next euro returns there.
// One honest sentence about whether spending more in total is worth it, read off the
// efficiency frontier: compare the optimal contribution at the current total vs +50%.
function frontierInsight(frontier: FrontierPoint[] | undefined, current: number, kpi: string) {
  if (!frontier || frontier.length < 2) return null;
  const sorted = [...frontier].sort((a, b) => a.total_weekly_budget - b.total_weekly_budget);
  const nearest = (target: number) =>
    sorted.reduce((best, p) =>
      Math.abs(p.total_weekly_budget - target) < Math.abs(best.total_weekly_budget - target) ? p : best,
    );
  const base = nearest(current);
  const more = nearest(current * 1.5);
  if (more.total_weekly_budget <= base.total_weekly_budget * 1.01) return null;
  const extraSpend = more.total_weekly_budget - base.total_weekly_budget;
  const extraKpi = more.predicted_contribution.p50 - base.predicted_contribution.p50;
  return (
    <p className="text-sm text-neutral-600">
      Ongeveer <span className="font-medium">{fmt(extraSpend)}</span> meer budget per week levert naar
      schatting <span className="font-medium">{fmt(extraKpi)}</span> extra {kpi} per week op — daarna
      vlakt het rendement af (zie de onzekerheidsmarges).
    </p>
  );
}

function BudgetAdvice({
  allocation,
  curves,
  frontier,
  kpi,
}: {
  allocation: OptimalAllocation;
  curves: ResponseCurve[];
  frontier?: FrontierPoint[];
  kpi: string;
}) {
  const byName = new Map(curves.map((c) => [c.name, c]));
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium text-neutral-900">Budgetadvies</h3>
        <p className="text-sm text-neutral-600">
          Bij hetzelfde totale weekbudget van{" "}
          <span className="font-medium">{fmt(allocation.total_weekly_budget)}</span> haalt deze
          verdeling naar schatting{" "}
          <span className="font-medium">{fmt(allocation.predicted_contribution.p50)}</span> {kpi} per
          week uit marketing ({fmt(allocation.predicted_contribution.p3)} –{" "}
          {fmt(allocation.predicted_contribution.p97)}).
        </p>
      </div>
      <details>
        <summary className="cursor-pointer select-none text-xs font-medium text-neutral-500">
          Cijfers per kanaal (tabel)
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                <th className="py-2 pr-4 font-medium">Kanaal</th>
                <th className="py-2 pr-4 font-medium">Nu per week</th>
                <th className="py-2 pr-4 font-medium">Advies per week</th>
                <th className="py-2 pr-4 font-medium">Rendement volgende euro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {Object.entries(allocation.per_channel).map(([name, advised]) => {
                const curve = byName.get(name);
                const current = curve?.current_weekly_spend ?? 0;
                const up = advised > current * 1.01;
                const down = advised < current * 0.99;
                return (
                  <tr key={name}>
                    <td className="py-3 pr-4 font-medium text-neutral-900">{name}</td>
                    <td className="py-3 pr-4 text-neutral-600">{fmt(current)}</td>
                    <td className="py-3 pr-4">
                      <span className="font-medium text-neutral-900">{fmt(advised)}</span>{" "}
                      {up && <span className="text-xs text-rose-600">↑</span>}
                      {down && <span className="text-xs text-neutral-400">↓</span>}
                    </td>
                    <td className="py-3 pr-4">
                      {curve ? (
                        <IntervalCell value={curve.marginal_roas_at_current} render={(n) => fmt(n, 2)} />
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
      {frontierInsight(frontier, allocation.total_weekly_budget, kpi)}
    </div>
  );
}

export function SummaryView({ summary }: { summary: FitSummary }) {
  const d = summary.diagnostics;
  const coverageOff = Math.abs(d.interval_coverage_94 - 0.94) > 0.1;

  return (
    <div className="space-y-6">
      <QualityBanner summary={summary} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metric label={<Term definition={MMM_GLOSSARY.r2}>R²</Term>} value={fmt(d.r2, 2)} />
        <Metric label={<Term definition={MMM_GLOSSARY.mape}>MAPE</Term>} value={pct(d.mape)} />
        <Metric
          label={<Term definition={MMM_GLOSSARY.coverage}>Dekking (94%)</Term>}
          value={pct(d.interval_coverage_94)}
          warn={coverageOff}
        />
        <Metric
          label={<Term definition={MMM_GLOSSARY.rhat}>Max R-hat</Term>}
          value={fmt(d.max_r_hat, 2)}
          warn={d.max_r_hat > 1.05}
        />
      </div>

      <p className="text-sm text-neutral-600">
        De periode <span className="font-medium">{summary.window[0]}</span> t/m{" "}
        <span className="font-medium">{summary.window[1]}</span> ({summary.n_weeks} weken). De
        baseline — verkoop zonder marketing — is ongeveer{" "}
        <span className="font-medium">{fmt(summary.baseline_contribution.p50)}</span>{" "}
        {summary.kpi}.
      </p>

      <ResultsCharts summary={summary} />

      <details className="border-t border-neutral-100 pt-4">
        <summary className="cursor-pointer select-none text-sm font-medium text-neutral-900">
          Cijfers per kanaal (tabel)
        </summary>
        <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
              <th className="py-2 pr-4 font-medium">Kanaal</th>
              <th className="py-2 pr-4 font-medium">Aandeel</th>
              <th className="py-2 pr-4 font-medium">
                <Term definition={MMM_GLOSSARY.roas}>ROAS</Term>
              </th>
              <th className="py-2 pr-4 font-medium">
                <Term definition={MMM_GLOSSARY.adstock}>Adstock half-life</Term>
              </th>
              <th className="py-2 pr-4 font-medium">
                <Term definition={MMM_GLOSSARY.saturation}>Verzadigingspunt</Term>
              </th>
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
      </details>

      {summary.optimal_allocation && summary.response_curves && summary.response_curves.length > 0 && (
        <BudgetAdvice
          allocation={summary.optimal_allocation}
          curves={summary.response_curves}
          frontier={summary.efficiency_frontier}
          kpi={summary.kpi}
        />
      )}

      {!d.decomposition_ok && (
        <p className="text-sm text-rose-600">
          Let op: de decompositie telt niet netjes op tot het totaal — behandel deze uitkomst met
          voorzichtigheid.
        </p>
      )}
    </div>
  );
}
