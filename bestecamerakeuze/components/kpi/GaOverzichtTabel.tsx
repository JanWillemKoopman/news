"use client";

import { OverzichtRegel, OverzichtTabel } from "@/components/kpi/OverzichtTabel";
import { KPI_JAAR } from "@/lib/kpi2027/definities";
import type { WebsiteOverzicht } from "@/lib/kpi2027/rekenen";

/**
 * De overzichtstabel bovenaan KPI's 2027 GA: alle KPI's van de gekozen website in één
 * blik — dezelfde tabel als op KPI's 2027 Syntec (`OverzichtTabel.tsx`), met de KPI's van
 * de kaarten eronder.
 *
 * Bewust zonder totaalregel: de KPI's van één website zijn verschillende dingen
 * (sessies, gebruikers, aanvragen), en die optellen levert een getal op dat niets betekent.
 */
export default function GaOverzichtTabel({ website }: { website: WebsiteOverzicht }) {
  return (
    <OverzichtTabel
      peildatum2027={website.standDoeljaar?.peildatum ?? null}
      uitlegJaar={
        <>
          Wat {KPI_JAAR} naar verwachting wordt: wat Google Analytics op de gemeten dagen t/m de peildatum telde, plus het
          gemiddelde per gemeten dag × alle overige dagen van het jaar (de resterende dagen, en dagen waarop de website 0
          sessies had).
        </>
      }
    >
      <tbody>
        {website.kpis.map((kpi) => (
          <OverzichtRegel key={kpi.sleutel} naam={kpi.naam} uitkomst={kpi.uitkomst} realisatie={kpi.realisatie} soort="kpi" />
        ))}
      </tbody>
    </OverzichtTabel>
  );
}
