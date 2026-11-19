"use client";

import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AS_GROOTTE, formatteer } from "@/components/chat/chartTheme";
import { useGrafiekKleuren } from "@/components/ThemeProvider";
import { KORRELS, type Korrel, type ReeksPunt } from "@/lib/leadsSyntec/samenvatting";

/**
 * Leads per dag, week of maand, gestapeld in internet en offline. Rechtsboven kies je met
 * drie knopjes of de grafiek per dag, week of maand staat; standaard per week.
 *
 * Internet krijgt de eerste themakleur, offline de gedempte contextkleur: de vraag achter
 * dit tabblad is vooral hoeveel er via internet binnenkomt, en offline is de grote massa
 * eromheen. Met "Vergelijk met vorig jaar" staat het totaal van dezelfde datums een jaar
 * eerder er als lijn overheen, per vak op **positie** uitgelijnd (week 3 tegen week 3).
 *
 * Een eerste of laatste week/maand die maar half in de periode valt, wordt lichter
 * getekend: anders leest een halve maand als een inzakker. Hetzelfde voor de laatste dag
 * in de sheet als de export halverwege die dag liep.
 */

const MAANDEN = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function dagKort(datum: string): string {
  const [, m, d] = datum.split("-").map(Number);
  return `${d} ${MAANDEN[m - 1]}`;
}

function vakLabel(p: ReeksPunt, korrel: Korrel): string {
  if (korrel === "maand") {
    const [j, m] = p.begin.split("-").map(Number);
    return `${MAANDEN[m - 1]} ${String(j).slice(2)}`;
  }
  return dagKort(p.begin);
}

