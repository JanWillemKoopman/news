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
2. **`dataloket.marketing_analyse_leads`**: de leads-kopie van "Data leads". **Alleen voor
   Van den Udenhout**; voor elk ander bedrijf niet gebruiken. `leadsSyntec` alleen invullen als
   de analyse uitsluitend over Van den Udenhout gaat, anders null (het overzicht toont dan de
   lead-events uit GA4).
3. **`dataloket.lead_kanaalkosten`**: extra maandkosten per GA4-bron/medium.

**Niet gebruiken**: alle andere tabellen in Supabase, ook niet `windsor_*`, `leads_raw` of
`v_leads`. De tabellen van de tool zelf (`marketing_analyse_campagnes`, `_prompts`,
`_semantiek`) lees en schrijf je wel; dat is geen analysedata. `_versies` schrijf je alleen
(via `marketing_analyse_bewaar`); eerdere versies lees je niet.

## Stap 0 — Welke campagne(s) of rapportage(s)
```sql
select c.id, c.naam, c.bedrijven, c.merk, c.modellen, c.startdatum, c.einddatum, c.periode_tekst,
       c.doel, c.budget, c.omschrijving, c.data_correctie, c.analyse_ronde, c.laatste_versie,
       o.id as opzet_id, o.naam as opzet, o.formulier
from dataloket.marketing_analyse_campagnes c
join dataloket.marketing_analyse_opzetten o on o.id = c.opzet_id
where c.naam ilike '%<deel van de naam>%';   -- "voer de analyseronde uit": where c.analyse_ronde
```
- **Analyseronde**: alle regels met `analyse_ronde = true`, één voor één. Sla een campagne
  over waarvan de startdatum nog niet bereikt is, en meld dat.
- Bestaat hij niet en geeft de gebruiker de gegevens in de chat: maak hem aan met
  `insert into dataloket.marketing_analyse_campagnes (opzet_id, naam, bedrijven, merk, modellen, startdatum, einddatum, periode_tekst, doel, budget, omschrijving) values (…) returning id;`
  Naam en minstens één bedrijf (`bedrijven`, een lijst) zijn verplicht; een opzet met vaste
  `bedrijven` bepaalt ze; bij een
  rapportage ook `periode_tekst`, en blijven merk, modellen, data, doel en budget leeg. Zonder
  `opzet_id` wordt het Campagne analyse. Vraag ontbrekende essentiële gegevens eerst.
- Meerdere treffers: vraag welke.

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
- **Rapportage** — de periode is vrije tekst (`periode_tekst`). Zet hem om in een begin- en
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
    campagnepagina begonnen). E-mail en lead-events volgens de semantic layer.
- **Rapportage**: alle accounts en properties van het bedrijf over de hele periode (geen
  campagnefilter). Leads bij Van den Udenhout: alle leads van de periode, uitgesplitst naar
  merk en kanaalgroep. PGZ en andere bedrijven: alleen GA4.
- **Leads** (alleen Van den Udenhout):
  ```sql
  select count(*) totaal, count(*) filter (where kanaalgroep = 'Internet') internet, …
  from dataloket.marketing_analyse_leads
  where aangelegd_op >= '<start>' and aangelegd_op < '<eind + 1 dag>' and model ilike '%…%';
  ```
  Soort lead en ordersoort volgens de semantic layer. Controleer `max(aangelegd_op)` en meld tot
  wanneer de kopie loopt.
- **Extra kanaalkosten**: `select bron_medium, maand, bedrag from dataloket.lead_kanaalkosten`
  voor de maanden in de periode, verdeeld over sessies zoals de semantic layer zegt (alle
  sessies van die bron/medium in de maand uit GA4, via Windsor).
- Reken verhoudingen uit totalen. Bereik niet optellen over dagen of platforms.

