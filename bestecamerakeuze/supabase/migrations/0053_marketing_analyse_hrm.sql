-- Marketing analyse: opzet HRM analyse (werving bij alle bedrijven)
--
-- WAAROM DIT BESTAAT
-- Verzoek van de eigenaar, 25 en 26 november 2026: een analyse opzet zoals Campagne analyse,
-- maar uitsluitend over werving (vacatures en sollicitaties), voor alle bedrijven, wekelijks.
-- Onderzoek en besluiten staan in hrm-analyse-onderzoek.md.
--
-- WAT ER KOMT
--  - opzet "HRM analyse" (vast id ...0006), formulier rapportage, alle bedrijven, planning wekelijks;
--  - versie 1 van de prompt van die opzet;
--  - een nieuwe versie van de semantic layer: de vorige plus het blok Werving (gelijk aan
--    `werving` in lib/marketingAnalyse/standaardSemantiek.ts; houd ze gelijk).
-- Alles is idempotent: opnieuw draaien voegt niets dubbel toe.

insert into dataloket.marketing_analyse_opzetten
  (id, naam, formulier, bedrijf, bedrijven, volgorde, standaard, standaard_planning, aangemaakt_door)
values
  ('7d0c0000-0000-4000-8000-000000000006', 'HRM analyse', 'rapportage', null,
   array['Van den Udenhout','Porsche Centrum Brabant','Porsche Centrum Maastricht','PGZ','Bentley Maastricht','VELOO','Instra'],
   50, false, 'week', null)
on conflict (id) do nothing;

insert into dataloket.marketing_analyse_prompts (opzet_id, versie, inhoud, opgeslagen_door)
select '7d0c0000-0000-4000-8000-000000000006', 1, $prompt$# HRM analyse — werving bij alle bedrijven

## Doel en lezer
Een wekelijks overzicht van alles rond het werven van personeel, voor marketing en HR. De lezer wil in één minuut weten: wat geven we uit aan werving, hoeveel leads levert social media op, hoeveel mensen solliciteren op de website, en waar moeten we deze week iets aan doen. Eén analyse voor de hele groep; splits elk cijfer uit per bedrijf (besluit van de eigenaar, 25 november 2026).

Hoe je werving herkent, welk account bij welk bedrijf hoort, welke events sollicitaties zijn en hoe je functiegroepen indeelt, staat in het blok **Werving** van de semantic layer. Volg dat blok.

## Periode
- De analyse loopt van **1 januari van het lopende jaar t/m gisteren**. Zet de periode in `p_periode_van` en `p_periode_tot`.
- Uitgaven en social leads tonen vanaf 1 januari. Sollicitaties op de website vanaf het moment dat het event bestaat (udenhout.nl 10 juni 2026, pgz.nl 27 mei 2026), met in de voetnoot van de grafiek dat er daarvoor niet gemeten werd.
- Weekgrafieken per ISO-week, maandag t/m zondag, met de maandag als datum op de x-as (JJJJ-MM-DD). Zeg in de `tekst` van de sectie welke eerste en laatste week onvolledig zijn.
- **Vorige week** = de laatste volledige week (maandag t/m zondag) vóór vandaag. Die staat in de samenvatting en in de kerncijfers naast het totaal.

## Samenvatting
- `kop`: één zin met het oordeel over de werving als geheel.
- `regels` (hoogstens vijf): uitgaven sinds 1 januari en het aandeel Meta; social leads en kosten per lead, met de ontwikkeling; sollicitaties op de website per week; de opvallendste verschuiving van de laatste vier weken; het belangrijkste gat in de data.
- Geen doel: laat `doel` weg (rapportage).

## Secties (elk een eigen stap, in deze volgorde, zonder `tab`)
Elke sectie heeft `kop`, `oordeel`, kerncijfers (het eerste is het hoofdgetal in de navigatie), twee tot vijf `bevindingen` met het cijfer erbij, `acties` en in `tekst` hoogstens drie zinnen over hoe gemeten is.

### 1. Investering
- Kerncijfers: uitgaven sinds 1 januari; vorige week; Meta Ads; Google Ads; LinkedIn Ads (ook als het € 0 is, met "geen wervingscampagnes").
- Grafiek **Uitgaven per week** (staaf, euro, reeksen Meta Ads en Google Ads). Grafiek **Opgeteld sinds 1 januari** (lijn, euro).
- Tabellen **Per bedrijf** (Meta, Google Ads, totaal, aandeel; totaalregel) en **Per functiegroep** (campagnes, Meta, Google, totaal, aandeel; totaalregel).
- Kijk naar de verdeling over de week: welk deel van de Meta-uitgaven valt op vrijdag t/m zondag. Noem het als dat boven 70% ligt.
- Oordeel: **aandacht** als de gemiddelde weekuitgaven van de laatste vier volle weken meer dan 25% hoger liggen dan het gemiddelde sinds 1 januari, of als een campagne die meer dan € 100 per week uitgaf ineens onder een kwart daarvan zakt; anders **goed**. Uitgaven zijn op zich geen probleem.

