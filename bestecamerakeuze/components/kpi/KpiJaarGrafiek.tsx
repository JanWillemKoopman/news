"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useGrafiekKleuren } from "@/components/ThemeProvider";
import { AS_GROOTTE, formatteer } from "@/components/chat/chartTheme";
import type { GrafiekKleuren } from "@/lib/themes";
import type { MaandSoort, MaandUitkomst } from "@/lib/kpi2027/rekenen";

/**
 * De jaargrafiek van één KPI: twee lijnen, zoals gevraagd — 2026 en het maandtarget 2027.
 *
 * De 2026-lijn is één kleur in twee stukken: doorgetrokken waar GA4 de maand volledig mat,
 * gestippeld waar het (deels) verwachting is. Zo leest de lopende maand niet als een
 * instorting — november bevat t/m de peildatum maar de helft van zijn dagen — en is in één
 * oogopslag te zien hoeveel van het jaartotaal nog een schatting is. Maanden waarin (een
 * deel van) de dagen niet gemeten is, staan ook gestippeld: die zijn bijgeschat — zakelijke
 * lease van udenhout.nl in januari t/m maart, de Porsche-sites in juli.
 *
 * Het target is een vlakke lijn: het jaartarget gedeeld door twaalf, elke maand gelijk.
 *
 * De as begint op nul. Het zijn optelbare aantallen, en een as die bij 90.000 begint maakt
 * van een maand met 5% minder sessies een ravijn.
 */

const MAANDEN_KORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const MAANDEN_LANG = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
];

interface Punt {
  label: string;
  maandNaam: string;
  soort: MaandSoort;
  /** De doorgetrokken lijn: alleen volledig gemeten maanden. */
  gemeten: number | null;
  /** De gestippelde lijn: (deels) verwachting, plus de aansluitende gemeten maand. */
  verwachting: number | null;
  target: number;
  gerealiseerd: number | null;
  verwacht: number;
  dagenGemeten: number;
  dagenInMaand: number;
  toelichting: string | null;
}

/**
 * Afronden voor de grafiek: hele getallen, maar onder de tien op één decimaal. Bij een KPI
 * met een paar aanvragen per maand (Bentley, PGZ) zou 1,25 anders 1 worden en vallen de
 * 2026-lijn en het target samen terwijl ze verschillen.
 */
function rond(waarde: number): number {
  return Math.abs(waarde) < 10 ? Math.round(waarde * 10) / 10 : Math.round(waarde);
}

export function bouwPunten(maanden: MaandUitkomst[], targetPerMaand: number): Punt[] {
  const gemeten = (m: MaandUitkomst | undefined) => m?.soort === "gerealiseerd";
  return maanden.map((m, i) => {
    const waarde = rond(m.verwacht);
    // Een gemeten maand naast een geschatte krijgt óók een punt op de gestippelde lijn,
    // anders hangen de twee stukken los van elkaar in de lucht.
    const vorigeGeschat = i > 0 && !gemeten(maanden[i - 1]);
    const volgendeGeschat = i < maanden.length - 1 && !gemeten(maanden[i + 1]);
    const raaktSchatting = vorigeGeschat || volgendeGeschat;
    return {
      label: MAANDEN_KORT[i],
      maandNaam: MAANDEN_LANG[i],
      soort: m.soort,
      gemeten: gemeten(m) ? waarde : null,
      verwachting: !gemeten(m) || raaktSchatting ? waarde : null,
      target: rond(targetPerMaand),
      gerealiseerd: m.gerealiseerd === null ? null : rond(m.gerealiseerd),
      verwacht: waarde,
      dagenGemeten: m.dagenGemeten,
      dagenInMaand: m.dagenInMaand,
      toelichting: m.toelichting ?? null,
    };
  });
}

/** Het punt op de lijn in de vorm van het merk: gevuld, open (Bentley) of vierkant. */
function puntVorm(kleuren: GrafiekKleuren, kleur: string, open: boolean) {
  function Vorm(props: { cx?: number; cy?: number; index?: number; value?: unknown; payload?: Punt }) {
    if (props.cx === undefined || props.cy === undefined || props.value === null || props.value === undefined) {
      return <g key={props.index} />;
    }
    // Een gemeten maand die aan een geschatte grenst, staat op beide lijnen. Het open
    // bolletje van de stippellijn zou dan het gevulde bedekken; die maand is gemeten.
    if (open && props.payload?.soort === "gerealiseerd") return <g key={props.index} />;
    const hol = open || kleuren.punt === "open";
    if (kleuren.punt === "vierkant") {
      return (
        <rect
          key={props.index}
          x={props.cx - 3.5}
          y={props.cy - 3.5}
          width={7}
          height={7}
          fill={hol ? kleuren.vlak : kleur}
          stroke={hol ? kleur : kleuren.vlak}
          strokeWidth={hol ? 1.5 : 2}
        />
      );
    }
    return (
      <circle
        key={props.index}
        cx={props.cx}
        cy={props.cy}
        r={3.5}
        fill={hol ? kleuren.vlak : kleur}
        stroke={hol ? kleur : kleuren.vlak}
        strokeWidth={hol ? 1.5 : 2}
      />
    );
  }
  return Vorm;
}

