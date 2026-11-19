"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useGrafiekKleuren } from "@/components/ThemeProvider";
import { AS_GROOTTE, formatteer } from "@/components/chat/chartTheme";
import { KANALEN, type KpiKanalen } from "@/lib/kpi2027/kanalen";

/**
 * De kanaalverdeling van één KPI (knopje "Kanalen" op KPI's 2027 GA): per maand vanaf
 * januari 2025 een staaf die optelt tot 100%, gestapeld per kanaal. Geen targets — de
 * vraag is hoe de verhouding tussen kanalen verschuift, niet of het genoeg is.
 *
 * ## Kleur
 *
 * Acht kanalen, acht kleuren in een vaste volgorde: de kleur hoort bij het kanaal, dus
 * Google Ads is in elke grafiek en in elk theme hetzelfde blauw. De eerste zeven komen
 * uit een gevalideerd palet (lichtheid, verzadiging en onderscheid bij kleurenblindheid
 * doorgerekend voor licht én donker, met de stapelvolgorde als buurparen); de achtste,
 * "Verwijzingen & overig", is bewust grijs — hij is de restgroep en hoort niet om
 * aandacht te vragen. Bewust niet de themakleuren: die reeks heeft er zes, en een kanaal
 * dat per theme van kleur wisselt, is in het overleg niet aan te wijzen.
 *
 * Tussen de segmenten zit een smalle rand in de vlakkleur, zodat buren ook zonder
 * kleurverschil te scheiden zijn. Elk getal staat in de tooltip (aandeel én aantal).
 *
 * De lopende maand staat lichter: hij loopt t/m de peildatum en kan nog verschuiven.
 */

const LICHT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#a3a29b"];
const DONKER = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#0ca30c", "#9085e9", "#76756f"];

const MAANDEN_KORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const MAANDEN_LANG = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

/** Is de vlakkleur donker? Dan de donkere reeks (zelfde tinten, opgestapt voor zwart). */
function isDonker(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length !== 6) return false;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.4;
}

/** Is dit de laatste dag van zijn maand? Dan is die maand volledig. */
function isLaatsteDag(datum: string): boolean {
  const volgende = new Date(Date.parse(`${datum}T00:00:00Z`) + 86_400_000);
  return volgende.getUTCDate() === 1;
}

export function kanaalKleuren(vlak: string): string[] {
  return isDonker(vlak) ? DONKER : LICHT;
}

interface Punt {
  /** "2025-02": uniek, ook al heet februari twee keer feb. */
  maand: string;
  maandNaam: string;
  totaal: number;
  kpiTotaal: number | null;
  lopend: boolean;
  [kanaal: string]: number | string | boolean | null;
}

