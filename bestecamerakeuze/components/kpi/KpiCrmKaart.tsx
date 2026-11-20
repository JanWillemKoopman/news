"use client";

import { KpiKaartOpmaak, aantal, datumKort } from "@/components/kpi/KpiKaart";
import { KPI_DOELJAAR, KPI_JAAR } from "@/lib/kpi2027/definities";
import { CRM_GROEI, optinNaam } from "@/lib/kpi2027crm/definities";
import type { CrmKpiRegel } from "@/lib/kpi2027crm/rekenen";

/**
 * Eén CRM-KPI: dezelfde kaart als op KPI's 2027 GA, Syntec en social media (`KpiKaartOpmaak`,
 * als stand — net als volgers), met eronder, ingeklapt achter "Lees definitie", dezelfde
 * opbouw als op Syntec en social media:
 *
 *  1. **Grafiek**: wat de lijnen zijn (de bewaarde metingen, aangenomen maanden, doel eind 2027);
 *  2. **Bron**: het bestand en de kolommen die deze KPI leest;
 *  3. **Wat telt mee**: de telling in gewone taal, met het aantal — bij "met opt-in" ook welke
 *     opt-inkolommen meetellen;
 *  4. **Keuzes in de definitie**: de besluiten (`keuzesVoor` in `lib/kpi2027crm/definities.ts`).
 *
 * Verander je een telling in `lib/kpi2027crm/rekenen.ts`, pas dan in dezelfde wijziging deze
 * tekst en `keuzesVoor` aan.
 */

const MAANDNAMEN = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
];

/** "2026-11-20" → "20 november 2026". */
function datumLang(datum: string): string {
  return `${Number(datum.slice(8, 10))} ${MAANDNAMEN[Number(datum.slice(5, 7)) - 1]} ${datum.slice(0, 4)}`;
}

function telt(kpi: CrmKpiRegel): "e-mailadressen" | "kentekens" {
  return kpi.soort === "autos" || kpi.soort === "autos-optin" ? "kentekens" : "e-mailadressen";
}

/** De kolommen die deze KPI leest, voor de regel Bron. */
function kolommenVan(kpi: CrmKpiRegel): string {
  const optins = `de ${kpi.optinKolommen.length} opt-inkolommen (zie hieronder)`;
  switch (kpi.soort) {
    case "contacten":
      return kpi.mailKolom;
    case "met-optin":
      return `${kpi.mailKolom} en ${optins}`;
    case "autos":
      return kpi.kolom;
    case "autos-optin":
      return `${kpi.kolom}, ${kpi.mailKolom} en ${optins}`;
    case "optin":
      return `${kpi.mailKolom} en ${kpi.kolom}`;
  }
}

function watTeltMee(kpi: CrmKpiRegel): string {
  switch (kpi.soort) {
    case "contacten":
      return `Het aantal verschillende e-mailadressen in de kolom ${kpi.mailKolom}. Precies het getal van de tegel E-mailadressen op Tools → Selligent database.`;
    case "met-optin":
      return "Het aantal verschillende e-mailadressen met minstens één rij waarop minstens één van deze opt-inkolommen True is:";
    case "autos":
      return `Het aantal verschillende kentekens in de kolom ${kpi.kolom}.`;
    case "autos-optin":
      return `Het aantal verschillende kentekens (kolom ${kpi.kolom}) dat op minstens één rij staat bij een e-mailadres dat ergens minstens één van deze opt-inkolommen op True heeft:`;
    case "optin":
      return `Het aantal verschillende e-mailadressen met minstens één rij waarop de kolom ${kpi.kolom} True is.`;
  }
}

