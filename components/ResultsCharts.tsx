"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ErrorBar,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FitSummary } from "@/lib/types";

// Deterministic, zero-cost charts drawn straight from the numbers already in FitSummary —
// no AI call, so these always render (unlike the optional deep-analysis step below them).
const ROSE = "#e11d48";
const NEUTRAL = "#a3a3a3";
const GRID = "#e5e5e5";
const AXIS = { fontSize: 11, fill: "#a3a3a3" };

function fmt(n: number, digits = 0): string {
  return n.toLocaleString("nl-NL", { maximumFractionDigits: digits });
}

function ChartCard({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium text-neutral-900">{title}</p>
      {hint && <p className="mb-1 text-xs text-neutral-500">{hint}</p>}
      {children}
    </div>
  );
}

function ShareTooltip({ active, payload }: { active?: boolean; payload?: { payload: Record<string, number> }[] }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs shadow-sm">
      <p className="font-medium text-neutral-900">{fmt(d.p50 as number, 1)}%</p>
      <p className="text-neutral-500">
        {fmt(d.p3 as number, 1)}% – {fmt(d.p97 as number, 1)}%
      </p>
    </div>
  );
}

function RoasTooltip({ active, payload }: { active?: boolean; payload?: { payload: Record<string, number> }[] }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs shadow-sm">
      <p className="font-medium text-neutral-900">{fmt(d.p50 as number, 2)}</p>
      <p className="text-neutral-500">
        {fmt(d.p3 as number, 2)} – {fmt(d.p97 as number, 2)}
      </p>
    </div>
  );
}

