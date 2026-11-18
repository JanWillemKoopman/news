"use client";

import { useEffect, useState } from "react";
import Inlogprompt from "@/components/Inlogprompt";
import KpiSyntecKaart from "@/components/kpi/KpiSyntecKaart";
import { IconInfo } from "@/components/icons";
import { KPI_DOELJAAR, KPI_GROEI, KPI_JAAR } from "@/lib/kpi2027/definities";
import { isDefinitief } from "@/lib/kpi2027/rekenen";
import type { Kpi2027SyntecAntwoord } from "@/lib/kpi2027syntec/rekenen";

/**
 * KPI's 2027 Syntec: per websitebron uit Syntec het target voor 2027 — de verwachting voor
 * heel 2026 plus 5% — met de realisatie van 2026 in een jaargrafiek ernaast.
 *
 * Visueel en rekenkundig precies hetzelfde als KPI's 2027 (dezelfde kaart, grafiek en
 * peildatum); alleen de bron verschilt. Hier staan de KPI's in de drie groepen waarin het
 * team de doelen voor 2026 vastlegde, elk met een totaal, en onderaan het totaal over alles.
 *
 * Welke Syntec-leads bij welke KPI horen staat in `lib/kpi2027syntec/definities.ts`.
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

export default function Kpi2027SyntecPaneel({ ingelogd }: { ingelogd: boolean }) {
  const [data, setData] = useState<Kpi2027SyntecAntwoord | null>(null);
  const [bezig, setBezig] = useState(true);
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    if (!ingelogd) return;
    fetch("/api/kpi-2027-syntec")
      .then(async (res) => {
        const antwoord = (await res.json()) as Kpi2027SyntecAntwoord;
        if (!res.ok) throw new Error(antwoord.fout ?? `Ophalen mislukt (${res.status}).`);
        setData(antwoord);
      })
      .catch((err: unknown) => setFout(err instanceof Error ? err.message : String(err)))
      .finally(() => setBezig(false));
  }, [ingelogd]);

  if (!ingelogd) return <Inlogprompt tekst="Log in om de KPI's en targets te bekijken." />;

  const groeiTekst = `${Math.round(KPI_GROEI * 100)}%`;
  const overzicht = data?.overzicht ?? null;
  const peildatum = data?.peildatum ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div className="kaart-omlijst flex items-center justify-between gap-6 rounded-panel border border-line bg-card px-5 py-3.5 shadow-card">
        <div>
          {peildatum ? (
            <>
              <p className="font-sans-w7 text-sm font-semibold text-ink">
                {isDefinitief(peildatum)
                  ? `${KPI_JAAR} is volledig gemeten — dit is de definitieve basis voor ${KPI_DOELJAAR}`
                  : `Stand t/m ${datumLang(peildatum)}`}
              </p>
              <p className="mt-0.5 text-meta text-ink-muted">
                {data?.ingelezenOp
                  ? `Leads ingelezen uit Syntec ${momentTekst(data.ingelezenOp)}`
                  : "Nog niet bekend wanneer de leads zijn ingelezen"}
                {data?.volgendeUpdate ? ` · volgende update ${datumLang(data.volgendeUpdate)}` : ""}
              </p>
            </>
          ) : (
            <p className="text-sm text-ink-muted">{bezig ? "Laden…" : "Er valt nog niets te rekenen."}</p>
          )}
        </div>
      </div>

      {fout && <p className="rounded-panel border border-line bg-card px-4 py-3 text-sm text-negative">{fout}</p>}

      <p className="flex items-start gap-2 text-meta text-ink-muted">
        <IconInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          <strong className="font-semibold text-ink">{KPI_JAAR} incl. verwachting</strong> = de leads die Syntec
          t/m de peildatum telde, plus het gemiddelde per dag × de resterende dagen van {KPI_JAAR}.{" "}
          <strong className="font-semibold text-ink">Target {KPI_DOELJAAR}</strong> = die verwachting +{groeiTekst}; het
          maandtarget is het jaartarget ÷ 12. <strong className="font-semibold text-ink">Realisatie {KPI_DOELJAAR}</strong>{" "}
          telt vanaf 1 januari {KPI_DOELJAAR} mee. Alles schuift elke zondag op t/m zaterdag. In de grafiek is de
          doorgetrokken lijn gemeten en de gestippelde lijn verwachting.
        </span>
      </p>

      {overzicht && (
        <>
          {overzicht.groepen.map((groep) => (
            <section key={groep.sleutel} className="flex flex-col gap-3">
              <h2 className="label-theme text-label text-ink-faint">{groep.naam}</h2>
              <div className="grid grid-cols-2 gap-6 min-[1800px]:grid-cols-3">
                {groep.kpis.map((kpi) => (
                  <KpiSyntecKaart key={kpi.sleutel} kpi={kpi} />
                ))}
                <KpiSyntecKaart kpi={groep.totaal} />
              </div>
            </section>
          ))}
          <section className="flex flex-col gap-3">
            <h2 className="label-theme text-label text-ink-faint">Totaal</h2>
            <div className="grid grid-cols-2 gap-6 min-[1800px]:grid-cols-3">
              <KpiSyntecKaart kpi={overzicht.totaal} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
