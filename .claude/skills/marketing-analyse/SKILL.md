---
name: marketing-analyse
description: Maak een Marketing analyse (full-funnel campagne-analyse of een rapportage zoals de VDU- of PGZ-maand- en kwartaalrapportage) van de groep Van den Udenhout en zet het resultaat in het campagnedashboard (Campagnes → Marketing analyse). Gebruik dit als de gebruiker vraagt om een (marketing) analyse, campagne-analyse, funnelanalyse of rapportage ("maak een marketing analyse van de Audi A2", "maak de VDU maandrapportage", "voer de analyseronde uit", "nieuwe versie van de A2-analyse"), of om een campagne of rapportage voor Marketing analyse aan te maken.
---

# Marketing analyse — een analyse maken

Het dashboard (`bestecamerakeuze/`, tabblad **Campagnes → Marketing analyse**) toont de
analyses; jij maakt ze. Het plan en alle besluiten van de eigenaar staan in
`bestecamerakeuze/campagne-analyse-tool.md`. Supabase-project `pzpoptfljgrskebnuggt`
("MMM"), schema `dataloket`.

## Wie bepaalt wat
- **Analyse opzet** (`marketing_analyse_opzetten`, kolom `opzet_id` op de campagne): de soort
  analyse. **Campagne analyse** is de standaard (formulier `campagne`: volledige briefing,
  funnel, kosten, label). Andere opzetten, zoals VDU/PGZ maand- en kwartaalrapportage, hebben
  formulier `rapportage`: naam, bedrijf, een **open periode** (`periode_tekst`) en
  omschrijving, geen label. De eigenaar kan zelf opzetten toevoegen.
- **Prompt van de opzet** (`marketing_analyse_prompts`, per `opzet_id`): hoe je analyseert en
  oordeelt; bij Campagne analyse met een hoofdstuk per label. Volg hem; hij gaat vóór deze
  skill waar het om inhoud gaat. **Altijd geldend, welke opzet ook** (besluit van de eigenaar):
  de harde dataregel hieronder, schrijven voor de marketeer, en een managementsamenvatting van
  hoogstens vijf regels. Een opzetprompt hoeft die niet te herhalen.
- **Semantic layer** (`marketing_analyse_semantiek`): per databron hoe je de data leest. In
  het blok Algemeen: welke accounts en GA4-properties bij welk bedrijf horen en welke bronnen
  per bedrijf van toepassing zijn. Volg hem altijd.
- **Data correctie** (op de campagne): wat er bij een vorige analyse niet klopte. Pas elke
  regel toe en meld per regel wat je ermee deed.
- **Deze skill**: hoe je de data ophaalt en wegschrijft. Het formaat ligt vast in
  `bestecamerakeuze/lib/marketingAnalyse/types.ts` (`MaResultaat`, `MaKerncijfers`). Wijk
  daar nooit van af, anders breekt de pagina.

## Harde regel: alleen deze bronnen
1. **Windsor, live** (`get_data`, eerst `get_fields`): `google_ads`, `facebook` (Meta Ads),
   `linkedin`, `facebook_organic`, `instagram`, `linkedin_organic`, `googleanalytics4`.
   Alleen de accounts en properties van de bedrijven uit de briefing (`bedrijven`, kan er meer
   dan één zijn; semantic layer, Algemeen). Bij meerdere bedrijven: alle accounts van elk
   bedrijf, en splits de belangrijkste cijfers per bedrijf uit.
2. **`dataloket.marketing_analyse_leads`**: de leads-kopie van "Data leads" (zeven kolommen,
   met Kanaal), en de view **`dataloket.marketing_analyse_leads_website`** daarop (alleen
   Kanaalgroep "Internet" én "udenhout.nl" in Kanaal of Onderwerp, met een kolom `soort`).
   Voor het overzicht van alle leads de view **`dataloket.marketing_analyse_leads_soort`** (alle
   leads met `soort`, `internet`, `website`, `kanaalgroep_naam`).
   **Alleen voor Van den Udenhout**; voor elk ander bedrijf niet gebruiken. `leadsSyntec` alleen
   invullen als de analyse uitsluitend over Van den Udenhout gaat, anders null.
3. **`dataloket.marketing_analyse_orders`** (bron **Syntec orders**): de orders-kopie van
   "Data orders" (vijf kolommen: Ordersoort, Klantgroep, Merk, Model, Orderdatum, plus
   `orderdatum_op`; één rij is één verkochte auto), en de view
   **`dataloket.marketing_analyse_orders_klant`** daarop (alleen Nieuw en Gebruikt, met
   `klantgroep_naam`), en voor het totaal van alle orders de view
   **`dataloket.marketing_analyse_orders_type`** (alle orders met `ordertype` en `klantorder`).
   **Alleen voor Van den Udenhout**, net als de leads.
4. **`dataloket.lead_kanaalkosten`**: extra maandkosten per GA4-bron/medium. **Niet bij een
   campagne-analyse** (besluit van de eigenaar): daar zijn de kosten alleen de mediakosten uit
   Google Ads, Meta Ads en LinkedIn Ads. Alleen een rapportage mag deze tabel gebruiken, als de
   prompt erom vraagt, en noemt ze dan apart.

**Niet gebruiken**: alle andere tabellen in Supabase, ook niet `windsor_*`, `leads_raw` of
`v_leads`. De tabellen van de tool zelf (`marketing_analyse_campagnes`, `_prompts`,
`_semantiek`) lees en schrijf je wel; dat is geen analysedata. `_versies` schrijf je alleen
(via `marketing_analyse_bewaar`); eerdere versies lees je niet.