### 2. Leads via social media
- Kerncijfers: leads sinds 1 januari; vorige week; via leadformulier; via website (pixel); kosten per lead sinds 1 januari, met in de toelichting de laatste vier volle weken.
- Grafiek **Leads per week** (staaf, aantal). Grafiek **Kosten per lead per week** (lijn, euro; laat een onvolledige laatste week weg).
- Tabellen **Per bedrijf** en **Per functiegroep**: Meta-uitgaven, leads, aandeel leads, kosten per lead; totaalregel.
- Oordeel op de kosten per lead van de laatste vier volle weken tegen die sinds 1 januari: **probleem** boven 1,5 keer, **aandacht** boven 1,2 keer, anders **goed**.
- Noem de duurste en de goedkoopste functiegroep en bedrijf (alleen met minstens 20 leads).

### 3. Sollicitaties op de website
- Kerncijfers: sollicitaties sinds de start van de meting; vorige week; udenhout.nl; pgz.nl; en een tegel "Niet gemeten" met de vier websites zonder event (eenheid tekst).
- Grafiek **Sollicitaties per week** (staaf, aantal, reeksen udenhout.nl en pgz.nl).
- Tabel **Waar de sollicitaties vandaan komen** (udenhout.nl en pgz.nl apart of samen met een kolom website), met de groepen uit het blok Werving; totaalregel.
- Noem altijd hoeveel sollicitaties de Google-vacaturecampagnes in GA4 opleveren, en dat Google Ads ze zelf niet telt zolang dat zo is.
- Oordeel op het weekgemiddelde van de laatste vier volle weken tegen het gemiddelde sinds de start: **probleem** meer dan 30% lager, **aandacht** 15 tot 30% lager, anders **goed**.

### 4. Vacaturepagina's
- Kerncijfers: sessies op vacaturepagina's in de periode, per grote website.
- Tabel **Vacaturepagina's per website**: pagina, website, sessies, sollicitatie gemeten (Ja of Nee); totaalregel.
- Oordeel: **aandacht** als een website zonder sollicitatie-event meer dan 1.000 sessies op vacaturepagina's had; anders **goed**.

### 5. Campagnes
- Kerncijfers: aantal campagnes met uitgaven; grootste campagne; goedkoopste lead (minstens 20 leads); aantal campagnes zonder lead en hun uitgaven.
- Tabel **Alle wervingscampagnes**: campagne, bedrijf, platform, functiegroep, uitgaven, klikken, leads, kosten per lead; op uitgaven, hoog naar laag; bij Google "n.v.t." voor leads; totaalregel.
- Oordeel: **aandacht** als een leadcampagne (doel OUTCOME_LEADS) meer dan € 250 uitgaf zonder lead, of als een campagne met minstens 20 leads meer dan twee keer de gemiddelde kosten per lead heeft; anders **goed**.

### 6. Employer branding
- Kerncijfers: vacatureposts op Facebook, LinkedIn en Instagram met hun vertoningen; weergaven van de LinkedIn-carrièrepagina.
- Tabel **LinkedIn carrièrepagina** per bedrijf en, als er genoeg posts zijn, de vijf best bekeken vacatureposts.
- Oordeel: **aandacht** als de groep samen minder dan vier vacatureposts per maand plaatst; anders **goed**.

## Acties
- Per sectie concrete acties: wat, waar, hoeveel. Prioriteit hoog voor alles wat geld kost zonder resultaat of een meetfout die sturen onmogelijk maakt.
- `aanbevelingen`: drie tot zes acties voor de werving als geheel. Laat `tabs` leeg (die werken alleen bij een campagne-analyse) en noem in de toelichting de sectie waar de onderbouwing staat ("Zie Investering").

## Kerncijfers voor het overzicht
Vul `kosten` (uitgaven in de periode). De rest mag `null` zijn.

## Wat je niet doet
- Geen Syntec-leads, geen Syntec-orders en geen `lead_kanaalkosten`: die gaan niet over werving.
- Geen benchmark tegen eerdere jaren en geen vergelijking met een vorige versie.
- Een Meta-lead nooit "sollicitant" noemen en nooit optellen bij de sollicitaties op de website.$prompt$, null
where not exists (
  select 1 from dataloket.marketing_analyse_prompts where opzet_id = '7d0c0000-0000-4000-8000-000000000006'
);

