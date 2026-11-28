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
import { formatWaarde } from "@/lib/marketingAnalyse/rekenen";
import type { Grafiek } from "@/lib/marketingAnalyse/types";

/** Hoogstens zes reeksen: een zevende kleur bestaat niet in het palet (zie CLAUDE.md). */
const MAX_REEKSEN = 6;

const MAAND_KORT = new Intl.DateTimeFormat("nl-NL", { month: "short", timeZone: "UTC" });
const MAAND_LANG = new Intl.DateTimeFormat("nl-NL", { month: "long", year: "numeric", timeZone: "UTC" });
const DAG_KORT = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * Een label op de x-as: een datum "2026-10-01" als "1 okt" en een maand "2026-10" als "okt"
 * (H2: geen ISO-maanden als "2026-10" op de as). Andere labels blijven zoals ze zijn.
 */
function kortLabel(x: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(x)) return DAG_KORT.format(new Date(`${x}T00:00:00Z`));
  if (/^\d{4}-\d{2}$/.test(x)) return MAAND_KORT.format(new Date(`${x}-01T00:00:00Z`)).replace(".", "");
  return x;
}

/** Hetzelfde, maar voluit voor de tooltip: "oktober 2026". */
function langLabel(x: string): string {
  if (/^\d{4}-\d{2}$/.test(x)) return MAAND_LANG.format(new Date(`${x}-01T00:00:00Z`));
  return kortLabel(x);
}

/**
 * H1: één vaste kleur per bedrijf, cluster en platform, in elke grafiek van elke analyse. Eerst
 * kreeg een reeks de kleur van zijn plek in de grafiek, waardoor oranje op één pagina "Google
 * Ads", "PGZ" en "Van den Udenhout" kon betekenen. De nummers wijzen in het palet van het theme
 * (`categorieen`), zodat het in elk theme klopt; plek 1 (oranje in de huisstijl) blijft vrij, want
 * oranje is ook "Aandacht". "Groep" en "Totaal" krijgen het neutrale grijs van de as.
 */
const VASTE_KLEUR: { patroon: RegExp; plek: number | "neutraal" }[] = [
  { patroon: /^(hele )?groep$|^totaal|^alle /i, plek: "neutraal" },
  { patroon: /udenhout|^vdu\b/i, plek: 0 },
  { patroon: /^pgz|pgz\.nl|porsche|bentley/i, plek: 4 },
  { patroon: /veloo/i, plek: 2 },
  { patroon: /^meta/i, plek: 5 },
  { patroon: /^google/i, plek: 3 },
];

function kleurVoor(naam: string, j: number, palet: readonly string[], neutraal: string, bezet: Set<number>): string {
  const vast = VASTE_KLEUR.find((k) => k.patroon.test(naam.trim()));
  if (vast) return vast.plek === "neutraal" ? neutraal : palet[vast.plek % palet.length];
  // Onbekende reeks: de eerste vrije plek, oranje (1) als laatste.
  const volgorde = [0, 2, 4, 5, 3, 1].filter((i) => !bezet.has(i));
  const plek = volgorde[j % Math.max(1, volgorde.length)] ?? j;
  return palet[plek % palet.length];
}

/** Vanaf zoveel punten worden staven gestapeld (H24): anders zijn het streepjes van een paar pixels. */
const STAPELEN_VANAF = 20;

/**
 * Een grafiek uit een analyse: lijn of staaf, één as (alle reeksen in dezelfde eenheid),
 * kleuren in vaste volgorde uit het palet van het theme. Eén reeks heeft geen legenda nodig:
 * de titel zegt wat het is.
 */
export default function AnalyseGrafiek({ grafiek, gestapeld: stapel = false }: { grafiek: Grafiek; gestapeld?: boolean }) {
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
  const bezet = new Set(
    reeksen
      .map((r) => VASTE_KLEUR.find((k) => k.patroon.test(r.naam.trim()))?.plek)
      .filter((p): p is number => typeof p === "number"),
  );
  const kleur = reeksen.map((r, j) => kleurVoor(r.naam, j, kleuren.categorieen, kleuren.as, bezet));
  const gestapeld = grafiek.type === "staaf" && reeksen.length > 1 && (stapel || data.length >= STAPELEN_VANAF);
  const as = { fontSize: AS_GROOTTE, fill: kleuren.as };
  const tooltip = (
    <Tooltip
      labelFormatter={(x) => langLabel(String(x))}
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
    // H21: de figuur vult zijn kaart, zodat twee grafieken naast elkaar even hoog zijn; de
    // voetnoot staat onderaan.
    <figure className="flex h-full flex-col rounded-card border border-line-soft p-4">
      <figcaption className="mb-3 text-sm font-semibold text-ink">{grafiek.titel}</figcaption>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          {grafiek.type === "staaf" ? (
            <BarChart data={data} barGap={2} barCategoryGap={gestapeld ? "18%" : "10%"}>
              {assen}
              {tooltip}
              {legenda}
              {reeksen.map((_, j) => (
                <Bar
                  key={j}
                  dataKey={`r${j}`}
                  fill={kleur[j]}
                  stackId={gestapeld ? "a" : undefined}
                  radius={gestapeld && j < reeksen.length - 1 ? 0 : [kleuren.staafradius, kleuren.staafradius, 0, 0]}
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
                  stroke={kleur[j]}
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
      {grafiek.voetnoot && <p className="mt-auto pt-2 text-meta text-ink-faint">{grafiek.voetnoot}</p>}
    </figure>
  );
}
