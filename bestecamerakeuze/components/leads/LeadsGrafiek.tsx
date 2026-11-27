"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AS_GROOTTE, formatteer } from "@/components/chat/chartTheme";
import { useGrafiekKleuren } from "@/components/ThemeProvider";
import {
  MiddenLabel,
  TEKEN_BREEDTE,
  TotaalLabel,
  gemengd,
  tekstOp,
  type LabelProps,
  type LabelStijl,
} from "@/components/grafiek/StaafLabels";
import { KORRELS, kostenPerLeadVan, type Korrel, type ReeksPunt } from "@/lib/leads/reeks";

/**
 * De grafiek op het tabblad Leads: per dag, week of maand (knopjes rechtsboven, standaard per
 * week, net als op Syntec leads), en met een keuze welk cijfer erin staat (verzoek november
 * 2026):
 *
 * - **Leads**: gestapeld in betaald (eerste themakleur) en onbetaald (gedempte contextkleur),
 *   met het aantal midden in elk deel en het totaal boven de staaf.
 * - **Uitgaven**: één staaf per vak met het bedrag erboven. Zonder filters de echte uitgaven
 *   van Google, Meta en LinkedIn plus de handmatige kosten; met een filter de toegerekende
 *   kosten van de selectie; met alleen het filter Betaald gewoon de echte uitgaven (`lib/leads/reeks.ts`).
 * - **Kosten per lead**: uitgaven ÷ alle leads (betaald en onbetaald) per vak, met het bedrag boven elk punt. Een
 *   lijn en geen staaf: het is een afgeleide (uitgaven ÷ leads), en zo'n cijfer tekent op de
 *   Kanalen-pagina's als lijn. Een vak zonder lead heeft geen punt.
 *
 * Eén cijfer tegelijk — twee assen in één beeld suggereren een verband dat er niet is. Een
 * getal verschijnt alleen als het past (per dag over een lange periode dus alleen in de
 * tooltip). Een eerste of laatste week/maand die maar half in de periode valt, tekent lichter.
 */

export type LeadsMetriek = "leads" | "uitgaven" | "kpl";

export const METRIEKEN: { id: LeadsMetriek; label: string }[] = [
  { id: "leads", label: "Leads" },
  { id: "uitgaven", label: "Uitgaven" },
  { id: "kpl", label: "Kosten per lead" },
];

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
  betaald: number;
  onbetaald: number;
  totaal: number;
  uitgaven: number;
  kpl: number | null;
  volledig: boolean;
}

const euro = (v: number) => formatteer(v, "euro-heel");
const euroKort = (v: number) => formatteer(v, "euro-heel", true);
const euroLabel = (v: number) => formatteer(v, v < 10 ? "euro-exact" : "euro-heel");

type TooltipProps = { active?: boolean; payload?: { payload: Punt }[]; echteUitgaven: boolean };

function VakTooltip({ active, payload, echteUitgaven }: TooltipProps) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  return (
    <div className="rounded-control border border-line bg-card px-3 py-2 text-sm shadow-dropdown">
      <p className="font-medium text-ink">{p.lang}</p>
      <p className="mt-1 text-ink">
        {formatteer(p.totaal, "aantal")} {p.totaal === 1 ? "lead" : "leads"}
      </p>
      <p className="text-ink-muted">Betaald: {formatteer(p.betaald, "aantal")}</p>
      <p className="text-ink-muted">Onbetaald: {formatteer(p.onbetaald, "aantal")}</p>
      <p className="mt-1 text-ink-muted">
        {echteUitgaven ? "Uitgaven" : "Toegerekende kosten"}: {euro(p.uitgaven)}
      </p>
      <p className="text-ink-muted">
        Kosten per lead: {p.kpl === null ? "—" : formatteer(p.kpl, "euro-exact")}
      </p>
      {!p.volledig && (
        <p className="mt-1 text-meta text-ink-faint">Niet compleet: valt maar voor een deel in de periode.</p>
      )}
    </div>
  );
}

function Keuzeknoppen<T extends string>({
  label,
  keuzes,
  gekozen,
  onKies,
}: {
  label: string;
  keuzes: { id: T; label: string }[];
  gekozen: T;
  onKies: (id: T) => void;
}) {
  return (
    <div className="flex shrink-0 rounded-control border border-line p-0.5" role="group" aria-label={label}>
      {keuzes.map((k) => (
        <button
          key={k.id}
          type="button"
          onClick={() => onKies(k.id)}
          aria-pressed={gekozen === k.id}
          className={`whitespace-nowrap rounded-control px-2.5 py-1 text-sm transition-colors duration-[var(--duur-snel)] ease-merk ${
            gekozen === k.id ? "bg-primary text-on-primary vdu:bg-ink vdu:text-card" : "text-ink-muted hover:bg-surface vdu:hover:text-ink"
          }`}
        >
          {k.label}
        </button>
      ))}
    </div>
  );
}

