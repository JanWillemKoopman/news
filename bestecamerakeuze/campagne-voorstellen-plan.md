# Voorgestelde campagne analyses (plan)

*Versie 3 · 25 november 2026 · status: akkoord van de eigenaar (25 november 2026), fase A en B gebouwd (migratie 0046, skill `campagne-voorstellen`, balk in het overzicht). Besluiten in §11.*

Dit plan bouwt voort op de Marketing analyse (`campagne-analyse-tool.md`). Wat daar besloten is, blijft gelden tenzij hieronder iets anders staat.

## 1. Waar het om gaat

Nu moet iemand zelf weten welke campagnes er lopen en voor elke campagne een briefing invullen. Dat gebeurt niet altijd, waardoor lopende actiecampagnes niet worden geanalyseerd.

De nieuwe functie draait dat om. Een skill zoekt in de Windsor-data van alle bedrijven welke actiecampagnes nu live zijn en vult voor elke campagne alvast een briefing in. Bovenaan het overzicht van Marketing analyse staat een balk **Voorgestelde campagne analyses**. Een gebruiker (bijvoorbeeld Daan) klikt op **Toevoegen**, loopt de ingevulde briefing na en zet de campagne met opslaan op de lijst met analyses. Daarna werkt alles zoals nu.

## 2. Wat telt als voorstel

Een voorstel is een **actiecampagne die nu live is**. Beide voorwaarden moeten kloppen.

**Actiecampagne.** Er wordt geadverteerd naar een **eigen campagnepagina**. Dat is een pagina op de website van het bedrijf die over één actie of één model gaat, bijvoorbeeld `/acties/audi-a2-e-tron` of `/porsche-macan-electric-proefrit`. Geen campagnepagina zijn:

- de homepage;
- algemene overzichten zoals voorraad, occasions, alle modellen, contact, werkplaats afspraak;
- pagina's buiten de eigen websites (bijvoorbeeld een Meta lead form zonder bestemmings-URL of een fabrikantsite).

**Duidelijke actie zonder eigen pagina** (besluit van de eigenaar). Hebben de advertenties wel een duidelijke actie als onderwerp, maar leiden ze naar een lead form, de homepage of een algemene pagina, dan komt er toch een voorstel, met zekerheid **twijfel** en de reden erbij ("geen eigen campagnepagina, advertenties leiden naar een Meta lead form"). Altijd-aan campagnes zonder actie (branding, vacatures, algemene voorraad- of servicecampagnes) worden geen voorstel.

Of een pagina een campagnepagina is, beoordeelt de skill zelf (oordeel van het taalmodel), met de advertenties als uitgangspunt. Er komen geen vaste URL-patronen in de code. De eigenaar kan het oordeel bijsturen met aanvullingen in het blok **Algemeen** van de semantic layer (zie §6).

**Live.** In de laatste **7 dagen** (t/m gisteren) is er op minstens één advertentieplatform (Google Ads, Meta Ads, LinkedIn Ads) geld uitgegeven aan advertenties die naar die campagnepagina leiden.

**Eén voorstel per campagnepagina per bedrijf.** Leiden een Google Ads-campagne, een Meta-campagne en een LinkedIn-campagne naar dezelfde pagina, dan is dat één voorstel met drie platformcampagnes eronder. Zo sluit het aan op hoe de analyse zelf werkt (de pagina is het hart van de funnel). Zonder eigen pagina is het één voorstel per campagneonderwerp per bedrijf. Loopt dezelfde actie bij twee bedrijven, dan krijgt elk bedrijf een eigen voorstel met eigen accounts en pagina (besluit van de eigenaar).

## 3. Hoe de skill zoekt (nieuwe skill `campagne-voorstellen`)

Een aparte skill, zodat de analyse-skill niet groter en trager wordt. Hij volgt dezelfde bronnenregel als de analyse: **alleen Windsor live** en de tabellen van de tool zelf.

De advertenties zijn het vertrekpunt. De skill werkt als een marketeer die het advertentieaccount openklapt en zich afvraagt welke acties er nu lopen. Per bedrijf uit de semantic layer (blok Algemeen):

