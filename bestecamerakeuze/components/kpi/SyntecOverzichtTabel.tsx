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

type GroeiOpslaan = (kpi: string, groei: number | null) => Promise<void>;

/** Alleen een gewone KPI heeft een eigen percentage; totalen en combinaties volgen eruit. */
function Regel({ kpi, soort, opslaanGroei }: { kpi: SyntecKpiRegel; soort: RegelSoort; opslaanGroei: GroeiOpslaan }) {
  return (
    <OverzichtRegel
      naam={kpi.naam}
      uitkomst={kpi.uitkomst}
      realisatie={kpi.realisatie}
      soort={soort}
      groei={
        soort === "kpi" && kpi.onderdeelSleutels.length === 0
          ? { aangepast: kpi.groeiAangepast, opslaan: (groei) => opslaanGroei(kpi.sleutel, groei) }
          : undefined
      }
    />
  );
}

export default function SyntecOverzichtTabel({
  overzicht,
  opslaanGroei,
}: {
  overzicht: SyntecOverzicht;
  /** Slaat het percentage van één KPI op; de totalen tellen opnieuw op. */
  opslaanGroei: GroeiOpslaan;
}) {
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
          De optelsom van de KPI&apos;s erboven, ook het target; hun Target % volgt daaruit en is dus niet zelf aan te
          passen. &quot;Offerte + private lease&quot; staat er ter vergelijking bij, maar telt
          niet mee in het totaal: die leads zitten er al in via de twee losse KPI&apos;s.
        </>
      }
    >
      {overzicht.groepen.map((groep) => (
        <tbody key={groep.sleutel}>
          <OverzichtGroepKop naam={groep.naam} />
          {groep.kpis.map((kpi) => (
            <Regel key={kpi.sleutel} kpi={kpi} soort="kpi" opslaanGroei={opslaanGroei} />
          ))}
          {groep.combinaties.map((kpi) => (
            <Regel key={kpi.sleutel} kpi={kpi} soort="combinatie" opslaanGroei={opslaanGroei} />
          ))}
          <Regel kpi={groep.totaal} soort="totaal" opslaanGroei={opslaanGroei} />
        </tbody>
      ))}
      <tbody>
        <tr>
          <td colSpan={KOLOMMEN} className="pt-4" />
        </tr>
        <Regel kpi={overzicht.totaal} soort="eindtotaal" opslaanGroei={opslaanGroei} />
      </tbody>
    </OverzichtTabel>
  );
}
