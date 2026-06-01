# Volledige Feature Mapping — Bruiloftsplanning Applicatie

> Dit document is bedoeld voor nieuwe gebruikers die nog geen gebruik maken van de applicatie. Per module wordt uitgebreid beschreven welke mogelijkheden beschikbaar zijn.

---

## Inhoudsopgave

1. [Dashboard](#1-dashboard)
2. [Taken](#2-taken)
3. [Budget](#3-budget)
4. [Leveranciers](#4-leveranciers)
5. [Draaiboek](#5-draaiboek)
6. [Gastenbeheer](#6-gastenbeheer)
7. [Tafelschikking](#7-tafelschikking)
8. [Website](#8-website)
9. [Beheer (Leden & Permissies)](#9-beheer-leden--permissies)
10. [Account & Profiel](#10-account--profiel)
11. [RSVP (Gast-zijde)](#11-rsvp-gast-zijde)
12. [Publieke Trouwwebsite](#12-publieke-trouwwebsite)
13. [Notificaties & E-mails](#13-notificaties--e-mails)
14. [Rollen & Toegangsrechten](#14-rollen--toegangsrechten)

---

## 1. Dashboard

Het dashboard is de centrale startpagina van de applicatie. Zodra je inlogt land je hier en zie je in één oogopslag de status van je gehele bruiloftsplanning.

### 1.1 Afteller
- Toont het **exacte aantal dagen** dat resteert tot de trouwdag
- Visuele weergave: groot, opvallend op de dashboardpagina
- Automatisch bijgewerkt op basis van de ingestelde trouwdatum

### 1.2 Bruiloftsgegevens (bewerkbaar via modal)
- **Partner 1 naam** — naam van de eerste partner
- **Partner 2 naam** — naam van de tweede partner
- **Trouwdatum** — de datum van de bruiloft (basis voor afteller en herinneringen)
- **Locatie** — trouwlocatie (tekst vrij in te vullen)
- **Totaal budget** — het totale beschikbare bruiloftsbudget in euro's
- **Aantal daggasten** — verwacht aantal gasten voor de dagceremonie
- **Aantal avondgasten** — verwacht aantal gasten voor het avondfeest

### 1.3 Statistieken & Samenvatting
Het dashboard toont automatisch berekende cijfers over de gehele planning:
- **Totaal gasten** — combinatie dag + avond
- **RSVP bevestigd** — aantal gasten dat heeft bevestigd
- **Nog geen reactie** — gasten waarbij RSVP nog uitstaat
- **Budget resterend** — totaalbudget minus betaald bedrag (alle budgetposten)
- **Taken voltooid** — percentage taken op "klaar" gezet
- **Volgende betaaltermijn** — eerstvolgende openstaande betaling met datum

### 1.4 Volgende Stappen
- Geeft automatisch **gepersonaliseerde aanbevelingen** op basis van de status van je planning
- Voorbeelden van suggesties:
  - "Voeg je eerste gasten toe"
  - "Maak je takenlijst aan"
  - "Stel je website in"
  - "Verstuur RSVP-links"
  - "Controleer je budget"
- Klikbaar: elke suggestie linkt direct naar het relevante onderdeel

### 1.5 Routekaart (Planning Voortgang)
- Geeft een **tijdlijnweergave per fase** van de bruiloftsplanning
- Fases zijn chronologisch geordend (bijv. "Venue boeken", "Catering", "Uitnodigingen", etc.)
- Visuele indicatie van welke fases al afgerond zijn vs. nog te doen

### 1.6 Aankomende Betalingen
- Overzicht van alle **openstaande betaaltermijnen** gesorteerd op vervaldatum
- Per betaling zichtbaar: bedrag, vervaldatum, aan wie (leverancier/categorie)
- Klikbaar: navigeert direct naar de bijbehorende budgetpost
- Kleurcodering: groen (ver weg), oranje (binnenkort), rood (bijna/over datum)

### 1.7 Activiteitenfeed
- **Real-time feed** van alle wijzigingen door alle teamleden
- Toont: wie, wat gedaan heeft, in welk onderdeel, op welk moment
- Voorbeelden:
  - "Jan heeft taak 'Bloemen bestellen' aangemaakt"
  - "Marie heeft gast 'Familie Jansen' bevestigd"
  - "Tom heeft budget post 'Fotograaf' bijgewerkt"
- Automatisch bijgewerkt via live verbinding (geen pagina-herlaad nodig)
- Filtert automatisch op basis van je toegangsrechten (je ziet alleen modules waartoe je toegang hebt)

### 1.8 Onboarding Wizard (eerste keer)
- Wordt getoond bij de eerste login van een nieuwe gebruiker
- Begeleidt stap voor stap door het instellen van de basisgegevens
- Stappen: bruiloftsdetails invullen → eerste gast toevoegen → eerste taak aanmaken → website instellen

---

## 2. Taken

De takenbeheer module is een volledig uitgerust projectmanagement systeem specifiek voor bruiloftsplanning.

### 2.1 Twee Weergavemodi

#### Lijstweergave
- Alle taken in een gesorteerde lijst
- Compact overzicht met alle kerninformatie per taak zichtbaar
- Uitklapbaar per taak voor details en subtaken

#### Kalenderweergave
- Taken geplot op een kalender op basis van hun deadline
- Maandoverzicht met visuele kleurcodering per prioriteit
- Klik op een dag om taken van die dag te zien
- Overschakelen tussen maanden

### 2.2 Taken Aanmaken
Elk nieuw taak heeft de volgende velden:

- **Titel** *(verplicht)* — korte omschrijving van de taak
- **Omschrijving** — uitgebreidere toelichting of instructies (tekstveld)
- **Deadline** — specifieke datum waarop de taak klaar moet zijn
- **Prioriteit** — keuze uit:
  - Laag
  - Midden
  - Hoog
- **Status** — keuze uit:
  - Open (nog niet begonnen)
  - Bezig (in uitvoering)
  - Klaar (afgerond)
- **Toegewezen aan** — koppel de taak aan één of meerdere teamleden (multi-select)
- **Subtaken** — voeg sub-items toe aan een taak (elk met eigen checkbox)
- **Koppeling leverancier** — optioneel: link de taak aan een specifieke leverancier
- **Koppeling budgetpost** — optioneel: link de taak aan een budgetpost

### 2.3 Subtaken
- Elke taak kan **meerdere subtaken** bevatten
- Subtaken hebben elk een eigen titel en vinkbox
- Subtaken zichtbaar bij uitklappen van de hoofdtaak
- Subtaken afvinken bijdraagt aan het voltooiingspercentage van de taak
- Subtaken toevoegen, bewerken en verwijderen tijdens aanmaken én achteraf

### 2.4 Opmerkingen op Taken
- Elke taak heeft een **discussiedraad** onderaan
- Teamleden kunnen berichten toevoegen
- Opmerkingen worden weergegeven met naam, avatar en tijdstip
- Ideaal voor communicatie over een specifieke taak zonder e-mail

### 2.5 Filters & Zoeken
De takenlijst is uitgebreid te filteren:

- **Zoeken op tekst** — zoekt in titel én omschrijving gelijktijdig
- **Filter op status** — Alles / Open / Bezig / Klaar
- **Filter op prioriteit** — Alles / Laag / Midden / Hoog
- **Filter op toegewezen persoon** — Alles / Niet toegewezen / (specifiek teamlid)
- Filters zijn combineerbaar (bijv. "hoge prioriteit + bezig + toegewezen aan Jan")

### 2.6 Statistieken Strip
Bovenaan de takenlijst een samenvattingsbalk:
- **Totaal** — totaal aantal taken
- **Open** — nog te doen
- **Bezig** — in uitvoering
- **Klaar** — afgerond
- **Percentage voltooid** — visuele voortgangsindicator

### 2.7 Achterstandsbanner
- Automatische melding als er taken zijn waarvan de **deadline verstreken** is
- Toont het aantal verlopen taken
- Klikbaar om direct naar die taken te filteren

### 2.8 Bulk-acties
- Selecteer **meerdere taken tegelijk** via checkboxen
- Beschikbare bulk-acties:
  - Status wijzigen voor alle geselecteerde taken
  - Alle geselecteerde taken verwijderen
- Handige actiesbalk verschijnt onderaan bij selectie

### 2.9 Taak Bewerken & Verwijderen
- Elk taak is bewerkbaar via een bewerkmodal (alle velden aanpasbaar)
- Taken kunnen individueel of in bulk verwijderd worden
- Verwijderen vraagt bevestiging

---

## 3. Budget

De budgetmodule biedt volledig inzicht en beheer over alle financiële aspecten van de bruiloft.

### 3.1 Budget Overzicht (Samenvatting)
Bovenaan de budgetpagina een visueel overzicht:

- **Totaalbudget** — ingesteld bij bruiloftsdetails
- **Geschat totaal** — som van alle geschatte bedragen over alle posten
- **Geoffreerd totaal** — som van ontvangen offertes
- **Betaald totaal** — som van werkelijk betaalde bedragen
- **Resterend** — beschikbaar budget minus betaald bedrag
- **Over/Onder budget indicator** — zichtbaar of je boven of onder je budget zit

### 3.2 Visuele Grafieken
- **Donut/cirkeldiagram** — budgetverdeling per categorie procentueel
- **Staafdiagram** — vergelijking geschat vs. geoffreerd vs. betaald per categorie
- Beide grafieken zijn interactief (hover voor details)

### 3.3 Budgetposten Aanmaken
Elke budgetpost bevat:

- **Categorie** *(verplicht)* — keuze uit voorgedefinieerde categorieën, o.a.:
  - Locatie/zaalhuur
  - Catering & drinken
  - Fotografie & video
  - Muziek & entertainment
  - Bloemen & decoratie
  - Kleding & accessoires
  - Uitnodigingen & drukwerk
  - Transport
  - Huwelijksreis
  - Diversen
- **Omschrijving** — nadere toelichting op de post
- **Geschat bedrag** — jouw eigen schatting vóór offertes
- **Geoffreerd bedrag** — bedrag uit ontvangen offerte van leverancier
- **Betaald bedrag** — wat er daadwerkelijk al betaald is
- **Koppeling leverancier** — optioneel: link aan een leverancier uit de leveranciersmodule

### 3.4 Betaaltermijnen
Elke budgetpost kan **meerdere betaaltermijnen** bevatten:

- **Bedrag** per termijn
- **Vervaldatum** per termijn
- **Betaald vinkje** per termijn
- Voeg zo veel termijnen toe als nodig (aanbetaling + restbetaling bijv.)
- Termijnen worden zichtbaar in het dashboard als aankomende betalingen
- Herinneringsmails worden gebaseerd op termijndata (14 dagen en 3 dagen van tevoren, en bij overschrijding)

### 3.5 Categorie Groepering
- Budgetposten worden **automatisch gegroepeerd** per categorie in de lijst
- Elke categorie toont een subtotaal
- Uitklapbaar/inklapbaar per categorie

### 3.6 Budget CSV Export
- Exporteer de **volledige budgetlijst** naar een CSV-bestand
- Bevat kolommen: categorie, omschrijving, geschat bedrag, geoffreerd bedrag, betaald bedrag, resterend bedrag
- Direct te openen in Excel of Google Sheets

### 3.7 Budget Automatisch Verdelen
- Functionaliteit om het totaalbudget **automatisch te verdelen** over categorieën
- Op basis van standaard bruiloftspercentages (bijv. 30% catering, 15% fotografie, etc.)
- Geeft een startpunt dat daarna handmatig aan te passen is

### 3.8 Bewerken & Verwijderen
- Alle budgetposten zijn volledig bewerkbaar
- Betaaltermijnen zijn afzonderlijk toe te voegen/bewerken/verwijderen
- Verwijderen van een post vraagt bevestiging

---

## 4. Leveranciers

Beheer alle leveranciers voor de bruiloft op één centrale plek.

### 4.1 Leverancier Aanmaken
Elke leverancier heeft de volgende velden:

- **Naam** *(verplicht)* — naam van het bedrijf of de persoon
- **Type** — keuze uit leverancierstype:
  - Trouwlocatie
  - Catering
  - Fotograaf
  - Videograaf
  - Muzikant / DJ / Band
  - Bloemen & decoratie
  - Trouwjurk / kleding
  - Make-up & haar
  - Ceremoniemeester
  - Transport / limousine
  - Drukwerk
  - Taarten
  - Overig
- **Status** — huidige stand van zaken:
  - Te bezoeken (op shortlist)
  - Bezocht (gesprek gehad)
  - Offerte aangevraagd
  - Geboekt (definitief)
  - Afgewezen (niet gekozen)
- **Contactpersoon** — naam van je vaste contactpersoon
- **Telefoonnummer** — direct contactnummer
- **E-mailadres** — e-mail voor correspondentie
- **Website** — URL naar de website van de leverancier
- **Geoffreerd bedrag** — het ontvangen offertebedag in euro's
- **Notitie** — vrij tekstveld voor aantekeningen, indrukken, etc.
- **Koppeling budgetpost** — optioneel: link aan een budgetpost om financiën te synchroniseren

### 4.2 Leveranciers Filteren
- **Filter op type** — bekijk alle of één specifiek type leverancier
- **Filter op status** — bekijk bijv. alleen geboekte leveranciers

### 4.3 Leverancierskaarten (Grid Weergave)
Elke leverancier wordt als kaart weergegeven met:
- Naam en type
- Statusbadge (kleurgecodeerd)
- Contactgegevens (telefoon, e-mail, website klikbaar)
- Geoffreerd bedrag
- Snelkoppelingen naar bewerken/verwijderen

### 4.4 Koppeling met Budget
- Wanneer een leverancier gekoppeld is aan een budgetpost, worden bedragen gesynchroniseerd
- Wijzigen van het bedrag bij de leverancier werkt door naar het budget en vice versa

### 4.5 Bewerken & Verwijderen
- Alle leveranciersgegevens zijn volledig bewerkbaar
- Verwijderen verwijdert ook de koppeling met eventuele budgetposten en taken
- Verwijderen vraagt bevestiging

---

## 5. Draaiboek

Het draaiboek is de minuut-tot-minuut tijdlijn voor de trouwdag zelf.

### 5.1 Draaiboekitems Aanmaken
Elk item in het draaiboek bevat:

- **Tijdstip** *(verplicht)* — exacte tijd in uren en minuten (bijv. 14:30)
- **Titel** *(verplicht)* — wat er op dit moment gebeurt (bijv. "Aankomst gasten")
- **Omschrijving** — aanvullende toelichting of instructies
- **Locatie** — waar dit plaatsvindt (bijv. "Buitenterras", "Ceremonie zaal")
- **Betrokkenen** — wie er bij dit moment betrokken zijn (meerdere selecteerbaar):
  - Bruidspaar
  - Ceremoniemeester
  - Fotograaf
  - Videograaf
  - Catering / keukenpersoneel
  - Muzikanten / DJ
  - Familie bruidspaar
  - Getuigen
  - Gasten (algemeen)
  - Chauffeur / transport
  - Overig

### 5.2 Sortering
- Alle items worden **automatisch gesorteerd op tijdstip**
- Toevoeging op willekeurig moment; de applicatie zorgt voor juiste volgorde

### 5.3 Filter op Betrokkene
- Filter het draaiboek op **één specifieke betrokkene**
- Ideaal om een gepersonaliseerd schema te maken voor bijv. de fotograaf of ceremoniemeester
- "Alles" toont het volledige draaiboek

### 5.4 Draaiboek CSV Export
- Exporteer het volledige draaiboek naar CSV
- Bevat kolommen: tijdstip, titel, locatie, omschrijving, betrokkenen
- Direct te printen of te delen via e-mail

### 5.5 Bewerken & Verwijderen
- Elk item is volledig bewerkbaar
- Verwijderen vraagt bevestiging

---

## 6. Gastenbeheer

Volledig beheer over de gastenlijst, van uitnodiging tot RSVP-bevestiging.

### 6.1 Gast Aanmaken
Elk gast-record bevat:

- **Voornaam** *(verplicht)*
- **Achternaam** *(verplicht)*
- **Categorie** — relatie tot het bruidspaar:
  - Familie partner 1
  - Familie partner 2
  - Vrienden
  - Collega's
  - Overig
- **Gasttype** — wanneer de gast aanwezig is:
  - Daggast (aanwezig bij ceremonie én diner)
  - Avondgast (alleen aanwezig bij het avondfeest)
- **RSVP-status** — huidige aanmeldingsstatus:
  - Uitgenodigd (uitnodiging verstuurd, geen reactie)
  - Bevestigd (heeft bevestigd aanwezig te zijn)
  - Afgemeld (kan niet aanwezig zijn)
  - Geen reactie (nog niet gecontacteerd)
- **Dieetwensen** — bijzondere voedingswensen of allergieën
- **Heeft partner** — toggle: ja/nee
  - Indien ja: **Partner naam** invullen
- **Aantal kinderen** — hoeveel kinderen deze gast meebrengt
- **Adres** — postadres (voor het versturen van fysieke uitnodigingen)
- **Notitie** — vrij tekstveld voor aanvullende opmerkingen

### 6.2 RSVP-link Versturen
- Per gast een **unieke RSVP-link genereren**
- Verstuur de link direct via e-mail vanuit de applicatie (knop per gast)
- De gast ontvangt een persoonlijke e-mail met zijn/haar eigen link
- Via de link kan de gast zelf:
  - Aanwezigheid bevestigen of afmelden
  - Partner meenemen (ja/nee)
  - Aantal kinderen opgeven
  - Dieetwensen invoeren
- Na RSVP wordt de status automatisch bijgewerkt in de gastenlijst

### 6.3 RSVP Token Beheer
- Elke gast heeft een **unieke token** voor zijn/haar RSVP-link
- Tokens zijn intrekbaar (bijv. als een link per ongeluk gedeeld is)
- Na intrekken is de oude link niet meer bruikbaar
- Nieuwe link genereren is mogelijk

### 6.4 Filters & Zoeken
De gastenlijst is uitgebreid filterbaar:

- **Zoeken op naam** — zoekt in zowel voornaam als achternaam
- **Filter op categorie** — Familie P1 / Familie P2 / Vrienden / Collega's / Overig
- **Filter op gasttype** — Daggast / Avondgast
- **Filter op RSVP-status** — Uitgenodigd / Bevestigd / Afgemeld / Geen reactie
- Alle filters zijn combineerbaar

### 6.5 RSVP Samenvatting
- Automatisch bijgehouden statistieken:
  - Totaal uitgenodigd
  - Bevestigd
  - Afgemeld
  - Geen reactie / uitgenodigd maar onbeantwoord
  - Totaal verwacht (bevestigden + nog niet gereageerd)
  - Totaal kinderen bevestigd

### 6.6 Tafelkoppeling
- Gasten kunnen gekoppeld worden aan een specifieke tafel (via de tafelschikkingsmodule)
- In de gastenlijst is per gast zichtbaar aan welke tafel hij/zij is ingedeeld

### 6.7 Gastenlijst CSV Export
- Exporteer de **volledige gastenlijst** naar CSV
- Bevat kolommen: voornaam, achternaam, categorie, type, RSVP-status, dieetwensen, heeft partner, partner naam, aantal kinderen, adres, notitie
- Ideaal voor eigen administratie of voor het venue

### 6.8 Bewerken & Verwijderen
- Alle gastgegevens zijn volledig bewerkbaar (ook na RSVP-bevestiging door gast)
- RSVP-status manueel aanpasbaar (ongeacht of gast zelf heeft gereageerd)
- Verwijderen vraagt bevestiging

---

## 7. Tafelschikking

Visuele drag-and-drop indeling van gasten aan tafels.

### 7.1 Tafels Aanmaken
Elke tafel bevat:

- **Naam** *(verplicht)* — identificatie van de tafel (bijv. "Tafel 1", "Familietafel", "VIP Tafel")
- **Vorm** — keuze uit:
  - Rond
  - Vierkant
  - Langwerpig (rechthoekig)
- **Capaciteit** — maximaal aantal zitplaatsen

### 7.2 Drag-and-Drop Indeling
- Gasten visueel **slepen van een gastenlijst naar een tafel**
- Gasten die nog niet ingedeeld zijn staan in een aparte lijst
- Tafel toont realtime hoeveel plaatsen bezet/vrij zijn
- Visuele waarschuwing bij overschrijding van capaciteit

### 7.3 Tafelvormen Visualisatie
- Ronde tafels weergegeven als cirkel
- Vierkante tafels weergegeven als vierkant
- Langwerpige tafels weergegeven als rechthoek
- Elke tafel toont de naam + capaciteitsindicator

### 7.4 Gasten Verplaatsen
- Gasten van de ene naar de andere tafel slepen
- Gast terug slepen naar de "niet ingedeeld" lijst
- Indeling wordt direct opgeslagen

### 7.5 Overzicht & Status
- Direct zichtbaar hoeveel gasten nog niet ingedeeld zijn
- Per tafel: bezette plaatsen vs. totale capaciteit
- Totaaloverzicht: ingedeeld / niet ingedeeld

### 7.6 Koppeling met Gastenlijst
- Alleen gasten met RSVP-status "Bevestigd" of alle gasten (configureerbaar) worden weergegeven voor indeling
- Wanneer een gast verwijderd wordt, vervalt de tafelkoppeling automatisch

---

## 8. Website

Maak een gratis gepersonaliseerde trouwwebsite die publiek toegankelijk is via een eigen URL.

### 8.1 Twee Bewerkingstabs

#### Tab 1: Inhoud
Alle teksten en media die op de website worden getoond.

#### Tab 2: Vormgeving
Visuele instellingen: thema, kleuren, lettertype.

### 8.2 Inhoud — Welkomstpagina
- **Welkomsttekst** — de hoofdtekst op de homepagina van de website (bijv. trouwtekst, persoonlijk verhaal)
- **Header foto** — grote afbeelding bovenaan de website (bestand uploaden: JPG/PNG/WEBP)
- **Header overlay** — transparantie van een donkere laag over de foto (schuifregelaar 0–100%)

### 8.3 Inhoud — Informatiesecties
De website heeft meerdere **optionele tekstsecties**, elk met een eigen pagina of blok:

- **Dresscode** — instructies over kledingstijl
- **Cadeaulijst** — informatie over cadeauwensen (URL, tekst, info)
- **Hotels & Verblijf** — hotelsugesties en aanbevelingen in de buurt
- **Routebeschrijving** — hoe te komen naar de trouwlocatie
- **Contact** — contactinformatie voor vragen

Elke sectie:
- Heeft een eigen vrij tekstveld (lang formaat)
- Is afzonderlijk in/uitschakelbaar (verbergen op website zonder verwijderen)
- Heeft een aanpasbare sectienaam (bijv. "Ons adres" in plaats van "Routebeschrijving")
- De volgorde van secties is aanpasbaar

### 8.4 FAQ Sectie
- Voeg **veelgestelde vragen** toe met bijbehorende antwoorden
- Onbeperkt aantal FAQ-items
- Elk item: vraag (titel) + antwoord (tekst)
- Items zijn herordend of verwijderd

### 8.5 Fotogalerij
- Upload **meerdere foto's** voor een galerij op de website
- Per foto een **bijschrift** toevoegen
- Volgorde van foto's aanpasbaar
- Foto's afzonderlijk verwijderbaar
- Ondersteunde formaten: JPG, PNG, WEBP

### 8.6 Thema's
Kies uit zes visuele thema's die de algehele uitstraling bepalen:

| Thema | Beschrijving |
|-------|---|
| **Klassiek** | Tijdloze elegantie, warme tinten |
| **Modern** | Strak en minimalistisch |
| **Romantisch** | Zachte kleuren, sierlijk |
| **Rustiek** | Warme aardtinten, landelijk |
| **Minimalistisch** | Wit en licht, puur |
| **Botanisch** | Groene natuur-geïnspireerde stijl |

### 8.7 Kleur Accent
- Kies een **accentkleur** via een kleurkiezer (hex kleurcode)
- Deze kleur wordt gebruikt voor knoppen, links en highlights op de website
- Volledig vrij in te stellen (alle kleuren mogelijk)

### 8.8 Lettertype
Kies een lettertype voor de koppen op de website:

| Lettertype | Stijl |
|------------|-------|
| **Cormorant** | Klassiek, elegant serif |
| **Playfair** | Luxueus, uitgesproken serif |
| **Lora** | Leesbaar en verfijnd |
| **Dancing Script** | Sierlijk handschrift |
| **EB Garamond** | Tijdloos klassiek |
| **Great Vibes** | Zwierig kalligrafisch |

### 8.9 Website Publiceren
- Stel een **eigen slug** in (onderdeel van de URL, bijv. `/trouwen/jan-en-marie`)
- Controleer of de slug beschikbaar is (automatische check)
- Website **publiceren** met één klik (toggle aan/uit)
- Gepubliceerde website is toegankelijk voor iedereen zonder account
- Website **verbergen** is ook mogelijk (niet verwijderen)

### 8.10 RSVP Integratie op Website
- Optioneel een **RSVP-sectie** op de website activeren
- Gasten kunnen via de website aanmelden (indien hun unieke link bekend is)
- De RSVP-pagina is ook bereikbaar via de unieke token-link (zonder website)

### 8.11 Live Preview
- Bij elke wijziging een realtime preview van hoe de website eruitziet
- Wissel tussen bewerkingsscherm en preview

---

## 9. Beheer (Leden & Permissies)

Uitnodig teamleden en stel in wie wat mag zien en doen in de applicatie.

### 9.1 Teamleden Uitnodigen
- Nodig mensen uit via **e-mailadres**
- Kies een **rol** voor het nieuwe lid:
  - Planner
  - Helper
  - Viewer
- Uitnodiging wordt per e-mail verstuurd met een persoonlijke acceptatielink
- Uitnodigingslink heeft een **vervaldatum** (beperkte geldigheid)
- Openstaande uitnodigingen zijn intrekbaar (vóór acceptatie)

### 9.2 Rollen Overzicht

| Rol | Beschrijving |
|-----|---|
| **Owner** | Bruidspaar / eigenaren — volledige toegang, altijd, niet aanpasbaar |
| **Planner** | Bijv. ceremoniemeester of professionele planner — brede bewerkingsrechten |
| **Helper** | Bijv. getuigen, ouders — beperkte bewerkingsrechten |
| **Viewer** | Bijv. nieuwsgierige familieleden — alleen lezen |

### 9.3 Permissie Matrix
Stel per rol en per module in welk toegangsniveau van toepassing is:

**Modules:**
- Dashboard
- Taken
- Budget
- Leveranciers
- Gasten
- Website
- Draaiboek
- Tafelschikking
- Beheer

**Niveaus per module:**
- **Geen** — module niet zichtbaar en niet toegankelijk
- **Bekijken** — module zichtbaar, maar alleen lezen (geen bewerkingen)
- **Bewerken** — volledige toegang: toevoegen, bewerken, verwijderen

**Voorbeeld configuratie:**
- Planner: alles bewerken behalve Beheer
- Helper: Taken bewerken, de rest alleen bekijken
- Viewer: alleen Dashboard en Draaiboek bekijken

### 9.4 Permissies Aanpassen
- Permissies zijn per bruiloft aanpasbaar
- Aanpassingen gaan direct in (geen herstart nodig)
- Owner-rechten zijn niet aanpasbaar (altijd volledige toegang)

### 9.5 Leden Verwijderen
- Teamleden kunnen verwijderd worden uit de bruiloft
- Verwijderd lid verliest direct alle toegang
- Leden die verwijderd zijn kunnen opnieuw uitgenodigd worden

### 9.6 Ledenlijst Overzicht
- Overzicht van alle actieve teamleden met:
  - Naam en e-mailadres
  - Profielfoto (of initialen)
  - Huidige rol
  - Datum lid geworden
- Openstaande (nog niet geaccepteerde) uitnodigingen apart zichtbaar

---

## 10. Account & Profiel

Persoonlijke instellingen voor elk individueel gebruikersaccount.

### 10.1 Profielfoto
- Upload een eigen **profielfoto** (JPG, PNG, WEBP, maximaal 2 MB)
- Foto wordt getoond in de navigatiebalk, activiteitenfeed en bij taakopmerkingen
- Bij geen foto: automatisch gegenereerde cirkel met initialen

### 10.2 Persoonlijke Gegevens Wijzigen
- **Voornaam** aanpassen
- **Achternaam** aanpassen
- **E-mailadres** wijzigen
  - Bij wijziging wordt een verificatiestap doorlopen via e-mail
  - Nieuw e-mailadres is pas actief na bevestiging

### 10.3 Wachtwoord Wijzigen
- Huidig wachtwoord invoeren ter verificatie
- Nieuw wachtwoord instellen (minimum 8 tekens)
- Bevestiging van nieuw wachtwoord (twee keer invoeren)

### 10.4 E-mailherinneringen
- **Toggle aan/uit** voor het ontvangen van automatische herinneringsmails
- Wanneer ingeschakeld, ontvang je dagelijks een e-mail bij:
  - Taken waarvan de deadline binnenkort verstrijkt (7 dagen, 1 dag van tevoren)
  - Taken waarvan de deadline is verstreken
  - Betaaltermijnen die binnenkort vervallen (14 dagen, 3 dagen van tevoren)
  - Betaaltermijnen die zijn overschreden
- Wanneer uitgeschakeld, ontvang je geen enkele herinneringsmail

### 10.5 Mijn Rol
- Weergave van de huidige rol binnen de actieve bruiloft
- Alleen informatief, niet aanpasbaar door de gebruiker zelf (beheerd door Owner)

### 10.6 Account Verwijderen
- Permanente verwijdering van het account
- **Let op:** bruiloften waarbij jij de enige eigenaar bent, worden mee verwijderd
- Vraagt expliciete bevestiging
- Niet ongedaan te maken

---

## 11. RSVP (Gast-zijde)

De RSVP-pagina is de publieke pagina die gasten zien wanneer ze hun persoonlijke uitnodigingslink openen. Geen account nodig.

### 11.1 Wat de Gast Ziet
- Naam van de gast (gepersonaliseerd: "Beste [Voornaam]")
- Namen van het bruidspaar
- Trouwdatum
- Trouwlocatie

### 11.2 Wat de Gast Kan Invullen
- **Aanwezigheid bevestigen of afmelden** — ja/nee keuze
- **Partner meenemen** — ja/nee (indien van toepassing)
- **Aantal kinderen** — numeriek veld
- **Dieetwensen** — vrij tekstveld

### 11.3 Na RSVP
- Na bevestiging: dankpagina getoond
- In de applicatie: RSVP-status van de gast automatisch bijgewerkt
- Alle ingevulde gegevens (partner, kinderen, dieet) opgeslagen in de gastenlijst

### 11.4 Link Veiligheid
- Elke link is uniek en persoonlijk voor één gast
- Links zijn eenmalig bruikbaar (na indiening afgesloten)
- Links kunnen door het bruidspaar ingetrokken worden

---

## 12. Publieke Trouwwebsite

De gepubliceerde trouwwebsite is toegankelijk voor iedereen via de unieke URL (`/trouwen/[jouw-slug]`).

### 12.1 Toegankelijkheid
- Geen account of inloggen nodig voor bezoekers
- Bereikbaar op elk apparaat (mobiel, tablet, desktop)
- Automatisch responsief design

### 12.2 Zichtbare Inhoud (op basis van instellingen)
- Welkomsttekst en header foto
- Datum en locatie van de bruiloft
- Dresscode (indien ingeschakeld)
- Cadeaulijst informatie (indien ingeschakeld)
- Hotels & verblijf (indien ingeschakeld)
- Routebeschrijving (indien ingeschakeld)
- Contact informatie (indien ingeschakeld)
- FAQ-sectie (indien ingeschakeld en gevuld)
- Fotogalerij (indien ingeschakeld en gevuld)

### 12.3 Thema-weergave
- Volledig visueel thema toegepast (klassiek, modern, romantisch, etc.)
- Accentkleur door de gehele website
- Gekozen lettertype voor alle koppen

### 12.4 Website Aan/Uit
- Wanneer de website uit staat: URL toont melding dat de pagina niet beschikbaar is
- Wanneer aan: volledig zichtbaar voor bezoekers

---

## 13. Notificaties & E-mails

### 13.1 In-App Meldingen (Toasts)
- Direct visueel feedback bij elke actie:
  - **Groen** — succesvol (bijv. "Gast toegevoegd")
  - **Rood** — fout (bijv. "Opslaan mislukt, probeer opnieuw")
  - **Blauw** — informatie (bijv. "E-mail verstuurd")
- Verdwijnen automatisch na enkele seconden

### 13.2 RSVP E-mail (naar Gast)
- Verstuurd vanuit de applicatie via de "Verstuur RSVP-link" knop
- Bevat de persoonlijke RSVP-link van de gast
- Opgemaakt als een nette uitnodigingsmail

### 13.3 Uitnodigingsmail (naar Teamlid)
- Verstuurd bij uitnodigen van een nieuw teamlid
- Bevat een persoonlijke acceptatielink
- Meldt de rol waarvoor het lid uitgenodigd is

### 13.4 Dagelijkse Herinneringse-mail (automatisch)
Wanneer e-mailherinneringen ingeschakeld staan, ontvang je een dagelijkse digest e-mail met:

**Voor taken:**
- Taken met deadline **7 dagen** van tevoren
- Taken met deadline **1 dag** van tevoren
- Taken waarvan de deadline **verstreken** is

**Voor betalingen:**
- Betaaltermijnen **14 dagen** voor vervaldatum
- Betaaltermijnen **3 dagen** voor vervaldatum
- Betaaltermijnen die **over datum** zijn

- Maximaal één herinneringsmail per mijlpaal per item (geen herhaalde spam)
- Uitschakelbaar per gebruiker in accountinstellingen

### 13.5 Realtime Activiteitsfeed
- Geen e-mail, maar live updates in de applicatie
- Toont wijzigingen van alle teamleden in real-time
- Geen pagina-verversing nodig

---

## 14. Rollen & Toegangsrechten

Overzicht van het complete rechtensysteem.

### 14.1 Rollen

| Rol | Uitnodigbaar | Aanpasbaar | Verwijderbaar |
|-----|---|---|---|
| Owner | Nee (eigenaar bij aanmaken) | Niet van te verwijderen | Nee (tenzij account verwijderd) |
| Planner | Ja, via beheer | Ja, permissies aanpasbaar | Ja |
| Helper | Ja, via beheer | Ja, permissies aanpasbaar | Ja |
| Viewer | Ja, via beheer | Ja, permissies aanpasbaar | Ja |

### 14.2 Standaard Rechten per Rol

| Module | Owner | Planner (default) | Helper (default) | Viewer (default) |
|--------|-------|---|---|---|
| Dashboard | Bewerken | Bekijken | Bekijken | Bekijken |
| Taken | Bewerken | Bewerken | Bewerken | Bekijken |
| Budget | Bewerken | Bewerken | Bekijken | Geen |
| Leveranciers | Bewerken | Bewerken | Bekijken | Geen |
| Gasten | Bewerken | Bewerken | Bekijken | Geen |
| Website | Bewerken | Bewerken | Bekijken | Geen |
| Draaiboek | Bewerken | Bewerken | Bekijken | Bekijken |
| Tafels | Bewerken | Bewerken | Bekijken | Geen |
| Beheer | Bewerken | Geen | Geen | Geen |

> Standaard rechten zijn volledig aanpasbaar door de Owner via het Beheer-scherm.

### 14.3 Beveiligingslaag
- Rechten worden **dubbel gecontroleerd**: zowel in de interface (UI) als in de database (RLS)
- Zelfs als iemand probeert een verborgen pagina te openen, weigert de database data terug te geven zonder de juiste rechten
- Elke RSVP-link is uniek en persoonlijk, niet te misbruiken door anderen

---

## Samenvatting: Wat Kan Deze Applicatie?

| Categorie | Mogelijkheden |
|-----------|---|
| **Samenwerking** | Meerdere teamleden, rollen, aanpasbare permissies |
| **Planning** | Taken met subtaken, prioriteiten, deadlines, kalenderweergave |
| **Financiën** | Budget per categorie, betaaltermijnen, grafieken, CSV-export |
| **Leveranciers** | Volledig contactbeheer, statussen, koppeling met budget |
| **Gasten** | RSVP-systeem, e-mail links, filters, CSV-export |
| **Dag-planning** | Minuut-voor-minuut draaiboek per betrokkene |
| **Tafelindeling** | Drag-and-drop tafelschikking |
| **Website** | Gratis trouwwebsite met eigen URL, 6 thema's, 6 lettertypes |
| **Automatisering** | Dagelijkse herinneringsmails, realtime activiteitsfeed |
| **Toegang** | Rollen met granulaire module-permissies, veilige RSVP-tokens |
