# Campagne-analysetool (Marketing analyse) — plan

*Versie 7 · 24 november 2026 · status: fase 1 gebouwd (zie §10a); fase 2 (analyse opzetten) gebouwd (zie §13); analysepagina in tabbladen gebouwd (zie §14)*

*Voorgestelde campagne analyses (25 november 2026, migratie 0046): zie `campagne-voorstellen-plan.md`.*

*Planning van de analyseronde (25 november 2026, migratie 0049): zie §17. De schakelaar Analyse ronde is vervangen door een uitklapmenu Planning.*

## 1. Waar het om gaat

Van den Udenhout draait campagnes (bijv. "Audi A2") over meerdere kanalen tegelijk: betaalde advertenties, organische posts, e-mail en één of meer campagnepagina's. De tool maakt per campagne een **full-funnel analyse**:

1. Het team legt in het dashboard een **briefing** vast: naam, start- en einddatum, doel, totaalbudget en omschrijving.
2. De eigenaar geeft in Claude Code het sein, met de skill.
3. Claude zoekt alle data van de campagne op, analyseert de funnel en schrijft het resultaat weg in Supabase.
4. Het dashboard toont de analyse. Elke analyse is een **nieuwe versie**; eerdere versies blijven op te halen.
   Claude maakt elke versie **zonder voorkennis**: eerdere versies van de analyse worden niet meegegeven of gelezen (besluit van de eigenaar, november 2026).

Drie kennislagen sturen de analyse:

- de **hoofdprompt**: hoe je analyseert en oordeelt;
- de **semantic layer**: per databron hoe je de data leest;
- de **data correctie** per campagne: wat er bij de vorige analyse niet klopte.

## 2. Besluiten (antwoorden op de vragen uit versie 1)

| # | Onderwerp | Besluit |
|---|---|---|
| 1 | Campagnes uit de sheet | **Nee.** Campagnes worden alleen in het dashboard opgegeven (de briefing). |
| 2–3 | Doel | **Open tekstveld** in de briefing. De analyse krijgt het doel als context en beoordeelt zelf hoe het ervoor staat. Wat het doel is, staat in de briefing. |
| 4 | Kosten | Mediakosten uit de advertentieaccounts (via Windsor). **Gewijzigd 24 november 2026:** bij een campagne-analyse tellen de extra kanaalkosten uit `dataloket.lead_kanaalkosten` (bijv. gaspedaal.nl / referral) **niet** meer mee; alleen een rapportage mag ze gebruiken, apart genoemd (zie §5.3). |
| 5 | Orders | **Niet** meenemen. |
| 6 | Leads | Uit de leads-kopie: **totaal aantal leads**, **hoeveel via Internet** en **welke soort leads**. Welke soort een lead is, leidt de analyse af uit de zes kolommen volgens de semantic layer van Data leads (er is geen kolom Lead Type). Vervangen door §15: één bron, en in Syntec alleen websiteleads via udenhout.nl. |
| 7 | E-mailcijfers (Selligent) | **Nu niet**, later misschien. E-mail alleen vanaf de klik (GA4). |
| 8 | Toerekening | Bij **elke** analyse grondig onderzoeken welke data bij de campagne hoort en dat tonen in het resultaat. Plus een open veld **Data correctie** per campagne (zie §6). |
| 9 | Label | Analysedatum vóór de einddatum: **Tussentijdse evaluatie** (gericht op bijsturen). Einddatum verstreken: **Eindevaluatie** (terugblik op de hele campagne). |
| 10 | Starten | Handmatig via de skill. Elke campagne krijgt in het overzicht een schakelaar **Analyse ronde** (Aan/Uit). "Voer de analyseronde uit" analyseert alle campagnes die op Aan staan. **Gewijzigd 25 november 2026:** de schakelaar is een uitklapmenu **Planning** (Uit, Wekelijks, Maandelijks, Per kwartaal) geworden, zie §17. |
| 11 | Rechten | **Iedereen** mag campagnes aanmaken. **Alleen de eigenaar** past de hoofdprompt (en de semantic layer) aan; iedereen mag ze lezen. |
| 12 | Benchmarks | **Nu niet.** |
| 13 | Naam pagina | **Marketing analyse** |
| 14 | Migraties | Toegestaan. |
| 15a | Periode | Alleen **binnen start- en einddatum**. Ligt de einddatum in de toekomst: tot en met **gisteren**. Het totaalbudget is wat marketing voor de hele periode beschikbaar heeft, om te beoordelen of de campagne op schema ligt. |
| 15b | Supabase-queries | Toegestaan waar nodig (binnen de grenzen van §3). |
| v2-A | Leads-data | Een **nachtelijke kopie** van "Data leads" in Supabase, alleen voor de analyse: zes kolommen (Ordersoort, Onderwerp, Kanaalgroep, Merk, Model, Aangelegd), de laatste 365 dagen, zonder rijen met "FW:" in Onderwerp (zie §3.1). Sinds 25 november 2026 zeven: Kanaal kwam erbij (§15). |
| v2-B | Kostenverdeling | De rekensom in §5.3 klopt. |
| v2-C | GA4 udenhout.nl | Alleen property **"GA4_https://udenhout.nl"** (255949462) voor Van den Udenhout. |
| v2-D | Analyse ronde | Springt automatisch op **Uit** na een eindevaluatie. Geldt nu voor de planning (§17). |
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
| Orders (**alleen Van den Udenhout**) | **Nachtelijke kopie van de spreadsheet "Data orders"** in Supabase (`marketing_analyse_orders`, bron "Syntec orders", §16) | Ordersoort, Klantgroep, Merk, Model, Orderdatum — laatste 365 dagen, één rij is één verkochte auto |
| Extra kanaalkosten | **Supabase `dataloket.lead_kanaalkosten`** | Maandkosten per GA4-bron/medium die niet in de advertentieaccounts staan |

