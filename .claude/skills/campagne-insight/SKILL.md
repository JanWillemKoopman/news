---
name: campagne-insight
description: Maak een full-funnel Campaign insight-analyse van een campagne van Van den Udenhout en zet het resultaat in het campagnedashboard (Campagnes → Campaign insight). Gebruik dit als de gebruiker vraagt om een analyse, campaign insight of funnelanalyse van een campagne ("maak een analyse van de Audi A2", "draai de aangevraagde analyses", "nieuwe versie van de A2-analyse"), of om een campagne voor Campaign insight aan te maken.
---

# Campaign insight — een analyse maken

Het dashboard (`bestecamerakeuze/`, tabblad **Campagnes → Campaign insight**) toont analyses;
jij maakt ze. Alles staat in Supabase, project `pzpoptfljgrskebnuggt` (naam "MMM"), schema
`dataloket`. Lees en schrijf via de Supabase-tools (`execute_sql`). Windsor.ai (`get_data`) is
de aanvulling voor wat niet in de gesynchroniseerde tabellen zit of verser moet.

**Rolverdeling** — houd die aan:
- De **hoofdprompt** (in het dashboard bewerkbaar, tabel `insight_prompts`) zegt wát je
  analyseert en hoe je oordeelt. Volg hem. Hij gaat vóór deze skill waar het om inhoud gaat.
- **Deze skill** zegt hoe je de data ophaalt en in welk formaat je wegschrijft. Het formaat
  ligt vast in `bestecamerakeuze/lib/insight/types.ts` (`InsightResultaat`,
  `InsightKerncijfers`); wijk daar nooit van af, anders breekt de pagina.

Elke analyse is een **nieuwe versie** (v1, v2, …). Overschrijf nooit een bestaande analyse.

## Stap 0 — Welke campagne

```sql
select id, naam, merk, model, startdatum, einddatum, doel, budget, omschrijving,
       zoektermen, campagnepaginas, analyse_gevraagd_op
from dataloket.insight_campagnes
where naam ilike '%<deel van de naam>%';      -- of: where analyse_gevraagd_op is not null
```

- "Draai de aangevraagde analyses" = alle regels met `analyse_gevraagd_op is not null`, één voor één.
- Bestaat de campagne nog niet en geeft de gebruiker de gegevens in de chat (naam, start, eind,
  doel, budget, omschrijving): maak hem aan met een `insert into dataloket.insight_campagnes (naam, merk, model, startdatum, einddatum, doel, budget, omschrijving) values (…) returning id;`
  Ontbreken essentiële gegevens (naam, looptijd of doel), vraag ze dan eerst.
- Zijn er meerdere treffers, vraag welke.

## Stap 1 — Hoofdprompt en vorige versie

```sql
select id, versie, inhoud from dataloket.insight_prompts order by versie desc limit 1;
```
Geen regel? Dan geldt de standaardtekst in `bestecamerakeuze/lib/insight/standaardPrompt.ts`
en is `prompt_id` null. Lees de hele prompt en werk hem af.

Vorige versie (voor de vergelijking die de prompt vraagt):
```sql
select versie, geanalyseerd_op, samenvatting, kerncijfers
from dataloket.insight_analyses where campagne_id = '<id>' order by versie desc limit 1;
```

## Stap 2 — Periode

Van `startdatum` t/m `einddatum`, of t/m **gisteren** als de campagne nog loopt. Zonder
startdatum: de eerste dag met uitgaven van de herkende campagnes. Controleer hoe ver elke bron
is bijgewerkt en meld een achterstand in `datakwaliteit`:
```sql
select 'ads' bron, max(datum) from dataloket.windsor_advertenties
union all select 'ga4 landing', max(datum) from dataloket.windsor_ga4_landingspaginas
union all select 'ga4 events', max(datum) from dataloket.windsor_ga4_event_paginas
union all select 'posts', max(datum) from dataloket.windsor_posts
union all select 'syntec', max(aangelegd)::date from dataloket.v_leads;
```

## Stap 3 — De data (tabellen in `dataloket`)

Kijk eerst rond (distinct-waarden, kleine steekproeven) voordat je telt; de naamgeving in de
platforms is niet consequent. Kolomnamen hieronder zijn de echte.