1. **Advertenties ophalen.** Voor Google Ads, Meta Ads en LinkedIn Ads: per advertentie de campagnenaam, advertentiegroep of set, advertentienaam, advertentietekst en kop waar Windsor die levert, de bestemmings-URL, url_tags, uitgaven, vertoningen en klikken per dag. Periode: de laatste 90 dagen, zodat ook de startdatum te vinden is.
2. **Live toetsen.** Alleen advertenties met uitgaven in de laatste 7 dagen gaan door.
3. **Onderwerpen herkennen.** De skill leest campagnenamen, advertentieteksten en bestemmings-URL's en groepeert de advertenties per **campagneonderwerp** (bijvoorbeeld "Audi A2 e-tron introductie" of "Porsche winterbanden actie"). Eén onderwerp kan over meerdere platforms en campagnes lopen.
4. **Campagnepagina zoeken.** Per onderwerp onderzoekt de skill naar welke pagina de advertenties leiden (URL's genormaliseerd: UTM- en klik-parameters eraf). Leiden ze naar een algemene pagina of ontbreekt de URL (Performance Max, Demand Gen, lead forms), dan zoekt hij in GA4 naar een landingspagina die bij het onderwerp past en in dezelfde periode betaald verkeer van dat platform kreeg. Hij beoordeelt of het een echte campagnepagina is volgens §2 en de aanvullingen van de eigenaar in het blok Algemeen. Geen campagnepagina maar wel een duidelijke actie betekent een voorstel met zekerheid twijfel (§2).
5. **GA4 erbij.** Per campagnepagina de sessies als landingspagina in de laatste 14 dagen, per kanaalgroep, en de lead-events in die sessies (zoals de semantic layer ze noemt). Dit bevestigt dat de pagina verkeer krijgt en helpt bij het doel.
6. **Social media op hetzelfde onderwerp.** De skill zoekt organische posts van het bedrijf (Facebook, Instagram, LinkedIn) over hetzelfde onderwerp, ook als ze niet naar de pagina linken, en betaalde social naast search. Dat komt in de omschrijving en het bewijs, zodat de analyse weet welke kanalen meedoen.
7. **Vergelijken met wat er al is** (zie §5) en het voorstel wegschrijven of bijwerken.

Draaien gebeurt op verzoek in Claude Code (besluit van de eigenaar): "zoek nieuwe campagnes" of "werk de voorgestelde analyses bij". Er komt geen knop in het dashboard. Inplannen kan pas als een geplande taak de connectors Windsor.ai en Supabase meekrijgt (zie de gepauzeerde taak Marketing analyse vrijdagronde).

## 4. De briefing die de skill invult

| Veld | Hoe de skill het invult | Zekerheid |
|---|---|---|
| Naam | Uit de campagnepagina en de campagnenamen, bijvoorbeeld "Audi A2 e-tron proefritactie". | Voorstel, aan te passen |
| Bedrijven | Het bedrijf waar de advertentieaccounts en het domein bij horen. | Zeker |
| Opzet | Altijd Campagne analyse. | Zeker |
| Merk en modellen | Uit URL, paginatitel en advertentietekst. Leeg als het niet duidelijk is. | Waarschijnlijk |
| Startdatum | De eerste dag met uitgaven naar de pagina binnen de laatste 90 dagen. Ligt die op dag 90, dan staat er een kanttekening dat de campagne mogelijk eerder begon. | Waarschijnlijk |
| Einddatum | De einddatum van de platformcampagne als het platform die levert. Anders leeg (de analyse rekent dan t/m gisteren). | Wisselend |
| Budget | Het looptijdbudget van de platformcampagnes als dat er is. Bij een dagbudget geen schatting maar leeg, met het dagbudget in de omschrijving. | Wisselend |
| Doel | Een voorstel op basis van het campagnedoel op het platform (leads, verkeer, bereik) en de lead-events op de pagina, bijvoorbeeld "Proefritaanvragen via de actiepagina". Altijd met de opmerking dat het team het doel moet nalopen. | Voorstel |
| Omschrijving | Kort wat er is gevonden: kanalen, platformcampagnes, campagnepagina, uitgaven tot nu toe. | Zeker |
| Campagnepagina('s) | De gevonden URL('s). Nieuw veld, zie §5. | Zeker |

Bij elk voorstel bewaart de skill ook het **bewijs**: per platform de campagnenamen en id's, uitgaven tot nu toe, laatste dag met uitgaven, sessies uit GA4 en de zekerheid. Het dashboard toont dat in de balk. Na toevoegen gaat het bewijs mee naar de campagne, zodat de eerste analyse sneller weet welke data erbij hoort.

## 5. Gegevens (migratie 0046)

**Nieuwe tabel `dataloket.marketing_analyse_voorstellen`**

| Kolom | Inhoud |
|---|---|
| id | uuid |
| sleutel | Uniek per bedrijf en genormaliseerde campagnepagina (zonder pagina: bedrijf en een korte naam van het onderwerp), zodat een volgende zoekronde hetzelfde voorstel bijwerkt in plaats van dubbel aanmaakt |
| status | `open`, `toegevoegd`, `genegeerd` of `verlopen` |
| naam, bedrijven, merk, modellen, startdatum, einddatum, budget, doel, omschrijving | De voorgestelde briefing |
| campagnepaginas | text[] |
| bewijs | jsonb (§4) |
| zekerheid | `zeker`, `waarschijnlijk` of `twijfel` |
| uitgaven_tot_nu, laatste_uitgave_op | Voor de balk |
| gevonden_op, laatst_gezien_op | Wanneer de skill hem voor het eerst en voor het laatst zag |
| campagne_id | De campagne die eruit is gemaakt (na Toevoegen) |
| afgehandeld_door, afgehandeld_op | Wie toevoegde of negeerde |

**Nieuwe kolommen op `marketing_analyse_campagnes`**

- `campagnepaginas text[]`: de campagnepagina's van de campagne. Ook in de briefing te zien en aan te passen. Hiermee herkent de zoekronde of een campagne al op de lijst staat.
- `voorstel_id uuid`: uit welk voorstel de campagne kwam.
- `herkenning jsonb`: het bewijs uit het voorstel, voor de eerste analyse.

**Functies**

- `marketing_analyse_voorstel_bewaar(…)` (alleen Claude Code): voorstel toevoegen of bijwerken op `sleutel`. Bijwerken raakt een voorstel met status `toegevoegd` of `genegeerd` niet aan, behalve `laatst_gezien_op`. Zo komt een genegeerd voorstel niet steeds terug.
- `marketing_analyse_voorstel_toevoegen(id, briefing)` (dashboard): maakt in één transactie de campagne aan met de nagelopen briefing, zet `analyse_ronde` aan en het voorstel op `toegevoegd`. Twee mensen die tegelijk opslaan leveren één campagne op.
- Aan het eind van een zoekronde zet de skill open voorstellen die niet meer live zijn op `verlopen`.

**Ontdubbelen.** Geen voorstel als er al een campagne is van hetzelfde bedrijf met dezelfde campagnepagina. Voor bestaande campagnes zonder campagnepagina vergelijkt de skill op naam, merk, model en looptijd en markeert hij twijfel ("lijkt op de bestaande campagne X") in plaats van stil over te slaan.

**Rechten (RLS).** Iedereen die ingelogd is mag voorstellen lezen, toevoegen en negeren. Schrijven van nieuwe voorstellen alleen via de functie.

## 6. Semantic layer

Geen nieuw blok. In het bestaande blok **Algemeen** komt een kopje **Campagnevoorstellen** dat de eigenaar zelf aanvult. Daar kan bijvoorbeeld in staan:

- de domeinen per bedrijf (als die nog niet bij de accounts staan);
- wat bij een bedrijf wel of niet als campagnepagina telt ("bij PGZ zijn de pagina's onder /acties altijd campagnepagina's", "de werkplaatsplanner is nooit een campagne");
- terugkerende campagnes die geen voorstel hoeven (bijvoorbeeld altijd-aan branding of vacatures);
- hoe campagnenamen bij een bureau zijn opgebouwd, zodat de skill ze beter leest.

De skill leest dit blok als leidraad naast zijn eigen oordeel. Hij doet in zijn terugmelding voorstellen voor aanvullingen als hij iets tegenkomt dat voor de volgende ronde handig is, maar past het blok nooit zelf aan. De standaardtekst in `standaardSemantiek.ts` krijgt een leeg kopje met een korte uitleg.

## 7. Het dashboard

**Balk Voorgestelde campagne analyses**, bovenaan het overzicht van Marketing analyse, boven de lopende campagnes. Alleen zichtbaar als er open voorstellen zijn.

- Kop met het aantal ("Voorgestelde campagne analyses (4)") en wanneer er voor het laatst is gezocht. Inklapbaar, standaard open.
- Per voorstel één regel in dezelfde rustige stijl als de campagnetabel: merklogo en naam, bedrijf, campagnepagina (link), kanalen als kleine iconen, live sinds, uitgegeven tot nu, zekerheid als subtiel label bij twijfel.
- Rechts per regel: **Toevoegen** (primair maar klein) en **Negeren**.
- Een klik op de regel klapt het bewijs uit: platformcampagnes met uitgaven, sessies uit GA4, social posts en de kanttekeningen.

**Toevoegen** opent altijd eerst de bestaande briefing-zijbalk, al ingevuld met het voorstel (besluit van de eigenaar). De gebruiker loopt de briefing na, past aan wat nodig is en slaat op. Pas dan wordt de campagne aangemaakt, met opzet Campagne analyse en het vinkje **Analyse ronde aan**. De regel verdwijnt uit de balk en de campagne staat bij de lopende campagnes. Sluit de gebruiker de zijbalk zonder opslaan, dan blijft het voorstel open staan.

**Genegeerde voorstellen** zijn terug te halen via een klein linkje "Genegeerd (n)" onderaan de balk.

**API.** `GET /api/marketing-analyse` geeft ook de open voorstellen terug. Nieuw: `POST /api/marketing-analyse/voorstellen?id=…` met `{ actie: "toevoegen" | "negeren" | "terugzetten" }`, en toevoegen met aangepaste briefing via de bestaande validatie (`leesCampagneInvoer`).

## 8. Wat er verandert aan wat er al is

- Briefing-zijbalk krijgt het veld **Campagnepagina('s)**.
- De skill `marketing-analyse` leest `campagnepaginas` en `herkenning` als startpunt voor de herkenning. Hij blijft zelf grondig controleren welke data erbij hoort.
- Het blok Algemeen van de semantic layer krijgt het kopje Campagnevoorstellen (standaardtekst in `standaardSemantiek.ts`).
- `campagne-analyse-tool.md` krijgt een verwijzing naar dit plan en de besluiten.

## 9. Fasering

1. **Fase A: data en skill.** Migratie 0046, de skill `campagne-voorstellen`, het kopje Campagnevoorstellen in het blok Algemeen. Eerste zoekronde handmatig, resultaat samen met de eigenaar nalopen op valse treffers en gemiste campagnes.
2. **Fase B: dashboard.** De balk, Toevoegen (via de ingevulde briefing), Negeren, het veld Campagnepagina('s) in de briefing.
3. **Fase C: automatisch.** Zoekronde inplannen (bijvoorbeeld maandag en donderdag) zodra een geplande taak de connectors meekrijgt. Eventueel daarna de analyseronde op vrijdag.

## 10. Risico's

- **Valse treffers.** Een algemene pagina die toch als actie wordt gezien. Opgevangen door de aanvullingen in het blok Algemeen, het label twijfel en de knop Negeren.
- **Volle balk door twijfelgevallen.** Acties zonder eigen pagina komen er met twijfel in. Valt dat tegen, dan kan de eigenaar in het blok Algemeen aanvullen welke soorten hij niet wil zien, of kunnen we twijfelgevallen standaard inklappen.
- **Onderwerp zonder pagina blijft niet stabiel.** Zonder URL is de sleutel een naam die de skill kiest. Leest hij een onderwerp de volgende keer anders, dan ontstaat een dubbel voorstel. De skill vergelijkt daarom eerst met de open en genegeerde voorstellen van dat bedrijf.
- **Onvolledige bestemmings-URL's in Windsor.** Vooral bij Performance Max en Demand Gen kan de URL ontbreken of algemeen zijn. Dan valt de skill terug op GA4 (landingspagina's met veel betaald verkeer van dat platform) en zet hij zekerheid op waarschijnlijk.
- **Looptijd.** Alle bedrijven, drie platforms en 90 dagen per advertentie is een flinke hoeveelheid Windsor-data. Verwacht 10 tot 20 minuten per zoekronde.
- **Budget en einddatum** zijn vaak niet te vinden. De briefing laat ze dan leeg in plaats van te gokken.

## 11. Besluiten

| # | Onderwerp | Besluit (25 november 2026) |
|---|---|---|
| 1 | Wanneer live | Uitgaven naar de campagnepagina in de laatste **7 dagen** (t/m gisteren) op Google Ads, Meta Ads of LinkedIn Ads. |
| 2 | Toevoegen | Opent **altijd eerst de ingevulde briefing**. Opslaan voegt toe. |
| 3 | Analyse ronde | Een toegevoegde campagne krijgt het vinkje **Analyse ronde aan**. |
| 4 | Herkenning | **Oordeel van het taalmodel**, met de advertenties als uitgangspunt: eerst de advertenties, dan onderzoeken welke campagnepagina erbij hoort, dan welke social posts er over hetzelfde onderwerp zijn. Bij te sturen via het blok **Algemeen** van de semantic layer, geen vaste patronen en geen apart blok. |

| 5 | Actie zonder eigen pagina | Wel een **voorstel met zekerheid twijfel** en de reden. |
| 6 | Meerdere bedrijven | **Eén voorstel per bedrijf.** |
| 7 | Ritme | **Op verzoek in de chat.** Inplannen pas als een geplande taak Windsor en Supabase mag gebruiken. Geen knop in het dashboard. |
| 8 | Rechten | **Iedereen die ingelogd is** mag toevoegen, negeren en terugzetten. |

## 12. Open vragen

Geen. Fase C (inplannen) wacht tot een geplande taak Windsor en Supabase mag gebruiken.
