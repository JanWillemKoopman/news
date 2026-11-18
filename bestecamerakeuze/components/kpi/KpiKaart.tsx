"use client";

import KpiJaarGrafiek from "@/components/kpi/KpiJaarGrafiek";
import { formatteer } from "@/components/chat/chartTheme";
import { KPI_DOELJAAR, KPI_JAAR } from "@/lib/kpi2027/definities";
import type { KpiOverzichtRegel, WebsiteOverzicht } from "@/lib/kpi2027/rekenen";

/**
 * Eén KPI: bovenaan de vier getallen waar het overleg om draait (2026 inclusief
 * verwachting, het target voor 2027, de groei in procenten en de realisatie van 2027),
 * daaronder de jaargrafiek en in kleine letters welke GA4-cijfers erin zitten.
 *
 * De bron staat onder elke grafiek en niet één keer onderaan de pagina: een target is pas
 * bruikbaar als iedereen weet wat er precies geteld wordt, en de events verschillen per
 * KPI, per website en per periode — zie `lib/kpi2027/definities.ts`.
 */

function datumKort(datum: string): string {
  return new Date(`${datum}T00:00:00Z`).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function aantal(waarde: number): string {
  return formatteer(Math.round(waarde), "aantal");
}

function perDagTekst(waarde: number): string {
  const decimalen = waarde < 10 ? 1 : 0;
  return waarde.toLocaleString("nl-NL", { minimumFractionDigits: decimalen, maximumFractionDigits: decimalen });
}

export default function KpiKaart({ kpi, website }: { kpi: KpiOverzichtRegel; website: WebsiteOverzicht }) {
  const u = kpi.uitkomst;

  return (
    <section className="kaart-omlijst flex flex-col rounded-panel border border-line bg-card px-5 py-4 shadow-subtle">
      <header className="flex items-baseline justify-between gap-4">
        <h2 className="font-sans-w7 text-cell font-semibold text-ink">{kpi.naam}</h2>
        {u && (
          <p className="text-right text-meta text-ink-muted">
            gemiddeld {perDagTekst(u.perDag)} per dag
            {u.dagenNietGemeten > 0 ? ` (over ${u.dagenGemeten} gemeten dagen)` : ""}
          </p>
        )}
      </header>

      {u ? (
        <>
          <div className="mt-3 grid grid-cols-4 gap-2.5">
            <Statistiek
              label={u.definitief ? `${KPI_JAAR}` : `${KPI_JAAR} incl. verwachting`}
              waarde={aantal(u.verwacht)}
              toelichting={
                u.definitief && u.dagenBijgeschat === 0
                  ? "volledig gemeten"
                  : `${aantal(u.gerealiseerd)} gemeten${u.definitief ? "" : ` t/m ${datumKort(u.peildatum)}`} · ${aantal(u.bijgeschat)} ${u.dagenNietGemeten > 0 ? "bijgeschat" : "verwacht"}`
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
              toelichting={`${u.target - u.verwacht >= 0 ? "+" : "−"}${aantal(Math.abs(u.target - u.verwacht))} t.o.v. ${KPI_JAAR}`}
            />
            <Statistiek
              label={`Realisatie ${KPI_DOELJAAR}`}
              waarde={aantal(kpi.realisatie.waarde)}
              toelichting={
                kpi.realisatie.peildatum
                  ? `t/m ${datumKort(kpi.realisatie.peildatum)} · ${u.target > 0 ? formatteer((kpi.realisatie.waarde / u.target) * 100, "procent") : "—"} van het target`
                  : `${KPI_DOELJAAR} is nog niet begonnen`
              }
            />
          </div>

          <div className="mt-4 h-56">
            <KpiJaarGrafiek maanden={u.maanden} targetPerMaand={u.targetPerMaand} peildatumTekst={datumKort(u.peildatum)} />
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-ink-muted">Nog geen stand voor deze website.</p>
      )}

      <footer className="mt-3 border-t border-line-soft pt-2.5 text-meta text-ink-faint">
        <p>
          <span className="text-ink-muted">Bron:</span> Google Analytics 4, {website.domein} (property {website.property}
          {website.uitgeslotenHosts.length > 0 ? `, zonder ${website.uitgeslotenHosts.join(" en ")}` : ""}).{" "}
          {kpi.events.length > 0 ? (
            <>
              Events (aantal keer gevuurd, event_count, {KPI_JAAR}
              {u ? ` t/m ${datumKort(u.peildatum)}` : ""}):{" "}
              {kpi.events.map((e, i) => (
                <span key={`${e.naam}${e.paginaBevat ?? ""}`}>
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
      </footer>
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
