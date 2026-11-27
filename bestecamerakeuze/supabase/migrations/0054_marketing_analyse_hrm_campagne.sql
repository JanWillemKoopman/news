-- Marketing analyse: HRM analyse wordt het maandrapport HRM campagne
--
-- WAAROM DIT BESTAAT
-- Verzoek van de eigenaar, 27 november 2026: de HRM analyse (migratie 0053) wordt een maandrapport
-- dat elke maand verstuurd wordt. Het overzicht loopt van januari 2026 t/m de afgelopen maand, en
-- elke vergelijking gaat tegen de maand daarvoor. De lezer moet zien: hoe staat het op jaarbasis,
-- hoe deed de afgelopen maand het, en hoe was dat tegen de maand ervoor. En steeds apart voor
-- Van den Udenhout en voor PGZ (Porsche, Bentley).
--
-- WAT ER VERANDERT
--  - opzet ...0006 heet "HRM campagne", standaardplanning Maandelijks;
--  - de analyse "HRM analyse werving" heet "HRM campagne", planning Maandelijks, nieuwe periode en
--    omschrijving;
--  - versie 2 van de prompt van de opzet (maandrapport, twee clusters, maand en week in Leads via
--    social media).
-- Idempotent: opnieuw draaien verandert niets en voegt geen tweede promptversie toe.

update dataloket.marketing_analyse_opzetten
set naam = 'HRM campagne', standaard_planning = 'maand'
where id = '7d0c0000-0000-4000-8000-000000000006';

update dataloket.marketing_analyse_campagnes
set naam = 'HRM campagne',
    planning = 'maand',
    periode_tekst = '1 januari 2026 t/m de afgelopen maand',
    omschrijving = 'Maandrapport over het werven van personeel, voor Van den Udenhout en PGZ (Porsche, Bentley): uitgaven aan vacaturecampagnes, leads via social media en sollicitaties op de website. Hoe staat het op jaarbasis, hoe deed de afgelopen maand het en hoe was dat tegen de maand ervoor.'
where opzet_id = '7d0c0000-0000-4000-8000-000000000006'
  and naam in ('HRM analyse werving', 'HRM analyse');

insert into dataloket.marketing_analyse_prompts (opzet_id, versie, inhoud, opgeslagen_door)
select '7d0c0000-0000-4000-8000-000000000006', 2, $prompt$# HRM campagne — maandrapport werving

## Doel en lezer
Een maandrapport over het werven van personeel, voor marketing en HR. Het wordt elke maand verstuurd. De lezer wil in één minuut drie dingen weten:
1. **Hoe staat het op jaarbasis**: wat hebben we sinds 1 januari uitgegeven en opgeleverd.
2. **Hoe deed de afgelopen maand het**: uitgaven, leads, kosten per lead en sollicitaties in die maand.
3. **Hoe was de afgelopen maand tegen de maand ervoor**: het verschil, in aantallen en in procenten.

En dat steeds **apart voor Van den Udenhout en voor PGZ** (zie Clusters). Hoe je werving herkent, welk account bij welk bedrijf hoort, welke events sollicitaties zijn en hoe je functiegroepen indeelt, staat in het blok **Werving** van de semantic layer. Volg dat blok.

## Periode: het jaar, de focusmaand en de maand ervoor
- **De focusmaand** is de laatste volle kalendermaand vóór de dag van de analyse. Bij een geplande ronde is dat de maand uit de planning. Voorbeeld: een analyse op 4 december 2026 heeft focusmaand november 2026.
- **De vergelijkingsmaand** is de maand vóór de focusmaand.
- **De periode** loopt van 1 januari 2026 t/m de laatste dag van de focusmaand. Zet die in `p_periode_van` en `p_periode_tot`. Vanaf januari 2027: 1 januari van het jaar van de focusmaand; in een januari-rapport is de vergelijkingsmaand december van het jaar ervoor (haal die maand er dan apart bij).
- Dagen na de focusmaand tellen nergens mee, ook niet in de weekgrafieken.
- **Maandgrafieken** per kalendermaand, x-as als JJJJ-MM, van januari t/m de focusmaand. **Weekgrafieken** per ISO-week (maandag t/m zondag), de maandag als datum (JJJJ-MM-DD); een week die over het begin of het einde van de periode valt telt alleen de dagen binnen de periode, en dat staat in de voetnoot.
- Sollicitaties op de website lopen vanaf het moment dat het event bestaat (udenhout.nl 10 juni 2026, pgz.nl 27 mei 2026). Zet de maanden en weken daarvóór op null (niet 0) en zeg in de voetnoot dat er toen niet gemeten werd.

