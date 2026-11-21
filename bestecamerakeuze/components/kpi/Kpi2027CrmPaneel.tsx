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
          afwijkende rekenregel hoort bovenaan te staan, niet alleen onder één grafiek. Zolang
          de bewaarde reeks in KPI_JAAR begint ná 1 januari, zijn de maanden ervóór aangenomen. */}
      {data?.historie.vanaf && data.historie.vanaf.startsWith(`${KPI_JAAR}-`) && data.historie.vanaf > `${KPI_JAAR}-01-01` && (
        <p className="flex items-start gap-2 rounded-panel border border-line bg-card px-4 py-3 text-sm text-ink">
          <IconInfo className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
          <span>
            <strong className="font-semibold">
              De standen worden bewaard sinds {datumLang(data.historie.vanaf)} ({aantal(data.historie.dagen)}{" "}
              {data.historie.dagen === 1 ? "dag" : "dagen"}).
            </strong>{" "}
            Elke vrijdag om 12:00 en op 31 december wordt van elke KPI het aantal vastgelegd, en daarnaast op elke dag dat
            iemand deze pagina opent (alleen aantallen, geen persoonsgegevens). De maanden van{" "}
            {KPI_JAAR} vóór de eerste meting krijgen de eerste bewaarde stand (gestippeld). De stand eind {KPI_JAAR} is de
            laatste meting van {KPI_JAAR}; het target {KPI_DOELJAAR} is die stand plus {groeiTekst}.
          </span>
        </p>
      )}

      {/* Lukt bewaren of lezen niet, dan rekent het tabblad met alleen de stand van nu. Dat moet
          in beeld: zonder bewaarde standen is de basis eind 2026 in 2027 weg. */}
      {data && data.mailKolom && (data.historie.schrijfFout || data.historie.leesFout) && (
        <p className="rounded-panel border border-line bg-card px-4 py-3 text-sm text-negative">
          {data.historie.schrijfFout
            ? `De stand van vandaag kon niet worden bewaard (${data.historie.schrijfFout}). `
            : ""}
          {data.historie.leesFout
            ? `De bewaarde standen konden niet worden gelezen (${data.historie.leesFout}); de grafieken rekenen nu met alleen de stand van de export. `
            : ""}
          Zonder bewaarde standen is de stand eind {KPI_JAAR} in {KPI_DOELJAAR} niet meer te lezen.
        </p>
      )}

      {/* Welke kolom bij VDU en Service hoort, staat niet vast: zegt het bestand er niets over,
          dan staat dat hier in plaats van dat de kaart stilletjes ontbreekt. */}
      {data && data.mailKolom && data.ontbrekend.length > 0 && (
        <p className="flex items-start gap-2 rounded-panel border border-line bg-card px-4 py-3 text-sm text-ink">
          <IconInfo className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
          <span>
            <strong className="font-semibold">Geen kolom gevonden voor opt-in {data.ontbrekend.join(" en ")}.</strong> De
            pagina zoekt een True/False-kolom met de naam {data.ontbrekend.map((n) => `PREFERENCES_${n.toUpperCase()}`).join(" of ")}{" "}
            (zonder voorvoegsel mag ook). Heet de kolom anders, dan staat hij nu bij de merken; de naam is aan te vullen in{" "}
            <code>ALGEMENE_OPTINS</code> in <code>lib/kpi2027crm/definities.ts</code>.
          </span>
        </p>
      )}

      {data && data.mailKolom && !data.kentekenKolom && (
        <p className="flex items-start gap-2 rounded-panel border border-line bg-card px-4 py-3 text-sm text-ink">
          <IconInfo className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
          <span>
            <strong className="font-semibold">Geen kentekenkolom gevonden.</strong> Aantal auto&apos;s en Auto&apos;s met
            opt-in tellen de kolom VDUVEHICLES_LICENSE_PLATE (of een kolom met PLATE of KENTEKEN in de naam); die staat
            niet in de export, dus die twee KPI&apos;s ontbreken.
          </span>
        </p>
      )}

      {/* Standaard ingeklapt, net als op de andere KPI-tabbladen. De definitie per KPI staat
          onder zijn eigen grafiek (KpiCrmKaart); hier alleen wat voor alle KPI's geldt. */}
      <Definitie zonderLijn>
        <span>
          Alle KPI&apos;s komen uit de Selligent-export en tellen <strong className="font-semibold text-ink">unieke
          waarden, geen rijen</strong>: een rij is een contact mét een voertuig.{" "}
          <strong className="font-semibold text-ink">Contacten</strong> en de opt-ins tellen unieke e-mailadressen (kolom{" "}
          {data?.mailKolom ?? "MAIL"}); <strong className="font-semibold text-ink">Aantal auto&apos;s</strong> en{" "}
          <strong className="font-semibold text-ink">Auto&apos;s met opt-in</strong> tellen unieke kentekens (kolom{" "}
          {data?.kentekenKolom ?? "VDUVEHICLES_LICENSE_PLATE"}). &quot;Met opt-in&quot; betekent: het contact heeft op
          minstens één rij minstens één opt-in op True (VDU, Service of een merk). Elke True/False-kolom in de export is
          een opt-in en krijgt een eigen KPI. Het zijn standen, geen optelsommen: de basis is de stand eind {KPI_JAAR} (de
          laatste meting van {KPI_JAAR}; elke vrijdag om 12:00, op 31 december en bij elk bezoek aan deze pagina wordt van
          elke KPI het aantal bewaard, en de maanden vóór de eerste
          meting krijgen de eerste bewaarde stand, gestippeld), het target de stand die er eind{" "}
          {KPI_DOELJAAR} moet zijn: +{groeiTekst} voor elke KPI, niet aan te passen.{" "}
          <strong className="font-semibold text-ink">Realisatie {KPI_DOELJAAR}</strong> is de stand van de laatste export in{" "}
          {KPI_DOELJAAR}. Selligent zet elke ochtend een nieuwe export neer; deze pagina leest steeds de laatste. Onder
          elke grafiek staat per KPI precies wat er geteld wordt.
        </span>
      </Definitie>

      {data && data.groepen.length > 0 && (
        <>
          <CrmOverzichtTabel groepen={data.groepen} peildatumDoeljaar={peildatumDoeljaar} />
          {data.groepen.map((groep) => (
            <section key={groep.sleutel} className="flex flex-col gap-3">
              <h2 className="label-theme text-label text-ink-faint">{groep.naam}</h2>
              {/* De bovenste kaarten (Contacten, Contacten met opt-in, Aantal auto's, Auto's met opt-in,
                  VDU, Service) staan twee per rij: drie of meer naast elkaar laat de tegels per kaart
                  over hun rand lopen. De
                  merk-opt-ins volgen het raster van de andere KPI-tabbladen. */}
              <div
                className={`grid gap-6 ${groep.sleutel === "algemeen" ? "grid-cols-2" : "grid-cols-2 min-[1800px]:grid-cols-3"}`}
              >
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
