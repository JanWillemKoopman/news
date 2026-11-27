"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useGrafiekKleuren, useTheme } from "@/components/ThemeProvider";
import { AS_GROOTTE } from "@/components/chat/chartTheme";
import { KanaalStip } from "@/components/marketingAnalyse/werkruimte/Visueel";
import { reeksKleuren } from "@/lib/marketingAnalyse/kanaalKleur";
import { isOnvolledigeWeek } from "@/lib/marketingAnalyse/portefeuille";
import { formatWaarde } from "@/lib/marketingAnalyse/rekenen";
import type { Grafiek } from "@/lib/marketingAnalyse/types";

/** Hoogstens zes reeksen: een zevende kleur bestaat niet in het palet (zie CLAUDE.md). */
const MAX_REEKSEN = 6;
/** Vaste breedte van de y-as, zodat twee grafieken onder elkaar dezelfde week op dezelfde plek tonen. */
export const AS_BREEDTE = 64;

/** Een datum "2026-10-01" kort als "1 okt"; andere labels blijven zoals ze zijn. */
export function kortLabel(x: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(x)) return x;
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" }).format(new Date(`${x}T00:00:00Z`));
}

/**
 * De inktkleur van het actieve theme, voor een reeks die geen kanaal is. SVG-attributen lezen geen
 * CSS-variabelen, dus hij wordt na elke themewissel uit de berekende stijl gehaald.
 */
function useInktKleur(): string {
  const { theme } = useTheme();
  const [kleur, setKleur] = useState("#0f1115");
  useEffect(() => {
    const waarde = getComputedStyle(document.documentElement).getPropertyValue("--color-ink").trim();
    if (waarde) setKleur(waarde);
  }, [theme]);
  return kleur;
}

/**
 * Een grafiek uit een analyse: lijn of staaf, één as (alle reeksen in dezelfde eenheid).
 *
 * Redesign november 2026: een kanaal heeft overal op de pagina dezelfde kleur (`reeksKleuren`), de
 * legenda staat altijd in beeld (geen hover nodig), staven beginnen bij nul, een ontbrekende meting
 * blijft een gat in de lijn, en een week die niet helemaal in de analyseperiode valt (de eerste en
 * de lopende week) staat lichter met een uitleg eronder. Met `syncId` en de vaste asbreedte lijnen
 * twee grafieken met dezelfde weken precies onder elkaar uit.
 */
