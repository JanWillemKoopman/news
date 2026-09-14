"use client";

import KanaalPagina from "@/components/kanalen/KanaalPagina";
import { ADVERTENTIE_STATISTIEKEN } from "@/lib/windsor/velden";

/**
 * Betaalde social: Meta Ads en LinkedIn Ads.
 *
 * Google staat op een eigen pagina omdat het een ander soort kanaal is — zoekintentie
 * tegenover bereik en beeld — maar in de database delen ze één tabel, zodat een
 * budgetvergelijking tussen kanalen mogelijk blijft.
 *
 * Het platformfilter draait op `platform` en niet op de connector: Instagram-advertenties
 * komen uit de Meta Ads-koppeling en zouden onder een connectorfilter dus als Facebook
 * verschijnen.
 */
/**
 * Conversies en kosten per conversie bestaan bij Meta alleen als er conversie-acties zijn
 * aangewezen (Koppeltabel → Conversie-acties). Meta levert geen conversietotaal, en de
 * som van álle acties was geen bruikbaar substituut — die overlappen elkaar. Zonder die
 * keuze hoort de kolom er dus niet te staan, net als Leads op de Google Ads-pagina.
 */
const ALLEEN_MET_CONVERSIEKEUZE = ["conversies", "cpa"];

export default function SocialAdsPaneel({ ingelogd }: { ingelogd: boolean }) {
  return (
    <KanaalPagina
      signaalDimensie="campagne"
      pagina="social"
      weergave="social-ads"
      ingelogd={ingelogd}
      statistieken={ADVERTENTIE_STATISTIEKEN}
      verbergZonderConversieActies={ALLEEN_MET_CONVERSIEKEUZE}
      standaardStatistiek="uitgaven"
      filterDimensies={[
        { id: "account", label: "Account" },
        { id: "platform", label: "Platform" },
        { id: "campagne", label: "Campagne" },
        { id: "campagne_doel", label: "Doelstelling" },
        { id: "campagne_status", label: "Status" },
      ]}
      uitsplitsbaar={[
        { id: "platform", label: "Platform" },
        { id: "account", label: "Account" },
        { id: "campagne", label: "Campagne" },
        { id: "campagne_doel", label: "Doelstelling" },
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
          titel: "Advertenties",
          toelichting: "de losse advertenties, met hun creative",
          bron: "detail",
          groepeerOp: "advertentie_id",
          groepLabel: "Advertentie",
          labelVeld: "advertentie",
          toonBeeld: true,
        },
        {
          // Heette eerder "Plaatsing" maar groepeerde op platform, en dat is hetzelfde
          // als het platformfilter erboven. Nu allebei: waar het netwerk stond, en waar
          // in dat netwerk de advertentie te zien was.
          titel: "Platform",
          toelichting: "op welk netwerk de advertenties liepen",
          bron: "detail",
          groepeerOp: "platform",
          groepLabel: "Platform",
        },
        {
          titel: "Plaatsing",
          toelichting: "waar binnen het platform: feed, stories, reels",
          bron: "detail",
          groepeerOp: "plaatsing",
          groepLabel: "Plaatsing",
        },
      ]}
      alleKanalen={{
        pagina: "betaald",
        eigenLabel: "Alleen Meta en LinkedIn",
        allesLabel: "Alle betaalde kanalen",
        dimensie: { id: "kanaal", label: "Kanaal" },
        statistieken: ADVERTENTIE_STATISTIEKEN,
      }}
      leeswijzer="Bereik staat niet op deze pagina. Het platform telt daar verschillende mensen en doet dat per dag opnieuw; wij bewaren dagcijfers, dus elke optelling over een periode komt hoger uit dan wat Ads Manager laat zien. Een cijfer dat per definitie nooit klopt, tonen we liever niet. Conversies zijn bij Meta de acties die het team zelf heeft aangewezen op de pagina Koppeltabel — Meta levert geen conversietotaal, en alle acties bij elkaar optellen telde hetzelfde formulier meerdere keren. Staat die keuze nog niet, dan ontbreken de kolommen Conversies en Kosten per conversie hier. Conversiewaarde en het rendement op advertentiebudget komen van Meta helemaal niet mee: die twee blijven leeg en zeggen alleen iets over LinkedIn. Klikken, CTR en kosten per klik rekenen met álle klikken, dus met wat Ads Manager \'Klikken (alle)\' noemt."
    />
  );
}