function vakLang(p: ReeksPunt, korrel: Korrel): string {
  if (korrel === "dag") {
    return new Date(`${p.begin}T00:00:00Z`).toLocaleDateString("nl-NL", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  if (korrel === "maand" && p.volledig) {
    const [j, m] = p.begin.split("-").map(Number);
    return `${MAANDEN[m - 1]} ${j}`;
  }
  return `${dagKort(p.begin)} t/m ${dagKort(p.eind)} ${p.eind.slice(0, 4)}`;
}

interface Punt {
  label: string;
  lang: string;
  internet: number;
  offline: number;
  internetLicht: number;
  offlineLicht: number;
  totaal: number;
  vorig: number | null;
  volledig: boolean;
}

type TooltipProps = { active?: boolean; payload?: { payload: Punt }[] };

function VakTooltip({ active, payload }: TooltipProps) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  return (
    <div className="rounded-control border border-line bg-card px-3 py-2 text-sm shadow-dropdown">
      <p className="font-medium text-ink">{p.lang}</p>
      <p className="mt-1 text-ink">
        {formatteer(p.totaal, "aantal")} {p.totaal === 1 ? "lead" : "leads"}
      </p>
      <p className="text-ink-muted">Internet: {formatteer(p.internet, "aantal")}</p>
      <p className="text-ink-muted">Offline: {formatteer(p.offline, "aantal")}</p>
      {p.vorig !== null && <p className="text-ink-muted">Vorig jaar: {formatteer(p.vorig, "aantal")}</p>}
      {!p.volledig && (
        <p className="mt-1 text-meta text-ink-faint">Niet compleet: half in de periode of een halve dag in de sheet.</p>
      )}
    </div>
  );
}

export default function SyntecGrafiek({
  punten,
  vorig,
  korrel,
  onKorrel,
}: {
  punten: ReeksPunt[];
  /** Dezelfde vakken een jaar eerder, of null zonder vergelijking. */
  vorig: ReeksPunt[] | null;
  korrel: Korrel;
  onKorrel: (korrel: Korrel) => void;
}) {
  const kleuren = useGrafiekKleuren();
  const data = useMemo<Punt[]>(
    () =>
      punten.map((p, i) => {
        const v = vorig?.[i];
        return {
          label: vakLabel(p, korrel),
          lang: vakLang(p, korrel),
          internet: p.internet,
          offline: p.offline,
          // Een half vak tekent in eigen, lichtere reeksen (gestapeld op dezelfde plek).
          internetLicht: p.volledig ? 0 : p.internet,
          offlineLicht: p.volledig ? 0 : p.offline,
          totaal: p.internet + p.offline,
          vorig: v ? v.internet + v.offline : null,
          volledig: p.volledig,
        };
      }),
    [punten, vorig, korrel],
  );
  const heeftHalf = data.some((d) => !d.volledig);
  const per = korrel === "dag" ? "dag" : korrel === "week" ? "week" : "maand";

  return (
    <section className="kaart-omlijst rounded-panel border border-line bg-card p-5 shadow-subtle">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-sans-w7 text-cell font-semibold text-ink">Leads per {per}</h2>
          <p className="mt-0.5 text-meta text-ink-muted">
            Internet is kanaalgroep Internet in Syntec; offline is alles daarbuiten (showroom, acquisitie,
            mail en telefoon).
            {vorig ? " De lijn is het totaal van dezelfde datums vorig jaar." : ""}
            {heeftHalf
              ? " Een lichtere staaf is niet compleet: hij valt maar voor een deel in de periode, of de sheet loopt nog niet tot het eind van die dag."
              : ""}
          </p>
        </div>
        <div className="flex shrink-0 rounded-control border border-line p-0.5" role="group" aria-label="Grafiek per dag, week of maand">
          {KORRELS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => onKorrel(k.id)}
              aria-pressed={korrel === k.id}
              className={`rounded-control px-2.5 py-1 text-sm transition-colors duration-[var(--duur-snel)] ease-merk ${
                korrel === k.id ? "bg-primary text-on-primary" : "text-ink-muted hover:bg-surface"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>
      {/* De legenda in HTML en niet via Recharts: twee staafreeksen per kleur (vol en licht
          voor een half vak) en een lijn horen er als drie regels in, niet als vijf. */}
      <div className="mt-3 flex justify-end gap-4 text-meta text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: kleuren.categorieen[0] }} />
          Internet
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: kleuren.context }} />
          Offline
        </span>
        {vorig && (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dashed" style={{ borderColor: kleuren.as }} />
            Vorig jaar (totaal)
          </span>
        )}
      </div>
      <div className="mt-1 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 16, right: 8, bottom: 4, left: 4 }}>
            <CartesianGrid stroke={kleuren.raster} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: AS_GROOTTE, fill: kleuren.as }}
              tickLine={false}
              axisLine={false}
              interval={Math.max(0, Math.ceil(data.length / 12) - 1)}
            />
            <YAxis
              tick={{ fontSize: AS_GROOTTE, fill: kleuren.as }}
              tickLine={false}
              axisLine={false}
              width={44}
              allowDecimals={false}
              tickFormatter={(v: number) => formatteer(v, "aantal")}
            />
            <Tooltip content={<VakTooltip />} cursor={{ fill: kleuren.raster }} />
            <Bar
              dataKey={(d: Punt) => (d.volledig ? d.internet : 0)}
              name="Internet"
              stackId="leads"
              fill={kleuren.categorieen[0]}
              isAnimationActive={false}
            />
            <Bar
              dataKey={(d: Punt) => (d.volledig ? d.offline : 0)}
              name="Offline"
              stackId="leads"
              fill={kleuren.context}
              radius={[kleuren.staafradius, kleuren.staafradius, 0, 0]}
              isAnimationActive={false}
            />
            <Bar
              dataKey="internetLicht"
              stackId="leads"
              fill={kleuren.categorieen[0]}
              fillOpacity={0.45}
              isAnimationActive={false}
              legendType="none"
            />
            <Bar
              dataKey="offlineLicht"
              stackId="leads"
              fill={kleuren.context}
              fillOpacity={0.45}
              radius={[kleuren.staafradius, kleuren.staafradius, 0, 0]}
              isAnimationActive={false}
              legendType="none"
            />
            {vorig && (
              <Line
                dataKey="vorig"
                name="Vorig jaar"
                type={kleuren.lijnvorm}
                stroke={kleuren.as}
                strokeWidth={Math.max(1, kleuren.lijndikte * 0.75)}
                strokeDasharray="4 3"
                dot={false}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
