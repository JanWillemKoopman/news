"use client";

import { KpiKaartOpmaak, aantal, datumKort } from "@/components/kpi/KpiKaart";
import { groeiTekst } from "@/components/kpi/GroeiBewerken";
import { KPI_DOELJAAR, KPI_JAAR } from "@/lib/kpi2027/definities";
import { KANAAL_NAMEN } from "@/lib/kpi2027social/definities";
import type { SocialKpiRegel } from "@/lib/kpi2027social/rekenen";

/**
 * Eén social-KPI: dezelfde kaart als op KPI's 2027 GA en Syntec (`KpiKaartOpmaak`), met
 * eronder — ingeklapt achter "Lees definitie" — dezelfde opbouw als op Syntec: *Grafiek*, *Bron*,
 * *Wat telt mee* en *Keuzes in de definitie* (de besluiten per KPI, `keuzesVoor` in
 * `lib/kpi2027social/definities.ts`).
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
  if (kpi.maat === "nieuwe-volgers") {
    return kpi.kanaal === "instagram"
      ? "Nieuwe volgers per dag (follower_count_1d): accounts die deze dag gingen volgen. Ontvolgers gaan er niet af. Meta levert dit cijfer maar dertig dagen terug; de nachtelijke sync van het dashboard bewaart het sinds 16 augustus 2026. Januari t/m 15 augustus 2026 is daarom niet gemeten en met het gemiddelde per gemeten dag bijgeschat."
      : "Nieuwe volgers per dag (page_daily_follows): accounts die de pagina deze dag gingen volgen. Ontvolgers gaan er niet af.";
  }
  switch (kpi.kanaal) {
    case "instagram":
      return "Het totaal aantal volgers (followers_count). Instagram geeft alleen de stand van vandaag, geen historie. Het dashboard bewaart daarom elke dag de stand. 1 januari t/m de dag vóór de eerste meting krijgen dezelfde stand als die eerste meting (een aanname, gestippeld in de grafiek); vanaf dan telt elke dag de echte stand.";
    case "linkedin":
      return "Het aantal volgers van de bedrijfspagina: de stand van vandaag, per dag teruggerekend met de netto aanwas (organisch + betaald) van LinkedIn.";
    case "facebook":
      return "Het totaal aantal volgers van de pagina, per dag (page_follows). Het hele jaar is gemeten.";
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
          {u?.aangevuldTot
            ? ` De maanden vóór ${datumKort(u.aangevuldTot)} zijn niet gemeten: daar staat de eerste gemeten stand (gestippeld).`
            : ""}
        </p>
      ) : kpi.maat === "nieuwe-volgers" ? (
        <p>
          <span className="text-ink-muted">Grafiek:</span> per maand het aantal nieuwe volgers in {KPI_JAAR}. De
          doorgetrokken lijn is een volledig gemeten maand; de gestippelde lijn is (deels) verwachting of bijgeschat
          {u && u.dagenNietGemeten > 0
            ? `: ${aantal(u.dagenNietGemeten)} verstreken dagen zijn niet gemeten en ingevuld met het gemiddelde per gemeten dag`
            : ""}
          . De vlakke lijn is het maandtarget {KPI_DOELJAAR} (het jaartarget ÷ 12).
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
      {u && Math.abs(u.groei - kpi.standaardGroei) > 1e-9 && (
        <p className="mt-1">
          Het percentage staat nu met de hand op {groeiTekst(u.groei)} (vastgesteld was{" "}
          {groeiTekst(kpi.standaardGroei)}).
        </p>
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
