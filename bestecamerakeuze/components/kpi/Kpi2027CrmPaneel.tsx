"use client";

import { useCallback, useEffect, useState } from "react";
import Inlogprompt from "@/components/Inlogprompt";
import CrmOverzichtTabel from "@/components/kpi/CrmOverzichtTabel";
import KpiCrmKaart from "@/components/kpi/KpiCrmKaart";
import { Definitie } from "@/components/kpi/KpiKaart";
import { IconInfo, IconRefresh } from "@/components/icons";
import { KPI_DOELJAAR, KPI_JAAR } from "@/lib/kpi2027/definities";
import { CRM_GROEI } from "@/lib/kpi2027crm/definities";
import type { Kpi2027CrmAntwoord } from "@/lib/kpi2027crm/rekenen";

/**
 * KPI's 2027 CRM: contacten en opt-ins uit de Selligent-export, in unieke e-mailadressen, met
 * het target voor 2027 (+10%). Precies dezelfde opzet als de andere KPI-tabbladen: statusbalk,
 * definitie, overzichtstabel en per groep de kaarten met grafiek (`KpiKaartOpmaak`, als stand).
 *
 * De cijfers komen rechtstreeks uit het bestand op Azure (`/api/kpi-2027-crm`); er wordt
 * niets opgeslagen. Wat er geteld wordt staat in `lib/kpi2027crm/definities.ts`.
 */

function datumLang(datum: string): string {
  return new Date(`${datum}T00:00:00Z`).toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function momentTekst(iso: string): string {
  return new Date(iso).toLocaleString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });
}

function aantal(n: number): string {
  return n.toLocaleString("nl-NL");
}

export default function Kpi2027CrmPaneel({ ingelogd }: { ingelogd: boolean }) {
  const [data, setData] = useState<Kpi2027CrmAntwoord | null>(null);
  const [bezig, setBezig] = useState(true);
  const [verversen, setVerversen] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const verwerk = useCallback(async (res: Response) => {
    const antwoord = (await res.json()) as Kpi2027CrmAntwoord;
    if (!res.ok) throw new Error(antwoord.fout ?? `Ophalen mislukt (${res.status}).`);
    setData(antwoord);
    setFout(antwoord.fout ?? null);
  }, []);

  useEffect(() => {
    if (!ingelogd) return;
    fetch("/api/kpi-2027-crm")
      .then(verwerk)
      .catch((err: unknown) => setFout(err instanceof Error ? err.message : String(err)))
      .finally(() => setBezig(false));
  }, [ingelogd, verwerk]);

  async function haalOpnieuw() {
    if (verversen) return;
    setVerversen(true);
    try {
      await verwerk(await fetch("/api/kpi-2027-crm?vers=1"));
    } catch (err) {
      setFout(err instanceof Error ? err.message : String(err));
    } finally {
      setVerversen(false);
    }
  }

  if (!ingelogd) return <Inlogprompt tekst="Log in om de KPI's en targets te bekijken." />;

  const groeiTekst = `${Math.round(CRM_GROEI * 100)}%`;
  const standDatum = data?.standDatum ?? null;
  const peildatumDoeljaar = standDatum?.startsWith(`${KPI_DOELJAAR}-`) ? standDatum : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="kaart-omlijst flex items-center justify-between gap-6 rounded-panel border border-line bg-card px-5 py-3.5 shadow-card">
        <div>
          {standDatum ? (
            <>
              <p className="font-sans-w7 text-sm font-semibold text-ink">
                Selligent · stand op {datumLang(standDatum)}
              </p>
              <p className="mt-0.5 text-meta text-ink-muted">
                {data?.gewijzigdOp ? `Export neergezet ${momentTekst(data.gewijzigdOp)}` : "Onbekend wanneer de export is neergezet"}
                {data ? ` · ${aantal(data.rijen)} rijen` : ""}
                {data && data.rijenZonderMail > 0 ? `, waarvan ${aantal(data.rijenZonderMail)} zonder e-mailadres` : ""}
                {" · elke ochtend een nieuwe export"}
              </p>
            </>
          ) : (
            <p className="text-sm text-ink-muted">
              {bezig ? "Laden… (de eerste keer ± 10 seconden: de export wordt opgehaald)" : "Er valt nog niets te rekenen."}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={haalOpnieuw}
          disabled={verversen || bezig}
          title="Haalt de Selligent-export opnieuw op bij Azure, ook als hij niet is veranderd."
          className="flex shrink-0 items-center gap-1.5 rounded-control border border-line bg-card px-3 py-1.5 text-sm font-medium text-ink shadow-card transition-colors duration-[var(--duur-snel)] ease-merk hover:bg-surface disabled:cursor-wait disabled:opacity-70"
        >
          <IconRefresh className={`h-3.5 w-3.5 ${verversen ? "animate-spin" : ""}`} />
          {verversen ? "Bezig…" : "Opnieuw ophalen"}
        </button>
      </div>

      {fout && <p className="rounded-panel border border-line bg-card px-4 py-3 text-sm text-negative">{fout}</p>}

      {/* Dezelfde vorm als de melding bij Instagram-volgers op KPI's social media: een
          afwijkende rekenregel hoort bovenaan te staan, niet alleen onder één grafiek. */}
      {standDatum && !peildatumDoeljaar && (
        <p className="flex items-start gap-2 rounded-panel border border-line bg-card px-4 py-3 text-sm text-ink">
          <IconInfo className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
          <span>
            <strong className="font-semibold">Alleen de huidige stand is bekend.</strong> Er wordt geen historie bewaard:
            januari t/m de maand vóór de export krijgen dezelfde stand als de export (gestippeld), en de stand eind{" "}
            {KPI_JAAR} is de laatste stand. Het target {KPI_DOELJAAR} is die stand plus {groeiTekst}.
          </span>
        </p>
      )}

      <Definitie zonderLijn>
        <span>
          Alles telt <strong className="font-semibold text-ink">unieke e-mailadressen</strong> uit de Selligent-export
          (kolom {data?.mailKolom ?? "MAIL"}). <strong className="font-semibold text-ink">Contacten</strong> is het aantal
          verschillende e-mailadressen; <strong className="font-semibold text-ink">Opt-in &lt;merk&gt;</strong> het aantal
          verschillende e-mailadressen met minstens één rij waarop die opt-inkolom True is — elke booleaanse kolom in de
          export krijgt een eigen KPI. Het zijn standen, geen optelsommen: de basis is de stand eind {KPI_JAAR} (de laatste
          export), het target de stand die er eind {KPI_DOELJAAR} moet zijn: +{groeiTekst} voor elke KPI.{" "}
          <strong className="font-semibold text-ink">Realisatie {KPI_DOELJAAR}</strong> is de stand van de laatste export in{" "}
          {KPI_DOELJAAR}. Elke ochtend zet Selligent een nieuwe export neer; deze pagina leest steeds de laatste.
        </span>
      </Definitie>

      {data && data.groepen.length > 0 && (
        <>
          <CrmOverzichtTabel groepen={data.groepen} peildatumDoeljaar={peildatumDoeljaar} />
          {data.groepen.map((groep) => (
            <section key={groep.sleutel} className="flex flex-col gap-3">
              <h2 className="label-theme text-label text-ink-faint">{groep.naam}</h2>
              <div className="grid grid-cols-2 gap-6 min-[1800px]:grid-cols-3">
                {groep.kpis.map((kpi) => (
                  <KpiCrmKaart key={kpi.sleutel} kpi={kpi} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
