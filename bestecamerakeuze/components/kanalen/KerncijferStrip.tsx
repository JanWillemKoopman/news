"use client";

import { useMemo } from "react";
import { useGrafiekKleuren } from "@/components/ThemeProvider";
import Verschilregel from "@/components/kanalen/Verschilregel";
import { formatteer } from "@/components/chat/chartTheme";
import { eenheidVan } from "@/lib/kanalen/eenheid";
import {
  bruikbareKorrels,
  groepeerPerPeriode,
  standaardKorrel,
  telOp,
  waardeVan,
  type Kubus,
} from "@/lib/kanalen/kubus";
import { verschilVan } from "@/lib/kanalen/vergelijk";
import type { Statistiek } from "@/lib/windsor/velden";

/**
 * De rij kerncijfers boven de grafiek.
 *
 * **Waarom dit er is.** De grafiek toont bewust één statistiek tegelijk — twee assen in
 * één beeld suggereren een verband dat er niet is. Maar dat betekende ook dat je voor
 * elk volgend cijfer eerst een uitklapmenu moest omzetten, en dus dat niemand ze alle
 * zes bekeek. Deze strip zet ze naast elkaar: waarde, verloop, en het verschil met de
 * vorige periode. Eén klik zet de grafiek eronder op dat cijfer, dus het menu blijft
 * bestaan maar is niet meer de enige weg.
 *
 * Elke tegel is een **stat tile met sparkline**: het getal is de hoofdzaak, het lijntje
 * eronder zegt alleen "loopt dit op of af" en heeft daarom geen assen, geen raster en
 * geen labels. Wie de precieze waarden wil, klikt de tegel aan en leest de grote grafiek.
 */

const MAX_TEGELS = 6;
const SPARK_BREEDTE = 100;
const SPARK_HOOGTE = 26;

type Props = {
  kubus: Kubus;
  rijen: number[][];
  vorige: { kubus: Kubus; rijen: number[][] } | null;
  statistieken: Statistiek[];
  gekozen: string;
  onKies: (id: string) => void;
  vergelijk: boolean;
};

export default function KerncijferStrip({
  kubus,
  rijen,
  vorige,
  statistieken,
  gekozen,
  onKies,
  vergelijk,
}: Props) {
  const kleuren = useGrafiekKleuren();

  const tegels = useMemo(
    () => statistieken.filter((s) => s.standaard).slice(0, MAX_TEGELS),
    [statistieken],
  );

  // Eén keer per periode groeperen voor álle tegels samen; per statistiek is het daarna
  // alleen nog een deling. Andersom (per tegel opnieuw groeperen) is zes keer hetzelfde
  // werk over dezelfde paar duizend rijen.
  const perPeriode = useMemo(() => {
    const korrel = standaardKorrel(kubus, bruikbareKorrels(kubus));
    return groepeerPerPeriode(kubus, rijen, korrel);
  }, [kubus, rijen]);

  const totalen = useMemo(() => telOp(kubus, rijen), [kubus, rijen]);
  const vorigeTotalen = useMemo(
    () => (vorige ? telOp(vorige.kubus, vorige.rijen) : null),
    [vorige],
  );

  if (tegels.length === 0) return null;

  return (
    <section
      aria-label="Kerncijfers"
      className="grid gap-px overflow-hidden rounded-panel border border-line bg-line"
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(180px, 1fr))` }}
    >
      {tegels.map((statistiek) => {
        const actief = statistiek.id === gekozen;
        const verschil = verschilVan(
          statistiek,
          waardeVan(statistiek, totalen),
          vorigeTotalen ? waardeVan(statistiek, vorigeTotalen) : null,
        );
        const reeks = perPeriode.map((g) => waardeVan(statistiek, g.totalen));

        return (
          <button
            key={statistiek.id}
            type="button"
            onClick={() => onKies(statistiek.id)}
            aria-pressed={actief}
            title={statistiek.uitleg}
            className={`flex flex-col gap-1 px-4 py-3 text-left transition-colors duration-[var(--duur-snel)] ease-merk ${
              actief ? "bg-primary-light" : "bg-card hover:bg-surface"
            }`}
          >
            <span className={`label-theme text-label ${actief ? "text-primary" : "text-ink-faint"}`}>
              {statistiek.label}
            </span>
            <span className="font-sans-w7 text-cell font-semibold text-ink">
              {formatteer(waardeVan(statistiek, totalen), eenheidVan(statistiek))}
            </span>
            <span className="flex min-h-[26px] items-end justify-between gap-2">
              {vergelijk ? (
                <Verschilregel verschil={verschil} compact />
              ) : (
                <span className="text-meta text-ink-faint">
                  {statistiek.nietOptelbaar ? "opgeteld per dag" : "in deze selectie"}
                </span>
              )}
              <Sparkline
                waarden={reeks}
                kleur={actief ? kleuren.categorieen[0] : kleuren.context}
              />
            </span>
          </button>
        );
      })}
    </section>
  );
}

/**
 * Het verloop als kaal lijntje: geen assen, geen raster, geen getallen.
 *
 * Met een geaccentueerd eindpunt, want dat is het punt waar je nu staat. Ontbrekende
 * waarden (een afgeleide zonder noemer) breken de lijn niet maar worden overgeslagen —
 * op deze schaal is een gat in de lijn ruis, geen informatie.
 */
function Sparkline({ waarden, kleur }: { waarden: (number | null)[]; kleur: string }) {
  const punten = waarden
    .map((w, i) => ({ w, i }))
    .filter((p): p is { w: number; i: number } => p.w !== null && Number.isFinite(p.w));

  if (punten.length < 2) return <span className="block h-[26px] w-[100px]" aria-hidden="true" />;

  const laagste = Math.min(...punten.map((p) => p.w));
  const hoogste = Math.max(...punten.map((p) => p.w));
  const bereik = hoogste - laagste || 1;
  const laatsteIndex = waarden.length - 1;

  const xy = (p: { w: number; i: number }) => {
    const x = laatsteIndex === 0 ? 0 : (p.i / laatsteIndex) * SPARK_BREEDTE;
    // 2px marge boven en onder, zodat de lijn de rand van de viewBox niet raakt.
    const y = SPARK_HOOGTE - 2 - ((p.w - laagste) / bereik) * (SPARK_HOOGTE - 4);
    return [x, y] as const;
  };

  const pad = punten.map((p) => xy(p).join(",")).join(" ");
  const [eindX, eindY] = xy(punten[punten.length - 1]);

  return (
    <svg
      width={SPARK_BREEDTE}
      height={SPARK_HOOGTE}
      viewBox={`0 0 ${SPARK_BREEDTE} ${SPARK_HOOGTE}`}
      className="shrink-0 overflow-visible"
      aria-hidden="true"
    >
      <polyline points={pad} fill="none" stroke={kleur} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={eindX} cy={eindY} r="2.25" fill={kleur} />
    </svg>
  );
}
