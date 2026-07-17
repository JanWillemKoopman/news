"use client";

import { useState } from "react";
import type { ModelRun } from "@/lib/types";

function fmt(n: number, digits = 0): string {
  return n.toLocaleString("nl-NL", { maximumFractionDigits: digits });
}
function pct(n: number): string {
  return (n * 100).toLocaleString("nl-NL", { maximumFractionDigits: 1 }) + "%";
}
function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

function verdictLabel(run: ModelRun): { text: string; rose: boolean } {
  const verdict = run.summary?.quality_gate?.verdict;
  if (verdict === "fail") return { text: "niet betrouwbaar", rose: true };
  if (verdict === "warn") return { text: "let op", rose: true };
  return { text: "geslaagd", rose: false };
}

// Every fit run stays available (not just the latest) so a builder can go back to an
// earlier, better run, or compare two side by side before deciding which becomes the
// published "champion" — reusing the existing publish/is_published mechanic for that,
// rather than inventing a second, parallel concept.
export function RunHistory({
  runs,
  selectedId,
  onSelect,
}: {
  runs: ModelRun[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareMode, setCompareMode] = useState(false);

  if (runs.length <= 1) return null;

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  const compareRuns = runs.filter((r) => compareIds.includes(r.id));

  return (
    <div className="space-y-3 border-b border-border pb-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-fg-faint">
          Fitgeschiedenis ({runs.length})
        </p>
        <button
          onClick={() => setCompareMode((v) => !v)}
          className="text-xs font-medium text-fg-muted hover:text-danger"
        >
          {compareMode ? "Klaar met vergelijken" : "Twee runs vergelijken"}
        </button>
      </div>

      <ul className="space-y-1.5">
        {runs.map((run) => {
          const v = verdictLabel(run);
          const isSelected = run.id === selectedId;
          const isCompared = compareIds.includes(run.id);
          return (
            <li key={run.id}>
              <button
                onClick={() => (compareMode ? toggleCompare(run.id) : onSelect(run.id))}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${
                  compareMode
                    ? isCompared
                      ? "border-accent/40 bg-accent-dim"
                      : "border-border hover:bg-surface-2"
                    : isSelected
                      ? "border-accent/40 bg-accent-dim"
                      : "border-border hover:bg-surface-2"
                }`}
              >
                <span className="flex-1 text-fg">{dateLabel(run.created_at)}</span>
                <span className="text-xs text-fg-muted">
                  R² {fmt(run.summary.diagnostics.r2, 2)} · MAPE {pct(run.summary.diagnostics.mape)}
                </span>
                <span className={`text-xs font-medium ${v.rose ? "text-danger" : "text-fg-faint"}`}>
                  {v.text}
                </span>
                {run.is_published && (
                  <span className="rounded-full border border-accent/30 bg-accent-dim px-2 py-0.5 text-[11px] font-medium text-accent">
                    gepubliceerd
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {compareMode && compareRuns.length === 2 && <CompareTable runs={compareRuns as [ModelRun, ModelRun]} />}
      {compareMode && compareRuns.length < 2 && (
        <p className="text-xs text-fg-faint">Kies twee runs hierboven om te vergelijken.</p>
      )}
    </div>
  );
}

function CompareTable({ runs }: { runs: [ModelRun, ModelRun] }) {
  const channelNames = Array.from(
    new Set(runs.flatMap((r) => r.summary.channels.map((c) => c.name))),
  );
  const byName = runs.map((r) => new Map(r.summary.channels.map((c) => [c.name, c])));

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-faint">
            <th className="p-2 font-medium"> </th>
            {runs.map((r) => (
              <th key={r.id} className="p-2 font-medium">
                {dateLabel(r.created_at)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          <tr>
            <td className="p-2 text-fg-muted">R²</td>
            {runs.map((r) => (
              <td key={r.id} className="p-2 font-medium text-fg">
                {fmt(r.summary.diagnostics.r2, 2)}
              </td>
            ))}
          </tr>
          <tr>
            <td className="p-2 text-fg-muted">MAPE</td>
            {runs.map((r) => (
              <td key={r.id} className="p-2 font-medium text-fg">
                {pct(r.summary.diagnostics.mape)}
              </td>
            ))}
          </tr>
          <tr>
            <td className="p-2 text-fg-muted">Max R-hat</td>
            {runs.map((r) => (
              <td key={r.id} className="p-2 font-medium text-fg">
                {fmt(r.summary.diagnostics.max_r_hat, 2)}
              </td>
            ))}
          </tr>
          {channelNames.map((name) => (
            <tr key={name}>
              <td className="p-2 text-fg-muted">{name} — aandeel</td>
              {byName.map((m, i) => {
                const ch = m.get(name);
                return (
                  <td key={i} className="p-2 font-medium text-fg">
                    {ch ? pct(ch.contribution_share.p50) : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
