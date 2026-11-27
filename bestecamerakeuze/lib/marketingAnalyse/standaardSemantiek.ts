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
 * Werving hoort bij de opzet HRM campagne (eerst HRM analyse; versie 7, 26 november 2026; hrm-analyse-onderzoek.md). Het blok
 * Google Analytics 4 is gelijk aan versie 11 (26 november 2026): tellen in Windsor, en e-mail als één
 * kanaal dat nooit per deel of per mailing wordt uitgesplitst. Versie 12 (27 november 2026, migratie
 * 0056): de leadkolom van het overzicht (GA4, Syntec internet, Syntec orders) in Algemeen; welke orders
 * tellen bepaalt de briefing, met de verdeling van alle klantgroepen per ordertype in Syntec orders; de
 * internetleads in Data leads; Syntec ook bij Van den Udenhout naast een ander bedrijf ("alleen VDU").
 * Versie 13 (27 november 2026, migratie 0057): het blok Maandrapport Jana (accounts per tabblad, leadregels,
 * bereik, uitgaven met het tijdelijke jaarbudget, top content, campagnetabel).
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
- **Van den Udenhout samen met een ander bedrijf**: de Syntec-leads en -orders gelden dan alleen voor het deel Van den Udenhout. Tel ze wel en zeg overal "alleen Van den Udenhout" (besluit van de eigenaar, 27 november 2026). Het leadcijfer tegen het doel komt dan altijd uit GA4 (zie hieronder).

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
1. Alleen als **Van den Udenhout** in de briefing staat (bij meer bedrijven alleen dat deel; zeg dan "alleen Van den Udenhout"), en alleen als de briefing een **merk en minstens één model** heeft: daarop zoek je de orders op. Ontbreekt merk of model, laat de orders dan weg (ordersSyntec null) en zeg in de datakwaliteit dat merk of model in de briefing ontbreekt. Bij een ander bedrijf laat je de orders weg.
2. **Welke orders tellen, zegt de briefing** (besluit van de eigenaar, 27 november 2026). Zegt de briefing (doel of omschrijving) er niets over, dan tellen **alle klantgroepen** van Ordersoort **Nieuw én Gebruikt**: de hele view **marketing_analyse_orders_klant**. Zegt de briefing dat alleen een deel telt ("alleen koop particulier", "alleen nieuw", "zonder lease"), dan tel je alleen dat deel; welke klantgroepen bij welk ordertype horen staat in het blok Syntec orders ("Welke orders tellen: de verdeling"). **Handel** (Ordersoort Handel) telt alleen als de briefing erom vraagt; noem het aantal anders hoogstens apart, uit marketing_analyse_orders. Zeg in de kerncijfers (ordersSoort) en in de stap Orders in Syntec in gewone taal wat je telde, en welke zin uit de briefing dat bepaalde.
3. Filter op het merk en de modellen uit de briefing en op de periode (orderdatum_op). Noem welke modelwaarden je meetelt.
4. **Splits de orders altijd uit per klantgroep** (kolom klantgroep_naam; een lege klantgroep heet "Geen klantgroep", zodat de uitsplitsing optelt tot het totaal), en daarnaast in Nieuw en Gebruikt. Die uitsplitsing staat in elke analyse waarin orders voorkomen: in de stap Orders in Syntec, en noem de grootste klantgroepen ook in de bevindingen.
5. Orders zijn **niet** het leadcijfer en tellen nooit mee in leadsDoel. Het doel van een Campagne analyse gaat **altijd over leads**, nooit over orders (besluit van de eigenaar, 27 november 2026): de orders zijn context naast de leads.
6. Er is **geen koppeling tussen een lead en een order**. Een order voor merk en model in de periode is dus niet per se door de campagne gekomen: schrijf "orders voor <model> in de periode", niet "orders uit de campagne". Een verhouding orders/leads is hoogstens een indicatie, en een order volgt vaak weken na de lead.

