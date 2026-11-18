"use client";

import type { ReactNode } from "react";
import KpiJaarGrafiek from "@/components/kpi/KpiJaarGrafiek";
import { formatteer } from "@/components/chat/chartTheme";
import { KPI_DOELJAAR, KPI_JAAR, KPI_PROPERTY } from "@/lib/kpi2027/definities";
import type { KpiOverzichtRegel, KpiUitkomst } from "@/lib/kpi2027/rekenen";

/**
 * Eén KPI: bovenaan de drie getallen waar het overleg om draait (2026 inclusief
 * verwachting, het target voor 2027 en de groei in procenten), daaronder de jaargrafiek en
 * in kleine letters welke GA4-cijfers erin zitten.
 *
 * De bron staat onder elke grafiek en niet één keer onderaan de pagina: een target is pas
 * bruikbaar als iedereen weet wat er precies geteld wordt, en de events verschillen per
 * KPI (en per periode — zie `lib/kpi2027/definities.ts`).
 */

export function datumKort(datum: string): string {
  return new Date(`${datum}T00:00:00Z`).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function aantal(waarde: number): string {
  return formatteer(Math.round(waarde), "aantal");
}

function perDagTekst(waarde: number): string {
  const decimalen = waarde < 10 ? 1 : 0;
  return waarde.toLocaleString("nl-NL", { minimumFractionDigits: decimalen, maximumFractionDigits: decimalen });
}

export default function KpiKaart({ kpi }: { kpi: KpiOverzichtRegel }) {
  const peildatum = datumKort(kpi.uitkomst.peildatum);
  return (
    <KpiKaartOpmaak naam={kpi.naam} uitkomst={kpi.uitkomst}>
      <p>
        <span className="text-ink-muted">Bron:</span> Google Analytics 4, udenhout.nl (property {KPI_PROPERTY}).{" "}
        {kpi.events.length > 0 ? (
          <>
            Events (aantal keer gevuurd, event_count, {KPI_JAAR} t/m {peildatum}):{" "}
            {kpi.events.map((e, i) => (
              <span key={e.naam}>
                {i > 0 && " + "}
                <code className="font-mono text-ink-muted">{e.naam}</code>
                {` (${e.toelichting ? `${e.toelichting}, ` : ""}${aantal(e.aantal)}×)`}
              </span>
            ))}
            .
          </>
        ) : (
          kpi.bronTekst
        )}
      </p>
      {kpi.opmerking && <p className="mt-1">{kpi.opmerking}</p>}
    </KpiKaartOpmaak>
  );
}

/**
 * De kaart zelf — kop, de drie kaartjes en de jaargrafiek — met de bronregel als
 * `children`. Ook gebruikt door KPI's 2027 Syntec (`KpiSyntecKaart.tsx`), zodat beide
 * tabbladen er precies hetzelfde uitzien en alleen de bron eronder verschilt.
 */
export function KpiKaartOpmaak({
  naam,
  uitkomst: u,
  children,
}: {
  naam: string;
  uitkomst: KpiUitkomst;
  children: ReactNode;
}) {
  const peildatum = datumKort(u.peildatum);
  const groeiAantal = u.target - u.verwacht;
  const basisNietJanuari = u.basisVanaf !== `${KPI_JAAR}-01-01`;

  return (
    <section className="kaart-omlijst flex flex-col rounded-panel border border-line bg-card px-5 py-4 shadow-subtle">
      <header className="flex items-baseline justify-between gap-4">
        <h2 className="font-sans-w7 text-cell font-semibold text-ink">{naam}</h2>
        <p className="text-meta text-ink-muted">
          gemiddeld {perDagTekst(u.perDag)} per dag
          {basisNietJanuari ? ` (vanaf ${datumKort(u.basisVanaf)})` : ""}
        </p>
      </header>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <Statistiek
          label={u.definitief ? `${KPI_JAAR}` : `${KPI_JAAR} incl. verwachting`}
          waarde={aantal(u.verwacht)}
          toelichting={
            u.definitief
              ? "volledig gemeten"
              : `${aantal(u.gerealiseerd)} gemeten t/m ${peildatum} · ${aantal(u.bijgeschat)} verwacht`
          }
        />
        <Statistiek
          label={`Target ${KPI_DOELJAAR}`}
          waarde={aantal(u.target)}
          toelichting={`${aantal(u.targetPerMaand)} per maand`}
          nadruk
        />
        <Statistiek
          label="Groei"
          waarde={`${u.groei >= 0 ? "+" : "−"}${formatteer(Math.abs(u.groei) * 100, "procent")}`}
          toelichting={`${groeiAantal >= 0 ? "+" : "−"}${aantal(Math.abs(groeiAantal))} t.o.v. ${KPI_JAAR}`}
        />
      </div>

      <div className="mt-4 h-56">
        <KpiJaarGrafiek maanden={u.maanden} targetPerMaand={u.targetPerMaand} peildatumTekst={peildatum} />
      </div>

      <footer className="mt-3 border-t border-line-soft pt-2.5 text-meta text-ink-faint">{children}</footer>
    </section>
  );
}

function Statistiek({
  label,
  waarde,
  toelichting,
  nadruk = false,
}: {
  label: string;
  waarde: string;
  toelichting: string;
  nadruk?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-card border px-3 py-2.5 ${
        nadruk ? "border-primary bg-primary-light" : "border-line bg-surface-tint"
      }`}
    >
      <span className="label-theme text-label text-ink-faint">{label}</span>
      <span className="font-sans-w7 text-cell font-bold text-ink">{waarde}</span>
      <span className="text-meta text-ink-muted">{toelichting}</span>
    </div>
  );
}
