---
name: marketing-analyse
description: Maak een full-funnel Marketing analyse van een campagne van de groep Van den Udenhout en zet het resultaat in het campagnedashboard (Campagnes → Marketing analyse). Gebruik dit als de gebruiker vraagt om een (marketing) analyse, campagne-analyse of funnelanalyse van een campagne ("maak een marketing analyse van de Audi A2", "voer de analyseronde uit", "nieuwe versie van de A2-analyse"), of om een campagne voor Marketing analyse aan te maken.
---

# Marketing analyse — een analyse maken

Het dashboard (`bestecamerakeuze/`, tabblad **Campagnes → Marketing analyse**) toont de
analyses; jij maakt ze. Het plan en alle besluiten van de eigenaar staan in
`bestecamerakeuze/campagne-analyse-tool.md`. Supabase-project `pzpoptfljgrskebnuggt`
("MMM"), schema `dataloket`.

## Wie bepaalt wat
- **Hoofdprompt** (`marketing_analyse_prompts`): hoe je analyseert en oordeelt, met een
  hoofdstuk per label. Volg hem; hij gaat vóór deze skill waar het om inhoud gaat.
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
   Alleen de accounts en properties van het bedrijf uit de briefing (semantic layer, Algemeen).
2. **`dataloket.marketing_analyse_leads`**: de leads-kopie van "Data leads". **Alleen bij
   bedrijf "Van den Udenhout"**; bij elk ander bedrijf niet gebruiken en `leadsSyntec` null.
3. **`dataloket.lead_kanaalkosten`**: extra maandkosten per GA4-bron/medium.

**Niet gebruiken**: alle andere tabellen in Supabase, ook niet `windsor_*`, `leads_raw` of
`v_leads`. De tabellen van de tool zelf (`marketing_analyse_campagnes`, `_prompts`,
`_semantiek`, `_versies`) lees en schrijf je wel; dat is geen analysedata.

## Stap 0 — Welke campagne(s)
```sql
select id, naam, bedrijf, merk, modellen, startdatum, einddatum, doel, budget, omschrijving,
       data_correctie, analyse_ronde, laatste_versie
from dataloket.marketing_analyse_campagnes
where naam ilike '%<deel van de naam>%';     -- "voer de analyseronde uit": where analyse_ronde
```
- **Analyseronde**: alle campagnes met `analyse_ronde = true`, één voor één. Sla een campagne
  over waarvan de startdatum nog niet bereikt is, en meld dat.
- Bestaat de campagne niet en geeft de gebruiker de gegevens in de chat: maak hem aan met
  `insert into dataloket.marketing_analyse_campagnes (naam, bedrijf, merk, modellen, startdatum, einddatum, doel, budget, omschrijving) values (…) returning id;`
  Naam en bedrijf zijn verplicht; vraag ontbrekende essentiële gegevens eerst.
- Meerdere treffers: vraag welke.

## Stap 1 — Opdracht ophalen
```sql
select id, versie, inhoud from dataloket.marketing_analyse_prompts order by versie desc limit 1;
select id, versie, inhoud from dataloket.marketing_analyse_semantiek order by versie desc limit 1;
select versie, label, geanalyseerd_op, kerncijfers, resultaat->'samenvatting' as samenvatting
from dataloket.marketing_analyse_versies where campagne_id = '<id>' order by versie desc limit 1;
```
Geen prompt of semantic layer opgeslagen? Dan gelden de standaardteksten in
`bestecamerakeuze/lib/marketingAnalyse/standaardPrompt.ts` en `standaardSemantiek.ts`, en is
het id null. Lees ze volledig.

## Stap 2 — Periode en label
- **Periode**: van `startdatum` t/m `einddatum`; ligt de einddatum op of na vandaag (of is hij
  leeg): t/m **gisteren**. Niets daarbuiten.
- **Label** (bepaalt de functie bij het opslaan, jij past het hoofdstuk toe): einddatum vóór
  vandaag = **Eindevaluatie**; anders **Tussentijdse evaluatie**.

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
{ "kosten": 1960.8, "vertoningen": 520000, "klikken": 12000, "sessies": 8000, "leadEvents": 25,
  "leadsSyntec": 60, "leadsSyntecInternet": 41,
  "doel": { "status": "achter", "toelichting": "…" } }
```
`leadsSyntec` en `leadsSyntecInternet` zijn null bij elk ander bedrijf dan Van den Udenhout.

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

## Stap 6 — Terugmelden
Per campagne: versie, label, periode, de kop en de vijf regels, het doeloordeel, wat er met de
Data correctie is gedaan, eventuele voorstellen voor de semantic layer en kanttekeningen. De
analyse staat in het dashboard onder Campagnes → Marketing analyse
(`?tab=marketing-analyse&analyse=<campagne-id>`).
