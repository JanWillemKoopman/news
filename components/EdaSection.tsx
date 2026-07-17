"use client";

import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { classifyColumns, computeColumnStats, computeCorrelationMatrix, histogram, type ColumnKind } from "@/lib/eda";
import type { SourceFile } from "@/lib/types";

const RAW_BUCKET = "mmm-raw-data";
const ACCENT = "#7FEE64";

interface ParsedTable {
  columns: string[];
  kinds: Record<string, ColumnKind>;
  rows: Record<string, unknown>[];
}

function fmt(n: number, digits = 1): string {
  return Number.isFinite(n) ? n.toLocaleString("nl-NL", { maximumFractionDigits: digits }) : "—";
}

// A single-hue (rose) magnitude scale for |correlation| — sign is carried by a +/− label,
// not a second hue, so the app's one-accent-color rule holds even for a polarity metric.
function correlationCellStyle(r: number): React.CSSProperties {
  if (Number.isNaN(r)) return { color: "#9A9AA3" };
  const strength = Math.min(Math.abs(r), 1);
  return {
    backgroundColor: `rgba(127, 238, 100, ${(strength * 0.35).toFixed(2)})`,
    color: strength > 0.55 ? "#0B0B0E" : "#9A9AA3",
  };
}

export function EdaSection({ sources }: { sources: SourceFile[] }) {
  const csvSources = useMemo(() => sources.filter((s) => /\.csv$/i.test(s.name)), [sources]);
  const [selectedPath, setSelectedPath] = useState<string | null>(csvSources[0]?.storage_path ?? null);
  const [tables, setTables] = useState<Record<string, ParsedTable | "loading" | "error">>({});
  const [xCol, setXCol] = useState("");
  const [yCols, setYCols] = useState<string[]>([]);
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [statsCol, setStatsCol] = useState("");

  useEffect(() => {
    if (!selectedPath) return;
    setXCol("");
    setYCols([]);
    setStatsCol("");
  }, [selectedPath]);

  useEffect(() => {
    if (!selectedPath || tables[selectedPath]) return;
    setTables((prev) => ({ ...prev, [selectedPath]: "loading" }));
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.storage.from(RAW_BUCKET).download(selectedPath);
      if (error || !data) {
        setTables((prev) => ({ ...prev, [selectedPath]: "error" }));
        return;
      }
      const text = await data.text();
      const parsed = Papa.parse<Record<string, unknown>>(text, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
      });
      const columns = parsed.meta.fields ?? [];
      const kinds = classifyColumns(columns, parsed.data);
      setTables((prev) => ({ ...prev, [selectedPath]: { columns, kinds, rows: parsed.data } }));
    })();
  }, [selectedPath, tables]);

  const table = selectedPath ? tables[selectedPath] : undefined;
  const ready = table && table !== "loading" && table !== "error" ? table : null;

  useEffect(() => {
    if (!ready) return;
    if (!xCol) {
      const dateCol = ready.columns.find((c) => ready.kinds[c] === "date");
      setXCol(dateCol ?? ready.columns[0] ?? "");
    }
    const numeric = ready.columns.filter((c) => ready.kinds[c] === "numeric");
    if (yCols.length === 0 && numeric[0]) setYCols([numeric[0]]);
    if (!statsCol && numeric[0]) setStatsCol(numeric[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (csvSources.length === 0) {
    return (
      <p className="text-sm text-fg-muted">
        Upload eerst een CSV-bestand bij stap 1 om de data hier te kunnen verkennen.
      </p>
    );
  }

  const numericColumns = ready ? ready.columns.filter((c) => ready.kinds[c] === "numeric") : [];
  const stats = ready && statsCol ? computeColumnStats(ready.rows, statsCol) : null;
  const hist = ready && statsCol ? histogram(ready.rows.map((r) => Number(r[statsCol])).filter(Number.isFinite)) : [];
  const corrMatrix = ready && numericColumns.length > 1 ? computeCorrelationMatrix(ready.rows, numericColumns) : null;

  function toggleYCol(col: string) {
    setYCols((prev) => (prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]));
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-fg-muted">
        Verken een geüpload bestand: stel zelf een grafiek samen en bekijk kerncijfers per kolom. Geen
        AI nodig — dit draait volledig in de browser. Vraag de assistent hiernaast gerust om iets uit te
        leggen wat je hier ziet.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {csvSources.map((s) => (
          <button
            key={s.storage_path}
            onClick={() => setSelectedPath(s.storage_path)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              selectedPath === s.storage_path
                ? "border-danger/30 bg-danger-dim text-danger"
                : "border-border text-fg-muted hover:bg-surface-2"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {table === "loading" && <p className="text-sm text-fg-faint">Bestand wordt geladen…</p>}
      {table === "error" && <p className="text-sm text-danger">Kon dit bestand niet lezen.</p>}

      {ready && (
        <>
          <div className="space-y-3 rounded-lg border border-border p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-fg-faint">Grafiek samenstellen</p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs text-fg-muted">
                X-as (tijd)
                <select
                  value={xCol}
                  onChange={(e) => setXCol(e.target.value)}
                  className="mt-1 block rounded border border-border-strong px-2 py-1.5 text-sm outline-none focus:border-accent/50"
                >
                  {ready.columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-fg-muted">
                Type
                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value as "line" | "bar")}
                  className="mt-1 block rounded border border-border-strong px-2 py-1.5 text-sm outline-none focus:border-accent/50"
                >
                  <option value="line">Lijn</option>
                  <option value="bar">Staaf</option>
                </select>
              </label>
            </div>
            <div>
              <p className="mb-1.5 text-xs text-fg-muted">Kolommen (meerdere mogelijk — elk krijgt een eigen grafiek):</p>
              <div className="flex flex-wrap gap-1.5">
                {ready.columns
                  .filter((c) => c !== xCol)
                  .map((c) => (
                    <button
                      key={c}
                      onClick={() => toggleYCol(c)}
                      className={`rounded-full border px-2.5 py-1 text-xs transition ${
                        yCols.includes(c)
                          ? "border-danger/30 bg-danger-dim text-danger"
                          : "border-border text-fg-muted hover:bg-surface-2"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {/* Small multiples: each selected column gets its own chart on a shared x-axis
              rather than sharing one y-scale (never a dual-axis chart). */}
          <div className="space-y-4">
            {yCols.map((yCol) => (
              <div key={yCol}>
                <p className="mb-1 text-xs font-medium text-fg">{yCol}</p>
                <ResponsiveContainer width="100%" height={180} className="overflow-hidden">
                  {chartType === "line" ? (
                    <LineChart data={ready.rows} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                      <XAxis dataKey={xCol} tick={{ fontSize: 11, fill: "#9A9AA3" }} minTickGap={24} />
                      <YAxis tick={{ fontSize: 11, fill: "#9A9AA3" }} width={48} />
                      <Tooltip contentStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey={yCol} stroke={ACCENT} strokeWidth={2} dot={false} />
                    </LineChart>
                  ) : (
                    <BarChart data={ready.rows} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                      <XAxis dataKey={xCol} tick={{ fontSize: 11, fill: "#9A9AA3" }} minTickGap={24} />
                      <YAxis tick={{ fontSize: 11, fill: "#9A9AA3" }} width={48} />
                      <Tooltip contentStyle={{ fontSize: 12 }} />
                      <Bar dataKey={yCol} fill={ACCENT} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            ))}
            {yCols.length === 0 && <p className="text-sm text-fg-faint">Kies hierboven één of meer kolommen.</p>}
          </div>

          {/* min-w-0 on the first cell keeps the histogram from being pushed around by
              the stats column if its content ever gets wide — see PipelineShell.tsx for
              the fuller explanation and the Playwright repro that motivated this. */}
          <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-[1fr_14rem]">
            <div className="min-w-0">
              <label className="text-xs text-fg-muted">
                Kolomstatistieken voor
                <select
                  value={statsCol}
                  onChange={(e) => setStatsCol(e.target.value)}
                  className="ml-2 rounded border border-border-strong px-2 py-1 text-sm outline-none focus:border-accent/50"
                >
                  {numericColumns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              {stats ? (
                <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                  <Stat label="Aantal" value={fmt(stats.n, 0)} />
                  <Stat label="Ontbrekend" value={fmt(stats.nMissing, 0)} warn={stats.nMissing > 0} />
                  <Stat label="Gemiddelde" value={fmt(stats.mean)} />
                  <Stat label="Mediaan" value={fmt(stats.median)} />
                  <Stat label="Std.dev" value={fmt(stats.std)} />
                  <Stat label="Min" value={fmt(stats.min)} />
                  <Stat label="Max" value={fmt(stats.max)} />
                  <Stat label="p25 – p75" value={`${fmt(stats.p25, 0)} – ${fmt(stats.p75, 0)}`} />
                </div>
              ) : (
                <p className="mt-2 text-sm text-fg-faint">Geen numerieke kolom geselecteerd.</p>
              )}
            </div>
            {hist.length > 0 && (
              <div>
                <p className="mb-1 text-xs text-fg-muted">Verdeling</p>
                <ResponsiveContainer width="100%" height={120} className="overflow-hidden">
                  <BarChart data={hist} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <XAxis dataKey="bin" tick={{ fontSize: 9, fill: "#9A9AA3" }} interval={2} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Bar dataKey="count" fill={ACCENT} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {corrMatrix && (
            <div className="border-t border-border pt-4">
              <p className="mb-1 text-sm font-medium text-fg">Correlatie tussen kolommen</p>
              <p className="mb-2 text-xs text-fg-muted">
                Sterk samenhangende spend-kolommen (donker, ver van 0) zijn een risico voor het model —
                het wordt dan lastig hun losse effect te scheiden.
              </p>
              <div className="overflow-x-auto">
                <table className="text-xs">
                  <thead>
                    <tr>
                      <th className="p-1.5" />
                      {numericColumns.map((c) => (
                        <th key={c} className="p-1.5 text-left font-medium text-fg-muted">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {numericColumns.map((rowCol, i) => (
                      <tr key={rowCol}>
                        <td className="whitespace-nowrap p-1.5 font-medium text-fg">{rowCol}</td>
                        {numericColumns.map((_, j) => {
                          const r = corrMatrix[i][j];
                          return (
                            <td key={j} className="p-1.5 text-center" style={correlationCellStyle(r)}>
                              {Number.isNaN(r) ? "—" : `${r >= 0 ? "+" : ""}${fmt(r, 2)}`}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <div className="text-xs text-fg-muted">{label}</div>
      <div className={`text-sm font-medium ${warn ? "text-danger" : "text-fg"}`}>{value}</div>
    </div>
  );
}