export default function AnalyseGrafiek({
  grafiek,
  periodeVan = null,
  periodeTot = null,
  hoogte = 224,
  syncId,
  kaal = false,
  zonderVoetnoot = false,
}: {
  grafiek: Grafiek;
  periodeVan?: string | null;
  periodeTot?: string | null;
  hoogte?: number;
  syncId?: string;
  /** Zonder eigen kader en titel (de titel staat erboven). */
  kaal?: boolean;
  /** Geen voetnoot onder de grafiek (staat er al een gezamenlijke). */
  zonderVoetnoot?: boolean;
}) {
  const kleuren = useGrafiekKleuren();
  const nadruk = useInktKleur();
  const reeksen = grafiek.reeksen.slice(0, MAX_REEKSEN);
  const kleur = reeksKleuren(
    reeksen.map((r) => r.naam),
    kleuren.categorieen,
    kleuren.context,
    nadruk,
  );
  const onvolledig = grafiek.x.map((x) => isOnvolledigeWeek(x, periodeVan, periodeTot));
  const heeftOnvolledig = (periodeVan || periodeTot) && /^\d{4}-\d{2}-\d{2}$/.test(grafiek.x[0] ?? "") && onvolledig.some(Boolean);
  const data = grafiek.x.map((x, i) => {
    const punt: Record<string, string | number | null> = { x };
    reeksen.forEach((r, j) => {
      punt[`r${j}`] = r.waarden[i] ?? null;
    });
    return punt;
  });
  const as = { fontSize: AS_GROOTTE, fill: kleuren.as };
  const tooltip = (
    <Tooltip
      cursor={{ fill: kleuren.raster }}
      labelFormatter={(x) => {
        const i = grafiek.x.indexOf(String(x));
        return `${/^\d{4}-\d{2}-\d{2}$/.test(String(x)) ? `Week van ${kortLabel(String(x))}` : String(x)}${i >= 0 && onvolledig[i] ? " (onvolledig)" : ""}`;
      }}
      formatter={(waarde, naam) => {
        const index = Number(String(naam).slice(1));
        return [waarde === null || waarde === undefined ? "geen meting" : formatWaarde(waarde as number, grafiek.eenheid), reeksen[index]?.naam ?? String(naam)];
      }}
      contentStyle={{ fontSize: 12, borderRadius: 10, border: "none", boxShadow: "0 8px 24px rgb(15 23 42 / 0.16)" }}
    />
  );
  const assen = (
    <>
      <CartesianGrid stroke={kleuren.raster} vertical={false} />
      <XAxis dataKey="x" tick={as} tickFormatter={kortLabel} tickLine={false} axisLine={{ stroke: kleuren.raster }} minTickGap={12} />
      <YAxis
        tick={as}
        tickLine={false}
        axisLine={false}
        width={AS_BREEDTE}
        domain={[0, "auto"]}
        tickCount={hoogte < 170 ? 3 : 5}
        interval={0}
        allowDecimals={grafiek.eenheid !== "aantal"}
        tickFormatter={(v: number) => formatWaarde(v, grafiek.eenheid)}
      />
    </>
  );

  const inhoud = (
    <>
      {reeksen.length > 1 && (
        <ul className="mb-2 flex flex-wrap gap-x-3.5 gap-y-1 text-[12px] text-ink-muted" aria-label="Legenda">
          {reeksen.map((r, j) => (
            <li key={r.naam} className="flex items-center gap-1.5">
              <KanaalStip kleur={kleur[j]} />
              {r.naam}
            </li>
          ))}
        </ul>
      )}
      <div style={{ height: hoogte }}>
        <ResponsiveContainer width="100%" height="100%">
          {grafiek.type === "staaf" ? (
            <BarChart data={data} barGap={2} syncId={syncId} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              {assen}
              {tooltip}
              {reeksen.map((_, j) => (
                <Bar
                  key={j}
                  dataKey={`r${j}`}
                  stackId={reeksen.length > 3 ? "stapel" : undefined}
                  fill={kleur[j]}
                  radius={reeksen.length > 3 ? 0 : [kleuren.staafradius, kleuren.staafradius, 0, 0]}
                  isAnimationActive={false}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fillOpacity={onvolledig[i] && heeftOnvolledig ? 0.42 : 1} />
                  ))}
                </Bar>
              ))}
            </BarChart>
          ) : (
            <LineChart data={data} syncId={syncId} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              {assen}
              {tooltip}
              {reeksen.map((r, j) => (
                <Line
                  key={j}
                  dataKey={`r${j}`}
                  type={kleuren.lijnvorm}
                  stroke={kleur[j]}
                  strokeWidth={kleuren.lijndikte}
                  // Een doel of een vorige periode als stippellijn: niet alleen kleur onderscheidt.
                  strokeDasharray={/doel|vorige|verwacht/i.test(r.naam) ? "5 4" : undefined}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
      {!zonderVoetnoot && (heeftOnvolledig || grafiek.voetnoot) && (
        <p className="mt-2 text-[11.5px] leading-snug text-ink-faint">
          {heeftOnvolledig && grafiek.type === "staaf" && "Lichtere staven: week valt niet helemaal in de periode (start of lopende week). "}
          {heeftOnvolledig && grafiek.type !== "staaf" && "De eerste en laatste week zijn niet volledig. "}
          {grafiek.voetnoot}
        </p>
      )}
    </>
  );

  if (kaal) return <div>{inhoud}</div>;
  return (
    <figure className="rounded-[14px] border border-line bg-[var(--ma-ondergrond,var(--color-card))] px-4 pb-3.5 pt-3.5 shadow-subtle lg:px-5">
      <figcaption className="mb-2 flex items-baseline justify-between gap-3">
        <span className="ma-kop text-[13.5px] text-ink">{grafiek.titel}</span>
        <span className="shrink-0 text-[11.5px] text-ink-faint">{grafiek.eenheid === "euro" ? "in euro" : grafiek.eenheid === "procent" ? "in %" : grafiek.eenheid === "seconden" ? "in seconden" : "aantal"}</span>
      </figcaption>
      {inhoud}
    </figure>
  );
}