## Stap 4 — Het resultaat (`MaResultaat`, `formaat: 1`)
```jsonc
{
  "formaat": 1,
  "samenvatting": {
    "kop": "Eén zin met het oordeel",
    "regels": ["hoogstens vijf korte regels, ook voor het management"],
    "tekst": "optioneel: Markdown-toelichting"
  },
  "doel": { "status": "voor|op-koers|achter|onbekend", "toelichting": "…" },
  "funnel": [ { "label": "Kosten", "waarde": 1960.8, "eenheid": "euro" },
              { "label": "Vertoningen", "waarde": 520000, "eenheid": "aantal" } ],
  "secties": [ {
    "stap": 1, "titel": "Investering", "ondertitel": "…",
    "kerncijfers": [ { "label": "Besteed", "waarde": 1960.8, "eenheid": "euro",
                       "toelichting": "39% van het budget", "vergelijking": { "label": "Budget", "waarde": 5000 } } ],
    "tekst": "Markdown",
    "tabellen": [ { "titel": "Per platform",
                    "kolommen": [ { "label": "Platform", "eenheid": "tekst" }, { "label": "Kosten", "eenheid": "euro" } ],
                    "rijen": [ ["Meta", 971.2], ["Google Ads", 980.4] ], "totaal": ["Totaal", 1951.6] } ],
    "grafieken": [ { "titel": "Kosten per week", "type": "staaf", "eenheid": "euro",
                     "x": ["2026-09-14", "2026-09-21"], "reeksen": [ { "naam": "Meta", "waarden": [100, 120] } ] } ]
  } ],
  "inzichten": [ { "soort": "sterk|zwak|kans|risico", "titel": "…", "toelichting": "…" } ],
  "aanbevelingen": [ { "titel": "…", "toelichting": "…", "prioriteit": "hoog|middel|laag" } ],
  "herkenning": [ { "bron": "Meta Ads", "soort": "campagne", "naam": "…", "reden": "…", "zekerheid": "zeker|waarschijnlijk|twijfel" } ],
  "bronnen": [ "Windsor · Meta Ads · Van den Udenhout (69324444)", "Supabase · marketing_analyse_leads t/m 22 nov" ],
  "correcties": [ { "correctie": "regel uit de Data correctie", "verwerking": "wat je ermee deed" } ],
  "semantiekVoorstellen": [ { "blok": "Google Analytics 4", "voorstel": "…", "reden": "…" } ],
  "datakwaliteit": [ "…" ]
}
```
Eenheden: `aantal | euro | procent | seconden | tekst` (procent als 3.2). Grafieken: hoogstens
zes reeksen, één eenheid, datums `JJJJ-MM-DD`. Getallen als getal. Bij een tussentijdse
evaluatie zijn de aanbevelingen "nu bijsturen", bij een eindevaluatie "lessen".
`semantiekVoorstellen` alleen voor bevindingen die voor álle campagnes gelden; je past de
semantic layer nooit zelf aan.

**Kerncijfers** (`MaKerncijfers`, voor het overzicht; null als onbekend):
```json
{ "kosten": 1960.8, "vertoningen": 520000, "vertoningenAds": 410000, "klikken": 12000, "sessies": 8000, "leadEvents": 25,
  "leadsSyntec": 60, "leadsSyntecInternet": 41, "doelLeads": 20,
  "doel": { "status": "achter", "toelichting": "…" } }
```
`vertoningen` = betaald + organisch. `vertoningenAds` = alleen de vertoningen van Google Ads,
Meta Ads en LinkedIn Ads samen, en `klikken` = hun klikken samen (Google Ads clicks, Meta link
clicks, LinkedIn clicks). Het overzicht toont de gezamenlijke CTR als klikken ÷ vertoningenAds;
vul daarom altijd allebei in. `sessies` = sessies die op de campagnepagina('s) begonnen, uit elk
kanaal: dat zijn de "bezoekers" in het overzicht.
`leadsSyntec` en `leadsSyntecInternet` zijn null tenzij de analyse uitsluitend over Van den
Udenhout gaat. `doelLeads`: het aantal leads uit het doel van de briefing zoals jij het leest
("20 proefritten" → 20; proefrit- en offerteaanvragen zijn leads), null als het doel niet over
een aantal leads gaat. Het overzicht zet de leads (Syntec bij alleen Van den Udenhout met
modellen, anders `leadEvents`) tegen dit doel, en de kosten tegen het budget.
Bij een **rapportage** toont het overzicht geen kerncijfers: geef `{}` mee (of vul in wat
vanzelf meekomt), laat `doel` weg en gebruik `funnel` alleen als de prompt erom vraagt (`[]`
mag).

## Stap 5 — Wegschrijven
Schrijf de JSON eerst naar een bestand in je scratchpad en controleer hem (`node -e` met
`JSON.parse`; elke sectie heeft `stap` en `titel`; hoogstens vijf `regels`). Sla op met
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
en de Data correctie van dat moment vast, en zet de Analyse ronde uit na een eindevaluatie. Te
groot (> ~2 MB)? Maak het resultaat compacter, niet in stukken.

Na het bewaren mailt het dashboard vanzelf de volgers van de campagne (trigger in migratie
0043, via het gedeelde Gmail-account). Daar hoef je niets voor te doen; de mail bevat de kop,
de vijf regels en het doeloordeel, dus schrijf die zo dat ze zonder de rest te begrijpen zijn.

## Stap 6 — Terugmelden
Per campagne: versie, label, periode, de kop en de vijf regels, het doeloordeel, wat er met de
Data correctie is gedaan, eventuele voorstellen voor de semantic layer en kanttekeningen. De
analyse staat in het dashboard onder Campagnes → Marketing analyse
(`?tab=marketing-analyse&analyse=<campagne-id>`). Meld ook of de volgers gemaild zijn: kijk
een halve minuut na het bewaren naar `notificatie_verstuurd_op`, `notificatie_aantal` en
`notificatie_fout` van de nieuwe versie.