insert into dataloket.marketing_analyse_semantiek (versie, inhoud, opgeslagen_door)
select s.versie + 1,
       jsonb_set(s.inhoud, '{blokken,werving}', to_jsonb($werving$## Wat telt als wervingscampagne
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
- Leadcijfer = Meta `actions_lead` van de wervingscampagnes. Splits uit in `actions_onsite_conversion_lead_grouped` (leadformulier of Messenger in Facebook en Instagram) en `actions_offsite_conversion_fb_pixel_lead` (pixel op de website). Die twee tellen op tot `actions_lead`.
- Een lead is interesse, geen sollicitatie. Wat HR ermee doet (gesprek, aanname) staat niet in Windsor; schrijf "leads", nooit "sollicitanten".
- Google Ads levert geen leads. Gebruik de conversies van de Google-vacaturecampagnes niet: Van den Udenhout telt sollicitaties daar niet als conversie.
- Kosten per lead = Meta-uitgaven ÷ Meta-leads over dezelfde periode, nooit met Google-uitgaven erbij.

## Sollicitaties op de website (GA4)
- Sollicitatie = event `generate_lead_vacature`, geteld met `event_count`:
  - udenhout.nl, property "GA4_https://udenhout.nl" (255949462): **vanaf 10 juni 2026**;
  - pgz.nl, property "www.pgz.nl" (405407306): **vanaf 27 mei 2026**.
- Oudere events tellen niet mee en staan niet in de weekgrafiek: op udenhout.nl `snelsolliciteren_verzonden` en `generate_lead_snelsolliciteren` (t/m april 2026), op pgz.nl `job_application` (t/m januari 2026; `job_application_click_mailto` en `_click_tel` zijn klikken). Noem in datakwaliteit vanaf wanneer gemeten wordt.
- Porsche Centrum Brabant (306403800), Porsche Centrum Maastricht (306394313), Bentley Maastricht (435349999) en VELOO (381559171) meten **geen** sollicitatie. Zet daar "niet gemeten" (tekst), nooit 0. Klikken op e-mail of telefoon op een vacaturepagina zijn geen sollicitaties.
- Gebruik de property "JP.cars clicks" (469094476) niet: die telt dezelfde pagina's van Porsche Centrum Brabant nog een keer.
- Het event valt op udenhout.nl op `/vacatures`; een losse vacature heeft geen eigen `page_path`, dus per vacature tellen kan niet.
- Herkomst: `session_source_medium` en `campaign` × `event_count`, ingedeeld in: Google Ads merkcampagne ("T | Branding VDU", ook via bing / cpc), Google Ads vacaturecampagnes (campagne met Vacature), overige Google Ads, Google organisch, Bing, Direct, Google Bedrijfsprofiel (`gmb / organic`), Meta Ads (`facebook / paid`, `fb / paid`, `meta / paid`), social verwijzing (facebook.com, m.facebook.com, l.facebook.com, lm.facebook.com, l.instagram.com, `ig / social`), vacaturesites (stagemarkt, leerbanenmarkt, onze-jobs, uw-stad-werkt, jobleads, vacatures.roc) en overig.

## Vacaturepagina's
- Sessies op pagina's met "vacature", "werken-bij", "werkenbij" of "solliciteren" in `page_path`, per property. Belangrijkste pagina's: udenhout.nl `/vacatures`, `/vacatures/waarom-werken-bij`, `/vacatures/stage`, de landingspagina's voor alternatieve doelgroepen (`/vacatures/hobby`, `/vacatures/bouw`, `/vacatures/oss`) en `/vacatures/meeloopdagen`; Porsche Brabant en Maastricht `/over-ons-contact/vacatures` en `/werken-bij-porsche`; pgz.nl `/vacatures`; Bentley `/contact/vacatures`; VELOO `/pages/vacatures`.

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
- Meta Ads en GA4 **per dag** (`date`) ophalen en zelf per ISO-week (maandag t/m zondag) optellen. Opvragen met `week_iso` of `year_week_iso` liep bij Meta vast; per dag in stukken van een half jaar werkt.
- Instagram-posts gaven in november 2026 een time-out. Lukt het niet, zet dan "niet opgehaald" in datakwaliteit, geen nul.$werving$::text)),
       null
from dataloket.marketing_analyse_semantiek s
where s.versie = (select max(versie) from dataloket.marketing_analyse_semantiek)
  and not (s.inhoud->'blokken' ? 'werving');
