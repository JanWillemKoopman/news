"use client";

import KanaalPagina from "@/components/kanalen/KanaalPagina";
import { ADVERTENTIE_STATISTIEKEN } from "@/lib/windsor/velden";

/**
 * Google Ads: Search, Performance Max, Demand Gen en Display.
 *
 * Twee verschillen met de socialpagina die in de data zitten en niet weggepoetst worden:
 * Google levert geen bereik op advertentieniveau, en leads zitten hier niet in een apart
 * veld maar in de conversie-acties. Beide kolommen staan daarom **niet** in de lijst
 * hieronder. Ze stonden er eerder wel, en dan keek je op de pagina waar leads het
 * belangrijkste getal zijn naar een kolom met louter nullen en een kosten-per-lead met
 * louter streepjes — een leeg vakje leest als "nul leads" en niet als "dit meten we hier
 * niet". Conversies is voor Google het cijfer dat de leads bevat.
 */
/**
 * Wat de Google-koppeling nooit vult: bereik op advertentieniveau bestaat er niet, en
 * frequentie is daarvan de afgeleide.
 */
const GOOGLE_ONBESCHIKBAAR = new Set(["bereik", "frequentie"]);

/**
 * Leads en kosten per lead bestaan bij Google alleen als er conversie-acties zijn
 * aangewezen (Koppeltabel → Conversie-acties). Zonder die keuze schrijft de sync er nul,
 * en dan hoort de kolom er niet te staan — een lege cel leest als "nul leads" en niet
 * als "dat meten we hier niet".
 */
const ALLEEN_MET_CONVERSIEKEUZE = ["leads", "cpl"];

export default function GoogleAdsPaneel({ ingelogd }: { ingelogd: boolean }) {
  return (
    <KanaalPagina
      signaalDimensie="campagne"
      pagina="google"
      weergave="google-ads"
      ingelogd={ingelogd}
      statistieken={ADVERTENTIE_STATISTIEKEN.filter((s) => !GOOGLE_ONBESCHIKBAAR.has(s.id))}
      verbergZonderConversieLeads={ALLEEN_MET_CONVERSIEKEUZE}
      standaardStatistiek="uitgaven"
      filterDimensies={[
        { id: "account", label: "Account" },
        { id: "campagne", label: "Campagne" },
        { id: "campagne_doel", label: "Campagnetype" },
        { id: "campagne_status", label: "Status" },
      ]}
      uitsplitsbaar={[
        { id: "campagne_doel", label: "Campagnetype" },
        { id: "campagne", label: "Campagne" },
        { id: "merk", label: "Merk" },
      ]}
      tabellen={[
        {
          titel: "Campagnes",
          toelichting: "opgeteld over de gekozen periode",
          bron: "detail",
          groepeerOp: "campagne",
          groepLabel: "Campagne",
        },
        {
          titel: "Advertentiegroepen",
          toelichting: "de indeling binnen de campagnes",
          bron: "detail",
          groepeerOp: "adgroep",
          groepLabel: "Advertentiegroep",
        },
        {
          titel: "Campagnetypes",
          toelichting: "Search, Pmax, Demand Gen en Display naast elkaar",
          bron: "detail",
          groepeerOp: "campagne_doel",
          groepLabel: "Campagnetype",
        },
      ]}
      alleKanalen={{
        pagina: "betaald",
        eigenLabel: "Alleen Google Ads",
        allesLabel: "Alle betaalde kanalen",
        dimensie: { id: "kanaal", label: "Kanaal" },
        // In het gecombineerde beeld zitten Meta en LinkedIn erbij, en die leveren bereik
        // en leads wél — dus daar gelden de Google-beperkingen niet.
        statistieken: ADVERTENTIE_STATISTIEKEN,
      }}
      leeswijzer="Google rapporteert geen bereik per advertentie, dus die kolom ontbreekt hier bewust in plaats van als nul te verschijnen. Conversies zijn alle acties die in Google Ads als conversie zijn ingesteld, inclusief de GA4-doelen. Welke daarvan een lead is, wijs je aan op de pagina Koppeltabel onder Conversie-acties; pas dan verschijnen hier de kolommen Leads en Kosten per lead."
    />
  );
}