## Clusters: Van den Udenhout en PGZ
Elk hoofdcijfer staat er voor de hele groep én apart voor twee clusters:
- **Van den Udenhout**: de wervingscampagnes van Van den Udenhout, Instra en Caromi (Meta "Van den Udenhout", Google Ads "Udenhout") en VELOO (Meta "Veloo"). Sollicitaties: udenhout.nl.
- **PGZ** (Porsche, Bentley): Porsche Groep Zuid (Meta "Porsche Groep Zuid" en Google Ads "Porsche Centrum Brabant B.V."), Porsche Centrum Maastricht, PGZ en Bentley Maastricht. Sollicitaties: pgz.nl; de Porsche-sites en Bentley meten geen sollicitaties.
De tabellen **Per bedrijf** blijven daaronder de bedrijven uit het blok Werving tonen, gegroepeerd per cluster (eerst de bedrijven van Van den Udenhout, dan die van PGZ), met een subtotaalregel per cluster in de rijen en de totaalregel voor de groep.

## Vergelijken met de maand ervoor
- Elk kerncijfer van de focusmaand krijgt `vergelijking` = hetzelfde cijfer in de vergelijkingsmaand, met als `label` de naam van die maand ("oktober"). Het dashboard rekent zelf het verschil in procenten uit; zet het percentage dus niet nog eens in de toelichting.
- Zet `hogerIsBeter` in de vergelijking: `true` bij leads, sollicitaties en sessies, `false` bij kosten per lead; laat het weg bij uitgaven (meer uitgeven is op zich niet goed of slecht).
- In tabellen met een maandvergelijking: kolommen **<focusmaand>**, **<vergelijkingsmaand>** en **Verschil** (tekst, "+12%", "−8%", "gelijk"; bij een percentage in procentpunten; "n.v.t." als de vergelijkingsmaand 0 of niet gemeten is).
- Noem een stijging of daling in bevindingen en samenvatting pas als het verschil minstens 10% is én minstens 10 leads, 10 sollicitaties of € 250; anders is het "gelijk gebleven".
- Kerncijfers die over het jaar gaan (sinds 1 januari) krijgen geen vergelijking; zet in de toelichting het maandgemiddelde van het jaar, zodat de focusmaand daartegen te lezen is.

## Samenvatting
- `kop`: één zin over de focusmaand tegen de maand ervoor, met het belangrijkste cijfer.
- `regels` (hoogstens vijf, elk met cijfers):
  1. Jaarbasis: uitgaven, leads en kosten per lead sinds 1 januari.
  2. De focusmaand: uitgaven, leads en kosten per lead, met het verschil tegen de maand ervoor in procenten.
  3. Van den Udenhout in de focusmaand: leads, kosten per lead en sollicitaties, met het verschil.
  4. PGZ in de focusmaand: leads, kosten per lead en (op pgz.nl) sollicitaties, met het verschil.
  5. De opvallendste verschuiving of het belangrijkste gat in de data.
- Geen doel: laat `doel` weg (rapportage).

## Secties (elk een eigen stap, in deze volgorde, zonder `tab`, met `groep`)
Elke sectie heeft `kop`, `oordeel`, kerncijfers (het eerste is het hoofdgetal in de navigatie), twee tot vijf `bevindingen` met het cijfer erbij, `acties` en in `tekst` hoogstens drie zinnen over hoe gemeten is.

### 1. Maandoverzicht (groep "Overzicht")
- Kerncijfers, allemaal over de focusmaand met de vergelijkingsmaand: uitgaven (hoofdgetal); leads via social media; kosten per lead; sollicitaties op de website.
- Tabel **Van den Udenhout** en tabel **PGZ**, elk met de regels Uitgaven, Meta Ads, Google Ads, Leads via social media, Kosten per lead, Sollicitaties op de website (bij PGZ: pgz.nl) en Sessies op vacaturepagina's. Kolommen: **Sinds 1 januari** | **Gemiddeld per maand** | **<focusmaand>** | **<vergelijkingsmaand>** | **Verschil**. Daarna dezelfde tabel **Hele groep**.
- Grafiek **Leads per maand per cluster** (staaf, aantal, reeksen Van den Udenhout en PGZ).
- Oordeel: het slechtste oordeel van stap 2 t/m 4.

