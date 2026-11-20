"use client";

import { KpiKaartOpmaak, aantal, datumKort } from "@/components/kpi/KpiKaart";
import { groeiTekst } from "@/components/kpi/GroeiBewerken";
import { KPI_DOELJAAR, KPI_JAAR } from "@/lib/kpi2027/definities";
import { KANAAL_NAMEN } from "@/lib/kpi2027social/definities";
import type { SocialKpiRegel } from "@/lib/kpi2027social/rekenen";

/**
 * Eén social-KPI: dezelfde kaart als op KPI's 2027 GA en Syntec (`KpiKaartOpmaak`), met
 * eronder — ingeklapt achter "Lees definitie" — welk cijfer van welk account erin zit.
 * Volgers zijn een stand (`stand`), impressies een aantal; zie `lib/kpi2027social/rekenen.ts`.
 */

/** Wat Windsor per kanaal en maat levert, in gewone taal. */
function watTeltMee(kpi: SocialKpiRegel): string {
  if (kpi.maat === "vertoningen") {
    switch (kpi.kanaal) {
      case "instagram":
        return "Weergaven (views) per dag: hoe vaak posts, reels en stories werden afgespeeld of getoond. Meta noemt dit sinds 2025 views; impressions bestaat niet meer.";
      case "linkedin":
        return "Organische vertoningen van de bedrijfspagina per dag (account_analytics_impression_count); geen advertenties.";
      case "facebook":
        return "Vertoningen van de pagina per dag (page_impressions): hoe vaak iets van de pagina in beeld kwam.";
      default:
        return "";
    }
  }
  switch (kpi.kanaal) {
    case "instagram":
      return "Het aantal volgers (followers_count). Instagram geeft alleen de stand van vandaag, geen historie: de reeks begint daarom op 20 november 2026 en groeit elke nacht met een stand aan. Vóór de eerste stand is er niets ingevuld.";
    case "linkedin":
      return "Het aantal volgers van de bedrijfspagina: de stand van vandaag, per dag teruggerekend met de netto aanwas (organisch + betaald) van LinkedIn.";
    case "facebook":
      return "Het aantal volgers van de pagina per dag (page_follows).";
    default:
      return "";
  }
}

export default function KpiSocialKaart({
  kpi,
  opslaanGroei,
}: {
  kpi: SocialKpiRegel;
  opslaanGroei: (groei: number | null) => Promise<void>;
}) {
  const u = kpi.uitkomst;
  const stand = kpi.maat === "volgers";
  const kanaal = KANAAL_NAMEN[kpi.kanaal];

  return (
    <KpiKaartOpmaak
      naam={kpi.naam}
      uitkomst={u}
      realisatie={kpi.realisatie}
      stand={stand}
      leegTekst={kpi.nietGekoppeld ?? "Nog geen stand voor dit account. De eerste verschijnt na de update op zondag."}
      groei={{ soort: "bewerkbaar", aangepast: kpi.groeiAangepast, opslaan: opslaanGroei, standaard: kpi.standaardGroei }}
    >
      {stand ? (
        <p>
          <span className="text-ink-muted">Grafiek:</span> per maand de stand aan het eind van de maand in {KPI_JAAR}. De
          doorgetrokken lijn is gemeten; de gestippelde lijn is de laatste stand plus de trend per dag (de groei van de
          eerste naar de laatste bekende stand van {KPI_JAAR}, gedeeld door het aantal dagen ertussen). De vlakke lijn is
          het doel eind {KPI_DOELJAAR}: de stand eind {KPI_JAAR} plus de groei. Volgers tellen niet op; het target is een
          stand, geen jaartotaal.
        </p>
      ) : (
        <p>
          <span className="text-ink-muted">Grafiek:</span> per maand het aantal impressies in {KPI_JAAR}. De doorgetrokken
          lijn is een volledig gemeten maand, de gestippelde lijn (deels) verwachting: het gemiddelde per dag × de
          resterende dagen. De vlakke lijn is het maandtarget {KPI_DOELJAAR} (het jaartarget ÷ 12).
          {u && u.dagenNietGemeten > 0
            ? ` De laatste ${aantal(u.dagenNietGemeten)} dag(en) vóór de peildatum had het platform nog niet binnen; die tellen als verwachting.`
            : ""}
        </p>
      )}
      <p className="mt-1">
        <span className="text-ink-muted">Bron:</span> {kanaal} via Windsor
        {kpi.account ? `, account ${kpi.account.naam} (${kpi.account.accountId})` : ""}. Per dag opgehaald en elke zondag
        bijgewerkt t/m de zaterdag ervoor.
      </p>
      <p className="mt-2 text-ink-muted">Wat telt mee{u ? ` — ${KPI_JAAR} t/m ${datumKort(u.peildatum)}` : ""}</p>
      <p className="mt-0.5">{watTeltMee(kpi)}</p>
      <p className="mt-2">
        <span className="text-ink-muted">Groei:</span> het team legde voor deze KPI {groeiTekst(kpi.standaardGroei)} vast
        (november 2026).
        {kpi.groeiAangepast && u ? ` Nu met de hand op ${groeiTekst(u.groei)} gezet.` : ""}
      </p>
    </KpiKaartOpmaak>
  );
}
