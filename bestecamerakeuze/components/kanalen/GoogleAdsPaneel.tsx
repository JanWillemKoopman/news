"use client";

import KanaalPagina from "@/components/kanalen/KanaalPagina";
import { ADVERTENTIE_STATISTIEKEN } from "@/lib/windsor/velden";

/**
 * Google Ads: Search, Performance Max, Demand Gen en Display.
 *
 * Het verschil met de socialpagina dat in de data zit en niet weggepoetst wordt: leads
 * zitten hier niet in een apart veld maar in de conversie-acties. Die kolom staat daarom
 * **niet** in de lijst hieronder zolang er niets is aangewezen. Hij stond er eerder wel,
 * en dan keek je op de pagina waar leads het belangrijkste getal zijn naar een kolom met
 * louter nullen en een kosten-per-lead met louter streepjes — een leeg vakje leest als
 * "nul leads" en niet als "dit meten we hier niet". Conversies is voor Google het cijfer
 * dat de leads bevat.
 *
 * Bereik hoefde hier nooit uitgezonderd te worden en staat inmiddels op géén enkele
 * kanaalpagina meer: het is per periode niet te reproduceren. Zie `lib/windsor/velden.ts`.
 */

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
      statistieken={ADVERTENTIE_STATISTIEKEN}
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
      leeswijzer="Conversies zijn alle acties die in Google Ads als conversie zijn ingesteld, inclusief de GA4-doelen — precies het getal dat Google Ads zelf ook toont. Welke daarvan een lead is, wijs je aan op de pagina Koppeltabel onder Conversie-acties; pas dan verschijnen hier de kolommen Leads en Kosten per lead. Bereik staat niet op deze pagina: dat cijfer ontdubbelt het platform per dag, dus een optelling over een periode komt nooit overeen met wat je in de advertentiebeheerder ziet."
    />
  );
}