export function ResultsCharts({ summary }: { summary: FitSummary }) {
  const shareData = summary.channels.map((ch) => ({
    name: ch.name,
    p50: ch.contribution_share.p50 * 100,
    errorRange: [
      (ch.contribution_share.p50 - ch.contribution_share.p3) * 100,
      (ch.contribution_share.p97 - ch.contribution_share.p50) * 100,
    ] as [number, number],
    p3: ch.contribution_share.p3 * 100,
    p97: ch.contribution_share.p97 * 100,
  }));

  const roasData = summary.channels.map((ch) => ({
    name: ch.name,
    p50: ch.roas.p50,
    errorRange: [ch.roas.p50 - ch.roas.p3, ch.roas.p97 - ch.roas.p50] as [number, number],
    p3: ch.roas.p3,
    p97: ch.roas.p97,
  }));

  const rowHeight = 32;
  const shareHeight = Math.max(120, shareData.length * rowHeight);
  const roasHeight = Math.max(120, roasData.length * rowHeight);

  const curves = summary.response_curves ?? [];
  const frontier = summary.efficiency_frontier;
  const allocation = summary.optimal_allocation;

  const reallocData =
    allocation && curves.length > 0
      ? curves
          .map((c) => {
            const advised = allocation.per_channel[c.name];
            if (advised == null) return null;
            return { name: c.name, delta: advised - c.current_weekly_spend, current: c.current_weekly_spend, advised };
          })
          .filter((d): d is { name: string; delta: number; current: number; advised: number } => d !== null)
      : [];
  const reallocHeight = Math.max(120, reallocData.length * rowHeight);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <ChartCard title="Aandeel per kanaal" hint="Mediaan met onzekerheidsmarge (p3–p97)">
          <ResponsiveContainer width="100%" height={shareHeight} className="overflow-hidden">
            <BarChart data={shareData} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
              <XAxis type="number" tick={AXIS} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={AXIS} width={100} />
              <Tooltip content={<ShareTooltip />} cursor={{ fill: "#fafafa" }} />
              <Bar dataKey="p50" fill={ROSE} radius={[0, 3, 3, 0]} barSize={14}>
                <ErrorBar dataKey="errorRange" direction="x" width={3} stroke={ROSE} strokeOpacity={0.5} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="ROAS per kanaal" hint="Mediaan met onzekerheidsmarge (p3–p97)">
          <ResponsiveContainer width="100%" height={roasHeight} className="overflow-hidden">
            <BarChart data={roasData} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
              <XAxis type="number" tick={AXIS} />
              <YAxis type="category" dataKey="name" tick={AXIS} width={100} />
              <Tooltip content={<RoasTooltip />} cursor={{ fill: "#fafafa" }} />
              <Bar dataKey="p50" fill={ROSE} radius={[0, 3, 3, 0]} barSize={14}>
                <ErrorBar dataKey="errorRange" direction="x" width={3} stroke={ROSE} strokeOpacity={0.5} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {curves.length > 0 && (
        <div>
          <p className="text-sm font-medium text-neutral-900">Respons- en verzadigingscurves</p>
          <p className="mb-2 text-xs text-neutral-500">
            Contributie bij toenemende wekelijkse spend; de stippellijn markeert de huidige spend.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {curves.map((curve) => {
              const data = curve.points.map((p) => ({
                spend: p.weekly_spend,
                p50: p.contribution.p50,
                band: [p.contribution.p3, p.contribution.p97],
              }));
              return (
                <div key={curve.name}>
                  <p className="mb-1 text-xs font-medium text-neutral-700">{curve.name}</p>
                  <ResponsiveContainer width="100%" height={160} className="overflow-hidden">
                    <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                      <XAxis dataKey="spend" tick={AXIS} tickFormatter={(v) => fmt(v)} />
                      <YAxis tick={AXIS} width={44} tickFormatter={(v) => fmt(v)} />
                      <Tooltip
                        formatter={(value) => fmt(Number(value))}
                        labelFormatter={(v) => `Spend: ${fmt(Number(v))}`}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Area dataKey="band" stroke="none" fill={ROSE} fillOpacity={0.12} />
                      <Line type="monotone" dataKey="p50" stroke={ROSE} strokeWidth={2} dot={false} />
                      <ReferenceLine
                        x={curve.current_weekly_spend}
                        stroke="#525252"
                        strokeDasharray="4 4"
                        label={{ value: "nu", position: "top", fontSize: 10, fill: "#525252" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {frontier && frontier.length > 1 && (
        <ChartCard title="Efficiency frontier" hint="Totaal weekbudget vs. voorspelde contributie — waar het rendement afvlakt">
          <ResponsiveContainer width="100%" height={200} className="overflow-hidden">
            <AreaChart
              data={[...frontier].sort((a, b) => a.total_weekly_budget - b.total_weekly_budget).map((f) => ({
                budget: f.total_weekly_budget,
                p50: f.predicted_contribution.p50,
                band: [f.predicted_contribution.p3, f.predicted_contribution.p97],
              }))}
              margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="budget" tick={AXIS} tickFormatter={(v) => fmt(v)} />
              <YAxis tick={AXIS} width={48} tickFormatter={(v) => fmt(v)} />
              <Tooltip
                formatter={(value) => fmt(Number(value))}
                labelFormatter={(v) => `Budget: ${fmt(Number(v))}`}
                contentStyle={{ fontSize: 12 }}
              />
              <Area dataKey="band" stroke="none" fill={ROSE} fillOpacity={0.12} />
              <Line type="monotone" dataKey="p50" stroke={ROSE} strokeWidth={2} dot={false} />
              {allocation && (
                <ReferenceLine
                  x={allocation.total_weekly_budget}
                  stroke="#525252"
                  strokeDasharray="4 4"
                  label={{ value: "nu", position: "top", fontSize: 10, fill: "#525252" }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {reallocData.length > 0 && (
        <ChartCard title="Budgetherverdeling" hint="Advies t.o.v. huidige spend per week — rose = meer, grijs = minder">
          <ResponsiveContainer width="100%" height={reallocHeight} className="overflow-hidden">
            <BarChart data={reallocData} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
              <XAxis type="number" tick={AXIS} tickFormatter={(v) => fmt(v)} />
              <YAxis type="category" dataKey="name" tick={AXIS} width={100} />
              <Tooltip
                formatter={(_value, _key, item) => [
                  `${fmt((item.payload as { current: number }).current)} → ${fmt(
                    (item.payload as { advised: number }).advised,
                  )}`,
                  "advies",
                ]}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="delta" radius={[0, 3, 3, 0]} barSize={14}>
                {reallocData.map((d) => (
                  <Cell key={d.name} fill={d.delta >= 0 ? ROSE : NEUTRAL} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}
