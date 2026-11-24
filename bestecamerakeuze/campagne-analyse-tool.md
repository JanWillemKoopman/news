# Campagne-analysetool (Marketing analyse) — plan

*Versie 6 · 24 november 2026 · status: fase 1 gebouwd (zie §10a); fase 2 (analyse opzetten) in voorbereiding (zie §13)*

## 1. Waar het om gaat

Van den Udenhout draait campagnes (bijv. "Audi A2") over meerdere kanalen tegelijk: betaalde advertenties, organische posts, e-mail en één of meer campagnepagina's. De tool maakt per campagne een **full-funnel analyse**:

1. Het team legt in het dashboard een **briefing** vast: naam, start- en einddatum, doel, totaalbudget en omschrijving.
2. De eigenaar geeft in Claude Code het sein, met de skill.
3. Claude zoekt alle data van de campagne op, analyseert de funnel en schrijft het resultaat weg in Supabase.
4. Het dashboard toont de analyse. Elke analyse is een **nieuwe versie**; eerdere versies blijven op te halen.

Drie kennislagen sturen de analyse:

- de **hoofdprompt**: hoe je analyseert en oordeelt;
- de **semantic layer**: per databron hoe je de data leest;
- de **data correctie** per campagne: wat er bij de vorige analyse niet klopte.

## 2. Besluiten (antwoorden op de vragen uit versie 1)