## Harde regel: het leadcijfer komt uit één bron (Campagne analyse)
Besluit van de eigenaar, 25 november 2026; ook in de semantic layer (Algemeen, GA4, Data leads).
- **Standaard Google Analytics.** Zegt het veld `doel` niet expliciet dat het uit Syntec komt,
  dan is het leadcijfer het aantal lead-events **van de soort uit het doel** in sessies die op de
  campagnepagina('s) begonnen. "20 proefritten" = 20× `generate_lead_proefrit` op de website.
- **Syntec alleen als het doel dat expliciet zegt** (het woord Syntec staat erin) **én** de
  analyse uitsluitend over Van den Udenhout gaat. Tel dan in de view, nooit in de kale kopie:
  ```sql
  select soort, count(*) from dataloket.marketing_analyse_leads_website
  where aangelegd_op >= '<start>' and aangelegd_op < '<eind + 1 dag>'
    and merk ilike '%<merk>%' and model ilike '%<model>%'
  group by soort;   -- de view eist al Kanaalgroep = 'Internet' en udenhout.nl in Kanaal of Onderwerp
  ```
  Noemt het doel Syntec bij een ander bedrijf: tel in GA4 en meld het in `datakwaliteit`.
- Nooit opgeteld, nooit gemengd. De andere bron mag als context in zijn eigen stap, maar niet
  in `leadsDoel` en niet in het doeloordeel. Het dashboard rekent de bron zelf ook na
  (`leadBron` in `rekenen.ts`: het woord Syntec in het doel én alleen Van den Udenhout) en toont
  niets als `kerncijfers.leadBron` daarvan afwijkt.

## Harde regel: orders altijd per klantgroep (Syntec orders)
Verzoek van de eigenaar, 25 november 2026; ook in de semantic layer (Algemeen, Syntec orders) en
in de hoofdprompt.
- Alleen als de analyse **uitsluitend over Van den Udenhout** gaat; anders geen orders en geen
  sectie `orders`.
- Tel in de view, voor merk, modellen en periode, en **splits altijd uit per klantgroep**:
  ```sql
  select klantgroep_naam, ordersoort, count(*) as orders
  from dataloket.marketing_analyse_orders_klant
  where orderdatum_op between '<start>' and '<eind>'
    and merk ilike '%<merk>%' and model ilike '%<model>%'
  group by klantgroep_naam, ordersoort order by orders desc;
  -- Handel apart (geen verkoop aan klanten):
  -- select count(*) from dataloket.marketing_analyse_orders where ordersoort = 'Handel' and …
  select max(orderdatum_op) from dataloket.marketing_analyse_orders;  -- tot wanneer de orders lopen
  ```
- De uitsplitsing per klantgroep (aantal, aandeel, totaalregel) en Nieuw tegen Gebruikt staan
  **altijd** in de sectie `orders`; noem de grootste klantgroepen ook in de bevindingen.
- Orders zijn nooit het leadcijfer (`leadsDoel`). Gaat het doel over verkochte auto's, dan
  beoordeel je het doel op de orders. Er is geen koppeling lead → order: schrijf "orders voor
  <model> in de periode", niet "orders uit de campagne".

## Harde regel: altijd het overzicht van alle leads en orders (Van den Udenhout)
Verzoek van de eigenaar, 25 november 2026; ook in de semantic layer (versie 5: Algemeen, Data
leads, Syntec orders) en in de hoofdprompt. Bij elke analyse die uitsluitend over Van den
Udenhout gaat staan in de sectie `syntec` en `orders` wat het merk en de modellen **in totaal**
deden. Dit is context: het telt nooit mee in `leadsDoel`.
```sql
-- Leads: alles, Internet tegen offline, Internet per soort, en de websiteleads
select kanaalgroep_naam, internet, soort, count(*) as leads, count(*) filter (where website) as website
from dataloket.marketing_analyse_leads_soort
where aangelegd_op >= '<start>' and aangelegd_op < '<eind + 1 dag>'
  and merk ilike '%<merk>%' and model ilike '%<model>%'
group by 1, 2, 3 order by leads desc;
-- Orders: alles (ook Handel en verhuur), per ordertype
select ordertype, klantorder, count(*) as orders
from dataloket.marketing_analyse_orders_type
where orderdatum_op between '<start>' and '<eind>'
  and merk ilike '%<merk>%' and model ilike '%<model>%'
group by 1, 2 order by orders desc;
```
- Sectie `syntec`: tabel **Alle leads** (Internet, offline per kanaalgroep, totaalregel) en tabel
  **Internet per soort lead** (proefrit, offerte, private lease, inruil, overig; aantal, aandeel,
  websiteleads; totaalregel). Kerncijfers: alle leads, waarvan Internet, websiteleads.
- Sectie `orders`: tabel **Per ordertype** (totaalregel = alle orders) vóór de tabel per
  klantgroep. Kerncijfers: alle orders en de verkoop aan klanten. Verhuur (Rent) altijd apart
  noemen. Het ordertype staat ook in `ordertypeVan` (`lib/sync/analyseOrders.ts`, getest).
- Model kan in orders anders heten dan in leads (Audi A2 e-tron = "A2 e-tron (A1)" in de
  orders): zoek breed en noem de modelwaarden.

## HRM campagne (maandrapport werving)
Opzet **HRM campagne** (vast id `7d0c0000-0000-4000-8000-000000000006`, formulier `rapportage`,
planning standaard Maandelijks; migraties 0053 en 0054, besluiten van de eigenaar van 25, 26 en
27 november 2026 in `bestecamerakeuze/hrm-analyse-onderzoek.md`; tot 27 november heette hij "HRM
analyse" en liep hij wekelijks). Eén maandrapport voor de hele groep, met elk hoofdcijfer apart voor
de clusters **Van den Udenhout** (VDU, Instra, Caromi, VELOO) en **PGZ** (Porsche Groep Zuid, Porsche
Centrum Maastricht, PGZ, Bentley Maastricht). De prompt van de opzet zegt wat er per sectie in hoort;
het blok **Werving** van de semantic layer zegt hoe je werving herkent, welk account bij welk bedrijf
hoort en welke events sollicitaties zijn. Wat hier staat geldt alleen voor deze opzet en gaat vóór de
algemene rapportageregels in stap 3.
- **Bronnen**: alleen Windsor live. Geen Syntec-leads, geen Syntec-orders, geen `lead_kanaalkosten`.
- **Periode**: 1 januari t/m de laatste dag van de **focusmaand** (de laatste volle maand vóór de
  dag van de analyse; bij een geplande ronde de maand uit de planning). De **vergelijkingsmaand** is
  de maand daarvoor. Maandgrafieken per kalendermaand (x-as JJJJ-MM), weekgrafieken per ISO-week met
  de maandag als datum; dagen na de focusmaand tellen nergens mee.
- **Vergelijking**: elk kerncijfer van de focusmaand krijgt `vergelijking` met de vergelijkingsmaand
  (`label` = naam van die maand, `hogerIsBeter`: true bij leads, sollicitaties en sessies, false bij
  kosten per lead, weglaten bij uitgaven). Het dashboard rekent het verschil in procenten zelf uit
  (`vergelijkingVerschil` in `rekenen.ts`); in tabellen staat het als tekstkolom "Verschil".
- **Ophalen** (velden eerst met `get_fields` controleren):
  - Meta Ads (`facebook`), alle accounts, filter op de campagnenaam zoals het blok Werving zegt
    (bevat "acature", "erving" of "eeloopdag", of "LL14"):
    `account_name`, `campaign`, `objective`, `spend`, `impressions`, `reach`, `link_clicks`,
    `actions_lead`, `actions_onsite_conversion_lead_grouped`, `actions_offsite_conversion_fb_pixel_lead`
    over de hele periode, en `date`, `account_name`, `campaign`, `spend`, `actions_lead` per dag in
    stukken van een half jaar (per week opvragen met `week_iso` of `year_week_iso` liep vast); tel daar
    zelf maanden, ISO-weken en clusters uit op.
  - Google Ads, filter `campaign` bevat "acature": `account_name`, `campaign`, `date`, `spend`,
    `clicks`. LinkedIn Ads: alle campagnes, controleer of er werving bij zit.
  - GA4, properties 255949462 en 405407306: `generate_lead_vacature` per `date` (tel zelf maanden en
    weken) en per `session_source_medium` en `campaign` voor de focusmaand, de vergelijkingsmaand en
    de hele periode; sessies op vacaturepagina's per property met `page_path`, per maand. Niet property 469094476.
  - Facebook en LinkedIn organisch: posts met vacature, solliciteren, collega of werken bij in de
    tekst; LinkedIn `careers_page_views` per account. Instagram kan een time-out geven.
- **Formaat**: rapportage, dus secties met `stap` 1 t/m 7, zonder `tab` en met `groep`, in de
  volgorde van de prompt. Wat niet gemeten wordt is tekst ("niet gemeten", "niet opgehaald"), nooit 0. Kerncijfers
  voor het overzicht: alleen `kosten`.
- **Controle vóór het opslaan**: de uitgaven per maand en per week tellen op tot het totaal in de
  kerncijfers; leads per bedrijf en per cluster tellen op tot het totaal; de focusmaand in de
  maandgrafiek is gelijk aan het kerncijfer van de focusmaand; een Meta-lead staat nergens opgeteld bij de
  sollicitaties op de website.

## E-mail VDU (e-mailverkeer op udenhout.nl)
Opzet **E-mail VDU** (id `d2f7f48d-482c-4296-a284-f3b570c65c43`, formulier `rapportage`, planning
Maandelijks; besluiten van de eigenaar van 26 november 2026). Wat hier staat geldt alleen voor deze
opzet en gaat vóór de algemene rapportageregels in stap 3. De prompt zegt wat er per stap in hoort;
het blok Google Analytics 4 van de semantic layer zegt hoe je e-mail en lead-events telt.
- **Bronnen**: alleen Windsor live, GA4-property 255949462. Geen Syntec, geen advertentieplatformen.
- **Periode**: elke maand vanaf 1 juni 2025 t/m de focusmaand (zie stap 2). Eenmalig t/m gisteren
  mag; de lopende maand heet dan "t/m <dag>" en telt niet mee in oordelen.
- **E-mail is één kanaal** (besluit van de eigenaar): vraag deel A (`session_default_channel_group`
  = "Email") en deel B (`session_source_medium` = "(direct) / (none)" en
  `landing_page_plus_query_string` bevat "M_BT=") apart op, beide met de hostnamefilter
  (`hostname` is udenhout.nl of www.udenhout.nl), en tel ze op. Nergens in het resultaat, ook niet
  in `bronnen`, `datakwaliteit`, `herkenning` of de acties, staat dat e-mail uit delen bestaat:
  geen M_BT, geen Selligent, geen "direct". Schrijf in `bronnen` alleen
  "Windsor · Google Analytics 4 · GA4_https://udenhout.nl (255949462)".
- **Ophalen**, per deel A en B, met `year_month` (of per maand een opvraging) als korrel:
  - sessies, `engaged_sessions` per maand, en per `landing_page` (voor de focusmaand, de maand
    ervoor en de hele periode);
  - sessies met een concrete lead: `is_conversion_event` = "true" met de niet-autoleads als `neq`
    (generate_lead_vacature, _HMODH, _nieuwsbrief, _snelsolliciteren, _meeloopdagen, het algemene
    generate_lead, snelsolliciteren_verzonden, sollicitatie_verzonden), zonder `event_name` als dimensie; met een
    werkplaatsafspraak: `event_name` = bedanktpagina_werkplaatsplanner; autolead = concrete lead min
    werkplaatsafspraak. Een filter met bevat, in of of op `event_name` splitst per event en telt
    sessies dubbel (semantic layer, "Tellen in Windsor");
  - `landing_page` × `event_name` × `sessions`/`event_count` met een filter op de lead-events, voor
    de focusmaand en de maand ervoor;
  - de hele site (zonder e-mailfilter): sessies en sessies met een concrete lead per maand, en per
    landingspagina uit de tabel van de focusmaand.
- **Formaat**: rapportage met drie secties (`stap` 1 t/m 3) en `groep` "E-mail", "Website",
  "Resultaat", zonder `tab`. Kerncijfers van de focusmaand met de vorige maand in `vergelijking`.
  Kerncijfers voor het overzicht: `{}`.
- **Controle vóór het opslaan**: per maand tellen deel A en B op tot het e-mailtotaal; de som van
  de landingspagina's (met de regel "Overige") is het totaal van de maand; zoek in de JSON op
  "M_BT", "Selligent" en "direct" en haal elke treffer weg.

## Stap 0 — Welke campagne(s) of rapportage(s)
```sql
select c.id, c.naam, c.bedrijven, c.merk, c.modellen, c.startdatum, c.einddatum, c.periode_tekst,
       c.doel, c.budget, c.omschrijving, c.campagnepaginas, c.herkenning, c.data_correctie,
       c.planning, c.laatste_versie,
       o.id as opzet_id, o.naam as opzet, o.formulier
from dataloket.marketing_analyse_campagnes c
join dataloket.marketing_analyse_opzetten o on o.id = c.opzet_id
where c.naam ilike '%<deel van de naam>%';
```
- **Analyseronde** ("voer de analyseronde uit", meestal op vrijdag; migratie 0049, plan §17).
  Vraag de ronde op; die bepaalt wat er aan de beurt is, niet jij:
  ```sql
  select * from dataloket.marketing_analyse_ronde();   -- standaard vandaag, Nederlandse kalender
  ```
  Maak een analyse van elke regel met `aan_de_beurt = true`, één voor één, met de periode uit
  `periode_van`/`periode_tot` (zie stap 2). De planning per regel staat in het overzicht
  (uitklapmenu vooraan): **Uit** (nooit, ook geen eindevaluatie), **Wekelijks** (elke week),
  **Maandelijks** (vanaf de eerste vrijdag van de maand), **Per kwartaal** (vanaf de eerste vrijdag
  van januari, april, juli en oktober). Een ronde hoort bij een week (maandag t/m zondag): op
  donderdag draaien is de ronde van die vrijdag. Een gemiste week wordt ingehaald (`reden =
  'ingehaald'`); twee keer draaien maakt niets dubbel, want een versie uit de geplande week telt.
  Een campagne na haar einddatum krijgt de eindevaluatie (`reden = 'eindevaluatie'`), een
  campagne die nog niet begonnen is wacht (`'nog niet gestart'`). Doe niets met regels die niet
  aan de beurt zijn, en draai nooit een regel op Uit mee. Een losse vraag ("maak een marketing
  analyse van …") mag altijd, ook bij Uit.
- Bestaat hij niet en geeft de gebruiker de gegevens in de chat: maak hem aan met
  `insert into dataloket.marketing_analyse_campagnes (opzet_id, naam, bedrijven, merk, modellen, startdatum, einddatum, periode_tekst, doel, budget, omschrijving) values (…) returning id;`
  Naam en minstens één bedrijf (`bedrijven`, een lijst) zijn verplicht; een opzet met vaste
  `bedrijven` bepaalt ze; bij een
  rapportage ook `periode_tekst`, en blijven merk, modellen, data, doel en budget leeg. Zonder
  `opzet_id` wordt het Campagne analyse. Vraag ontbrekende essentiële gegevens eerst.
- Meerdere treffers: vraag welke.
- **Campagnepagina's en herkenning** (migratie 0046): `campagnepaginas` zijn de pagina's uit de
  briefing, `herkenning` is het bewijs uit het voorstel waaruit de campagne is gemaakt
  (platformcampagnes, uitgaven, social posts; skill campagne-voorstellen). Gebruik ze als
  **startpunt** voor de herkenning, niet als eindpunt: zoek zelf grondig of er meer of minder bij
  hoort, en noem in `herkenning` van het resultaat wat je ervan overnam en wat je anders deed.

## Stap 1 — Opdracht ophalen
```sql
select id, versie, inhoud from dataloket.marketing_analyse_prompts
where opzet_id = '<opzet_id>' order by versie desc limit 1;
select id, versie, inhoud from dataloket.marketing_analyse_semantiek order by versie desc limit 1;
```
- **Geen voorkennis** (besluit van de eigenaar): lees **geen** eerdere versies van de analyse
  (`marketing_analyse_versies`), ook niet bij een nieuwe versie van een bestaande analyse.
  Maak elke analyse zelfstandig en vergelijk niet met een vorige versie. Volgt een vergelijking
  met een vorige versie toch uit een opgeslagen prompt, sla die dan over en meld dat in
  `datakwaliteit`. De Data correctie geldt wel gewoon.
- **Geen prompt bij een andere opzet dan Campagne analyse: stop.** Maak geen analyse en meld:
  "Er is nog geen prompt voor <opzet>. De eigenaar schrijft hem in het dashboard via Analyse
  prompts." Val nooit terug op de campagneprompt (besluit van de eigenaar). In een analyseronde
  sla je zo'n regel over en meld je hem.
- Geen prompt bij Campagne analyse, of geen semantic layer opgeslagen? Dan gelden de
  standaardteksten in `bestecamerakeuze/lib/marketingAnalyse/standaardPrompt.ts` en
  `standaardSemantiek.ts`, en is het id null. Lees ze volledig.

## Stap 2 — Periode en label
- **Campagne** — periode: van `startdatum` t/m `einddatum`; ligt de einddatum op of na vandaag
  (of is hij leeg): t/m **gisteren**. Niets daarbuiten. Label (bepaalt de functie bij het
  opslaan, jij past het hoofdstuk toe): einddatum vóór vandaag = **Eindevaluatie**; anders
  **Tussentijdse evaluatie**.
- **Rapportage met planning Maandelijks of Per kwartaal** (besluit van de eigenaar, plan §17):
  de periode volgt uit de planning, niet uit `periode_tekst`. Neem `periode_van` en `periode_tot`
  uit `marketing_analyse_ronde()`: de vorige volle maand of het vorige volle kwartaal, nooit later
  dan gisteren. Kapt de functie de periode af op gisteren (een ronde op de eerste van de maand),
  meld dat in `datakwaliteit`. Loopt een bron niet tot het einde van de periode (de orders-kopie
  loopt soms meer dan een week achter), maak de analyse toch en meld tot wanneer de bron loopt in
  `datakwaliteit` (besluit van de eigenaar: altijd op de eerste vrijdag, niet wachten).
  Vraagt de prompt van de opzet om een vaste aanloop (E-mail VDU: elke maand vanaf 1 juni 2025),
  dan is de maand uit de ronde de **focusmaand** en `p_periode_van` de startdatum van de aanloop;
  `p_periode_tot` blijft die uit de ronde.
- **Rapportage met planning Wekelijks of Uit** — de periode is vrije tekst (`periode_tekst`). Zet hem om in een begin- en
  einddatum, gerekend vanaf vandaag (Nederlandse kalender): "Afgelopen 3 maanden" = de drie
  volle kalendermaanden vóór de lopende maand, "Q4 2026" = 1 okt t/m 31 dec 2026, "november
  2026" = de hele maand, "1 januari t/m 10 februari 2026" letterlijk. Nooit later dan
  gisteren; een periode die nog loopt, kap je af op gisteren en dat meld je. Is de tekst niet
  eenduidig, kies dan de redelijkste uitleg en zet die in `datakwaliteit`. Bewaar de datums als
  `p_periode_van`/`p_periode_tot`. Rapportages hebben **geen label**.

## Stap 3 — Data ophalen
- **Windsor**: filter altijd op periode en account; vraag per bron op. Een pull kan "pending"
  teruggeven: dezelfde aanroep opnieuw doen tot hij klaar is. Velden altijd eerst met
  `get_fields` controleren.
  - Ads: campagne, advertentiegroep/set, advertentie, bestemmings-URL, url_tags, uitgaven,
    vertoningen, bereik, klikken, (link)klikken, platformleads/conversies.
  - Organisch: posts met tekst, publicatiedatum, vertoningen, bereik, interacties, klikken.
  - GA4: `landing_page` × `session_default_channel_group` × `session_source_medium` ×
    `sessions`/`engaged_sessions`/`user_engagement_duration`, en `landing_page` × `event_name`
    × `event_count` (landing page hoort bij de sessie: events in sessies die op de
    campagnepagina begonnen). E-mail en lead-events volgens de semantic layer. E-mail is altijd
    één kanaal: tel de delen op en noem nooit hoe e-mail is opgebouwd (ook niet in de
    verantwoording), en splits e-mail niet per mailing.
  - GA4 voor de stap **Vervolg op de website**: `landing_page` × `page_path` (of
    `page_path_plus_query_string`) × `sessions`/`screen_page_views` voor de pagina's die bekeken
    worden in sessies die op de campagnepagina begonnen; deel ze in paginagroepen in (modellen,
    occasions en voorraad, configurator, acties, contact en vestigingen, overig). Daarnaast
    `landing_page` × `page_path` × `event_name` × `event_count` voor de belangrijke events en of ze
    op de campagnepagina zelf of elders vielen (dat laatste ook voor de stap Conversies). Het
    aandeel sessies dat na de campagnepagina nog een andere pagina bekeek = sessies met meer dan
    één paginaweergave ÷ alle sessies op de campagnepagina (`screen_page_views_per_session` of de
    paginaweergaven per sessie); zeg in de `tekst` hoe je het hebt berekend.
- **Rapportage**: alle accounts en properties van het bedrijf over de hele periode (geen
  campagnefilter). Leads bij Van den Udenhout: alle leads van de periode, uitgesplitst naar
  merk en kanaalgroep. PGZ en andere bedrijven: alleen GA4.
- **Leads in Syntec bij een campagne** (alleen Van den Udenhout): uit
  `marketing_analyse_leads_website` per soort, zoals in de harde regel hierboven. Dat is het
  leadcijfer als het doel Syntec noemt, anders context voor de stap Leads in Syntec. Soort
  lead volgens de view (kolom `soort`). Controleer `max(aangelegd_op)` en meld tot wanneer de
  kopie loopt.
- **Leads in Syntec bij een rapportage**: alle leads van de periode uit `marketing_analyse_leads`,
  uitgesplitst naar merk en kanaalgroep, tenzij de prompt van de opzet iets anders vraagt.
- **Orders bij een campagne** (alleen Van den Udenhout): uit `marketing_analyse_orders_klant`,
  per klantgroep en ordersoort, zoals in de harde regel hierboven. Controleer
  `max(orderdatum_op)`: de sheet loopt soms meer dan een week achter.
- **Orders bij een rapportage** (Van den Udenhout): alle orders van de periode, per klantgroep,
  merk en ordersoort, tenzij de prompt van de opzet iets anders vraagt; Handel apart.
- **Kosten bij een campagne-analyse**: alleen de mediakosten uit de advertentieplatformen.
  `kerncijfers.kosten` en de sectie Investering tellen geen `lead_kanaalkosten` mee.
- **Extra kanaalkosten (alleen rapportages)**: `select bron_medium, maand, bedrag from
  dataloket.lead_kanaalkosten` voor de maanden in de periode, verdeeld over sessies zoals de
  semantic layer zegt; altijd apart van de mediakosten.
- Reken verhoudingen uit totalen. Bereik niet optellen over dagen of platforms.

### Benchmarks: hoe goed is goed? (plan §20)
Bij een **campagne-analyse** zet je naast de belangrijkste kerncijfers hoe ze zich verhouden tot
soortgelijke campagnes of posts uit **onze eigen historie** (besluit van de eigenaar, 25 november
2026; geen branchecijfers). Dezelfde harde dataregel geldt: Windsor live en, bij Van den Udenhout,
de leads-kopie.
- **Vergelijkingsgroep**: dezelfde accounts en properties als de campagne, de **12 maanden vóór
  de startdatum**, zonder de campagne zelf. Per item (een campagne, een post, een campagnepagina)
  reken je het cijfer uit zijn eigen totalen uit; van die waarden geef je de verdeling mee.
- **Welke cijfers, met welke groep** (alleen waar het zinvol is; niet elk kerncijfer):
  - Advertenties: CTR, kosten per klik en kosten per sessie, **per platform** tegen andere
    actiecampagnes op hetzelfde platform en account (campagnes met minstens € 100 uitgaven;
    Google per campagnetype, dus Demand Gen tegen Demand Gen). Bereik: frequentie en kosten per
    1.000 vertoningen bij Meta.
  - Organische posts: vertoningen per post, interacties per vertoning en klikken per post, per
    kanaal, tegen alle posts van dezelfde accounts (lifetime-cijfers, posts van minstens 14 dagen oud).
  - Campagnepagina en e-mail: betrokken sessies (%), betrokkenheidstijd per sessie en video- of
    scroll-events per 100 sessies, tegen andere campagnepagina's op dezelfde property
    (bijvoorbeeld `/acties/…`, minstens 200 sessies). Bij e-mail alleen het e-mailverkeer naar die pagina's.
  - Conversies: conversies van dezelfde soort per 100 sessies, tegen andere campagnepagina's.
  - Vervolg op de website: het aandeel sessies met nog een andere pagina, tegen andere campagnepagina's.
  - Niet bij de mediakosten tegen het budget (tempo is geen vergelijking), niet bij orders en niet bij
    Syntec-leads, tenzij de prompt van de opzet erom vraagt.
- **Minstens 5 items** in de groep, anders geen benchmark (het dashboard toont hem dan ook niet);
  zeg in `datakwaliteit` waar een benchmark ontbrak en waarom.
- **Veld** `benchmark` op het kerncijfer: `groep` (in gewone taal, met aantal, soort en periode:
  "142 organische posts van dezelfde accounts, 12 maanden voor de start"), `aantal`, `mediaan`,
  `p25`, `p75`, `min`, `max`, en `hogerIsBeter: false` bij kosten. Zelfde eenheid als het
  kerncijfer (procent als 3.2). Het dashboard bepaalt zelf of het beter, gemiddeld of slechter is
  (boven het derde of onder het eerste kwart); jij noemt de vergelijking in de bevindingen
  ("1.108 vertoningen per post, rond de mediaan van 940") en laat haar meewegen in `oordeel`.
- Zet in `bronnen` welke data je voor de vergelijking hebt opgehaald.

## Stap 4 — Het resultaat (`MaResultaat`, `formaat: 3`)
De pagina opent op de samenvatting (conclusie, voortgang, wat nu te doen) en heeft links een
navigatie met de **vaste stappen van de funnel** (`ANALYSE_TABBLADEN` in `types.ts`, formaat 3
sinds 25 november 2026; plan §21). Elke sectie hoort bij één stap via `tab`. Per stap staan
eerst `kop`, `oordeel` en de kerncijfers (het **eerste kerncijfer is het hoofdgetal in de
navigatie**), dan `bevindingen` naast `acties`, dan grafieken en tabellen, en ingeklapt de
`tekst` (hoe gemeten). Wat er per stap in hoort, staat in de prompt.

Stapsleutels, in deze volgorde: `advertenties` (met bereik en investering), `organisch`,
`email`, `campagnepagina` (verkeer en gedrag op de pagina), `conversies` (lead-events en andere
conversies, op de pagina of elders), `vervolg` (waar bezoekers daarna heen gaan op de website),
`syntec` en `orders` (die laatste twee alleen als de analyse uitsluitend over Van den Udenhout
gaat; anders weglaten). De oude sleutels van formaat 2 (`bereik`, `investering`, `verkeer`,
`gedrag`, `lead-events`) gebruik je niet meer: in formaat 3 worden ze een losse stap achteraan.
Noemt de semantic layer nog een oud tabblad, lees dan: Bereik en Investering → Advertenties,
Verkeer en Gedrag → Campagnepagina, Lead-events → Conversies. Een stap zonder data krijgt toch
een sectie met `oordeel: "geen-data"` en de reden in `kop`. Een sectie zonder geldige `tab` wordt
een losse stap achteraan; doe dat alleen als de prompt van de opzet er echt om vraagt. Een
**rapportage** toont elke sectie als eigen stap in de volgorde van `stap`; `tab` mag daar weg.
Een sectie van een rapportage mag een `groep` hebben (bijv. "E-mail", "Website", "Resultaat"):
opeenvolgende stappen met dezelfde groep staan in de navigatie links onder één kopje, net als bij
een campagne (`tabbladenVoor` in `rekenen.ts`, getest). Zonder `groep` geen kopje.

```jsonc
{
  "formaat": 3,
  "samenvatting": {
    "kop": "Eén zin met het oordeel",
    "regels": ["hoogstens vijf korte regels, ook voor het management"],
    "tekst": "optioneel: Markdown-toelichting (staat ingeklapt)"
  },
  "doel": { "status": "voor|op-koers|achter|onbekend", "toelichting": "…" },
  "funnel": [],
  "secties": [ {
    "stap": 1, "tab": "advertenties", "titel": "Advertenties", "ondertitel": "…",
    "kerncijfers": [ { "label": "Besteed", "waarde": 1960.8, "eenheid": "euro",
                       "toelichting": "62% van het budget", "vergelijking": { "label": "Budget", "waarde": 3150 } },
                     { "label": "Kosten per sessie Meta", "waarde": 0.33, "eenheid": "euro",
                       "benchmark": { "groep": "11 Meta-actiecampagnes van hetzelfde account, 12 maanden voor de start",
                                      "aantal": 11, "mediaan": 0.41, "p25": 0.30, "p75": 0.62, "min": 0.18, "max": 1.10,
                                      "hogerIsBeter": false } } ],
    "tekst": "Hoogstens drie zinnen: hoe je de cijfers leest. Geen oordelen.",
    "tabellen": [ { "titel": "Per platform en campagne",
                    "kolommen": [ { "label": "Campagne", "eenheid": "tekst" }, { "label": "Platform", "eenheid": "tekst" },
                                  { "label": "Kosten", "eenheid": "euro" }, { "label": "Vertoningen", "eenheid": "aantal" },
                                  { "label": "Klikken", "eenheid": "aantal" }, { "label": "CTR", "eenheid": "procent" },
                                  { "label": "Kosten per klik", "eenheid": "euro" }, { "label": "Conversies", "eenheid": "aantal" },
                                  { "label": "Leads", "eenheid": "aantal" }, { "label": "Kosten per conversie of lead", "eenheid": "euro" } ],
                    "rijen": [ ["Demand Gen | A2", "Google Ads", 980.4, 250000, 7000, 2.8, 0.14, 12, "n.v.t.", 81.7] ],
                    "totaal": ["Totaal", "", 1960.8, 520000, 14000, 2.7, 0.14, 12, 9, 93.4] } ],
    "grafieken": [ { "titel": "Kosten per week", "type": "staaf", "eenheid": "euro",
                     "x": ["2026-09-14", "2026-09-21"], "reeksen": [ { "naam": "Meta", "waarden": [100, 120] } ] } ],
    "kop": "Eén zin met het oordeel over dit onderdeel",
    "oordeel": "goed|aandacht|probleem|geen-data",
    "bevindingen": [ "twee tot vijf korte punten, elk met het cijfer erbij" ],
    "acties": [ { "titel": "…", "toelichting": "wat, waar en hoeveel", "prioriteit": "hoog|middel|laag" } ]
  } ],
  "aanbevelingen": [ { "titel": "…", "toelichting": "…", "prioriteit": "hoog|middel|laag",
                       "tabs": ["advertenties", "email"] } ],
  "herkenning": [ { "bron": "Meta Ads", "soort": "campagne", "naam": "…", "reden": "…", "zekerheid": "zeker|waarschijnlijk|twijfel" } ],
  "bronnen": [ "Windsor · Meta Ads · Van den Udenhout (69324444)", "Supabase · marketing_analyse_leads t/m 22 nov", "Supabase · Syntec orders (marketing_analyse_orders) t/m 14 nov" ],
  "correcties": [ { "correctie": "regel uit de Data correctie", "verwerking": "wat je ermee deed" } ],
  "semantiekVoorstellen": [ { "blok": "Google Analytics 4", "voorstel": "…", "reden": "…" } ],
  "datakwaliteit": [ "…" ]
}
```
Eenheden: `aantal | euro | procent | seconden | tekst` (procent als 3.2). Grafieken: hoogstens
zes reeksen, één eenheid, datums `JJJJ-MM-DD`. Getallen als getal; wat een platform niet
levert als tekst `"n.v.t."`, nooit als 0. `aanbevelingen` zijn de **acties voor de
campagne als geheel** (drie tot zes, met in `tabs` de stapsleutels waar de onderbouwing staat);
de pagina zet ze in Wat nu te doen op de samenvatting, af te vinken door het team. `inzichten`
vervallen (de bevindingen per stap nemen ze over). `funnel` wordt niet meer getoond (de
hoofdgetallen staan in de navigatie); `[]` mag. Bij een tussentijdse evaluatie zijn de acties
"nu bijsturen", bij een eindevaluatie "lessen". `semantiekVoorstellen` alleen voor bevindingen
die voor álle campagnes gelden; je past de semantic layer nooit zelf aan.

**Kerncijfers** (`MaKerncijfers`, voor het overzicht; null als onbekend):
```json
{ "kosten": 1960.8, "vertoningen": 520000, "vertoningenAds": 410000, "klikken": 12000, "sessies": 8000, "leadEvents": 25,
  "leadsSyntec": 31, "leadBron": "ga4", "leadsDoel": 9, "leadsDoelSoort": "proefritten", "doelLeads": 20,
  "doel": { "status": "achter", "toelichting": "…" } }
```
`vertoningen` = betaald + organisch. `vertoningenAds` = alleen de vertoningen van Google Ads,
Meta Ads en LinkedIn Ads samen, en `klikken` = hun klikken samen (Google Ads clicks, Meta link
clicks, LinkedIn clicks). Het overzicht toont de gezamenlijke CTR als klikken ÷ vertoningenAds;
vul daarom altijd allebei in. `sessies` = sessies die op de campagnepagina('s) begonnen, uit elk
kanaal: dat zijn de "bezoekers" in het overzicht.
**Leads** (harde regel hierboven): `leadBron` is `"ga4"` (standaard) of `"syntec"` (alleen als het
doel Syntec noemt en de analyse uitsluitend over Van den Udenhout gaat). `leadsDoel` is HET
leadcijfer: de leads van de soort uit het doel uit die ene bron; `leadsDoelSoort` zegt welke
soort ("proefritten", "alle autoleads"). Het overzicht zet `leadsDoel` tegen het doel, en de
kosten tegen het budget. `leadEvents` = alle lead-events op de campagnepagina (context).
`leadsSyntec` = alle websiteleads in Syntec voor merk en model (uit de view, alle soorten), null
tenzij de analyse uitsluitend over Van den Udenhout gaat; `leadsSyntecInternet` vervalt.
`doelLeads`: het aantal leads uit het doel zoals jij het leest ("20 proefritten uit Syntec" → 20),
null als het doel niet over een aantal leads gaat.
Bij een **rapportage** toont het overzicht geen kerncijfers: geef `{}` mee (of vul in wat
vanzelf meekomt), laat `doel` weg en geef `funnel: []` mee.

## Stap 5 — Wegschrijven
Schrijf de JSON eerst naar een bestand in je scratchpad en controleer hem (`node -e` met
`JSON.parse`): `formaat` is 3; elke sectie heeft `stap`, `titel` en (bij een campagne) een
geldige `tab` uit de stapsleutels hierboven; elke stap hoogstens één keer; hoogstens vijf `regels` en vijf `bevindingen`;
elke actie en aanbeveling heeft een `prioriteit`; staat er een sectie `orders`, dan heeft die
een tabel per klantgroep met een totaalregel; bij een campagne staan `leadBron`, `leadsDoel`
en `leadsDoelSoort` in de kerncijfers en is `leadBron` alleen `"syntec"` als het doel Syntec noemt
en de analyse uitsluitend over Van den Udenhout gaat; geen tegel, regel of kolom met extra
kanaalkosten bij een campagne-analyse; elke `benchmark` heeft `groep`, `aantal` (minstens 5),
`mediaan`, `p25` en `p75` met p25 ≤ mediaan ≤ p75 (een onbruikbare benchmark laat het dashboard
weg). Sla op met
dollar-quoting:
```sql
select * from dataloket.marketing_analyse_bewaar(
  p_campagne_id  => '<campagne-id>',
  p_resultaat    => $json$ { … } $json$::jsonb,
  p_kerncijfers  => $json$ { … } $json$::jsonb,
  p_samenvatting => $txt$ <de kop> $txt$,
  p_periode_van  => 'JJJJ-MM-DD',
  p_periode_tot  => 'JJJJ-MM-DD',
  p_prompt_id    => '<id of null>',
  p_semantiek_id => '<id of null>',
  p_model        => '<model-id waarop je draait>'
);
```
De functie kent het versienummer toe (nooit hergebruikt), bepaalt het label, legt de briefing
en de Data correctie van dat moment vast, en zet de planning op Uit na een eindevaluatie
(via `analyse_ronde`, die met de planning meeloopt; migratie 0049). Te
groot (> ~2 MB)? Maak het resultaat compacter, niet in stukken.

Na het bewaren mailt het dashboard vanzelf de volgers van de campagne (trigger in migratie
0043, via het gedeelde Gmail-account). Daar hoef je niets voor te doen; een nieuwe campagne krijgt de
adressen uit E-mail settings voor haar merk vanzelf als volgers (trigger in migratie 0047); de mail bevat de kop,
de vijf regels en het doeloordeel, dus schrijf die zo dat ze zonder de rest te begrijpen zijn.

## Stap 6 — Terugmelden
Na een analyseronde eerst een overzicht: wat er gemaakt is, wat er is overgeslagen en waarom
(geen prompt, nog niet gestart, een fout), en per ingeplande regel wanneer hij weer aan de beurt
is (`volgende` uit `marketing_analyse_ronde()`, opnieuw opgevraagd na het bewaren). Daarna
per campagne: versie, label, periode, de kop en de vijf regels, het doeloordeel, wat er met de
Data correctie is gedaan, eventuele voorstellen voor de semantic layer en kanttekeningen. De
analyse staat in het dashboard onder Campagnes → Marketing analyse
(`?tab=marketing-analyse&analyse=<campagne-id>`). Meld ook of de volgers gemaild zijn: kijk
een halve minuut na het bewaren naar `notificatie_verstuurd_op`, `notificatie_aantal` en
`notificatie_fout` van de nieuwe versie.