**Uitdrukkelijk niet:** de andere tabellen in Supabase. Dat geldt ook voor de kopieën `windsor_*` en `leads_raw`/`v_leads`. De analyse leest Windsor dus **rechtstreeks**, leads alleen uit `marketing_analyse_leads` en orders alleen uit `marketing_analyse_orders`.

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
| 1 | **Investering**: mediakosten per platform/campagne, tegen het totaalbudget en het tempo (geen extra kanaalkosten meer, besluit 24 november 2026) | Windsor ads |
| 2 | **Bereik**: vertoningen en bereik, betaald en organisch apart | Windsor ads + organisch |
| 3 | **Klikken**: CTR, CPC, per advertentie | Windsor ads |
| 4 | **Organische posts** die de campagne promoten | Windsor organisch |
| 5 | **Verkeer naar de campagnepagina('s)** per kanaal en bron/medium | Windsor GA4 |
| 6 | **Gedrag op de pagina**: betrokkenheid, tijd, events | Windsor GA4 |
| 7 | **E-mailverkeer apart**: gedrag op de pagina en lead-events | Windsor GA4 (hoe e-mail te herkennen: semantic layer) |
| 8 | **Lead-events en andere interessante events in de sessie** (proefrit, offerte, servicebeurt …) — voor **elk** bedrijf | Windsor GA4, zie §5.2 (welke events tellen: semantic layer) |
| 9 | **Leads in Syntec** — **alleen bij Van den Udenhout**: totaal, via Internet (kanaalgroep), per soort lead (volgens de semantic layer). Bij de andere bedrijven vervalt deze stap en meldt de analyse dat leads alleen uit GA4 komen. | `marketing_analyse_leads` |
| 9a | **Orders in Syntec** — **alleen bij Van den Udenhout**: de verkochte auto's voor merk en model in de periode, **altijd uitgesplitst per klantgroep**, en in Nieuw en Gebruikt (§16). | `marketing_analyse_orders` |
| 10 | **Doel**: hoe staat de campagne ervoor, gezien doel, budget en periode | Briefing + alles hierboven |

### 5.2 Lead-events later in de sessie (geverifieerd)

Windsor levert voor GA4 de combinatie **`landing_page` × `event_name` × `event_count`**, met `sessions`, `engaged_sessions`, `session_default_channel_group` en `session_source_medium`. In GA4 hoort de landingspagina bij de hele sessie. Daarmee tellen we precies de events in sessies die op de campagnepagina begonnen, ook als het event later op een andere pagina viel. Dat beantwoordt de vraag "deden ze later in hun sessie een lead-event". De events die als lead tellen, staan in de semantic layer van GA4.

### 5.3 Extra kanaalkosten verdelen over sessies (alleen nog voor rapportages)

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
| **Data leads (spreadsheet)** | De kolommen (sinds §15 zeven, met Kanaal) en wat ze betekenen; **welk soort lead een rij is** (af te leiden uit Onderwerp, Ordersoort enz.); "Internet" = online; modelnamen op veel manieren gespeld; "FW:" is er al uit; 365 dagen; alleen Van den Udenhout |
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


**Analysepagina** (sinds 24 november 2026 in tabbladen, zie §14):

1. Kop met versiekeuze en label
2. Samenvatting in drie kolommen: links de samenvatting en het doeloordeel, in het midden de aanbevolen acties op prioriteit, rechts de briefing van die versie (ingeklapt)
3. Tabbladen in funnelvolgorde, elk met links (3/4) de cijfers en rechts (1/4) de bevindingen en acties
4. Tabblad Verantwoording: wat is toegerekend, welke bronnen, wat er met de Data correctie is gedaan, het veld **Data correctie** en de **voorstellen voor de semantic layer**

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

## 13. Fase 2 — Analyse opzetten (gebouwd 24 november 2026, migratie 0044)

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
| 10 | Rapportages in het overzicht | Een eigen regel, net als een campagne, maar zonder funnelcijfers, doel en kosten. |
| 11 | Zelf opzetten toevoegen | Alleen de eigenaar, via Analyse prompts → Nieuwe opzet: naam, formulier (campagne/rapportage), bedrijf (vast of kiezen). Verwijderen alleen zonder analyses, anders uitzetten. |
| 12 | Gedeelde regels | Dataregel, schrijfstijl voor de marketeer en managementsamenvatting van vijf regels gelden voor elke opzet (staan in de skill); een opzetprompt beschrijft alleen het eigene. |

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

### 13.4 Ontwerp (zo gebouwd)

- Tabel `marketing_analyse_opzetten` (naam, formulier `campagne`/`rapportage`, vast bedrijf of
  leeg, volgorde, actief). Prompts per opzet in `marketing_analyse_prompts` (kolom `opzet_id`,
  versienummer per opzet). Campagne krijgt `opzet_id` (standaard Campagne analyse) en
  `periode_tekst`.
- Briefing: uitklapmenu **Analyse opzet** bovenaan; het formulier eronder volgt het type.
- Rechtsboven **Analyse prompts** met een uitklapmenu per opzet; de eigenaar bewerkt, de rest
  leest. Daar ook "Nieuwe opzet" (alleen de eigenaar).
- Skill: stap 1 haalt de prompt van de opzet op en stopt bij een lege prompt; rapportages
  slaan het label over.

## 14. Analysepagina in tabbladen (gebouwd 24 november 2026, formaat 2)

Op verzoek van de eigenaar is de analysepagina van één lange kolom omgebouwd tot een
samenvatting met daaronder tabbladen. Besluiten:

- **Samenvatting bovenaan, altijd zichtbaar**, in drie kolommen. Links de kop, de vijf regels,
  het doeloordeel en de toelichting (ingeklapt). In het midden de aanbevolen acties in twee
  lagen: eerst **de campagne als geheel** (drie tot zes acties die de LLM schrijft door over de
  hele funnel te kijken, met de tabbladen waar de onderbouwing staat), daaronder **uit de
  tabbladen** (alle acties per tabblad op prioriteit, standaard alleen hoog). Rechts de
  **briefing** van die versie als smalle verticale strook; een klik klapt hem uit (per browser
  onthouden). De oude balk "Briefing bij vN" is weg.
- **Tien tabbladen in funnelvolgorde**, in groepen: Media (Bereik, Investering, Advertenties),
  Content (Organische posts, E-mail), Website (Verkeer, Gedrag op de pagina), Resultaat
  (Lead-events, Leads in Syntec), en los achteraan Verantwoording. Bereik staat vóór
  Investering (keuze van de eigenaar). Google Ads, Meta Ads en LinkedIn Ads delen één tabblad
  Advertenties.
- **Onder elke tabnaam het hoofdgetal** (het eerste kerncijfer van de sectie) en naast de naam
  een stipje met het oordeel (goed, aandacht, probleem, geen data). De losse funnelstrip is
  daarmee weg.
- **Elk tabblad: links 3/4 cijfers, rechts 1/4 oordeel.** Links kerncijfers, grafieken, tabellen
  en hoogstens drie zinnen over hoe je de cijfers leest. Rechts een kop van één zin, twee tot
  vijf bevindingen met cijfer en nul tot drie acties met prioriteit. De rechterkolom blijft
  staan bij scrollen. Een conclusie staat op één plek.
- **Een tabblad zonder data staat grijs met de reden** in plaats van te verdwijnen, zodat de
  plekken vast blijven. Leads in Syntec is grijs met "niet van toepassing" als de analyse niet
  uitsluitend over Van den Udenhout gaat.
- **Investering** heeft altijd de tabel Per platform en campagne met CTR, conversies (Google),
  leads (Meta, LinkedIn) en kosten per conversie of lead; wat een platform niet levert staat
  als "n.v.t.". Geen extra kanaalkosten (besluit van dezelfde dag, §3).
- **Formaat 2** (`types.ts`): `tab`, `kop`, `oordeel`, `bevindingen` en `acties` per sectie;
  `aanbevelingen` zijn de acties voor de campagne als geheel met `tabs`; `inzichten` vervallen.
  Versies in formaat 1 openen met een tabblad per sectie, en hun inzichten en aanbevelingen
  staan in de samenvatting. Een rapportage krijgt ook een tabblad per sectie.
- Het open tabblad staat in de URL (`&mtab=investering`).
- Dit is op verzoek een derde uitzondering op "geen dubbele navigatie" in het dashboard (naast
  Campagnebeheer en KPI's 2027).

## 15. Leads: één bron, GA4 of Syntec (besluit van de eigenaar, 25 november 2026)

Voor de opzet **Campagne analyse**. Het leadcijfer, het getal dat tegen het doel uit de briefing
staat, komt altijd uit precies één bron. Nooit opgeteld, nooit gemengd.

- **Standaard Google Analytics.** Zegt het veld "Doel van de campagne" niet expliciet uit welke
  bron het doel komt, dan telt GA4: de lead-events van de soort uit het doel in sessies die op de
  campagnepagina('s) begonnen. "20 proefritten" = 20 proefritleads op de website.
- **Syntec alleen als het doel dat expliciet zegt** (het woord Syntec staat erin). Dan tellen alleen
  leads met **Kanaalgroep = "Internet"** én **"udenhout.nl" in Kanaal of Onderwerp**
  (hoofdletterongevoelig), voor merk en model, in de periode, van de soort uit het doel. Syntec kan
  alleen bij een analyse die uitsluitend over Van den Udenhout gaat; anders telt GA4 en staat er een
  melding.
- **De kolom Kanaal kwam erbij** in de leads-kopie (migratie 0047; zes kolommen werden er zeven),
  want zonder Kanaal is de regel niet toe te passen. De view `marketing_analyse_leads_website` past
  de voorwaarden toe en geeft de soort (proefrit, private lease, offerte, inruil, overig, uit
  Onderwerp en Kanaal; klopte in november 2026 voor 99,9% met Lead type in Syntec). Dezelfde logica
  in TypeScript: `isWebsiteLead` en `soortWebsiteLead` in `lib/sync/analyseLeads.ts`, getest.
- **Gemeten (laatste 365 dagen, november 2026)**: 38.296 leads in de kopie, 7.217 websiteleads van
  udenhout.nl, 2.236 proefritten. "Udenhout.nl" staat in de praktijk in Kanaal; in Onderwerp kwam
  het dat jaar niet voor.
- **Kerncijfers**: `leadBron` (`ga4` of `syntec`), `leadsDoel` (het leadcijfer) en `leadsDoelSoort`.
  Het overzicht rekent de bron zelf na uit het doel en de bedrijven (`leadBron` in `rekenen.ts`) en
  toont niets als de analyse uit een andere bron telde. Een analyse van vóór dit besluit toont bij
  GA4 nog de lead-events met de vermelding "alle lead-events"; bij Syntec niets tot de volgende
  analyse, want die telling volgde de regel niet.
- **Waar het staat**: semantic layer versie 3 (Algemeen "Leads bij een Campagne analyse", Google
  Analytics 4 "Leads tegen het doel", Data leads), de standaard-hoofdprompt ("Leads tegen het
  doel"), de skill, en de uitleg bij het doelveld in de briefing.
- **Keuze van Claude, ter controle door de eigenaar**: bij een doel in "leads" zonder soort tellen
  in GA4 alle lead-events behalve vacature, "Houd me op de hoogte" (HMODH) en de
  werkplaatsplanner; die staan apart.

## 16. Orders uit Syntec, bron "Syntec orders" (verzoek van de eigenaar, 25 november 2026)

De analyse mag naast de leads ook de verkochte auto's raadplegen, uit het sheet-tabblad
"Data orders". Precies dezelfde opzet als de leads-kopie (§3.1).

| | |
|---|---|
| **Tabel** | `dataloket.marketing_analyse_orders` (migratie 0048); in de semantic layer het blok **Syntec orders** |
| **Kolommen** | Precies deze vijf, 1-op-1 zoals in de sheet: Ordersoort, Klantgroep, Merk, Model, Orderdatum, plus `orderdatum_op` als datum |
| **Rijen** | Orderdatum in de **laatste 365 dagen**; rijen zonder leesbare datum eruit. Eén rij is één verkochte auto. Handel blijft erin. |
| **Verversen** | Elke nacht in `/api/sync`, eigen transactie en eigen regel `Marketing analyse orders` in `sync_runs`. "Data orders" staat niet in `BRONNEN`, dus de sync leest dit tabblad zelf (`ANALYSE_ORDERS_BRON` in `lib/sync/analyseOrders.ts`). |
| **Telling** | De view `marketing_analyse_orders_klant`: alleen Ordersoort Nieuw en Gebruikt (verkoop aan klanten), met `klantgroep_naam` ("Geen klantgroep" als hij leeg is). Gelijk aan `isKlantOrder` / `klantgroepNaam` in TypeScript, getest. |
| **Rechten** | Lezen voor ingelogde collega's en Claude Code; schrijven alleen door de nachtelijke taak |

- **Klantgroep altijd uitsplitsen.** Waar orders in een analyse staan, staat de uitsplitsing per
  klantgroep erbij (aantal, aandeel, totaalregel), plus Nieuw tegen Gebruikt. Dat is een harde
  regel in de semantic layer (Algemeen "Orders bij een Campagne analyse"), de hoofdprompt en de skill.
- **Tabblad Orders in Syntec** (`orders`, groep Resultaat, na Leads in Syntec). Grijs met "niet van
  toepassing" als de analyse niet uitsluitend over Van den Udenhout gaat.
- **Handel apart** (keuze van Claude, ter controle door de eigenaar): Ordersoort heeft drie
  waarden, niet twee. Handel (1.712 van de 12.926 orders in 2026) heeft bijna nooit een
  klantgroep en is geen verkoop aan een klant. Hij staat in de kopie, maar niet in de view; de
  analyse noemt hem hoogstens apart.
- **Nooit het leadcijfer, geen koppeling met leads.** Gaat het doel over verkochte auto's, dan
  beoordeelt de analyse het doel op de orders. Een order voor merk en model in de periode is
  niet per se door de campagne gekomen.
- **Alleen Van den Udenhout** (aanname van Claude, net als bij de leads): de andere bedrijven
  hebben geen orders in deze bron.
- **Gemeten (november 2026)**: de sheet begint op 1 januari 2026; op 25 november liep hij tot
  14 november. 12.926 orders: Nieuw 8.134, Gebruikt 3.080, Handel 1.712; 25 klantgroepen, de
  grootste Koop Particulier (BM), Dealer Lease en Koop Zakelijk (BM). Zeven klantgroepen beginnen
  met "Cupra - " en horen alleen bij CUPRA.
- **Waar het staat**: semantic layer versie 4 (Algemeen, nieuw blok Syntec orders), de
  standaard-hoofdprompt ("Orders", tabblad 10), de skill en dit plan.

## 17. Planning van de analyseronde (verzoek van de eigenaar, 25 november 2026)

Elke vrijdag zegt de eigenaar in Claude Code "voer de analyseronde uit". Tot nu toe nam de skill
alles mee wat op Aan stond, dus een maandrapportage draaide elke week opnieuw. Nu heeft elke regel
een planning, en bepaalt de database welke regels aan de beurt zijn.

| # | Onderwerp | Besluit |
|---|---|---|
| 1 | Standen | **Uit, Wekelijks, Maandelijks, Per kwartaal.** Geen Jaarlijks. |
| 2 | In het overzicht | Het schuifje Ronde vooraan in elke regel wordt een **uitklapmenu Planning** (campagnes en rapportages). Achter elke keuze staat wanneer de volgende analyse dan komt; onder het knopje de volgende datum van de gekozen stand. Iedereen die ingelogd is mag hem omzetten. |
| 3 | Uit | **Geen updates meer**, ook geen eindevaluatie. Een losse analyse ("maak een marketing analyse van …") kan nog wel. |
| 4 | Welke dag | Wekelijks: elke ronde. Maandelijks: vanaf de **eerste vrijdag van de maand**. Per kwartaal: vanaf de eerste vrijdag van **januari, april, juli en oktober**. |
| 5 | Gemiste vrijdag | **Inhalen.** Een regel blijft aan de beurt tot er sinds de geplande week een versie is. Alleen de laatste periode wordt ingehaald, niet elke gemiste. |
| 6 | Data die achterloopt | **Altijd op de eerste vrijdag**, niet wachten. Loopt een bron (orders, leads) niet tot het einde van de periode, dan staat dat in de datakwaliteit van het rapport. |
| 7 | Periode van een rapportage | **Volgt uit de planning**: Maandelijks = de vorige volle maand, Per kwartaal = het vorige volle kwartaal, nooit later dan gisteren. De vrije periode uit de briefing geldt alleen bij Wekelijks en Uit. |
| 8 | Campagnes | Kunnen alle vier de standen krijgen. De **eindevaluatie komt in de eerste ronde na de einddatum**, welke stand ook (behalve Uit); daarna springt de planning op Uit. Een campagne die nog niet begonnen is, wacht tot de eerste ronde na de startdatum. |
| 9 | Balk boven het overzicht | **Volgende analyseronde**: de eerstvolgende vrijdag, het aantal analyses en hun namen (een klik opent de analyse). Dezelfde lijst als die van de skill. *(26 november 2026 op verzoek verwijderd.)* |
| 10 | Standaard per opzet | Elke opzet heeft een **standaardplanning** (Campagne analyse Wekelijks, maandrapportages Maandelijks, kwartaalrapportages Per kwartaal, een nieuwe opzet Uit), in te stellen bij de opzet onder Analyse prompts. Een nieuwe analyse krijgt die stand; een toegevoegd voorstel ook (Wekelijks). |

**Hoe het rekent** (keuzes van Claude, ter controle door de eigenaar):
- Een ronde hoort bij een **week, maandag t/m zondag**. De vrijdag van die week is de rondedag. Wie
  een keer op donderdag draait (een feestdag), draait de ronde van die vrijdag. Donderdag
  31 december 2026 is dus de ronde van vrijdag 1 januari 2027.
- Een versie uit de week van de geplande vrijdag, of later, telt als gedaan. Twee keer draaien in
  dezelfde week maakt niets dubbel. Een losse analyse in die week telt ook.
- Een nieuwe maand- of kwartaalregel draait in de eerstvolgende ronde, over de vorige volle periode.

**Waar het staat**:
- Migratie 0049: kolom `planning` op `marketing_analyse_campagnes`, `standaard_planning` op
  `marketing_analyse_opzetten`, en de functie `marketing_analyse_ronde(datum)` die per regel geeft
  of hij aan de beurt is, waarom (`reden`), de volgende datum en de periode. De oude kolom
  `analyse_ronde` loopt via een trigger mee (planning ≠ uit), zodat `marketing_analyse_bewaar` en
  `marketing_analyse_voorstel_toevoegen` ongewijzigd werken: wie hem aanzet krijgt de
  standaardplanning van de opzet, wie hem uitzet krijgt Uit.
- Dezelfde rekenregel in TypeScript voor het dashboard: `lib/marketingAnalyse/planning.ts`, getest
  met dezelfde gevallen als waarmee de SQL-functie is nagelopen. Houd ze gelijk.
- Dashboard: `PlanningKeuze.tsx` (uitklapmenu, in een portal omdat de tabel horizontaal scrolt) en
  `RondeBalk.tsx`; PATCH `{ planning }` op `/api/marketing-analyse`.
- De skill `marketing-analyse` vraagt de ronde op met `select * from dataloket.marketing_analyse_ronde()`
  en maakt alleen de regels met `aan_de_beurt`.

## 18. Verzonden e-mails (verzoek van de eigenaar, 25 november 2026)

Achter het schildje Beheer, naast Analyse prompts en Semantic layer, staat de knop **Verzonden
e-mails**: per adres wie wanneer welke analyse per mail kreeg.

- **Alleen de eigenaar** ziet de knop en het overzicht (keuze van Claude: het zijn de adressen van
  collega's en het is een beheerscherm).
- **Per adres gelogd vanaf 25 november 2026** (migratie 0050, `marketing_analyse_mail_log`), ook als
  een mail mislukt, met de fout. Campagnenaam, versie en label worden meegeschreven, zodat het
  logboek blijft kloppen als een analyse later wordt verwijderd.
- **Eerder verstuurde mails** zijn niet per adres terug te halen: de versie bewaarde alleen het
  aantal. Die staan erin als "Verstuurd aan 1 adres, welke is niet bewaard".
- **Een analyse zonder mail** staat er ook, met de reden: geen volgers, of niet verstuurd (met de
  fout, bijvoorbeeld een ontbrekend Gmail-wachtwoord).

## 19. Analysepagina: de funnel als navigatie (verzoek van de eigenaar, 25 november 2026)

De eigenaar vond de analysepagina niet professioneel genoeg. Er zijn drie opzetten naast elkaar
gelegd (het origineel, opzet A met de funnel links als navigatie en opzet B met eerst het
totaalbeeld). De eigenaar koos **opzet A** en liet hem definitief doorvoeren.

- **Links de funnel, rechts de stap.** De horizontale tabbalk is vervangen door een vaste
  navigatie links, met de samenvatting bovenaan en de verantwoording onderaan. De stappen blijven
  de tabbladen van §14, in dezelfde groepen en volgorde; het formaat van de analyse verandert niet,
  dus oude versies en de skill werken ongewijzigd.
- **De pagina opent op de samenvatting**: conclusie, voortgang tegen doel en budget met de
  verstreken looptijd als streep, een melding per stap met oordeel probleem, wat nu te doen en de
  funnel in één lijst.
- **Wat nu te doen is af te vinken**, gedeeld voor het team, met naam en datum (migratie 0051).
  Keuze van Claude: per versie, omdat een nieuwe versie de acties opnieuw bepaalt.
- **Elke stap dezelfde volgorde**: oordeel en kerncijfers, wat we zien naast wat nu te doen,
  grafieken en tabellen, hoe het gemeten is, vorige en volgende.
- **Niet overgenomen uit opzet A**: de andere indeling van de stappen (Campagnepagina, Conversies,
  Vervolg op de website). Dat vraagt een nieuw formaat en een aanpassing van prompt en skill; de
  bestaande tabbladen dekken dezelfde funnel.

## 20. Benchmarks: hoe goed is goed (verzoek van de eigenaar, 25 november 2026)

De eigenaar wil per blok zien of een resultaat goed, gemiddeld of slecht is, bijvoorbeeld of
organische posts beter of slechter bereik en engagement halen dan soortgelijke posts.

- **Vergelijkingsgroep: eigen historie** (keuze van de eigenaar): dezelfde accounts en
  properties, de 12 maanden vóór de start, zonder de campagne zelf. Geen branchecijfers: die zijn
  niet na te rekenen en wijken per bron sterk af.
- **Weergave: label plus bandbreedte** (keuze van de eigenaar): onder het kerncijfer Beter,
  Gemiddeld of Slechter, de mediaan, het aantal vergeleken items en een dunne balk met de
  middelste helft, de mediaan en het cijfer. Rechts is altijd beter, ook bij kosten.
- **Het oordeel rekent het dashboard**, niet Claude: boven het derde kwart beter, onder het
  eerste slechter. Zo is het label altijd na te rekenen uit de verdeling.
- **Minstens 5 items**, anders geen benchmark. Welke cijfers en groepen per tabblad staat in de
  skill; de standaard-hoofdprompt vraagt de benchmark mee te wegen in het oordeel.
- Oude versies hebben geen benchmark en blijven er hetzelfde uitzien. De volgende analyse van een
  campagne vult ze.

## 21. De stappen van de funnel, formaat 3 (verzoek van de eigenaar, 25 november 2026)

Uit opzet A (§19) is de indeling van de stappen overgenomen, zoals de eigenaar de funnel
beschreef: advertenties op verschillende platforms, organische posts en e-mail sturen verkeer naar
de campagnepagina; daar kijken we wat bezoekers doen, welke conversies ze doen en wat ze daarna
op de website doen; daarna leads en orders in Syntec.

- **Acht stappen in drie groepen**: Media (Advertenties, Organische social, E-mail), Website
  (Campagnepagina, Conversies, Vervolg op de website), Resultaat (Leads in Syntec, Orders in Syntec).
- **Bereik en Investering zijn geen eigen stap meer**: ze horen bij Advertenties (de mediakosten
  zijn daar het eerste kerncijfer; budget en tempo staan ook op de samenvatting). Organisch bereik
  staat bij Organische social.
- **Verkeer en Gedrag zijn samen Campagnepagina**, het belangrijkste punt van de funnel.
- **Conversies** vervangt Lead-events en zegt per soort of hij op de campagnepagina zelf of elders
  op de site viel. Het leadcijfer blijft hetzelfde (sessies die op de campagnepagina begonnen).
- **Vervolg op de website is nieuw**: welke pagina's en paginagroepen bezoekers daarna bekijken,
  welke belangrijke events ze daar doen en hoeveel er meteen weggaan. Keuze van Claude voor het
  hoofdgetal: het aandeel sessies dat na de campagnepagina nog een andere pagina bekijkt.
- **Formaat 3** in de code; versies in formaat 2 houden hun oude tabbladen. Prompt, skill en de
  standaardtekst van de semantic layer zijn bijgewerkt. De opgeslagen semantic layer (versie 4)
  noemt nog de oude namen Lead-events en Investering; de skill vertaalt die.


## 22. Altijd het totaal van leads en orders (verzoek van de eigenaar, 25 november 2026)

Vraag: "Ik wil dat er bij de leads uit Syntec altijd een opsomming is van alle leads, hoeveel vanuit
internet en welke lead types dan uit internet zoals proefrit en offerte etc. Daarnaast wil ik bij de
orders ook altijd een totaal en een uitsplits ordertype zoals rent, zakelijk lease oid etc zodat ik een
goed beeld heb wat deze auto's in totaal hebben gedaan wat betreft leads en orders."

- **Twee views** (migratie 0052): `marketing_analyse_leads_soort` (alle leads met `soort`, `internet`,
  `website`, `kanaalgroep_naam`) en `marketing_analyse_orders_type` (alle orders, ook Handel en verhuur,
  met `ordertype` en `klantorder`). Het ordertype staat ook in TypeScript (`ordertypeVan` in
  `lib/sync/analyseOrders.ts`, getest); houd ze gelijk.
- **Ordertypes**: koop particulier, koop zakelijk, private lease, zakelijke lease, verhuur (Rent), demo,
  handel, overig. Handel op ordersoort, de rest op klantgroep. Keuze van Claude, aan te passen: "Dealer
  Lease" telt als zakelijke lease; Restmarge deal, Centrale Bestelling en Cupra - Euromobi - Koop als
  overig.
- **Stap Leads in Syntec**: altijd eerst de tabel Alle leads (Internet en offline per kanaalgroep) en
  Internet per soort lead, met de websiteleads ernaast. **Stap Orders in Syntec**: altijd eerst het totaal
  van alle orders per ordertype, dan de klantgroepen van de verkoop aan klanten. Verhuur (Rent) altijd
  apart noemen.
- Context, geen doelcijfer: het leadcijfer tegen het doel blijft uit één bron komen (§15).
- **Semantic layer versie 5**: dit overzicht, de stapnamen van formaat 3 (Conversies, Orders in Syntec als
  stap), de modelnaam "A2 e-tron (A1)" in de orders, en de benchmarkgroep van campagnepagina's (alle
  /acties/-pagina's op udenhout.nl met minstens 200 sessies, zonder after sales en service).
- Staat in de standaard-hoofdprompt, de semantic layer (`standaardSemantiek.ts` en versie 5 in de
  database) en de skill.

## 23. Opzet E-mail VDU: wat doet e-mailverkeer op udenhout.nl (verzoek van de eigenaar, 26 november 2026)

Een rapportage voor de e-mailmarketeers: waar e-mailbezoekers landen, of ze blijven en of ze in
dezelfde sessie een aanvraag doen. Opzet `d2f7f48d-…` (formulier `rapportage`, Van den Udenhout,
planning Maandelijks), prompt versie 2.

- **E-mail is één kanaal.** Het e-mailkanaal van GA4 en de Selligent-klikken die door een
  trackingfout als direct binnenkomen (M_BT= in de URL) worden altijd opgeteld. De lezer hoort het
  verschil niet te kennen: geen woord erover in het resultaat, ook niet in de verantwoording, en geen
  actie over tagging. De regels staan alleen in de semantic layer (versie 8).
- **Niet per mailing.** M_BT is een code per ontvanger; alleen het e-mailkanaal heeft een
  campagnenaam. De stap Per mailing is daarom vervallen; de landingspagina laat zien waar een
  mailing naartoe linkt.
- **Drie stappen in drie groepen**: E-mail (E-mailverkeer), Website (Landingspagina's), Resultaat
  (Gebeurtenissen). Een sectie van een rapportage kan daarvoor een `groep` hebben (`Sectie.groep`,
  `tabbladenVoor`, getest).
- **Het grote plaatje en de focusmaand**: elke maand vanaf 1 juni 2025, en de nadruk op de laatste
  volle maand met de maand ervoor ter vergelijking. Bij een geplande ronde is de focusmaand de maand
  uit de planning; de periode van de versie begint altijd op 1 juni 2025.
- **Concrete lead** = autolead of werkplaatsafspraak, altijd ook apart. Over de trackingwissel van
  april 2026 heen telt de analyse op eventnaam (oude namen in semantic layer versie 9), niet op de
  key-eventvlag.
- **Het algemene formulier generate_lead is geen autolead** (semantic layer versie 11): het vuurt op
  /vacatures, /broodjes en /sinterklaasfeest. Unieke sessies met een lead tellen met
  is_conversion_event = true en neq-uitsluitingen (versie 10): een filter met in of of op eventnamen
  telt een sessie met twee lead-events dubbel.
- Eerste analyse (26 november 2026): 1 juni 2025 t/m 25 november 2026, focusmaand oktober.
  Daarna maandelijks op de eerste vrijdag.
- Staat in prompt versie 2, de semantic layer (versie 11, gelijk aan `standaardSemantiek.ts`) en de
  skill (paragraaf E-mail VDU).

## 24. Leads en orders in het overzicht (besluit van de eigenaar, 27 november 2026)
- **De leadkolom heet "Leads en orders"** en toont onder elkaar: de leads in **Google Analytics**
  (altijd, bij elk bedrijf; `kerncijfers.leadsGa4`), de **internetleads in Syntec**
  (`leadsInternet`: Kanaalgroep "Internet", alle kanalen daarbinnen, de soort uit de briefing of
  anders alle soorten) en de **orders in Syntec** (`ordersSyntec`).
- **Syntec alleen bij Van den Udenhout met merk en model.** Ontbreekt merk of model, dan staat er
  een oranje knop "Vul model in voor Syntec-leads en orders" die de briefing opent. Bij een ander
  bedrijf een grijze regel "Geen Syntec-data voor dit bedrijf". Van den Udenhout naast een ander
  bedrijf: de Syntec-regels wel, met "(alleen VDU)"; het leadcijfer tegen het doel blijft dan GA4.
  Rekenwerk: `syntecOverzicht` / `syntecInBriefing` in `rekenen.ts`, getest.
- **Welke orders tellen, zegt de briefing.** Standaard alle klantgroepen van Nieuw én Gebruikt
  (view `marketing_analyse_orders_klant`); de briefing (doel of omschrijving) kan het beperken
  ("alleen koop particulier", "alleen nieuw"), en de LLM bepaalt het. Handel alleen als de
  briefing erom vraagt. De verdeling van alle klantgroepen per ordertype, met aantallen Nieuw en
  Gebruikt, staat in de semantic layer (blok Syntec orders, "Welke orders tellen: de verdeling").
- **Het doel gaat altijd over leads**, nooit over orders. Onder het doel staat uit welke bron het
  meet (GA4, of Syntec met het aantal websiteleads).
- Staat in semantic layer versie 12 (migratie 0056, gelijk aan `standaardSemantiek.ts`), de
  standaard-hoofdprompt, de skill en de hints in de briefing. Analyses van vóór deze datum hebben
  de nieuwe kerncijfers nog niet: de Syntec-regels tonen dan "–" tot de volgende analyse, en
  Google Analytics valt terug op het leadcijfer als dat uit GA4 kwam.

## 25. Dataverantwoording: per bron wat er is meegenomen, met − en + (plan, verzoek van de eigenaar, 28 november 2026)

**Status: gebouwd op 28 november 2026.** De antwoorden van de eigenaar op de open vragen staan in 25.9.

### 25.1 Wat de eigenaar wil
Het laatste onderdeel in de navigatie van een analyse (nu "Verantwoording") wordt **Dataverantwoording**:
in één oogopslag, **per databron**, welke datapunten de analyse aan de campagne heeft toegerekend
(deze advertentiecampagnes, deze social posts, deze landingspagina's, deze events, deze Syntec-filter)
en **hoe er per bron gefilterd is**. Elke rij kan eraf (−); daaronder, onder een streep, de
**twijfelgevallen die niet zijn meegenomen** (mogelijke touchpoints), die er met een + bij kunnen.
Elke klik komt **vanzelf in de Data correctie** te staan, zodat de volgende analyse het toepast.
Geldt voor alle Campagne analyses.

### 25.2 Hoe het eruitziet
```
Dataverantwoording                                        Geldt vanaf de volgende analyse
38 onderdelen meegenomen uit 6 bronnen · 5 twijfelgevallen niet meegenomen · 2 aanpassingen klaar

ADVERTENTIES
  Meta Ads · Van den Udenhout (69324444) · campagnenaam bevat "A2" · 1 sep – 30 nov      4 campagnes
    Campagne  A2 | Leads | Okt                 € 1.240   12 sep – 31 okt                        [−]  ← op hover
    Campagne  A2 | Awareness                   € 860     1 sep – 30 nov    waarschijnlijk
  Google Ads · …                                                                          2 campagnes
ORGANISCHE SOCIAL
  Instagram · @vandenudenhout · tekst bevat "A2" of "Audi A2" · 1 sep – 30 nov             3 posts
    Post      "De nieuwe A2 staat klaar…"      4.120 bereik   3 okt   ↗
WEBSITE (GA4)
  GA4 · udenhout.nl · landing page begint met /acties/audi-a2                              2 pagina's
    Pagina    /acties/audi-a2                  1.830 sessies
    Event     proefrit_aangevraagd             41 events
E-MAIL
  GA4 · utm_medium = email + Selligent M_BT= · naar de campagnepagina                       1 regel
SYNTEC
  Leads · merk Audi, model A2, Kanaalgroep Internet · 1 sep – 22 nov                        1 filter
──────────────────────────────────────────────────────────────────────────────────────────────
MOGELIJKE TOUCHPOINTS, NIET MEEGENOMEN
  Instagram · Post "Audi-weekend bij Van den Udenhout"  3 nov   noemt de A2 tussen 4 modellen      [+]
  Meta Ads  · Campagne "Audi | Voorraad Q4"             € 310   A2 zit in de feed, geen eigen boodschap [+]
  Facebook  · Post (verwijderd via Data correctie)      12 okt                                      [+]
```
- **Per bron een kop** met account(s), de filter in gewone taal, de periode en het aantal. Daaronder
  één rij per datapunt: soort, naam (met link als die er is, nieuw tabblad), het belangrijkste cijfer
  (uitgaven, bereik, sessies, events), datum of looptijd, en de zekerheid **alleen als die niet "zeker"
  is** (rustig houden). De reden staat als grijze tweede regel of in de tooltip.
- **De bronnen in vaste volgorde**, gelijk aan de funnel: Advertenties (Google Ads, Meta Ads, LinkedIn
  Ads), Organische social (Instagram, Facebook, LinkedIn), Website (GA4: campagnepagina's en events),
  E-mail, Syntec (leads, orders). Onbekende bron: "Overig" onderaan.
- **Het minnetje verschijnt op hover** van de rij (en bij toetsenbordfocus), rechts uitgelijnd; geen
  kleurverandering van de rij zelf. Na een klik blijft de rij staan, doorgestreept en gedimd, met
  "Gaat eraf bij de volgende analyse · Ongedaan maken".
- **Onder een streep**: de mogelijke touchpoints die de analyse heeft bekeken maar niet heeft
  meegenomen, met waarom niet, en een **plusje** (altijd zichtbaar, het is de enige actie daar). Na een
  klik: "Komt erbij bij de volgende analyse · Ongedaan maken". Iets wat eerder via de Data correctie is
  verwijderd, staat hier ook (reden "verwijderd via Data correctie"); de + haalt dan de −-regel weg.
- **Bovenaan één regel** met de tellingen en rechts "Geldt vanaf de volgende analyse": een versie
  verandert nooit, dus de cijfers van deze versie blijven zoals ze zijn.
- Daaronder blijft wat er nu staat: Wat er met de Data correctie is gedaan, Kanttekeningen bij de data,
  het veld Data correctie en de Voorstellen voor de semantic layer.
- Navigatie (`StapNavigatie.tsx`): "Dataverantwoording", subregel "Wat is meegenomen, per bron";
  met een klein getal als er aanpassingen klaarstaan.

### 25.3 Naar de Data correctie: vaste regels in hetzelfde veld
Een klik schrijft **direct** (PATCH, zoals de knop Opslaan nu) een regel in het bestaande veld Data
correctie, in een vaste vorm met de sleutel van het datapunt:
```
− Meta Ads · campagne · A2 | Awareness  [meta-ads:campagne:120211234567]
+ Instagram · post · Audi-weekend bij Van den Udenhout  [instagram:post:17890123456789]
```
- **Waarom in hetzelfde veld en geen nieuwe tabel**: de skill leest de Data correctie al, elke versie
  legt hem al vast (`marketing_analyse_bewaar`), de briefing-zijbalk toont hem al, en de geplande
  vrijdagronde neemt hem dus vanzelf mee. Geen migratie nodig.
- Het dashboard herkent zijn eigen regels aan de sleutel tussen `[ ]` (`lib/marketingAnalyse/correctieRegels.ts`:
  lezen, toevoegen, weghalen; getest). Ongedaan maken = die regel weghalen. Vrije tekst eromheen
  blijft gewoon staan en werkt zoals nu.
- In het blok Data correctie staan de −/+-regels als nette lijst boven het tekstveld (met een kruisje
  om er één weg te halen); in het tekstveld zelf alleen de vrije tekst. Bij opslaan voegt het dashboard
  ze weer samen.
- Iedereen mag klikken, net als de Data correctie nu. Bij gelijktijdig bewerken: de PATCH stuurt de
  regel mee (toevoegen of weghalen), niet het hele veld, zodat twee collega's elkaar niet overschrijven.

### 25.4 Wat de analyse moet aanleveren (formaat, optionele velden)
`Herkenning` in `types.ts` krijgt optionele velden; oude versies blijven werken (`normaliseerResultaat`):
```ts
interface Herkenning {
  bron: string;              // vaste namen, lijst HERKENNING_BRONNEN in types.ts
  soort: string;             // campagne | advertentie | post | pagina | event | utm | filter …
  naam: string;
  reden: string;
  zekerheid?: "zeker" | "waarschijnlijk" | "twijfel";
  sleutel?: string;          // stabiel: <bron>:<soort>:<extern id, pad of naam>
  opgenomen?: boolean;       // standaard true; false = mogelijk touchpoint, niet meegenomen
  cijfer?: { label: string; waarde: number; eenheid: Eenheid }; // uitgaven, bereik, sessies …
  datum?: string; tot?: string; // post: datum; campagne: looptijd
  url?: string;
  account?: string;
  viaCorrectie?: "erbij" | "eraf"; // opgenomen of weggelaten door de Data correctie
}
interface BronFilter { bron: string; accounts: string[]; filter: string; periode?: string }
// MaResultaat krijgt: bronFilters?: BronFilter[]
```
- Zonder `sleutel` (oude versies) maakt het dashboard er een van bron + soort + naam, zodat ook daar
  het minnetje werkt. Zonder `bronFilters` toont de kop alleen de bron, met de oude `bronnen` als chips.
- Groeperen en tellen: `groepeerHerkenning` in `rekenen.ts` (getest).
- Geen nieuw formaatnummer (alles optioneel), maar wel **skill, standaard-hoofdprompt en dit plan in
  dezelfde wijziging** (regel uit CLAUDE.md).

### 25.5 Wat de skill anders gaat doen
- **Volledig**: elke advertentiecampagne, elke post, elke pagina, elk event en elke Syntec-filter die
  in een cijfer meetelt, staat als eigen rij in `herkenning`, met `sleutel`, `cijfer` en (waar het kan)
  `url`. Niet samenvatten tot "3 Meta-campagnes".
- **Per bron de filter** in `bronFilters`, in gewone taal ("campagnenaam bevat A2", "landing page begint
  met /acties/audi-a2", "merk Audi, model A2, Kanaalgroep Internet").
- **Twijfelgevallen opschrijven**: wat hij bekeek en níet meenam (posts die het model noemen tussen
  andere, campagnes met een lijkende naam, verwante pagina's, posts net buiten de looptijd) als
  `opgenomen: false` met de reden. Hoogstens ±15, de sterkste kandidaten eerst.
- **De vaste regels in de Data correctie strikt toepassen**: `−` = weglaten uit alle cijfers, `+` =
  meenemen; elk in `correcties` melden, en het datapunt in `herkenning` laten staan met `viaCorrectie`
  (een weggelaten punt als `opgenomen: false`, zodat het met de + terug kan).
- Sleutels stabiel houden tussen versies (extern id van het platform waar dat er is), anders werkt
  "ongedaan maken" en de herkenning van een eerdere −/+ niet.

### 25.6 Rapportages en Maandrapport Jana
Rapportages (VDU/PGZ maand en kwartaal, E-mail VDU, HRM campagne) gebruiken dezelfde pagina en krijgen
de nieuwe weergave vanzelf, met minder rijen. Maandrapport Jana (formaat 4) heeft een eigen weergave
zonder Verantwoording en blijft buiten dit plan.

### 25.7 Bouwvolgorde
1. `types.ts` (velden, `HERKENNING_BRONNEN`), `normaliseerResultaat`, `groepeerHerkenning` + tests.
2. `correctieRegels.ts` + tests; PATCH op `/api/marketing-analyse` met `correctieRegel: { actie, regel }`
   naast het bestaande `dataCorrectie`.
3. `Verantwoording.tsx` herbouwen (bronblokken, hover-min, streep, plus, ongedaan maken, tellingen),
   `DataCorrectie` met de lijst van −/+-regels, `StapNavigatie.tsx` (naam, subregel, getal).
4. Skill (`.claude/skills/marketing-analyse/SKILL.md`): volledige herkenning, `bronFilters`,
   twijfelgevallen, vaste regels toepassen; standaard-hoofdprompt; nieuwe hoofdprompt-versie via een
   migratie als de opgeslagen prompt de verantwoording beschrijft.
5. CLAUDE.md (sectie Marketing analyse) bijwerken; visueel testen op 1400–1920px, licht en donker.
6. Bestaande analyses krijgen de volledige lijst bij hun volgende versie (vrijdagronde of handmatig);
   tot dan tonen ze hun huidige herkenning, mét minnetje.

### 25.8 Risico's
- **Lange lijsten** (veel posts): per bron inklapbaar boven ±8 rijen ("nog 14 posts").
- **Sleutels die verschuiven** tussen versies: dan herkent het dashboard een −-regel niet meer bij de
  nieuwe rij. De regel blijft wel gewoon tekst die de skill toepast; het dashboard toont hem dan als
  losse regel in het blok Data correctie.
- **E-mail is altijd één kanaal** (besluit van de eigenaar): e-mail staat er als herkenningsregel(s),
  niet per mailing — zie 25.9.

### 25.9 Besluiten van de eigenaar (28 november 2026)
1. **E-mail per mailing: ja.** In de Dataverantwoording staat elke mailing als eigen rij (uitzondering op
   "e-mail niet per mailing"; in de stappen blijft e-mail één kanaal). Tot de data uit het mailsysteem er is,
   herkent de analyse een mailing aan de campagnenaam van het e-mailverkeer en de rest per landingspagina met
   de piekdag (GA4 kent geen code per mailing: M_BT is per ontvanger). **De echte mailresultaten komen eraan**
   (verzonden mailings met sends, opens en klikken in de mail); dan wordt elke mailing een rij met die
   cijfers (`cijfers` op `Herkenning` is daar al op gebouwd, de skill beschrijft het).
2. **Een klik geldt vanaf de volgende ronde.** Geen knop "nu opnieuw analyseren"; bovenaan staat de datum
   van de volgende analyse uit de planning (staat de planning uit: de volgende analyse die je start).
3. **Het vrije tekstveld Data correctie blijft**, voor wat nergens in de lijst staat. Geen knop
   "+ Zelf toevoegen" per bron.

### 25.10 Zo gebouwd
- Rekenwerk en de vaste vorm van de regels: `lib/marketingAnalyse/dataverantwoording.ts` (getest).
  Regels heten `Weglaten:` en `Meenemen:` in plaats van − en + (leesbaarder voor mens en analyse).
- Route: PATCH `/api/marketing-analyse?id=…` met `{ correctieRegel: { sleutel, regel } }` (regel null = weg).
- Weergave: `Verantwoording.tsx` (Dataverantwoording en het blok Data correctie), `StapNavigatie.tsx`
  (naam, subregel en het aantal aanpassingen), `AnalyseWeergave.tsx` (planning en telling).
- Formaat: `Herkenning` kreeg `sleutel`, `opgenomen`, `cijfers`, `datum`, `tot`, `url`, `account`,
  `viaCorrectie`; `MaResultaat` kreeg `bronFilters`. Allemaal optioneel, geen nieuw formaatnummer.
- Skill: paragraaf "Dataverantwoording" in `.claude/skills/marketing-analyse/SKILL.md`. De semantic layer
  in de database zegt nog "niet per mailing"; de skill maakt alleen voor `herkenning` een uitzondering.