| # | Onderwerp | Besluit |
|---|---|---|
| 1 | Campagnes uit de sheet | **Nee.** Campagnes worden alleen in het dashboard opgegeven (de briefing). |
| 2–3 | Doel | **Open tekstveld** in de briefing. De analyse krijgt het doel als context en beoordeelt zelf hoe het ervoor staat. Wat het doel is, staat in de briefing. |
| 4 | Kosten | Mediakosten uit de advertentieaccounts (via Windsor) **plus** de extra kanaalkosten uit `dataloket.lead_kanaalkosten` (bijv. gaspedaal.nl / referral), verdeeld over de sessies (zie §5.3). |
| 5 | Orders | **Niet** meenemen. |
| 6 | Leads | Uit de leads-kopie: **totaal aantal leads**, **hoeveel via Internet** en **welke soort leads**. Welke soort een lead is, leidt de analyse af uit de zes kolommen volgens de semantic layer van Data leads (er is geen kolom Lead Type). |
| 7 | E-mailcijfers (Selligent) | **Nu niet**, later misschien. E-mail alleen vanaf de klik (GA4). |
| 8 | Toerekening | Bij **elke** analyse grondig onderzoeken welke data bij de campagne hoort en dat tonen in het resultaat. Plus een open veld **Data correctie** per campagne (zie §6). |
| 9 | Label | Analysedatum vóór de einddatum: **Tussentijdse evaluatie** (gericht op bijsturen). Einddatum verstreken: **Eindevaluatie** (terugblik op de hele campagne). |
| 10 | Starten | Handmatig via de skill. Elke campagne krijgt in het overzicht een schakelaar **Analyse ronde** (Aan/Uit). "Voer de analyseronde uit" analyseert alle campagnes die op Aan staan. |
| 11 | Rechten | **Iedereen** mag campagnes aanmaken. **Alleen de eigenaar** past de hoofdprompt (en de semantic layer) aan; iedereen mag ze lezen. |
| 12 | Benchmarks | **Nu niet.** |
| 13 | Naam pagina | **Marketing analyse** |
| 14 | Migraties | Toegestaan. |
| 15a | Periode | Alleen **binnen start- en einddatum**. Ligt de einddatum in de toekomst: tot en met **gisteren**. Het totaalbudget is wat marketing voor de hele periode beschikbaar heeft, om te beoordelen of de campagne op schema ligt. |
| 15b | Supabase-queries | Toegestaan waar nodig (binnen de grenzen van §3). |
| v2-A | Leads-data | Een **nachtelijke kopie** van "Data leads" in Supabase, alleen voor de analyse: zes kolommen (Ordersoort, Onderwerp, Kanaalgroep, Merk, Model, Aangelegd), de laatste 365 dagen, zonder rijen met "FW:" in Onderwerp (zie §3.1). |
| v2-B | Kostenverdeling | De rekensom in §5.3 klopt. |
| v2-C | GA4 udenhout.nl | Alleen property **"GA4_https://udenhout.nl"** (255949462) voor Van den Udenhout. |
| v2-D | Analyse ronde | Springt automatisch op **Uit** na een eindevaluatie. |
| v2-E | Merk en model | Blijven in de briefing (optioneel). |
| v2-F | Semantic layer | Krijgt een blok **Algemeen**, met daarin ook welke accounts bij welk bedrijf horen. |
| v2-G | Labelgrens | Einddatum vandaag = tussentijds (t/m gisteren); vanaf de dag erna = eindevaluatie. |
| v2-H | Bedrijf in de briefing | De briefing vraagt **voor welk bedrijf** de campagne is (Van den Udenhout, Porsche Centrum Brabant, Porsche Centrum Maastricht, PGZ, Bentley Maastricht …). Zo weet de analyse in welke accounts en properties hij moet kijken (zie §8). |
| v3-1 | Lead Type | **Niet** in de kopie. Wat welk soort lead is, legt de eigenaar vast in de semantic layer van Data leads. |
| v3-2 | Kolommen kopie | Precies de zes opgegeven velden, **1-op-1** zoals in de sheet: Ordersoort, Onderwerp, Kanaalgroep, Merk, Model, Aangelegd. Geen Kanaal, geen andere kolommen. Hoe ze te analyseren, staat in de semantic layer. |
| v3-3 | Veldnamen briefing | **Bedrijf** = welk van onze bedrijven (Van den Udenhout, Porsche Centrum Brabant, Bentley Maastricht …). **Merk** = het automerk (Audi, Volkswagen …). |
| v4-1 | Meerdere modellen | **Model** mag meerdere waarden hebben; **Bedrijf** blijft één keuze. Een gezamenlijke campagne van twee bedrijven wordt twee campagnes. |
| v4-2 | Budget | Geen vermelding van inclusief of exclusief btw. |
| v4-3 | Lezer | Geschreven voor de **marketeer** die bijstuurt, met bovenaan een **samenvatting van vijf regels** die ook het management kan lezen. |
| v4-4 | Hoofdprompt | **Eén** hoofdprompt met een **apart hoofdstuk per label** (tussentijdse evaluatie, eindevaluatie). |
| v4-5 | Data correctie | Iedereen die ingelogd is mag hem invullen. |
| v4-6 | Correctie → semantic layer | De analyse stelt correcties die voor alle campagnes gelden **voor** als aanvulling op de semantic layer; de eigenaar beslist. De analyse past de semantic layer **nooit** zelf aan. |
| v4-7 | Versie verwijderen | Alleen de eigenaar kan een versie verwijderen. De nummering schuift niet op. |
| v4-8 | Afgelopen campagnes | Lopende campagnes bovenaan op startdatum; afgelopen campagnes in een inklapbaar blok **Afgelopen**. |
| v3-4 | Leads per bedrijf | **Alleen Van den Udenhout** gebruikt de leads-kopie, naast de leads en andere interessante events uit GA4. **Alle andere bedrijven**: de leads-kopie is niet van toepassing; voor leads kijken ze **alleen naar GA4**. Dit staat ook in het blok Algemeen van de semantic layer. |

## 3. Harde regel: welke data de analyse mag gebruiken

**Alleen deze bronnen, en niets anders:**

