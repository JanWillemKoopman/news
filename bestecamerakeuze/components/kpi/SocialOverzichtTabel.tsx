"use client";

import { OverzichtGroepKop, OverzichtRegel, OverzichtTabel } from "@/components/kpi/OverzichtTabel";
import { KPI_DOELJAAR, KPI_JAAR } from "@/lib/kpi2027/definities";
import { KANAAL_NAMEN } from "@/lib/kpi2027social/definities";
import { voortgangStand, type SocialMerkOverzicht, type SocialUitkomst } from "@/lib/kpi2027social/rekenen";

/**
 * De overzichtstabel bovenaan KPI's 2027 social media: dezelfde tabel als op KPI's 2027 GA en
 * Syntec (`OverzichtTabel.tsx`), voor het gekozen merk, per kanaal een kopje. Zonder
 * totaalregel: volgers en impressies optellen betekent niets.
 *
 * Volgers zijn een stand; daar is de kolom {KPI_JAAR} de stand eind {KPI_JAAR}, het target de
 * stand eind {KPI_DOELJAAR}, en de voortgang de groei sinds eind {KPI_JAAR} tegen het lineaire
 * deel van de doelgroei (`voortgangStand`).
 */
export default function SocialOverzichtTabel({
  merk,
  opslaanGroei,
}: {
  merk: SocialMerkOverzicht;
  opslaanGroei: (kpi: string, groei: number | null) => Promise<void>;
}) {
  return (
    <OverzichtTabel
      peildatum2027={merk.peildatumDoeljaar}
      uitlegJaar={
        <>
          <strong className="font-semibold text-ink">Impressies</strong>: wat {KPI_JAAR} naar verwachting wordt — wat het
          platform t/m de peildatum telde, plus het gemiddelde per dag × de resterende dagen.{" "}
          <strong className="font-semibold text-ink">Volgers</strong>: het totaal aantal volgers op 31 december{" "}
          {KPI_JAAR} — de laatste bekende stand plus de trend per dag tot het eind van het jaar. Bij Instagram tellen
          de dagen vóór de eerste meting als gelijk aan die eerste meting.
        </>
      }
      uitlegGroei={
        <>
          Hoeveel procent het target boven {KPI_JAAR} ligt. Standaard het percentage dat het team per KPI voor{" "}
          {KPI_DOELJAAR} vastlegde. Klik erop om het aan te passen (Enter om op te slaan, Escape om te annuleren); het
          geldt voor iedereen.
        </>
      }
      uitlegRealisatie={
        <>
          Impressies: wat er in {KPI_DOELJAAR} binnenkwam, t/m de laatste zaterdag. Volgers: de laatste stand in{" "}
          {KPI_DOELJAAR}. Tot 1 januari {KPI_DOELJAAR} staat hier 0.
        </>
      }
      uitlegVoortgang={
        <>
          Ligt de KPI op schema? Impressies: het jaartarget gaat gelijk over de 365 dagen; op dag 40 hoort er target × 40 ÷
          365 binnen te zijn. Volgers: de groei van eind {KPI_JAAR} naar het target, gelijk over het jaar; op dag 40 hoort
          40/365 van die groei erbij te zijn. <span className="text-positive">+10%</span> is 10% vóór op schema,{" "}
          <span className="text-negative">−10%</span> 10% erachter. Tot 1 januari {KPI_DOELJAAR} een streepje.
        </>
      }
    >
      {merk.kanalen.map((groep) => (
        <tbody key={groep.kanaal}>
          <OverzichtGroepKop naam={KANAAL_NAMEN[groep.kanaal]} />
          {groep.kpis.map((kpi) => (
            <OverzichtRegel
              key={kpi.sleutel}
              naam={kpi.naam}
              uitkomst={kpi.uitkomst}
              realisatie={kpi.realisatie}
              soort="kpi"
              leegTekst={kpi.nietGekoppeld ? "niet gekoppeld" : undefined}
              groei={{
                aangepast: kpi.groeiAangepast,
                opslaan: (groei) => opslaanGroei(kpi.sleutel, groei),
                standaard: kpi.standaardGroei,
              }}
              voortgangVan={
                kpi.maat === "volgers"
                  ? (u, realisatie) => voortgangStand((u as SocialUitkomst).verwacht, u.target, realisatie)
                  : undefined
              }
            />
          ))}
        </tbody>
      ))}
    </OverzichtTabel>
  );
}