### 2. Investering (groep "Investering en leads")
- Kerncijfers: uitgaven in de focusmaand (met de vergelijkingsmaand); uitgaven sinds 1 januari (toelichting: gemiddeld per maand); Van den Udenhout in de focusmaand; PGZ in de focusmaand; LinkedIn Ads (ook als het € 0 is, met "geen wervingscampagnes").
- Grafiek **Uitgaven per maand** (staaf, euro, reeksen Meta Ads en Google Ads). Grafiek **Uitgaven per maand per cluster** (staaf, euro, reeksen Van den Udenhout en PGZ). Grafiek **Opgeteld sinds 1 januari** (lijn, euro, per maand). Daaronder grafiek **Uitgaven per week** (staaf, euro, reeksen Meta Ads en Google Ads).
- Tabellen **Per bedrijf** (Meta, Google Ads, totaal sinds 1 januari, aandeel, <focusmaand>, <vergelijkingsmaand>, verschil; subtotaal per cluster, totaalregel) en **Per functiegroep** (campagnes, totaal sinds 1 januari, aandeel, <focusmaand>, <vergelijkingsmaand>, verschil; totaalregel).
- Kijk naar de verdeling over de week in de focusmaand: welk deel van de Meta-uitgaven valt op vrijdag t/m zondag. Noem het als dat boven 70% ligt.
- Oordeel: **aandacht** als de uitgaven in de focusmaand meer dan 25% boven het maandgemiddelde van het jaar liggen, of als een campagne die in de vergelijkingsmaand meer dan € 400 uitgaf in de focusmaand onder een kwart daarvan zakt; anders **goed**. Uitgaven zijn op zich geen probleem.

### 3. Leads via social media (groep "Investering en leads")
- Kerncijfers: leads in de focusmaand (met de vergelijkingsmaand; hoofdgetal); kosten per lead in de focusmaand (met de vergelijkingsmaand); leads sinds 1 januari (toelichting: gemiddeld per maand); kosten per lead sinds 1 januari; Van den Udenhout: leads in de focusmaand (met de vergelijkingsmaand); PGZ: leads in de focusmaand (met de vergelijkingsmaand). In de toelichting van de leads in de focusmaand: hoeveel via leadformulier en hoeveel via de website (pixel).
- Grafieken, in deze volgorde:
  1. **Leads per maand** (staaf, aantal, reeksen Van den Udenhout en PGZ).
  2. **Kosten per lead per maand** (lijn, euro, reeksen Groep, Van den Udenhout en PGZ).
  3. **Leads per week** (staaf, aantal, dezelfde reeksen als 1).
  4. **Kosten per lead per week** (lijn, euro, dezelfde reeksen als 2; een week met minder dan 5 leads in een cluster krijgt voor dat cluster null, en dat staat in de voetnoot).
- Tabellen **Per bedrijf** en **Per functiegroep**: Meta-uitgaven sinds 1 januari, leads sinds 1 januari, kosten per lead sinds 1 januari, leads <focusmaand>, leads <vergelijkingsmaand>, verschil, kosten per lead <focusmaand>, kosten per lead <vergelijkingsmaand>; bij Per bedrijf een subtotaal per cluster; totaalregel.
- Oordeel op de kosten per lead van de focusmaand tegen die sinds 1 januari: **probleem** boven 1,5 keer, **aandacht** boven 1,2 keer of meer dan 25% duurder dan de vergelijkingsmaand, anders **goed**. Noem het oordeel ook apart voor Van den Udenhout en PGZ in de bevindingen.
- Noem de duurste en de goedkoopste functiegroep en bedrijf in de focusmaand (alleen met minstens 20 leads in die maand; anders over het jaar, en zeg dat).