| Bron | Via | Wat |
|---|---|---|
| Google Ads, Meta Ads, LinkedIn Ads | **Windsor** (live) | Kosten, vertoningen, bereik, klikken, advertenties, bestemmings-URL's |
| Facebook, Instagram, LinkedIn (organisch) | **Windsor** (live) | Posts met tekst, bereik, interacties, klikken |
| Google Analytics 4 (alle websites) | **Windsor** (live) | Sessies, landingspagina's, kanalen, bron/medium, events, betrokkenheid |
| Leads (**alleen Van den Udenhout**) | **Nachtelijke kopie van de spreadsheet "Data leads"** in Supabase (`marketing_analyse_leads`, §3.1) | Ordersoort, Onderwerp, Kanaalgroep, Merk, Model, Aangelegd — laatste 365 dagen, zonder "FW:" |
| Extra kanaalkosten | **Supabase `dataloket.lead_kanaalkosten`** | Maandkosten per GA4-bron/medium die niet in de advertentieaccounts staan |

**Uitdrukkelijk niet:** de andere tabellen in Supabase. Dat geldt ook voor de kopieën `windsor_*` en `leads_raw`/`v_leads`. De analyse leest Windsor dus **rechtstreeks**, en leads alleen uit `marketing_analyse_leads`.

**Wel in Supabase, maar dat is geen analysedata:**

- de tabellen van de tool zelf: briefing, hoofdprompt, semantic layer, analyses;
- `lead_kanaalkosten`.

Deze regel komt op drie plekken te staan, zodat hij niet per ongeluk wordt losgelaten:

- in de skill;
- in de standaard-hoofdprompt;
- in de verantwoording van elke analyse, die noemt welke bronnen zijn gebruikt.

### 3.1 De leads-kopie voor de analyse

Het tabblad "Data leads" is te groot om tijdens een analyse rechtstreeks te lezen (±286.000 rijen, 37 kolommen). Daarom komt er een smalle, eigen kopie in Supabase, alleen voor de analyse:

| | |
|---|---|
| **Tabel** | `dataloket.marketing_analyse_leads` (werknaam) |
| **Kolommen** | Precies deze zes, 1-op-1 zoals in de sheet: Ordersoort, Onderwerp, Kanaalgroep, Merk, Model, Aangelegd. De waarden blijven ongewijzigd; alleen Aangelegd wordt daarnaast als datum opgeslagen, zodat er op periode te filteren is. |
| **Rijen** | Alleen leads met Aangelegd in de **laatste 365 dagen**; rijen met **"FW:"** ergens in Onderwerp eruit; lege opvulregels eruit |
| **Verversen** | **Elke nacht** in dezelfde run als de bestaande sheet-sync (`/api/sync`), uit dezelfde keer lezen van de sheet. Eerst alles vervangen in één transactie, zodat de tabel nooit half gevuld is. |
| **Controle** | Elke run wordt gelogd. De analyse meldt tot welke datum de kopie loopt. |
| **Rechten** | Lezen voor ingelogde collega's en voor Claude Code; schrijven alleen door de nachtelijke taak |

Waarom dit binnen de regel "rechtstreeks uit de spreadsheet" valt: de kopie wordt elke nacht vers uit de sheet gemaakt en bevat precies de gekozen kolommen en filters. Hij leunt niet op `leads_raw` of `v_leads`.

Gevolg van 365 dagen: een campagne die langer dan een jaar geleden begon, kan niet volledig opnieuw worden geanalyseerd. Een eerder gemaakte versie blijft wel bewaard.

**Gevolg van de bronnenregel:** een analyse duurt langer. Windsor live bevragen kost per bron tot een paar minuten (Facebook organisch gemeten ±2 min). Dat is acceptabel, want de analyse draait in Claude Code en niet in de browser.

## 4. De flow

