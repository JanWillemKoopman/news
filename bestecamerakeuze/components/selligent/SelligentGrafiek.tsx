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
 * Contacten per maand waarin hun account is aangemaakt.
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
 */

/** Vanaf welk jaar de ingekorte weergave begint. */
const KORT_VANAF = new Date().getUTCFullYear() - 10;

function maandLabel(maand: string): string {
  const [jaar, nr] = maand.split("-");
  return `${["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"][Number(nr) - 1]} ${jaar}`;
}

export default function SelligentGrafiek({
  maanden,
  kolom,
  zonderDatum,
  bezig,
}: {
  maanden: MaandPunt[];
  /** Welke kolom de creatiedatum is — staat in de kop, zodat het cijfer navraagbaar is. */
  kolom: string | null;
  /** Contacten in de selectie zonder leesbare creatiedatum; die staan in geen enkele maand. */
  zonderDatum: number;
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
      contacten: logaritmisch && m.contacten === 0 ? null : m.contacten,
    }));
  }, [maanden, alles, logaritmisch]);

  const eersteJaar = maanden.length > 0 ? Number(maanden[0].maand.slice(0, 4)) : null;
  const heeftOudere = eersteJaar !== null && eersteJaar < KORT_VANAF;

  return (
    <section className="kaart-omlijst kaart-accent rounded-panel border border-line bg-card p-5 shadow-card">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-sans-w7 text-cell font-semibold text-ink">Contacten per maand</h2>
          <p className="mt-0.5 max-w-prose text-meta text-ink-muted">
            De maand waarin het account is aangemaakt
            {kolom && <> (<code>{kolom}</code>)</>}, binnen de gekozen filters. Een contact
            met meerdere voertuigen staat één keer in zijn eigen maand.
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
            Geen contacten met een creatiedatum binnen deze filters.
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
                  "Contacten",
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
                dataKey="contacten"
                name="Contacten"
                stroke={kleuren.categorieen[0]}
                strokeWidth={kleuren.lijndikte}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: kleuren.vlak }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {zonderDatum > 0 && (
        <p className="mt-3 text-meta text-ink-faint">
          {zonderDatum.toLocaleString("nl-NL")} contact
          {zonderDatum === 1 ? "" : "en"} in deze selectie {zonderDatum === 1 ? "heeft" : "hebben"}{" "}
          geen leesbare creatiedatum en {zonderDatum === 1 ? "staat" : "staan"} dus in geen
          enkele maand. De metric erboven telt {zonderDatum === 1 ? "hem" : "ze"} wel mee.
        </p>
      )}
    </section>
  );
}