export default function LeadsGrafiek({
  punten,
  korrel,
  onKorrel,
  metriek,
  onMetriek,
  echteUitgaven,
}: {
  punten: ReeksPunt[];
  korrel: Korrel;
  onKorrel: (korrel: Korrel) => void;
  metriek: LeadsMetriek;
  onMetriek: (metriek: LeadsMetriek) => void;
  /** Echte uitgaven (geen filter, of alleen Betaald) of toegerekende kosten van de selectie. */
  echteUitgaven: boolean;
}) {
  const kleuren = useGrafiekKleuren();
  const [breedte, setBreedte] = useState(0);
  const data = useMemo<Punt[]>(
    () =>
      punten.map((p) => ({
        label: vakLabel(p, korrel),
        lang: vakLang(p, korrel),
        betaald: p.betaald,
        onbetaald: p.onbetaald,
        totaal: p.betaald + p.onbetaald,
        uitgaven: p.uitgaven,
        kpl: kostenPerLeadVan(p),
        volledig: p.volledig,
      })),
    [punten, korrel],
  );
  const heeftHalf = data.some((d) => !d.volledig);
  const LICHT = 0.45;
  const stijl = (vul: string): LabelStijl => ({ tekst: tekstOp(vul, [kleuren.label, kleuren.vlak]), halo: vul });
  const hoofdkleur = kleuren.categorieen[0];
  const betaaldStijl = { vol: stijl(hoofdkleur), licht: stijl(gemengd(hoofdkleur, kleuren.vlak, LICHT)) };
  const onbetaaldStijl = { vol: stijl(kleuren.context), licht: stijl(gemengd(kleuren.context, kleuren.vlak, LICHT)) };
  const vak = (index: number | undefined) => data[index ?? -1];
  const per = korrel;
  // Ruimte per vak op de x-as: bepaalt of het bedrag boven een punt op de lijn past.
  const ruimtePerVak = data.length > 0 ? Math.max(0, breedte - 60) / data.length : 0;

  const titel =
    metriek === "leads"
      ? `Leads per ${per}`
      : metriek === "uitgaven"
        ? `${echteUitgaven ? "Uitgaven" : "Toegerekende kosten"} per ${per}`
        : `Kosten per lead per ${per}`;
  const toelichting =
    metriek === "leads"
      ? "Betaald is verkeer met medium cpc of paid; alles wat daarbuiten valt (organisch, direct, verwijzingen, e-mail) is onbetaald. In de staaf staat het aantal per deel, erboven het totaal."
      : metriek === "uitgaven"
        ? !echteUitgaven
          ? "Met een filter: de kosten die aan de geselecteerde leads zijn toegerekend, op de dag van de lead. Campagnekosten zijn niet op merk of model te filteren."
          : "Wat Google Ads, Meta Ads en LinkedIn Ads op die dagen uitgaven, plus de handmatige kosten (Kostenverdeling) naar rato van de dagen. Opgeteld is dit het kerncijfer Uitgaven."
        : echteUitgaven
          ? "Alle uitgaven in het vak ÷ alle leads in het vak (betaald en onbetaald; met het filter Betaald alleen de betaalde) — dezelfde som als het kerncijfer. Geen punt: geen lead in dat vak."
          : "Met een filter: toegerekende kosten ÷ de geselecteerde leads in het vak. Geen punt: geen lead in dat vak.";

  const asOpmaak =
    metriek === "leads" ? (v: number) => formatteer(v, "aantal") : (v: number) => formatteer(v, "euro-heel", true);

  return (
    <section className="kaart-omlijst rounded-panel border border-line bg-card p-5 shadow-subtle">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-sans-w7 text-cell font-semibold text-ink">{titel}</h2>
          <p className="mt-0.5 text-meta text-ink-muted">
            {toelichting}
            {heeftHalf
              ? metriek === "kpl"
                ? " Een lichter bedrag is niet compleet: het vak valt maar voor een deel in de periode."
                : " Een lichtere staaf is niet compleet: hij valt maar voor een deel in de periode."
              : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Keuzeknoppen label="Welk cijfer in de grafiek" keuzes={METRIEKEN} gekozen={metriek} onKies={onMetriek} />
          <Keuzeknoppen label="Grafiek per dag, week of maand" keuzes={KORRELS} gekozen={korrel} onKies={onKorrel} />
        </div>
      </div>
      {metriek === "leads" && (
        <div className="mt-3 flex justify-end gap-4 text-meta text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: hoofdkleur }} />
            Betaald
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: kleuren.context }} />
            Onbetaald
          </span>
        </div>
      )}
      <div className={`${metriek === "leads" ? "mt-1" : "mt-3"} h-72 w-full`}>
        <ResponsiveContainer width="100%" height="100%" onResize={(w) => setBreedte(w)}>
          {/* Ruimte bovenin voor het getal boven de hoogste staaf. */}
          <ComposedChart data={data} margin={{ top: 24, right: 12, bottom: 4, left: 4 }}>
            <CartesianGrid stroke={kleuren.raster} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: AS_GROOTTE, fill: kleuren.as }}
              tickLine={false}
              axisLine={false}
              interval={Math.max(0, Math.ceil(data.length / 12) - 1)}
              // Een lijn begint anders precies op de rand en het bedrag erboven valt eraf.
              padding={metriek === "kpl" ? { left: 24, right: 24 } : undefined}
            />
            <YAxis
              tick={{ fontSize: AS_GROOTTE, fill: kleuren.as }}
              tickLine={false}
              axisLine={false}
              width={52}
              allowDecimals={metriek === "kpl"}
              tickFormatter={asOpmaak}
            />
            <Tooltip content={<VakTooltip echteUitgaven={echteUitgaven} />} cursor={{ fill: kleuren.raster }} />

            {metriek === "leads" && (
              <Bar dataKey="betaald" name="Betaald" stackId="leads" fill={hoofdkleur} isAnimationActive={false}>
                {data.map((d, i) => (
                  <Cell key={i} fillOpacity={d.volledig ? 1 : LICHT} />
                ))}
                <LabelList
                  dataKey="betaald"
                  content={(p) => {
                    const lp = p as LabelProps;
                    return (
                      <MiddenLabel {...lp} stijl={vak(lp.index)?.volledig === false ? betaaldStijl.licht : betaaldStijl.vol} />
                    );
                  }}
                />
                <LabelList
                  dataKey="totaal"
                  content={(p) => {
                    const lp = p as LabelProps;
                    if ((vak(lp.index)?.onbetaald ?? 0) > 0) return null;
                    return <TotaalLabel {...lp} kleur={kleuren.label} halo={kleuren.vlak} />;
                  }}
                />
              </Bar>
            )}
            {metriek === "leads" && (
              <Bar
                dataKey="onbetaald"
                name="Onbetaald"
                stackId="leads"
                fill={kleuren.context}
                radius={[kleuren.staafradius, kleuren.staafradius, 0, 0]}
                isAnimationActive={false}
              >
                {data.map((d, i) => (
                  <Cell key={i} fillOpacity={d.volledig ? 1 : LICHT} />
                ))}
                <LabelList
                  dataKey="onbetaald"
                  content={(p) => {
                    const lp = p as LabelProps;
                    return (
                      <MiddenLabel
                        {...lp}
                        stijl={vak(lp.index)?.volledig === false ? onbetaaldStijl.licht : onbetaaldStijl.vol}
                      />
                    );
                  }}
                />
                <LabelList
                  dataKey="totaal"
                  content={(p) => {
                    const lp = p as LabelProps;
                    // Op het bovenste deel: een deel van nul hoogte krijgt in Recharts geen label.
                    if ((vak(lp.index)?.onbetaald ?? 0) === 0) return null;
                    return <TotaalLabel {...lp} kleur={kleuren.label} halo={kleuren.vlak} />;
                  }}
                />
              </Bar>
            )}

            {metriek === "uitgaven" && (
              <Bar
                dataKey="uitgaven"
                name={echteUitgaven ? "Uitgaven" : "Toegerekende kosten"}
                fill={hoofdkleur}
                radius={[kleuren.staafradius, kleuren.staafradius, 0, 0]}
                isAnimationActive={false}
              >
                {data.map((d, i) => (
                  <Cell key={i} fillOpacity={d.volledig ? 1 : LICHT} />
                ))}
                <LabelList
                  dataKey="uitgaven"
                  content={(p) => (
                    <TotaalLabel
                      {...(p as LabelProps)}
                      kleur={kleuren.label}
                      halo={kleuren.vlak}
                      opmaak={euro}
                      kort={euroKort}
                    />
                  )}
                />
              </Bar>
            )}

            {metriek === "kpl" && (
              <Line
                dataKey="kpl"
                name="Kosten per lead"
                type={kleuren.lijnvorm}
                stroke={hoofdkleur}
                strokeWidth={kleuren.lijndikte}
                dot={{
                  r: 3,
                  fill: kleuren.punt === "open" ? kleuren.vlak : hoofdkleur,
                  stroke: hoofdkleur,
                  strokeWidth: kleuren.punt === "open" ? 1.5 : 0,
                }}
                activeDot={{ r: 4 }}
                connectNulls={false}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="kpl"
                  content={(p) => {
                    const lp = p as LabelProps;
                    const v = typeof lp.value === "number" ? lp.value : null;
                    if (v === null) return null;
                    const tekst = euroLabel(v);
                    if (tekst.length * TEKEN_BREEDTE > ruimtePerVak - 2) return null;
                    return (
                      <text
                        x={Number(lp.x)}
                        y={Number(lp.y) - 10}
                        fill={kleuren.label}
                        stroke={kleuren.vlak}
                        strokeWidth={3}
                        paintOrder="stroke"
                        fontSize={AS_GROOTTE}
                        fontWeight={700}
                        textAnchor="middle"
                        opacity={vak(lp.index)?.volledig === false ? 0.6 : 1}
                        pointerEvents="none"
                      >
                        {tekst}
                      </text>
                    );
                  }}
                />
              </Line>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
