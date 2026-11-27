-- Marketing analyse: leads en orders in het overzicht, en welke orders tellen (semantic layer versie 12)
--
-- WAAROM DIT BESTAAT
-- Besluit van de eigenaar, 27 november 2026. De regel van een Campagne analyse in het overzicht toont
-- onder elkaar de leads in Google Analytics, de internetleads in Syntec en de orders in Syntec. De
-- Syntec-cijfers alleen bij Van den Udenhout met merk en model in de briefing; naast een ander
-- bedrijf alleen het deel Van den Udenhout ("alleen VDU"). Welke orders tellen bepaalt de briefing:
-- standaard alle klantgroepen van Nieuw en Gebruikt. Het doel gaat altijd over leads.
--
-- WAT ER KOMT
-- Een nieuwe versie van de semantic layer: de vorige met dezelfde tekstwijzigingen als in
-- lib/marketingAnalyse/standaardSemantiek.ts (Algemeen, Data leads, Syntec orders; houd ze gelijk).
-- Alleen als de laatste versie de oude teksten nog bevat, dus nooit twee keer.

insert into dataloket.marketing_analyse_semantiek (versie, inhoud, opgeslagen_door)
select s.versie + 1,
       jsonb_set(jsonb_set(jsonb_set(s.inhoud, '{blokken,algemeen}', to_jsonb(replace(replace(replace(replace(replace((s.inhoud->'blokken'->>'algemeen'), $o$Zeg dat in de analyse in plaats van een nul te tonen.
$o$, $n$Zeg dat in de analyse in plaats van een nul te tonen.
- **Van den Udenhout samen met een ander bedrijf**: de Syntec-leads en -orders gelden dan alleen voor het deel Van den Udenhout. Tel ze wel en zeg overal "alleen Van den Udenhout" (besluit van de eigenaar, 27 november 2026). Het leadcijfer tegen het doel komt dan altijd uit GA4 (zie hieronder).
$n$), $o$1. Alleen bij een analyse die **uitsluitend over Van den Udenhout** gaat. Bij een ander bedrijf laat je de orders weg.
2. Tel in de view **marketing_analyse_orders_klant**: de verkoop aan klanten (Ordersoort Nieuw of Gebruikt). **Handel** telt daar niet in mee; noem het aantal Handel-orders hoogstens apart, uit marketing_analyse_orders.$o$, $n$1. Alleen als **Van den Udenhout** in de briefing staat (bij meer bedrijven alleen dat deel; zeg dan "alleen Van den Udenhout"), en alleen als de briefing een **merk en minstens één model** heeft: daarop zoek je de orders op. Ontbreekt merk of model, laat de orders dan weg (ordersSyntec null) en zeg in de datakwaliteit dat merk of model in de briefing ontbreekt. Bij een ander bedrijf laat je de orders weg.
2. **Welke orders tellen, zegt de briefing** (besluit van de eigenaar, 27 november 2026). Zegt de briefing (doel of omschrijving) er niets over, dan tellen **alle klantgroepen** van Ordersoort **Nieuw én Gebruikt**: de hele view **marketing_analyse_orders_klant**. Zegt de briefing dat alleen een deel telt ("alleen koop particulier", "alleen nieuw", "zonder lease"), dan tel je alleen dat deel; welke klantgroepen bij welk ordertype horen staat in het blok Syntec orders ("Welke orders tellen: de verdeling"). **Handel** (Ordersoort Handel) telt alleen als de briefing erom vraagt; noem het aantal anders hoogstens apart, uit marketing_analyse_orders. Zeg in de kerncijfers (ordersSoort) en in de stap Orders in Syntec in gewone taal wat je telde, en welke zin uit de briefing dat bepaalde.$n$), $o$5. Orders zijn **niet** het leadcijfer en tellen nooit mee in leadsDoel. Gaat het doel over verkochte auto's of orders ("30 verkochte auto's"), dan beoordeel je het doel op de orders en zeg je dat in de toelichting bij het doel.$o$, $n$5. Orders zijn **niet** het leadcijfer en tellen nooit mee in leadsDoel. Het doel van een Campagne analyse gaat **altijd over leads**, nooit over orders (besluit van de eigenaar, 27 november 2026): de orders zijn context naast de leads.$n$), $o$een order volgt vaak weken na de lead.

## Overzicht van alle leads en orders (altijd, Van den Udenhout)$o$, $n$een order volgt vaak weken na de lead.

## Leads en orders in het overzicht (kerncijfers)
Besluit van de eigenaar, 27 november 2026. De regel van een Campagne analyse in het overzicht toont onder elkaar:
1. **Google Analytics** (leadsGa4): de lead-events van de soort uit het doel, in sessies die op de campagnepagina('s) begonnen. Altijd, bij elk bedrijf, ook als het leadcijfer tegen het doel uit Syntec komt.
2. **Syntec internet** (leadsInternet, leadsInternetSoort): leads met **Kanaalgroep "Internet"** (alle kanalen daarbinnen: udenhout.nl, merksites en portals) voor het merk en de modellen uit de briefing, in de periode. De soort volgt de briefing: noemt het doel of de omschrijving een soort ("20 proefritten"), dan die soort; anders alle soorten. Zie het blok Data leads.
3. **Syntec orders** (ordersSyntec, ordersSoort): zie "Orders bij een Campagne analyse" hierboven.
Punt 2 en 3 alleen als Van den Udenhout in de briefing staat én de briefing een merk en minstens één model heeft; anders null (het dashboard vraagt dan zelf om merk en model, of meldt dat er bij dat bedrijf geen Syntec-data is). Bij meer bedrijven alleen het deel Van den Udenhout.

## Overzicht van alle leads en orders (altijd, Van den Udenhout)$n$), $o$wil hij bij elke analyse die uitsluitend over Van den Udenhout gaat zien wat$o$, $n$wil hij bij elke analyse met Van den Udenhout (bij meer bedrijven alleen dat deel) zien wat$n$))), '{blokken,data_leads}', to_jsonb(replace((s.inhoud->'blokken'->>'data_leads'), $o$

## De kolommen
- **Kanaal**$o$, $n$

## Internetleads in het overzicht (leadsInternet)
- Besluit van de eigenaar, 27 november 2026. Tel in de view **marketing_analyse_leads_soort** de leads met **internet = true** (Kanaalgroep "Internet"), voor merk, modellen en periode (aangelegd_op). Alle kanalen binnen Internet tellen: udenhout.nl, merksites (Volkswagen.nl, Audi.nl …) en portals (Autoscout24, Gaspedaal …). Dat is ruimer dan de websiteleads van het leadcijfer tegen het doel.
- De soort volgt de briefing (kolom soort): noemt het doel of de omschrijving een soort, dan alleen die soort; anders alle soorten. Zeg in leadsInternetSoort wat je telde ("proefritten", "alle soorten").
- Alleen met een merk en minstens één model in de briefing; anders null en een regel in de datakwaliteit. Bij meer bedrijven alleen het deel Van den Udenhout.

## De kolommen
- **Kanaal**$n$))), '{blokken,data_orders}', to_jsonb(replace((s.inhoud->'blokken'->>'data_orders'), $o$- Tel in de view **marketing_analyse_orders_klant**: alleen Ordersoort Nieuw en Gebruikt (de verkoop aan klanten), met de kolom **klantgroep_naam** ("Geen klantgroep" als de klantgroep leeg is). Filter op merk, model en periode (orderdatum_op).
- **Handel** (1.712 in 2026) is geen verkoop aan een klant en heeft bijna nooit een klantgroep. Hij staat niet in de view; noem hem alleen apart, uit marketing_analyse_orders.$o$, $n$- **De briefing bepaalt welke orders tellen** (besluit van de eigenaar, 27 november 2026). Zegt de briefing (doel of omschrijving) er niets over, dan tellen **alle klantgroepen** van Ordersoort **Nieuw én Gebruikt**: tel in de view **marketing_analyse_orders_klant** (kolom **klantgroep_naam**, "Geen klantgroep" als de klantgroep leeg is), gefilterd op merk, model en periode (orderdatum_op).
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
- Een klantgroep die hier niet staat (nieuw in Syntec): tel hem standaard mee, deel hem in bij het ordertype dat het best past en meld hem in de datakwaliteit.$n$))),
       null
from dataloket.marketing_analyse_semantiek s
where s.versie = (select max(versie) from dataloket.marketing_analyse_semantiek)
  and position($c$Zeg dat in de analyse in plaats van een nul te tonen.
$c$ in s.inhoud->'blokken'->>'algemeen') > 0 and position($c$1. Alleen bij een analyse die **uitsluitend over Van den Udenhout** gaat. Bij een ander bedrijf laat je de orders weg.
2. Tel in de view **marketing_analyse_orders_klant**: de verkoop aan klanten (Ordersoort Nieuw of Gebruikt). **Handel** telt daar niet in mee; noem het aantal Handel-orders hoogstens apart, uit marketing_analyse_orders.$c$ in s.inhoud->'blokken'->>'algemeen') > 0 and position($c$5. Orders zijn **niet** het leadcijfer en tellen nooit mee in leadsDoel. Gaat het doel over verkochte auto's of orders ("30 verkochte auto's"), dan beoordeel je het doel op de orders en zeg je dat in de toelichting bij het doel.$c$ in s.inhoud->'blokken'->>'algemeen') > 0 and position($c$een order volgt vaak weken na de lead.

## Overzicht van alle leads en orders (altijd, Van den Udenhout)$c$ in s.inhoud->'blokken'->>'algemeen') > 0 and position($c$wil hij bij elke analyse die uitsluitend over Van den Udenhout gaat zien wat$c$ in s.inhoud->'blokken'->>'algemeen') > 0 and position($c$

## De kolommen
- **Kanaal**$c$ in s.inhoud->'blokken'->>'data_leads') > 0 and position($c$- Tel in de view **marketing_analyse_orders_klant**: alleen Ordersoort Nieuw en Gebruikt (de verkoop aan klanten), met de kolom **klantgroep_naam** ("Geen klantgroep" als de klantgroep leeg is). Filter op merk, model en periode (orderdatum_op).
- **Handel** (1.712 in 2026) is geen verkoop aan een klant en heeft bijna nooit een klantgroep. Hij staat niet in de view; noem hem alleen apart, uit marketing_analyse_orders.$c$ in s.inhoud->'blokken'->>'data_orders') > 0;
