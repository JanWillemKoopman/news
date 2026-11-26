import type { SemantiekInhoud } from "./types";

/**
 * De startinhoud van de semantic layer voor Marketing analyse.
 *
 * Geldt zolang er in `marketing_analyse_semantiek` niets is opgeslagen; de eigenaar vult aan
 * en corrigeert in het dashboard (knop Semantic layer), en elke opslag is een nieuwe versie.
 * De inhoud komt uit CLAUDE.md en het onderzoek naar de Audi A2 (november 2026). Waar
 * "(controleren)" staat, is de koppeling afgeleid en nog niet bevestigd. De leadregel (één bron:
 * GA4 standaard, Syntec alleen als het doel dat zegt, met Kanaalgroep Internet en udenhout.nl)
 * staat in Algemeen, Google Analytics 4 en Data leads; besluit van 25 november 2026. De
 * orderregel (bron Syntec orders, altijd uitgesplitst per klantgroep) staat in Algemeen en in het
 * blok Syntec orders; verzoek van de eigenaar van dezelfde dag. Het overzicht van alle leads en
 * orders (views marketing_analyse_leads_soort en _orders_type) staat in Algemeen, Data leads en
 * Syntec orders, en de benchmarkgroep van campagnepagina's in GA4 (versie 5, plan §22). Het blok
 * Werving hoort bij de opzet HRM analyse (versie 7, 26 november 2026; hrm-analyse-onderzoek.md).
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
- **Van den Udenhout**: advertentieaccounts, organische social media en GA4 via Windsor, én uit Syntec de leads (tabel marketing_analyse_leads, de kopie van "Data leads") en de orders (bron **Syntec orders**: tabel marketing_analyse_orders, de kopie van "Data orders"). Het leadcijfer van een Campagne analyse komt uit precies één van GA4 en Syntec-leads: zie "Leads bij een Campagne analyse" hieronder. Voor de orders: zie "Orders bij een Campagne analyse".
- **Alle andere bedrijven** (Porsche Centrum Brabant, Porsche Centrum Maastricht, PGZ, Bentley Maastricht, VELOO, Instra): de Syntec-leads en Syntec-orders zijn **niet van toepassing**. Voor leads kijk je **alleen naar GA4**; orders zijn er niet. Zeg dat in de analyse in plaats van een nul te tonen.

## Leads bij een Campagne analyse (harde regel)
Besluit van de eigenaar, 25 november 2026. Het leadcijfer van een Campagne analyse (het getal dat tegen het doel staat, in de kerncijfers leadsDoel) komt altijd uit **precies één bron: Google Analytics óf Syntec**. Nooit opgeteld, nooit gemengd.
1. **Standaard Google Analytics.** Staat in het veld "Doel van de campagne" niet expliciet dat het doel uit Syntec komt, dan tel je de leads in GA4: de lead-events van de soort uit het doel, in sessies die op de campagnepagina('s) begonnen. Voorbeeld: "20 proefritten" betekent 20 proefritleads op de website (generate_lead_proefrit). Welke events bij welke soort horen staat in het blok Google Analytics 4.
2. **Syntec alleen als het doel dat expliciet zegt** (bijv. "20 proefritten uit Syntec", "doel gemeten in Syntec"). Dan tel je uitsluitend leads die aan **alle** voorwaarden voldoen:
   - Kanaalgroep = "Internet";
   - Kanaal **of** Onderwerp bevat "udenhout.nl" (hoofdletterongevoelig);
   - het merk en de modellen uit de briefing, binnen de periode;
   - de soort uit het doel.
   Tel ze in de view **marketing_analyse_leads_website**: die past de eerste twee voorwaarden al toe en geeft de soort (zie het blok Data leads). Tel nooit rechtstreeks in marketing_analyse_leads.
3. Syntec kan alleen bij een analyse die **uitsluitend over Van den Udenhout** gaat. Noemt het doel Syntec bij een ander bedrijf, tel dan in GA4 en meld dat bij de datakwaliteit.
4. **De soort volgt het doel**: proefritten → alleen proefritleads; offertes → alleen offertes; private lease → alleen private lease; "leads" of geen soort → alle autoleads. Noem in de analyse welke soort en welke bron je hebt geteld (leadBron, leadsDoelSoort).
5. De andere bron mag als **context** in zijn eigen stap staan (Conversies of Leads in Syntec), duidelijk apart. Hij telt nooit mee in het leadcijfer en nooit in het oordeel over het doel.

## Orders bij een Campagne analyse (harde regel)
Verzoek van de eigenaar, 25 november 2026. De bron **Syntec orders** (marketing_analyse_orders) telt de verkochte auto's. Eén rij is één auto, geteld op de orderdatum.
1. Alleen bij een analyse die **uitsluitend over Van den Udenhout** gaat. Bij een ander bedrijf laat je de orders weg.
2. Tel in de view **marketing_analyse_orders_klant**: de verkoop aan klanten (Ordersoort Nieuw of Gebruikt). **Handel** telt daar niet in mee; noem het aantal Handel-orders hoogstens apart, uit marketing_analyse_orders.
3. Filter op het merk en de modellen uit de briefing en op de periode (orderdatum_op). Noem welke modelwaarden je meetelt.
4. **Splits de orders altijd uit per klantgroep** (kolom klantgroep_naam; een lege klantgroep heet "Geen klantgroep", zodat de uitsplitsing optelt tot het totaal), en daarnaast in Nieuw en Gebruikt. Die uitsplitsing staat in elke analyse waarin orders voorkomen: in de stap Orders in Syntec, en noem de grootste klantgroepen ook in de bevindingen.
5. Orders zijn **niet** het leadcijfer en tellen nooit mee in leadsDoel. Gaat het doel over verkochte auto's of orders ("30 verkochte auto's"), dan beoordeel je het doel op de orders en zeg je dat in de toelichting bij het doel.
6. Er is **geen koppeling tussen een lead en een order**. Een order voor merk en model in de periode is dus niet per se door de campagne gekomen: schrijf "orders voor <model> in de periode", niet "orders uit de campagne". Een verhouding orders/leads is hoogstens een indicatie, en een order volgt vaak weken na de lead.

## Overzicht van alle leads en orders (altijd, Van den Udenhout)
Verzoek van de eigenaar, 25 november 2026. Naast het leadcijfer tegen het doel wil hij bij elke analyse die uitsluitend over Van den Udenhout gaat zien wat het merk en de modellen **in totaal** deden in Syntec, in de periode van de analyse:
1. **Leads in Syntec** (view marketing_analyse_leads_soort): het totaal van **alle leads** voor merk en modellen (alle kanaalgroepen), daarvan hoeveel uit **Internet** (Kanaalgroep "Internet") en hoeveel offline (per kanaalgroep), en van de Internet-leads de verdeling per **soort lead** (proefrit, offerte, private lease, inruil, overig). Daarnaast hoeveel daarvan websiteleads van udenhout.nl zijn (kolom website). Bij veel Internet-leads met soort overig: noem de grootste kanalen (portals zeggen vaak niet wat voor aanvraag het is).
2. **Orders in Syntec** (view marketing_analyse_orders_type): het totaal van **alle orders** voor merk en modellen, ook Handel en verhuur, met de uitsplitsing per **ordertype** (koop particulier, koop zakelijk, private lease, zakelijke lease, verhuur (Rent), demo, handel, overig). Daaronder blijft de tabel per klantgroep van de verkoop aan klanten staan (zie hierboven).
3. Dit overzicht is **context**. Het leadcijfer tegen het doel blijft uit één bron komen (zie "Leads bij een Campagne analyse"); het totaal van alle leads of orders telt daar nooit in mee.
4. Zoek merk en model in leads en orders op dezelfde manier en noem welke modelwaarden je meetelt. Leads en orders van hetzelfde model kunnen anders geschreven zijn (zie de blokken Data leads en Syntec orders).

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
- Let op valse treffers: een korte modelnaam als "A2" komt ook in andere woorden voor. Controleer altijd merk, model en periode.

## Campagnevoorstellen
Aanvullingen van de eigenaar voor de zoekronde naar live actiecampagnes (skill campagne-voorstellen). De skill oordeelt zelf en leest dit als leidraad. Denk aan:
- wat bij een bedrijf wel of niet als campagnepagina telt (bijv. "pagina's onder /acties zijn altijd campagnepagina's");
- campagnes die altijd aan staan en geen voorstel hoeven (branding, vacatures, algemene voorraad- en servicecampagnes);
- hoe een bureau de campagnenamen opbouwt.`,

    google_ads: `- Campagnetypes: Search, Performance Max, Demand Gen en Display. Het type staat vaak vóór in de naam ("Demand Gen | …").
- Google levert geen eigen leadveld: het leadcijfer zit in de conversies (conversie-acties die in Google Ads zijn ingesteld). Gebruik conversies alleen als aanvulling; GA4 is leidend voor wat er op de website gebeurt.
- In GA4 komt Google Ads-verkeer binnen als "google / cpc"; Performance Max en Demand Gen staan in GA4's kanaalgroep soms als "Cross-network".
- Tabel Per platform en campagne (stap Advertenties): Conversies = het veld conversions; Leads = "n.v.t." (Google levert geen leadveld).`,

    meta_ads: `- Eén account per bedrijf (zie Algemeen); Meta Ads omvat Facebook, Instagram, Messenger en Audience Network.
- Advertentienamen: "PR" = prospecting (nieuwe doelgroep), "RT" = retargeting. Vergelijk die twee apart.
- UTM-opbouw: utm_source=facebook, utm_medium=paid, utm_campaign = campagnenaam, utm_content = advertentienaam, utm_term = advertentieset.
- Meta-leads (actions_lead) zijn de eigen telling van Meta (leadformulieren, Messenger en pixel samen). GA4 en Syntec zijn leidend; laat verschillen zien.
- Bereik is niet op te tellen over dagen of platforms: vraag het periodebereik op zonder dagindeling.
- Tabel Per platform en campagne (stap Advertenties): Leads = actions_lead. Conversies = de websiteconversies van de pixel (offsite_conversion) die niet al onder lead vallen; zijn die er niet of niet te onderscheiden, dan "n.v.t." en meld je het bij de datakwaliteit. (Voorlopige keuze; de eigenaar kan hem aanpassen.)`,

    linkedin_ads: `- LinkedIn Ads wordt weinig gebruikt (kleine budgetten).
- De utm_campaign in GA4 is vaak een korte slug (bijv. "vriendenprijs") terwijl de campagne bij LinkedIn langer heet: koppel op inhoud en periode, niet alleen op exacte naam.
- Tabel Per platform en campagne (stap Advertenties): Leads = de leads uit leadformulieren; Conversies = externe websiteconversies als die zijn ingesteld, anders "n.v.t.".`,

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

## Benchmark: welke pagina's zijn campagnepagina's
- Voor de vergelijking met eigen historie (benchmark per blok) tellen als campagnepagina's van Van den Udenhout: alle pagina's onder **/acties/** op udenhout.nl met minstens **200 sessies** in hun eigen looptijd, **behalve** acties voor after sales en service (onderhoud, APK, werkplaats, banden, winter- of zomercheck). Neem de pagina van de campagne zelf niet op in de groep.
- Vergelijk per pagina over de eigen looptijd (eerste tot laatste dag met sessies), dus in verhoudingen (per sessie, per klik), niet in totalen. Noem in de benchmark de groep en het aantal pagina's; onder vijf pagina's geen benchmark.

## E-mailverkeer herkennen
- E-mail = session_default_channel_group = "Email" **of** (session_source_medium = "(direct) / (none)" **en** landing_page_plus_query_string bevat "M_BT="). Reden: de tracking vanuit Selligent ging mis, waardoor klikken uit mailings als direct binnenkomen met M_BT= in de URL. Alleen op hostnames udenhout.nl en www.udenhout.nl.

## Welke events tellen als lead (Van den Udenhout)
- Alle events met "lead" in de naam, waaronder: generate_lead_proefrit, generate_lead_offerte, generate_lead_onderhoudsofferte, generate_lead_verhuur, generate_lead_privatelease, generate_lead_private_lease, generate_lead_zakelijk_lease, generate_lead_zakelijk_offerte, generate_lead_leasecontact, generate_lead_werkplaats.
- generate_lead_vacature is een sollicitatie, geen autolead: apart noemen.
- bedanktpagina_werkplaatsplanner telt als lead (werkplaatsafspraak) maar is veel groter dan de rest; apart noemen.
- Op proefrit-, offerte-, private lease- en financieringsformulieren zitten de parameters customevent_car_brand en customevent_car_model: daarmee is te zien voor welk merk en model de lead was.

## Leads tegen het doel (Campagne analyse)
Standaard komt het leadcijfer uit GA4 (zie Algemeen, "Leads bij een Campagne analyse"). Tel alleen de events van de soort uit het doel, in sessies die op de campagnepagina('s) begonnen:
- **proefritten**: generate_lead_proefrit;
- **offertes**: generate_lead_offerte (generate_lead_zakelijk_offerte alleen als het doel over zakelijk gaat);
- **private lease**: generate_lead_privatelease + generate_lead_private_lease;
- **zakelijke lease**: generate_lead_zakelijk_lease + generate_lead_zakelijk_offerte + generate_lead_leasecontact;
- **"leads" of geen soort (alle autoleads)**: alle lead-events uit de lijst hierboven, behalve generate_lead_vacature, generate_lead_HMODH ("Houd me op de hoogte") en bedanktpagina_werkplaatsplanner; die noem je apart.
- Vóór april 2026 heetten de events anders (generate_lead_proefrit_aanvraag, generate_lead_offerte_aanvraag): tel die mee als de periode daarvoor ligt.
Passen de parameters customevent_car_brand en customevent_car_model niet bij het merk en model uit de briefing, dan tellen ze niet mee; noem hoeveel events geen model hadden.

## Andere interessante events (aanvullen)
- (in te vullen door de eigenaar: bijv. klik op telefoonnummer, WhatsApp, routebeschrijving, formulier gestart)`,

    data_leads: `## Wat de tabel is
- marketing_analyse_leads: de nachtelijke kopie van het sheet-tabblad "Data leads" (Syntec), **alleen van toepassing op Van den Udenhout**.
- Zeven kolommen, 1-op-1 zoals in de sheet: Kanaal, Ordersoort, Onderwerp, Kanaalgroep, Merk, Model, Aangelegd. Alleen de laatste 365 dagen; rijen met "FW:" in Onderwerp zijn er al uit.
- Eén rij is één lead, geteld op Aangelegd. De sheet loopt een à twee dagen achter.

## Welke Syntec-leads tellen (Campagne analyse)
- Alleen als het doel in de briefing expliciet zegt dat het uit Syntec komt; anders komt het leadcijfer uit GA4 (zie Algemeen, "Leads bij een Campagne analyse").
- Dan telt een lead alleen als **Kanaalgroep = "Internet"** én **Kanaal of Onderwerp "udenhout.nl" bevat** (hoofdletterongevoelig). Dat zijn de websiteleads van udenhout.nl. Leads via merksites (Volkswagen.nl, Audi.nl …), portals (Autoscout24, ViaBOVAG …), WhatsApp of de showroom tellen niet.
- De view **marketing_analyse_leads_website** past die voorwaarde toe en heeft een kolom **soort**. Tel altijd daarin, filter op merk, model, periode (aangelegd_op) en soort.
- Ter vergelijking (laatste 365 dagen, november 2026): 38.296 leads in de kopie, waarvan 7.217 websiteleads van udenhout.nl, waarvan 2.236 proefritten. In de praktijk staat "Udenhout.nl" in Kanaal ("Udenhout.nl", "Udenhout.nl proefritaanv.", "Udenhout.nl offerteaanv." …); in Onderwerp kwam het in dat jaar niet voor.

## Overzicht van alle leads (altijd)
- Tel het totaal in de view **marketing_analyse_leads_soort**: alle leads uit de kopie met de kolommen **soort** (zelfde regel als hieronder), **internet** (Kanaalgroep "Internet"), **website** (Internet én udenhout.nl, gelijk aan de view marketing_analyse_leads_website) en **kanaalgroep_naam** ("Geen kanaalgroep" als hij leeg is). Filter op merk, model en periode (aangelegd_op).
- Laat zien: alle leads; Internet tegen offline (offline per kanaalgroep); Internet per soort; en daarvan de websiteleads.
- Ter vergelijking (laatste 365 dagen, 25 november 2026): 31.079 leads, waarvan 14.581 Internet (7.217 websiteleads van udenhout.nl) en offline 21.714 Showroom, 946 Acquisitie, 654 Mail en 400 Telefoon. Internet per soort: overig 6.319, proefrit 3.219, offerte 2.706, private lease 1.754, inruil 583. Van de websiteleads: offerte 2.619, proefrit 2.236, private lease 1.511, overig 638, inruil 213.
- Bij Internet is overig groot omdat merksites en portals (Volkswagen.nl, Autoscout24, Gaspedaal …) vaak niet zeggen wat voor aanvraag het is. Noem dan de grootste kanalen.

## De kolommen
- **Kanaal**: waar de lead binnenkwam ("Udenhout.nl", "Udenhout.nl proefritaanv.", "Volkswagen.nl", "CST" …). Tot april 2026 had elk formulier van udenhout.nl een eigen kanaal; sindsdien komt alles binnen onder "Udenhout.nl" en zegt Onderwerp wat het is.
- **Kanaalgroep**: "Internet" = online lead; Showroom, Acquisitie, Mail en Telefoon = offline.
- **Merk / Model**: het model staat op veel manieren geschreven ("A2", "A2 e-tron", "AUDI A2 E-TRON"). Zoek breed op het model, controleer het merk en noem welke modelwaarden je meetelt.
- **Ordersoort**: Nieuw of Gebruikt.
- **Onderwerp**: de omschrijving van de aanvraag ("Proefrit aanvraag", "Offerte private lease" …).

## Soort lead (kolom soort in de view)
Uit Onderwerp en Kanaal samen, in deze volgorde (de eerste die past):
1. bevat "proefrit" → **proefrit**;
2. bevat "private lease" of "privatelease" → **private lease**;
3. bevat "offerte" → **offerte**;
4. bevat "inruil" → **inruil**;
5. anders → **overig** (contact, bel-me-terug, chat en dergelijke).
Gecontroleerd in november 2026: dit klopt voor 99,9% met de kolom Lead type in Syntec. Een doel in "leads" zonder soort telt alle soorten.`,

    data_orders: `## Wat de tabel is
- marketing_analyse_orders (bron **Syntec orders**): de nachtelijke kopie van het sheet-tabblad "Data orders" (Syntec), **alleen van toepassing op Van den Udenhout**.
- Vijf kolommen, 1-op-1 zoals in de sheet: Ordersoort, Klantgroep, Merk, Model, Orderdatum (plus orderdatum_op als datum). Alleen de laatste 365 dagen.
- **Eén rij is één verkochte auto**, geteld op Orderdatum (een datum zonder tijd). Twee gelijke rijen zijn twee auto's.
- De sheet begint op 1 januari 2026 en loopt achter: op 25 november 2026 was de laatste orderdatum 14 november. Controleer altijd max(orderdatum_op) en meld tot wanneer de orders lopen. Een recente week ziet er daardoor lager uit dan hij is.
- Ter vergelijking (1 januari t/m 14 november 2026): 12.926 orders, waarvan 8.134 Nieuw, 3.080 Gebruikt en 1.712 Handel.

## Welke orders tellen (Campagne analyse)
- Tel in de view **marketing_analyse_orders_klant**: alleen Ordersoort Nieuw en Gebruikt (de verkoop aan klanten), met de kolom **klantgroep_naam** ("Geen klantgroep" als de klantgroep leeg is). Filter op merk, model en periode (orderdatum_op).
- **Handel** (1.712 in 2026) is geen verkoop aan een klant en heeft bijna nooit een klantgroep. Hij staat niet in de view; noem hem alleen apart, uit marketing_analyse_orders.
- Zie Algemeen, "Orders bij een Campagne analyse", voor de regels: alleen Van den Udenhout, nooit in het leadcijfer, geen koppeling met leads.

## Klantgroep (altijd uitsplitsen)
- De uitsplitsing per klantgroep staat **altijd** in de analyse als er orders in voorkomen: een tabel met per klantgroep het aantal en het aandeel, met een totaalregel, en daarnaast Nieuw en Gebruikt.
- Noem de klantgroepen letterlijk zoals in Syntec. Voeg je ze samen (bijv. alle leasevormen), zeg dan welke klantgroepen je samenvoegt; de letterlijke tabel blijft staan.
- Nieuw en Gebruikt samen, 1 januari t/m 14 november 2026: Koop Particulier (BM) 3.152; Dealer Lease 2.098; Koop Zakelijk (BM) 1.390; Lease 1.000; Private Groeilease 927; Restmarge deal 503; Rent 461; Private lease 360; Demo 275; Occasion-Lease 192; Restmarge Dealer Lease 40; Rentals ext 15; Geen klantgroep 33; kleine groepen (PARTICULIER_TB, Handel, BEDRIJF_TB, Dealerlease Zakelijk_TB, Centrale Bestelling) samen 17.
- De klantgroepen die met "Cupra - " beginnen (Uni Lease - Zakelijk, Dealer Lease - Zakelijk, BM ovg Particulier, BM ovg Zakelijk, Euromobi - Koop, Dealer Lease - Private Lease, Uni Lease - Private Lease; samen 751) horen allemaal bij CUPRA. CUPRA heeft dus eigen klantgroepen naast de algemene.
- Gebruikt verkoopt vooral als Koop Particulier (BM) (2.037 van 3.080); Nieuw verdeelt zich over veel lease- en koopvormen.

## Ordertype (altijd een totaal met uitsplitsing)
- Tel het totaal van **alle orders** in de view **marketing_analyse_orders_type**: alle orders uit de kopie (ook Handel en verhuur) met de kolom **ordertype** en de vlag **klantorder** (Nieuw of Gebruikt). Filter op merk, model en periode (orderdatum_op).
- Indeling (Handel op ordersoort, de rest op klantgroep):
  - **Koop particulier**: Koop Particulier (BM), Cupra - BM ovg Particulier, PARTICULIER_TB;
  - **Koop zakelijk**: Koop Zakelijk (BM), Cupra - BM ovg Zakelijk, BEDRIJF_TB;
  - **Private lease**: Private lease, Private Groeilease, Cupra - Dealer Lease - Private Lease, Cupra - Uni Lease - Private Lease;
  - **Zakelijke lease**: Dealer Lease, Lease, Occasion-Lease, Restmarge Dealer Lease, Cupra - Uni Lease - Zakelijk, Cupra - Dealer Lease - Zakelijk, Dealerlease Zakelijk_TB;
  - **Verhuur (Rent)**: Rent, Rentals ext;
  - **Demo**: Demo;
  - **Handel**: Ordersoort Handel (of klantgroep Handel);
  - **Overig**: Restmarge deal, Centrale Bestelling, Cupra - Euromobi - Koop en een lege klantgroep.
- "Dealer Lease" is zakelijke lease (leasemaatschappij via de dealer). Klopt dat voor een campagne niet, zeg dat en laat de klantgroepentabel het detail geven.
- **Verhuur (Rent) noem je altijd apart**: dat zijn auto's voor de eigen verhuurvloot of een verhuurder, geen verkoop aan een eindklant. Ze staan wel in marketing_analyse_orders_klant (Ordersoort Nieuw); tel ze daar mee in het klanttotaal maar zeg hoeveel het er waren.
- Ter vergelijking (1 januari t/m 14 november 2026, alle merken): 12.926 orders: zakelijke lease 3.707, koop particulier 3.315, handel 1.716, koop zakelijk 1.502, private lease 1.329, overig 606, verhuur (Rent) 476, demo 275.

## De kolommen
- **Ordersoort**: Nieuw, Gebruikt of Handel.
- **Klantgroep**: aan welke klantgroep de auto is verkocht (zie hierboven).
- **Merk**: de eigen merken staan netjes (Volkswagen, Škoda, Audi, CUPRA, Volkswagen Bedrijfswagens, SEAT, Porsche); andere merken in hoofdletters (FORD, TOYOTA …), vooral bij Gebruikt en Handel. "Onbekend", "Y" en "P" zijn opvulwaarden.
- **Model**: staat op veel manieren geschreven ("Polo (6)", "up! (2) GP", "ID. Buzz"). Een model kan in de orders anders heten dan in de leads en de campagne: de Audi A2 e-tron staat in de orders als "A2 e-tron (A1)". Zoek breed op het model, controleer het merk en noem welke modelwaarden je meetelt.
- **Orderdatum**: de datum van de order, zonder tijd.
- Niet in de kopie (bewust): Brandstof, Uitvoering, de weeknummers, Autoline Magic en Campagnes. De kolom Campagnes is een formule in de sheet en zegt niet welke campagne de verkoop bracht.`,

    kanaalkosten: `- Tabel dataloket.lead_kanaalkosten: maandkosten per GA4-sessiebron/medium die niet in de advertentieaccounts staan (bijv. gaspedaal.nl / referral). Maand = eerste dag van de maand.
- Verdeling over sessies: kosten per sessie = maandbedrag ÷ alle sessies van die bron/medium in die maand (op de GA4-property van het bedrijf). Campagnekosten = Σ kosten per sessie × sessies van die bron/medium op de campagnepagina('s) binnen de periode.
- Lopende maand: het maandbedrag naar rato van de verstreken dagen (t/m gisteren), gedeeld door de sessies t/m gisteren.
- **Niet bij een campagne-analyse** (besluit van de eigenaar, november 2026): de kosten van een campagne zijn alleen de mediakosten uit de advertentieplatformen. Alleen een rapportage mag deze kosten gebruiken, en dan apart genoemd naast de mediakosten.`,

    werving: `## Wat telt als wervingscampagne
- Een campagne is werving als de naam "Vacature" of "Vacatures", "Werving" of "Meeloopdag" bevat, of begint met "LL14--" (hoofdletters tellen niet). Zo heten ze in Meta Ads ("4. Vacatures - Werkplaats - Leads") en Google Ads ("T | Vacature - Monteur", "T | Vacatures - Techniek").
- **Geen werving**: after sales campagnes met "Werkplaats" in de naam maar zonder Vacature, zoals "3. Acties - Werkplaatscampagne - 2026" (Porsche).
- LinkedIn Ads draaide in 2026 geen werving. Kijk het toch elke keer na en zeg het als er een wervingscampagne bijkomt.

## Welk bedrijf (besluit van de eigenaar, 25 november 2026)
- Meta "Van den Udenhout" (69324444) en Google Ads "Udenhout" (210-769-6929): **Van den Udenhout**. Uitzondering: een campagne met "Instra" in de naam is **Instra**, met "Caromi" in de naam is **Caromi**. Die werven via het Meta-account van Van den Udenhout.
- Meta "Porsche Groep Zuid" (293327521823561) en Google Ads "Porsche Centrum Brabant B.V." (846-005-3447): een eigen regel **Porsche Groep Zuid**, voor Porsche Centrum Brabant en PGZ samen. Niet per campagne verdelen, ook niet als PCB of PGZ in de naam staat.
- Meta "Porsche centrum Maastricht" (315013592825616) en Google Ads 383-831-5062: **Porsche Centrum Maastricht**.
- Meta "Veloo" (1662865740824278): **VELOO**. Meta "Bentley Maastricht" (192180818785600): **Bentley Maastricht**.
- Meta "PGZ" (744220736319839): **PGZ**. In 2026 draaide hier geen werving.

## Leads via social media
- Leadcijfer = Meta \`actions_lead\` van de wervingscampagnes. Splits uit in \`actions_onsite_conversion_lead_grouped\` (leadformulier of Messenger in Facebook en Instagram) en \`actions_offsite_conversion_fb_pixel_lead\` (pixel op de website). Die twee tellen op tot \`actions_lead\`.
- Een lead is interesse, geen sollicitatie. Wat HR ermee doet (gesprek, aanname) staat niet in Windsor; schrijf "leads", nooit "sollicitanten".
- Google Ads levert geen leads. Gebruik de conversies van de Google-vacaturecampagnes niet: Van den Udenhout telt sollicitaties daar niet als conversie.
- Kosten per lead = Meta-uitgaven ÷ Meta-leads over dezelfde periode, nooit met Google-uitgaven erbij.

## Sollicitaties op de website (GA4)
- Sollicitatie = event \`generate_lead_vacature\`, geteld met \`event_count\`:
  - udenhout.nl, property "GA4_https://udenhout.nl" (255949462): **vanaf 10 juni 2026**;
  - pgz.nl, property "www.pgz.nl" (405407306): **vanaf 27 mei 2026**.
- Oudere events tellen niet mee en staan niet in de weekgrafiek: op udenhout.nl \`snelsolliciteren_verzonden\` en \`generate_lead_snelsolliciteren\` (t/m april 2026), op pgz.nl \`job_application\` (t/m januari 2026; \`job_application_click_mailto\` en \`_click_tel\` zijn klikken). Noem in datakwaliteit vanaf wanneer gemeten wordt.
- Porsche Centrum Brabant (306403800), Porsche Centrum Maastricht (306394313), Bentley Maastricht (435349999) en VELOO (381559171) meten **geen** sollicitatie. Zet daar "niet gemeten" (tekst), nooit 0. Klikken op e-mail of telefoon op een vacaturepagina zijn geen sollicitaties.
- Gebruik de property "JP.cars clicks" (469094476) niet: die telt dezelfde pagina's van Porsche Centrum Brabant nog een keer.
- Het event valt op udenhout.nl op \`/vacatures\`; een losse vacature heeft geen eigen \`page_path\`, dus per vacature tellen kan niet.
- Herkomst: \`session_source_medium\` en \`campaign\` × \`event_count\`, ingedeeld in: Google Ads merkcampagne ("T | Branding VDU", ook via bing / cpc), Google Ads vacaturecampagnes (campagne met Vacature), overige Google Ads, Google organisch, Bing, Direct, Google Bedrijfsprofiel (\`gmb / organic\`), Meta Ads (\`facebook / paid\`, \`fb / paid\`, \`meta / paid\`), social verwijzing (facebook.com, m.facebook.com, l.facebook.com, lm.facebook.com, l.instagram.com, \`ig / social\`), vacaturesites (stagemarkt, leerbanenmarkt, onze-jobs, uw-stad-werkt, jobleads, vacatures.roc) en overig.

## Vacaturepagina's
- Sessies op pagina's met "vacature", "werken-bij", "werkenbij" of "solliciteren" in \`page_path\`, per property. Belangrijkste pagina's: udenhout.nl \`/vacatures\`, \`/vacatures/waarom-werken-bij\`, \`/vacatures/stage\`, de landingspagina's voor alternatieve doelgroepen (\`/vacatures/hobby\`, \`/vacatures/bouw\`, \`/vacatures/oss\`) en \`/vacatures/meeloopdagen\`; Porsche Brabant en Maastricht \`/over-ons-contact/vacatures\` en \`/werken-bij-porsche\`; pgz.nl \`/vacatures\`; Bentley \`/contact/vacatures\`; VELOO \`/pages/vacatures\`.

## Functiegroep (uit de campagnenaam)
De eerste groep die past, in deze volgorde:
1. **Instroom en opleiding**: Stage, BBL, Meeloopdag.
2. **Employer branding**: Branding, Alternatieve doelgroep, Werving Oss, en de algemene campagnes per bedrijf (Vacatures - VELOO, Vacatures - PCM, Vacatures - Bentley Maastricht, Vacatures - Instra, Vacatures - Caromi, "5. OK - Leads … Vacatures", Vacatures_marketing).
3. **Schade**: Schade.
4. **Techniek en werkplaats**: Werkplaats, Technisch, Techniek, Monteur, Automonteur, Fietsmonteur, Fietstechnicus.
5. **Verkoop**: Sales, Verkoop, Verkoper, Lease Functies, Filiaalleider.
6. **Service en logistiek**: Magazijn, Autowasser / Hiker, Gastvrouw, Facilitair, Service Functies.
7. **Kantoor**: Klantenservice, Binnendienst, Administratie, Backoffice, Finance, HR, IT, BI, Marketing.
Past er niets, dan "Overig", en noem de campagne in datakwaliteit.

## Ophalen
- Meta Ads en GA4 **per dag** (\`date\`) ophalen en zelf per ISO-week (maandag t/m zondag) optellen. Opvragen met \`week_iso\` of \`year_week_iso\` liep bij Meta vast; per dag in stukken van een half jaar werkt.
- Instagram-posts gaven in november 2026 een time-out. Lukt het niet, zet dan "niet opgehaald" in datakwaliteit, geen nul.`,
  },
};
