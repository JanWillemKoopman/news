"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useGrafiekKleuren } from "@/components/ThemeProvider";
import { AS_GROOTTE } from "@/components/chat/chartTheme";
import type { MaandPunt } from "@/lib/selligent/stand";

/**
 * Een maandreeks als lijn — contacten op creatiedatum, auto's op afleverdatum.
 *
 * Eén component voor allebei, met dezelfde vorm en dezelfde knoppen: de twee grafieken
 * staan onder elkaar op dezelfde pagina, en twee verschillende vormen voor twee reeksen
 * van hetzelfde soort zou suggereren dat er iets anders staat dan er staat.
 *
 * ## Waarom een lijn en geen staven
 *
 * Het gaat over verloop door de tijd en de reeks is lang: de export loopt van 1986 tot nu,
 * dus ruim 480 maanden. Staven worden dan haarlijnen van minder dan twee pixels waar je
 * geen hoogte meer van kunt lezen, en de grafiek zou vooral een grijs blok zijn. Eén
 * reeks, dus geen legenda — de kop zegt al wat er staat.
 *
 * De as begint op nul, want dit is een hoeveelheid en niet een niveau: de hoogte van de
 * lijn hoort "hoeveel" te betekenen.
 *
 * ## De korrel is maand en niets anders
 *
 * Er is om een maandgrafiek gevraagd en er zit daarom geen dag/week/kwartaal-schakelaar
 * in. Groeperen gebeurt op de server (`maandPerCode` in `lib/selligent/tabel.ts`), uit
 * dezelfde doorloop die de contacten telt — zo kan de som van de grafiek niet afwijken
 * van de metric erboven.
 *
 * ## Twee knoppen die er wél zijn
 *
 * - **Vanaf 2015.** Van de 169.000 rijen zijn er maar een paar duizend van vóór 2015, dus
 *   op de volle reeks is driekwart van de breedte een vlakke lijn langs de nul en zit alle
 *   beweging in de laatste centimeters. De grafiek opent daarom op de laatste tien jaar.
 * - **Logaritmisch.** Eén maand (een migratie) kan tienduizenden accounts bevatten, en
 *   dan drukt die ene piek de rest van het decennium plat. Dit is geen standaard, want een
 *   logaritmische as leest niemand per ongeluk goed; hij staat er voor het moment dat je
 *   wil zien of de rest van de reeks eigenlijk wel beweegt.
 *
 * ## En een regel die zegt wat je níét ziet
 *
 * Een ingekorte weergave verzwijgt per definitie iets, en bij deze data kan dat heel veel
 * zijn: 46.074 van de 108.470 auto's hebben 1 januari 1900 als afleverdatum — een
 * plaatshouder, geen aflevering. Zonder die regel staat er een grafiek over een kleine
 * helft van de auto's die eruitziet alsof hij over alle auto's gaat. De regel onder de
 * grafiek telt daarom op wat er buiten het getoonde bereik valt, en de knop ernaast haalt
 * het in beeld.
 */

/** Vanaf welk jaar de ingekorte weergave begint. */
const KORT_VANAF = new Date().getUTCFullYear() - 10;

function maandLabel(maand: string): string {
  const [jaar, nr] = maand.split("-");
  return `${["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"][Number(nr) - 1]} ${jaar}`;
}

