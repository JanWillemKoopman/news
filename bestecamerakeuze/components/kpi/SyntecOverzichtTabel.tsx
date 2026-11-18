"use client";

import { OverzichtGroepKop, OverzichtRegel, OverzichtTabel, KOLOMMEN, type RegelSoort } from "@/components/kpi/OverzichtTabel";
import { KPI_JAAR } from "@/lib/kpi2027/definities";
import type { SyntecKpiRegel, SyntecOverzicht } from "@/lib/kpi2027syntec/rekenen";

/**
 * De overzichtstabel bovenaan KPI's 2027 Syntec: alle KPI's van de kaarten eronder in één
 * blik, in dezelfde indeling als de doelentabel van het team (eigen website, PAH,
 * portals, elk met een totaal). Kader, kolommen en definities zijn gedeeld met KPI's 2027
 * GA (`OverzichtTabel.tsx`).
 */

function Regel({ kpi, soort }: { kpi: SyntecKpiRegel; soort: RegelSoort }) {
  return <OverzichtRegel naam={kpi.naam} uitkomst={kpi.uitkomst} realisatie={kpi.realisatie} soort={soort} />;
}

export default function SyntecOverzichtTabel({ overzicht }: { overzicht: SyntecOverzicht }) {
  return (
    <OverzichtTabel
      peildatum2027={overzicht.totaal.realisatie.peildatum}
      uitlegJaar={
        <>
          Wat {KPI_JAAR} naar verwachting wordt: de leads t/m de peildatum, plus het gemiddelde per dag × de resterende
          dagen van het jaar. Inruilvoorstel en contact rekenen met het gemiddelde vanaf 1 april {KPI_JAAR}.
        </>
      }
      uitlegTotalen={
        <>
          De optelsom van de KPI&apos;s erboven. &quot;Offerte + private lease&quot; staat er ter vergelijking bij, maar telt
          niet mee in het totaal: die leads zitten er al in via de twee losse KPI&apos;s.
        </>
      }
    >
      {overzicht.groepen.map((groep) => (
        <tbody key={groep.sleutel}>
          <OverzichtGroepKop naam={groep.naam} />
          {groep.kpis.map((kpi) => (
            <Regel key={kpi.sleutel} kpi={kpi} soort="kpi" />
          ))}
          {groep.combinaties.map((kpi) => (
            <Regel key={kpi.sleutel} kpi={kpi} soort="combinatie" />
          ))}
          <Regel kpi={groep.totaal} soort="totaal" />
        </tbody>
      ))}
      <tbody>
        <tr>
          <td colSpan={KOLOMMEN} className="pt-4" />
        </tr>
        <Regel kpi={overzicht.totaal} soort="eindtotaal" />
      </tbody>
    </OverzichtTabel>
  );
}
