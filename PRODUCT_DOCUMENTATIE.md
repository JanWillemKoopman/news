# Ons Trouwplan — Productdocumentatie (functioneel)

> Dit document beschrijft **wat de applicatie voor de eindgebruiker doet**: alle
> functionaliteiten, modules en gebruikersstromen. Het is bewust een feitelijke,
> volledige inventarisatie van de tool zelf — zonder positionering, marketing of
> commerciële afwegingen. Bedoeld als basis voor investeerders en marketeers om
> het product door en door te begrijpen.

---

## 1. Productoverzicht

**Ons Trouwplan** is een webapplicatie waarmee een bruidspaar de volledige
organisatie van hun bruiloft op één plek beheert. In plaats van losse
spreadsheets, documenten en chatgroepen werken beide partners (en eventuele
helpers) samen in één gedeelde, real-time omgeving.

De app is opgebouwd als een **Progressive Web App (PWA)**: hij draait in elke
browser, is geoptimaliseerd voor zowel desktop als mobiel, en kan als
zelfstandige app op het startscherm worden geïnstalleerd (eigen icoon,
standalone-venster, eigen splash). De interface is volledig Nederlandstalig.

De applicatie bestaat functioneel uit drie lagen die in elkaar grijpen:

1. **Planningsmodules** — de werkruimte van het bruidspaar: dashboard, taken,
   budget, leveranciers, gasten, tafelschikking, draaiboek, trouwwebsite,
   cadeaulijst en fotomuur.
2. **AI-begeleidingslaag** — een doorlopende, persoonlijke trouwplanner die
   meekijkt met álle data en het paar proactief stap voor stap stuurt (advies,
   scores, suggesties, automatische import en rangschikking).