| Funnelstap | Tabel / bron | Belangrijkste kolommen |
|---|---|---|
| Kosten, bereik, klikken (betaald) | `windsor_advertenties` (Meta, Google, LinkedIn; per dag × advertentie) | datum, bron, platform, plaatsing, account_naam, campagne, adgroep, advertentie, bestemming_url, uitgaven, vertoningen, bereik, klikken, link_klikken, interacties, videoweergaven, leads, conversies |
| Organisch | `windsor_posts` (Facebook, Instagram, LinkedIn; lifetime per post) | bron, account_naam, gepubliceerd_op, tekst, permalink, vertoningen, vertoningen_organisch, bereik, interacties, klikken |
| Verkeer naar de campagnepagina | `windsor_ga4_landingspaginas` (per dag × instappagina × kanaalgroep × utm-campagne) | website, landingspagina, kanaalgroep, campagne, sessies, gebruikers, nieuwe_gebruikers, betrokken_sessies, conversies |
| Bron/medium, apparaat | `windsor_ga4_verkeer` (niet per pagina!) | kanaalgroep, bron_medium, campagne, apparaat, sessies, betrokken_sessies, betrokkenheidstijd |
| Gedrag op de pagina | `windsor_ga4_paginas` (per dag × pagina × kanaalgroep) | pagina, weergaven, sessies, events, conversies, betrokkenheidstijd (seconden, totaal) |
| Events op de pagina | `windsor_ga4_event_paginas` (zonder page_view/scroll/user_engagement/first_visit) | event_naam, pagina, querystring, kanaalgroep, campagne, events, conversies |
| Lead-events udenhout.nl | `windsor_ga4_leads` (laatste 30 dagen, rollend) | datum, event, bron_medium, campagne, merk, model, formulier, aantal |
| Syntec-leads | `v_leads` | kanaal, kanaalgroep ('Internet' = online), ordersoort, onderwerp, merk, model, lead_type, klantsoort, sluitreden, aangelegd, order_geworden |

Aanwijzingen:
- **Herkenning betaald**: `campagne ilike` op model/zoektermen, en controleer met merk en
  periode. Gevonden bij de Audi A2 (november 2026): Meta "1. Acties - Audi A2 e-tron -2026"
  (prospecting "PR" en retargeting "RT" in de advertentienaam) en Google Ads "Demand Gen |
  Acties - Audi A2 e-tron - 2026"; LinkedIn niets.
- **Campagnepagina**: `distinct bestemming_url` van de herkende advertenties, plus
  `landingspagina ilike '%<slug>%'` in GA4. Paden in GA4 zijn zonder domein. Website-kolom
  onderscheidt de properties (udenhout.nl is de hoofdsite).
- **E-mail**: `kanaalgroep ilike '%mail%'` op de campagnepagina, en de utm-campagnes daarvan.
  Gedrag "verder op de website" na een e-mailsessie is niet per sessie te volgen (de tabellen
  zijn geaggregeerd): gebruik `windsor_ga4_event_paginas` met kanaalgroep e-mail en de
  utm-campagne van de mail, en zeg dat het een benadering is.
- **Doorstroom** van advertentieklik naar sessie: klikken (Meta `link_klikken` waar gevuld)
  tegen sessies met de bijbehorende kanaalgroep/utm op de campagnepagina.
- **Syntec**: zoek het model breed (`model ilike '%a2%'` én controle op merk), toon welke
  modelwaarden je meetelt, splits online/offline op `kanaalgroep = 'Internet'`. Vergelijk met
  een even lange periode ervoor en dezelfde periode vorig jaar. Gebruik de kolom `campagne`
  niet voor toerekening (onbetrouwbaar). Klantsoort is bij online leads vrijwel altijd leeg.
- **Windsor** (aanvullend, `get_data`): connectors `facebook`, `google_ads`, `linkedin`,
  `facebook_organic`, `instagram`, `linkedin_organic`, `googleanalytics4`. Haal velden altijd
  eerst op met `get_fields`. Handig voor frequentie, video-kijkcijfers, Meta-leads per
  advertentie en dagen die nog niet gesynchroniseerd zijn.
- **Reken verhoudingen uit totalen** (CTR = som klikken / som vertoningen), nooit gemiddelden
  van dagwaarden. Sessies tellen op over dagen, gebruikers niet.

## Stap 4 — Het resultaat (formaat `InsightResultaat`, `formaat: 1`)

