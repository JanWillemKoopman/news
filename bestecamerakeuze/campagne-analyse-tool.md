# Campagne-analysetool (Campaign insight) — plan

*Versie 1 · 23 november 2026 · status: plan ter bespreking*

## 1. Waar het om gaat

Van den Udenhout draait campagnes (bijv. "Audi A2") over meerdere kanalen tegelijk: betaalde advertenties op Meta, Google en LinkedIn, organische posts, e-mail, en één of meer campagnepagina's op de website. De vraag "wat heeft deze campagne opgeleverd?" vraagt nu handwerk in vijf systemen.

De tool doet dat werk in één keer:

1. Het team legt in het campagnedashboard een **briefing** vast: naam, looptijd, doel, budget en omschrijving.
2. In Claude Code geef je het sein: *"maak een analyse van de Audi A2"*.
3. Claude zoekt de campagne op in alle databronnen, maakt een **full-funnel analyse** en schrijft die weg in Supabase.
4. Het dashboard toont de analyse in funnelvolgorde. Elke nieuwe analyse wordt een **nieuwe versie**; eerdere versies blijven op te halen.

Eén **hoofdprompt** bepaalt hoe de analyse wordt gemaakt. Die is in het dashboard te bewerken.

## 2. Waar we nu staan

Er is al een eerste werkende opzet gebouwd (branch `claude/campaign-insight-analysis-inbofg`, nog niet live):

| Onderdeel | Status |
|---|---|
| Pagina **Campagnes → Campaign insight**: overzicht + analysepagina met versiekeuze | Gebouwd, lokaal getest met voorbeelddata |
| Zijbalk briefing (nieuw / bewerken) + knop "Analyse aanvragen" | Gebouwd |
| Hoofdprompt-editor rechtsboven, met versies | Gebouwd; eerste uitgebreide prompt geschreven |
| Database: `insight_campagnes`, `insight_prompts`, `insight_analyses` + opslagfunctie (migratie 0042) | Geschreven, **nog niet toegepast** |
| Claude Code-skill met de werkwijze (`.claude/skills/campagne-insight/`) | Geschreven, nog niet in de praktijk gedraaid |
| Eerste echte analyse (Audi A2) | Nog niet gedaan |

Wat we al weten over de Audi A2 (via Windsor):

| Bron | Gevonden |
|---|---|
| Meta Ads | "1. Acties - Audi A2 e-tron -2026": sinds 18 sep, ±€970, advertenties voor nieuwe doelgroepen (PR) en retargeting (RT), roadshow 4 en 5 nov |
| Google Ads | "Demand Gen \| Acties - Audi A2 e-tron - 2026": ±€980, 328.000 vertoningen, 6.575 klikken |
| LinkedIn Ads | Niets |
| Campagnepagina | udenhout.nl/acties/a2-e-tron (Meta-verkeer met `utm_source=facebook&utm_medium=paid`) |

## 3. De flow van begin tot eind

```
Dashboard                         Claude Code                        Supabase
─────────                         ───────────                        ────────
1. Nieuwe campagne / briefing ───────────────────────────────────▶ insight_campagnes
2. (optioneel) "Analyse aanvragen" ──────────────────────────────▶ analyse_gevraagd_op
                                  3. "maak een analyse van X"
                                  4. briefing + hoofdprompt ophalen ◀── insight_campagnes / _prompts
                                  5. herkennen: campagnes, posts,
                                     pagina's, e-mails, leads   ◀── windsor_* / v_leads / Windsor API
                                  6. funnelanalyse maken
                                  7. wegschrijven als versie N ──▶ insight_analyses
8. Overzicht + analysepagina ◀──────────────────────────────────── (lezen)
```

## 4. Opbouw: drie lagen

Bewust gescheiden, zodat je de inhoud kunt veranderen zonder iets kapot te maken:

| Laag | Wat | Waar | Wie past aan |
|---|---|---|---|
| **Hoofdprompt** | *Wat* er geanalyseerd wordt en hoe je oordeelt | Supabase, editor in het dashboard | Jij (beheerders) |
| **Skill** | *Hoe* Claude de data ophaalt en wegschrijft (tabellen, queries, valkuilen) | Repository (`.claude/skills/campagne-insight/SKILL.md`) | Via Claude Code |
| **Formaat** | De vorm van het resultaat die het dashboard kan tonen | Code (`lib/insight/types.ts`) | Via Claude Code |

Het formaat is **generiek**: een analyse bestaat uit een samenvatting, een funnelrij, secties in funnelvolgorde (elk met kerncijfers, tekst, tabellen en grafieken), inzichten, aanbevelingen en een verantwoording. Daardoor kan de hoofdprompt de opzet van de analyse veranderen (andere secties, andere cijfers) zonder dat het dashboard aangepast hoeft te worden.