### 4. Sollicitaties op de website (groep "Website")
- Kerncijfers: sollicitaties in de focusmaand (met de vergelijkingsmaand; hoofdgetal); udenhout.nl in de focusmaand (met de vergelijkingsmaand); pgz.nl in de focusmaand (met de vergelijkingsmaand); sollicitaties sinds de start van de meting (toelichting: gemiddeld per volle maand); een tegel "Niet gemeten" met de vier websites zonder event (eenheid tekst).
- Grafiek **Sollicitaties per maand** (staaf, aantal, reeksen udenhout.nl en pgz.nl). Daaronder **Sollicitaties per week** (staaf, aantal, dezelfde reeksen).
- Tabel **Waar de sollicitaties vandaan komen** in de focusmaand en de vergelijkingsmaand, per website, met de groepen uit het blok Werving; kolommen <focusmaand>, <vergelijkingsmaand>, verschil, sinds de start; totaalregel.
- Noem altijd hoeveel sollicitaties de Google-vacaturecampagnes in GA4 opleveren in de focusmaand, en dat Google Ads ze zelf niet telt zolang dat zo is.
- Oordeel op de focusmaand tegen het gemiddelde per volle maand sinds de start: **probleem** meer dan 30% lager, **aandacht** 15 tot 30% lager, anders **goed**.

### 5. Vacaturepagina's (groep "Website")
- Kerncijfers: sessies op vacaturepagina's in de focusmaand (met de vergelijkingsmaand), per grote website (udenhout.nl, Porsche Centrum Brabant, overige).
- Tabel **Vacaturepagina's per website**: pagina, website, sessies <focusmaand>, sessies <vergelijkingsmaand>, verschil, sessies sinds 1 januari, sollicitatie gemeten (Ja of Nee); totaalregel.
- Oordeel: **aandacht** als een website zonder sollicitatie-event in de focusmaand meer dan 100 sessies op vacaturepagina's had; anders **goed**.

### 6. Campagnes (groep "Campagnes en merk")
- Kerncijfers: aantal campagnes met uitgaven in de focusmaand (met de vergelijkingsmaand); grootste campagne in de focusmaand; goedkoopste lead in de focusmaand (minstens 10 leads); aantal campagnes zonder lead in de focusmaand en hun uitgaven.
- Tabel **Wervingscampagnes in <focusmaand>**: campagne, cluster, bedrijf, platform, functiegroep, uitgaven, leads, kosten per lead, en de uitgaven en leads van de vergelijkingsmaand; op uitgaven, hoog naar laag; bij Google "n.v.t." voor leads; totaalregel. Daaronder tabel **Alle wervingscampagnes sinds 1 januari** (campagne, cluster, bedrijf, platform, uitgaven, leads, kosten per lead; totaalregel).
- Oordeel: **aandacht** als een leadcampagne (doel OUTCOME_LEADS) in de focusmaand meer dan € 150 uitgaf zonder lead, of als een campagne met minstens 10 leads in de focusmaand meer dan twee keer de gemiddelde kosten per lead van die maand heeft; anders **goed**.

### 7. Employer branding (groep "Campagnes en merk")
- Kerncijfers: vacatureposts in de focusmaand op Facebook, LinkedIn en Instagram (met de vergelijkingsmaand) en hun vertoningen; vacatureposts sinds 1 januari; weergaven van de LinkedIn-carrièrepagina in de focusmaand (met de vergelijkingsmaand).
- Tabel **Vacatureposts per maand** per kanaal, en tabel **LinkedIn carrièrepagina** per bedrijf, met de focusmaand, de vergelijkingsmaand en sinds 1 januari.
- Oordeel: **aandacht** als de groep in de focusmaand minder dan vier vacatureposts plaatste; anders **goed**.

## Acties
- Per sectie concrete acties voor de komende maand: wat, waar, hoeveel, en voor welk cluster. Prioriteit hoog voor alles wat geld kost zonder resultaat of een meetfout die sturen onmogelijk maakt.
- `aanbevelingen`: drie tot zes acties voor de werving als geheel. Laat `tabs` leeg (die werken alleen bij een campagne-analyse) en noem in de toelichting de sectie waar de onderbouwing staat ("Zie Leads via social media").

## Kerncijfers voor het overzicht
Vul `kosten` met de uitgaven over de hele periode (1 januari t/m de focusmaand). De rest mag `null` zijn.

## Wat je niet doet
- Geen Syntec-leads, geen Syntec-orders en geen `lead_kanaalkosten`: die gaan niet over werving.
- Geen vergelijking met eerdere jaren (behalve de vergelijkingsmaand in een januari-rapport) en geen vergelijking met een vorige versie van deze analyse.
- Een Meta-lead nooit "sollicitant" noemen en nooit optellen bij de sollicitaties op de website.$prompt$, null
where not exists (
  select 1 from dataloket.marketing_analyse_prompts
  where opzet_id = '7d0c0000-0000-4000-8000-000000000006' and versie = 2
);
