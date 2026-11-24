import type { SemantiekInhoud } from "./types";

/**
 * De startinhoud van de semantic layer voor Marketing analyse.
 *
 * Geldt zolang er in `marketing_analyse_semantiek` niets is opgeslagen; de eigenaar vult aan
 * en corrigeert in het dashboard (knop Semantic layer), en elke opslag is een nieuwe versie.
 * De inhoud komt uit CLAUDE.md en het onderzoek naar de Audi A2 (november 2026). Waar
 * "(controleren)" staat, is de koppeling afgeleid en nog niet bevestigd.
 */
export const STANDAARD_SEMANTIEK: SemantiekInhoud = {
  bedrijven: [
    "Van den Udenhout",
    "Porsche Centrum Brabant",
    "Porsche Centrum Maastricht",
    "PGZ",
    "Bentley Maastricht",
    "VELOO",
    "Instra",
  ],
  blokken: {
    algemeen: `## Bronnen per bedrijf
- **Van den Udenhout**: advertentieaccounts, organische social media en GA4 via Windsor, én de leads uit Syntec (tabel marketing_analyse_leads, de kopie van "Data leads"). Voor leads kijk je naar zowel Syntec als de lead-events en andere interessante events in GA4.
- **Alle andere bedrijven** (Porsche Centrum Brabant, Porsche Centrum Maastricht, PGZ, Bentley Maastricht, VELOO, Instra): de Syntec-leads zijn **niet van toepassing**. Voor leads kijk je **alleen naar GA4**. Zeg dat in de analyse in plaats van een nul te tonen.

## Accounts per bedrijf (Windsor)
**Van den Udenhout**
- Meta Ads: "Van den Udenhout" (69324444)
- Google Ads: "Udenhout" (210-769-6929); "Van den Udenhout Lease" (741-059-0945) alleen bij leasecampagnes (controleren)
- LinkedIn Ads: "Van den Udenhout Groep" (500669928)
- Facebook: "Van den Udenhout" (135654409827841); "Audi Sport Eindhoven" (324389797988583) (controleren)
- Instagram: udenhoutgroep (17841400383959539); audisportdealer (17841402138338797) (controleren)
- LinkedIn organisch: "Van den Udenhout Groep" (288254)
- GA4: **alleen "GA4_https://udenhout.nl" (255949462)**

**Porsche Centrum Brabant**
- Meta Ads: "Porsche Groep Zuid" (293327521823561) (controleren)
- Google Ads: "Porsche Centrum Brabant B.V." (846-005-3447)
- LinkedIn Ads: "Porsche Centrum Brabant" (515422432)
- Facebook: "Porsche Centrum Brabant" (152454588113374) · Instagram: porschebrabant (17841400735388282) · LinkedIn organisch: 1688996
- GA4: www.porschecentrumbrabant.nl (306403800); niet de inactieve property 442472211

**Porsche Centrum Maastricht**
- Meta Ads: "Porsche centrum Maastricht" (315013592825616) · Google Ads: 383-831-5062 · LinkedIn Ads: 515419437
- Facebook: 1856659467764845 · Instagram: porschecentrummaastricht (17841409820778415) · LinkedIn organisch: 77458602
- GA4: www.porschecentrummaastricht.nl (306394313)

**PGZ**
- Meta Ads: "PGZ" (744220736319839) (controleren) · Google Ads: 973-942-0035 · LinkedIn Ads: "PGZ Moved by Mobility" (515420451)
- GA4: www.pgz.nl (405407306)

**Bentley Maastricht**
- Meta Ads: 192180818785600 · Google Ads: 703-471-9539 · LinkedIn Ads: 515420450
- GA4: "PON Bentley Maastricht" (435349999)

**VELOO**
- Meta Ads: 1662865740824278 · Google Ads: 987-872-1552
- Facebook: 113133791655546 · Instagram: veloonl (17841457360463399) · LinkedIn organisch: 91687065
- GA4: www.veloo.nl (381559171)

**Instra**
- Facebook: "Instra Bedrijfswagen- en Werkplaatsinrichtingen" (274218899266126) · overige accounts (controleren)

## Naamgeving van campagnes
- Actiecampagnes heten in de platforms meestal "Actie - …", "Acties - …" of "1. Acties - …", met het model erin (bijv. "1. Acties - Audi A2 e-tron -2026", "Demand Gen | Acties - Audi A2 e-tron - 2026").
- Let op valse treffers: een korte modelnaam als "A2" komt ook in andere woorden voor. Controleer altijd merk, model en periode.`,

    google_ads: `- Campagnetypes: Search, Performance Max, Demand Gen en Display. Het type staat vaak vóór in de naam ("Demand Gen | …").
- Google levert geen eigen leadveld: het leadcijfer zit in de conversies (conversie-acties die in Google Ads zijn ingesteld). Gebruik conversies alleen als aanvulling; GA4 is leidend voor wat er op de website gebeurt.
- In GA4 komt Google Ads-verkeer binnen als "google / cpc"; Performance Max en Demand Gen staan in GA4's kanaalgroep soms als "Cross-network".`,

    meta_ads: `- Eén account per bedrijf (zie Algemeen); Meta Ads omvat Facebook, Instagram, Messenger en Audience Network.
- Advertentienamen: "PR" = prospecting (nieuwe doelgroep), "RT" = retargeting. Vergelijk die twee apart.
- UTM-opbouw: utm_source=facebook, utm_medium=paid, utm_campaign = campagnenaam, utm_content = advertentienaam, utm_term = advertentieset.
- Meta-leads (actions_lead) zijn de eigen telling van Meta (leadformulieren, Messenger en pixel samen). GA4 en Syntec zijn leidend; laat verschillen zien.
- Bereik is niet op te tellen over dagen of platforms: vraag het periodebereik op zonder dagindeling.`,

    linkedin_ads: `- LinkedIn Ads wordt weinig gebruikt (kleine budgetten).
- De utm_campaign in GA4 is vaak een korte slug (bijv. "vriendenprijs") terwijl de campagne bij LinkedIn langer heet: koppel op inhoud en periode, niet alleen op exacte naam.`,

    facebook: `- Organische posts met lifetime-cijfers, gedateerd op publicatiedatum. Alleen posts die binnen de campagneperiode zijn gepubliceerd tellen mee.
- Een post hoort bij de campagne als de tekst het model of de actie noemt.
- Gebruik organische vertoningen voor organisch bereik; "vertoningen" kan betaalde distributie (boosts) bevatten.`,

    instagram: `- Organische posts met lifetime-cijfers, gedateerd op publicatiedatum. Alleen posts binnen de campagneperiode.
- Impressies heten bij Instagram "views". Een post hoort bij de campagne als de tekst het model of de actie noemt.`,

    linkedin_organisch: `- Posts van de bedrijfspagina's met lifetime-cijfers. Alleen posts binnen de campagneperiode.
- Een post hoort bij de campagne als de tekst het model of de actie noemt.`,

    ga4: `## Property
- Van den Udenhout: **alleen "GA4_https://udenhout.nl" (255949462)**. Andere bedrijven: zie Algemeen.

## Campagnepagina en sessies
- Een campagnepagina vind je via de bestemmings-URL's van de advertenties en via landing_page met het model of de actie in het pad (bijv. /acties/a2-e-tron). Er kunnen meerdere pagina's zijn.
- **landing_page hoort bij de hele sessie.** Vraag events op met landing_page × event_name × event_count: dan tel je de events in sessies die op de campagnepagina begonnen, ook als het event later elders op de site viel.
- Sessies tellen op over dagen, gebruikers niet.

## E-mailverkeer herkennen
- E-mail = session_default_channel_group = "Email" **of** (session_source_medium = "(direct) / (none)" **en** landing_page_plus_query_string bevat "M_BT="). Reden: de tracking vanuit Selligent ging mis, waardoor klikken uit mailings als direct binnenkomen met M_BT= in de URL. Alleen op hostnames udenhout.nl en www.udenhout.nl.

## Welke events tellen als lead (Van den Udenhout)
- Alle events met "lead" in de naam, waaronder: generate_lead_proefrit, generate_lead_offerte, generate_lead_onderhoudsofferte, generate_lead_verhuur, generate_lead_privatelease, generate_lead_private_lease, generate_lead_zakelijk_lease, generate_lead_zakelijk_offerte, generate_lead_leasecontact, generate_lead_werkplaats.
- generate_lead_vacature is een sollicitatie, geen autolead: apart noemen.
- bedanktpagina_werkplaatsplanner telt als lead (werkplaatsafspraak) maar is veel groter dan de rest; apart noemen.
- Op proefrit-, offerte-, private lease- en financieringsformulieren zitten de parameters customevent_car_brand en customevent_car_model: daarmee is te zien voor welk merk en model de lead was.

## Andere interessante events (aanvullen)
- (in te vullen door de eigenaar: bijv. klik op telefoonnummer, WhatsApp, routebeschrijving, formulier gestart)`,

    data_leads: `## Wat de tabel is
- marketing_analyse_leads: de nachtelijke kopie van het sheet-tabblad "Data leads" (Syntec), **alleen van toepassing op Van den Udenhout**.
- Zes kolommen, 1-op-1 zoals in de sheet: Ordersoort, Onderwerp, Kanaalgroep, Merk, Model, Aangelegd. Alleen de laatste 365 dagen; rijen met "FW:" in Onderwerp zijn er al uit.
- Eén rij is één lead, geteld op Aangelegd. De sheet loopt een à twee dagen achter.

## De kolommen
- **Kanaalgroep**: "Internet" = online lead; Showroom, Acquisitie, Mail en Telefoon = offline.
- **Merk / Model**: het model staat op veel manieren geschreven ("A2", "A2 e-tron", "AUDI A2 E-TRON"). Zoek breed op het model, controleer het merk en noem welke modelwaarden je meetelt.
- **Ordersoort**: (in te vullen door de eigenaar: welke waarden er zijn en wat ze betekenen).
- **Onderwerp**: de omschrijving van de aanvraag; hieruit volgt welk soort lead het is.

## Soort lead (in te vullen door de eigenaar)
- Hoe je uit Onderwerp en Ordersoort afleidt of een lead een proefrit, offerte, private lease, inruil, werkplaats enz. is.`,

    kanaalkosten: `- Tabel dataloket.lead_kanaalkosten: maandkosten per GA4-sessiebron/medium die niet in de advertentieaccounts staan (bijv. gaspedaal.nl / referral). Maand = eerste dag van de maand.
- Verdeling over sessies: kosten per sessie = maandbedrag ÷ alle sessies van die bron/medium in die maand (op de GA4-property van het bedrijf). Campagnekosten = Σ kosten per sessie × sessies van die bron/medium op de campagnepagina('s) binnen de periode.
- Lopende maand: het maandbedrag naar rato van de verstreken dagen (t/m gisteren), gedeeld door de sessies t/m gisteren.
- **Niet bij een campagne-analyse** (besluit van de eigenaar, november 2026): de kosten van een campagne zijn alleen de mediakosten uit de advertentieplatformen. Alleen een rapportage mag deze kosten gebruiken, en dan apart genoemd naast de mediakosten.`,
  },
};