export default function KpiCrmKaart({ kpi }: { kpi: CrmKpiRegel }) {
  const u = kpi.uitkomst;
  const groei = `${Math.round(CRM_GROEI * 100)}%`;
  const eersteMaand = u ? Number(u.eersteDatum.slice(5, 7)) : null;
  const laatsteMaand = u ? Number(u.standDatum.slice(5, 7)) : null;
  const metLijst = kpi.soort === "met-optin" || kpi.soort === "autos-optin";

  return (
    <KpiKaartOpmaak
      naam={kpi.naam}
      uitkomst={u}
      realisatie={kpi.realisatie}
      stand
      kopTekst={
        u ? (u.metingen === 1 ? `één meting: stand op ${datumKort(u.standDatum)}` : `${aantal(u.metingen)} metingen · laatste ${datumKort(u.standDatum)}`) : undefined
      }
      leegTekst={`Er is geen stand van ${KPI_JAAR} bewaard voor deze KPI, dus ook geen basis voor het target.`}
    >
      <p>
        <span className="text-ink-muted">Grafiek:</span> per maand het aantal unieke {telt(kpi)} in {KPI_JAAR}: de laatste
        bewaarde stand van die maand (Stand {KPI_JAAR}). Elke dag wordt één meting bewaard
        {u
          ? `; voor deze KPI ${u.metingen === 1 ? `is dat er één, van ${datumLang(u.standDatum)}` : `zijn dat er ${aantal(u.metingen)}, van ${datumLang(u.eersteDatum)} t/m ${datumLang(u.standDatum)}`}`
          : ""}
        .{" "}
        {eersteMaand && eersteMaand > 1
          ? `Januari t/m ${MAANDNAMEN[eersteMaand - 2]} krijgen de eerste bewaarde stand: een aanname, gestippeld en in de tooltip "Aangenomen". `
          : ""}
        {laatsteMaand && laatsteMaand < 12
          ? `${laatsteMaand === 11 ? "December is" : `${MAANDNAMEN[laatsteMaand].replace(/^./, (c) => c.toUpperCase())} t/m december zijn`} de laatste stand doorgetrokken tot 31 december (Stand ${KPI_JAAR} verwachting): de basis voor het target. `
          : ""}
        De vlakke lijn is het doel eind {KPI_DOELJAAR}: de stand eind {KPI_JAAR} plus {groei}. Een stand telt niet op: het
        target is het aantal dat er eind {KPI_DOELJAAR} moet zijn, geen jaartotaal, en er is dus ook geen maandtarget. De
        realisatie van {KPI_DOELJAAR} staat in het vierde kaartje, niet in de grafiek.
      </p>

      <p className="mt-1">
        <span className="text-ink-muted">Bron:</span> de Selligent-export op Azure Blob Storage
        (output/autoline/users_customers_dashboard.csv), hetzelfde bestand als Tools → Selligent database. Selligent zet hem
        elke ochtend vers neer; deze pagina leest steeds de laatste. Elke dag wordt van elke KPI alleen het aantal bewaard
        (tabel kpi_2027_crm_standen), geen e-mailadressen of kentekens. Gebruikte kolommen: {kolommenVan(kpi)}.
        Een rij is een contact mét een voertuig, dus één contact of auto kan op meerdere rijen staan; daarom telt alles
        unieke waarden en geen rijen.
      </p>

      <p className="mt-2 text-ink-muted">
        Wat telt mee{u ? ` — stand op ${datumLang(u.standDatum)}` : ""}
        {u ? `: ${aantal(u.gerealiseerd)} ${telt(kpi)}` : ""}
      </p>
      <p className="mt-0.5">{watTeltMee(kpi)}</p>
      {metLijst && (
        <ul className="mt-0.5 flex flex-col gap-0.5">
          {kpi.optinKolommen.map((k) => (
            <li key={k} className="flex gap-1.5">
              <span aria-hidden="true">•</span>
              <span>
                {k} ({optinNaam(k)})
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-ink-muted">Keuzes in de definitie</p>
      <ul className="mt-0.5 flex flex-col gap-0.5">
        {kpi.keuzes.map((k) => (
          <li key={k} className="flex gap-1.5">
            <span aria-hidden="true">•</span>
            <span>{k}</span>
          </li>
        ))}
      </ul>
    </KpiKaartOpmaak>
  );
}