export default function SelligentGrafiek({
  titel,
  toelichting,
  reeksnaam,
  eenheid,
  maanden,
  kolom,
  zonderDatum,
  kleurIndex = 0,
  bezig,
}: {
  titel: string;
  toelichting: string;
  /** Hoe de reeks in de tooltip heet. */
  reeksnaam: string;
  /** Het woord voor één en meer, voor de zin onder de grafiek: ["contact", "contacten"]. */
  eenheid: [string, string];
  maanden: MaandPunt[];
  /** Op welke datumkolom gegroepeerd is — staat in de kop, zodat het cijfer navraagbaar is. */
  kolom: string | null;
  /** Hoeveel er in de selectie geen leesbare datum hebben; die staan in geen enkele maand. */
  zonderDatum: number;
  /** Welke categoriekleur uit het theme; de twee grafieken krijgen er elk een eigen. */
  kleurIndex?: number;
  bezig: boolean;
}) {
  const kleuren = useGrafiekKleuren();
  const [alles, setAlles] = useState(false);
  const [logaritmisch, setLogaritmisch] = useState(false);

  const data = useMemo(() => {
    const reeks = alles ? maanden : maanden.filter((m) => Number(m.maand.slice(0, 4)) >= KORT_VANAF);
    return reeks.map((m) => ({
      maand: m.maand,
      label: maandLabel(m.maand),
      // Een logaritmische as kan niet bij nul beginnen; recharts tekent zo'n punt dan
      // helemaal niet en trekt de lijn eroverheen. `null` laat het gat zichtbaar.
      aantal: logaritmisch && m.aantal === 0 ? null : m.aantal,
    }));
  }, [maanden, alles, logaritmisch]);

  const eersteJaar = maanden.length > 0 ? Number(maanden[0].maand.slice(0, 4)) : null;
  const heeftOudere = eersteJaar !== null && eersteJaar < KORT_VANAF;

  // Hoeveel er buiten de ingekorte weergave vallen. Bij de afleverdatum is dat de helft
  // van alle auto's, dus dit is geen voetnoot maar de hoofdzaak.
  const buitenBereik = useMemo(
    () =>
      alles
        ? 0
        : maanden
            .filter((m) => Number(m.maand.slice(0, 4)) < KORT_VANAF)
            .reduce((som, m) => som + m.aantal, 0),
    [maanden, alles],
  );

  return (
    <section className="kaart-omlijst kaart-accent rounded-panel border border-line bg-card p-5 shadow-card">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-sans-w7 text-cell font-semibold text-ink">{titel}</h2>
          <p className="mt-0.5 max-w-prose text-meta text-ink-muted">
            {toelichting}
            {kolom && <> Gegroepeerd op <code>{kolom}</code>.</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {heeftOudere && (
            <div className="flex rounded-control border border-line p-0.5">
              {[
                { aan: false, label: `Vanaf ${KORT_VANAF}` },
                { aan: true, label: `Vanaf ${eersteJaar}` },
              ].map((keuze) => (
                <button
                  key={String(keuze.aan)}
                  type="button"
                  onClick={() => setAlles(keuze.aan)}
                  className={`rounded-control px-2.5 py-1 text-sm transition-colors duration-[var(--duur-snel)] ease-merk ${
                    keuze.aan === alles
                      ? "bg-primary text-on-primary"
                      : "text-ink-muted hover:bg-surface"
                  }`}
                >
                  {keuze.label}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setLogaritmisch((v) => !v)}
            aria-pressed={logaritmisch}
            title="Een logaritmische as laat de kleine maanden zien naast een migratiepiek"
            className={`rounded-control border px-2.5 py-1 text-sm transition-colors duration-[var(--duur-snel)] ease-merk ${
              logaritmisch
                ? "border-primary bg-primary-light text-primary"
                : "border-line text-ink-muted hover:bg-surface"
            }`}
          >
            Log-as
          </button>
        </div>
      </header>

      <div className={`mt-4 h-72 w-full transition-opacity ${bezig ? "opacity-60" : ""}`}>
        {data.length === 0 ? (
          <p className="flex h-full items-center justify-center text-sm text-ink-muted">
            Niets met een leesbare datum binnen deze filters.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
              <CartesianGrid stroke={kleuren.raster} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: AS_GROOTTE, fill: kleuren.as }}
                tickLine={false}
                axisLine={{ stroke: kleuren.raster }}
                minTickGap={40}
              />
              <YAxis
                tick={{ fontSize: AS_GROOTTE, fill: kleuren.as }}
                tickLine={false}
                axisLine={false}
                width={64}
                scale={logaritmisch ? "log" : "auto"}
                domain={logaritmisch ? [1, "auto"] : [0, "auto"]}
                allowDataOverflow={false}
                tickFormatter={(v: number) => v.toLocaleString("nl-NL")}
              />
              <Tooltip
                formatter={(v) => [
                  typeof v === "number" ? v.toLocaleString("nl-NL") : "—",
                  reeksnaam,
                ]}
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid var(--color-line)",
                  background: "var(--color-card)",
                  color: "var(--color-ink)",
                  fontSize: 13,
                }}
              />
              <Line
                type={kleuren.lijnvorm}
                dataKey="aantal"
                name={reeksnaam}
                stroke={kleuren.categorieen[kleurIndex % kleuren.categorieen.length]}
                strokeWidth={kleuren.lijndikte}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: kleuren.vlak }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {buitenBereik > 0 && (
        <p className="mt-3 text-meta text-ink-faint">
          {buitenBereik.toLocaleString("nl-NL")} {buitenBereik === 1 ? eenheid[0] : eenheid[1]}{" "}
          {buitenBereik === 1 ? "valt" : "vallen"} vóór {KORT_VANAF} en {buitenBereik === 1 ? "staat" : "staan"}{" "}
          dus niet in beeld. Zet de weergave op &ldquo;vanaf {eersteJaar}&rdquo; om{" "}
          {buitenBereik === 1 ? "hem" : "ze"} erbij te zien.
        </p>
      )}

      {zonderDatum > 0 && (
        <p className="mt-3 text-meta text-ink-faint">
          {zonderDatum.toLocaleString("nl-NL")} {zonderDatum === 1 ? eenheid[0] : eenheid[1]} in
          deze selectie {zonderDatum === 1 ? "heeft" : "hebben"} geen leesbare datum en{" "}
          {zonderDatum === 1 ? "staat" : "staan"} dus in geen enkele maand. De metric erboven
          telt {zonderDatum === 1 ? "hem" : "ze"} wel mee.
        </p>
      )}
    </section>
  );
}