```jsonc
{
  "formaat": 1,
  "samenvatting": { "kop": "Eén zin met het oordeel", "tekst": "Markdown, enkele alinea's" },
  "funnel": [                                   // de funnel in één rij, 5–7 stappen
    { "label": "Kosten", "waarde": 1960.8, "eenheid": "euro" },
    { "label": "Vertoningen", "waarde": 520000, "eenheid": "aantal" },
    { "label": "Klikken", "waarde": 12000, "eenheid": "aantal" },
    { "label": "Sessies op campagnepagina", "waarde": 8000, "eenheid": "aantal", "toelichting": "…" },
    { "label": "Lead-events web", "waarde": 25, "eenheid": "aantal" },
    { "label": "Leads Syntec (A2)", "waarde": 60, "eenheid": "aantal" }
  ],
  "secties": [                                  // in funnelvolgorde, stap 1..n
    {
      "stap": 1, "titel": "Investering", "ondertitel": "…",
      "kerncijfers": [ { "label": "Besteed", "waarde": 1960.8, "eenheid": "euro",
                         "toelichting": "39% van het budget", "vergelijking": { "label": "Budget", "waarde": 5000 } } ],
      "tekst": "Markdown met de duiding",
      "tabellen": [ { "titel": "Per platform",
                      "kolommen": [ { "label": "Platform", "eenheid": "tekst" }, { "label": "Kosten", "eenheid": "euro" } ],
                      "rijen": [ ["Meta", 971.2], ["Google Ads", 980.4] ],
                      "totaal": ["Totaal", 1951.6], "voetnoot": "…" } ],
      "grafieken": [ { "titel": "Kosten per week", "type": "staaf", "eenheid": "euro",
                       "x": ["2026-09-14", "2026-09-21"],
                       "reeksen": [ { "naam": "Meta", "waarden": [100, 120] } ] } ]
    }
  ],
  "inzichten": [ { "soort": "sterk|zwak|kans|risico", "titel": "…", "toelichting": "…" } ],
  "aanbevelingen": [ { "titel": "…", "toelichting": "…", "prioriteit": "hoog|middel|laag" } ],
  "herkenning": [ { "bron": "Meta Ads", "soort": "campagne", "naam": "1. Acties - Audi A2 e-tron -2026",
                    "reden": "naam bevat 'Audi A2', loopt sinds 18 sep", "zekerheid": "zeker|waarschijnlijk|twijfel" } ],
  "datakwaliteit": [ "Syntec loopt t/m 21 nov", "…" ]
}
```
Regels: eenheden zijn `aantal | euro | procent | seconden | tekst` (procent als 3.2 voor 3,2%).
Grafiek: hoogstens zes reeksen, allemaal dezelfde eenheid (één as), datums als `YYYY-MM-DD`.
Getallen als getal, niet als tekst. Geen lege secties zonder uitleg.

**Kerncijfers** (`InsightKerncijfers`, voor de overzichtstabel; null als onbekend):
```json
{ "kosten": 1960.8, "vertoningen": 520000, "klikken": 12000, "sessies": 8000,
  "leadsOnline": 25, "leadsSyntec": 60, "doelWaarde": 20, "doelRealisatie": 14, "doelEenheid": "proefritaanvragen" }
```
`doelWaarde`/`doelRealisatie` alleen als het doel uit de briefing een telbaar getal is.

## Stap 5 — Wegschrijven

Schrijf de JSON eerst naar een bestand in je scratchpad en controleer hem (`node -e` met
`JSON.parse`, en dat elke sectie een `stap` en `titel` heeft). Sla dan op met dollar-quoting,
zodat aanhalingstekens in de tekst geen probleem zijn:

```sql
select * from dataloket.insight_bewaar_analyse(
  p_campagne_id  => '<campagne-id>',
  p_resultaat    => $json$ { …resultaat… } $json$::jsonb,
  p_kerncijfers  => $json$ { …kerncijfers… } $json$::jsonb,
  p_samenvatting => $txt$ <de kop uit de samenvatting> $txt$,
  p_periode_van  => '2026-09-18',
  p_periode_tot  => '2026-11-22',
  p_prompt_id    => '<id uit insight_prompts of null>',
  p_model        => '<model-id waarop je draait>'
);
```
De functie kent het versienummer toe, legt de briefing van dat moment vast en wist de
aanvraag. Is de query te groot (> ~2 MB), maak het resultaat compacter (minder tabelrijen),
niet in stukken.

## Stap 6 — Terugmelden

Meld in de chat: campagne, versie, periode, de kop van de samenvatting, de belangrijkste
cijfers en eventuele kanttekeningen, en dat de analyse in het dashboard staat onder
Campagnes → Campaign insight (`?tab=campagne-insight&insight=<campagne-id>`).
