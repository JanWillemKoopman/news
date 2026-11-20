"use client";

import { KpiKaartOpmaak, aantal, datumKort } from "@/components/kpi/KpiKaart";
import { KPI_DOELJAAR, KPI_JAAR } from "@/lib/kpi2027/definities";
import type { CrmKpiRegel } from "@/lib/kpi2027crm/rekenen";

/**
 * Eén CRM-KPI: dezelfde kaart als op KPI's 2027 GA, Syntec en social media (`KpiKaartOpmaak`,
 * als stand — net als volgers), met eronder, ingeklapt achter "Lees definitie", dezelfde
 * opbouw: *Grafiek*, *Bron*, *Wat telt mee* en *Keuzes in de definitie*
 * (`keuzesVoor` in `lib/kpi2027crm/definities.ts`).
 *
 * Het groeipercentage staat vast op +10% en is hier niet aan te passen.
 */
export default function KpiCrmKaart({ kpi }: { kpi: CrmKpiRegel }) {
  const u = kpi.uitkomst;
  return (
    <KpiKaartOpmaak
      naam={kpi.naam}
      uitkomst={u}
      realisatie={kpi.realisatie}
      stand
      kopTekst={u ? `één meting: stand op ${datumKort(u.standDatum)}` : undefined}
      leegTekst={`Er is geen stand van ${KPI_JAAR} bekend: de export ligt buiten ${KPI_JAAR} en er wordt geen historie bewaard.`}
    >
      <p>
        <span className="text-ink-muted">Grafiek:</span> per maand het aantal unieke e-mailadressen in {KPI_JAAR}. Er is
        één meting: de export van {u ? datumKort(u.standDatum) : "vandaag"}. De maanden ervóór krijgen dezelfde stand (een
        aanname, gestippeld), de maanden erna de stand doorgetrokken tot 31 december. De vlakke lijn is het doel eind{" "}
        {KPI_DOELJAAR}: de stand eind {KPI_JAAR} plus 10%. Een stand telt niet op; het target is een stand, geen jaartotaal.
      </p>
      <p className="mt-1">
        <span className="text-ink-muted">Bron:</span> de Selligent-export op Azure Blob Storage
        (output/autoline/users_customers_dashboard.csv), hetzelfde bestand als Tools → Selligent database. Selligent zet hem
        elke ochtend vers neer; deze pagina leest steeds de laatste.
      </p>
      <p className="mt-2 text-ink-muted">Wat telt mee{u ? ` — stand op ${datumKort(u.standDatum)} ${KPI_JAAR}` : ""}</p>
      <p className="mt-0.5">
        {kpi.soort === "contacten"
          ? `Het aantal verschillende e-mailadressen in de kolom ${kpi.kolom}${u ? ` (${aantal(u.gerealiseerd)})` : ""}. Precies het getal van de tegel E-mailadressen op Tools → Selligent database.`
          : kpi.soort === "met-optin"
          ? `Het aantal verschillende e-mailadressen met minstens één rij waarop minstens één opt-inkolom True is${u ? ` (${aantal(u.gerealiseerd)})` : ""}.`
          : `Het aantal verschillende e-mailadressen met minstens één rij waarop de kolom ${kpi.kolom} True is${u ? ` (${aantal(u.gerealiseerd)})` : ""}.`}
      </p>

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
