"use client";

import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AS_GROOTTE, formatteer } from "@/components/chat/chartTheme";
import { useGrafiekKleuren } from "@/components/ThemeProvider";
import {
  MiddenLabel,
  TotaalLabel,
  gemengd,
  tekstOp,
  type LabelProps,
  type LabelStijl,
} from "@/components/grafiek/StaafLabels";
import { KORRELS, type Korrel, type ReeksPunt } from "@/lib/leadsSyntec/samenvatting";

/**
 * Leads per dag, week of maand, gestapeld: Online (kanaalgroep Internet) altijd onder in
 * blauw, Offline altijd erbovenop in grijs (verzoek van de eigenaar, november 2026). In elk
 * deel staat in het midden hoeveel leads het waren, en boven de staaf het totaal — zo lees je
 * online, offline en totaal af zonder over de staaf te hoeven bewegen. Rechtsboven kies je met drie
 * knopjes of de grafiek per dag, week of maand staat; standaard per week.
 *
 * Een getal verschijnt alleen als het past: in een smalle staaf (bv. 90 dagen per dag) of
 * een te laag deel blijft hij weg in plaats van over de rand te lopen; de tooltip heeft
 * altijd alle drie. Blauw komt uit het theme (`blauw` in `lib/themes.ts`), grijs is de
 * contextkleur van het theme; de tekstkleur in de staaf wordt gekozen op contrast.
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
  online: number;
  offline: number;
  totaal: number;
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
      <p className="text-ink-muted">Online: {formatteer(p.online, "aantal")}</p>
      <p className="text-ink-muted">Offline: {formatteer(p.offline, "aantal")}</p>
      {!p.volledig && (
        <p className="mt-1 text-meta text-ink-faint">Niet compleet: half in de periode of een halve dag in de sheet.</p>
      )}
    </div>
  );
}

export default function SyntecGrafiek({
  punten,
  korrel,
  onKorrel,
}: {
  punten: ReeksPunt[];
  korrel: Korrel;
  onKorrel: (korrel: Korrel) => void;
}) {
  const kleuren = useGrafiekKleuren();
  const data = useMemo<Punt[]>(
    () =>
      punten.map((p) => ({
        label: vakLabel(p, korrel),
        lang: vakLang(p, korrel),
        online: p.online,
        offline: p.offline,
        totaal: p.online + p.offline,
        volledig: p.volledig,
      })),
    [punten, korrel],
  );
  const heeftHalf = data.some((d) => !d.volledig);
  // Een half vak (eerste/laatste week of maand, of een halve dag) tekent lichter, met dezelfde
  // kleur: per staaf via een Cell, zodat het getal er gewoon in blijft staan.
  const LICHT = 0.45;
  const stijl = (vul: string): LabelStijl => ({ tekst: tekstOp(vul, [kleuren.label, kleuren.vlak]), halo: vul });
  const online = { vol: stijl(kleuren.blauw), licht: stijl(gemengd(kleuren.blauw, kleuren.vlak, LICHT)) };
  const offline = { vol: stijl(kleuren.context), licht: stijl(gemengd(kleuren.context, kleuren.vlak, LICHT)) };
  const vak = (index: number | undefined) => data[index ?? -1];
  const per = korrel === "dag" ? "dag" : korrel === "week" ? "week" : "maand";

  return (
    <section className="kaart-omlijst rounded-panel border border-line bg-card p-5 shadow-subtle">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-sans-w7 text-cell font-semibold text-ink">Leads per {per}</h2>
          <p className="mt-0.5 text-meta text-ink-muted">
            Online (blauw) is kanaalgroep Internet in Syntec; offline (grijs) is alles daarbuiten (showroom,
            acquisitie, mail en telefoon). In de staaf staat het aantal per deel, erboven het
            totaal.
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
                korrel === k.id ? "bg-ink text-card" : "text-ink-muted hover:bg-surface hover:text-ink"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>
      {/* De legenda in HTML, rechts boven de grafiek. */}
      <div className="mt-3 flex justify-end gap-4 text-meta text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: kleuren.blauw }} />
          Online
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: kleuren.context }} />
          Offline
        </span>
      </div>
      <div className="mt-1 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {/* Ruimte bovenin voor het totaal boven de hoogste staaf. */}
          <ComposedChart data={data} margin={{ top: 24, right: 8, bottom: 4, left: 4 }}>
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
            {/* Volgorde = stapelvolgorde: online onderop, offline erbovenop. */}
            <Bar dataKey="online" name="Online" stackId="leads" fill={kleuren.blauw} isAnimationActive={false}>
              {data.map((d, i) => (
                <Cell key={i} fillOpacity={d.volledig ? 1 : LICHT} />
              ))}
              <LabelList
                dataKey="online"
                content={(p) => {
                  const lp = p as LabelProps;
                  return <MiddenLabel {...lp} stijl={vak(lp.index)?.volledig === false ? online.licht : online.vol} />;
                }}
              />
              <LabelList
                dataKey="totaal"
                content={(p) => {
                  const lp = p as LabelProps;
                  if ((vak(lp.index)?.offline ?? 0) > 0) return null;
                  return <TotaalLabel {...lp} kleur={kleuren.label} halo={kleuren.vlak} />;
                }}
              />
            </Bar>
            <Bar
              dataKey="offline"
              name="Offline"
              stackId="leads"
              fill={kleuren.context}
              radius={[kleuren.staafradius, kleuren.staafradius, 0, 0]}
              isAnimationActive={false}
            >
              {data.map((d, i) => (
                <Cell key={i} fillOpacity={d.volledig ? 1 : LICHT} />
              ))}
              <LabelList
                dataKey="offline"
                content={(p) => {
                  const lp = p as LabelProps;
                  return <MiddenLabel {...lp} stijl={vak(lp.index)?.volledig === false ? offline.licht : offline.vol} />;
                }}
              />
              <LabelList
                dataKey="totaal"
                content={(p) => {
                  const lp = p as LabelProps;
                  if ((vak(lp.index)?.offline ?? 0) === 0) return null;
                  return <TotaalLabel {...lp} kleur={kleuren.label} halo={kleuren.vlak} />;
                }}
              />
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