```
Dashboard (Marketing analyse)        Claude Code (skill)                       Bronnen
─────────────────────────────        ───────────────────                       ───────
Briefing + Data correctie ─────┐
Analyse ronde: Aan/Uit         │  1. "analyseer Audi A2" of
Hoofdprompt (alleen eigenaar)  ├─▶     "voer de analyseronde uit"
Semantic layer (alleen eig.) ──┘  2. briefing, data correctie, hoofdprompt,
                                     semantic layer ophalen (Supabase)
                                  3. label bepalen: tussentijds / eind
                                  4. herkennen + data ophalen ◀──────── Windsor (ads, organisch, GA4)
                                                               ◀──────── Spreadsheet "Data leads"
                                                               ◀──────── lead_kanaalkosten
                                  5. analyse maken
Analyse (versie N) ◀───────────── 6. wegschrijven als versie N (Supabase)
```

## 5. De analyse

### 5.1 Funnel

| # | Stap | Bron |
|---|---|---|
| 1 | **Investering**: mediakosten per platform/campagne + extra kanaalkosten, tegen het totaalbudget en het tempo | Windsor ads + `lead_kanaalkosten` |
| 2 | **Bereik**: vertoningen en bereik, betaald en organisch apart | Windsor ads + organisch |
| 3 | **Klikken**: CTR, CPC, per advertentie | Windsor ads |
| 4 | **Organische posts** die de campagne promoten | Windsor organisch |
| 5 | **Verkeer naar de campagnepagina('s)** per kanaal en bron/medium | Windsor GA4 |
| 6 | **Gedrag op de pagina**: betrokkenheid, tijd, events | Windsor GA4 |
| 7 | **E-mailverkeer apart**: gedrag op de pagina en lead-events | Windsor GA4 (hoe e-mail te herkennen: semantic layer) |
| 8 | **Lead-events en andere interessante events in de sessie** (proefrit, offerte, servicebeurt …) — voor **elk** bedrijf | Windsor GA4, zie §5.2 (welke events tellen: semantic layer) |
| 9 | **Leads in Syntec** — **alleen bij Van den Udenhout**: totaal, via Internet (kanaalgroep), per soort lead (volgens de semantic layer). Bij de andere bedrijven vervalt deze stap en meldt de analyse dat leads alleen uit GA4 komen. | `marketing_analyse_leads` |
| 10 | **Doel**: hoe staat de campagne ervoor, gezien doel, budget en periode | Briefing + alles hierboven |

### 5.2 Lead-events later in de sessie (geverifieerd)

Windsor levert voor GA4 de combinatie **`landing_page` × `event_name` × `event_count`**, met `sessions`, `engaged_sessions`, `session_default_channel_group` en `session_source_medium`. In GA4 hoort de landingspagina bij de hele sessie. Daarmee tellen we precies de events in sessies die op de campagnepagina begonnen, ook als het event later op een andere pagina viel. Dat beantwoordt de vraag "deden ze later in hun sessie een lead-event". De events die als lead tellen, staan in de semantic layer van GA4.

### 5.3 Extra kanaalkosten verdelen over sessies

Per bron/medium per maand staat er een bedrag in `lead_kanaalkosten`, bijvoorbeeld gaspedaal.nl / referral. Het deel dat bij de campagne hoort:

```
kosten per sessie (bron, maand) = maandbedrag ÷ alle sessies van die bron/medium in die maand
campagnekosten (bron)           = Σ over de maanden: kosten per sessie × sessies van die bron/medium
                                  op de campagnepagina('s) binnen de campagneperiode
```

- **Lopende maand:** het maandbedrag naar rato van de verstreken dagen, gedeeld door de sessies tot en met gisteren. Zo telt een half verstreken maand niet als een volle factuur.
- **Website:** "alle sessies" wordt geteld op de GA4-property van het bedrijf waar de campagnepagina op staat; voor Van den Udenhout is dat "GA4_https://udenhout.nl".

### 5.4 Tussentijdse evaluatie of eindevaluatie

| Label | Wanneer | Focus |
|---|---|---|
| **Tussentijdse evaluatie** | De einddatum ligt op of na de analysedatum, of er is geen einddatum. Periode: start t/m gisteren. | Wat moet er **nu** anders om de campagne bij te sturen: budget, creatives, pagina, targeting. Ligt de campagne op schema, gezien doel en budget? |
| **Eindevaluatie** | De einddatum ligt vóór de analysedatum. Periode: start t/m einddatum. | **Terugblik** op de hele campagne: wat werkte, wat niet, lessen voor een volgende keer. |

Het label wordt bij het opslaan **automatisch** bepaald, niet door het model. De hoofdprompt heeft per label een eigen focus.

## 6. Herkenning en Data correctie

**Bij elke analyse** onderzoekt Claude grondig welke data bij de campagne hoort:

- advertentiecampagnes en advertenties;
- organische posts;
- campagnepagina's;
- e-mailverkeer (utm);
- GA4-events;
- de modelwaarden in de leads.

Alles komt met reden en zekerheid in het blok **Verantwoording** van het resultaat, met de vraag "klopt dit?".

**Data correctie** is een open tekstveld per campagne. Iedereen kan het invullen, op de analysepagina direct onder de verantwoording en in de briefing-zijbalk. Daarin staat wat niet klopte, bijvoorbeeld:

- "De post van 3 oktober over de Q4 hoort er niet bij."
- "Pagina /acties/a2-roadshow hoort er ook bij."
- "E-mailcampagne 'nieuwsbrief-okt' mist."

Hoe de volgende analyse ermee omgaat:

- Hij leest de data correctie en past hem toe.
- Hij meldt **per correctie** wat hij ermee heeft gedaan.
- Het veld blijft staan en groeit mee, zodat elke volgende versie correcter wordt.
- Bij elke versie wordt vastgelegd met welke data correctie hij is gemaakt.

## 7. Semantic layer (nieuw)

Naast de knop **Hoofdprompt** komt een knop **Semantic layer**. Daarachter staat per databron een tekstveld met alle kennis over die bron: hoe de data in elkaar zit en hoe de analyse ermee moet omgaan. Bij een analyse gaat de semantic layer mee in de opdracht.

| Blok | Voorbeelden van wat erin hoort |
|---|---|
| **Algemeen** | **Welke accounts en GA4-properties bij welk bedrijf horen**; **welke bronnen per bedrijf van toepassing zijn** (Data leads alleen voor Van den Udenhout; de andere bedrijven alleen GA4 voor leads) (bijv. Van den Udenhout = Meta "Van den Udenhout", Google Ads "Udenhout", LinkedIn "Van den Udenhout Groep", GA4 "GA4_https://udenhout.nl"); naamgeving van campagnes ("Actie(s) - …"); wat Van den Udenhout onder een lead verstaat |
| **Google Ads** | Campagnetypes (Search, PMax, Demand Gen), naamconventies, welke conversies betrouwbaar zijn |
| **Meta Ads** | PR = prospecting, RT = retargeting; utm-opbouw; Meta-leads zijn de eigen telling van Meta |
| **LinkedIn Ads** | Welke accounts horen bij welk merk |
| **Facebook** | Pagina's per merk/vestiging; hoe een campagnepost te herkennen |
| **Instagram** | Accounts; organisch vs geboost bereik |
| **LinkedIn organisch** | Bedrijfspagina's |
| **Google Analytics 4** | Welke property bij welke website hoort; **hoe e-mailverkeer te herkennen** (kanaalgroep, utm_source/medium); **welke events als lead tellen**; welke andere events interessant zijn |
| **Data leads (spreadsheet)** | De zes kolommen en wat ze betekenen; **welk soort lead een rij is** (af te leiden uit Onderwerp, Ordersoort enz.); "Internet" = online; modelnamen op veel manieren gespeld; "FW:" is er al uit; 365 dagen; alleen Van den Udenhout |
| **Extra kanaalkosten** | Wat erin staat en hoe het te verdelen (§5.3) |

- **Bewerken** alleen door de eigenaar, **lezen** door iedereen.
- **Versies:** elke opslag wordt een nieuwe versie. Elke analyse legt vast met welke stand van de semantic layer hij is gemaakt. Zo is later te zien waarom v2 anders rekende dan v1.
- **Startinhoud:** ik vul elk blok vooraf met wat er nu bekend is (uit de documentatie van het dashboard en het onderzoek naar de A2). Jij vult aan en corrigeert.

**Verhouding tot de hoofdprompt:**

- De hoofdprompt is het **hoe analyseer je** en is voor elke campagne gelijk.
- De semantic layer is het **hoe lees je de data** en hoort bij de bron.
- De data correctie is **wat klopte er niet bij déze campagne**.

## 8. Het dashboard: Marketing analyse

**Overzicht.** Eén regel per campagne, onder elkaar. Per regel:

- naam met merklogo, looptijd en budget;
- doel;
- schakelaar **Analyse ronde** (Aan/Uit);
- laatste versie met label (Tussentijds / Eind) en datum;
- kosten, vertoningen, klikken, sessies, lead-events, leads (totaal / via Internet).

Lopende campagnes staan bovenaan op startdatum; afgelopen campagnes staan eronder in een inklapbaar blok **Afgelopen**. Rechtsboven staan **Hoofdprompt**, **Semantic layer** en **Nieuwe campagne**. Een klik op een regel opent de analyse; het potlood opent de briefing.

**Briefing** (zijbalk). Velden:

- naam (verplicht);
- **Bedrijf** (verplicht, keuzelijst): Van den Udenhout, Porsche Centrum Brabant, Porsche Centrum Maastricht, PGZ, Bentley Maastricht, VELOO, Instra … De lijst komt uit het blok Algemeen van de semantic layer, zodat een nieuw bedrijf daar maar op één plek bij hoeft;
- **Merk** en **Model** (optioneel, de auto: bijv. Audi / A2 e-tron; meerdere modellen mogelijk);
- startdatum en einddatum;
- totaalbudget;
- doel (open tekst);
- omschrijving;
- data correctie.


**Analysepagina**, van boven naar beneden:

1. Kop met versiekeuze en label
2. Samenvatting van vijf regels (ook voor het management) en het oordeel over het doel
3. Briefing van die versie
4. Funnelrij
5. Een blok per funnelstap
6. Inzichten en aanbevelingen. Bij een tussentijdse evaluatie: wat nu bijsturen; bij een eindevaluatie: lessen.
7. Verantwoording (wat is toegerekend en welke bronnen zijn gebruikt)
8. Het veld **Data correctie**
9. Eventuele **voorstellen voor de semantic layer**: correcties die voor alle campagnes lijken te gelden. Jij beslist of je ze overneemt.

Alleen de eigenaar ziet bij een versie de knop **Versie verwijderen**.

## 9. Wat er verandert aan de code die er al staat

De eerste opzet (branch `claude/campaign-insight-analysis-inbofg`) blijft de basis. Aanpassingen:

| Onderdeel | Wijziging |
|---|---|
| Naam | "Campaign insight" wordt **Marketing analyse** (sidebar, titel, startscherm, documentatie) |
| Knop "Analyse aanvragen" | Wordt de schakelaar **Analyse ronde** in het overzicht |
| Briefing | Zoektermen, campagnepagina's en de sheetkoppeling eruit; **Bedrijf** en **Data correctie** erin |
| Nieuw | **Semantic layer**: knop, zijbalk met een blok per bron (inclusief Algemeen), tabel met versies |
| Nieuw | **Bedrijf** (keuzelijst uit het blok Algemeen), meerdere modellen, blok **Afgelopen** in het overzicht, **versie verwijderen** (alleen eigenaar), voorstellen voor de semantic layer in het resultaat |
| Analyse | **Label** (tussentijds/eind) automatisch bij opslaan; momentopname van data correctie en semantic layer per versie |
| Kerncijfers overzicht | Lead-events GA4 (elk bedrijf) en leads uit `marketing_analyse_leads` (alleen Van den Udenhout; bij de andere bedrijven "n.v.t." in plaats van een nul) |
| Nachtelijke sync | Extra tabel `marketing_analyse_leads` vullen in dezelfde run (§3.1), plus migratie |
| Hoofdprompt (standaardtekst) | Eén prompt met een hoofdstuk per label; geschreven voor de marketeer met een samenvatting van vijf regels; herschreven naar de besluiten: bronnenregel, periode, leads (totaal/Internet/type), kostenverdeling, twee labels, geen orders, geen vergelijking met vóór de campagne |
| Skill | Alleen Windsor live, `marketing_analyse_leads` en `lead_kanaalkosten`; bedrijf → accounts uit de semantic layer; semantic layer en data correctie inlezen; analyseronde; ronde uit na eindevaluatie |
| Rechten | Hoofdprompt en semantic layer: alleen de eigenaar (de twee accounts van Jan Willem) |

## 10. Fasering

| Fase | Wat |
|---|---|
| **1** | Code aanpassen volgens §9; leads-kopie bouwen en een nacht laten draaien; migraties toepassen; semantic layer vooraf vullen; briefing Audi A2; eerste analyse (v1, tussentijdse evaluatie); samen beoordelen |
| **2** | Hoofdprompt en semantic layer aanscherpen op basis van v1; data correctie invullen; v2 draaien en controleren dat de correcties zijn toegepast |
| **3** | Later: e-mailcijfers uit Selligent, benchmarks tussen campagnes, automatisch wekelijks draaien |

## 10a. Status fase 1 (24 november 2026)

| Onderdeel | Status |
|---|---|
| Pagina **Marketing analyse** (overzicht met lopend/afgelopen, Analyse ronde, analysepagina met label, Data correctie, voorstellen semantic layer, versie verwijderen) | Gebouwd, lokaal getest met voorbeelddata |
| Briefing met Bedrijf, Merk, Modellen, Data correctie | Gebouwd |
| Hoofdprompt (één prompt, hoofdstuk per label) en **Semantic layer** (blok per bron, vooraf gevuld) | Gebouwd; nog niet opgeslagen, dus de standaardteksten gelden |
| Migratie 0042 (tabellen + opslagfunctie) | **Toegepast** in Supabase |
| Nachtelijke leads-kopie `marketing_analyse_leads` | Gebouwd in `/api/sync`; draait pas zodra deze branch live staat (Vercel) |
| Skill `marketing-analyse` | Herschreven naar de besluiten |
| Eerste analyse Audi A2 | Wacht op de briefing (einddatum, doel, budget) en op de eerste nachtelijke leads-kopie |

## 11. Open vragen

Geen. Alle vragen uit de rondes 1 tot en met 4 zijn beantwoord en verwerkt in §2. Nieuwe vragen die tijdens het bouwen opkomen, komen hier te staan.

## 12. Risico's

| Risico | Beheersing |
|---|---|
| Verkeerde toerekening | Grondige herkenning bij elke analyse + verantwoording + Data correctie |
| Windsor live is traag of een pull blijft hangen | Per bron ophalen, gefilterd op periode en campagne; bij uitval melden in de datakwaliteit |
| Spreadsheet te groot om rechtstreeks te lezen | Smalle nachtelijke kopie (§3.1) |
| Nachtelijke kopie loopt vast | Eigen log per run; de analyse meldt tot welke datum de leads lopen |
| Modelnamen in de leads op veel manieren gespeld | Brede zoekterm, gebruikte waarden tonen, semantic layer, Data correctie |
| Per ongeluk andere Supabase-tabellen gebruikt | Bronnenregel in skill, hoofdprompt en verantwoording |
| Bestaand beveiligingspunt: 15 `dataloket`-tabellen zonder RLS | Los van deze tool oppakken |

## 13. Fase 2 — Analyse opzetten (concept, nog niet gebouwd)

Naast de campagne-analyse komen er andere soorten analyses: de **analyse opzet** (analysetype).
Elke opzet heeft een eigen prompt; de semantic layer blijft één en dezelfde.

### 13.1 Besluiten van de eigenaar (24 november 2026)

| # | Onderwerp | Besluit |
|---|---|---|
| 1 | Periode bij een rapportage | **Open tekstveld**: "Afgelopen 3 maanden", "1 januari t/m 10 februari 2026", "Q4 2026". Zie 13.3. |
| 2 | Opbouw | Elke rapportage is een eigen regel (bijv. "VDU maandrapportage november 2026"); nieuwe versies zijn herzieningen. Formulier: naam, periode, omschrijving/aandachtspunten, Data correctie; bedrijf volgt uit de opzet. Geen merk, modellen, budget of doel. |
| 3 | Label | Rapportages krijgen **geen label** (campagnes houden tussentijds/eind). |
| 4 | Lege prompt | Claude **weigert** de analyse met een melding ("Er is nog geen prompt voor …"). Geen terugval op de campagneprompt. |
| 5 | Opzet wijzigen | Kan altijd; elke versie onthoudt met welke prompt hij is gemaakt. |
| 6 | Overzicht | Alleen campagne-analyses krijgen de funnelkolommen en kosten op schema. Andere opzetten: alleen **Campagne, Analyse ronde, Laatste analyse**. |
| 7 | Leads VDU-rapportage | Alle Syntec-leads van de periode, uitgesplitst naar merk en kanaalgroep. PGZ: alleen GA4. Dataregel (§3) geldt voor elke opzet. |
| 8 | Volgen per opzet | Later. |
| 9 | Nieuwe opzetten | De eigenaar wil later **zelf** opzetten kunnen toevoegen (in het dashboard, niet via code). |

### 13.2 Startlijst

| Opzet | Formulier | Bedrijf | Prompt |
|---|---|---|---|
| Campagne analyse (standaard) | campagne | kiezen | de huidige hoofdprompt |
| VDU kwartaalrapportage | rapportage | Van den Udenhout | leeg |
| VDU maandrapportage | rapportage | Van den Udenhout | leeg |
| PGZ kwartaalrapportage | rapportage | PGZ | leeg |
| PGZ maandrapportage | rapportage | PGZ | leeg |

### 13.3 Open periode: hoe het werkt

Claude legt de tekst bij elke analyse uit tot concrete datums, ten opzichte van de dag van de
analyse, en bewaart die bij de versie (`periode_van`/`periode_tot`, bestaat al). De pagina toont
beide: "Afgelopen 3 maanden → 1 aug t/m 31 okt 2026". Een relatieve periode schuift dus mee
met elke nieuwe versie. Is de tekst niet eenduidig, dan kiest Claude de redelijkste uitleg en
meldt die in de verantwoording. Een rapportage heeft geen start- en einddatum in de briefing,
dus de indeling Lopend/Afgelopen (§8) werkt alleen voor campagnes.

### 13.4 Ontwerp (voorstel)

- Tabel `marketing_analyse_opzetten` (naam, formulier `campagne`/`rapportage`, vast bedrijf of
  leeg, volgorde, actief). Prompts per opzet in `marketing_analyse_prompts` (kolom `opzet_id`,
  versienummer per opzet). Campagne krijgt `opzet_id` (standaard Campagne analyse) en
  `periode_tekst`.
- Briefing: uitklapmenu **Analyse opzet** bovenaan; het formulier eronder volgt het type.
- Rechtsboven **Analyse prompts** met een uitklapmenu per opzet; de eigenaar bewerkt, de rest
  leest. Daar ook "Nieuwe opzet" (alleen de eigenaar).
- Skill: stap 1 haalt de prompt van de opzet op en stopt bij een lege prompt; rapportages
  slaan het label over.
