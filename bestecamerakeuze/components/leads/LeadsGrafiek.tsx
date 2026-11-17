"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AS_GROOTTE, formatteer } from "@/components/chat/chartTheme";
import { useGrafiekKleuren } from "@/components/ThemeProvider";
import type { DagPunt } from "@/lib/leads/samenvatting";

/**
 * Leads per dag, gestapeld in betaald en onbetaald.
 *
 * Twee reeksen omdat het twee verschillende dingen zijn, niet omdat de grafiek er rijker
 * van wordt: de vraag achter dit tabblad is hoeveel van de leads betaald waren. Betaald
 * krijgt de eerste themakleur, onbetaald de gedempte contextkleur — "één ding is het punt,
 * de rest is context".
 *
 * Alle dagen van de periode staan op de as, ook de dagen zonder lead. Zonder dat zou een
 * rustig weekend de rest van de grafiek naar elkaar toe trekken.
 */

function dagLabel(datum: string, lang = false): string {
  return new Date(`${datum}T00:00:00Z`).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    ...(lang ? { weekday: "short" } : {}),
    timeZone: "UTC",
  });
}

type TooltipProps = {
  active?: boolean;
  payload?: { payload: DagPunt }[];
};

function DagTooltip({ active, payload }: TooltipProps) {
  const punt = payload?.[0]?.payload;
  if (!active || !punt) return null;
  const totaal = punt.betaald + punt.onbetaald;
  return (
    <div className="rounded-control border border-line bg-card px-3 py-2 text-sm shadow-dropdown">
      <p className="font-medium text-ink">{dagLabel(punt.datum, true)}</p>
      <p className="mt-1 text-ink-muted">
        {formatteer(totaal, "aantal")} {totaal === 1 ? "lead" : "leads"}
      </p>
      <p className="text-ink-muted">Betaald: {formatteer(punt.betaald, "aantal")}</p>
      <p className="text-ink-muted">Onbetaald: {formatteer(punt.onbetaald, "aantal")}</p>
    </div>
  );
}

export default function LeadsGrafiek({ dagen }: { dagen: DagPunt[] }) {
  const kleuren = useGrafiekKleuren();
  const data = useMemo(() => dagen.map((d) => ({ ...d, label: dagLabel(d.datum) })), [dagen]);

  return (
    <section className="kaart-omlijst rounded-panel border border-line bg-card p-5 shadow-subtle">
      <h2 className="font-sans-w7 text-cell font-semibold text-ink">Leads per dag</h2>
      <p className="mt-0.5 text-meta text-ink-muted">
        Betaald is verkeer met medium cpc of paid; alles wat daarbuiten valt (organisch, direct,
        verwijzingen, e-mail) is onbetaald.
      </p>
      <div className="mt-3 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 8, bottom: 4, left: 4 }}>
            <CartesianGrid stroke={kleuren.raster} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: AS_GROOTTE, fill: kleuren.as }}
              tickLine={false}
              axisLine={false}
              interval={Math.max(0, Math.ceil(data.length / 10) - 1)}
            />
            <YAxis
              tick={{ fontSize: AS_GROOTTE, fill: kleuren.as }}
              tickLine={false}
              axisLine={false}
              width={36}
              allowDecimals={false}
            />
            <Tooltip content={<DagTooltip />} cursor={{ fill: "rgba(25,36,59,0.04)" }} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="square"
              iconSize={10}
              wrapperStyle={{ fontSize: AS_GROOTTE, paddingBottom: 8 }}
            />
            <Bar
              dataKey="betaald"
              name="Betaald"
              stackId="leads"
              fill={kleuren.categorieen[0]}
              isAnimationActive={false}
            />
            <Bar
              dataKey="onbetaald"
              name="Onbetaald"
              stackId="leads"
              fill={kleuren.context}
              radius={[kleuren.staafradius, kleuren.staafradius, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