## Leads en orders in het overzicht (kerncijfers)
Besluit van de eigenaar, 27 november 2026. De regel van een Campagne analyse in het overzicht toont onder elkaar:
1. **Google Analytics** (leadsGa4): de lead-events van de soort uit het doel, in sessies die op de campagnepagina('s) begonnen. Altijd, bij elk bedrijf, ook als het leadcijfer tegen het doel uit Syntec komt.
2. **Syntec internet** (leadsInternet, leadsInternetSoort): leads met **Kanaalgroep "Internet"** (alle kanalen daarbinnen: udenhout.nl, merksites en portals) voor het merk en de modellen uit de briefing, in de periode. De soort volgt de briefing: noemt het doel of de omschrijving een soort ("20 proefritten"), dan die soort; anders alle soorten. Zie het blok Data leads.
3. **Syntec orders** (ordersSyntec, ordersSoort): zie "Orders bij een Campagne analyse" hierboven.
Punt 2 en 3 alleen als Van den Udenhout in de briefing staat én de briefing een merk en minstens één model heeft; anders null (het dashboard vraagt dan zelf om merk en model, of meldt dat er bij dat bedrijf geen Syntec-data is). Bij meer bedrijven alleen het deel Van den Udenhout.

## Overzicht van alle leads en orders (altijd, Van den Udenhout)
Verzoek van de eigenaar, 25 november 2026. Naast het leadcijfer tegen het doel wil hij bij elke analyse met Van den Udenhout (bij meer bedrijven alleen dat deel) zien wat het merk en de modellen **in totaal** deden in Syntec, in de periode van de analyse:
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
- landing_page is het pad zonder querystring. Groepeer altijd op landing_page. Gebruik landing_page_plus_query_string alleen als filter (bijv. voor M_BT), anders levert elke trackingparameter een aparte rij op. Voeg paden samen die alleen verschillen in een slash aan het eind of in hoofdletters.
- Sessies tellen op over dagen, gebruikers niet.
- **Een voorraadpagina (/auto/<merk>/<model>/…) is nooit de campagnepagina van een actiecampagne** (Campagne analyse; besluit van de eigenaar, november 2026). Het zijn detailpagina's van voorraadauto's, vooral via Gaspedaal. Tel sessies die daar begonnen niet mee, ook niet als het model in het pad staat.

## Benchmark: welke pagina's zijn campagnepagina's
- Voor de vergelijking met eigen historie (benchmark per blok) tellen als campagnepagina's van Van den Udenhout: alle pagina's onder **/acties/** op udenhout.nl met minstens **200 sessies** in hun eigen looptijd, **behalve** acties voor after sales en service (onderhoud, APK, werkplaats, banden, winter- of zomercheck). Neem de pagina van de campagne zelf niet op in de groep.
- Vergelijk per pagina over de eigen looptijd (eerste tot laatste dag met sessies), dus in verhoudingen (per sessie, per klik), niet in totalen. Noem in de benchmark de groep en het aantal pagina's; onder vijf pagina's geen benchmark.

## Tellen in Windsor (gecontroleerd november 2026)
- **Welke filters GA4 zelf toepast** (gecontroleerd 26 november 2026): Windsor stuurt alleen gelijk aan en niet gelijk aan (eq, neq, ook op is_conversion_event) door naar GA4, en alleen zolang er geen ander soort filter in de opvraging staat. Bevat, in en een of-filter (ook op hostname en landing_page_plus_query_string) past Windsor achteraf toe: dan haalt hij dat veld als verborgen dimensie op en krijg je een rij per waarde. Tel die rijen op; voor sessies per hostname, per URL of per landingspagina klopt dat (oktober 2026: 2.457 opgeteld tegen 2.456 in één keer).
- **Unieke sessies met minstens één lead-event**: vraag sessions op met is_conversion_event = "true" en de uitsluitingen als neq (generate_lead_vacature, _HMODH, _nieuwsbrief, _snelsolliciteren, _meeloopdagen, generate_lead, snelsolliciteren_verzonden, sollicitatie_verzonden), zonder event_name als dimensie: dan telt GA4 elke sessie één keer. Een filter op event_name met bevat, in of of splitst per event, en dan telt een sessie met twee lead-events dubbel. Staat er ook een filter in dat Windsor achteraf toepast (hostname, M_BT), dan splitst ook de neq-opvraging per event; het verschil was in oktober 2026 1,8% (5.652 tegen 5.551 op de hele site) en valt binnen de controle hieronder.
- **event_name × sessions** geeft per event het aantal sessies waarin dat event viel. Eén sessie kan bij meerdere events meetellen, dus tel deze sessies nooit op tot een totaal.
- **Key events**: is_conversion_event = "true".
- **Gebruik session_conversion_rate niet.** Windsor levert daar het aantal key events ÷ het aantal sessies, geen percentage sessies: 0,3444 = 250 events ÷ 726 sessies, terwijl 238 sessies een key event hadden.
- **Volgorde**: GA4 levert via Windsor geen volgorde van events binnen een sessie. Schrijf "in dezelfde sessie", niet "daarna". Een landingspagina die zelf een key event afvuurt bij het laden (bijv. een bedankpagina) markeer je.
- **Controle**: vraag een periodetotaal ook op zonder extra dimensies. Wijkt de som van de rijen meer dan 2% af, meld dat dan en gebruik het periodetotaal.

## E-mailverkeer herkennen
- E-mail = session_default_channel_group = "Email" **of** (session_source_medium = "(direct) / (none)" **en** landing_page_plus_query_string bevat "M_BT="). Reden: de tracking vanuit Selligent ging mis, waardoor klikken uit mailings als direct binnenkomen met M_BT= in de URL. Alleen op hostnames udenhout.nl en www.udenhout.nl.
- **Eén kanaal: E-mail** (besluit van de eigenaar, 26 november 2026). Vraag de twee delen apart op (dat is technisch nodig), tel ze bij elkaar op en rapporteer alleen het totaal, als "e-mail". Ze sluiten elkaar uit, dus optellen geeft geen dubbeltelling. Noem nergens in een analyse dat e-mail uit twee delen bestaat, ook niet in de verantwoording, de datakwaliteit of de acties: geen M_BT, geen Selligent-correctie, geen "e-mailkanaal" tegenover "direct", geen aantal of aandeel per deel en geen actie over de tagging van mailings. Voor de lezer is het gewoon e-mailverkeer.
- M_BT-sessies die GA4 aan een andere bron toeschrijft (google / cpc, google / organic …) tellen niet als e-mail. Noem ze niet.
- **Niet per mailing te splitsen.** M_BT is een code per ontvanger, geen code per mailing, en alleen het e-mailkanaal heeft een campagnenaam (session_manual_campaign_name; in 2026 vooral de automatische servicemelding). Splits e-mail daarom niet per mailing: de landingspagina laat zien waar een mailing naartoe linkte.
- Controle voor je eigen telling, nooit in een analyse noemen: in dertig dagen (oktober–november 2026) ongeveer 3.600 e-mailsessies, waarvan ongeveer 80% via M_BT.

## Welke events tellen als lead (Van den Udenhout)
- Alle events met "lead" in de naam, waaronder: generate_lead_proefrit, generate_lead_offerte, generate_lead_onderhoudsofferte, generate_lead_verhuur, generate_lead_privatelease, generate_lead_private_lease, generate_lead_zakelijk_lease, generate_lead_zakelijk_offerte, generate_lead_leasecontact, generate_lead_werkplaats.
- Ook deze vuren (november 2026) en tellen als autolead: generate_lead_contact, generate_lead_overige, generate_lead_inruilwaarde, generate_lead_financiering (controleren). generate_lead_werkplaats vuurde in oktober–november 2026 niet.
- Alle lead-events en bedanktpagina_werkplaatsplanner zijn in GA4 als key event gemarkeerd (gecontroleerd november 2026).
- **Vóór april 2026 (de oude tracking) heetten de lead-events anders** (gecontroleerd juni 2025 t/m maart 2026). Met "lead" in de naam: generate_lead_proefrit_aanvraag, generate_lead_offerte_aanvraag, generate_lead_contactformulier, generate_lead_inruilen, generate_lead_bel_me_terug, generate_lead_financieringsaanvraag, generate_lead_private_lease. Zonder "lead" in de naam, maar wel autolead: offerte_onderhoud, verhuur_aanvraag, verhuuractie_verzonden, verhuur_losse_formulieren, private_groeilease. Sollicitaties (geen autolead): snelsolliciteren_verzonden, sollicitatie_verzonden. Tel over de wissel heen op **eventnaam**, niet op de key-eventvlag: de nieuwe namen waren vóór april nog geen key event.
- **generate_lead (zonder achtervoegsel) is een algemeen formulier, geen autolead** (gecontroleerd 26 november 2026, juni 2025 t/m november 2026): het vuurt op /vacatures (sollicitaties), /broodjes (een bestelformulier) en /sinterklaasfeest (aanmelding voor het feest), en één keer op een actiepagina. Sluit hem uit van de autoleads (event_name neq generate_lead) en noem een aanmelding apart.
- generate_lead_HMODH is de knop **"Houd me op de hoogte"**: een aanmelding om op de hoogte te blijven, geen proefrit- of offerteaanvraag. Telt als lead-event, maar noem hem apart als "Houd me op de hoogte".
- generate_lead_nieuwsbrief is een aanmelding voor de nieuwsbrief, geen autolead: apart noemen.
- generate_lead_vacature is een sollicitatie, geen autolead: apart noemen. Ook werving en geen autolead: generate_lead_snelsolliciteren en generate_lead_meeloopdagen.
- In april 2026 waren een deel van de nieuwe namen nog geen key event (ongeveer 240 events). Tel je met is_conversion_event, dan valt april 2026 iets lager uit.
- bedanktpagina_werkplaatsplanner telt als lead (werkplaatsafspraak) maar is veel groter dan de rest; apart noemen.
- Op proefrit-, offerte-, private lease- en financieringsformulieren zitten de parameters customevent_car_brand en customevent_car_model: daarmee is te zien voor welk merk en model de lead was.

## Leads tegen het doel (Campagne analyse)
Standaard komt het leadcijfer uit GA4 (zie Algemeen, "Leads bij een Campagne analyse"). Tel alleen de events van de soort uit het doel, in sessies die op de campagnepagina('s) begonnen:
- **proefritten**: generate_lead_proefrit;
- **offertes**: generate_lead_offerte (generate_lead_zakelijk_offerte alleen als het doel over zakelijk gaat);
- **private lease**: generate_lead_privatelease + generate_lead_private_lease;
- **zakelijke lease**: generate_lead_zakelijk_lease + generate_lead_zakelijk_offerte + generate_lead_leasecontact;
- **"leads" of geen soort (alle autoleads)**: alle lead-events uit de lijst hierboven, behalve generate_lead_vacature, generate_lead_HMODH ("Houd me op de hoogte"), generate_lead_nieuwsbrief en bedanktpagina_werkplaatsplanner; die noem je apart.
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

## Internetleads in het overzicht (leadsInternet)
- Besluit van de eigenaar, 27 november 2026. Tel in de view **marketing_analyse_leads_soort** de leads met **internet = true** (Kanaalgroep "Internet"), voor merk, modellen en periode (aangelegd_op). Alle kanalen binnen Internet tellen: udenhout.nl, merksites (Volkswagen.nl, Audi.nl …) en portals (Autoscout24, Gaspedaal …). Dat is ruimer dan de websiteleads van het leadcijfer tegen het doel.
- De soort volgt de briefing (kolom soort): noemt het doel of de omschrijving een soort, dan alleen die soort; anders alle soorten. Zeg in leadsInternetSoort wat je telde ("proefritten", "alle soorten").
- Alleen met een merk en minstens één model in de briefing; anders null en een regel in de datakwaliteit. Bij meer bedrijven alleen het deel Van den Udenhout.

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
- **De briefing bepaalt welke orders tellen** (besluit van de eigenaar, 27 november 2026). Zegt de briefing (doel of omschrijving) er niets over, dan tellen **alle klantgroepen** van Ordersoort **Nieuw én Gebruikt**: tel in de view **marketing_analyse_orders_klant** (kolom **klantgroep_naam**, "Geen klantgroep" als de klantgroep leeg is), gefilterd op merk, model en periode (orderdatum_op).
- Noemt de briefing een deel (een ordertype, bepaalde klantgroepen, alleen Nieuw of alleen Gebruikt), tel dan alleen dat deel. Zoek de klantgroepen op in de verdeling hieronder. Twijfel je welke klantgroepen de briefing bedoelt, tel dan ruim en noem welke klantgroepen je meetelde.
- **Handel** (1.712 in 2026) is geen verkoop aan een klant en heeft bijna nooit een klantgroep. Hij staat niet in de view en telt alleen als de briefing erom vraagt; noem hem anders hoogstens apart, uit marketing_analyse_orders.
- Zeg in de kerncijfers (ordersSoort, bijv. "alle orders, nieuw en gebruikt" of "koop particulier, nieuw") en in de stap Orders in Syntec welke orders je telde.

## Welke orders tellen: de verdeling (om de briefing te lezen)
Alle klantgroepen per ordertype, met het aantal orders Nieuw / Gebruikt van 1 januari t/m 14 november 2026 (alle merken). Standaard tellen ze allemaal mee; de briefing kan het beperken.
- **Koop particulier**: Koop Particulier (BM) 1.115 / 2.037; Cupra - BM ovg Particulier 151 / 2; PARTICULIER_TB – / 10.
- **Koop zakelijk**: Koop Zakelijk (BM) 888 / 502; Cupra - BM ovg Zakelijk 111 / –; BEDRIJF_TB – / 1.
- **Private lease**: Private Groeilease 925 / 2; Private lease 353 / 7; Cupra - Dealer Lease - Private Lease 41 / –; Cupra - Uni Lease - Private Lease 1 / –.
- **Zakelijke lease**: Dealer Lease 1.932 / 166; Lease 980 / 20; Occasion-Lease – / 192; Cupra - Uni Lease - Zakelijk 194 / –; Cupra - Dealer Lease - Zakelijk 181 / 1; Restmarge Dealer Lease 40 / –; Dealerlease Zakelijk_TB – / 1.
- **Verhuur (Rent)**: Rent 409 / 52; Rentals ext 15 / –.
- **Demo**: Demo 200 / 75.
- **Overig**: Restmarge deal 503 / –; Cupra - Euromobi - Koop 69 / –; Centrale Bestelling 1 / –; Geen klantgroep 25 / 8.
- **Klantgroep Handel** (bij Ordersoort Gebruikt): – / 4. Telt standaard mee, want hij staat in de view; Ordersoort Handel (1.712) niet.
- Een klantgroep die hier niet staat (nieuw in Syntec): tel hem standaard mee, deel hem in bij het ordertype dat het best past en meld hem in de datakwaliteit.
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


    maandrapport: `## Wat dit blok is
Hoort bij de opzet **Maandrapport Jana** (formaat 4, besluiten van de eigenaar, 27 november 2026): één rapport met vier tabbladen, **Porsche Centrum Brabant, Porsche Centrum Maastricht, Bentley Maastricht en PGZ**, elk met precies dezelfde opzet. Alleen resultaten, elk cijfer van de laatste volle maand naast die van de maand ervoor. Geen Syntec-leads en geen Syntec-orders: die bestaan alleen voor Van den Udenhout. Alle bronnen zijn Windsor, live.

## Welk account bij welk tabblad
- **Porsche Centrum Brabant**: GA4 www.porschecentrumbrabant.nl (306403800, niet de inactieve 442472211); Meta Ads "Porsche Groep Zuid" (293327521823561); Google Ads "Porsche Centrum Brabant B.V." (846-005-3447); LinkedIn Ads 515422432; Facebook 152454588113374; Instagram porschebrabant (17841400735388282); LinkedIn organisch 1688996.
- **Porsche Centrum Maastricht**: GA4 www.porschecentrummaastricht.nl (306394313); Meta Ads 315013592825616; Google Ads 383-831-5062; LinkedIn Ads 515419437; Facebook 1856659467764845; Instagram porschecentrummaastricht (17841409820778415); LinkedIn organisch 77458602.
- **Bentley Maastricht**: GA4 "PON Bentley Maastricht" (435349999), de testhosts bentley-maastricht.acc2.ddp.uname-it.digital en pon-test-maastricht.uname-it.digital uitsluiten; Meta Ads 192180818785600; Google Ads 703-471-9539; LinkedIn Ads 515420450. Geen organisch account gekoppeld.
- **PGZ**: GA4 www.pgz.nl (405407306), staging.pgz.nl uitsluiten; Meta Ads "PGZ" (744220736319839); Google Ads 973-942-0035; LinkedIn Ads 515420451. Geen organisch account gekoppeld.
- Het Meta-account "Porsche Groep Zuid" en het Google Ads-account "Porsche Centrum Brabant B.V." horen volledig bij **Porsche Centrum Brabant** (besluit van de eigenaar, 27 november 2026): uitgaven, bereik en campagnes van die accounts zijn niet per bedrijf te splitsen. Zeg dat in de meetnotities.
- Een bron die er niet is, krijgt de tekst "niet gemeten" of "geen organisch account gekoppeld", nooit 0.

## Periode
De rapportmaand is de **laatste volle kalendermaand** vóór de dag van de analyse; de vergelijkingsmaand is de maand daarvoor. De maandreeks voor de grafiek loopt over de laatste twaalf kalendermaanden t/m de rapportmaand (JJJJ-MM), een maand zonder meting is null. De forecast rekent het dashboard zelf uit (een rechte lijn door de laatste zes maanden, doorgetrokken naar de volgende maand); lever alleen de maandcijfers.

## Totaal online leads (GA4, per bedrijf)
- Een online lead is een GA4-event dat met \`generate_lead\` begint, geteld met \`event_count\` op de website van het bedrijf. **Niet** meegeteld: \`generate_lead_vacature\`, \`generate_lead_nieuwsbrief\`, \`generate_lead_snelsolliciteren\` en \`generate_lead_meeloopdagen\` (werving en nieuwsbrief zijn geen autoleads).
- **Soort lead** (voor de uitsplitsing bij hover; gebruik deze labels): \`generate_lead_proefrit\` → Proefrit; \`generate_lead_offerte\` → Offerte; \`generate_lead_contact\` → Contactaanvraag; \`generate_lead_info\` → Meer informatie; \`generate_lead_werkplaats\` en \`generate_lead_werkplaatsafspraak\` → Werkplaatsafspraak; \`generate_lead_financieren\` → Financiering; \`generate_lead_verzekeren\` → Verzekering; \`generate_lead\` en \`generate_lead_\` (zonder soort, de oude meting) → Overig. Een ander \`generate_lead_*\`-event dat hier niet staat telt mee als Overig; noem het in de meetnotities.
- **Bentley**: het event \`Contactaanvraag\` telt alleen als offerte met \`/caw-bedankt/offerte/\` in \`page_path\` (t/m 29 september 2026); vanaf 20 oktober 2026 vuurt \`generate_lead_offerte\`, vanaf 21 oktober \`generate_lead_contact\` en \`generate_lead_werkplaats\`. Een proefrit staat daar óók onder \`Contactaanvraag\` zonder dat pad: telt niet mee.
- **PGZ**: \`generate_lead_proefrit\`, \`generate_lead_contact\` en, vanaf 11 oktober 2026, \`generate_lead_offerte\`.
- Een maand waarin de tracking niet (volledig) werkte is **null** in de reeks, niet 0: controleer per maand of er dagen zonder sessies zijn. Bekend: beide Porsche-properties van 25 juni t/m 11 augustus 2026 (juni, juli en augustus zijn dus null). Zeg het in de meetnotities.
- De meting van de events verschilt per periode (nieuwe tracking, nieuwe events). Een verschil met een eerdere maand kan dus deels aan de meting liggen; zet de data waarop een event begon in de meetnotities als dat in de reeks of in de vergelijking meespeelt.
- Tel in één opvraging per bedrijf: \`year_month\` × \`event_name\` × \`event_count\`, filter \`event_name\` bevat "generate_lead" (Bentley: ook \`Contactaanvraag\` met \`page_path\`).

## Websitebezoeken (sessies)
GA4 \`sessions\` per \`year_month\`, met een filter dat de uit te sluiten hosts weglaat. **Nooit** sessies per hostname optellen: een sessie staat dan bij meerdere hosts (semantic layer, GA4). Sessies zijn sessies van de hele website, uit elk kanaal.

## Prestaties per online kanaal (cirkeldiagram)
**Sessies** per kanaal (besluit van de eigenaar), voor de rapportmaand en de maand ervoor. Haal \`session_source_medium\` × \`sessions\` op (een filter op \`hostname\` kan rijen dubbel geven: komt de som van de bronnen niet bij de sessies van de maand, haal het dan zonder hostfilter op) en deel in met de bestaande indeling van het dashboard, \`kanaalVoor\` in \`lib/kpi2027/kanalen.ts\`: Google Ads, Meta Ads, Overig betaald, Organisch zoeken, Social organisch, Autoportals, Direct, Verwijzingen en overig. Gebruik de namen uit \`KANALEN\` in dat bestand. Het dashboard rekent de percentages en het verschil in procentpunten uit; lever de sessies per kanaal en maand.

## Social media bereik (betaald en organisch)
Het totaal is **betaald + organisch**, klein uitgesplitst. Bereik telt unieke mensen per platform en per periode; tel daarom nooit dagcijfers op.
- **Betaald** = Meta Ads \`reach\` over de hele maand zonder dagkorrel (per account één opvraging, zonder campagne als dimensie, anders tellen mensen dubbel) + LinkedIn Ads \`approximate_unique_impressions\` (alleen voor een periode van hoogstens 92 dagen, per maand dus goed). Google Ads levert geen bereik.
- **Organisch** = Instagram \`reach\` over de hele maand zonder \`date\` (levert het periodebereik; een som van dagcijfers komt veel hoger uit; gebruik \`year_month\` hier niet, het label klopt niet, maar vraag elke maand apart op met \`date_from\` en \`date_to\`) + Facebook-paginabereik (\`page_impressions_unique\`). LinkedIn organisch levert alleen dagelijkse unieke weergaven, die niet optelbaar zijn: LinkedIn telt niet mee in het bereik (wel in de tabel Social media kanalen). Noem dat in de meetnotities.
- Het totaal is de **som van de platforms**, niet ontdubbeld over platforms. Dat staat in de toelichting van de tegel.

## Uitgaven advertentiecampagnes en jaarbudget
- Uitgaven = Google Ads, Meta Ads en LinkedIn Ads \`spend\` van het bedrijf (accounts hierboven), alle campagnes, zonder minimumbedrag; ook de wervingscampagnes (die staan er dan ook in de campagnetabel). Uitsplitsing per platform voor de hover.
- \`jaarTotaal\` = uitgaven van 1 januari t/m de laatste dag van de rapportmaand, in dezelfde accounts.
- **Jaarbudget (tijdelijk, besluit van de eigenaar, 27 november 2026)**: er is nog geen jaarbudget per merk. Neem als jaarbudget voor alle bedrijven \`jaarTotaal\` × 1,22 (de uitgaven tot en met de rapportmaand plus 22%). De balk in het rapport staat daardoor elke maand op ongeveer 82%. Zodra het echte jaarbudget er is, vervangt de eigenaar deze regel in dit blok en rekent het rapport met dat bedrag.
- Het budget is een voorlopig bedrag en geen oordeel: zeg niets over tempo.

## Toppresterende content (organisch)
- Alleen bij Porsche Centrum Brabant en Porsche Centrum Maastricht (de enige met organische accounts); anders \`topContent\` null met \`topContentReden\` ("geen organisch account gekoppeld").
- De beste **Instagram**-post van de rapportmaand op **engagement rate** = (likes + reacties + shares + saves) ÷ weergaven van die post, alleen posts met minstens 500 weergaven. Alleen Instagram, omdat daar weergaven, likes, reacties, shares en opslagen vergelijkbaar zijn en er een beeld is; Facebook en LinkedIn tellen engagement anders (LinkedIn telt klikken mee) en doen niet mee. Haal de posts in twee stappen op: eerst \`media_id\`, \`timestamp\`, \`media_type\`, \`media_permalink\`, \`media_caption\`, \`media_url\`, \`media_thumbnail_url\` voor de posts van de maand, daarna \`media_views\`, \`media_like_count\`, \`media_comments_count\`, \`media_shares\`, \`media_saved\` met een \`in\`-filter op de gevonden id's.
- **Beeld**: haal \`media_url\` (bij een video \`media_thumbnail_url\`) op en bewaar het beeld in het rapport als data-URL (JPEG, hoogstens 800 px breed, een paar honderd kB): een platformlink verloopt. Lukt het ophalen niet, zet dan \`afbeelding\` op null en noem het in de meetnotities.
- **Waarom** (\`waarom\`): één zin die zegt waarom dit de beste post is, met de cijfers erbij: de engagement rate tegen het gemiddelde van de andere posts van dezelfde maand op dat account, en het aantal weergaven. Dit is het enige oordeel in het rapport; geen advies.

## Campagneprestaties (tabel)
Alle advertentiecampagnes met uitgaven in de rapportmaand (ook die zonder lead), per platform. Leads: Meta \`actions_lead\`; Google Ads \`conversions\` (de conversieacties die het account zelf meetelt); LinkedIn Ads levert hier geen lead: null (n.v.t.). Kosten per lead = uitgaven ÷ leads (null zonder leads). Elke regel krijgt de cijfers van de maand ervoor mee (\`vorige\`); een campagne die toen niet draaide krijgt null. Het dashboard sorteert op uitgaven, hoog naar laag.

## Social media kanalen (tabel)
Per organisch kanaal (Facebook, Instagram, LinkedIn): volgers, bereik, vertoningen, likes, reacties en posts, elk met de waarde van de maand ervoor. Instagram \`followers_count\` en LinkedIn \`organization_follower_count\` zijn alleen de stand van vandaag (geen historie): volgers zonder \`vorige\`. Facebook: \`page_follows\`, \`page_impressions_unique\` (bereik), \`page_impressions\` (vertoningen), likes = \`post_reactions_like_total\` van de posts die in de maand zijn geplaatst, reacties n.v.t., posts = het aantal posts van de maand. LinkedIn: vertoningen, likes en reacties zijn de som van de dagwaarden (\`account_analytics_*\`, een negatieve dagwaarde telt als 0), bereik n.v.t., posts uit \`share_id\`. Instagram \`reach\` over de hele maand zonder \`date\`; \`views\`, \`likes\` en \`comments\` zijn optelbaar over de dagen. Een kanaal dat een cijfer niet levert: null (n.v.t.).

## Wat het rapport niet doet
Geen samenvatting, geen oordelen, geen aanbevelingen, geen acties, geen benchmarks, geen voortgang tegen een doel. De bronnen en meetnotities staan ingeklapt onderaan.`,
  },
};
