"use client";

import { useEffect, useState } from "react";
import Inlogprompt from "@/components/Inlogprompt";
import EerdereJarenSchakelaar, { useEerdereJaren } from "@/components/kpi/EerdereJaren";
import KpiSyntecKaart from "@/components/kpi/KpiSyntecKaart";
import { Definitie } from "@/components/kpi/KpiKaart";
import SyntecOverzichtTabel from "@/components/kpi/SyntecOverzichtTabel";
import { IconInfo } from "@/components/icons";
import { KPI_DOELJAAR, KPI_GROEI, KPI_JAAR } from "@/lib/kpi2027/definities";
import { SYNTEC_KPIS } from "@/lib/kpi2027syntec/definities";
import { isDefinitief } from "@/lib/kpi2027/rekenen";
import { pasSyntecGroeiToe, type Kpi2027SyntecAntwoord } from "@/lib/kpi2027syntec/rekenen";
import { slaGroeiOp } from "@/components/kpi/groeiOpslaan";

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

/** De KPI's met een latere rekenbasis (`meetVanaf`), voor de melding bovenaan. */
const VANAF_APRIL = SYNTEC_KPIS.filter((k) => k.meetVanaf).map((k) => k.naam.replace(/^Udenhout\.nl /, ""));
const VANAF_APRIL_TEKST = VANAF_APRIL.join(" en ").replace(/^./, (c) => c.toUpperCase());

/** Langer dan twee dagen niet ingelezen: dan is de nachtelijke kopie minstens één keer mislukt. */
function verouderd(ingelezenOp: string | null): boolean {
  if (!ingelezenOp) return true;
  return Date.now() - Date.parse(ingelezenOp) > 2 * 86_400_000;
}

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
  const [eerdereJaren] = useEerdereJaren();
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

  /** Bewaart het percentage van één KPI; de kaart en de totalen waar hij in zit rekenen mee. */
  async function zetGroei(sleutel: string, groei: number | null) {
    await slaGroeiOp({ tabblad: "kpi-2027-syntec", website: "", kpi: sleutel, groei });
    setData((oud) => oud?.overzicht ? { ...oud, overzicht: pasSyntecGroeiToe(oud.overzicht, sleutel, groei) } : oud);
  }

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
        <EerdereJarenSchakelaar />
      </div>

      {fout && <p className="rounded-panel border border-line bg-card px-4 py-3 text-sm text-negative">{fout}</p>}

      {/* De nachtelijke kopie van de sheet liep wekenlang stil vast zonder dat iemand het
          zag: het tabblad toonde gewoon nullen. Wie naar targets kijkt, moet weten dat de
          cijfers achterlopen. */}
      {data && !bezig && verouderd(data.ingelezenOp) && (
        <p className="rounded-panel border border-line bg-card px-4 py-3 text-sm text-negative">
          Let op: de leads uit Syntec zijn{" "}
          {data.ingelezenOp ? `voor het laatst ingelezen ${momentTekst(data.ingelezenOp)}` : "nog nooit ingelezen"}. De
          nachtelijke kopie van het tabblad Data leads loopt achter, dus deze cijfers zijn niet actueel.
        </p>
      )}

      {/* Dezelfde vorm als de uitvalmelding op KPI's 2027: een afwijkende rekenbasis hoort
          bovenaan te staan, niet alleen in de kleine letters onder één grafiek. */}
      {VANAF_APRIL.length > 0 && (
        <p className="flex items-start gap-2 rounded-panel border border-line bg-card px-4 py-3 text-sm text-ink">
          <IconInfo className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
          <span>
            <strong className="font-semibold">{VANAF_APRIL_TEKST} rekenen vanaf 1 april {KPI_JAAR}.</strong> Het
            formulier van de nieuwe website levert sinds april veel meer aanvragen op dan het oude. Daarom telt bij deze
            KPI&apos;s alleen april en later mee in het gemiddelde per dag, en zijn januari t/m maart met dat gemiddelde
            bijgeschat (gestippeld in de grafiek). Zo gaat het target {KPI_DOELJAAR} uit van het niveau van de nieuwe
            website. De totalen waar ze in zitten tellen hun kaarten op.
          </span>
        </p>
      )}

      {/* Standaard ingeklapt, net als de definitie onder de grafieken (verzoek november 2026). */}
      <Definitie zonderLijn>
        <span>
          <strong className="font-semibold text-ink">{KPI_JAAR} incl. verwachting</strong> = de leads die Syntec
          t/m de peildatum telde, plus het gemiddelde per dag × de resterende dagen van {KPI_JAAR}.{" "}
          <strong className="font-semibold text-ink">Target {KPI_DOELJAAR}</strong> = die verwachting plus de groei
          (het vastgestelde percentage per KPI, anders +{groeiTekst}; klik op het percentage bij Groei om het aan te passen — dat geldt voor
          iedereen). Een totaal is de som van zijn kaarten, ook het target; zijn percentage volgt daaruit. Het
          maandtarget is het jaartarget ÷ 12. <strong className="font-semibold text-ink">Realisatie {KPI_DOELJAAR}</strong>{" "}
          telt vanaf 1 januari {KPI_DOELJAAR} mee. Alles schuift elke zondag op t/m zaterdag. In de grafiek is de
          doorgetrokken lijn gemeten en de gestippelde lijn verwachting. Met de schakelaar Eerdere jaren rechtsboven staan ook 2024 en 2025 erin, als dunne lijnen met dezelfde definitie, zoals gemeten.
        </span>
      </Definitie>

      {overzicht && (
        <>
          <SyntecOverzichtTabel overzicht={overzicht} opslaanGroei={zetGroei} />
          {overzicht.groepen.map((groep) => (
            <section key={groep.sleutel} className="flex flex-col gap-3">
              <h2 className="label-theme text-label text-ink-faint">{groep.naam}</h2>
              <div className="grid grid-cols-2 gap-6 min-[1800px]:grid-cols-3">
                {groep.kpis.map((kpi) => (
                  <KpiSyntecKaart toonEerdereJaren={eerdereJaren} key={kpi.sleutel} kpi={kpi} opslaanGroei={(groei) => zetGroei(kpi.sleutel, groei)} />
                ))}
                {groep.combinaties.map((kpi) => (
                  <KpiSyntecKaart toonEerdereJaren={eerdereJaren} key={kpi.sleutel} kpi={kpi} />
                ))}
                <KpiSyntecKaart toonEerdereJaren={eerdereJaren} kpi={groep.totaal} />
              </div>
            </section>
          ))}
          <section className="flex flex-col gap-3">
            <h2 className="label-theme text-label text-ink-faint">Totaal</h2>
            <div className="grid grid-cols-2 gap-6 min-[1800px]:grid-cols-3">
              <KpiSyntecKaart toonEerdereJaren={eerdereJaren} kpi={overzicht.totaal} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
