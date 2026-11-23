"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useGrafiekKleuren } from "@/components/ThemeProvider";
import { AS_GROOTTE } from "@/components/chat/chartTheme";
import { formatWaarde } from "@/lib/insight/rekenen";
import type { Grafiek } from "@/lib/insight/types";

/** Hoogstens zes reeksen: een zevende kleur bestaat niet in het palet (zie CLAUDE.md). */
const MAX_REEKSEN = 6;

/** Een datum "2026-10-01" kort als "1 okt"; andere labels blijven zoals ze zijn. */
function kortLabel(x: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(x)) return x;
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" }).format(new Date(`${x}T00:00:00Z`));
}

/**
 * Een grafiek uit een analyse: lijn of staaf, één as (alle reeksen in dezelfde eenheid),
 * kleuren in vaste volgorde uit het palet van het theme. Eén reeks heeft geen legenda nodig:
 * de titel zegt wat het is.
 */
export default function InsightGrafiek({ grafiek }: { grafiek: Grafiek }) {
  const kleuren = useGrafiekKleuren();
  const reeksen = grafiek.reeksen.slice(0, MAX_REEKSEN);
  const data = grafiek.x.map((x, i) => {
    const punt: Record<string, string | number | null> = { x };
    reeksen.forEach((r, j) => {
      punt[`r${j}`] = r.waarden[i] ?? null;
    });
    return punt;
  });
  const metLegenda = reeksen.length > 1;
  const as = { fontSize: AS_GROOTTE, fill: kleuren.as };
  const tooltip = (
    <Tooltip
      labelFormatter={(x) => kortLabel(String(x))}
      formatter={(waarde, naam) => {
        const index = Number(String(naam).slice(1));
        return [formatWaarde(waarde as number | null, grafiek.eenheid), reeksen[index]?.naam ?? String(naam)];
      }}
      contentStyle={{ fontSize: 12, borderRadius: 8 }}
    />
  );
  const legenda = metLegenda ? (
    <Legend formatter={(naam) => reeksen[Number(String(naam).slice(1))]?.naam ?? naam} wrapperStyle={{ fontSize: 12 }} />
  ) : null;
  const assen = (
    <>
      <CartesianGrid stroke={kleuren.raster} vertical={false} />
      <XAxis dataKey="x" tick={as} tickFormatter={kortLabel} tickLine={false} axisLine={{ stroke: kleuren.raster }} minTickGap={16} />
      <YAxis
        tick={as}
        tickLine={false}
        axisLine={false}
        width={64}
        tickFormatter={(v: number) => formatWaarde(v, grafiek.eenheid)}
      />
    </>
  );

  return (
    <figure className="rounded-card border border-line-soft p-4">
      <figcaption className="mb-3 text-sm font-semibold text-ink">{grafiek.titel}</figcaption>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          {grafiek.type === "staaf" ? (
            <BarChart data={data} barGap={2}>
              {assen}
              {tooltip}
              {legenda}
              {reeksen.map((_, j) => (
                <Bar
                  key={j}
                  dataKey={`r${j}`}
                  fill={kleuren.categorieen[j % kleuren.categorieen.length]}
                  radius={[kleuren.staafradius, kleuren.staafradius, 0, 0]}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          ) : (
            <LineChart data={data}>
              {assen}
              {tooltip}
              {legenda}
              {reeksen.map((_, j) => (
                <Line
                  key={j}
                  dataKey={`r${j}`}
                  type={kleuren.lijnvorm}
                  stroke={kleuren.categorieen[j % kleuren.categorieen.length]}
                  strokeWidth={kleuren.lijndikte}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
      {grafiek.voetnoot && <p className="mt-2 text-meta text-ink-faint">{grafiek.voetnoot}</p>}
    </figure>
  );
}