3. **Leveranciersdirectory** — een gedeelde catalogus van circa **5.000
   trouwlocaties** en circa **5.000 overige leveranciers** (trouwjurkwinkels,
   juweliers, dj's, fotografen, catering, bloemisten, vervoer, taart, enz.) die
   slim op het profiel van het paar wordt gematcht.

Alles draait onder het concept **"één bruiloft"**: elke gebruiker kan lid zijn
van een of meer bruiloften, en alle data (gasten, taken, budget, enz.) hangt aan
die ene bruiloft, zodat meerdere mensen er gezamenlijk aan werken.

---

## 2. Doelgroep en kernprincipes

- **Primaire gebruiker:** een bruidspaar (twee partners) dat zelf zijn bruiloft
  organiseert.
- **Secundaire gebruikers:** helpers die het paar uitnodigt — ceremoniemeester,
  getuigen, familie — met fijnmazig instelbare rechten.
- **Publieke gebruikers (zonder account):** genodigden die een trouwwebsite
  bezoeken, hun RSVP doorgeven, de cadeaulijst bekijken/reserveren, en foto's
  uploaden naar de fotomuur.

Functionele kernprincipes die in de hele app terugkomen:

- **Samen plannen by design** — gedeelde data, rollen, rechten, een
  activiteitenfeed en opmerkingen op taken.
- **Begeleiding boven leegheid** — overal waar een module nog leeg is, biedt de
  app templates, eerste-stappen en AI-suggesties zodat het paar nooit voor een
  leeg scherm staat.
- **Tijdbewust** — vrijwel alle logica weegt de resterende tijd tot de trouwdag
  mee (fasen van "12 maanden voor" tot "trouwweek" en "na de bruiloft").
- **Deterministisch waar het kan, AI waar het meerwaarde geeft** — snelle,
  voorspelbare rekenregels voor scores/matching, aangevuld met AI voor advies in
  mensentaal en creatieve taken.

---

## 3. Account, toegang en onboarding

### 3.1 Registratie en inloggen
- **Account aanmaken** (`/aanmelden`) met e-mail en wachtwoord. Wachtwoordvelden
  hebben overal een zichtbaarheids-toggle.
- **Inloggen** (`/inloggen`).
- **Wachtwoord vergeten / resetten** via e-mail met resetlink
  (`/wachtwoord-vergeten`, `/wachtwoord-resetten`).
- **E-mailbevestiging** van het account (`/bevestig-email`).
- Een uitnodigingslink (`/uitnodiging/[token]`) kan een nieuw account direct aan
  een bestaande bruiloft koppelen.

### 3.2 Een bruiloft aanmaken of kiezen
- Bij eerste gebruik maakt het paar een **bruiloft** aan: namen van beide
  partners, trouwdatum, locatie, woonplaats/provincie, geschat budget en geschat
  aantal dag- en avondgasten, ceremonietype (gemeentelijk, religieus,
  symbolisch).
- Een gebruiker die bij meerdere bruiloften hoort, kan **wisselen** via een
  weddingpicker.
- Kerngegevens zijn later altijd aanpasbaar via een instellingenformulier
  (o.a. vanuit het dashboard).

### 3.3 Begeleide start (onboarding)
- **Welkomstdialoog** bij de allereerste keer.
- **Startgids**: een zes-stappen checklist die **automatisch afvinkt** op basis
  van echte data (datum ingesteld, eerste taken, gasten toegevoegd, leverancier
  toegevoegd, budget begroot, website gestart). De gids is wegklikbaar en
  verdwijnt vanzelf zodra alles staat.
- **Eerste-keer-hints** en contextuele uitleg (een info-knop met FAQ-inhoud
  bovenaan elke module).
- **Profiel-nudge**: zachte aansporing om het profiel/de kerngegevens compleet
  te maken, omdat daar alle personalisatie en AI op draait.

### 3.4 Accountbeheer (`/bruiloft/account`)
- Profielnaam, e-mailadres en **profielfoto** (avatar-upload) beheren.
- **Wachtwoord wijzigen**.
- **E-mailherinneringen aan/uit** (opt-in voor de herinneringsmails).
- **Account verwijderen**.

---

## 4. Navigatie en app-structuur

De app is opgedeeld in vijf hoofdsecties, elk met onderliggende pagina's:

| Sectie | Pagina's |
|---|---|
| **Thuis** | Overzicht (dashboard), AI-assistent |
| **Plannen** | Taken, Budget, Draaiboek |
| **Leveranciers** | Mijn leveranciers, Ontdekken (directory) |
| **Gasten** | Gastenlijst, Tafelschikking |
| **Trouwpagina** | Trouwwebsite, Cadeaulijst, Fotomuur |
| *(los)* | Samen plannen (leden), Activiteit, Account |

- **Desktop:** donkere horizontale topbalk met de hoofdsecties + linker
  zijbalk met de sub-navigatie van de actieve sectie.
- **Mobiel:** vaste onderbalk met de primaire items (Overzicht, Taken, Gasten,
  Budget) en een **"Meer"-sheet** voor de rest; pull-to-refresh.
- De navigatie wordt **gefilterd op rechten**: een gebruiker ziet alleen de
  modules waar hij toegang toe heeft.

---

## 5. Dashboard (Overzicht) — `/bruiloft`

Het dashboard is het startpunt en vat de stand van zaken samen:

- **Aftelteller (hero)**: namen van het paar, de fase ("9 maanden voor de
  bruiloft"), het aantal dagen tot de trouwdag ("nog 142 dagen", "Vandaag is de
  dag!", "Gefeliciteerd met jullie huwelijk"), datum en locatie. Direct
  bewerkbaar.
- **Samen plannen-blok**: nodigt de partner uit zolang die nog geen account
  heeft; verbergt zichzelf zodra de partner meeplant.
- **Statusbevestiging**: korte samenvatting van waar het paar nu staat.
- **Onboarding-gids** en **welkomstdialoog** (zie §3.3).
- **Actieblok**: toont **AI-advies "om nu te doen"** als dat beschikbaar is, en
  valt anders terug op een deterministisch berekende lijst **urgente
  aandachtspunten** (verlopen deadlines, betalingen, nog te boeken leveranciers).
- **Aankomende acties (tijdlijn)**: taken én betaaltermijnen gecombineerd en
  gesorteerd op datum.
- **Status in één oogopslag**: een raster met Budget · Gasten · Taken ·
  Leveranciers, elk met voortgang.
- **Aanbevolen leveranciers**: gepersonaliseerde suggesties uit de directory.

---

## 6. De AI-laag (doorlopend door de hele app)

AI is geen losse module maar een **laag die overal terugkomt**. De app gebruikt
een groot taalmodel (Google Gemini) met een vaste persona: *"een professionele,
empathische maar daadkrachtige Nederlandse trouwplanner met 15 jaar ervaring"*,
die in warme maar concrete mensentaal stuurt tot actie.

De AI baseert zich op een **volledige contextopbouw** van de bruiloft: profiel,
budget (totaal/geschat/geoffreerd/betaald/per categorie/ontbrekende
categorieën), taken (open/klaar/achterstallig/urgent), leveranciersstatus,
gasten (RSVP-verdeling), draaiboek, websitestatus, aankomende betalingen, en het
beschikbare leveranciersaanbod. Daarbij worden **gecureerde Nederlandse
benchmarks** meegegeven (zie §6.4) zodat de AI nooit eigen cijfers verzint.

### 6.1 AI-assistent / Wedding planner — `/bruiloft/ai-wedding-planner`
De centrale AI-pagina. Tijdens analyse loopt een stapsgewijze laadanimatie
("Taken analyseren…", "Budget doorrekenen…", "Leveranciers beoordelen…", enz.).
Het resultaat is een **geconsolideerd planningsoverzicht**:
- **Globale status**: een samenvatting in 3–4 zinnen, een statuslabel
  (op schema / actie vereist / kritiek) en een **planningsscore van 0–100** die
  de resterende tijd meeweegt.
- **Status per module** (taken, budget, leveranciers, draaiboek, gasten,
  website): elk met een eigen statuslabel (op schema / actie vereist / kritiek /
  niet gestart), een korte duiding en **2–4 concrete acties** met directe links
  naar de juiste pagina.

### 6.2 AI-coach (app-breed paneel)
Via de "AI-assistent"-knop in de chrome opent een zijpaneel (desktop) of bottom
sheet (mobiel) met alle actuele, geprioriteerde adviezen — onderverdeeld in
**acties** (nu doen), **benchmarks** (vergelijking met andere koppels) en
**tips** (proactieve inzichten), elk met urgentielabel (dringend / binnenkort /
plannen) en een link naar de relevante module. Adviezen zijn individueel **weg
te klikken** en krijgen een **duim omhoog/omlaag**-waardering. Er is een
"moment-nudge" die na het afronden van een taak subtiel een vervolgsuggestie
aanbiedt.

### 6.3 AI per module
Naast het overkoepelende advies heeft vrijwel elke module een eigen AI-functie:
- **Budgetanalyse** — samenvatting, aandachtspunten per categorie
  (waarschuwing/tip/positief) en algemene raad.
- **Takensuggesties** — voorgestelde taken met fase, prioriteit, toewijzing,
  deadline en onderbouwing; plus detectie van **ontbrekende standaardtaken**.
- **Draaiboeksuggesties** — een compleet voorgesteld trouwdag-draaiboek met
  tijden, titels, locaties en betrokken rollen.
- **Gasten-import** — leest geüploade bestanden multimodaal uit (zie §10.2).
- **Leveranciers-rangschikking** — een hybride aanpak: de snelle rekenregel
  maakt een voorselectie, waarna de AI de beste opties herrangschikt op sfeer en
  stijl die een formule niet kan wegen.

### 6.4 Onderliggende AI-mechaniek (functioneel relevant)
- **Personalisatie op ervaringsniveau**: de toon en diepgang passen zich aan
  ("nieuw" = meer uitleg, "ervaren" = beknopt, focus op optimalisatie), afgeleid
  uit profielleeftijd en activiteit.
- **Slimme caching & verversing**: adviezen worden gecachet en pas opnieuw
  gegenereerd als de onderliggende data wezenlijk verandert of een onderwerp van
  urgentiefase wisselt. De verversfrequentie schaalt mee met de urgentie (ver
  weg ≈ maandelijks, laatste maand dagelijks). Er is een handmatige
  "Verversen"-knop met een limiet.
- **Benchmarks**: gecureerde feiten over hoe Nederlandse koppels plannen
  (budget, locatie, fotograaf, dj/band, kleding, uitnodigingen, gemeente, RSVP,
  draaiboek) vormen de feitelijke basis onder benchmark-adviezen.
- **Schrijfregels**: kalme, opbouwende toon; nooit interne veld- of statusnamen
  in de tekst; een grotendeels lege planning met nog veel tijd wordt als gezonde
  startpositie behandeld, niet als alarm.
- **Feedback-loop**: duim-waarderingen worden opgeslagen om te meten welk advies
  nuttig is.

---

## 7. Taken — `/bruiloft/taken`

De takenmodule is de centrale to-dolijst, georganiseerd langs de tijdlijn naar
de trouwdag.

- **Tijdsblokken** als ruggengraat: *12 / 9 / 6 / 3 / 1 maand voor*, *laatste
  week*, *trouwweek*, *na de bruiloft* — automatisch afgeleid van de deadline en
  de trouwdatum.
- **Taakeigenschappen**: titel, omschrijving, deadline, status (open / bezig /
  klaar), prioriteit (laag / midden / hoog), toewijzing aan leden, en koppeling
  aan een leverancier en/of budgetpost.
- **Subtaken** (één niveau diep) met eigen afvinken.
- **Toewijzing aan leden** via een assignee-picker met avatars (AvatarStack);
  meerdere personen per taak mogelijk.
- **Opmerkingen** per taak (commentsthread) voor overleg tussen planners.
- **Weergaven**: lijstweergave en kalenderweergave; een "Deze maand"-sectie.
- **Snel toevoegen** (quick add) en een **date roller** voor snelle deadlines.
- **Filters** (status, prioriteit, toewijzing, tijdsblok) en een
  **statistiekenstrip** (totaal/open/klaar/achterstand).
- **Bulkacties**: meerdere taken tegelijk wijzigen of verwijderen.
- **Achterstandsbanner** als deadlines verstreken zijn.
- **Templates & samenstellen**:
  - Een bibliotheek van ~80 standaard trouwtaken.
  - **Kaart-voor-kaart samenstellen**: het paar loopt voorgestelde taken één
    voor één langs en kiest "toevoegen" of "overslaan"; deze keuzes worden
    gedeeld opgeslagen zodat beide partners elkaars beslissingen zien.
  - **Ontbrekende taken** worden gedetecteerd en in bulk toe te voegen.
- **AI-takensuggesties** (zie §6.3), inline en via een modal.

---

## 8. Budget — `/bruiloft/budget`

Volledige financiële planning van de bruiloft.

- **Budgetposten** per categorie: locatie, catering, kleding, fotografie en
  video, muziek, bloemen en decoratie, vervoer, taart, uitnodigingen en
  drukwerk, ringen, overig.
- Per post: **geschat bedrag, geoffreerd bedrag, betaald bedrag**, omschrijving
  en koppeling aan een leverancier.
- **Betaaltermijnen** per post: deelbedragen met vervaldatum en betaald-status —
  deze voeden de aankomende-betalingen-tijdlijn en de herinneringsmails.
- **Budgetsamenvatting**: totaalbudget, geschat, geoffreerd, betaald en
  resterend.
- **Automatische verdeling** (distribute-modal): verdeelt het totaalbudget over
  categorieën volgens een standaard verdeelsleutel, geschaald op het aantal
  (bevestigde dag)gasten.
- **Afwijkingsdetectie**: signaleert waar offertes/uitgaven boven de begroting
  uitkomen.
- **AI-budgetadvies** (zie §6.3).
- **Export naar CSV**.

---

## 9. Leveranciers

Twee samenhangende onderdelen: het eigen leveranciersdossier en de grote
ontdek-directory.

### 9.1 Mijn leveranciers — `/bruiloft/leveranciers`
Het persoonlijke dossier van het paar.
- **Leverancier-eigenschappen**: naam, type/categorie, status, contactpersoon,
  telefoon, e-mail, website, geoffreerd bedrag, notitie, koppeling aan een
  budgetpost; herkomst uit de directory wordt onthouden.
- **Status-pijplijn**: te bezoeken → bezocht → offerte aangevraagd → geboekt →
  afgewezen.
- **Categorieën**: locatie, catering, fotograaf, videograaf, dj of band,
  bloemist, kleding, vervoer, taart — plus vrije eigen categorieën.
- **Weergaven**: kaart- en tabelweergave; sorteren op naam/status/bedrag;
  filteren op type en status; zoeken.
- **Categorievoortgang**: toont per soort of er al iets geboekt is.
- **AI-inzicht** bovenaan de pagina.

### 9.2 Ontdekken (leveranciersdirectory) — `/bruiloft/ontdekken`
Doorzoekbare catalogus van ~5.000 trouwlocaties en ~5.000 overige leveranciers.
- **Leveranciergegevens** uit de directory: naam, (sub)type, korte omschrijving,
  adres/plaats/provincie, coördinaten, capaciteit (min/max), buiten trouwen
  mogelijk, overnachting mogelijk, prijsindicatie (vanaf/tot of "op aanvraag"),
  website/e-mail/telefoon, afbeelding en tags.
- **Filters**: categorie, plaats, provincie, prijsrange, "buiten trouwen",
  "overnachting mogelijk".
- **Volledige tekstzoekfunctie** (Nederlandstalig).
- **Sortering**: op naam, op prijs, of op **"beste match"**.
- **Profiel-bewuste matching** (zie §9.3) met **match-badges** zoals "binnen
  budget", "in jullie plaats", "in jullie regio", "past bij gezelschap", "boek
  dit binnenkort", en een korte uitleg in mensentaal *waarom* het past.
- **Detailweergave** per leverancier in een modal.
- **"Toevoegen aan mijn leveranciers"** met één klik — neemt de leverancier over
  in het eigen dossier.
- **Paginering** (24 per pagina).

### 9.3 Hoe de matching werkt (functioneel)
De rangschikking is een snelle, deterministische rekenregel die meerdere
deelscores gewogen combineert:
- **Budget** (35%): vergelijkt de vanaf-prijs met het richtbudget voor die
  categorie — bij voorkeur het door het paar zélf begrote bedrag, anders een
  standaardpercentage van het totaalbudget.
- **Locatie** (30%): zelfde woonplaats > zelfde provincie > overig.
- **Behoefte/gat** (20%): categorieën waar nog niets geboekt is krijgen
  voorrang; ligt de trouwdatum binnen het ideale boekvenster van die soort
  leverancier, dan weegt dat extra ("boek dit binnenkort").
- **Capaciteit** (15%, alleen locaties): past het gastenaantal binnen de zaal.

Voor de kleine dashboard-set wordt deze voorselectie aanvullend door de AI
herrangschikt op stijl/sfeer (tags + contexttekst), met een veilige terugval op
de rekenregel.

---

## 10. Gasten — `/bruiloft/gasten`

Volledig gastenbeheer met RSVP.

### 10.1 Gastenlijst
- **Gastgegevens**: voornaam, achternaam, categorie (familie partner 1 / familie
  partner 2 / vrienden / collega's / overig), gasttype (daggast / avondgast),
  RSVP-status (uitgenodigd / bevestigd / afgemeld / geen reactie), dieetwensen,
  partner (ja/nee + naam), aantal kinderen, adres, notitie en
  tafel/stoel-koppeling.
- **Inline RSVP-wijziging**: status direct in de lijst aanpassen via een
  badge-achtige dropdown.
- **Filters** (categorie, RSVP-status, gasttype) en een **statistiekenstrip**
  (totaal, bevestigd, afgemeld, geen reactie, dag/avond).
- **AI-inzicht** bovenaan.
- **Export naar CSV**.

### 10.2 Bulk-import met AI
- Genodigden importeren uit een geüpload bestand. De AI leest bestanden
  **multimodaal** uit — Excel/CSV, PDF en afbeeldingen (png/jpg/webp/heic) tot
  10 MB — en zet ze om naar gestructureerde gasten (naam, categorie, gasttype,
  partner, kinderen, enz.).

### 10.3 RSVP en uitnodigingen
- Per gast een **persoonlijke RSVP-code/-link**.
- **Uitnodigingsmails** versturen vanuit de app.
- **Publieke RSVP-pagina** (`/rsvp/[token]`) waar de genodigde — zonder account
  — de bruiloftsgegevens ziet (datum, locatie, welkomsttekst, programma) en zijn
  komst bevestigt of afmeldt, inclusief dieetwensen, partner en aantal kinderen.

---

## 11. Tafelschikking — `/bruiloft/tafels`

Visuele indeling van de gasten over de tafels.

- **Tafels** met naam, vorm (rond / vierkant / langwerpig), capaciteit, positie
  op de plattegrond en rotatie (in stappen van 45°).
- **Plattegrond-weergave**: tafels vrij verslepen en plaatsen (drag & drop),
  draaien en schikken.
- **Lijstweergave** (standaard op mobiel): gasten aan tafels toewijzen zonder
  plattegrond. Weergavekeuze wordt onthouden.
- **Stoeltoewijzing**: gasten krijgen een vaste plek aan een tafel (of
  automatisch).
- **Bewaking**: waarschuwt bij overcapaciteit of niet-ingedeelde gasten.
- **Afdrukken** van de tafelschikking/plattegrond.

---

## 12. Draaiboek — `/bruiloft/draaiboek`

Het minuut-voor-minuut programma van de trouwdag.

- **Programmaonderdelen**: starttijd, eindtijd, titel, omschrijving, locatie en
  **betrokken rollen** (bruid, bruidegom, bruidspaar, ceremoniemeester,
  fotograaf, videograaf, dj of band, catering, locatie, vervoer, gasten,
  overig).
- **Snelstart-template**: een standaard dagindeling (aankomst, ceremonie,
  enz.) met één klik.
- **AI-voorgesteld draaiboek** (zie §6.3).
- **Weergave**: 1, 2 of 3 kolommen naast elkaar, elk met een eigen rolfilter —
  zo kan elke betrokkene zijn eigen "spoor" zien.
- **Zoeken** binnen het draaiboek.
- **Conflict-/pauzedetectie**: signaleert overlappende tijden of te krappe
  pauzes tussen onderdelen.
- **Statistiekenstrip** en **export naar CSV**.

---

## 13. Trouwwebsite — `/bruiloft/website`

Een volledig instelbare, publiek deelbare trouwwebsite.

- **Publicatie**: eigen **slug/URL** (`/trouwen/[slug]`) en een aan/uit-schakelaar
  voor publiceren.
- **Vormgeving**: 6 thema's (klassiek, modern, romantisch, rustiek,
  minimalistisch, botanisch), een instelbare **accentkleur**, 6 **kopletter­types**,
  een **headerfoto** met instelbare overlay-sterkte.
- **Secties** (configureerbaar, herordenbaar, individueel zichtbaar te maken):
  welkomsttekst, programma, dresscode, cadeaulijst, hotels/overnachting,
  routebeschrijving, contact, FAQ, fotogalerij, countdown, RSVP, en meer. Per
  sectie zijn uitlijning, achtergrondkleur, tekstkleur, vrije inhoud en een foto
  in te stellen.
- **FAQ-beheer**: eigen vraag-antwoordlijst.
- **Fotogalerij**: foto's met bijschriften.
- **RSVP-sectie**: genodigden reageren direct vanaf de website.
- **Live preview-paneel** naast de editor.
- **Automatisch opslaan** (debounced) terwijl het paar bewerkt.

De **publieke website** (`/trouwen/[slug]`) toont dit alles aan genodigden in de
gekozen vormgeving, met een aparte publieke **cadeaulijst-pagina**
(`/trouwen/[slug]/cadeaulijst`).

---

## 14. Cadeaulijst — `/bruiloft/cadeaulijst`

Een digitale cadeau- en bijdragenlijst die met genodigden gedeeld wordt.

- **Twee soorten items**:
  - **Cadeau (gift)**: titel, omschrijving, afbeelding, link naar webshop.
  - **Fonds (fund)**: een geldpot met een **streefbedrag** en
    **voorgestelde bijdragebedragen** (bijv. voor de huwelijksreis).
- **Beheer**: items toevoegen/bewerken/verwijderen, herordenen (drag & drop),
  zichtbaar/onzichtbaar zetten.
- **Instellingen**: lijst aan/uit, optioneel **wachtwoord** om de lijst te
  beschermen, introtekst, en bankgegevens (IBAN + tenaamstelling) voor
  overschrijvingen.
- **Vormgeving**: eigen thema, accentkleur en koplettertype (los van de
  trouwwebsite).
- **Reserveringen**: een genodigde reserveert een cadeau (met naam, e-mail en
  bericht) zodat het niet dubbel gekocht wordt; reserveringen zijn te annuleren
  via een token.
- **Bijdragen (geld)**: genodigden dragen bij aan een fonds via
  **bankoverschrijving** of **betaallink**, met betaalstatus (in afwachting /
  bevestigd / geannuleerd) en een uniek betalingskenmerk. Bedragen tussen €5 en
  €10.000 per bijdrage.
- **Overzicht/dashboard**: reserveringen en (bevestigde + openstaande) bijdragen
  per item, met aantal bijdragers en totalen.
- **Delen** via een deelmodal.
- **E-mails** rond reserveringen en bijdragen naar zowel de genodigde als het
  bruidspaar (bevestigingen, "in afwachting", nieuwe reservering/bijdrage).
- **Publieke cadeaulijst** (`/trouwen/[slug]/cadeaulijst`): genodigden zien de
  items, reserveren cadeaus en doen bijdragen — zonder account.

---

## 15. Fotomuur — `/bruiloft/fotomuur`

Een gedeelde fotomuur waar genodigden tijdens (of na) de bruiloft foto's
uploaden.

- **Beheer** door het paar: een **QR-code** en deellink genereren waarmee gasten
  bij de upload-pagina komen.
- **Genodigden-upload** (`/foto/[slug]`): gasten uploaden foto's zonder account.
- **Moderatie**: ingestuurde foto's komen eerst als **in afwachting** binnen; het
  paar keurt ze goed of verwijdert ze.
- **Uitlichten**: favoriete foto's markeren (ster).
- **Presentatiemuur / live slideshow** (`/foto/[slug]/scherm`): een
  volledig-schermweergave die op een beamer of scherm op het feest doorlopend de
  goedgekeurde foto's toont.

---

## 16. Samen plannen — rollen, rechten en samenwerking

Samenwerking is in de hele app verweven.

### 16.1 Leden en rollen — `/bruiloft/beheer/leden`
- **Rollen**: Eigenaar (bruidspaar), Planner (helpt breed mee, bijv.
  ceremoniemeester), Helper (specifieke onderdelen, bijv. getuige), Kijker
  (meekijken, niets wijzigen).
- **Fijnmazige rechten per module**: per rol/lid is per module in te stellen of
  iemand **niets / kan zien / kan bewerken** heeft. Modules: dashboard, taken,
  budget, leveranciers, gasten, website, draaiboek, tafels, cadeaulijst, beheer.
  De navigatie en knoppen passen zich automatisch aan op deze rechten.
- **Leden uitnodigen** via e-mail met een gekozen rol; **opnieuw versturen** van
  uitnodigingen; **activatiestatus** zien (alleen eigenaar); leden verwijderen.
- **Bruiloft verwijderen** (eigenaar).

### 16.2 Partner uitnodigen
- Een prominente, terugkerende **"partner uitnodigen"**-flow (op dashboard en
  ledenpagina) die verdwijnt zodra de partner is aangehaakt. De partner krijgt
  standaard volledige rechten.

### 16.3 Activiteitenfeed — `/bruiloft/activiteit`
- Een **gedeelde activiteitenfeed** die wijzigingen vastlegt (toevoegen,
  aanpassen, verwijderen) over taken, gasten, leveranciers, budget, draaiboek en
  tafels — met wie het deed en een leesbaar label, zodat planners elkaars werk
  volgen.

### 16.4 Opmerkingen
- **Reacties op taken** (zie §7) voor overleg binnen het team.

---

## 17. Herinneringen en e-mail

- **Dagelijkse herinneringsmails**: een digest per gebruiker met de taken en
  betaaltermijnen die een mijlpaal naderen of overschrijden (bijv. 7 / 3 / 1 dag
  van tevoren of te laat). Elke mijlpaal wordt maar één keer verstuurd.
  Gebruikers kiezen zelf of ze deze mails ontvangen (opt-in in het account).
- **Transactionele e-mails** door de hele app: gast-uitnodigingen,
  partner-/leduitnodigingen, RSVP-bevestigingen, en alle cadeaulijst-mails
  (reservering, bijdrage in afwachting, bijdrage bevestigd, nieuwe
  reservering/bijdrage naar het paar).

---

## 18. Platform: PWA, mobiel en desktop

- **Installeerbaar** als app op telefoon en desktop (eigen icoon, standalone,
  navy themekleur, portretoriëntatie); met een **installatieprompt**.
- **Responsive**: aparte, geoptimaliseerde layouts voor desktop (topbalk +
  zijbalk) en mobiel (onderbalk + "Meer"-sheet).
- **Pull-to-refresh** op mobiel.
- **Scrollpositie-herstel** tussen pagina's voor een app-gevoel.
- Volledig **Nederlandstalig**.

---

## 19. Intern beheer (admin) — `/admin`

Niet zichtbaar voor eindgebruikers; een intern dashboard voor de beheerders van
het platform. Functioneel biedt het:
- **Overzicht/statistieken**: totaal gebruikers, nieuwe gebruikers (7/30 dagen),
  actieve gebruikers, totaal bruiloften, nieuwe bruiloften, fouten (24u/7d), met
  wekelijkse grafieken.
- **Gebruikers** en **Bruiloften** inzien.
- **AI-gebruik** monitoren.
- **Gebruik/adoptie** van modules.
- **Bugs/foutmeldingen** (gelogde errors).

---

## 20. Gegevens, export en privacy (functioneel)

- **Eén databron per bruiloft**: alle modules delen dezelfde gegevens, real-time
  synchroon tussen alle leden.
- **Export**: gasten, budget en draaiboek zijn naar **CSV** te exporteren;
  tafelschikking is **afdrukbaar**.
- **Toegangscontrole**: wat een gebruiker ziet en mag bewerken wordt bepaald door
  de rollen- en rechtenmatrix (§16); de database dwingt dit af als harde grens.
- **Publieke vs. besloten data**: trouwwebsite, RSVP, cadeaulijst en fotomuur
  hebben **publieke, account-loze toegang** voor genodigden (eventueel met
  wachtwoord/uniek token), terwijl het planningsdeel besloten is voor het
  bruiloftsteam.
- **Misbruikbescherming**: publieke acties (zoals bijdragen en imports) zijn
  begrensd met rate limiting en validatie.

---

## 21. Functionele modulematrix (samenvatting)

| Module | Voor wie | Kernfunctie | AI | Publiek deelbaar |
|---|---|---|---|---|
| Dashboard | Team | Stand van zaken + aftelteller | Ja (advies) | Nee |
| AI-assistent | Team | Geconsolideerd advies + score | Ja (kern) | Nee |
| Taken | Team | To-do langs de tijdlijn | Ja (suggesties) | Nee |
| Budget | Team | Begroting + betaaltermijnen | Ja (analyse) | Nee |
| Mijn leveranciers | Team | Eigen leveranciersdossier | Ja (inzicht) | Nee |
| Ontdekken | Team | Directory ~10.000 leveranciers | Ja (matching) | Nee |
| Gasten | Team | Gastenlijst + RSVP | Ja (import) | RSVP-pagina |
| Tafelschikking | Team | Plattegrond + stoelindeling | — | Afdrukbaar |
| Draaiboek | Team | Trouwdagprogramma | Ja (suggesties) | Nee |
| Trouwwebsite | Team → genodigden | Publieke trouwsite | — | Ja |
| Cadeaulijst | Team → genodigden | Cadeaus & geldfondsen | — | Ja |
| Fotomuur | Team → genodigden | Foto-upload + live slideshow | — | Ja |
| Samen plannen | Team | Rollen, rechten, leden | — | Nee |
| Activiteit | Team | Wijzigingsfeed | — | Nee |
| Account | Individu | Profiel & voorkeuren | — | Nee |

---

*Einde van de functionele productdocumentatie. Dit document beschrijft de
applicatie zoals die in de hoofdversie (main) staat en is bedoeld als feitelijke
basis voor verdere product-, investeerders- en marketingbeslissingen.*