export default function KanaalGrafiek({
  kanalen,
  peildatum,
  peildatumTekst,
  eenheid,
}: {
  kanalen: KpiKanalen;
  /** "2026-11-14": de lopende maand is die van deze dag. */
  peildatum: string;
  /** "14 nov", voor de tooltip van de lopende maand. */
  peildatumTekst: string;
  /** Wat er geteld wordt, voor de tooltip: "sessies", "aanvragen". */
  eenheid: string;
}) {
  const kleuren = useGrafiekKleuren();
  const palet = kanaalKleuren(kleuren.vlak);
  const lopendeMaand = peildatum.slice(0, 7);
  const punten: Punt[] = kanalen.maanden.map((m) => {
    const maand = Number(m.maand.slice(5, 7)) - 1;
    const p: Punt = {
      maand: m.maand,
      maandNaam: `${MAANDEN_LANG[maand]} ${m.maand.slice(0, 4)}`,
      totaal: m.totaal,
      kpiTotaal: m.kpiTotaal,
      lopend: m.maand === lopendeMaand && !isLaatsteDag(peildatum),
    };
    KANALEN.forEach((k, i) => (p[k.sleutel] = m.perKanaal[i] ?? 0));
    return p;
  });

  return (
    <div className="flex h-full flex-col">
      <ul className="mb-1.5 flex flex-wrap justify-end gap-x-3 gap-y-0.5 text-meta text-ink-muted">
        {KANALEN.map((k, i) => (
          <li key={k.sleutel} className="flex items-center gap-1.5" title={k.uitleg}>
            <span aria-hidden="true" className="inline-block h-2 w-2 rounded-[2px]" style={{ background: palet[i] }} />
            {k.naam}
          </li>
        ))}
      </ul>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={punten} stackOffset="expand" barCategoryGap="16%" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={kleuren.raster} vertical={false} />
            <XAxis
              dataKey="maand"
              tick={<MaandTick kleur={kleuren.as} />}
              tickLine={false}
              axisLine={{ stroke: kleuren.raster }}
              interval={0}
              height={34}
            />
            <YAxis
              tick={{ fontSize: AS_GROOTTE, fill: kleuren.as }}
              tickLine={false}
              axisLine={false}
              width={52}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
            />
            <Tooltip
              content={<KanaalTooltip palet={palet} peildatumTekst={peildatumTekst} eenheid={eenheid} />}
              cursor={{ fill: kleuren.raster, fillOpacity: 0.5 }}
            />
            {KANALEN.map((k, i) => (
              <Bar
                key={k.sleutel}
                dataKey={k.sleutel}
                name={k.naam}
                stackId="kanalen"
                fill={palet[i]}
                stroke={kleuren.vlak}
                strokeWidth={1}
                isAnimationActive={false}
              >
                {punten.map((p) => (
                  <Cell key={p.maand} fillOpacity={p.lopend ? 0.55 : 1} />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * De maand onder de staaf, en onder januari het jaar op een tweede regel: zo staat de
 * jaarwisseling in beeld zonder dat "jan '26" tegen zijn buren aan botst.
 */
function MaandTick({ x, y, payload, kleur }: { x?: number; y?: number; payload?: { value: string }; kleur: string }) {
  const waarde = payload?.value ?? "";
  const maand = Number(waarde.slice(5, 7)) - 1;
  return (
    <text x={x} y={y} textAnchor="middle" fill={kleur} fontSize={AS_GROOTTE}>
      <tspan x={x} dy="0.9em">
        {MAANDEN_KORT[maand] ?? ""}
      </tspan>
      {maand === 0 && (
        <tspan x={x} dy="1.2em" fontWeight={600}>
          {waarde.slice(0, 4)}
        </tspan>
      )}
    </text>
  );
}

/** Per maand elk kanaal met zijn aandeel en aantal, van boven naar beneden zoals de stapel. */
function KanaalTooltip({
  active,
  payload,
  palet,
  peildatumTekst,
  eenheid,
}: {
  active?: boolean;
  payload?: { payload: Punt }[];
  palet: string[];
  peildatumTekst: string;
  eenheid: string;
}) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  const titel = p.maandNaam.charAt(0).toUpperCase() + p.maandNaam.slice(1);
  const regels = KANALEN.map((k, i) => ({ k, i, n: Number(p[k.sleutel]) || 0 }))
    .filter((r) => r.n > 0)
    .reverse();

  return (
    <div className="rounded-card border border-line bg-card px-3 py-2 text-xs shadow-card">
      <p className="text-ink-muted">
        {titel}
        {p.lopend ? ` · t/m ${peildatumTekst}` : ""}
      </p>
      {p.totaal === 0 ? (
        <p className="mt-1 text-ink">Geen {eenheid} in deze maand.</p>
      ) : (
        <>
          <table className="mt-1">
            <tbody>
              {regels.map(({ k, i, n }) => (
                <tr key={k.sleutel} className="text-ink">
                  <td className="pr-2">
                    <span aria-hidden="true" className="inline-block h-2 w-2 rounded-[2px]" style={{ background: palet[i] }} />
                  </td>
                  <td className="pr-3">{k.naam}</td>
                  <td className="pr-3 text-right font-sans-w7 font-semibold">{formatteer((n / p.totaal) * 100, "procent")}</td>
                  <td className="text-right text-ink-muted">{formatteer(n, "aantal")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 border-t border-line-soft pt-1 text-ink-muted">
            Totaal {formatteer(p.totaal, "aantal")} {eenheid}
            {p.kpiTotaal !== null && p.kpiTotaal > 0 && (
              <>
                {" · "}
                {Math.abs(p.totaal / p.kpiTotaal - 1) < 0.01
                  ? "gelijk aan de KPI-grafiek"
                  : `KPI-grafiek: ${formatteer(p.kpiTotaal, "aantal")}`}
              </>
            )}
          </p>
        </>
      )}
    </div>
  );
}