## 5. De funnel en de databronnen

| # | Funnelstap | Bron | Beschikbaar? | Kanttekening |
|---|---|---|---|---|
| 1 | **Investering**: kosten per platform en campagne, t.o.v. budget | `windsor_advertenties` | ✅ | Alleen mediakosten. Productie, roadshow e.d. ontbreken (zie vraag 3) |
| 2 | **Bereik**: vertoningen, bereik, frequentie, betaald vs organisch | `windsor_advertenties`, `windsor_posts`, Windsor API | ✅ | Bereik is niet op te tellen over platforms (dezelfde persoon telt dubbel) |
| 3 | **Klikken**: CTR, CPC, per advertentie, PR vs RT, beeld vs video | `windsor_advertenties` | ✅ | |
| 4 | **Organische posts** die de campagne promoten | `windsor_posts` (tekst) | ✅ | Herkenning op tekst: kans op missers en valse treffers |
| 5 | **Verkeer naar de campagnepagina('s)** per kanaal en bron/medium | `windsor_ga4_landingspaginas`, `windsor_ga4_verkeer` | ✅ | |
| 6 | **Gedrag op de pagina**: betrokkenheid, tijd, events (klikken, formulier gestart) | `windsor_ga4_paginas`, `windsor_ga4_event_paginas` | ✅ | Scroll-events zitten er bewust niet in |
| 7 | **Lead-events later in de sessie** (proefrit, offerte, servicebeurt …) | GA4 via Windsor: *landingspagina × eventnaam* | ⚠️ te verifiëren | Zie hieronder |
| 8 | **E-mailverkeer apart**: wat deed het op de pagina en daarna | GA4 (kanaalgroep E-mail / utm) | ⚠️ deels | Verzonden, geopend, geklikt komt uit Selligent, niet uit Windsor (vraag 6) |
| 9 | **Leads in Syntec** voor merk/model: online/offline, zakelijk/privé, type lead | `v_leads` | ✅ | Model op veel manieren gespeld; zakelijk/privé bij online leads vrijwel altijd leeg |
| 10 | **Orders** (optioneel) | `v_orders` / `order_geworden` | ✅ | Recente leads hebben nog geen order (vraag 4) |
| 11 | **Doel**: realisatie vs doel, tempo, prognose | briefing + bovenstaande | ✅ | Werkt alleen als het doel telbaar is (vraag 2) |

**Over stap 7 (de belangrijkste open technische vraag).** Je wilt weten of iemand die op de campagnepagina binnenkwam, *later in die sessie* een lead-event deed. De tabellen in Supabase zijn opgeteld per dag, pagina en kanaal, niet per sessie. Daarmee is die koppeling niet exact te maken. Er zijn drie opties:

- **A. GA4 "landingspagina" als sessiedimensie** (voorkeur). In GA4 hoort de landingspagina bij de sessie. Vraag je *eventaantallen per landingspagina × eventnaam* op, dan krijg je precies "events in sessies die op de campagnepagina begonnen", ook als het event later op een andere pagina viel. Dit kan per analyse live via Windsor (connector `googleanalytics4`), zonder nieuwe sync. Nog te verifiëren of Windsor die combinatie levert.
- **B. Benadering** uit de bestaande tabellen (events per kanaal/utm-campagne). Altijd mogelijk, maar minder precies; de analyse zegt dan dat het een benadering is.
- **C. GA4 BigQuery-export** (op sessieniveau). Het meest precies, maar een flinke extra inrichting. Alleen als A niet werkt.

## 6. De campagne herkennen (en vastleggen)

Het grootste risico voor de kwaliteit is een **verkeerde toerekening**: een campagne, post of pagina die er niet bij hoort, of juist ontbreekt. Bijvoorbeeld "A2" in een andere naam, of een e-mail zonder het model in de utm.

**Voorstel: herkenning in twee stappen.**

1. Bij de eerste analyse stelt Claude de **koppelingen** voor: welke advertentiecampagnes, posts, campagnepagina's, e-mailcampagnes (utm) en Syntec-modelwaarden erbij horen, met reden en zekerheid. Die staan in de verantwoording onderaan de analyse.
2. Jij bevestigt of corrigeert ze in het dashboard (een blok "Koppelingen" in de briefing-zijbalk). Volgende versies **gebruiken de bevestigde koppelingen** en melden alleen *nieuwe* kandidaten.

Voordeel: versie 2 en versie 3 rekenen met dezelfde afbakening, dus de cijfers zijn echt vergelijkbaar. Dit is nog niet gebouwd (vraag 7).

## 7. Het dashboard

**Overzicht** (gebouwd). Eén regel per campagne, onder elkaar:

- campagne met merklogo, looptijd en budget
- doel
- laatste versie en datum
- kosten, vertoningen, klikken, sessies, leads web, leads Syntec
- voortgang op het doel

Een klik op de regel opent de analysepagina, het potlood opent de briefing. Rechtsboven staan **Hoofdprompt** en **Nieuwe campagne**.

**Analysepagina** (gebouwd):

1. Kop met de versiekeuze
2. Samenvatting
3. Briefing van die versie
4. Funnelrij, met tussen twee stappen het percentage dat doorstroomt
5. Eén blok per funnelstap
6. Inzichten en aanbevelingen
7. Verantwoording en kanttekeningen bij de data

**Hoofdprompt** (gebouwd). Brede zijbalk met de volledige tekst. Opslaan maakt een nieuwe versie, en elke analyse toont met welke promptversie hij gemaakt is.

**Nog te bespreken:**

- vergelijking tussen versies (wat is er veranderd sinds v1)
- vergelijking tussen campagnes
- export naar PDF voor het weekoverleg of de importeur
- het koppelingenblok uit §6

## 8. Versies

- Elke analyse is een nieuwe versie. Er wordt nooit iets overschreven.
- Bij elke versie wordt vastgelegd: de briefing van dat moment, de promptversie, de periode en het model.
- Een volgende versie vergelijkt zijn kerncijfers met de vorige en benoemt wat er veranderd is.
- **Open:** willen we onderscheid tussen een *tussentijdse* analyse (campagne loopt nog) en een *eindevaluatie* (na de einddatum, met orders en nawerking)? Zie vraag 8.

## 9. Starten en automatiseren

| Manier | Status |
|---|---|
| In Claude Code: *"maak een analyse van …"* | Gebouwd (skill) |
| Knop "Analyse aanvragen" + in Claude Code *"draai de aangevraagde analyses"* | Gebouwd |
| Geplande taak, bijv. elke maandag alle lopende campagnes opnieuw | Mogelijk, niet ingericht (vraag 9) |
| Knop in het dashboard die de analyse zélf start (Claude API op de server) | Niet gebouwd. Een analyse duurt minuten en kost per run geld; vergt een achtergrondtaak (vraag 9) |

## 10. Rechten

- **Lezen:** iedereen die ingelogd is.
- **Campagne aanmaken, briefing bewerken, analyse aanvragen:** iedereen die ingelogd is.
- **Hoofdprompt opslaan, campagne verwijderen:** alleen de beheerders.
- **Analyses wegschrijven:** alleen Claude Code (via de opslagfunctie).

Zie vraag 10 als dit anders moet.

## 11. Kwaliteit en betrouwbaarheid

- **Verantwoording** bij elke analyse: wat is toegerekend, waarom en hoe zeker.
- **Datakwaliteit:** de analyse meldt achterstanden (Syntec loopt 1–2 dagen achter, de Windsor-sync soms meer) en ontbrekende bronnen.
- **Rekenregels in de skill:** verhoudingen uit totalen (nooit gemiddelden van dagwaarden), bereik niet optellen over platforms, sessies wel en gebruikers niet.
- **Controle vóór het opslaan:** de JSON wordt gecontroleerd, zodat een kapotte analyse nooit in het dashboard komt.
- **Wens (nog niet gebouwd):** de gebruikte queries per analyse bewaren, zodat een cijfer later na te rekenen is.

## 12. Fasering

| Fase | Wat | Resultaat |
|---|---|---|
| **0** ✅ | Eerste opzet: pagina, database-ontwerp, prompt, skill | Code op de branch |
| **1** | Migratie toepassen; briefing Audi A2 invullen; eerste analyse (v1) draaien; samen beoordelen | Eerste echte analyse in het dashboard |
| **2** | Hoofdprompt aanscherpen ("hoe de analyse precies opgezet moet worden"); opmaak bijstellen op basis van v1 | Analyse zoals jij hem wilt |
| **3** | Lead-events in de sessie (optie A uit §5); koppelingen bevestigen (§6); e-mailcijfers (als Selligent beschikbaar is) | Complete en vergelijkbare funnel |
| **4** | Automatiseren (wekelijks), vergelijking tussen versies en campagnes, export | Routine in het weekoverleg |

## 13. Vragen om het plan scherper te maken

Bij elke vraag staat mijn voorstel. Antwoord gerust kort ("eens" of anders).

**Briefing en doel**

1. **Campagnes uit de sheet overnemen?** De campagnetabel (Google Sheet) heeft al naam, start, eind, budget, doel leads, merk, model en zelfs een kolom *Campagnepagina*. *Voorstel:* bij "Nieuwe campagne" eerst een campagne uit de sheet kiezen die de velden vooraf invult (los invullen blijft mogelijk). Dat voorkomt dubbel werk en verschillen.
2. **Het doel gestructureerd vastleggen?** Nu is het vrije tekst ("20 proefritaanvragen"). *Voorstel:* een aantal + een soort (proefritaanvraag, offerte, lead, order …) + optioneel vrije toelichting. Dan is de voortgang betrouwbaar te meten. Belangrijk daarbij: **telt een proefritaanvraag als GA4-event op de site, of als lead in Syntec?** Die twee verschillen flink.
3. **Wat valt onder "budget" en "kosten"?** Alleen mediabudget (Meta/Google/LinkedIn), of ook productie, roadshow, portals (zoals Gaspedaal)? *Voorstel:* budget = mediabudget; overige kosten optioneel als los veld in de briefing.

**Funnel en data**

4. **Orders meenemen?** Syntec weet of een lead een order werd. *Voorstel:* ja, in de eindevaluatie, met de kanttekening dat recente leads nog geen order kunnen hebben.
5. **Welke Syntec-leads tellen voor de campagne?** Alle leads voor dit model in de periode (ook offline, ook zonder campagnebron), en daarnaast een vergelijking met vóór de campagne en vorig jaar om het effect te zien? *Voorstel:* ja. De campagnekolom in Syntec is onbetrouwbaar en gebruiken we niet.
6. **E-mail:** wil je ook verzonden, geopend en geklikt per mailing zien? Die cijfers zitten niet in Windsor. Kunnen we die uit Selligent halen (export of koppeling)? Zo niet, dan analyseren we e-mail alleen vanaf de klik (GA4).
7. **Koppelingen bevestigen** (§6): wil je na de eerste analyse de herkende campagnes, posts, pagina's en mails zelf bevestigen, zodat volgende versies daarmee rekenen? *Voorstel:* ja.

**Versies en gebruik**

8. **Tussentijds vs eindevaluatie:** wil je dat onderscheid zichtbaar, met een uitgebreidere eindevaluatie (orders, nawerking twee weken na de einddatum)? *Voorstel:* ja, als label op de versie.
9. **Automatisch draaien:** elke maandagochtend alle lopende campagnes opnieuw analyseren (geplande taak), of alleen op jouw sein? En is een "Start analyse"-knop in het dashboard zelf gewenst, wetende dat dat API-kosten per run en meer bouwwerk betekent? *Voorstel:* eerst handmatig; na fase 2 een wekelijkse geplande taak.
10. **Wie gebruikt het?** Alleen jij, of het hele marketingteam? Moeten collega's zelf campagnes kunnen aanmaken, en de prompt kunnen lezen? Is dit straks ook iets voor de importeur of het management (export/PDF)?
11. **Benchmarks:** wil je campagnes onderling vergelijken (bijv. kosten per lead van de A2 naast eerdere Audi-acties)? Dan bouwen we gaandeweg een referentie op uit eerdere analyses.
12. **Naam:** de pagina heet nu "Campaign insight" (Engels) terwijl de rest van het dashboard Nederlands is. Zo laten, of "Campagne-analyse"?

**Praktisch voor fase 1**

13. **Akkoord om migratie 0042 in Supabase toe te passen** (drie nieuwe tabellen + opslagfunctie, bestaande data blijft ongemoeid).
14. **Briefing Audi A2:** einddatum, doel en totaal budget? Startdatum leid ik af uit de eerste uitgaven (18 september).
15. **Leesrechten tijdens de analyse:** mag Claude tijdens een analyse SQL-queries (alleen lezen) op Supabase draaien? Dat is veel sneller dan alles via Windsor. Je weigerde eerder één query; was dat bewust?

## 14. Risico's

| Risico | Gevolg | Beheersing |
|---|---|---|
| Verkeerde toerekening (campagne, post, mail) | Cijfers kloppen niet | Verantwoording + bevestigde koppelingen (§6) |
| Lead-events in de sessie niet exact te bepalen | Gat in de funnel | Optie A verifiëren; anders benadering met kanttekening |
| Syntec-model op veel manieren gespeld | Leads gemist of te veel | Brede zoekterm, gebruikte waarden tonen, bevestigen |
| Data loopt achter (sync) | Recente dagen ontbreken | Datakwaliteit in elke analyse; periode t/m laatste volledige dag |
| Prompt wordt zo aangepast dat de vorm niet meer klopt | Kapotte pagina | Formaat ligt vast in code + controle vóór opslaan |
| Bestaand beveiligingspunt: 15 `dataloket`-tabellen zonder RLS | Data te lezen met de publieke sleutel | Los van deze tool oppakken (policies bepalen, dan RLS aan) |