export default function KpiJaarGrafiek({
  maanden,
  targetPerMaand,
  peildatumTekst,
}: {
  maanden: MaandUitkomst[];
  targetPerMaand: number;
  /** "14 nov", voor de tooltip van de lopende maand. */
  peildatumTekst: string;
}) {
  const kleuren = useGrafiekKleuren();
  const punten = bouwPunten(maanden, targetPerMaand);
  const kleur2026 = kleuren.categorieen[0];
  const kleurTarget = kleuren.categorieen[1];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={punten} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={kleuren.raster} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: AS_GROOTTE, fill: kleuren.as }}
          tickLine={false}
          axisLine={{ stroke: kleuren.raster }}
          interval={0}
        />
        <YAxis
          tick={{ fontSize: AS_GROOTTE, fill: kleuren.as }}
          tickLine={false}
          axisLine={false}
          width={52}
          domain={[0, "auto"]}
          tickFormatter={(v: number) => formatteer(v, "aantal", true)}
        />
        <Tooltip
          content={<MaandTooltip peildatumTekst={peildatumTekst} kleur2026={kleur2026} kleurTarget={kleurTarget} />}
          cursor={{ stroke: kleuren.raster, strokeWidth: 1 }}
        />
        <Legend
          verticalAlign="top"
          align="right"
          iconType="plainline"
          iconSize={16}
          wrapperStyle={{ fontSize: AS_GROOTTE, paddingBottom: 6 }}
          // De tekst in de askleur; het lijntje ervoor draagt de reeks. Zonder dit kleurt
          // Recharts de tekst in de lijnkleur, en oranje tekst op wit leest slecht.
          formatter={(waarde) => <span style={{ color: kleuren.as }}>{waarde}</span>}
        />
        <Line
          dataKey="gemeten"
          name="2026"
          type={kleuren.lijnvorm}
          stroke={kleur2026}
          strokeWidth={kleuren.lijndikte}
          dot={puntVorm(kleuren, kleur2026, false)}
          activeDot={{ r: 5, strokeWidth: 2, stroke: kleuren.vlak }}
          connectNulls={false}
          isAnimationActive={false}
        />
        <Line
          dataKey="verwachting"
          name="2026 verwachting"
          type={kleuren.lijnvorm}
          stroke={kleur2026}
          strokeWidth={kleuren.lijndikte}
          strokeDasharray="5 4"
          dot={puntVorm(kleuren, kleur2026, true)}
          activeDot={{ r: 5, strokeWidth: 2, stroke: kleuren.vlak }}
          connectNulls={false}
          isAnimationActive={false}
        />
        <Line
          dataKey="target"
          name="Maandtarget 2027"
          type="linear"
          stroke={kleurTarget}
          strokeWidth={kleuren.lijndikte}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: kleuren.vlak }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/**
 * Per maand wat er staat en wat het is: gemeten, deels gemeten, verwachting of
 * bijgeschat — en het maandtarget ernaast, met het verschil. Tekst in inktkleur; het
 * gekleurde streepje ervoor draagt de reeks.
 */
function MaandTooltip({
  active,
  payload,
  peildatumTekst,
  kleur2026,
  kleurTarget,
}: {
  active?: boolean;
  payload?: { payload: Punt }[];
  peildatumTekst: string;
  kleur2026: string;
  kleurTarget: string;
}) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  const verschil = p.target - p.verwacht;

  let regel2026: string;
  let toelichting: string | null = null;
  switch (p.soort) {
    case "gerealiseerd":
      regel2026 = `2026: ${formatteer(p.verwacht, "aantal")}`;
      break;
    case "deels":
      regel2026 = `2026 verwacht: ${formatteer(p.verwacht, "aantal")}`;
      toelichting = `waarvan ${formatteer(p.gerealiseerd, "aantal")} gemeten t/m ${peildatumTekst} (${p.dagenGemeten} van ${p.dagenInMaand} dagen)`;
      break;
    case "verwachting":
      regel2026 = `2026 verwacht: ${formatteer(p.verwacht, "aantal")}`;
      toelichting = "gemiddelde per dag × dagen in de maand";
      break;
    case "bijgeschat":
      regel2026 = `2026 bijgeschat: ${formatteer(p.verwacht, "aantal")}`;
      toelichting =
        p.dagenGemeten > 0
          ? `waarvan ${formatteer(p.gerealiseerd, "aantal")} gemeten (${p.dagenGemeten} van ${p.dagenInMaand} dagen); de rest met het gemiddelde per dag`
          : "niet gemeten; ingevuld met het gemiddelde per dag";
      break;
  }
  if (p.toelichting) toelichting = p.toelichting;

  return (
    <div className="rounded-card border border-line bg-card px-3 py-2 text-xs shadow-card">
      <p className="text-ink-muted">{p.maandNaam.charAt(0).toUpperCase() + p.maandNaam.slice(1)}</p>
      <p className="mt-1 flex items-center gap-2 text-ink">
        <span aria-hidden="true" className="inline-block h-0.5 w-3" style={{ background: kleur2026 }} />
        <span className="font-sans-w7 font-semibold">{regel2026}</span>
      </p>
      {toelichting && <p className="pl-5 text-ink-muted">{toelichting}</p>}
      <p className="mt-1 flex items-center gap-2 text-ink">
        <span aria-hidden="true" className="inline-block h-0.5 w-3" style={{ background: kleurTarget }} />
        <span>
          Maandtarget 2027: <span className="font-sans-w7 font-semibold">{formatteer(p.target, "aantal")}</span>
        </span>
      </p>
      <p className="pl-5 text-ink-muted">
        {verschil >= 0 ? "+" : "−"}
        {formatteer(Math.abs(verschil), "aantal")} t.o.v. deze maand in 2026
      </p>
    </div>
  );
}
