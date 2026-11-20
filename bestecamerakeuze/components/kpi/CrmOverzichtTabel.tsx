"use client";

import { OverzichtGroepKop, OverzichtRegel, OverzichtTabel } from "@/components/kpi/OverzichtTabel";
import { KPI_DOELJAAR, KPI_JAAR } from "@/lib/kpi2027/definities";
import type { CrmGroep } from "@/lib/kpi2027crm/rekenen";
import { voortgangStand } from "@/lib/kpi2027social/rekenen";

/**
 * De overzichtstabel bovenaan KPI's 2027 CRM: dezelfde tabel als op de andere KPI-tabbladen
 * (`OverzichtTabel.tsx`), met een kopje per groep (Contacten, Opt-ins). Zonder totaalregel:
 * opt-ins overlappen (één adres kan bij meerdere merken aanstaan), dus optellen betekent niets.
 *
 * Alles is een stand, net als volgers op KPI's social media: de kolom {KPI_JAAR} is de stand
 * eind {KPI_JAAR}, het target de stand eind {KPI_DOELJAAR}, de voortgang de groei sinds eind
 * {KPI_JAAR} tegen het lineaire deel van de doelgroei (`voortgangStand`).
 */
export default function CrmOverzichtTabel({
  groepen,
  peildatumDoeljaar,
}: {
  groepen: CrmGroep[];
  peildatumDoeljaar: string | null;
}) {
  return (
    <OverzichtTabel
      peildatum2027={peildatumDoeljaar}
      uitlegJaar={
        <>
          Het aantal unieke e-mailadressen op 31 december {KPI_JAAR}: de stand van de laatste Selligent-export. Er wordt
          geen historie bewaard, dus alle maanden van {KPI_JAAR} krijgen die stand.
        </>
      }
      uitlegGroei={<>Hoeveel procent het target boven {KPI_JAAR} ligt: +10% voor elke CRM-KPI. Niet aan te passen.</>}
      uitlegRealisatie={
        <>
          De stand van de laatste export in {KPI_DOELJAAR}, in unieke e-mailadressen. Tot 1 januari {KPI_DOELJAAR} staat hier
          0.
        </>
      }
      uitlegVoortgang={
        <>
          Ligt de KPI op schema? De groei van eind {KPI_JAAR} naar het target gaat gelijk over het jaar; op dag 40 hoort
          40/365 van die groei erbij te zijn. <span className="text-positive">+10%</span> is 10% vóór op schema,{" "}
          <span className="text-negative">−10%</span> 10% erachter. Tot 1 januari {KPI_DOELJAAR} een streepje.
        </>
      }
    >
      {groepen.map((groep) => (
        <tbody key={groep.sleutel}>
          <OverzichtGroepKop naam={groep.naam} />
          {groep.kpis.map((kpi) => (
            <OverzichtRegel
              key={kpi.sleutel}
              naam={kpi.naam}
              uitkomst={kpi.uitkomst}
              realisatie={kpi.realisatie}
              soort="kpi"
              leegTekst={kpi.uitkomst ? undefined : `geen stand ${KPI_JAAR}`}
              voortgangVan={(u, realisatie) => voortgangStand(u.verwacht, u.target, realisatie)}
            />
          ))}
        </tbody>
      ))}
    </OverzichtTabel>
  );
}
