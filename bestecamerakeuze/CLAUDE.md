# bestecamerakeuze — Campagnedashboard

Dit document is de doorlopende referentie voor wie hierna aan dit dashboard werkt
(mens of Claude). Het legt vast wat er niet expliciet in elke prompt terugkomt: het
doelplatform en de designvisie waarop het huidige dashboard is gebouwd. Zie
`README.md` voor de technische opzet (stack, data, draaien) en `README-dataloket.md`
voor het aansluiten van Supabase/de chat/de kosten/de aantekeningen/profielen.

## Alleen desktop

Deze app wordt uitsluitend gebouwd en getest voor desktop. Er is bewust **geen**
rekening te houden met mobiel of tablet:

- Geen mobiel navigatiepatroon, geen hamburger-menu, geen responsive breakpoints voor
  kleinere schermen nodig. Ga uit van een breed beeldscherm (laptop/monitor).
- De sidebar is standaard een smalle icoon-rail en klapt op hover uit (zie
  "Structuur van het scherm" hieronder) — dit is een bewuste, permanente desktop-
  interactie, geen responsive/mobiel gedrag en niet iets om terug te draaien naar altijd
  vast-en-breed zonder dat daarom gevraagd wordt.
- De campagnetabel mag zo breed zijn als hij moet zijn; horizontaal scrollen binnen de
  tabel (met sticky eerste kolom) is de oplossing voor veel campagnes, niet het
  verkleinen van de layout voor een smaller scherm.
- Test en itereer visueel op desktop-breedtes (1400–1920px). Besteed geen tijd aan
  mobiele/tablet-varianten tenzij daar expliciet om gevraagd wordt.

## Designvisie van het campagnedashboard

Deze visie is neergezet tijdens de redesign van het campagnedashboard (op basis van een
referentieafbeelding van een premium SaaS-dashboard) en geldt als uitgangspunt voor
nieuwe onderdelen. Kernwoorden: **premium, minimal, automotive, professional,
data-dense but calm.** Geen flashy SaaS-templategevoel, geen overdesign — rust en
duidelijke hiërarchie, niet meer kleur/schaduw/badges dan nodig.

### Structuur van het scherm

- **Sidebar** (donkere, rustige navigatieschil): staat standaard ingeklapt als een
  smalle icoon-rail (72px, `components/Sidebar.tsx`) met alleen het `LogoMark`
  ("AI"-beeldmerk) en de navigatie-iconen; op hover klapt hij uit tot 240px (labels,
  wordmark "Udenhout" en profielnaam faden/schuiven mee in, via Tailwind
  `group`/`group-hover` — geen JS-state nodig) en overlayt hij de content in plaats van
  hem te verschuiven (de aside is absoluut gepositioneerd binnen een vaste 72px-kolom in
  `AppShell.tsx`). Bovenaan staan, los en zonder groepskopje, **Scores** en **Kennis en
  acties** — wat het team zelf vastlegt komt vóór de cijfers, en de stand komt vóór de
  inhoud omdat de weekstand de aanleiding is om iets vast te leggen. Daaronder staat de
  navigatie in twee
  groepen onder een klein, uppercase groepskopje (net als de "Planning"/"Budget"-
  groepskoppen in de campagnetabel): **Campagnes** (Campagnes, Tijdlijn, Campagnebeheer, Marketing analyse, Campagne timeline) en **Chatbot**
  (Start gesprek, Prikbord, Kennisbank) — het Prikbord staat bewust onder Chatbot, want
  het is een functie van de chat (grafieken die je daaruit vastpint), niet van het
  wekelijkse cijferoverzicht.
  Onderaan, buiten de groepen: Kosten, Instellingen en het gebruikersprofiel. Eén actieve
  state, subtiel gemarkeerd — geen felle kleuren.
- **Geen dubbele navigatie**: de tabbladtitels staan alleen in de sidebar, nooit ook nog
  eens als een rij tabs boven de content. **Eén uitzondering**, op verzoek:
  Campagnebeheer heeft twee tabs (Syntec en Google Analytics, zie hieronder). Dat zijn
  geen twee pagina's maar twee kanten van dezelfde campagnelijst; maak er geen precedent
  van voor andere pagina's. Een **tweede uitzondering**, ook op verzoek: KPI's 2027 heeft
  één tab per website (zie "KPI's → KPI's 2027") — dezelfde pagina voor een andere
  GA4-property.
- **Wie welk tabblad ziet** (november 2026, op verzoek van de eigenaar), op één plek:
  `lib/beperkteTabbladen.ts`, getest. **Voor niemand** (ook niet de eigenaar): Scores,
  Kennis en acties, Budget beheer, Koppeltabel, Kosten, Landingspagina en KPI's 2026 — de code
  staat er nog, terugzetten is ze uit `VERBORGEN_TABBLADEN` halen. **Alleen voor de eigenaar**
  (zijn twee accounts): Instellingen. **Online leads** (view `leads`, eerst "Leads" en alleen voor de
  eigenaar) is sinds eind november 2026 voor iedereen; alleen de knop Kostenverdeling en
  `/api/leads/kanaalkosten` blijven voor de eigenaar. Toegepast in de sidebar en het profielmenu, in
  `AppShell` (`?tab=…` opent een verborgen tabblad niet, en de weekwinnaar-pop-up van
  Scores verschijnt niet) en in `app/page.tsx` (het paneel wordt niet gerenderd). De module
  staat los van `lib/gebruikersbeheer.ts` omdat hij ook in de browser laadt, en daar staat
  het standaardwachtwoord in. Waar hieronder nog over Scores, Kennis en acties, Budget
  beheer, Koppeltabel of Kosten staat, gaat dat over tabbladen die nu niet in beeld zijn.
  "KPI overzicht" heet sindsdien **KPI's 2026** (view blijft `kpi-overzicht`).
- **Page header**: paginatitel + korte subtitel links; rechts contextuele status (bv.
  "N campagnes live", "Laatst bijgewerkt HH:MM") en een subtiele update-actie — geen
  grote primaire knop voor een routinehandeling.
- **Filterbalk**: één samenhangend component (aantal + filters + eventueel een inline
  ververs-actie) in plaats van losse knoppen die verspreid op de pagina staan.

### Het startscherm (Home)

- **Het dashboard opent op een startscherm** (view `home`, `components/home/HomeDashboard.tsx`,
  november 2026 op verzoek). Bovenaan gecentreerd "Marketing dashboard" (geen PageHeader),
  daaronder vier blokken in een raster van 2 × 2: **KPI's 2027** (linksboven), **Kanalen**
  (rechtsboven), **Tools** (linksonder) en **Campagnes** (rechtsonder). Het geheel past precies
  in het scherm (hoogte = viewport min de padding van `<main>`, geen scrollen), en elk blok
  heeft twee kolommen: links de illustratie, rechts kopje, titel, omschrijving en de pagina's
  als één lijst onder elkaar (verzoek november 2026). Elk blok heeft een
  klein grijs kopje met de groepsnaam uit de sidebar en daaronder een eigen titel: Key
  performance indicators, Online kanalen analyseren, Interne data en Campagnes monitoren.
- **Sidebar en startscherm delen één lijst** (`components/navigatie.tsx`, `NAV_GROEPEN`):
  groepsnamen, pagina's, labels en iconen staan daar, en beide filteren met dezelfde
  `magTabbladZien` (`zichtbarePaginas`). Een gebruiker ziet op het startscherm dus precies
  de pagina's die hij in de sidebar ziet — dat was een expliciete eis. Een tabblad
  toevoegen of verplaatsen = één regel in `NAV_GROEPEN`; zet nooit een losse
  `NavigationItem` voor een groepspagina terug in `Sidebar.tsx`. Een groep zonder zichtbare
  pagina krijgt in de sidebar geen kopje en zegt op het startscherm dat in één regel.
- **Indeling en namen (november 2026, op verzoek):** de groep KPI's heet **KPI's 2027** met
  **KPI's Google Analytics** (`kpi-2027`), **KPI's Syntec** (`kpi-2027-syntec`), **KPI's social media** (`kpi-2027-social`) en **KPI's CRM** (`kpi-2027-crm`); **KPI's
  2026** (`kpi-overzicht`) staat in `VERBORGEN_TABBLADEN` (code blijft staan). Onder
  **Tools** staan **Syntec leads** (`leads-syntec`), **Selligent database** (`selligent`) en
  **Online leads** (`leads`, voor iedereen), plus Budget beheer en Landingspagina
  (ook verborgen). De paginatitels in `AppShell` (`TITLES`) volgen dezelfde namen. Waar
  hieronder nog "Leads Syntec", "Selligent", "KPI's 2027 GA" of "onder Kanalen" staat, gaat
  het over deze pagina's onder hun nieuwe naam en plek.
- **Naar het startscherm**: klik op de titel "Marketing dashboard" bovenaan de sidebar
  (horizontaal gecentreerd, met een witte streep eronder op 20% dekking —
  `bg-sidebar-ink/20`; geen subregel meer). Ingeklapt staat op die plek alleen de letter
  **M** als logo; bij uitklappen maakt hij plaats voor de titel. Er staat geen beeldmerk (`LogoMark`) meer in de sidebar, op verzoek. Zonder
  `?tab=` in de URL opent het startscherm; Campagnes is nu `?tab=campagnes`.
- **De illustraties** (`components/home/Illustraties.tsx`) zijn isometrische lijntekeningen
  in de stijl van technische "FIG"-figuren: dunne lijn in `currentColor`, vlakken in
  `--color-card`, dus ze wisselen vanzelf mee met elk theme. Bij hover over een blok beweegt
  er een paar pixels iets (`.iso-blok` / `.iso-beweeg` in globals.css: platen waaieren uit,
  kubussen met de tekens van Google Ads, Instagram, Google Analytics en LinkedIn komen
  omhoog (lijnversies, geen echte merklogo's), bij Interne data een serverkast waarvan de
  lades openschuiven naast een stapel klantkaarten die uitwaaiert, bij Campagnes een billboard met een autoadvertentie (we zijn een autodealer) dat iets
  omhoogkomt terwijl de auto erop een stukje naar rechts rijdt); uit bij
  `prefers-reduced-motion`. Houd die beweging klein.

### De campagnetabel

- Campagnes blijven **kolommen naast elkaar**, metrics blijven **rijen**; dit patroon
  nooit vervangen door aparte cards per campagne.
- Rijen zijn gegroepeerd in vaste volgorde: **Planning → Budget → Leads → Orders**
  (leads vóór orders, want orders is de laatste stap van de funnel), met daaronder, los
  van die funnel, **Conversies (Google Analytics)** (Doel conversies, Conversies — zie
  "Campagnebeheer → Google Analytics"). Leads en Orders heten "Leads (Syntec)" en
  "Orders (Syntec)", zodat de kop zegt waar het cijfer vandaan komt. Groepskoppen zijn
  klein, uppercase en subtiel (geen zware nadruk).
- **Een campagne meet óf Syntec óf Google Analytics** (`bronVanCampagne` in
  `lib/campagneBron.ts`, getest). Google Analytics zodra er een GA-koppeling of GA-doel
  is; Syntec zodra er leads zijn (meer dan nul) of een doel op leads of orders. Allebei:
  Google Analytics wint, want een koppeling is een bewuste keuze en een sheetveld kan
  een doorgetrokken formule zijn. De groepen van de andere bron tonen per cel "n.v.t."
  (niet bewerkbaar) en staan 20% doorschijnend (`opacity-80`), op verzoek — een lege of
  nul-cel zou lezen als "niets gehaald". Geen van beide ingevuld: niets gedimd.
- Sticky eerste kolom (metric-labels) én sticky kolomkoppen (campagnenamen), zodat je
  bij veel campagnes altijd weet naar welke metric en welke campagne je kijkt. Gebruik
  `border-separate` i.p.v. `border-collapse` op tabellen met sticky cellen — anders
  schemeren gescrollde cellen door de sticky cel heen (een Chromium-eigenaardigheid).
- Kolombreedte is bewust smal gehouden zodat zoveel mogelijk campagnes tegelijk
  zichtbaar zijn zonder te hoeven scrollen — ga hier niet zomaar weer breder in tenzij
  de inhoud het echt niet meer toelaat.
- **Geen hover-kleurverandering** in de tabel (bewust verwijderd op verzoek) — de tabel
  reageert niet visueel op muisbeweging.
- Merk wordt getoond als monochroom logo (Volkswagen Groep-merken: Audi, Volkswagen,
  Volkswagen Bedrijfswagens, Škoda, SEAT, plus Porsche en Bentley — zie
  `components/brandLogos.tsx`) in plaats van tekst, zodra het merk herkend wordt.
  Onbekende of niet-specifieke waarden (zoals "Alle") blijven gewoon tekst. Logo's
  zijn altijd één kleur (`currentColor`), nooit
  multicolor.
- Elke campagnekop opent het **besluitenlogboek** van die campagne op twee gelijkwaardige
  manieren: een klik op de campagnenaam zelf, of het subtiele "logboek"-knopje ernaast
  (`components/CampaignNotes.tsx`). Beide openen dezelfde zijbalk (`components/
  Drawer.tsx`) die van rechts uitklapt over de volle schermhoogte en ongeveer een derde
  van de breedte, met `components/notities/NotitieLijst.tsx` erin — die open-state leeft
  daarom op één plek, in `components/CampaignHeader.tsx`. Dit is de **enige** plek in het
  dashboard waar aantekeningen worden toegevoegd of bekeken; er is bewust geen los paneel
  onder de tabel meer (de vroegere "Focusmodus" is vervangen door deze zijbalk). Elke
  regel in het logboek is een observatie, hypothese, besluit of actie (`lib/notities.ts`),
  met een avatarfotootje + naam van wie hem toevoegde (`components/Avatar.tsx`,
  `lib/profielen.ts`) — herleidbaarheid is het hele punt. Het invoerveld staat bovenaan
  (bewust duidelijk: dat is waar je typt), de lijst eronder toont nieuw-naar-oud. Bij een
  hypothese of besluit vraagt de UI om de metriek die erdoor moet veranderen en legt hij
  de stand van dat cijfer op dát moment vast; de regel eronder toont later "toen → nu" met
  het verschil. Zonder dat nulpunt (oudere aantekeningen) wordt er niets verzonnen, dan
  blijft alleen de metrieknaam staan. Acties zijn af te vinken. De naam is alleen
  klikbaar en het knopje verschijnt alleen als Supabase geconfigureerd is — zonder
  database is er niets om in op te slaan.
- **"Zo lees je dit"** (knop in de filterbalk, standaard uit): zet een leeswijzer boven
  de tabel en een zin in gewone taal onder elk metriclabel. Die uitleg staat als veld
  `uitleg` op elke metric in `CampaignTable.tsx` — een nieuwe rij toevoegen zonder
  uitleg valt daardoor meteen op.
- Pop-ups (`components/Modal.tsx`) en de uitklapbare zijbalk (`components/Drawer.tsx`)
  renderen via een React-portal naar `<body>`, niet op hun eigen plek in de boom. Reden:
  een knop die vanuit een sticky tabelkop opent (zoals de aantekeningen-knop) zit zelf
  in een sticky stacking context, en dan wint een hoge z-index niet meer van een andere
  sticky cel elders in de tabel — stacking contexts worden alleen met siblings
  vergeleken, niet globaal. Iets vergelijkbaars gold eerder al voor `FilterSelect`'s
  dropdown (die moest naar `z-40` boven de tabel's `z-30`) en voor de tabel zelf
  (`border-separate` i.p.v. `border-collapse`, zie hieronder) — kom je een derde keer
  zoiets tegen, denk dan eerst aan een portal in plaats van weer een hogere z-index te
  proberen.

### Databestand van de tabel

- **Primaire waarde** (bv. een bedrag of aantal): iets zwaarder gewicht, donkere
  inktkleur.
- **Secundaire regel** eronder: kleiner, gedempte kleur — een afwijking t.o.v. doel in
  mensentaal ("+445 boven doel", "−35 onder doel") in plaats van een kaal percentage
  ("465 (2325%)"). Groen voor positief, rood voor negatief — altijd gedempt, nooit
  neonkleurig.
- **Progress bars** alleen tonen als er een echte doelwaarde is; anders een neutrale
  "—". Bars zijn klein, dun, afgeronde uiteinden.
- Nederlandse getalnotatie overal (`nl-NL`, punt als duizendtal, komma als decimaal).
  Cijfers in een tabel lijnen uit: `font-variant-numeric: tabular-nums` staat in
  `globals.css` op `table` — bewust niet op `body`, want in lopende tekst zijn
  tabellaire cijfers juist te wijd.
- De ondersteunende regel onder een waarde gebruikt `text-meta` (eigen maat plus
  regelafstand), niet `text-xs`.

### Kleuren, typografie, spacing

- Design tokens staan in `app/globals.css` (`@theme` blok, Tailwind v4): elke
  `--color-*`, `--radius-*` en `--shadow-*` token genereert automatisch de
  bijbehorende utility (`--color-surface-tint` → `bg-surface-tint`, enzovoort). Voeg
  nieuwe kleuren als token toe in plaats van losse arbitrary-waardes (`bg-[#fbfaf8]`)
  door de code te verspreiden.
- Basispalet: warme, bijna-witte paginakleur (`--color-page`) achter witte kaarten
  (`--color-card`), donkere navy sidebar, gedempte grijstinten voor secundaire tekst,
  zachtgroen/rood alleen voor status en afwijkingen. Geen gradients, geen
  glassmorphism, geen overdaad aan blauwe vlakken.
- Borders zijn extreem subtiel (`--color-line`, `--color-line-soft`) — gebruikt om
  structuur te geven (tabelgroepen, cards, controls), niet om elke cel zwaar te
  omlijnen.
- Radius-systeem: `--radius-control` (8–10px) voor kleine controls, `--radius-button`
  voor knoppen en invoervelden (de vorm die per merk het sterkst verschilt: pil bij
  Udenhout/Volkswagen, 4px bij Porsche, 0 bij CUPRA), `--radius-card` (16px) voor
  cards, `--radius-panel` (20px) voor grotere panelen, `--radius-pill` alleen waar een
  vorm echt altijd een pil is (de progress bar) — niet overal pillvormig maken.
  `--radius-avatar` voor avatars en het beeldmerk (rond bij de merken met een ronde
  vormtaal, hoekig bij Porsche/CUPRA/Bentley). Shadows zijn subtiel en lopen in vier
  hoogtes (zie "Themes" hieronder), nooit een zware drop-shadow.
- Typografie: `TheSansB` (huisstijl) met Inter als geladen fallback via
  `next/font/google`. Sectiekoppen (zoals "PLANNING") zijn klein, uppercase, met iets
  verhoogde letter-spacing en gedempt — ondersteunend, niet dominant. Lettergroottes
  lopen via tokens (`--text-xs/sm/base` plus `--text-label`, `--text-cell`,
  `--text-title`), niet via arbitrary waardes als `text-[15px]` — anders kan een theme
  ze niet verzetten.
- Tekst bovenop een gekleurd vlak: `text-on-primary` (niet `text-white`) en
  `text-on-logo` voor het "AI"-beeldmerk. Niet elk merk heeft een donkere primaire
  kleur: op Škoda's Electric Green en CUPRA's koper hoort juist donkere tekst.

### Themes (het oogje rechtsboven)

Rechtsboven in het scherm staat een oog-icoon (`components/ThemeSwitcher.tsx`) waarmee
je de vormgeving van het hele dashboard omzet: de huisstijl van Udenhout zelf, of die
van Volkswagen, Audi, Škoda, SEAT, CUPRA, Porsche, Pink Porsche of Bentley.

Eén theme is geen automerk maar één auto: **Pink Porsche** is de lichtroze 911 GT3 RS —
dezelfde technische vormtaal als het Porsche-theme (Barlow, 4px-radii, het raster, het
korte bewegingsritme), maar met een roze studiovlak, zwart als inkt- en navigatiekleur en
magenta (#d5006e) als enige accent. Hij hergebruikt bewust het Porsche-font en het
Porsche-logo (sleutel `pink-porsche` in `brandLogos.tsx`): het is dezelfde auto, andere
lak.

- **Hoe het werkt.** `components/ThemeProvider.tsx` zet `data-theme="…"` op `<html>` en
  bewaart de keuze in localStorage; een klein inline script in `app/layout.tsx` zet dat
  attribuut al vóór de eerste paint, zodat je geen flits van het standaardtheme ziet.
  Per theme staat er in `app/globals.css` een `[data-theme="…"]`-blok dat de tokens
  overschrijft. Die blokken staan bewust **buiten** `@layer`: Tailwind zet zijn eigen
  tokens in `@layer theme`, en ongelaagde CSS wint altijd van gelaagde CSS.
- **Per gebruiker onthouden.** Voor een ingelogde collega staat de keuze ook op zijn
  profiel (`dataloket.profielen.theme`, `supabase/migrations/0010_profiel_theme.sql`),
  naast naam en avatar (zie `lib/profielen.ts`, `app/api/profiel/route.ts`). localStorage
  blijft de bron vóór de eerste paint en voor wie niet ingelogd is; `ThemeProvider` haalt
  het profieltheme daarna async op en neemt het over als het afwijkt (net als elders in
  de app een profielveld pas na een fetch verschijnt — een korte flits van het
  lokale/standaardtheme is dus mogelijk), en schrijft bij `kiesTheme` zowel naar
  localStorage als (best-effort, ook zonder sessie) naar `/api/profiel`. Zo geldt de
  keuze ook op een ander apparaat of na opnieuw inloggen.
- **Waarom het overal werkt.** Elk component gebruikt uitsluitend de semantische tokens
  (`bg-card`, `text-ink`, `border-line`, `rounded-button`, `font-sans-w7`, …). Zolang
  dat zo blijft, hoeft nieuwe UI niets van themes te weten en verandert hij vanzelf
  mee. Een hardgecodeerde `bg-[#ffffff]` of `text-white` breekt precies dat.
- **Een theme is meer dan kleur.** Font, lettergrootte, letterspatiëring, kapitalen,
  hoekradius en schaduw horen er net zo goed bij; een theme dat alleen kleuren verzet
  ziet er niet uit als dat merk. De typografische eigenschappen die geen Tailwind-
  utility hebben (`--theme-title-*`, `--theme-label-*`, `--theme-body-tracking`) worden
  toegepast via de classes `.titel-theme` en `.label-theme`.
- **Ook ondergrond, beweging en vorm zijn merkeigen.** Naast kleur en typografie verzet
  een theme:
  - `--theme-page-patroon` (+ `-maat`): één textuur op het paginavlak — een technisch
    raster bij Porsche, diagonale hairlines bij CUPRA, het knurling-ruitje bij Bentley,
    een licht verloop bij Volkswagen/Audi/Škoda, drukkorrel (inline SVG-ruis) bij
    Udenhout en SEAT. Houd het bij **één** signaal per merk: patroon én korrel én
    verloop tegelijk maakt het onrustig in plaats van rijk. De class staat zowel op
    `body` als op `.pagina-vlak` (de schil in `AppShell` legt een eigen achtergrond over
    de body heen).
  - `--theme-sidebar-verloop` (`.sidebar-vlak`): verloop over de donkere navigatieschil.
  - `--duur-snel` / `--duur` / `--duur-traag` + de utility `ease-merk`: beweging hoort
    bij het merk (Porsche en CUPRA kort en abrupt, Bentley traag en zwaar). Gebruik
    `duration-[var(--duur-snel)] ease-merk` in plaats van een vaste `duration-150`.
    `--duur-adem` doet hetzelfde voor de ademende statusdot.
  - Vier schaduwhoogtes: `--shadow-subtle` (rustend paneel) → `--shadow-card` (het
    dragende paneel) → `--shadow-raised` (onder de muis) → `--shadow-dropdown` /
    `--shadow-modal`. Op de donkere themes zit in die tokens een inset-haarlijn licht
    op de bovenrand: op zwart komt diepte van licht, niet van schaduw — en omdat het in
    de token zelf zit, hoeft geen enkel component ervan te weten.
  - `.kaart-accent` (accentlijn bovenop een dragend paneel; een **border**, want die kan
    niet door een sticky tabelkop worden overdekt), `.kaart-omlijst` (de gouden
    binnenlijn van Bentley, elders transparent), `.kaart-hover` (een fractie omhoog bij
    hover — nooit in de campagnetabel, die reageert bewust niet op muisbeweging) en
    `.laadvlak` (glans over een laadvlak in de merkkleur).
  - `--theme-nav-radius` / `--theme-nav-streep`: de vorm van het actieve item in de
    sidebar (pil bij Volkswagen, streep links bij Porsche en CUPRA, gouden haarlijn bij
    Bentley) en `--theme-progress-maatstreep` voor de maatstreepjes in de progress bar.
  - `--color-selectie` (geselecteerde tekst), `--focus-ring*`, `--radius-avatar` en
    `--scrollbar-dikte`: kleine dingen die in élk theme kloppen moeten, anders valt juist
    daar het browserblauw of een ronde avatar uit de toon.
- **Het merklogo staat in beeld.** Staat het dashboard in de vormgeving van een automerk,
  dan toont `LogoMark` in de sidebar het logo van dat merk (opgezocht in
  `brandLogos.tsx`, want de theme-id's zijn dezelfde sleutels) in plaats van het
  auto-icoon; hetzelfde logo staat in het themamenu. Udenhout en CUPRA houden het
  auto-icoon — voor CUPRA zit er (nog) geen logo in de set.
- **De themewissel vloeit over.** `kiesTheme` draait de wissel door
  `document.startViewTransition` als de browser dat kent en de gebruiker geen
  `prefers-reduced-motion` heeft staan; anders wisselt het theme gewoon direct. Het is
  dus altijd een toevoeging op het gewone pad, nooit een voorwaarde.
- **Twee donkere themes** (Audi en CUPRA) draaien het hele scherm om. Controleer bij
  nieuwe UI dus altijd even één van die twee: een vlak dat alleen op wit getest is,
  valt daar door de mand.
- **Fonts.** De huisstijlletters van de merken zijn geen van alle vrij te gebruiken; in
  `app/layout.tsx` staat per merk de dichtstbijzijnde vrije benadering (DM Sans, Archivo,
  Manrope, Fira Sans, Saira, Barlow, Jost + Cormorant Garamond) met een toelichting
  waaróm die is gekozen. Ze laden met `preload: false`, zodat een bezoeker alleen het
  font van zijn eigen theme binnenhaalt.
- **Grafieken** kunnen geen CSS-variabelen lezen (Recharts zet kleuren als
  SVG-attribuut), dus het palet per theme staat in `lib/themes.ts` en wordt opgehaald
  met `useGrafiekKleuren()`. Daar staat niet alleen kleur maar ook vorm: `lijndikte`,
  `lijnvorm` (vloeiend of recht), `punt` (gevuld, open of vierkant) en `staafradius` —
  Bentley tekent een haarlijn met een open ring, Porsche en CUPRA recht met een vierkant
  punt, Volkswagen dikke pilvormige staven. Nieuw theme = een blok in globals.css + een regel in
  `lib/themes.ts`; verder hoeft er niets te veranderen.

### De Kanalen-pagina's

De zes tabbladen onder **Kanalen** (Social ads, Google Ads, Social organisch, Social
accounts, Website, Koppeltabel) delen één component (`components/kanalen/KanaalPagina.tsx`)
— Leads staat ook onder Kanalen (Leads Syntec en Selligent sinds november 2026 onder
Tools); die hebben een eigen paneel:
filterbalk, grafiek, tabellen. Wat per pagina verschilt staat in de props. Een paar keuzes die daar
niet uit af te lezen zijn:

- **De campagnetabel op het tabblad Campagnes staat er visueel buiten.** Die pagina is
  bevroren op verzoek; verbeteringen aan de Kanalen-pagina's mogen er niets aan
  veranderen. `FilterSelect` wordt door allebei gebruikt en heeft daarom een opt-in prop
  `zoekbaar` in plaats van een zoekveld dat overal vanzelf verschijnt — vier korte
  lijstjes boven de campagnetabel hebben er niets aan, honderden campagnenamen wel.
- **Wat een cijfer ís, bepaalt zijn vorm.** Een afgeleide (CTR, kosten per klik) en een
  **stand** (`kubus.standKolommen`, in de praktijk het aantal volgers) tekenen als lijn
  met een as op `['auto','auto']`; een optelbare hoeveelheid als staaf vanaf nul. Een
  volgersstand als staaf vanaf nul verstopt precies de groei waar de pagina voor bestaat.
- **Bereik staat op géén enkele kanaalpagina, en dat is een besluit.** Het platform telt
  daar verschillende mensen en doet dat per opgevraagde dag opnieuw — wie op drie dagen
  keek zit in drie dagrijen. Wij bewaren dagcijfers (dat is de hele opzet: alleen zo is
  elke periode achteraf nog te bevragen), dus elke optelling die wij maken komt hoger uit
  dan het bereik dat de advertentiebeheerder over diezelfde periode toont. Beter optellen
  helpt niet; het echte periodebereik bestaat alleen in een opvraging zónder dagkorrel.
  Een cijfer dat per definitie nooit met het platform overeenkomt hoort niet op een pagina
  die juist bedoeld is om ernaast te leggen, dus bereik en de frequentie die erop deelde
  staan niet in `lib/windsor/velden.ts` en de kanaalqueries in `bron.ts` halen de kolom
  niet meer op. De sync blijft hem wél wegschrijven: de data gaat niet verloren, hij wordt
  alleen niet getoond. De interactieratio op Organisch deelt daarom op vertoningen in
  plaats van op bereik — dezelfde teller op een grotere noemer, dus lagere percentages dan
  vroeger. Terugzetten kan alleen samen met een aparte opvraging van het periodebereik bij
  het platform zelf.
- **De periode loopt tot en met gisteren** (`periodeGrenzen`) omdat de sync 's nachts
  draait, en de korrel volgt de lengte van die periode (`bruikbareKorrels` en
  `standaardKorrel` in `lib/kanalen/kubus.ts`) — nooit het aantal dagen waarop er
  toevallig data is, want dan bepaalt je postfrequentie welke knoppen aanklikbaar zijn.
  Een eerste of laatste periode die maar half in de range valt draagt `volledig: false`
  en wordt in de grafiek lichter getekend met een zin eronder.
- **Groeperen gaat op een id, niet op een naam.** `advertentie_id` en `post_id` zijn
  dimensie; de leesbare naam komt via `labelVeld` uit `kubus.meta`. Op naam groeperen
  liet twee advertenties die toevallig hetzelfde heten tot één regel samenvallen.
- **Wat het platform niet levert, staat er niet.** Google schrijft `leads` hard op nul en
  Meta `conversies`; in beide gevallen zit het cijfer in de conversie-acties die het team
  aanwijst. Zolang die keuze er niet is, verdwijnen die kolommen met hun afgeleiden van de
  pagina (`verbergZonderConversieLeads` op Google Ads, `verbergZonderConversieActies` op
  Social ads). Een lege cel leest als "nul", niet als "meten we hier niet".
- **Elke tabel heeft een plakkende totaalregel** die over de rijen telt en niet over de
  regels erboven — bij een afgeleide is dat een ander getal. Is de detailquery afgekapt
  (`kubus.afgekapt`), dan staat dat er expliciet bij, want dan telt de tabel lager uit
  dan de KPI boven de grafiek.
- **De filterbalk toont hoe vers de cijfers zijn** (laatste sync + tot welke dag er data
  is) en zet de actieve filters als losse chips onder de balk. De "+" voor een bericht
  staat ook op deze tabbladen (`TEAM_VIEWS` in `AppShell`): je legt een observatie vast
  op het beeld waarop je hem doet, niet op een ander tabblad. De balk heeft twee rijen:
  boven **waar je naar kijkt** (periode, versheid, filters), onder **hoe je kijkt**
  (vergelijken, alle kanalen), de chips en de acties.
- **Vergelijken met de vorige periode is een tweede ophaalactie en staat daarom uit.**
  Aanzetten haalt dezelfde kubussen op over de even lange periode die eindigt op de dag
  vóór de huidige (`vorigePeriode` in `lib/kanalen/periode.ts`), en zet het verschil bij
  elk kerncijfer, in de grafiek (gedempte tweede reeks, op **positie** uitgelijnd en niet
  op datum) en onder elke tabelcel. De kleur zegt "gunstig", niet "hoger": bij kosten per
  klik is een daling het goede nieuws (`lagerIsBeter`), en uitgaven krijgen bewust
  helemaal geen oordeel. Zie `lib/kanalen/vergelijk.ts`, dat pure rekenkunde blijft en
  daarom alleen een type importeert — het optellen en het uitrekenen van een afgeleide
  gebeurt op één plek, in `kubus.ts`.
- **De kerncijferstrip boven de grafiek** (`KerncijferStrip.tsx`) toont de zes
  `standaard`-statistieken met een sparkline en hun verschil; één klik zet de grafiek
  eronder op dat cijfer. De grafiek toont bewust nog steeds één statistiek tegelijk —
  twee assen in één beeld suggereren een verband dat er niet is — maar het uitklapmenu is
  niet meer de enige weg ernaartoe.
- **Naast de vaste periodes staat een eigen periode**, en twee kalenderperiodes ("deze
  maand", "vorige maand") omdat een marketingbudget per maand loopt. Periode, filters en
  het open tabblad staan in de URL (`lib/kanalen/urlstand.ts`), zodat een selectie een
  refresh overleeft en te delen is. Alleen het zichtbare tabblad schrijft — alle panelen
  blijven gemount, dus zonder `useIsActief` overschrijven ze elkaars parameters.
- **Elke advertentiepagina toont precies zijn eigen kanalen.** Social ads is Meta plus
  LinkedIn, Google Ads is Google, en er is geen weg om daar iets anders in te krijgen. Er
  zat een schakelaar "Alle betaalde kanalen" die de drie in één kubus zette met `kanaal`
  als extra dimensie (`pagina=betaald`); die is er in september 2026 uit gehaald. Reden:
  de schakelaar stond grijs in de balk met de tekst "Alleen Google Ads" — wat leest als
  een knop die je nog moet indrukken — en één klik zette Meta- en LinkedIn-regels onder
  een filter "Kanaal" op een pagina die "Google Ads" heet en in de kop Search, Pmax,
  Demand Gen en Display belooft. Een pagina hoort te tonen wat hij belooft. Zet hem dus
  niet terug zonder dat daarom gevraagd wordt; wie budget over kanalen heen wil
  vergelijken, stelt die vraag in de chat, die leest dezelfde tabel.
- **"Wat opvalt" rekent binnen de gekozen periode** (`lib/kanalen/signalen.ts`): het
  laatste derde tegen de twee derde ervoor, allebei per dag. Bewust niet tegen de vorige
  periode, want die staat standaard uit — en een signaal dat pas verschijnt als je een
  schakelaar omzet, is geen signaal maar een tweede tabblad. Elke regel eist zowel een
  relatieve afwijking als een absolute ondergrens, en de lijst staat op **gewicht** en niet
  op percentage: een campagne van tienduizend euro met 30% duurdere leads is een groter
  probleem dan eentje van driehonderd die verdubbelde. Een signaal is klikbaar en zet het
  filter op dat onderwerp — zo is de lijst een ingang tot de pagina en geen apart
  dashboard. Er staat niets als er niets te melden is: een blok dat elke week "geen
  bijzonderheden" zegt, valt niet meer op in de week dat het wél iets zegt.
  Zit niet als balk boven de cijfers, maar achter een lampje rechtsboven in het scherm
  (`components/icons.tsx` → `IconLightbulb`), links naast het oogje van de themewissel —
  vaste plek, net als dat oogje. Een klik opent de lijst in een zijbalk (`Drawer.tsx`,
  zie `KanaalPagina.tsx`). Het lampje verschijnt alleen op de pagina's met een
  `signaalDimensie` (Social ads, Google Ads, Social accounts) én alleen als er ook echt
  iets te melden is (`heeftSignalen` in `KanaalPagina.tsx`) — een knop naar een lege
  zijbalk is een doodlopend pad. Social organisch heeft bewust geen signalen: een losse
  post "loopt" niet zoals een campagne, dus "deze campagne viel stil" zegt daar niets.
- **Wat een lead is en wat een conversie, legt het team zelf vast.** Twee gaten in de
  data, twee vinkjes. Google levert geen leadveld; Meta levert geen conversieveld. Wat het
  wél zijn, staat in de conversie-acties die marketing in Google Ads, GA4 en Meta heeft
  ingesteld, en die staan per rij in de jsonb-kolom `conversie_acties`. Op de Koppeltabel
  staat daarvoor het blok **Conversie-acties**: twee kolommen (`telt_als_lead`,
  migratie 0016, en `telt_als_conversie`, migratie 0019) op de catalogus die de sync al
  bijhoudt — geen tweede tabel ernaast, want dat zou een tweede waarheid over dezelfde
  velden zijn. `bron.ts` (`ActieKeuze`, `bouwActieSql`) telt ze per rij op uit de jsonb.
  - **Leads: optellen, niet vervangen.** Bij Meta zit `actions_lead` al in de leadkolom en
    komen de vaste actievelden nooit in de jsonb terecht. Hetzelfde véld kan dus niet twee
    keer meetellen; dezelfde **gebeurtenis** wél — Meta's `lead` is zelf al een optelsom
    (leadformulieren, Messenger én de pixel op de site), dus een Meta-actie aanvinken die
    daar onderdeel van is telt één formulier twee keer. Vuistregel: bij Meta alleen
    aanvinken wat Meta zelf niet al onder `lead` schaart; bij Google is de aangevinkte
    actie juist het hele leadcijfer.
  - **Conversies: alleen Meta.** De sync schrijft voor Meta nul in de conversiekolom. Dat
    was eerder de som van álle maatwerkacties, en dat getal stond in Ads Manager nergens
    en telde bovendien dubbel (één formulier dat zowel een pixelconversie als een
    leadactie afvuurt). Google en LinkedIn leveren wél een eigen conversietotaal, en bij
    Google zitten deze acties daar al in — een Google-actie erbij optellen zou hem dubbel
    tellen. `gekozenActieVelden` filtert de conversielijst daarom op `bron = 'meta'`, en
    de UI zet het vinkje alleen aan bij Meta-rijen. Die grens staat bewust op allebei de
    plekken: een vinkje dat er per ongeluk toch staat mag geen verkeerd cijfer opleveren.
  - Zolang er niets is aangevinkt verdwijnen de betreffende kolommen van de pagina, in
    plaats van als nul te verschijnen.
  - **Verhoudingen horen er niet tussen.** Windsor biedt naast elke actie ook zijn
    percentage aan (`conversions_from_interactions_rate` is het conversiepercentage, geen
    aantal). Die stonden gewoon in de keuzelijst en waren aan te vinken als lead, waarna
    er percentages bij aantallen werden opgeteld. `isVerhouding` in `velden.ts` houdt
    alles tegen dat op `_rate` of `_ratio` eindigt; migratie 0020 haalde ze uit de rijen
    die er al stonden.
- **Boven de vinkjes staat waar de cijfers vandaan komen** (`HerkomstPaneel.tsx`,
  `haalHerkomst` in `bron.ts`): per platform wat het platform zelf levert, wat de
  aangewezen acties erbij leggen, en het totaal dat de kanaalpagina's tonen. Waar we weten
  hoe een platformgetal is opgebouwd staan de onderdelen eronder — Meta's leadveld is de
  som van zijn leadformulieren en zijn pixel-leads (`META_LEAD_ONDERDELEN`), Google's
  conversietotaal komt uit de conversie-acties die daar zijn ingesteld.
  - **Het rekent na, en dat is het punt.** De regel "niet verklaard" is het verschil
    tussen de getoonde onderdelen en het platformgetal. Bij Meta hoort daar nul te staan;
    bij Google is het verschil precies wat buiten "Opnemen in conversies" is gehouden.
    Gaat Meta ineens afwijken, dan is er iets veranderd aan de andere kant van de
    koppeling en zie je dat hier als eerste. `META_LEAD_ONDERDELEN` is een aanname over
    wat Meta doet, dus die aanname wordt nagerekend in plaats van geloofd.
  - **Er komt geen cijfer bij.** `totaal` is exact wat de kanaalpagina's al tonen. Dit
    blok splitst dat uit; het is nadrukkelijk geen derde waarheid over dezelfde getallen.
    Zet er dus ook nooit een KPI-tegel van.
- **Het tabblad Website (GA4) is de enige pagina met vier kubussen.** Alle andere
  kanaalpagina's hebben er twee (`reeks` en `detail`) die dezelfde rijen anders samenvatten.
  GA4 kent geen rij waarin een sessie, een pagina en een event tegelijk passen: één sessie
  raakt tien pagina's en elke pagina vuurt vijf events. `haalWebsite` in `bron.ts` levert
  daarom vier écht verschillende kubussen, en `KanaalAntwoord.extra` draagt de laatste drie.
  Een `TabelConfig` wijst met `bron` aan welke hij leest en brengt zijn eigen
  `statistieken` mee — "Sessies" in de tabel Pagina's betekent iets anders dan "Sessies" in
  de tabel Kanalen, en dat staat in allebei de `uitleg`-teksten.
  - **Een filter dat ergens niet kan werken, zegt dat.** `website` en `kanaalgroep` zitten
    in alle vier de kubussen, `campagne` in twee, `bron_medium` en `apparaat` alleen in het
    verkeer. `filter()` slaat een dimensie die een kubus niet kent stilzwijgend over, en dan
    verspringt de bovenste helft van het scherm wel en de onderste niet. `zonderDimensies`
    op een tabel zet er daarom een zin achter de toelichting zodra zo'n filter actief is.
    Voeg je een dimensie toe aan één kubus, vul dan ook die lijst bij.
  - **Gebruikers telt niet exact op, en dat is hier anders opgelost dan bij bereik.** GA4
    ontdubbelt gebruikers binnen de opgevraagde periode; wij bewaren dagcijfers, dus wie op
    drie dagen kwam telt drie keer. Precies de reden waarom bereik van de
    advertentiepagina's is gehaald. Hier staat het cijfer er tóch, omdat "hoeveel
    gebruikers" de eerste vraag is die iemand aan GA4 stelt en een tabblad dat hem niet
    beantwoordt marketing terugstuurt naar GA4 — wat dit tabblad juist moest voorkomen. De
    waarheid staat in de `uitleg` van het cijfer én in de leeswijzer. Wie het exacte
    periodecijfer nodig heeft, kiest één dag of leest **nieuwe gebruikers**, dat wél
    optelt. Draai deze afweging niet om zonder het ook in beide teksten te wijzigen.
  - **Twee kruisingen halen we niet op, om de rijen.** Bron/medium bij een landingspagina
    verdubbelt die tabel; de pagina bij een event springt van ±4.000 naar ruim 100.000
    rijen per dag op één property, want vrijwel elk pad vuurt page_view, scroll,
    session_start en user_engagement. Per pagina staat er dus wél hoeveel key events er
    vuurden, maar niet welke — de tabel Conversies geeft de namen over de hele site. Zie
    de kop van `supabase/migrations/0025_windsor_ga4.sql`.
  - **Hier staat wél een limiet op de detailquery** (`GA4_DETAIL_LIMIET`, 3.000 regels),
    terwijl die bij de advertenties juist is weggehaald. Andere schaal: een dealergroep
    heeft een paar duizend advertenties per jaar en tienduizenden verschillende paden per
    maand, want elke voorraadauto is er één. De grens valt op de minst bekeken pagina's en
    de tabel meldt het via `kubus.afgekapt`.
  - **De signalen rekenen hier op volume in plaats van op geld.** `signalen.ts` heeft geen
    `uitgaven` op deze kubus, dus de drempel en het gewicht zijn het aantal sessies
    (`drempelSessies`). Twee regels: wegzakkend verkeer per kanaal, en een gedaalde
    conversieratio bij gelijk verkeer — die tweede alleen als de eerste niet vuurde, want
    minder bezoek én minder conversies is één gebeurtenis en geen twee.
  - **Drie ingangen, en dat is bewust geen één.** Er is gevraagd of Website in tabbladen
    moest en of er een filter "pagina" bij kon; allebei is er niet gekomen, en dat is een
    besluit dat uitleg verdient voordat iemand het terugdraait.
    - **Geen sub-tabbladen.** Het dashboard kent één regel tegen dubbele navigatie (zie
      "Structuur van het scherm"), en belangrijker: de waarde van deze pagina zit in de
      ketting *dit kanaal → landde op deze pagina → deed dit*. In vier tabbladen moet de
      marketeer die ketting in zijn hoofd bijhouden, en voor het losse overzicht per
      onderdeel is GA4 zelf al prima. Wat er wél mis was — negen tabellen zonder
      zichtbare structuur — is opgelost met **sectiekoppen** (`TabelConfig.sectie`) en
      **inklapbare tabellen** (`inklapbaar` / `standaardOpen`), waarvan de helft dicht
      staat. Dichtgeklapt blijft de kop staan mét regelaantal en toelichting, dus die rij
      leest als een inhoudsopgave in plaats van als verstopte inhoud.
    - **Geen globaal paginafilter, wel een zoekveld per tabel** (`zoekbaar`). Een
      pagina-pad zit alleen in de paginakubus, dus een globaal filter zou acht van de
      negen blokken onaangeroerd laten en tóch de indruk wekken dat het hele scherm
      meebewoog. Het zoekveld filtert de **rijen** en niet de zichtbare groepen, zodat de
      totaalregel, de groepen en de vergelijking met de vorige periode over dezelfde
      verzameling blijven rekenen — anders stond er "3 regels" boven een totaal van
      drieduizend. Het blijft zichtbaar zolang er een zoekterm staat, ook dichtgeklapt.
    - **Een klik op een regel splitst hem uit in de zijbalk** (`uitsplitsing`,
      `UitsplitsingPaneel.tsx`). Dat is het antwoord op "hoeveel mensen stapten in op deze
      campagnelandingspagina en via welke kanalen": die kolommen zitten al in de
      landingskubus, alleen niet in dezelfde tabel. Het paneel hergroepeert de rijen die
      de tabel al toonde — geen tweede ophaalactie, geen nieuw cijfer, en het volgt de
      actieve filters. Haal daar dus nooit iets apart op.

- **De rij smal houden gaat vóór een slimme index.** Twaalf maanden op Social ads en
  Google Ads liep tegen "canceling statement due to statement timeout" aan, en de weg
  naar de oorzaak is leerzamer dan de oorzaak zelf.
  - **Wat het was.** `windsor_advertenties` woog 283 MB bij 248.000 rijen, en 537 van de
    gemiddeld 785 bytes per rij waren `thumbnail_url`: de creative-URL, met 935
    verschillende waarden verspreid over zo'n 180.000 rijen. Die hoort bij de advertentie
    en niet bij de dag. Zo zwaar dat de tabel niet meer paste in het werkgeheugen van de
    database (`shared_buffers` is 224 MB) en elke jaaroptelling hem van schijf moest halen.
  - **De omweg die niet werkte.** Migratie 0022 zette daar een dekkende index tegenover,
    met alles wat de pagina's optellen erin. Op Google hielp dat (17,8 s → 1,4 s), op
    Social ads niet. Reden: een index only scan leest zijn kolommen uit de indexregel, en
    Postgres loopt zo'n regel attribuut voor attribuut door — elke kolom van variabele
    lengte moet hij vanaf het begin opzoeken. Bij twintig tekstkolommen wordt dat
    kwadratisch. Dezelfde 169.000 rijen: tellen via de smalle index 0,75 s, één kolom
    lezen via de dekkende index 8,42 s. Een dekkende index met veel tekstkolommen is dus
    geen gratis versnelling maar vaak een duurdere omweg.
  - **Wat het wel is.** Migratie 0023 haalt de creative uit de feitentabel en zet hem in
    `windsor_advertentie_creatives` (één rij per advertentie), gooit de dekkende index
    weg en zet er een smalle `(bron, datum)` voor in de plaats. Migratie 0024 gooit ook
    `..._campagne_idx` weg, die de planner verleidde tot een scan over álle bronnen omdat
    de rijen er gesorteerd uit kwamen. De tabel weegt nu 116 MB en past in het geheugen;
    een rij lezen is één doorloop in plaats van een doorloop per kolom. Twaalf maanden:
    Social 0,95 s + 1,6 s, Google 0,71 s + 1,1 s.
  - **Dus.** Zet de thumbnail niet terug in `windsor_advertenties` en niet in de `group by`
    van de detailquery; `v_advertenties` levert hem gewoon via een join, zodat de chatbot
    van de verhuizing niets merkt. En loop je hier weer tegen een trage jaaroptelling aan:
    kijk eerst naar het gewicht van de rij, en pas daarna naar indexen.
  - **Eén laag hoger** zet `metVerbinding` `work_mem` op 64 MB met `set local` in een
    expliciete transactie — een jaar past niet in de standaard, en dan valt de groepering
    terug op sorteren op schijf. `set local` en niet kaal, want `DATAQUERY_DATABASE_URL`
    wijst naar de transaction pooler en een kale `set` belandt daar op een verbinding die
    zo weer aan een volgend verzoek wordt uitgeleend.
  - **Terug in september 2026, en dit keer op scanmethode, niet op rijgewicht.**
    `windsor_advertenties` was intussen doorgegroeid naar 270.000 rijen (154 MB), en
    Budget beheer liep weer tegen "canceling statement due to statement timeout" —
    ditmaal op `maandRegels` in `bron.ts` (de query achter zowel `haalBudgetBeheer` als
    `haalBudgetMaanden`). De rij was nog steeds smal; het probleem was nu de planner zelf.
    Voor een periode van een paar maanden matcht 40-65% van de tabel (Meta + LinkedIn, geen
    Google), en dan kiest de planner de index op `(bron, datum)` terwijl die rijen niet
    fysiek geclusterd liggen op die kolommen — een indexscan leest dan bijna elke heaprij
    los van schijf/cache in plaats van in één keer door te lopen. Gemeten op de
    "eerdere maanden"-query (acht maanden, 117.000 van de 270.000 rijen): 11,4 s met de
    indexscan die de planner zelf koos, 5,6 s met een bitmap-scan, 1,3 s met een pure seq
    scan geforceerd via `enable_indexscan`/`enable_bitmapscan`. Die laatste twee staan nu
    met `set local` in `maandRegels` zelf, vlak voor de query — dezelfde plek en dezelfde
    reden als de `work_mem`-instelling erboven. Een seq scan kost hier steeds ongeveer
    hetzelfde (de tabel past ruim in `shared_buffers`) in plaats van duurder te worden
    naarmate de tabel groeit, dus dit is geen tijdelijke pleister maar de stabielere keuze.
    **Kijk hier dus als eerste** als deze pagina ooit wéér traag wordt vóórdat je een
    nieuwe index overweegt: `explain (analyze, buffers)` op de query, en vergelijk met
    `enable_indexscan/enable_bitmapscan` uit.
- **Budget en pacing komen uit de sheet.** De koppeling loopt over `sheet_campagne` in de
  koppeltabel; de route haalt daar budget, doelen en looptijd bij op en vraagt de uitgaven
  op over de **eigen looptijd** van de campagne — een budget is geen periodecijfer, dus
  het blok staat apart en niet als kolom in de campagnetabel. Het rekenwerk (verstreken
  tijd tegen benut budget) staat in `lib/kanalen/budget.ts`, zonder React en zonder
  database, en is daarmee getest.
- **"Data ophalen" staat alleen op de pagina Website**, rechtsboven links naast het
  lampje (`dataOphalen` op `KanaalPagina`). Hij is in september 2026 van alle
  Kanalen-pagina's gehaald en in oktober op verzoek alleen hier teruggezet, voor de
  historie van de GA-conversies per campagne. Hij haalt alleen de website op en
  **vult alleen aan**: `alleen_aanvullen` op de opdracht (migratie 0032) laat
  `schrijfBatch` `on conflict do nothing` doen, dus een rij die er al staat verandert
  nooit en er verdwijnt nooit iets. De vlag staat op de opdracht en niet in het verzoek,
  zodat ook een schakel die de cron later oppakt zo schrijft. Aanvullen bestaat alleen
  voor de website: route én `voerSyncUit` weigeren het voor andere delen in plaats van het
  stil te negeren. De nachtelijke sync blijft wél overschrijven (late toeschrijving);
  geen van beide verwijdert ooit een rij.
- **Testen zonder bundler.** `npm test` draait met `scripts/test-resolver.mjs`, een
  resolve-hook die het `@/`-alias en imports zonder extensie afhandelt. Zonder dat was een
  `lib/`-module alleen te testen als hij toevallig niets anders importeerde dan types, en
  dat is een rare eis aan juist de code die het rekenwerk doet.

### Tools → Online leads

Tabblad onder **Tools** (view `leads`, `components/leads/`, route `app/api/leads/route.ts`). Heette
"Leads" en was alleen voor de eigenaar; sinds eind november 2026 heet het **Online leads** en is het
**voor elke ingelogde collega** (verzoek van de eigenaar). Alleen de knop **Kostenverdeling** (de
handmatige kosten bewerken, `magKostenBewerken` op `LeadsPaneel`) en `/api/leads/kanaalkosten`
blijven voor de eigenaar; de bedragen tellen voor iedereen mee. Het laat de leads van udenhout.nl zien: offerte-, proefrit- en
andere aanvragen die als GA4-event met "lead" in de naam worden afgevuurd, met merk, model,
kanaal en — bij betaalde campagnes — wat daarvoor is uitgegeven.

- **Afbakening staat op één plek** (`lib/leads/bereik.ts`): GA4-property 255949462
  (udenhout.nl), Google Ads-account "Udenhout", Meta-account "Van den Udenhout",
  LinkedIn-account "Van den Udenhout Groep", **vanaf 1 juni 2026** (`LEADS_VANAF`) tot en met gisteren. Sync én route lezen het daar. Alleen deze property vuurt
  `generate_lead_*`; de andere properties van het concern leverden nul lead-events. Het
  aparte Google Ads-account "Van den Udenhout Lease" staat niet in de Windsor-sync.
- **De leadtabel bewaart alles vanaf 1 juni 2026** (`windsor_ga4_leads`, migratie 0033; verzoek
  van de eigenaar, november 2026 — daarvoor een rollend venster van dertig dagen). 1 juni ligt na
  de trackingwissel van eind maart, dus alleen de nieuwe eventnamen. ±10.000 rijen, een paar MB;
  de uitgavenquery over januari t/m november duurde 0,45 s. Op verzoek zo
  compact mogelijk, dus ook wat er *niet* in staat: geen uitgaven (die staan al in
  `windsor_advertenties` en komen via `v_leads_uitgaven` bij het lezen erbij), geen account,
  website, kanaalgroep of inleestijdstip, geen primary key en geen index (elke query leest
  de hele tabel; een index zou hem alleen verdubbelen). `aantal` is een smallint.
  Dubbele sleutels voorkomt `leadRijenUitWindsor`, dat ze optelt vóór het schrijven.
- **De sync vervangt alleen de laatste dertig dagen** (`syncGa4Leads` in `lib/windsor/sync.ts`,
  `leadsVenster`), zodat late toeschrijving van GA4 meekomt; ouder blijft staan. Mist het begin
  (eerste run, of lege tabel: `min(datum)` later dan 1 juni + een week), dan haalt hij eenmalig
  alles vanaf 1 juni op, in stukken van 31 dagen. Eerst
  ophalen, dan pas wissen en schrijven in één transactie. Faalt Windsor, dan staat gisteren's
  data er nog; een leeg antwoord is een fout (geen nul) en laat de tabel ongemoeid. Hij draait
  in het onderdeel `website`, **buiten** de stukken van dertig dagen (per stuk wissen zou elk
  stuk het vorige weggooien), niet bij "alleen aanvullen" (die knop mag niets vervangen) en
  alleen als de gevraagde periode gisteren bereikt (een inhaalronde over een half jaar
  geleden zegt niets over de laatste dertig dagen).
- **Parameters.** Merk, model en formulier (`customevent_car_brand`, `…car_model`,
  `…form_location`) zijn event-parameters die alleen op deze property bestaan, en alleen
  gevuld zijn op proefrit-, offerte-, private lease- en financieringsformulieren (±20% van
  de leads). De overige custom parameters (`filter_*`, `search_term`, `event_category` …) zijn
  op lead-events leeg en worden dus niet opgehaald. GA4 staat negen dimensies per opvraging
  toe; er zijn er zeven. Het formulier `model_titel` stuurt de naam van het veld mee in plaats
  van het model: dat telt als "onbekend" (`schoonParameter`), het merk blijft staan.
- **De koppeling loopt over platform én campagnenaam** (`lib/leads/koppel.ts`), niet over de
  naam alleen. Bing-verkeer in GA4 heeft dezelfde campagnenamen als Google ("T | Branding
  VDU"); op naam alleen kregen Bing-leads Google's kosten. De naam wordt genormaliseerd
  (hoofdletters, spaties, soort streepje: Meta schrijft een gedachtestreepje).
- **De totale uitgaven zijn de basis, en elke tabel telt erbij op.** Uitgaven bestaan per
  platform en campagne (een feit uit Google Ads en Meta); leads bestaan per lead. Onder het
  campagneniveau (merk, model, soort, formulier) is geld per lead dus een **indicatie**: de
  uitgaven van een campagne gaan gelijk over zijn leads (€ 500 en tien leads = € 50 per lead,
  ook voor een vacature- of proefritlead). Dat staat zo op het scherm. Omdat een campagne zonder
  lead geen merk of model heeft, staat zijn geld op een eigen regel **"Campagnes zonder
  lead"** onder die tabellen; rijen plus die regel zijn precies de totale uitgaven, en elke
  tabel heeft een **totaalregel** die álle rijen telt, ook die achter "Toon alle" (het totaal
  komt van buiten de tabel, niet uit de zichtbare rijen). `samenvatting.test.ts` rekent na dat
  dit voor merk, soort, formulier, model en kanalen optelt; er mag geen euro zoekraken.
- **De kanalentabel toont de echte uitgaven per platform** (`metPlatformUitgaven`,
  `uitgavenPerPlatform`), niet de toegerekende kosten: een platform dat € 32.827 uitgaf stond
  eerder op € 27.229 omdat campagnes zonder lead buiten beeld vielen, en dat was voor collega's
  onbegrijpelijk. Een platform zonder lead krijgt toch een rij.
- **Kosten per lead = kosten ÷ álle leads, betaald én onbetaald, op de hele pagina**
  (definitie van de eigenaar, november 2026): kerncijfer, grafiek, de kolom "Per lead" in elke
  tabel en de totaalregels. Wie de kosten per betaalde lead wil, kiest het filter **Betaald**.
  Rekenwerk in `samenvatting.ts` (getest): `kostenPerLeadAlle` (kerncijfer/totaal),
  `kostenPerLead` (een rij), `uitgavenVoorSelectie` en `echteUitgavenGelden`.
  - **Echte of toegerekende uitgaven.** Zonder filters, en ook met **alleen** Betaald, gelden de
    echte uitgaven (Google, Meta, LinkedIn en handmatig): onbetaalde leads hebben geen kosten, dus
    Betaald haalt geen euro weg. Dan tonen de kanalentabel de platformuitgaven, de andere tabellen
    de regel "Campagnes zonder lead" en de campagnetabel de campagnes zonder lead, zodat alles
    optelt tot het kerncijfer. Met Onbetaald of een ander filter (soort, kanaal, merk …) zijn het
    de toegerekende kosten van de selectie, zonder die regels.
  - **Een rij** deelt haar (toegerekende of platform)kosten door al haar leads; betaalde leads
    zonder bekende kosten (sterretje) tellen in de noemer mee. Geen bedrag (—) bij een rij zonder
    betaald verkeer of met alleen betaald verkeer zonder bekende kosten (Bing): nul zou "gratis"
    zeggen. De totaalregel van de campagnetabel is de som van de uitgaven ÷ de som van de leads.
  - Eerder stond er "kosten per betaalde lead" (uitgaven ÷ betaalde leads met een kostenbron,
    `kostenPerLeadTotaal`); dat is op verzoek overal vervangen. Zet het niet terug zonder dat
    daarom gevraagd wordt.
- **Betaald is niet hetzelfde als "kosten bekend".** Bing is betaald maar heeft hier geen
  kostenbron (`geen-bron`). LinkedIn heeft er wel een (klein: ± € 1.600 per maand, drie
  campagnes), maar de UTM-naam in GA4 is een korte slug ("vriendenprijs") terwijl de campagne
  bij LinkedIn "VW Bedrijfswagens - Vriendenprijs - 2026" heet: die koppelt niet, wat bewust niet
  met raden wordt opgelost. Het geld staat dan wél in het totaal (als "zonder lead"). Een
  betaalde lead met een campagne die bij Google of
  Meta niet bestaat (`(not set)`, een andere naam) is `geen-match`. Beide krijgen
  `kosten: null` en staan in de UI als "onbekend", nooit als € 0: nul zou beweren dat het
  gratis was. "Kosten per betaalde lead" deelt alleen door leads waarvan de kosten bekend zijn.
- **Uitgaven zonder lead verdwijnen niet.** Een campagne met kosten en nul leads krijgt niets
  toegerekend, maar staat in de campagnetabel met "geen leads" en in de regel "Campagnes zonder
  lead" onder de andere tabellen (zonder filter). Zonder dat leest elke campagne die niets
  opleverde als gratis. Het kerncijfer Uitgaven toont bewust één totaal en splitst niet in
  "toegerekend" en "zonder lead": die splitsing was voor collega's niet te volgen.
- **Kanaal volgt uit bron/medium** (`lib/leads/kanaal.ts`), niet uit GA4's kanaalgroep:
  Pmax en Demand Gen staan daar als "Cross-network" terwijl ze gewoon Google Ads zijn, en
  een extra kolom kost opslag. `(data not available)` is "Onbekend", ook al is het
  vermoedelijk Google Ads: raden-als-feit hoort niet in een kostentabel.
- **Wat telt als lead: "lead" in de naam, plus een lijst die het team zelf aanwees.** De lijst
  staat in `LEADS_EXTRA_EVENTS` (`lib/leads/bereik.ts`): `bedanktpagina_werkplaatsplanner`,
  `verhuur_aanvraag`, `verhuuractie_verzonden`, `verhuur_losse_formulieren` en
  `offerte_onderhoud`. De regel zit op één plek (`isLeadEvent`) en het Windsor-filter wordt
  eruit gebouwd (`leadEventFilter`: `contains lead` of `eq` per event). Een event toevoegen is
  dus één regel in die lijst; de volgende sync haalt hem op. **Meten wat er werkelijk vuurt**
  (november 2026, drie maanden, alle zestien properties): alleen
  `bedanktpagina_werkplaatsplanner` vuurt, 65–270 keer per dag. De vier verhuur-/offerte-events
  stonden nergens; ze staan in de lijst zodat ze meetellen zodra ze gaan vuren. Een verkeerd
  gespelde naam geeft geen fout maar ook nooit een rij.
- **De werkplaatsplanner is groter dan alle andere leads samen** (±4.500 van ±6.100 events in
  dertig dagen) en is een bedankpagina, geen formulier. Hij telt mee omdat het team dat
  vroeg, maar hij verdrukt de rest: de kosten van een campagne worden over meer leads
  verdeeld (kosten per betaalde lead zakte van ± € 46 naar ± € 16) en het aandeel onbetaald
  stijgt. Filter hem weg via Soort lead om de autoleads te zien. Een bedankpagina kan bij een
  verversing opnieuw vuren; dat is niet gecontroleerd.
- **Vacatures tellen mee.** `generate_lead_vacature` is ruim 30% van de events met "lead" in de
  naam en hoort bij de Meta-vacaturecampagnes; het is geen autolead. Gevraagd was alle events
  met "lead" in de naam, dus ze zitten erin en zijn weg te filteren via Soort lead.
- **Filters.** Soort lead, Kanaal, Sessiebron / medium, Sessiecampagne en Merk, plus de
  schakelaar Alle/Betaald/Onbetaald; tussen filters geldt "en", binnen een filter "of". Kanaal
  is een samenvatting die dit dashboard afleidt (`kanaal.ts`); Sessiebron / medium en
  Sessiecampagne zijn de ruwe GA4-waarden, voor wie wil weten welke bron of campagne
  precies de lead bracht. Een lege waarde heet "Onbekend". Ze staan bewust naast elkaar en
  niet in plaats van elkaar: het kanaal is te kiezen zonder de schrijfwijzen van GA4 te kennen.
- **Het telt events, geen personen**: iemand die twee formulieren invult is twee leads.
- **Periodekeuze net als op Syntec leads** (`lib/leads/periode.ts`, getest; verzoek november 2026):
  één filterbalk met bovenaan het aantal leads, de periode en de knoppen Deze maand, Vorige maand,
  30 dagen, 90 dagen, 12 maanden (standaard), Dit jaar, Alles en Eigen periode (`EigenPeriode` uit
  `KanalenFilterBalk`), daaronder de filters. Alles gerekend vanaf de laatste dag in de tabel (niet
  vandaag) en nooit vóór de eerste dag in de tabel; zolang die korter dan een jaar beslaat zijn
  12 maanden, Dit jaar en Alles dus dezelfde dagen. De gekozen knop staat in de state, niet
  afgeleid uit de datums (anders licht bij gelijke periodes de verkeerde knop op). Een andere
  periode is een **nieuwe ophaalactie** (`/api/leads?van=&tot=`), geen filter in de browser: de
  uitgaven van een campagne en de handmatige maandbedragen moeten over dezelfde dagen verdeeld
  worden als de leads. De eerste ophaalactie gaat zonder periode (de laatste dag is dan nog niet
  bekend); valt de standaardperiode daarmee samen, dan volgt er geen tweede.
- **De grafiek** (`LeadsGrafiek.tsx`, reeks in `lib/leads/reeks.ts`, getest; verzoek november
  2026): knopjes rechtsboven voor **Leads / Uitgaven / Kosten per lead** en voor **dag / week /
  maand** (standaard week, maandag t/m zondag; een half vak tekent lichter). Leads: gestapeld
  betaald/onbetaald met het aantal in elk deel en het totaal boven de staaf (de labelhulpjes
  delen Leads en Syntec leads: `components/grafiek/StaafLabels.tsx`). Uitgaven: zonder filters de
  echte uitgaven per dag (`uitgavenPerDag` uit de route: Google, Meta en LinkedIn per dag plus de
  handmatige maandbedragen ÷ dagen in de maand, opgeteld precies het kerncijfer); met een filter de
  toegerekende kosten van de selectie op de dag van de lead (met alleen Betaald: de echte uitgaven).
  Kosten per lead: dezelfde som als het kerncijfer (uitgaven ÷ alle leads in het vak); als **lijn** met het bedrag boven elk punt, want het is een afgeleide. Een
  getal verschijnt alleen als het past.
- **Weergave.** Binnen een periode filtert alles in het geheugen (één ophaalactie). Bij merken en modellen staat
  "Onbekend" **vast onderaan** (`vastgezet`) en niet in de uitklapbare lijst: hij is vaak de
  grootste groep en zou de echte merken wegduwen, maar hij moet zichtbaar blijven omdat de
  tabel anders niet optelt. Een sterretje achter een bedrag betekent dat de rij ook betaalde
  leads zonder bekende kosten bevat. De uitgaven zijn die van de periode die de leadtabel zelf beslaat, niet "de laatste
  dertig dagen vanaf nu": draait de sync een paar nachten niet, dan blijven leads en kosten
  bij elkaar horen.

- **Kostenverdeling: handmatige kosten per bron/medium per maand** (verzoek van de eigenaar,
  november 2026). Gaspedaal (`gaspedaal.nl / referral`, na Google Ads een van de grootste bronnen)
  staat in GA4 als verwijzing maar wordt per maand gefactureerd. De knop **Kostenverdeling**
  rechtsboven (vaste plek naast het oogje, alleen als het tabblad open is en alleen voor de eigenaar) opent een brede
  zijbalk (`components/leads/Kostenverdeling.tsx`, `Drawer` met `extraBreed`): elke
  sessiebron/medium van udenhout.nl op sessies (hoog → laag, uit `v_ga4_verkeer`, dat op
  1 augustus 2026 begint), met per maand een veld. Standaard leeg; opslaan bij Enter/wegklikken
  (`/api/leads/kanaalkosten`, alleen de eigenaar). Opslag `dataloket.lead_kanaalkosten`
  (migratie 0041), alleen bedragen > 0. In te vullen voor **2025, 2026 en 2027** (`KOSTEN_JAREN`,
  knoppen bovenaan de zijbalk; route weigert andere jaren). De lijst bron/media en hun sessies komen
  uit álle beschikbare verkeersdata, niet uit het gekozen jaar — anders was hij voor 2025 en 2027
  leeg. Rekenwerk in `lib/leads/kanaalkosten.ts` (getest): van
  een maand telt het deel dat in het venster valt **naar rato van de dagen** (maandbedrag ÷ dagen in
  de maand × dagen in het venster; op de 20e van een maand van 30 dagen dus 2/3, zoals de eigenaar
  vroeg: de geschatte uitgave tot nu toe, ÷ de leads tot nu toe), en dat gaat gelijk
  over de leads van die bron/medium in die maand. Onbetaald verkeer met een bedrag wordt betaald
  (platform `handmatig`, label "Handmatige kosten"); betaald verkeer houdt zijn platform (Google:
  bedrag erbij; Bing: kosten nu bekend). Een bedrag zonder lead staat in "zonder lead" en in de
  campagnetabel (één regel per bron/medium). Het telt mee in Uitgaven en kosten per betaalde lead.

### Kanalen → Leads Syntec

Tabblad onder **Kanalen**, direct onder Leads (view `leads-syntec`, `components/leadsSyntec/`,
route `app/api/leads-syntec/route.ts`, rekenwerk in `lib/leadsSyntec/`). **Voor iedereen
zichtbaar.** Waar Leads toont wat udenhout.nl als GA4-event afvuurt, toont dit tabblad álle
leads die bij Van den Udenhout binnenkomen: het sheet-tabblad "Data leads" (Syntec), dat
`/api/sync` elke nacht naar `dataloket.v_leads` kopieert. Gevraagd (november 2026): per merk
hoeveel leads, een totaal, overal uitgesplitst in online en offline, en per kanaal, merk en
model op te halen.

- **Online heet overal Online, niet Internet** (verzoek van de eigenaar, november 2026): in de
  filterknop, de kerncijfers, de tabelkolommen, de CSV, de kanalentabel, de grafiek en de
  URL (`f.herkomst=online`; oude links met `internet` werken nog). In Syntec heet de
  kanaalgroep wél "Internet": `INTERNET_GROEP` is de sheetwaarde, `ONLINE` de naam op het
  scherm, en `kanaalgroepLabel` zet de ene om in de andere — ook in het filter Kanaalgroep.
  Alleen waar uitgelegd wordt waar het cijfer vandaan komt, staat "kanaalgroep Internet in
  Syntec".

- **Wat er in de sheet staat** (onderzocht november 2026): ±110.600 regels, waarvan ±97.750
  leads (de rest zijn lege opvulregels zonder kanaal), van 1 januari 2024 t/m twee dagen
  geleden; ±2.500–3.800 per maand. Elke regel is één lead, geteld op **Aangelegd**. 86 kanalen
  in 5 kanaalgroepen; CST (offertes die verkopers in de showroom maken) is met ±42% veruit de
  grootste bron. De campagnekolommen (Budget, Uitgaven, Doel …, Status) zijn lookups uit de
  Campagnes-tab en worden hier niet gebruikt.
- **Online of offline = de kolom Kanaalgroep** (`herkomstVan` in `indeling.ts`): "Internet"
  is online (±34%), Showroom, Acquisitie, Mail en Telefoon zijn offline. ±240 leads uit
  2024–2025 hebben geen kanaalgroep (Mailing, Pon Lead, Werkplaats, Chat) en tellen als
  offline. **Niet** de kolom Status: die zegt Online/Offline, maar dat is de status van de
  *campagne* (alleen gevuld bij leads met een campagne). Dat is precies de verwarring die
  je verwacht, dus het staat ook in "Zo lees je dit".
- **Merk** (`deelMerkIn`): de zes eigen merken (Volkswagen, Škoda, Audi, VW
  Bedrijfswagens, SEAT, CUPRA), "Overige merken" (Ford, Toyota … samen ±1%, vooral occasions
  en inruil; in de merkentabel uit te klappen) en "Onbekend" (leeg, "Onbekend" en de
  opvulwaarden "Z", "Y", "ZZZ", "P").
- **Model staat letterlijk zoals in de sheet** (besluit van de eigenaar, november 2026): geen
  samenvoeging, ook niet in het filter Model. Syntec schrijft dezelfde auto op veel manieren
  ("POLO", "Polo (6) GP", "VOLKSWAGEN POLO"; ±550 waarden), en die staan dus als aparte
  regels en keuzes. Alleen een leeg veld heet "Onbekend". De modellentabel toont merk en
  model naast elkaar (`modelRijSleutel`: "Caddy" bij Volkswagen en bij Bedrijfswagens zijn
  twee regels); het filter werkt op de modelwaarde alleen. Er stond eerst een indeling in
  modelfamilies (±120); die is er op verzoek uit gehaald — zet hem niet terug zonder dat
  daarom gevraagd wordt.
- **Eén ophaalactie voor alle jaren** (`haalSyntecLeads`): gegroepeerd per dag × kanaal ×
  merk × model × ordersoort × lead type × klantsoort × dubbel, ±75.000 regels, als getallen met
  woordenlijsten (±1,8 MB, ±295 kB gzip; de query ±1 s). Periode en filters gebeuren daarna
  in het geheugen (`samenvatting.ts`, getest). Door het model
  is bijna elke combinatie uniek (±0,7 regel per lead).
- **Periodes lopen tot de laatste lead in de sheet, niet tot vandaag** (`vastePeriodes`): de
  sheet loopt een dag of twee achter, en vanaf vandaag gerekend eindigt elke grafiek met lege
  dagen. De export loopt soms halverwege een dag (laatste lead 12:40); die dag tekent lichter
  (`halveDag` in `reeks`). Standaard 12 maanden; periode en filters staan in de URL.
- **Dag, week of maand kies je met knopjes rechtsboven de grafiek** (verzoek november 2026),
  **standaard per week** (maandag t/m zondag), los van de lengte van de periode. Een week of
  maand die maar half in de periode valt, tekent lichter. De keuze staat in de URL
  (`f.korrel`) als hij niet op week staat.
- **De grafiek is gestapeld: Online altijd onder in blauw, Offline erbovenop in grijs**
  (verzoek van de eigenaar, november 2026; eerst groen en oranje, dat is teruggedraaid), met
  het aantal midden in elk deel en het totaal boven de staaf. Net als op de rest van de pagina
  heet internet hier **Online**. Blauw staat
  per theme vast (`blauw` in `GrafiekKleuren`, `lib/themes.ts`) en is niet `categorieen[0]`,
  want die is bij Audi, SEAT en Porsche rood en bij Škoda groen; grijs is `context`. De
  tekstkleur in een deel wordt op contrast gekozen (label- of vlakkleur van het theme), ook
  voor een lichtere halve staaf. Een getal verschijnt alleen als het past (staaf ≥ 24 px
  breed, deel ≥ 15 px hoog): per dag over 90 dagen staan er dus geen getallen, alleen in de
  tooltip. Het totaal staat op het bovenste deel dat er is — offline, of online als er dat vak
  geen offline lead was, want een deel van nul hoogte krijgt in Recharts geen label. De
  cijfers hebben een rand in de kleur eronder, zodat ze op een rasterlijn leesbaar blijven.
- **Geen vergelijking met vorig jaar en geen periode "Vorig jaar"** (verzoek van de eigenaar,
  november 2026). Er stond een schakelaar "Vergelijk met vorig jaar" (verschil onder elk
  getal, lijn in de grafiek) en een periodeknop "Vorig jaar"; allebei zijn ze eruit gehaald,
  met hun rekenwerk. Een oude link met `f.vergelijk=1` of `periode=vorig-jaar` valt terug op
  de standaard. Zet ze niet terug zonder dat daarom gevraagd wordt; een eerder jaar is nog
  wel te bekijken via de eigen periode.
- **Dubbele leads tellen mee** (sluitreden "Dubbel" of "[SA] Dubbel", ±9%), net als op KPI's
  2027 Syntec; "Zonder dubbele leads" laat ze weg. "[SA] Dubbel" is de naam t/m 2025,
  "Dubbel" die van 2026. Online is vaker dubbel (11,7%) dan offline (7,1%). De tooltip van de
  knop waarschuwt (op verzoek) dat een lead pas als dubbel telt als hij met die reden is
  afgesloten: in november 2026 stond de helft van de leads nog open en was 5% als dubbel
  gemarkeerd, tegen 10–16% in de maanden ervoor. Met de knop aan haalt hij in recente weken
  dus minder weg en lijkt een recente periode relatief hoger.
- **Bewust niet op de pagina**: de kolom Campagnes (een formule in de sheet, pas vanaf 2026
  gevuld en in oktober–november vrijwel alles "Multimerk Actie", met vreemde toewijzingen als
  "A2 e-tron" bij BMW-leads; de campagnes staan al op het tabblad Campagnes) en order geworden (recente leads hebben nog
  geen order, dus een conversiepercentage per periode zakt altijd naar het heden toe).
- **Filter Klantsoort** (op verzoek, november 2026): Zakelijk, Particulier en "Onbekend" (leeg,
  altijd achteraan). Let op hoe scheef het gevuld is: ±38% van de leads heeft een klantsoort,
  en dat zijn vooral CST-offertes (±35.000 van de ±37.600); bij online leads is hij 96% leeg.
  "Zakelijk" kiezen laat dus vrijwel alleen offline over. Het staat ook in "Zo lees je dit".
  Alleen een filter, geen tabel: een verdeling waarin "Onbekend" de grootste groep is, zegt
  weinig.
- **Opbouw.** Filterbalk (periode, online/offline, kanaalgroep, kanaal, merk, model, nieuw
  of gebruikt, soort aanvraag, klantsoort, zonder dubbele), vier kerncijfers, de grafiek
  (online en offline gestapeld), Merken en Soort aanvraag, Modellen, Kanalen per merk (een
  matrix: online en offline als blokken met subtotaal, offline per kanaalgroep, de merken
  als kolommen) en Nieuw of gebruikt. Elke tabel heeft Totaal, Aandeel, Online, Offline en %
  online, een totaalregel over álle rijen, "Onbekend" vast onderaan en een CSV-knop.
  Bulkimports zijn als piek te zien (31 juli 2026: 476 leads VDU Retentie; 2 november 2025: ±850
  Autoline) — dat staat in "Zo lees je dit", niet weggepoetst.

### KPI's → KPI's 2027

Tweede tabblad onder **KPI's**, direct onder KPI overzicht (view `kpi-2027`,
`components/kpi/Kpi2027Paneel.tsx`, route `app/api/kpi-2027/route.ts`). Per website en per
KPI het target voor 2027: wat 2026 naar verwachting doet, plus 5%, en daarnaast de
realisatie van 2027.

- **Zes websites als tabs bovenaan** (udenhout.nl, Porsche Centrum Brabant, Porsche Centrum
  Maastricht, PGZ, Bentley Maastricht, VELOO), het gekozen tabblad in de URL
  (`?kpisite=pgz`). Dat is op verzoek een **tweede uitzondering** op "geen dubbele
  navigatie" (naast Campagnebeheer): het is één pagina voor een andere GA4-property, geen
  aparte pagina. Alles per website — property, uitgesloten hosts, KPI's en events —
  staat op één plek: `lib/kpi2027/definities.ts`.
- **De rekensom** (`lib/kpi2027/rekenen.ts`, getest): wat GA4 op de **gemeten** dagen t/m de
  peildatum telde, plus het gemiddelde per gemeten dag × alle overige dagen van 2026 =
  verwachting 2026. Target 2027 = verwachting × 1,05 (voor elke KPI); maandtarget =
  jaartarget ÷ 12 (bewust een gelijke twaalfde, geen seizoen). Een rechte lijn, net als de
  forecast op Budget beheer: na te rekenen in het overleg.
- **Alleen geschat op dagen zonder sessies** (besluit van de eigenaar, november 2026):
  "overal waar de tracking gewoon werkte de daadwerkelijk gemeten cijfers, alleen op dagen
  waar de tracking niet werkte (dagen zonder sessies) een schatting, verder nergens." Een
  dag met 0 sessies op de property wordt bij elke KPI van die website met het gemiddelde
  per gemeten dag ingevuld; een dag mét sessies telt altijd zoals gemeten, ook als een
  event die dag niet vuurde of nog niet bestond. `uitvalUitStand` in `rekenen.ts` leest die
  dagen uit de sessiecijfers van de stand zelf — er staat nergens een handmatige lijst, dus
  een nieuwe uitval wordt vanzelf herkend en bovenaan de tab gemeld (`uitvalTekst`). Nu:
  beide Porsche-properties van 25 juni t/m 11 augustus 2026; de andere websites hebben elke
  dag data.
  - **Wat dit verving.** Eerst stonden er meetperiodes per KPI (zakelijke lease vanaf
    april, Porsche-aanvragen vanaf 30 januari, werkplaats Brabant 2 feb–31 mrt en vanaf
    3 sep, werkplaats Maastricht vanaf 3 sep, PGZ offerte vanaf 11 okt, Bentley offerte
    4 mrt–29 sep en vanaf 20 okt, Bentley contact en werkplaats vanaf 21 okt). Die schatten
    te veel bij: bij werkplaats Brabant was 348 van de 543 verwachte afspraken een schatting
    over dagen waarop de site gewoon mat. Zet ze niet terug zonder dat daarom gevraagd wordt.
  - **Gevolg.** Waar een event pas laat in het jaar begon, is het target vooral wat er sinds
    dat moment binnenkwam (Bentley contact 1, werkplaats 4, PGZ offerte 5). Dat staat in de
    opmerking onder die grafieken.
- **Porsche-werkplaats januari t/m oktober uit de werkplaatsplanning** (verzoek van de
  eigenaar, 18 november 2026). Voor de KPI Werkplaatsafspraken van Porsche Centrum Brabant
  en Maastricht tellen t/m 31 oktober 2026 de afspraken uit een export van de
  werkplaatsplanning, vanaf 1 november weer GA4 (`generate_lead_werkplaats`). De GA4-meting
  van de werkplaats liep het grootste deel van het jaar niet; de planning wel.
  - **Hoe geteld**: één rij is één afspraak (eigen id), per dag van de kolom "Datum Van
    Aanvraag" (volgens de eigenaar de datum van de werkplaatsafspraak), ALvestiging 10 =
    Brabant, 20 = Maastricht. Brabant 384, Maastricht 168 (Maastricht pas vanaf 20 februari
    in de export; daarvoor 0). Vijf rijen met hetzelfde kenteken op dezelfde dag en
    vestiging tellen mee.
  - **Waar het staat**: alleen de aantallen per dag, in `lib/kpi2027/werkplaatsExport.ts`.
    Het exportbestand bevat kentekens, e-mailadressen en opmerkingen en hoort **niet** in
    de repository of de database. Een nieuwe export verwerken = dat bestand opnieuw
    genereren (tellen per dag en vestiging) en de datum `WERKPLAATS_EXPORT_TOT` verzetten.
  - **Hoe het rekent**: `externeBron` op de KPI (`definities.ts`). T/m `tot` vervangen de
    exportcijfers de GA4-cijfers en geldt elke dag als gemeten — ook tijdens de
    Porsche-uitval van 25 juni t/m 11 augustus, want de planning liep gewoon door
    (`uitvalNa`). Daarna weer GA4 met de gewone regel. De melding bovenaan de Porsche-tabs
    noemt deze uitzondering, en onder de grafiek staan beide bronnen met hun aantallen.
    De realisatie van 2027 telt alleen GA4.
  - **Let op**: de planning telt afspraken, GA4 online aanvragen; ze sluiten niet per se op
    elkaar aan. In oktober telde de planning 127 (Brabant) en GA4 86; over 1–13 november
    allebei 13 in Brabant, in Maastricht 10 tegen 6.
- **Zakelijke lease (udenhout.nl): januari t/m maart ook udenhoutlease.nl** (besluit van de
  eigenaar, 19 november 2026). Tot en met maart 2026 kwamen de zakelijke leads binnen via de
  aparte site udenhoutlease.nl, met een eigen GA4-property (344604643). Begin april stopte
  die site en verhuisden de zakelijke leads naar udenhout.nl. Zonder correctie telde de KPI
  voor januari t/m maart alleen de 2 aanvragen die op udenhout.nl zelf binnenkwamen.
  - **Wat telt mee**: de twee key events van udenhoutlease.nl, `offerte_aanvraag`
    (/contact/vrijblijvende-offerte, 100×) en `contact_verzonden` (/contact, 9×), samen 109
    (jan 40, feb 35, mrt 34). **Niet**: het proefritformulier (6) en de actieformulieren
    per merk (20). Die vuren alleen een algemeen `form_submit` en zijn op udenhout.nl ook
    geen zakelijke lease.
  - **Hoe het rekent**: `externeBron` met `optellen: true`. Anders dan bij de
    Porsche-werkplaats **vervangt** deze bron GA4 niet, maar **telt hij erbij op**: de
    events van udenhout.nl blijven het hele jaar tellen, en de uitvalregel blijft gewoon
    staan (een dag zonder sessies op udenhout.nl wordt nog steeds bijgeschat; de
    uitvalmelding bovenaan noemt deze bron dus niet als uitzondering). Onder de grafiek
    staat hij als "Opgeteld t/m 31 mrt". De realisatie van 2027 telt alleen udenhout.nl.
  - **Waar het staat**: de dagcijfers (heel 2025 en januari t/m maart 2026) in
    `lib/kpi2027/udenhoutleaseExport.ts`, eenmalig
    via Windsor opgehaald. Ze liggen vast: na 31 maart meet udenhoutlease.nl geen aanvragen
    meer, dus de wekelijkse ophaalactie haalt die property niet op.
- **Hostnames: uitsluiten, en nooit sessies per hostname optellen.** Per website gaan
  bekende test-, staging- en vreemde domeinen eruit (`uitgeslotenHosts`); "(not set)" telt
  mee. Sessies en gebruikers zijn cijfers per sessie/persoon, gesplitst naar een dimensie
  per event: een sessie met een hostnameloos session_start staat dan onder "(not set)" én
  onder www. Opgeteld per hostname kwam udenhout.nl op 1,57 miljoen sessies tegen 1,16
  miljoen echt, PGZ op 24.776 tegen 15.107 (de "39% (not set)" bij PGZ was dus vooral
  dubbeltelling, geen extra verkeer). Daarom gaat de uitsluiting voor sessies, aankopen en
  gebruikers als filter mee naar Windsor, zonder hostname als dimensie; alleen bij events
  (één hostname per event) valt hij in de code weg (`ophalen.ts`, met een test die precies
  dit bewaakt).
- **Wekelijks op zondag.** Cron `/api/kpi-2027/bijwerken` (zondag 10:15 UTC, `vercel.json`,
  buiten de inlog via `CRON_PADEN`), voor alle websites na elkaar; een website die faalt
  laat de andere staan. De **peildatum is altijd de laatste zaterdag vóór vandaag**
  (`laatsteZaterdag`, Nederlandse kalender). De knop "Nu bijwerken" (alleen beheerders,
  `POST /api/kpi-2027`) rekent dus midden in de week tot dezelfde zaterdag als de zondag
  ervoor. **Vanaf zondag 3 januari 2027** wordt 2026 één laatste keer t/m 31 december
  opgehaald en definitief (daarna verandert de basis alleen nog met de knop), en begint de
  stand van 2027: het kaartje **Realisatie 2027** (nu 0, "2027 is nog niet begonnen") telt
  vanaf dan wekelijks mee, met het percentage van het jaartarget (`opdrachtenVoor` in
  `bijwerken.ts`).
- **Rechtstreeks bij Windsor, niet uit de GA4-tabellen** (`lib/kpi2027/ophalen.ts`).
  `windsor_ga4_events` en `windsor_ga4_verkeer` beginnen op 1 augustus 2026, kennen geen
  hostname en gebruikers alleen per dag. Per website vier kleine opvragingen met elk een
  plat filter (alleen "of" of alleen "en"): events per dag, events met een padvoorwaarde
  (Bentley's `Contactaanvraag` met `/caw-bedankt/offerte/`), sessies (+ VELOO's
  `ecommerce_purchases`) per dag, en `active_users` per maand. Een antwoord zonder sessies
  is een fout; dan blijft de vorige stand staan.
- **Opslag: de ruwe dagcijfers, niet de KPI's** (`kpi_2027_standen`, migratie 0035, één rij
  per website per jaar, elke week overschreven). Per bron (`sessies`, `aankopen`,
  `event:<naam>`, `event:<naam>@<pad>`) een map datum → aantal, plus gebruikers per maand.
  Welke bron bij welke KPI hoort en welke dagen gemeten zijn, wordt pas bij het lezen
  toegepast — een gewijzigde definitie geldt dus meteen, zonder opnieuw op
  te halen (een nieuw event komt er bij de volgende run of met de knop bij).
- **Gebruikers: actieve gebruikers (`active_users`), per maand ontdubbeld**, op alle zes de
  websites (keuze van het team; udenhout.nl gebruikte eerst `totalusers`, een verschil van
  een paar promille). Het jaar is de som van de maanden, zodat het maandtarget één-op-één
  naast het GA4-maandrapport van 2027 past.
- **Twee generaties events op udenhout.nl.** udenhout.nl wisselde eind maart 2026 van
  tracking: tot en met maart `generate_lead_proefrit_aanvraag`, `…offerte_aanvraag`,
  `offerte_onderhoud`, `verhuur_aanvraag` (+ `verhuuractie_verzonden`,
  `verhuur_losse_formulieren`), `private_groeilease`; vanaf april `generate_lead_proefrit`,
  `…offerte`, `…onderhoudsofferte`, `…verhuur`, `…privatelease`. Elke KPI telt beide
  generaties op. `generate_lead_private_lease` (formulier "stock prive") vuurt het hele jaar
  door naast `generate_lead_privatelease` (/offerte en /acties/groeilease): andere
  formulieren, dus allebei private lease. Zakelijke lease = `generate_lead_zakelijk_lease`
  + `generate_lead_zakelijk_offerte` + `generate_lead_leasecontact`, plus januari t/m maart
  de aanvragen van udenhoutlease.nl (zie hierboven); een zakelijke offerte telt dus níet bij
  Offerteaanvragen.
- **Niet opgenomen: Sollicitaties (social) bij de twee Porsche-sites.** Op beide domeinen
  bestaat geen event voor een afgeronde sollicitatie (de werken-bij-pagina's verwijzen naar
  e-mail; een klik op een mailadres is geen verzonden sollicitatie). In de PGZ-property
  vuren `generate_lead_vacature` (/vacatures, geen onderscheid Brabant/Maastricht) en
  `job_application` (vacaturepagina's, alleen 1–12 januari gezien); niet optellen zolang
  niet vaststaat of ze dezelfde sollicitatie kunnen registreren. Zodra er een bevestigd
  event is: combineren met de vestiging en `session_default_channel_group` (Paid Social,
  eventueel Organic Social). Op verzoek weggelaten in plaats van als lege kaart getoond.
- **Geteld wordt `event_count`**, net als op Leads en bij de GA-conversies per campagne —
  niet het aantal key events. VELOO's Productaankopen is `ecommerce_purchases` (afgeronde
  bestellingen).
- **Besloten (november 2026): proefritaanvragen, private lease en offerte onderhoud van
  udenhout.nl rekenen over alle dagen.** Door de trackingwissel verschilt het niveau per
  maand sterk tussen januari–maart en de rest van het jaar (offerte onderhoud ±170 per
  maand tegen ±60–140, private lease ±25 tegen ±60–190, proefritaanvragen ±65 tegen
  ±90–200). Het stond open of ze vanaf april moesten rekenen; de regel "alleen schatten op
  dagen zonder sessies" beslist het: januari–maart is gemeten, dus die cijfers tellen.
- **De grafiek** (`KpiJaarGrafiek.tsx`): twee lijnen, zoals gevraagd (op udenhout.nl een
  derde voor 2025, zie hieronder). 2026 is doorgetrokken
  waar de maand volledig gemeten is en gestippeld waar het (deels) verwachting of
  bijgeschat is — anders leest de half gemeten lopende maand als een instorting, en de
  Porsche-uitval als een ravijn. Het maandtarget is een vlakke lijn. As vanaf nul; onder de
  tien op één decimaal, anders vallen lijn en target bij de kleine KPI's samen. Onder elke
  grafiek, ingeklapt achter de balk "Lees definitie" (zie hieronder), welke GA4-statistiek of welke events (met periode en aantal)
  erin zitten en welke hosts zijn uitgesloten; pas die tekst in `definities.ts` mee aan als
  de koppeling verandert.
- **De toelichting onder een grafiek staat standaard ingeklapt** (november 2026, op verzoek,
  op KPI's 2027 GA én Syntec): een balk "Lees definitie" met een pijltje klapt hem per kaart
  uit (`Definitie` in `KpiKaart.tsx`, gedeeld via `KpiKaartOpmaak`). Volledig uitgeschreven
  onder elke kaart maakte de pagina onrustig. De inhoud blijft volledig; zet hem niet weer
  standaard open zonder dat daarom gevraagd wordt. Opbouw op GA (`KpiKaart`), net als op
  Syntec: *Grafiek* (wat de lijnen zijn, en hoeveel dagen zonder sessies zijn ingevuld),
  *Bron* (property, uitgesloten hosts, wekelijkse stand), eventueel een andere of opgetelde
  bron, en *Wat telt mee* (de events met periode en aantal, of de statistiek).
- **Lijn 2025 op udenhout.nl** (november 2026, op verzoek): een derde, dunnere lijn in elke
  grafiek van die tab, met 2025 per maand zoals gemeten. Hij telt **nergens** mee (niet in de
  verwachting, niet in het target) en is alleen context. Alleen udenhout.nl heeft hem
  (`vergelijkingsjaar` op de website in `definities.ts`).
  - **Waarom het kan**: onderzocht bij Windsor. Property 255949462 heeft data vanaf
    1 januari 2025, elke dag met sessies (geen uitval, dus niets bijgeschat), en heel 2025
    draaide de oude tracking: dezelfde events als januari t/m maart 2026, die de KPI's al
    meetellen. Er hoefde dus geen definitie bij.
  - **Zakelijke lease: de lijn 2025 is udenhoutlease.nl** (besluit van de eigenaar,
    19 november 2026). In 2025 liepen de zakelijke leads volledig via udenhoutlease.nl
    (346: `offerte_aanvraag` 324 + `contact_verzonden` 22); udenhout.nl mat er maar 5
    (augustus t/m oktober). De dagcijfers van 2025 staan in hetzelfde bestand als die van
    2026 (`udenhoutleaseExport.ts`). Een **optellende** externe bron telt mee in de lijn van
    het vergelijkingsjaar (`vergelijkingVoor`, `Vergelijking.extern`), en onder de grafiek
    staat hoeveel ervan uit udenhoutlease.nl komt. Hij telt niet mee in verwachting of target.
  - `verhuuractie_verzonden` vuurt pas vanaf juli 2025; dat blijkt uit de eventtelling
    onder de grafiek. Een KPI met een **vervangende** externe bron (Porsche-werkplaats)
    krijgt nooit een lijn: die bron dekt alleen 2026.
  - **Let op bij het lezen**: vanaf april 2026 draait de nieuwe tracking, dus een verschil
    tussen 2025 en 2026 vanaf april kan deels aan de meting liggen. Dat staat bovenaan de tab
    (`vergelijkingTekst`).
  - **Ophalen**: één keer, als eigen rij in `kpi_2027_standen` (jaar 2025, meteen
    definitief; `vergelijkingsOpdracht` in `bijwerken.ts`). De eerste cron of klik op "Nu
    bijwerken" haalt hem op, daarna wordt hij overgeslagen. Ook de knop haalt hem niet
    opnieuw op. Rekenwerk: `vergelijkingVoor` in `rekenen.ts`, getest.
  - Een andere website erbij = `vergelijkingsjaar` op die website zetten, nadat in Windsor
    is nagekeken dat dat jaar volledig gemeten is en met dezelfde events.
- **Knopje "Kanalen" op elke website** (november 2026, op verzoek; eerst udenhout.nl, een paar
  dagen later ook Porsche Brabant en Maastricht, PGZ, Bentley en VELOO): rechtsboven op elke kaart
  een klein schuifje (`WisselKnop` / `GrafiekWissel` in `KpiKaart.tsx`) dat de grafiek op
  dezelfde plek vervangt door een gestapelde staafgrafiek tot 100% (`KanaalGrafiek.tsx`):
  per maand vanaf januari 2025 t/m de lopende maand het aandeel per kanaal. Geen targets.
  De vier kaartjes erboven blijven staan; de lopende maand staat lichter.
  - **Dezelfde data als deze pagina, niet die van Leads.** Dezelfde property, events per KPI
    (`definities.ts`) en hostregels, sessies en actieve gebruikers per maand, alleen met
    `session_source_medium` erbij — dat zit niet in `kpi_2027_standen`. Per maand toont de
    tooltip of het kanaaltotaal gelijk is aan de KPI-grafiek (`kpiTotaal`,
    `kpiMaandTotaal` in `rekenen.ts`); zo niet, dan staat het KPI-cijfer erbij. Een
    **optellende** externe bron (udenhoutlease.nl bij zakelijke lease) is een andere
    property en zit dus niet in de verdeling: de controle laat hem buiten, en onder de
    grafiek staat dat die aanvragen er niet in zitten. Een **vervangende** externe bron
    (Porsche-werkplaats t/m oktober 2026: de werkplaatsplanning) kent geen kanaal: in die
    maanden is de verdeling gewoon GA4 (toen grotendeels niet gemeten), heeft de tooltip geen
    controlecijfer (`kpiMaandTotaal` geeft null) en zegt de regel onder de grafiek dat.
  - **Alle soorten bron doen mee**, net als in `ophalen.ts`: events met een padvoorwaarde
    (Bentley: Contactaanvraag op /caw-bedankt/offerte/) krijgen een eigen opvraging met
    hetzelfde `page_path`-filter, en VELOO's productaankopen komen uit `ecommerce_purchases`
    in de verkeersopvraging (bron `aankopen`). Een nieuwe soort bron in `definities.ts` moet
    hier dus ook bij, anders blijft die kanaalgrafiek leeg.
  - **De indeling** (`lib/kpi2027/kanalen.ts`, getest op de bron/media die udenhout.nl echt
    binnenkrijgt, en nagelopen in Windsor op de andere vijf websites): acht groepen, in de volgorde van de stapel — Google Ads, Meta Ads, Overig
    betaald, Organisch zoeken (incl. Google Bedrijfsprofiel), Social organisch,
    Autoportals (Gaspedaal e.a.), Direct, Verwijzingen & overig. Bewust niet GA4's eigen
    kanaalgroep en niet `lib/leads/kanaal.ts`: Gaspedaal (na Google Ads de grootste bron) is
    daar "Referral", Meta-advertenties met de plaatsing als medium "Unassigned". Acht is het
    maximum: meer kleuren is in een gestapelde staaf niet te lezen. De regels en de
    redenering staan in de kop van `kanalen.ts`; pas een regel daar aan, met een testgeval.
    Erbij gekomen voor de andere websites: medium dat met "ads" begint is betaald (`Google /
    Ads-Extensie` bij Porsche), 2dehands/2ememain, Elferspot, mobile.de en Porsche Finder zijn
    autoportals, `google / product_sync` (VELOO-webshop) is organisch. Merksites (porsche.com,
    fietsmerken) blijven verwijzingen; VELOO heeft geen autoportals, die kleur blijft daar leeg.
  - **Kleuren**: vaste volgorde per kanaal (`LICHT`/`DONKER` in `KanaalGrafiek.tsx`),
    doorgerekend op onderscheid (ook bij kleurenblindheid), "Verwijzingen & overig" grijs.
    Bewust niet de themakleuren: die reeks heeft er zes.
  - **Opslag** (`kpi_2027_kanalen`, migraties 0037 en 0038): één rij per website. De
    250 grootste bron/media (op sessies, `BRON_MEDIA_MAX`) staan er **los** in, nog niet
    ingedeeld (`bronnen`: bron → maand → bron/medium); de lange staart staat al per kanaal
    in `staart` (volgens de regels), zodat de rij klein blijft. De indeling gebeurt bij het
    lezen (`kanalenVoorKpi`), dus een aangepaste regel of handmatige keuze geldt meteen voor
    de losse bron/media; de staart volgt een gewijzigde regel pas na de volgende
    ophaalronde. Elke zondag opnieuw over de hele periode in de cron (`bijwerken.ts`, drie
    websites tegelijk, `KANALEN_TEGELIJK`, zodat zes websites in de 300 seconden passen);
    staat er nog niets, dan haalt de eerste klik hem op (`/api/kpi-2027/kanalen`,
    `kanalenBron.ts`). Handmatige keuzes gelden per website.
  - **Knop "Kanaalgroepindeling"** rechts in de statusbalk (alleen op een website met
    `kanaalverdeling`): een brede zijbalk (`KanaalIndeling.tsx`, `Drawer` met `breed`) met de
    losse bron/media op sessies, hun kanaalgroep en per regel een keuzelijst. Een keuze gaat
    vóór de regels (`kanaalMetKeuze`), geldt meteen in elke kanaalgrafiek en voor het hele
    team (`kpi_2027_kanaal_keuzes`, migratie 0038, dezelfde rechten als het groeipercentage;
    `POST /api/kpi-2027/kanalen/keuze`). De groep met "(regel)" kiezen haalt de keuze weg.
    Onderaan staat hoeveel bron/media en sessies in de staart zitten; die zijn niet met de hand
    in te delen. Snel blijven: de pagina zelf laadt hier niets voor — knop en schuifjes lezen
    hetzelfde antwoord, dat pas bij de eerste klik wordt opgehaald (`no-store`, zodat een
    keuze na herladen klopt).
  - **Gebruikers** tellen per maand per kanaal: wie in één maand via twee kanalen kwam, telt in
    allebei. Dat staat onder de grafiek.
  - **E-mail op udenhout.nl** (november 2026, op verzoek; alleen deze website, alleen de KPI
    Sessies): een negende groep die níet uit bron/medium volgt, omdat de tracking vanuit Selligent
    misging en klikken uit de mailing als `(direct) / (none)` binnenkomen met `M_BT=` in de URL.
    E-mail = `session_default_channel_group = 'Email'` OF (`(direct) / (none)` EN
    `landing_page_plus_query_string` bevat `M_BT=`), metric `sessions`, beide delen alleen op
    hostnames `udenhout.nl` en `www.udenhout.nl` (`emailCorrectie` in `definities.ts`). M_BT telt
    alleen op de landingspagina. Twee extra Windsor-opvragingen per maand (`kanalenBron.ts`),
    bewaard onder `correctie:email-ga4` / `correctie:email-mbt` in `bronnen` (geen migratie). De
    GA4-kanaalgroep blijft ongemoeid: `kanalenVoorKpi` **verschuift** bij het lezen (van de groep
    van de bron/medium, normaal Verwijzingen & overig, en van Direct naar E-mail), dus het totaal
    blijft gelijk aan de KPI. M_BT-sessies die GA4 aan Google Ads, organisch of een verwijzing
    toeschrijft blijven daar; e-mailsessies op hostname "(not set)" (±2.100 in 2026) ook. E-mail is
    niet met de hand te kiezen, staat alleen in de legenda waar hij gevuld is, en de zijbalk
    Kanaalgroepindeling toont per jaar de twee delen. Controle 1 jan t/m 20 nov 2026: 6.916 + 21.011
    = 27.927 (eerdere meting 27.928; het verschil van 1 is GA4's afronding bij uitsplitsen naar
    bron/medium). Regels en tests: kop van `kanalen.ts`, `kanalen.test.ts`.

- **Bovenaan staat dezelfde overzichtstabel als op KPI's 2027 Syntec** (`GaOverzichtTabel.tsx`),
  voor de gekozen website: per KPI 2026 (verwachting), Target 2027, Target %, Realisatie en
  Voortgang, met de definities eronder. Kader, kolommen, regels en definities zijn gedeeld
  (`OverzichtTabel.tsx`); alleen de uitleg van de kolom 2026 verschilt. Bewust **zonder
  totaalregel**: sessies, gebruikers en aanvragen optellen betekent niets.
- **Target % is ook in de overzichtstabel aan te passen** (op beide tabbladen), met precies
  hetzelfde gedrag als het kaartje Groei: dezelfde hook (`useGroeiBewerken` in
  `GroeiBewerken.tsx`), dezelfde opslag en dezelfde herberekening in het paneel, dus tabel
  en kaart tonen altijd hetzelfde getal. Totalen en combinaties op Syntec zijn ook hier niet
  aan te passen.
- **De percentages zijn de vastgestelde targets** (20 november 2026, door het team
  aangeleverd en zo ingevoerd, op KPI's 2027 GA én Syntec). Daarom zijn de knop "terug naar
  +5%" (kaart) en het pijltje (tabel) er op verzoek af, net als de markering "aangepast":
  bijna elke KPI wijkt nu af, dus die zei niets meer. Aanpassen kan nog gewoon door op het
  percentage te klikken. Zet de herstelknop niet terug zonder dat daarom gevraagd wordt.
- **Het groeipercentage is per KPI met de hand aan te passen** (november 2026, op verzoek;
  geldt ook voor KPI's 2027 Syntec). Klik op het percentage in het kaartje Groei, typ een
  getal (komma of punt, "-3" mag) en druk op Enter of klik weg; Escape annuleert. Target,
  maandtarget en de targetlijn in de grafiek rekenen meteen mee (`metGroei` in
  `rekenen.ts`). Opslag: `dataloket.kpi_2027_groei` (migratie 0036), één rij per tabblad ×
  website × KPI, gedeeld voor het hele team; alleen afwijkingen van +5% staan erin, en
  precies 5 typen haalt de rij weg. Elke ingelogde collega mag het
  (`POST /api/kpi-2027/groei`, die controleert dat de KPI in `definities.ts` bestaat). Lukt
  het lezen van die tabel niet, dan rekent het tabblad gewoon met +5% (`leesGroeiVeilig`).
  De GET-routes van beide tabbladen staan daarom op `no-store`: anders toont herladen
  binnen vijf minuten het oude percentage. Op KPI's 2027 Syntec hebben totalen en
  combinaties **geen eigen percentage**: hun target is de som van hun kaarten en hun groei
  volgt daaruit (target ÷ verwachting − 1); `pasSyntecGroeiToe` telt ze in de browser
  opnieuw op, en de test rekent na dat dat precies is wat de server uitrekent.

### KPI's → KPI's 2027 Syntec

Derde tabblad onder **KPI's** (view `kpi-2027-syntec`, `components/kpi/Kpi2027SyntecPaneel.tsx`,
route `app/api/kpi-2027-syntec/route.ts`). Precies dezelfde opzet als KPI's 2027 — dezelfde
kaart (`KpiKaartOpmaak` in `KpiKaart.tsx`), grafiek, rekensom (`berekenKpi`), peildatum (de
laatste zaterdag) en +5% — maar dan voor de websiteleads uit **Syntec**, per bron, in de
drie groepen waarin het team de doelen voor 2026 vastlegde: Eigen website, PAH-websites en
Externe portals, elk met een totaalkaart, en onderaan het totaal over alles.

- **Bron is het sheet-tabblad "Data leads"**, dat `/api/sync` elke nacht naar
  `dataloket.v_leads` kopieert. Geteld worden leads met kanaalgroep `Internet`, op de datum
  Aangelegd. Geen opgeslagen stand en geen eigen cron: de route rekent bij elk verzoek uit
  wat er in `v_leads` staat, t/m de peildatum.
- **Welke lead bij welke KPI hoort staat alleen in `lib/kpi2027syntec/definities.ts`**,
  in getest TypeScript (`classificeerLead`), op kanaal en onderwerp. Een lead telt bij
  hoogstens één KPI (nagerekend in de test).
- **Onder elke grafiek staat volledig waar je naar kijkt** (`KpiSyntecKaart.tsx`): eerst
  *Grafiek* (wat de doorgetrokken, gestippelde en vlakke lijn zijn; bij inruil/contact en de
  totalen waar ze in zitten ook dat januari t/m maart is bijgeschat) en *Bron* (Syntec via
  het sheet-tabblad Data leads, kanaalgroep Internet, geteld op de datum Aangelegd), dan
  *Wat telt mee* (elke regel met de periode waarin hij leads oplevert en het aantal),
  en *Keuzes in de definitie* (het veld `keuzes` per KPI in `definities.ts`, in gewone
  taal). De *Controle* (telling 2025 × 1,2 naast het doel 2026) is er in november 2026 op
  verzoek af: achterhaald. `vorigJaar` en `doel2026` worden nog wel uitgerekend, maar niet
  meer getoond. Een nieuwe KPI
  zonder keuzes, of een regel van de eigen website zonder periode, laat de test falen.
  Verander je een definitie, pas dan de keuzes in dezelfde wijziging aan.
- **De naamswissel van april 2026.** Tot en met maart had elk formulier van udenhout.nl
  een eigen kanaal (`Udenhout.nl offerteaanv.` …); vanaf april komt alles binnen onder
  `Udenhout.nl` en zegt het onderwerp wat het is. Elke KPI van de eigen website heeft dus
  een regel voor beide. Merksites en portals gaan alleen op kanaal.
- **Keuzes van het team (november 2026)**: Private Groeilease telt bij Private lease (ook
  het oude onderwerp `…growLease` in het offertekanaal); doorgestuurde mails (onderwerp
  begint met "FW:") tellen bij de eigen website niet mee; VW PFS zonder retentieleads;
  Audi.nl inclusief Audi Proefritmodule; ID.Polo Reservering (PAH), chat, WhatsApp en
  bel-me-terug vallen buiten alle KPI's. De doelen 2026 waren de telling van 2025 × 1,2;
  met deze regels klopt dat voor tien van de vijftien KPI's precies. Waar het niet klopt
  (offerte, private lease, VW PFS) staat de reden onder de grafiek.
- **Inruilvoorstel en contact rekenen vanaf 1 april 2026** (besluit van de eigenaar,
  november 2026); alle andere KPI's met het gemiddelde over alle dagen van 2026. Het
  formulier van de nieuwe website levert sinds april veel meer op (inruil ±1 → ±25 per
  maand, contact ±14 → ±20). `meetVanaf` op de KPI in `definities.ts` geeft de dagen ervóór
  als niet-gemeten (uitval) mee aan `maandInvoerUitMaanden` (`uitkomstVoorKpi`): januari t/m maart tellen niet mee in het gemiddelde
  en worden ermee bijgeschat, gestippeld in de grafiek — net als zakelijke lease op KPI's
  2027. Het staat op drie plekken in beeld en hoort dat te blijven: de melding bovenaan
  het tabblad, de eerste keuze onder beide grafieken, en een regel onder elk totaal waar
  ze in zitten. "Wat telt mee" toont alleen de leads die in de verwachting meetellen.
- **Ook de uitleg bovenaan en de definities onder de overzichtstabel staan standaard
  ingeklapt** achter dezelfde balk "Lees definitie" als onder de grafieken (verzoek november
  2026), op KPI's 2027 GA én Syntec: `Definitie` uit `KpiKaart.tsx` (met `zonderLijn` voor de
  uitleg bovenaan) en in `OverzichtTabel.tsx`.
- **Eerdere jaren staan standaard uit.** Rechts in de statusbalk van KPI's 2027 GA én Syntec
  staat de schakelaar "Eerdere jaren" (`components/kpi/EerdereJaren.tsx`): uit toont een
  grafiek alleen 2026, de verwachting en het maandtarget; aan ook de vergelijkingslijnen
  (GA: 2025 waar die er is, Syntec: 2024 en 2025) met hun regel onder de grafiek. Eén
  keuze voor beide tabbladen, per browser onthouden in localStorage
  (`kpi-eerdere-jaren`); de server rendert altijd "uit".
- **De grafieken tonen ook 2024 en 2025** als dunne lijnen (`eerdereJaren` per KPI, totaal en
  combinatie; `SYNTEC_EERDERE_JAREN` in `bron.ts`), met dezelfde definitie en zoals gemeten.
  Ze tellen nergens mee: geen verwachting, geen target. `meetVanaf` geldt er niet voor (dat
  is een keuze voor de verwachting van 2026), doorgestuurde mails tellen er ook niet mee.
  Nagerekend in november 2026: de indeling hoeft voor die jaren niet anders. In 2024 en
  2025 bestonden alleen de oude kanalen, die de definities al dekken; wat er buiten valt
  (chat, bel-me-terug, retentie, kleine portals als AutoWereld.nl, Marktplaats en Anwb.nl,
  en de `_TB`-kanalen) zat ook niet in de doelen. `KpiJaarGrafiek` neemt daarvoor nu een
  lijst vergelijkingsjaren aan: het jongste krijgt de derde paletkleur, elk ouder jaar de
  volgende.
- **Bovenaan staat een overzichtstabel** (`SyntecOverzichtTabel.tsx`, opgebouwd uit de
  gedeelde onderdelen in `OverzichtTabel.tsx`, net als die op KPI's 2027 GA), in de indeling van de
  doelentabel van het team: per KPI 2026 (verwachting), Target 2027, Target %, Realisatie
  2027 en Voortgang, met de definities er direct onder. Elk getal komt uit dezelfde
  `SyntecKpiRegel` als de kaart, dus tabel en kaarten lopen niet uit elkaar. Voortgang
  (`voortgang` in `lib/kpi2027/rekenen.ts`, getest) is de realisatie tegen het lineaire deel van het
  jaartarget tot de peildatum (target × dag ÷ 365), als ±%; tot 2027 begint een streepje.
- **"Offerte + private lease" is een combinatiekaart** (`SYNTEC_COMBINATIES`), geen KPI:
  hij staat in de groep Eigen website maar telt niet mee in het groepstotaal. Reden: sinds
  april komt een offerte voor private lease binnen als "Offerte private lease"; daarvóór als
  gewone offerte, en in de sheet staat bij die oude offertes niet of het koop of lease was.
  Per lead is dat dus niet te herstellen (onderzocht: Lead Type, Klantsoort, Model en
  Sluitreden zeggen het niet); samen is het cijfer wel over heel 2026 vergelijkbaar.
- **Er staat een waarschuwing als de leads langer dan twee dagen niet zijn ingelezen**
  (laatste gelukte run in `sync_runs`). In oktober en november 2026 liep de nachtelijke
  kopie wekenlang vast (zie "Sheet-sync in blokken" hieronder) en toonde dit tabblad
  gewoon nullen.
- **Een totaal is de som van zijn kaarten** (`somVanUitkomsten`), niet een nieuwe
  berekening over de opgetelde maanden: zodra KPI's over verschillende dagen rekenen,
  zou dat een ander target geven dan de kaarten erboven samen. Een maand is in een
  totaal pas gemeten als hij dat bij elke KPI is; anders staat hij gestippeld en zegt de
  tooltip (`MaandUitkomst.toelichting`) welk deel gemeten is en wat bijgeschat.
- **Realisatie 2027** (het vierde kaartje, net als op KPI's 2027) telt dezelfde definitie
  vanaf 1 januari 2027 t/m de laatste zaterdag; tot dan staat er "2027 is nog niet begonnen".

### KPI's → KPI's social media

Vierde tabblad onder **KPI's 2027** (view `kpi-2027-social`, `components/kpi/Kpi2027SocialPaneel.tsx`,
route `app/api/kpi-2027-social/route.ts`), op verzoek van de eigenaar (november 2026): precies dezelfde
opzet als KPI's 2027 GA en Syntec — statusbalk, overzichtstabel (`SocialOverzichtTabel.tsx`, gedeelde
`OverzichtTabel.tsx`), dezelfde kaart (`KpiKaartOpmaak`, via `KpiSocialKaart.tsx`), grafiek, peildatum
(de laatste zaterdag) en "Nu bijwerken" voor beheerders. Tabs per merk (`?kpimerk=veloo`): Van den
Udenhout, VELOO, Audi Sport, Porsche Centrum Brabant, Porsche Centrum Maastricht, Instra, Bentley Maastricht
en PGZ; daaronder per
kanaal een kopje.
- **Elk organisch social-account dat in Windsor gekoppeld is en in 2026 actief was, heeft een tab**
  (verzoek van de eigenaar, 21 november 2026). Nagelopen in Windsor: `facebook_organic` (6 pagina's),
  `instagram` (5) en `linkedin_organic` (4) — samen precies deze zes merken. Bentley Maastricht en PGZ staan
  alleen bij de advertentiekoppelingen (`facebook`, `linkedin`), niet organisch; TikTok, YouTube, X,
  Pinterest en Threads zijn niet gekoppeld. Een nieuw account = een merk in `SOCIAL_MERKEN` en het id in
  `STANDAARD_ACCOUNTS` (`lib/windsor/api.ts`, voor de nachtelijke Instagram-stand).
- **Porsche Centrum Brabant, Porsche Centrum Maastricht, Instra, Bentley Maastricht en PGZ hebben (nog) geen percentage van het
  team**: volgers en impressies op elk kanaal staan op +5% (`STANDAARD_GROEI`, `standaard: true` op de KPI);
  de eerste keuze onder de grafiek zegt dat het een voorlopig target is. Komen de percentages, zet ze dan
  als `kpi(kanaal, maat, groei)` in `definities.ts` en in de test.

- **De targets komen van het team**, niet +5%: per KPI het percentage uit de lijst van de eigenaar
  (bv. Instagram volgers Van den Udenhout +7%, VELOO Facebook impressies −6%). Ze staan in
  `lib/kpi2027social/definities.ts` (`groei` per KPI; de test controleert ze één voor één). Met de
  hand aanpassen werkt zoals op de andere tabbladen (`kpi_2027_groei`, tabblad `kpi-2027-social`,
  website = merksleutel). Net als op GA en Syntec zonder herstelknop en zonder markering
  "aangepast"; precies het percentage van het team typen haalt de eigen rij weg (`standaard` in
  `useGroeiBewerken` / `GroeiInstelling` / `OverzichtRegel`).
- **Onder elke grafiek de definitie en de besluiten** (verzoek van de eigenaar, 20 november 2026),
  ingeklapt achter "Lees definitie" en in dezelfde opbouw als Syntec (`KpiSocialKaart.tsx`): *Grafiek*,
  *Bron* (kanaal, account en id), *Wat telt mee* (welk Windsor-veld, in gewone taal) en *Keuzes in de
  definitie*: de besluiten per KPI uit `keuzesVoor` in `definities.ts` — het vastgestelde percentage,
  stand of optelsom, per kanaal wat er wel en niet gebruikt is en waarom, en wanneer 2026 definitief
  wordt. Elke KPI heeft er minstens twee, en de eerste noemt zijn eigen percentage (getest). Verander je
  een definitie of rekenregel, pas dan in dezelfde wijziging `keuzesVoor` aan. De afwijkende regel bij
  Instagram (1 januari t/m de dag vóór de eerste meting = die eerste meting) staat, net als "vanaf
  1 april" op Syntec, óók als melding bovenaan het tabblad.
- **Impressies rekenen als KPI's 2027 GA** (`berekenKpi`): gemeten + gemiddelde per dag × resterende
  dagen, × (1 + groei), maandtarget ÷ 12. Eén verschil: hooguit drie lege dagen vlak vóór de
  peildatum tellen als nog niet gemeten (`achterstand`), want LinkedIn en Meta leveren een tot twee
  dagen later.
- **Volgers = het totaal aantal volgers, op alle kanalen** (besluit van de eigenaar, 20 november 2026).
  Het was een paar uur "nieuwe volgers" bij Instagram en Facebook; dat is teruggedraaid zodra bleek dat
  Facebook het totaal per dag heeft (`page_follows`, heel 2026). De maat `nieuwe-volgers`
  (`berekenNieuweVolgers`, `ontbrekendeDagen`) en de opslag ervan (`dagen["nieuwe-volgers"]`) staan er
  nog, maar geen KPI gebruikt hem.
  - **Instagram: aanvullen tot de eerste meting** (`aanvullen` in `berekenVolgers`). Instagram kent alleen
    de stand van vandaag. Op verzoek krijgen 1 januari t/m de dag vóór de eerste gemeten stand de
    waarde van die eerste stand; vanaf dan telt elke dag de echte stand. Die maanden zijn `bijgeschat`
    (gestippeld) met "Aangenomen: …" in de tooltip, en de trend rekent alleen over echte metingen
    (pas vanaf zeven dagen ertussen). De eerste stand is die van **20 november 2026** (3.772 / 214 /
    7.228), met de hand in `kpi_2027_social_standen` gezet omdat de oude nachtelijke sync hem anders
    overschreef; de ophaalactie voegt er elke week aan toe.
  - **Een stand mag na de peildatum liggen** (`standTot` = de dag van ophalen): de momentopname van
    zondag hoeft niet een week op de volgende zaterdag te wachten. Ook de realisatie leest tot die dag.
- **Volgers zijn een stand, geen optelsom** (`berekenVolgers`). Basis = de stand op 31 december 2026
  (zolang het jaar loopt: laatste stand + trend per dag; trend = eerste → laatste stand van het jaar,
  pas vanaf zeven dagen ertussen). Target = de stand eind 2027. In de grafiek de stand per maandeinde
  en een vlakke lijn "Doel eind 2027" (`stand` op `KpiKaartOpmaak`, `jaarNaam`/`targetNaam` op
  `KpiJaarGrafiek`); maanden zonder bekende stand blijven leeg (`MaandUitkomst.leeg`). Voortgang in de
  tabel: de groei sinds eind 2026 tegen het lineaire deel van de doelgroei (`voortgangStand`).
- **Wat Windsor per kanaal kan** (onderzocht november 2026, zie de kop van `definities.ts`):
  - *Instagram*: impressies = `views` (impressions is door Meta afgevoerd), per dag, terug tot
    augustus 2025. Volgers: **alleen de stand van vandaag** (`followers_count`). `follower_count_1d`
    gaat 30 dagen terug en telt alleen nieuwe volgers, `follows_and_unfollows` telt volgen en
    ontvolgen bij elkaar op — geen netto historie. De reeks begint op 20 november 2026 en groeit uit
    de nachtelijke momentopname (`windsor_account_dag`) plus de wekelijkse ophaalactie.
  - *LinkedIn*: impressies = `account_analytics_impression_count`; volgers per dag teruggerekend uit de
    stand van vandaag min de netto aanwas (`followers_gain_organic` + `_paid`) erna (`standenUitAanwas`).
    Opvragingen in stukken van 180 dagen (LinkedIn weigert boven de 14 maanden).
  - *Facebook*: `page_daily_follows` (nieuwe volgers), `page_impressions` en `page_follows` per dag.
    Stond sinds 8 oktober 2026 los in Windsor; op 20 november opnieuw gekoppeld en nagelopen (alle
    318 dagen t/m 14 november, alle drie de pagina's). **Altijd per dag opvragen**: Windsors eigen
    maandoptelling van `page_daily_follows` geeft voor februari, april, juni en september 0, terwijl
    de dagen ervan gewoon nieuwe volgers hebben. Audi Sport = de pagina Audi Sport Eindhoven.
  - *TikTok en YouTube*: niet gekoppeld in Windsor. De KPI's staan erin met hun percentage en tonen
    "niet gekoppeld"; aansluiten = account in Windsor koppelen, `accountId` in `definities.ts` zetten en
    een tak in `haalAccount` (`ophalen.ts`) toevoegen.
- **Opslag**: `kpi_2027_social_standen` (migratie 0039), één rij per account (`kanaal:account-id`) per
  jaar, met `dagen.vertoningen` en `dagen["nieuwe-volgers"]` (datum → aantal) en `dagen.volgers`
  (datum → stand). Bij Instagram worden volgers en nieuwe volgers samengevoegd (vorige stand + wat de
  nachtelijke sync bewaarde + het verse antwoord), de rest overschreven. **Wekelijks op zondag 10:45 UTC** (`/api/kpi-2027-social/bijwerken`, eigen cron, buiten
  de inlog via `CRON_PADEN`), alle accounts tegelijk; een account dat faalt houdt zijn vorige stand en
  de fout staat bovenaan de pagina (laatste run in `sync_runs`, bron `kpi-2027-social`). Jaren en
  definitief worden als op GA (`opdrachtenVoor`).
- **Meegerepareerd**: de nachtelijke sync overschreef de Instagram-volgers van gisteren met een lege
  waarde (het 30-dagenvenster komt elke nacht terug zonder stand), zodat er nooit meer dan één dag
  historie bleef. `schrijfBatch` laat voor `windsor_account_dag.volgers` nu een bekende stand staan
  (`coalesce`).

### KPI's → KPI's CRM

Vijfde tabblad onder **KPI's 2027** (view `kpi-2027-crm`, `components/kpi/Kpi2027CrmPaneel.tsx`, route
`app/api/kpi-2027-crm/route.ts`, rekenwerk in `lib/kpi2027crm/`), op verzoek van de eigenaar (20 november
2026): precies dezelfde opzet als de andere KPI-tabbladen — statusbalk, definitie, overzichtstabel
(`CrmOverzichtTabel.tsx`, gedeelde `OverzichtTabel.tsx`) en per groep de kaarten (`KpiCrmKaart.tsx`,
`KpiKaartOpmaak` als stand, net als volgers op social media).

- **Bron is de Selligent-export op Azure**, hetzelfde bestand en dezelfde tabel in het geheugen als Tools →
  Selligent database (`haalTabel` uit `lib/selligent/bron.ts`). Elk verzoek leest de laatste export
  (ETag-cache), "Opnieuw ophalen" doet `?vers=1`. Alleen aantallen gaan over de lijn.
- **De dagstanden worden bewaard** (verzoek van de eigenaar, 20 november 2026): de export bevat alleen de
  stand van vandaag, dus zonder opslag was de stand van 31 december 2026 (de basis voor het target) in januari
  2027 al weg. `kpi_2027_crm_standen` (migratie 0040) heeft één rij per dag per KPI-sleutel (`contacten`,
  `met-optin`, `autos`, `autos-optin`, `optin:<kolom>`) met **alleen het aantal** — geen e-mailadres of
  kenteken, dus de afspraak uit README-selligent.md (geen persoonsgegevens in een tweede database) blijft staan.
  De dag is die van de export (Last-Modified, Nederlandse kalender), niet die van de taak.
  - **Wie schrijft**: de wekelijkse taak `/api/kpi-2027-crm/bijwerken` (Vercel Cron, **elke vrijdag 11:00 UTC**
    = 12:00 in de winter, 13:00 in de zomer — Vercel kent geen tijdzones; verzoek van de eigenaar, 21 november
    2026) plus **één extra run op 31 december 11:00 UTC** (`?jaareinde=1`, een eigen regel in `vercel.json`).
    Die extra run is nodig: de laatste vrijdag van 2026 is 25 december en vrijdag 1 januari 2027 leest al een
    export uit 2027, dus zonder hem was de basis voor het target de stand van eerste kerstdag. Buiten de inlog
    via `CRON_PADEN`, met `CRON_SECRET`; `lib/kpi2027crm/bijwerken.ts`, run in `sync_runs` met bron
    `kpi-2027-crm`. Daarnaast legt elk bezoek aan het tabblad (`GET /api/kpi-2027-crm`) de stand van die dag
    vast, dus tussen twee vrijdagen komt er een stand bij op elke dag dat iemand kijkt.
    Allebei via `SYNC_DATABASE_URL` met upsert op (datum, kpi); er wordt nooit iets verwijderd. Lezen via de
    view `v_kpi_2027_crm_standen` met `DATAQUERY_DATABASE_URL` (`lib/kpi2027crm/bron.ts`).
  - **Lukt schrijven of lezen niet**, dan rekent het tabblad met alleen de stand van nu en staat er bovenaan een
    rode melding (`historie.schrijfFout` / `leesFout`); zolang 2026 loopt, staat er een melding sinds wanneer er
    bewaard wordt (`historie.vanaf`).
- **Alles telt unieke e-mailadressen** (kolom `MAIL`, terugval `EMAIL`; lege cel telt niet), zoals gevraagd.
  **Contacten** = het aantal verschillende e-mailadressen (gelijk aan de tegel E-mailadressen op Tools →
  Selligent). **Opt-in &lt;merk&gt;** = per booleaanse kolom het aantal verschillende e-mailadressen met
  minstens één rij `True` (hoofdletterongevoelig, spaties aan de rand tellen niet). Welke kolommen dat zijn
  staat nergens opgesomd: elke booleaanse kolom is een opt-in, dus een nieuwe voorkeur levert vanzelf een
  KPI op. De namen (`PREFERENCES_VW` → "Opt-in Volkswagen") staan in `OPTIN_NAMEN` in `definities.ts`; een
  onbekende kolom draagt zijn eigen naam, dus die lijst is een verfraaiing en nooit een voorwaarde.
- **Contacten met opt-in** (verzoek van de eigenaar, 20 november 2026): het aantal verschillende
  e-mailadressen met minstens één rij waarop minstens één opt-inkolom `True` is — een *of* over alle
  booleaanse kolommen, per contact; dezelfde definitie als het filter "Minimaal 1 opt-in" op Tools →
  Selligent. Elk adres telt één keer, dus kleiner dan de opt-ins bij elkaar opgeteld.
- **Aantal auto's** en **Auto's met opt-in** (verzoek van de eigenaar, 20 november 2026): unieke kentekens
  (`VDUVEHICLES_LICENSE_PLATE`, terugval: een kolom met PLATE of KENTEKEN in de naam), en daarvan de
  kentekens die op minstens één rij staan bij een e-mailadres met minstens één opt-in — de auto's van
  Contacten met opt-in. Een rij zonder e-mailadres maakt een auto niet "met opt-in". Let op: Tools →
  Selligent telt auto's op `VDUVEHICLES_VEHICLE_ID`, dus die twee getallen kunnen een paar auto's
  verschillen. Ontbreekt de kentekenkolom, dan staan deze twee er niet en meldt de pagina dat bovenaan.
- **Volgorde (verzoek van de eigenaar, 20 november 2026): Contacten, Contacten met opt-in, Aantal auto's,
  Auto's met opt-in, Opt-in VDU, Opt-in Service**, samen bovenaan in de groep "Contacten, auto's en
  algemene opt-ins", twee per rij (drie of meer naast elkaar laat de vier tegels per kaart over hun rand
  lopen). Daaronder "Opt-ins per merk" in de volgorde van het
  bestand. Welke kolommen VDU en Service zijn staat in `ALGEMENE_OPTINS` (`PREFERENCES_VDU`,
  `PREFERENCES_SERVICE`/`…SERVICES`, ook zonder voorvoegsel). Staat een ervan niet als True/False-kolom in
  de export, dan meldt de pagina dat bovenaan (`ontbrekend`) in plaats van dat de kaart stil ontbreekt.
- **Onder elke grafiek de definitie** (verzoek van de eigenaar, 20 november 2026), ingeklapt achter "Lees
  definitie" en in dezelfde opbouw als Syntec en social media (`KpiCrmKaart.tsx`): *Grafiek* (de bewaarde
  metingen, welke maanden aangenomen en welke doorgetrokken zijn, doel eind 2027), *Bron* (het bestand en de kolommen
  die deze KPI leest), *Wat telt mee* (de telling met het aantal; bij Contacten en Auto's met opt-in ook de
  lijst opt-inkolommen die meetellen) en *Keuzes in de definitie* (`keuzesVoor` in `definities.ts`, met de
  echte kolomnamen; elke KPI minstens drie, waaronder het target en hoe de dagstanden en de realisatie werken —
  getest). De uitleg
  bovenaan de pagina en onder de overzichtstabel noemt alleen wat voor alle KPI's geldt. Verander je een
  telling in `rekenen.ts`, pas dan in dezelfde wijziging `KpiCrmKaart.tsx` en `keuzesVoor` aan.
- **De stand uit de bewaarde metingen** (`berekenStand`): per KPI de reeks dag → aantal (bewaard plus de export
  van nu, `metHuidigeStand`). Per maand de laatste stand van die maand (`gerealiseerd`); maanden vóór de eerste
  bewaarde stand krijgen die eerste stand (`bijgeschat`, gestippeld, "Aangenomen" in de tooltip — zo wilde de
  eigenaar het: een rechte lijn tot de eerste meting); een maand zonder meting tussen twee metingen de vorige
  stand (`bijgeschat`); de maanden na de laatste meting de laatste stand doorgetrokken (`verwachting`, geen
  trend). Stand eind 2026 = de laatste meting van 2026; target eind 2027 = × 1,10 (`CRM_GROEI`, voor elke KPI;
  **niet** aan te passen — er is geen rij in `kpi_2027_groei` voor dit tabblad, want die tabel staat met een
  check constraint op de drie andere). Na 31 december is 2026 `definitief`. Realisatie 2027 = de laatste meting
  in 2027 (`realisatieUit`); voortgang zoals volgers (`voortgangStand`). Een KPI zonder bewaarde stand in 2026
  (een kolom die pas in 2027 in de export komt) heeft geen basis, wel een realisatie.
- **De eerste bewaarde dag is de dag waarop migratie 0040 en de code live staan.** Alles daarvóór is niet terug
  te halen (de export kent geen historie van opt-ins), en dat staat zo in de melding bovenaan en onder elke
  grafiek. Laat de taak dus vóór 31 december 2026 draaien.

### Sheet-sync in blokken

`/api/sync` (elke nacht, `vercel.json`) kopieert de sheet-tabbladen uit `lib/sync/bronnen.ts`
naar Postgres in één transactie: eerst `truncate`, dan alles erin. Tot november 2026 deed hij
dat met één `insert` per regel. "Data leads" groeide naar ±110.000 regels (±97.000 leads plus
lege opvulregels), en zoveel losse rondgangen pasten niet in de 300 seconden van Vercel: de
functie werd afgebroken, de transactie teruggedraaid, en `leads_raw` bleef van 19 oktober tot
half november op 99 regels staan, terwijl `sync_runs` elke nacht een gestarte run zonder
eindtijd liet zien. Nu schrijft hij in blokken van 5.000 regels per query, met één
JSON-parameter die `json_populate_recordset` naar de kolomtypes van de doeltabel omzet
(`lib/sync/blokken.ts`, getest). Lege opvulregels worden geteld maar niet meer elk met hun
inhoud in `sync_afwijkingen` gezet; van de overige afgekeurde regels bewaart hij er hoogstens
500 per run. **Zie je in `sync_runs` runs zonder `geeindigd_op`, dan is de functie
afgebroken** — kijk dan eerst naar de duur, niet naar de data.

### Monitoren → Budget beheer

Onder **Kanalen** staat een eigen groep **Monitoren** met één tabblad, **Budget beheer**
(`components/monitoren/BudgetBeheer.tsx`, view `budget-beheer`). Het zet de uitgaven en
klikken van een maand naast het budget en het klikdoel dat het team per **account ×
platform × maand** vastlegt.

- **Bron is die van Social ads**: Meta plus LinkedIn uit `v_advertenties`, álle klikken
  (`haalBudgetBeheer` in `bron.ts`). Zo komen de cijfers overeen met Social ads over
  dezelfde maand.
- **Platform is hier altijd Meta of LinkedIn, nooit een los sub-platform.** Facebook,
  Instagram, Threads en Audience Network (en Messenger) zijn los te herkennen in de
  brondata, maar het team stelt er nooit apart budget of een klikdoel voor vast — dus
  worden ze op dít tabblad, en alléén hier, samengevoegd tot één platform "Meta"
  (`platformGroep` in `lib/kanalen/budgetBeheer.ts`). Uitgaven en klikken van de
  onderliggende platforms tellen op; een ingevuld budget/doel telt óók op als het team
  ooit per sub-platform iets vastlegde. Wat als "Meta" wordt opgeslagen komt terecht
  onder het letterlijke platform `meta` in `budget_doelen` — die tabel bestaat alleen
  voor dit tabblad, dus dat raakt niets elders. De Kanalen-pagina's (Social ads incluis)
  blijven de losse platforms tonen; deze bundeling geldt uitsluitend voor Budget beheer.
- **Filterbalk**: een rij platforms en daaronder een rij accounts, als keuzeknoppen
  waarvan er altijd precies één aan staat — alles boven de tabel gaat over één account ×
  platform. Standaard Porsche Centrum Brabant en Meta (of de eerste in de lijst als
  die er niet is). Er is geen maandfilter: de pagina staat altijd op de lopende maand.
- **Layout**: links (1/3) de zes kaartjes, rechts (2/3) een staafgrafiek met budget en
  uitgaven per maand, januari t/m december van het lopende jaar; daaronder de invultabel.
  De lopende maand en de eerdere maanden komen uit twee aparte verzoeken (zie de route),
  omdat een heel jaar in één verzoek tegen de statement timeout aanliep. De tabel volgt
  de filters: twaalf regels (januari t/m december, oplopend) voor de gekozen combinatie,
  met de lopende maand gemarkeerd; per maand vul je budget en klikdoel in.
- **Zes kaartjes**, links geld en rechts klikken: gerealiseerd, forecast en afspraak.
  De forecast is bewust een rechte lijn — (gerealiseerd ÷ verstreken dagen) × dagen in de
  maand — zodat hij in het overleg na te rekenen is. Verstreken loopt tot en met
  **gisteren**, net als `periodeGrenzen`; op de 1e van de maand is er geen forecast.
  Rekenwerk en tests: `lib/kanalen/budgetBeheer.ts`.
- **Oordeel**: binnen 10% van budget/doel is "op koers". Te snel is bij geld het
  probleem (rood), te langzaam bij klikken; kleur zegt "let op", niet "hoger".
- **Invullen** gebeurt in de tabel onderaan, per veld opgeslagen bij het verlaten
  (`POST /api/budgetbeheer`, via de Supabase-client zodat RLS en `bijgewerkt_door`
  gelden). Leeg is "geen budget", niet nul, en een budget schuift niet door naar de
  volgende maand. Tabel: `dataloket.budget_doelen` (migratie 0027), `maand` is altijd de
  eerste dag van de maand.

### Monitoren → Landingspagina

Tweede tabblad onder **Monitoren** (`components/monitoren/Landingspagina.tsx`, view
`landingspagina`), voorlopig alleen zichtbaar voor de twee beheeraccounts. Een URL invullen
en op **Analyseer** klikken laat ChatGPT (OpenAI, model **GPT-6 Sol**, `gpt-6-sol`) de
pagina beoordelen als campagne-landingspagina van Van den Udenhout.

- **Dit tabblad draait op OpenAI, de rest van het dashboard op Claude.** De sleutel staat
  in `CHATGPT_KEY` (`isChatGPTGeconfigureerd` in `lib/config.ts`); het model is te
  overschrijven met `LANDINGSPAGINA_MODEL`. De route gebruikt de Responses API van de
  officiële `openai`-SDK met structured output (`strict: true`) en de screenshot als
  `input_image`. Deze aanroepen tellen niet mee in het tabblad Kosten; dat registreert
  alleen Claude-gebruik.

- **De prompt is van marketing** (`lib/landingspaginaPrompt.ts`) en bewust geschreven in
  principes, niet in vaste lijstjes of voorbeelden: met voorbeelden werd het model te
  gekaderd en ging het rare dingen doen. De werkwijze:
  1. **Begrijp de campagne.** Wat voor campagne, welke ene actie, wie de bezoeker is, wat
     die al weet, en welke informatie die nodig heeft (`verwachte_informatie`: duidelijk /
     onduidelijk / ontbreekt) — door het model zelf samengesteld, niet uit een standaardlijst.
  2. **Bepaal de weging.** Het model verdeelt per campagne 100 procentpunten over de zeven
     criteria en legt uit waarom (`weging_toelichting`). De route rondt die alleen af naar
     een som van precies 100 (`normaliseerGewichten` in `lib/landingspaginaCriteria.ts`).
  3. **Elk blok op nut.** `kern`, `aanpassen` of `overbodig` (`blokken`). Overbodige
     content telt als echte fout in Focus & opbouw.
  4. **Zeven criteria**, elk gekoppeld aan iets wat de marketeer zelf aanpast: Doel &
     doelgroep, Eerste scherm, Informatie & bezwaren, Duidelijkheid & consistentie, Focus &
     opbouw, Actie & formulier, Beeld. De namen liggen vast (zodat rapporten vergelijkbaar
     blijven), de weging niet.
- **Het eindcijfer is een oordeel, geen rekensom.** Het model geeft het zelf, met de
  weging als leidraad. Er was een periode met vaste wegingen, plafonds en een berekend
  gewogen gemiddelde; dat is op verzoek teruggedraaid omdat de zwaarte per campagne
  verschilt.
- **Geen message match.** De e-mail of advertentie waarmee de bezoeker binnenkomt kan niet
  worden meegegeven, dus de prompt beoordeelt niet of de pagina daarop aansluit. Wel geeft
  de marketeer de verkeersbron (wat weet de bezoeker al) en optioneel een omschrijving van
  doel en doelgroep (`rapport.campagnecontext`). Beide worden bewaard en hergebruikt bij
  "Opnieuw analyseren".
- **Het rapport is een schoolrapport** (`LandingspaginaRapport.tsx`), bewust zonder
  grafieken of animaties: bovenaan de kop met eindcijfer en hoe het model de campagne
  begreep (campagne, primaire actie, bezoeker), daaronder twee kolommen. Links de
  conclusie als kort verhaal en de verbeterpunten, rechts de weging-toelichting en de
  cijfers per criterium met hun gewicht (het cijfer rechts naast de tekst, verticaal
  gecentreerd); onder Informatie & bezwaren de checklist (✓ ? ✗),
  onder Focus & opbouw de blokken met de overbodige doorgestreept. Alleen een onvoldoende
  is rood. Oudere rapporten blijven leesbaar met hun eigen criteria.
- **Verbeterpunten: geen vast aantal.** Het model geeft er zoveel als de pagina nodig heeft
  (maximaal 10, de route kapt daarop af): een sterke pagina soms één of twee. Elk punt
  heeft een **urgentie** en een **impact** (hoog/middel/laag), als omlijnde labels rechts
  van de titel: hoog rood, middel lichtrood, laag grijs — twee keer rood is eerst
  oppakken. Oudere rapporten hadden impact + inspanning; die tonen alleen hun impact.
- **De lijst toont per pagina alle criteriumcijfers** naast het eindcijfer, met hetzelfde
  kleurgebruik. `lijstAnalyses` haalt daarvoor alleen `rapport->criteria` op, niet het
  hele rapport. Rapporten met oudere criteria hebben lege cellen.
- **Analyses lopen parallel.** Het formulier blijft bruikbaar en leegt zich na
  "Analyseer"; elke lopende analyse staat als regel in het blok Analyses (bezig → klaar met
  eindcijfer en "Bekijk rapport", of de foutmelding). Dezelfde URL twee keer tegelijk kan
  niet. Het tabpaneel blijft gemount (AppShell), dus wegklikken stopt een analyse niet;
  de pagina herladen wel.
- **Uitleg achter de i-knop.** Rechtsboven op dit tabblad (op de plek van het lampje op de
  Kanalen-pagina's, links naast het oogje) staat een i-knop met een brede pop-up
  (`BeoordelingUitleg.tsx`, `Modal` met `breed`) die in gewone taal uitlegt hoe een pagina
  wordt beoordeeld, hoe de weging en het eindcijfer tot stand komen en hoe je het rapport
  leest. **Pas die tekst mee aan** als de prompt of de criteria veranderen, anders vertelt
  het dashboard iets anders dan het model doet.
- **Screenshot uploaden.** Onder de URL staat een knop voor een JPEG (of PNG) van de
  volledige pagina. De browser knipt hem in stukken van 1000 × 1400 px
  (`lib/screenshotDelen.ts`, max. 10 stukken): één lange afbeelding zou de API verkleinen
  tot tekst en knoppen onleesbaar zijn. De stukken gaan in volgorde als afbeeldingen vóór
  de tekst mee, en de prompt maakt de screenshot dan leidend voor alles wat visueel is
  (eerste scherm, knoppen, hiërarchie, fotokeuze). Zonder screenshot blijft het model
  binnen wat de tekst laat zien. De screenshot zelf wordt niet bewaard, alleen
  `rapport.met_screenshot`; wie opnieuw analyseert, uploadt hem opnieuw.
- **Ontwerpvoorstel.** Na een analyse mét screenshot start de pagina vanzelf een tweede
  aanroep (`app/api/landingspagina/ontwerp/route.ts`) die de pagina opnieuw laat tekenen
  met de belangrijkste verbeterpunten verwerkt, in het design van de screenshot. Het staat
  onder het rapport (`OntwerpVoorstel.tsx`): links de afbeelding, rechts de samenvatting en
  de wijzigingen met het verbeterpunt waar ze uit komen.
  - **Twee stappen.** GPT-6 Sol krijgt screenshot en rapport en schrijft een ontwerpbrief
    (`ONTWERP_SCHEMA`, prompt in `lib/landingspaginaOntwerpPrompt.ts`): de wijzigingen voor
    de marketeer en een Engelse beeldopdracht met elke Nederlandse tekst letterlijk erin.
    Daarna tekent het beeldmodel (`gpt-image-2.5-flare`, te overschrijven met
    `LANDINGSPAGINA_BEELDMODEL`) via `images.edit` de pagina, met de screenshot-stukken als
    voorbeeld. Flare en Sunburst hebben dezelfde tokenprijs en beeldkwaliteit; Flare is
    tot de helft sneller, en dat telt binnen `maxDuration`. In `high` op 1024 × 3072 kost
    het beeld zo'n $0,15–0,20, plus de brief. Direct het rapport aan het beeldmodel geven werkt slechter: dat verzint dan
    zelf teksten en kiest niet welke punten voorgaan.
  - **Zelfde design, zelfde scope als de audit.** Header, footer, kleuren, typografie en
    componenten blijven gelijk; alleen wat de content marketeer beheert verandert. Feiten
    die niet op de pagina staan komen er als `[invulplek]` in, niet verzonnen.
  - **Formaat 1024 × 3072** (staand 1:3, de uiterste verhouding die het model aankan): de
    hele pagina in één beeld, in hoogte samengedrukt. Webp, als data-URL.
  - **Een aparte tabel** (`landingspagina_ontwerpen`, migratie 0030, één rij per analyse).
    Opnieuw analyseren houdt dezelfde id, dus een ontwerp dat ouder is dan de laatste
    analyse hoort bij het vorige rapport: `haalOntwerp` geeft dan null.
  - **Geen screenshot, geen ontwerp.** Zonder screenshot kent het beeldmodel het design
    niet. Bij een rapport zonder ontwerp (of om het opnieuw te maken) upload je de
    screenshot onder het rapport; ook hier wordt hij niet bewaard.
  - **Tijd.** Brief (reasoning `low`) plus beeld in `high` duurt samen twee tot vier minuten,
    binnen `maxDuration` 300. Geen retries in de client: twee pogingen passen er niet in.
- **Eén regel per pagina.** `landingspagina_analyses.url` is uniek (migratie 0028); opnieuw
  analyseren overschrijft het rapport. `normaliseerUrl` haalt trackingparameters, `#` en
  een slash aan het eind weg, zodat een advertentielink met utm-parameters niet als aparte
  pagina telt.
- **Iedereen mag lezen, alleen beheerders analyseren.** De GET-route en de RLS staan open
  voor elke ingelogde collega (het team moet oude rapporten kunnen inzien); de POST-route
  en het tabblad zelf nog niet.
- **Alleen wat de content marketeer beheert.** De rapporten zijn voor content marketeers
  die binnen het CMS campagnepagina's bouwen: tekst, koppen, knoppen, formulieren, FAQ,
  beeldkeuze en de volgorde van blokken. Header, (mega)menu, footer, het designtemplate
  en techniek (snelheid, tracking, SEO-techniek) kunnen zij niet aanpassen, dus de prompt
  sluit die expliciet uit van beoordeling en advies. De route knipt
  menu, site-header en footer bovendien al uit de HTML (`alleenPaginaInhoud`) voordat
  Claude hem ziet; een `<header>` binnen `<main>` blijft staan, want dat is vaak de hero.
- **Ophalen.** De route haalt de pagina zelf op met browserheaders. Weigert de site dat
  (de botbescherming van udenhout.nl gaf eerder direct een 403), dan gaat de analyse door
  op alleen de screenshot, als die er is; zonder screenshot krijgt de gebruiker de vraag
  er een te uploaden. (Toen dit tabblad nog op Claude draaide, was er een terugval via
  Claude's web_fetch-tool; OpenAI heeft geen vergelijkbare tool om één URL op te halen.)

### Campagnebeheer → Syntec en Google Analytics

Campagnebeheer (`components/beheer/CampagneBeheer.tsx`) heeft twee tabs boven de
filterbalk; het gekozen tabblad staat in de URL als `?beheer=ga`.

- **Syntec** is wat Campagnebeheer altijd was: de sheetvelden, bewerkbaar in-place.
- **Google Analytics** (`components/ga4/Ga4Koppeltabel.tsx`) koppelt elke campagne aan de
  GA4-events die voor hem als conversie tellen. De campagnenaam, merk, model, start- en
  einddatum (alleen lezen — bewerken doe je op Syntec), de koppeling en (als controle)
  de telling; verder geen sheetvelden. Bewerken gaat in een zijbalk
  (`Ga4KoppelZijbalk.tsx`), want een koppeling past niet in een cel.
  - **Regels.** Een campagne heeft één of meer regels (onderling "of"); een regel heeft
    events (onderling "of") en voorwaarden (onderling "en") op paginapad, querystring,
    pad + querystring, website, kanaalgroep of utm-campagne, met bevat / bevat niet / is /
    is niet / begint met, hoofdletterongevoelig. Alle regels staan in één `where … or …`,
    dus een event dat twee regels matcht telt één keer. Rekenwerk en SQL:
    `lib/ga4Koppeling.ts`, getest in `lib/ga4Koppeling.test.ts` — waarden altijd als
    parameter, kolomnamen uit een vaste lijst.
  - **Geteld wordt `events`, niet `conversies`**: ook een event dat in GA4 geen key event
    is telt mee als het is aangevinkt. Over de looptijd uit de sheet, tot en met gisteren
    (`telPeriode`).
  - **Het voorbeeld onderaan de zijbalk telt het concept** vóór het opslaan, via dezelfde
    route (`/api/campagne-ga4/tellen` krijgt de regels mee in plaats van ze te lezen).
    Een koppeling die je pas na opslaan kunt controleren, controleert niemand.
  - **Data**: `windsor_ga4_event_paginas` (migratie 0031) — events × pagina ×
    querystring, zónder page_view, scroll, user_engagement en first_visit (`GA4_EVENT_RUIS`)
    en met de trackingparameters uit de querystring gehaald (`schoonQuerystring` in
    `lib/windsor/sync.ts`). session_start zit er bewust wél in: een sessie die op de
    campagnepagina begint is een volwaardig doel. Zet de ruisevents er niet bij en laat
    `fbclid` en consorten er niet in: allebei laten de tabel exploderen.
  - **Opslag**: `campagne_ga4_doelen` (migratie 0031), gekoppeld op campagnenaam zoals
    `campagne_cijfers`. Het **doel** staat daar ook en niet in de sheet; het wordt
    ingevuld in de campagnetabel (rij "Doel GA conversies", `Ga4Cellen.tsx`). Doel en
    regels worden los opgeslagen zonder elkaar te overschrijven (`zetGa4Koppeling`).
  - **De eventkiezer toont altijd de top 10** op volume, en tijdens het typen de top 10
    van de treffers (`zoekEvents`: per woord, streepjes tellen niet, dus "lead proefrit"
    vindt `generate_lead_proefrit`). Het aantal en de volgorde gaan standaard over de
    **looptijd van de campagne** (start- tot einddatum, tot en met gisteren — dezelfde
    periode als de telling); events die alleen buiten die periode vuurden staan er met
    nul in, zodat ze vindbaar blijven. Zonder startdatum of vóór de start: de laatste 90
    dagen. De keuzelijst komt uit `v_ga4_events` en niet uit
    `v_ga4_event_paginas`: die tweede is leeg tot de historie is opgehaald, en een lege
    keuzelijst laat niemand een koppeling maken. De ruisevents staan er niet in, want die
    kunnen nooit iets tellen.
  - **Eén ophaalactie** voor de campagnetabel en dit tabblad
    (`lib/ga4KoppelingContext.tsx`), zodat ze na het opslaan hetzelfde getal tonen.

### Campagnes → Marketing analyse

Vierde tabblad onder **Campagnes** (view `marketing-analyse`, `components/marketingAnalyse/`,
routes `app/api/marketing-analyse/`, rekenwerk in `lib/marketingAnalyse/`, migratie 0042). Per
campagne een full-funnel analyse die **Claude Code maakt** (skill
`.claude/skills/marketing-analyse/` in de root van de repo) en het dashboard toont. Voor iedereen
zichtbaar. **Het plan en alle besluiten van de eigenaar staan in `campagne-analyse-tool.md`**;
lees dat eerst voordat je hier iets verandert.

- **HRM campagne** (eerst "HRM analyse", 26 november 2026, migratie 0053; sinds 27 november 2026 een
  maandrapport, migratie 0054, verzoek van de eigenaar): een opzet `rapportage` (vast id `...0006`) voor
  werving bij alle bedrijven, **maandelijks**: 1 januari t/m de afgelopen maand, elke vergelijking tegen
  de maand daarvoor, en elk hoofdcijfer apart voor Van den Udenhout, PGZ (Porsche, Bentley) en VELOO
  (VELOO apart: besluit van de eigenaar, 27 november 2026, prompt versie 3, migratie 0055). Uitgaven
  aan vacaturecampagnes, leads via social media (per maand én per week) en sollicitaties op de website.
  Prompt versie 3 bij de opzet, het blok **Werving** in de semantic layer (`werving` in
  `standaardSemantiek.ts`, gelijk aan semantic layer versie 7) en een eigen paragraaf in de skill.
  Onderzoek en besluiten: `hrm-analyse-onderzoek.md`.
- **Vergelijking onder een kerncijfer** (27 november 2026, voor de maandrapporten): staat er een
  `vergelijking` bij een kerncijfer, dan toont `KerncijferRij` (`SectieBlok.tsx`) het verschil in
  procenten (bij een percentage in procentpunten) vóór het cijfer van de vorige periode
  ("+12% t.o.v. oktober: 500"). Het dashboard rekent het zelf uit (`vergelijkingVerschil` in
  `rekenen.ts`, getest); de kleur zegt "gunstig" via `vergelijking.hogerIsBeter` (false bij kosten per
  lead), en zonder die vlag (uitgaven) blijft het verschil neutraal.
- **E-mail VDU** (26 november 2026, verzoek van de eigenaar, §23 van het plan): een opzet `rapportage`
  voor de e-mailmarketeers, maandelijks, met drie stappen in de groepen E-mail, Website en Resultaat
  (`Sectie.groep` zet bij een rapportage kopjes in de navigatie). **E-mail is altijd één kanaal**: het
  e-mailkanaal en de Selligent-klikken met M_BT= worden opgeteld en nergens in een analyse
  uitgesplitst of uitgelegd (semantic layer versie 8 en 9, `standaardSemantiek.ts`, skill).
- **Harde regel voor de data** (besluit van de eigenaar, november 2026): een analyse gebruikt
  alleen Windsor **live** (Google, Meta en LinkedIn Ads, de organische kanalen en GA4), de
  leads-kopie `marketing_analyse_leads` en de orders-kopie `marketing_analyse_orders` (beide alleen
  voor Van den Udenhout) en `lead_kanaalkosten`
  (die laatste **niet** bij een campagne-analyse: daar zijn de kosten alleen de mediakosten uit
  Google Ads, Meta Ads en LinkedIn Ads; besluit van de eigenaar, 24 november 2026).
  **Niet** de andere tabellen in Supabase, ook niet `windsor_*`, `leads_raw` of `v_leads`. Die
  regel staat in de skill, in de standaard-hoofdprompt en in de verantwoording van elke analyse.
- **Leads-kopie** (`marketing_analyse_leads`, gevuld door `/api/sync` uit dezelfde keer lezen
  als `leads_raw`, eigen transactie en eigen regel `Marketing analyse leads` in `sync_runs`):
  zeven kolommen 1-op-1 uit "Data leads" (Kanaal, Ordersoort, Onderwerp, Kanaalgroep, Merk,
  Model, Aangelegd; Kanaal sinds migratie 0047) plus `aangelegd_op` om op te filteren; de laatste
  365 dagen; zonder rijen met "FW:" in Onderwerp. Filterlogica in `lib/sync/analyseLeads.ts`
  (getest). Alleen van toepassing op Van den Udenhout (`BEDRIJF_MET_SYNTEC`); de andere bedrijven
  kijken voor leads alleen naar GA4.
- **Orders-kopie, bron "Syntec orders"** (25 november 2026, migratie 0048, §16 van het plan):
  `marketing_analyse_orders`, vijf kolommen 1-op-1 uit het tabblad "Data orders" (Ordersoort,
  Klantgroep, Merk, Model, Orderdatum) plus `orderdatum_op`, de laatste 365 dagen, één rij per
  verkochte auto. Gevuld door `/api/sync` (eigen regel `Marketing analyse orders` in `sync_runs`);
  "Data orders" staat niet in `BRONNEN`, dus de sync leest het tabblad zelf (`ANALYSE_ORDERS_BRON`).
  De leads- en orders-kopie delen `vervangKopie` in `app/api/sync/route.ts`. Tellen gaat in de view
  `marketing_analyse_orders_klant` (alleen Nieuw en Gebruikt; Handel apart, `klantgroep_naam`), gelijk
  aan `isKlantOrder` / `klantgroepNaam` in `lib/sync/analyseOrders.ts` (getest). **De uitsplitsing per
  klantgroep staat altijd in de analyse**: semantic layer (Algemeen en blok Syntec orders,
  `data_orders`), hoofdprompt en skill. Eigen tabblad **Orders in Syntec** (`orders`), grijs als de
  analyse niet uitsluitend over Van den Udenhout gaat. Orders zijn nooit het leadcijfer.
- **Altijd het totaal van leads en orders** (25 november 2026, migratie 0052, §22 van het plan). De
  stap Leads in Syntec begint met alle leads (Internet en offline, Internet per soort, de websiteleads;
  view `marketing_analyse_leads_soort`), de stap Orders in Syntec met alle orders per ordertype (ook
  Handel en verhuur; view `marketing_analyse_orders_type`, gelijk aan `ordertypeVan`, getest). Context,
  nooit het leadcijfer. Staat in semantic layer versie 5, de hoofdprompt en de skill.
- **Leads: één bron, GA4 of Syntec** (besluit van de eigenaar, 25 november 2026, §15 van het plan).
  Bij een Campagne analyse komt het leadcijfer (`kerncijfers.leadsDoel`, met `leadBron` en
  `leadsDoelSoort`) **standaard uit Google Analytics**: de lead-events van de soort uit het doel
  ("20 proefritten" = 20 proefritleads op de website). **Alleen als het doel expliciet Syntec noemt**
  (en de analyse uitsluitend over Van den Udenhout gaat) uit Syntec, en dan alleen leads met
  Kanaalgroep "Internet" én "udenhout.nl" in Kanaal of Onderwerp: de view
  `marketing_analyse_leads_website` (met kolom `soort`), gelijk aan `isWebsiteLead` /
  `soortWebsiteLead` in TypeScript. Nooit opgeteld of gemengd. Staat in de semantic layer
  (versie 3), de standaard-hoofdprompt, de skill en de uitleg bij het doelveld.
- **Analyse opzetten** (fase 2, migratie 0044, besluiten in §13 van het plan). Elke regel in
  het overzicht heeft een opzet (`marketing_analyse_opzetten`): **Campagne analyse** (standaard,
  vast id `STANDAARD_OPZET_ID`, formulier `campagne`) of bijv. VDU/PGZ maand- en
  kwartaalrapportage (formulier `rapportage`, vast bedrijf). Het uitklapmenu bovenaan de
  briefing kiest de opzet en daarmee het formulier: een rapportage heeft naam (vult zich met
  opzet + periode), bedrijf, een **open periode** (`periode_tekst`, Claude zet hem per analyse om
  in datums) en omschrijving, en **geen label**. Elke opzet heeft een eigen prompt (per opzet
  genummerd); een lege prompt laat de skill **weigeren**, nooit terugvallen. In het overzicht
  krijgen alleen campagnes doel, funnelcijfers en kosten op schema; een rapportage toont alleen
  planning, naam en Laatste analyse. Rechtsboven **Analyse prompts** (uitklapmenu per
  opzet; de eigenaar wijzigt daar ook naam, formulier, bedrijf en actief, en maakt met
  "Nieuwe opzet" zelf opzetten aan; verwijderen alleen zonder analyses, anders uitzetten).
  Route `opzetten`, `leesCampagneInvoer(body, opzet)` in `rekenen.ts` (getest).
- **Meerdere bedrijven** (migratie 0045). Een analyse en een opzet hebben een lijst
  `bedrijven` (chips in de briefing en bij de opzet, `BedrijvenKiezer.tsx`); een opzet zonder
  bedrijven laat de keuze aan de briefing. De oude kolom `bedrijf` blijft als leesbare kopie
  ("PGZ, VELOO"), bijgehouden door een trigger; lees en schrijf `bedrijven`. Syntec-leads
  alleen als de analyse **uitsluitend** over Van den Udenhout gaat én het doel Syntec noemt (`leadBron`).
- **Overzicht campagne-analyses** (verzoek van de eigenaar, november 2026): kolommen status-stipje
  (vooraan), Campagne (met de laatste analyse eronder), Uitgaven (balkje
  tegen het budget, rood boven 100%), CTR (gezamenlijk over Google, Meta en LinkedIn Ads:
  `klikken` ÷ `vertoningenAds`, gewogen, nooit over de vertoningen inclusief organisch),
  Bezoekers (`sessies`: sessies die op de campagnepagina begonnen, uit elk kanaal), Leads (`leadsDoel` uit één bron:
  Google Analytics, of Syntec als het doel dat zegt; bron en soort eronder) en Doel leads (balkje, groen
  vanaf 100%). Het leaddoel komt uit `kerncijfers.doelLeads` (de analyse leest het uit het
  vrije doel), anders het eerste getal in het doel (`overzichtCijfers` in `rekenen.ts`,
  getest) en helemaal rechts Planning (uitklapmenu, zie hieronder; 26 november 2026 op verzoek van
  vooraan naar rechts verplaatst). Rapportages hebben een eigen tabel eronder: stipje, Rapportage,
  Laatste analyse, Planning.
- **Live-stipje en statusfilter** (26 november 2026, op verzoek). Vooraan elke regel een **groen**
  stipje als de analyse live is (vandaag tussen start- en einddatum, grenzen inbegrepen; zonder
  startdatum = begonnen, zonder einddatum = niet afgelopen, dus een rapportage is live), anders
  **grijs** (`isLive` in `rekenen.ts`, getest). Het groene stipje ademt heel subtiel (`.live-stip` in
  globals.css: iets feller met een zachte gloed en weer terug, op `--duur-adem`; uit bij
  `prefers-reduced-motion`). Links van de soortknoppen staan **Live** en **Niet live** (nog eens
  klikken = beide; in de URL als `?status=`). Het inklapbare blok Afgelopen is daarmee vervallen: het
  overzicht toont alles in één tabel, live bovenaan, dan wat nog moet beginnen, dan afgelopen
  (`sorteerOpStatus`, getest).
- **Filterbalk op bedrijf** (26 november 2026, op verzoek): een rij knoppen bóven de andere filters,
  **Alle** (standaard) en één per bedrijf uit de semantic layer, aangevuld met bedrijven die alleen in
  analyses voorkomen (`bedrijfFilterKnoppen`, `filterOpBedrijf`, getest). Een analyse over meer
  bedrijven telt bij elk. Aantallen tellen binnen de andere filters; in de URL als `?bedrijf=`.
- **Planning van de analyseronde** (25 november 2026, migratie 0049, besluiten in §17 van het plan).
  Het schuifje Ronde is een uitklapmenu **Planning** geworden (`PlanningKeuze.tsx`, in een portal
  omdat de tabel horizontaal scrolt): Uit, Wekelijks, Maandelijks (eerste vrijdag van de maand) en
  Per kwartaal (eerste vrijdag van jan, apr, jul, okt). Achter elke keuze staat de volgende datum,
  onder het knopje die van de gekozen stand (blauw = staat klaar, oranje = eindevaluatie). Uit = geen
  updates, ook geen eindevaluatie. De balk **Volgende analyseronde** boven het overzicht is er op
  26 november 2026 op verzoek uit gehaald (`RondeBalk.tsx` verwijderd). Een ronde hoort bij een week (ma t/m
  zo), een gemiste week wordt ingehaald, een geplande rapportage gaat over de vorige volle maand of
  het vorige volle kwartaal. De rekenregel staat twee keer, gelijk gehouden: `planning.ts` (getest)
  voor het dashboard en `dataloket.marketing_analyse_ronde(datum)` voor de skill. De kolom
  `analyse_ronde` loopt via een trigger mee met `planning`, zodat de bestaande SQL-functies niet
  veranderden; lees en schrijf `planning`. Elke opzet heeft een standaardplanning (instelbaar bij de
  opzet onder Analyse prompts).
- **Vier kennislagen.** De *briefing* (opzet, naam, **Bedrijven** = welke van onze bedrijven, **Merk** =
  automerk, modellen, looptijd, doel als vrije tekst, totaalbudget, omschrijving; bij een
  rapportage naam, bedrijf, periode en omschrijving); de
  *prompt van de opzet* (bij Campagne analyse de hoofdprompt met een hoofdstuk per label); de *semantic layer* (per databron een
  tekstblok, plus in Algemeen de bedrijvenlijst voor de keuzelijst en welke accounts bij welk
  bedrijf horen; startinhoud in `standaardSemantiek.ts`); en de *Data correctie* per campagne
  (wat er bij een vorige analyse niet klopte). Prompts en semantic layer: lezen iedereen,
  opslaan alleen de eigenaar (`isBeheerder`), elke opslag een nieuwe versie. Data correctie:
  iedereen.
- **Mail bij een nieuwe analyse** (migratie 0043, `lib/marketingAnalyse/notificatie.ts` en
  `mail.ts`). In het overzicht staat helemaal rechts op elke regel een mail-icoontje met het
  aantal volgers; een klik opent een zijbalk (`VolgersZijbalk.tsx`, verzoek van de eigenaar:
  niet meer als blok op de analysepagina) waarin iedereen de analyse kan volgen (eigen adres met
  één klik) of een ander adres toevoegen of verwijderen (`marketing_analyse_volgers`, route `volgers`; weghalen: de
  volger zelf, wie het toevoegde, of de eigenaar). Een insert in `marketing_analyse_versies`
  laat een trigger via pg_net `POST /api/marketing-analyse/notificatie` doen; die claimt de
  versie (`notificatie_verstuurd_op`) en mailt elke volger via het **gedeelde Gmail-account**
  (`smtp.gmail.com`, nodemailer). Env in Vercel: `GMAIL_GEBRUIKER` en `GMAIL_APP_WACHTWOORD`
  (een app-wachtwoord, nooit in code of chat); optioneel `DASHBOARD_URL` voor de links. De
  route en `/api/marketing-analyse/afmelden` (link in de mail, GET toont een knop, POST meldt
  af) staan buiten de inlog in `lib/toegang.ts`; de notificatieroute verstuurt alleen een
  bestaande, nog niet verstuurde versie van hoogstens zeven dagen oud. Mislukt het, dan blijft
  de fout in `notificatie_fout` staan en probeert `/api/sync` het 's nachts opnieuw. De
  trigger-URL staat vast in de migratie (productie, `news-ten-chi.vercel.app`).
- **Verzonden e-mails** (25 november 2026, migratie 0050, op verzoek van de eigenaar). Elke mail wordt
  per adres gelogd in `marketing_analyse_mail_log` (campagnenaam, versie, label, adres, tijdstip,
  gelukt of fout; `logMail` in `notificatie.ts`, een logfout stopt het mailen nooit). Achter het
  schildje Beheer staat voor de eigenaar de knop **Verzonden e-mails** (`MailLogZijbalk.tsx`, route
  `mails`, alleen `isBeheerder`, leest via de dienstverbinding: de tabel heeft geen leesrecht voor
  ingelogde collega's). Per regel wie wanneer welke analyse kreeg, nieuwste eerst, zoekbaar op adres
  of campagne. Versies zonder logregel staan er ook in (`mailOverzicht` in `mailLog.ts`, getest): van
  vóór het logboek met alleen het aantal, zonder volgers ("Geen mail") of niet verstuurd met de fout.
- **E-mail settings: adressen per merk** (25 november 2026, migratie 0047, op verzoek). Per automerk
  de adressen die standaard volger worden van elke nieuwe analyse voor dat merk, zodat niemand ze per
  analyse opnieuw hoeft op te geven (`MerkMailZijbalk.tsx`, route `merk-mail`, tabel
  `marketing_analyse_merk_mail`). Een trigger op `marketing_analyse_campagnes` zet ze erbij bij een
  insert (dashboard, voorgestelde analyse én Claude Code) en bij een ander merk in de briefing; de
  route zet een nieuw adres ook bij de lopende analyses van het merk (einddatum leeg of vandaag of
  later). Weghalen bij een merk laat de volgers bij analyses staan; zo'n volger heeft `via_merk` en
  toont "via Audi" in de volgerszijbalk. Het merk is vrije tekst: vergelijken gaat op een sleutel
  zonder hoofdletters en accenten, en "Volkswagen, Audi" telt voor beide merken (`merkSleutel` en
  `merkSleutels` in `rekenen.ts`, getest, gelijk aan de SQL-functies). De lijst begint met
  `STANDAARD_MERKEN`, aangevuld met merken met adressen en merken uit de briefings. Rechten als bij
  volgers: iedereen voegt toe; weghalen kan het adres zelf, wie het toevoegde of de eigenaar.
- **Versies en label.** `marketing_analyse_bewaar` kent het versienummer toe uit
  `laatste_versie` op de campagne (een verwijderde versie wordt nooit hergebruikt), bepaalt het
  label (**Eindevaluatie** als de einddatum vóór vandaag ligt, anders **Tussentijdse
  evaluatie**; bij een rapportage geen label), legt briefing (met opzet en periode) en Data
  correctie van dat moment vast en zet de **planning** (via `analyse_ronde`)
  uit na een eindevaluatie. Elke versie onthoudt met welke hoofdprompt en semantic layer hij is
  gemaakt. Alleen de eigenaar kan een versie verwijderen.
- **Het formaat** (`lib/marketingAnalyse/types.ts`, `MaResultaat`) is generiek: samenvatting
  (kop + hoogstens vijf regels voor het management), doeloordeel, secties per tabblad
  (kerncijfers, Markdown, tabellen, grafieken, en rechts kop, oordeel, bevindingen en acties),
  acties voor de campagne als geheel,
  verantwoording (herkenning, gebruikte bronnen, wat er met de Data correctie is gedaan,
  kanttekeningen) en voorstellen voor de semantic layer. `normaliseerResultaat` zorgt dat een
  ontbrekend veld de pagina niet breekt. **Verander je het formaat, pas dan de skill in dezelfde
  wijziging aan.**
- **De analysepagina: de funnel als navigatie** (25 november 2026, opzet A, op verzoek; besluiten
  in §19 van het plan, eerdere opzet met tabbladen in §14). Links een vaste navigatie
  (`StapNavigatie.tsx`): bovenaan **Samenvatting**, dan de stappen van de funnel in hun groepen
  (`ANALYSE_TABBLADEN` in `types.ts`, indeling in `tabbladenVoor` in `rekenen.ts`, getest), elk
  met nummer, hoofdgetal en stipje met het oordeel, en onderaan **Verantwoording**.
  - **De stappen (formaat 3, 25 november 2026, plan §21)**: Media: **Advertenties** (met bereik
    en investering), **Organische social**, **E-mail**; Website: **Campagnepagina** (verkeer en
    gedrag op de pagina), **Conversies** (lead-events en andere conversies, op de pagina of
    elders), **Vervolg op de website** (waar bezoekers daarna heen gaan); Resultaat: **Leads in
    Syntec**, **Orders in Syntec**. Versies in formaat 2 houden hun tien tabbladen van toen
    (`ANALYSE_TABBLADEN_V2`): `tabbladenVoor` kiest de lijst op `formaat`. Verander je de stappen,
    dan samen met de standaard-hoofdprompt en de skill, en met een nieuw formaatnummer. Rechts de open stap; de pagina opent op de samenvatting en de
  open stap staat in de URL (`mtab`, leeg = samenvatting). Dit vervangt de horizontale tabbalk en
  is daarmee nog steeds de derde uitzondering op "geen dubbele navigatie"; maak er geen precedent van.
  - **Samenvatting** (`SamenvattingPagina.tsx`): de conclusie (kop, regels, toelichting
    inklapbaar) met rechts de voortgang: dag x van y en twee balken, doel en budget, met een streep
    voor het verstreken deel van de looptijd (`voortgangVanAnalyse` en `budgetTempo` in
    `rekenen.ts`, getest; leads en kosten volgen `overzichtCijfers`). Daaronder een rode melding
    per stap met oordeel probleem, **Wat nu te doen** (de acties voor de campagne als geheel, op
    prioriteit, met knoppen naar hun stappen) en **De funnel in één oogopslag** (elke stap met
    hoofdgetal, oordeel en kopzin, klikbaar).
  - **Acties afvinken** is gedeeld voor het hele team (migratie 0051,
    `marketing_analyse_acties_klaar`, route `acties`): één rij per afgevinkte actie van een versie,
    met wie en wanneer. De actie heet naar haar plek in `aanbevelingen` (`geheel-0` …), want een
    versie verandert nooit; een nieuwe versie begint met een lege lijst. Iedereen mag afvinken en
    uitvinken.
  - **Elke stap** (`StapPagina.tsx`) heeft dezelfde opbouw: "Stap n van N · groep", naam met
    oordeel, de kopzin en de kerncijfers; dan **Wat we zien** (bevindingen) naast **Wat nu te
    doen** (acties van de stap); dan grafieken en tabellen (`AnalyseGrafiek`, `AnalyseTabel` uit
    `SectieBlok.tsx`); ingeklapt **Hoe is dit gemeten?** (de `tekst` van de sectie); onderaan
    naar de vorige en volgende stap. Een stap zonder data toont de reden.
  - **Briefing** en **Volgers** zijn knoppen in de kop en openen een zijbalk (`Briefing.tsx`,
    `VolgersZijbalk.tsx`). Analysedatum, periode, prompt- en semantic-layerversie en "Versie
    verwijderen" staan onderaan de rechterkolom.
  - Versies in formaat 1 en rapportages krijgen een stap per sectie, zonder groepen; daar vallen
    Wat we zien en Wat nu te doen per stap weg (die velden bestaan daar niet).
  - **Benchmark onder een kerncijfer** (25 november 2026, op verzoek; plan §20). Een kerncijfer kan
    een `benchmark` dragen (`KerncijferBenchmark` in `types.ts`): de verdeling van hetzelfde cijfer
    bij soortgelijke campagnes, posts of campagnepagina's uit **onze eigen historie** (12 maanden
    vóór de start, zelfde accounts; geen branchecijfers, keuze van de eigenaar). Claude rekent hem
    uit (skill, "Benchmarks"); het dashboard bepaalt het oordeel zelf (`benchmarkOordeel`: boven het
    derde kwart beter, onder het eerste slechter, omgekeerd bij `hogerIsBeter: false`) en tekent
    onder het cijfer een label met een dunne balk (`BenchmarkRegel` in `SectieBlok.tsx`,
    `benchmarkSchaal`): grijs vlak = middelste helft, streepje = mediaan, stip = het cijfer, rechts
    is altijd beter. `leesBenchmark` (in `normaliseerResultaat`) laat een benchmark met minder dan 5
    items of niet-oplopende kwartielen weg. Getest in `rekenen.test.ts`.
- **Het overzicht**: één tabel, live bovenaan op startdatum, dan nog te beginnen, dan afgelopen
  (zie "Live-stipje en statusfilter"); per regel de planning (uitklapmenu) en bij campagnes de kerncijfers uit de laatste analyse.
  Rechtsboven (25 november 2026, op verzoek) een schildje **Beheer**, dan **E-mail settings** en Nieuwe
  analyse. Analyse prompts, Semantic layer en (alleen voor de eigenaar) Verzonden e-mails staan achter het schildje (vooral voor beheerders, maar
  iedereen kan ze openen); open of dicht wordt per browser onthouden. De open analyse staat in de URL
  (`?analyse=<campagne-id>`).
- **Filterbalk op soort analyse** (25–26 november 2026, op verzoek; `OpzetFilterBalk.tsx`). Tussen de
  filter op bedrijf en het blok met analyses een rij knoppen, met links het statusfilter (Live / Niet
  live): **Alle** en één per **soort**, met het aantal analyses binnen de andere filters. Een soort is de naam van de opzet
  zonder afkortingen in hoofdletters (`opzetSoort` in `rekenen.ts`, getest): VDU en PGZ
  maandrapportage vallen samen onder **Maandrapportage**, kwartaal onder **Kwartaalrapportage**,
  "E-mail VDU" wordt **E-mail** (besluit van de eigenaar: over de bedrijven heen, niet per bedrijf).
  De knoppen komen uit de opzetten (`opzetFilterKnoppen`, `filterOpOpzet`), dus een nieuwe opzet krijgt
  vanzelf een knop of valt in een bestaande soort; een soort met alleen uitgezette opzetten staat er
  alleen zolang er analyses van zijn. Een soort zonder analyses (binnen de andere filters) staat
  **grijs** maar is klikbaar. Eén keuze tegelijk, nog eens klikken = terug naar Alle. Het filter staat in de URL (`?soort=maandrapportage`), en Nieuwe
  analyse begint met de opzet van de soort als daar precies één actieve opzet onder valt.
- **Voorgestelde campagne analyses** (25 november 2026, migratie 0046, plan en besluiten in
  `campagne-voorstellen-plan.md`). Claude Code zoekt met de skill `campagne-voorstellen` op
  verzoek in Windsor welke actiecampagnes van alle bedrijven nu live zijn (uitgaven in de laatste 7
  dagen) en vult per campagne een voorzet voor de briefing in. Vertrekpunt zijn de advertenties,
  dan de campagnepagina, dan social posts over hetzelfde onderwerp. Het oordeel wat een
  campagnepagina is, ligt bij het taalmodel; de eigenaar stuurt bij via het kopje
  Campagnevoorstellen in het blok Algemeen van de semantic layer (geen vaste URL-patronen in code).
  Een actie zonder eigen pagina wordt een voorstel met zekerheid twijfel; één voorstel per bedrijf.
  Opslag `marketing_analyse_voorstellen` (status open, toegevoegd, genegeerd, verlopen; `sleutel`
  per bedrijf en pagina, zie `paginaSleutel` in `rekenen.ts` en de gelijke SQL-functie) en
  `marketing_analyse_zoekrondes`. Schrijven alleen via `marketing_analyse_voorstellen_bewaar`
  (slaat een pagina over die al een campagne heeft, laat genegeerd en toegevoegd staan, zet wat
  niet meer live is op verlopen). In het overzicht staat de balk bovenaan
  (`VoorstellenBalk.tsx`, eigen route `voorstellen`, zodat een fout de pagina niet raakt), **standaard
  ingeklapt**, gesorteerd op Live sinds van nieuw naar oud (`sorteerVoorstellen`); een klik op een regel toont **Gevonden datapunten** (advertentiecampagnes,
  campagnepagina, social media posts, met aantallen, en de kanttekeningen eronder). Toevoegen
  opent **altijd eerst de ingevulde briefing** (`CampagneZijbalk` met `voorstel`); opslaan doet
  `marketing_analyse_voorstel_toevoegen` in één transactie (Campagne analyse, **planning Wekelijks**,
  `herkenning` = het bewijs). Negeren en terugzetten mag iedereen. De briefing kreeg het veld
  **Campagnepagina('s)** (`campagnepaginas`); de skill `marketing-analyse` gebruikt pagina's en
  herkenning als startpunt.
- **Een eigen tabel, niet de sheet.** Dit is geen campagnelijst maar de briefing voor een
  analyse; de sheet blijft de bron van de campagnetabel.

### Campagnes → Campagne timeline

Vijfde tabblad onder **Campagnes** (view `campagne-timeline`, `components/campagneTimeline/`,
rekenwerk in `lib/campagneTimeline.ts`, getest; 26 november 2026, op verzoek van de eigenaar). Het
jaaroverzicht van alle **Campagne analyses** uit Marketing analyse, in de opzet van het tabblad
Tijdlijn: per campagne een rij, een balk over de looptijd in de vier balkkleuren van de Tijdlijn
(gepland, actief, loopt bijna af, afgelopen; uit de looptijd tegen vandaag), maanden boven de
ISO-weeknummers en een streep bij vandaag.

- **Bron**: `GET /api/marketing-analyse` (dezelfde route als Marketing analyse, geen eigen tabel of
  route). Alleen analyses met een opzet met formulier `campagne`; rapportages (maand, kwartaal,
  E-mail, HRM campagne) staan er niet in. Naam, bedrijven, merk, start- en einddatum komen uit de briefing.
- **Filters**: alleen **Bedrijf** en **Merk** (keuze van de eigenaar). Merk gaat via `merkSleutel`,
  dus "Skoda" en "Škoda" zijn één merk en "Volkswagen, Audi" telt voor beide.
- **Jaar**: bladeren met ‹ jaar ›, van het vroegste startjaar tot het laatste eindjaar (altijd met
  het huidige jaar); 52 of 53 ISO-weken (2026 heeft er 53). Alleen campagnes die in dat jaar lopen
  staan erin; zonder startdatum staat een campagne er altijd, onderaan. Balken staan op de dag
  nauwkeurig; over de jaargrens loopt de balk recht het beeld uit, zonder einddatum vervaagt hij.
- **Hover** toont periode, status (met dag x van y), budget, uitgaven en leads tegen het doel uit
  de laatste analyse (`overzichtCijfers`, dus dezelfde getallen als het overzicht); **klik** op naam
  of balk opent de analyse (`?tab=marketing-analyse&analyse=<id>`).

### Component- en codepatronen

- Herbruikbare, kleine componenten per concern:  `Sidebar`, `NavigationItem`,
  `PageHeader`, `LiveStatus`, `UpdateButton`, `FilterBar`, `FilterSelect`,
  `CampaignTable`, `CampaignHeader`, `MetricCell`/`PlainCell`, `ProgressBar`,
  `StatusIndicator`, `Modal`, `Drawer`, `Toast`, `CampaignHeader`, `CampaignNotes`,
  `NotitieLijst`, `Prikbord`, `CampagneTijdlijn`, `Avatar`, `Medaille`, `Inlogprompt`,
  `brandLogos`, `kennisacties/*`, `scores/*`. Voeg nieuwe UI
  eerder toe als zo'n klein, getypeerd component dan als opgeblazen JSX in een
  paginabestand.
- Het oogje voor de themes hangt `fixed` rechtsboven in het scherm (niet in de
  PageHeader), zodat het op elk tabblad en tijdens scrollen op dezelfde plek staat; de
  `<main>` houdt daarvoor rechts ruimte vrij (`pr-16`).
- Eén icon-set (`components/icons.tsx`): simpele, consistente line-icons met
  `stroke="currentColor"`. Geen emoji, geen mix van iconstijlen, geen los icon-pakket
  voor een handvol glyphs — alleen wanneer een merklogo echt een getrouwe vector nodig
  heeft (zie `brandLogos.tsx`, gebaseerd op het MIT-gelicenseerde simple-icons-project)
  wordt daarvan afgeweken.
- Features die Supabase nodig hebben volgen het bestaande patroon: een tabel in
  `supabase/migrations/000N_*.sql` met RLS ("gedeeld, niet per gebruiker" tenzij het
  echt persoonlijk is), een `lib/*.ts` data-access-bestand, `app/api/*/route.ts`
  route-handlers die `getGebruiker()` checken vóór elke schrijfactie, en een client-UI
  die netjes degradeert (inlogprompt, of — als de functie sowieso niet beschikbaar is
  omdat Supabase niet geconfigureerd is — helemaal niet renderen) in plaats van te
  crashen. Zie `lib/kennisbank.ts` / `lib/campagneNotities.ts` / `lib/profielen.ts` als
  voorbeeld.
- **Alles staat achter de inlog.** Wie geen sessie heeft, ziet alleen `/login`. Die
  beslissing ligt op één plek (`lib/toegang.ts`, nagerekend in `lib/toegang.test.ts`) en
  wordt afgedwongen in `middleware.ts`, nog eens in `app/page.tsx` en daarnaast door elke
  API-route die zelf `getGebruiker()` controleert. Een nieuw paneel of een nieuwe route
  staat dus dicht zonder dat je eraan hoeft te denken; wil je er iets buiten laten vallen,
  dan hoort dat als uitzondering in `lib/toegang.ts` te staan en niet elders. Buiten de
  inlog vallen alleen de auth-routes en de cron-routes (`CRON_PADEN`: `/api/sync`,
  `/api/windsor-sync` en de bijwerk-routes van KPI's 2027 GA, social media en CRM), die zich met
  `CRON_SECRET` legitimeren. De `ingelogd`-prop en de
  `Inlogprompt` in de panelen blijven staan als laatste vangnet — ze horen niet meer in
  beeld te komen, maar een gat in de matcher mag nooit een open dashboard opleveren.
- Inloggen is e-mailadres + wachtwoord (geen magic link, geen zelfregistratie):
  accounts worden aangemaakt door iemand met toegang tot Supabase, of via
  `scripts/maak-gebruiker.ts` (draait los van de app met de service role-sleutel — zie
  README-dataloket.md). Elke collega stelt zelf zijn naam en avatarfoto in bij
  **Instellingen** (`components/instellingen/`); de foto gaat rechtstreeks van de
  browser naar Supabase Storage (bucket `avatars`, rijbeveiligd op de eigen user-id als
  mapnaam), niet via een API-route.
- **Het inlogscherm** (`app/login/page.tsx`, `components/login/`) is bewust één ding:
  het formulier, gecentreerd op het paginavlak, in een dragend paneel met
  `.kaart-accent` en `.kaart-omlijst`. Er stond eerder een donkere merkschil met de
  merklogo's naast (een tweeluik); die is er op verzoek weer af — zet hem niet terug
  zonder dat daarom gevraagd wordt. De twee velden zijn één component
  (`InlogVeld.tsx`) met het icoon in het veld en de focus-halo op de omhulling, zodat
  icoon en oogje binnen de ring vallen; de foutmelding staat vast onder de velden en
  boven de knop, zodat de knop niet wegschuift op het moment dat je hem opnieuw wil
  indrukken. Geen enkele kleur staat hard in de code: het scherm is de eerste indruk van
  de gekozen huisstijl, dus het wisselt volledig mee met het oogje — controleer een
  wijziging dus ook even op Audi of CUPRA (de donkere themes) en op Bentley (kapitalen
  plus de gouden kaderlijn).
- De campagnedata zelf (Google Sheet via `lib/sheet.ts`) blijft de brondata; features
  die daar bovenop komen (aantekeningen, kosten) koppelen op de campagnenaam of draaien
  los ernaast — er komt geen eigen "campagne"-tabel in de database zolang de sheet de
  bron blijft.

## Het weekoverleg als uitgangspunt

Het dashboard bestaat niet om mooi te zijn maar om één ritueel te dragen: het team kijkt
wekelijks samen naar de campagneresultaten en beslist op basis daarvan. Nieuwe
functionaliteit hoort die cyclus te versterken — beeld → besluit → terugblik → zichtbare
verandering — en niet alleen een cijfer extra te tonen. Wat daar nu voor staat:

- **Besluitenlogboek** per campagne (soort + gekoppelde metriek + nulpunt), zodat een
  besluit volgende week naast het cijfer staat dat het moest raken. Het logboek is één
  zijbalk die vanuit de campagnenaam of het logboek-knopje opent — omdat het overleg per
  campagne gaat en niet per metric.
- **Kennis en acties** (`components/kennisacties/`, tweede tabblad): hetzelfde logboek,
  maar dan over alle campagnes heen — datum, initialen, campagne, soort en de tekst in
  één tabel, met daarboven dezelfde velden als filter. De logboekzijbalk is voor tijdens
  het kijken naar één campagne; dit tabblad is voor de vraag "wat hebben we de afgelopen
  weken eigenlijk geleerd?".
  - **Verwijderen is een beheerdersrecht.** Je eigen berichten mag je altijd opruimen;
    berichten van iedereen weghalen mogen alleen de twee beheeraccounts
    (`isBeheerder` in `lib/gebruikersbeheer.ts` — dezelfde twee als bij Instellingen →
    Gebruikers). Dat was eerder open voor iedereen, maar een bericht telt sinds de
    puntentelling mee in andermans weekstand, streak en prijzenkast. De prullenbak
    staat daarom in de berichtentabel alleen bij een beheerder (twee klikken: de knop
    wordt eerst "Weg?"), en in het logboek per campagne alleen bij je eigen regels. De
    regel staat op drie plekken en hoort dat ook te blijven: de RLS-policy
    (`0026_berichten_verwijderen.sql`), de DELETE-route en pas daarna de knop.
  - Er komt **geen tweede tabel** voor in de database: het leest en schrijft
    `dataloket.campagne_notities` via dezelfde POST-route als het logboek zelf. Dat geldt
    ook voor alles op het scoretabblad hieronder — punten, weken, streaks en prijzen zijn
    zonder uitzondering afgeleid uit diezelfde rijen, er wordt niets van bijgehouden.
  - Een bericht hoeft niet aan een campagne te hangen. In het uitklapmenu staat naast de
    campagnes uit de sheet één extra optie ("Eigen onderwerp") met een vrij tekstveld;
    zo'n naam bestaat niet in de sheet en komt daardoor nergens bij de campagnes te
    staan — in de tabel is hij herkenbaar als "vrij onderwerp". Geen extra kolom, geen
    vlag: de koppeling op naam regelt het al.
  - Toevoegen gaat via een **zijbalk** die van rechts inschuift (`Drawer.tsx`), met
    dezelfde indeling als het logboek bij Campagnes: het invulgedeelte bovenaan, de al
    vastgelegde berichten eronder. Geen gecentreerde pop-up — die legt zich over de tabel
    waar je tijdens het typen nog in staat te kijken. Na opslaan blijft de zijbalk open en
    leegt alleen het tekstveld (campagne en soort blijven staan): het nieuwe bericht
    verschijnt meteen bovenaan in de lijst eronder, en je kunt er zo nog een kwijt. De
    zijbalk zelf hangt in `AppShell`, niet in een paneel: hij wordt vanaf beide teamtabs
    geopend (de ronde "+" rechtsonder) én vanuit de nudge in het scorebord. Na opslaan
    verschijnt er rechtsonder een korte bevestiging met de verdiende punten
    (`components/Toast.tsx`) — feedback hoort te vallen op het moment van de handeling,
    niet pas als je een ander tabblad opent.
  - Onder de berichtentabel staat een aparte **actietabel** (`ActieTabel.tsx`) met alleen
    de berichten van het soort "actie", af te vinken zonder eerst de campagne op te
    zoeken. Open acties staan bovenaan met hun leeftijd in dagen (rood vanaf veertien
    dagen), afgeronde blijven onderaan staan als bewijs dat er iets gebeurd is. Daarboven
    staat per collega hoeveel er openstaat en hoe oud de oudste is (`OpenActies.tsx`) —
    de toewijzing is die van wie de actie noteerde, want een eigenaar kent de tabel niet,
    en dat staat er ook zo bij. Bewust géén punten: een openstaande actie is geen score
    maar een schuld aan het team. De actietabel volgt dezelfde filterbalk, maar negeert
    het filter "Type bericht" — daar staan per definitie alleen acties in.

- **Scores** (`components/scores/`, `lib/punten.ts`, `lib/week.ts`, bovenste tabblad):
  alles rondom de puntentelling, van boven naar beneden: het teamdoel van deze week, de
  rij collega's met hun punten over 30/90 dagen of alles, de weekstand, en de totaalstand
  zonder einddatum. De inhoud van wat er vastligt staat op het tabblad hiervoor; hier gaat
  het over het ritme.
  - **Punten per bericht**: observatie 10, hypothese 20, besluit 10, actie 5. De weging
    volgt hoe zwaar een aantekening weegt in het overleg, niet hoeveel typewerk hij kost.
  - **De puntenweek loopt van maandag 11:59 tot maandag 11:59** Nederlandse tijd
    (`lib/week.ts`, met tests voor zomer-/wintertijd). Dat ene moment bepaalt drie dingen
    tegelijk: welke berichten meetellen voor de weekpunten, wanneer #1/#2/#3 opnieuw
    verdeeld worden, en tot hoe laat de weekwinnaar-pop-up nog te zien is. Verzet dat
    moment dus nooit op één plek.
  - **Een winnaar per week is hier bewust wél de bedoeling** — dat was eerder anders (het
    scorebord was expliciet géén ranglijst). De weekstand is daarom op punten gesorteerd
    en deelt medailles uit; de rij collega's erboven blijft **alfabetisch** en zonder
    medaille, zodat je een collega altijd op dezelfde plek terugvindt en een rustige maand
    niet meteen een plek op een ranglijst is. Iedereen met een account staat erop, ook wie
    nog niets heeft vastgelegd — die lege nul is de uitnodiging, en voor jezelf staat er
    een knop bij om er iets aan te doen. Gelijke stand deelt dezelfde plek en nul punten
    levert nooit een medaille op (`bepaalMedailles`). De medaillekleuren zijn eigen tokens
    die in élk theme gelijk blijven: goud in het merkpalet van Škoda is geen goud meer.
  - **Teamdoel** bovenaan (`Teamdoel.tsx`): 30 punten per collega per week, dus het doel
    schaalt mee als er iemand bij komt. Coöperatief en vóór de individuele stand: een
    achterblijvende week hoort een probleem van het team te zijn, niet van één collega.
  - **Streaks**: elke week op rij waarin je iets vastlegt vanaf de tweede levert
    `STREAK_BONUS` (30) bonuspunten op in díe week; een week overslaan zet de reeks terug
    op nul. De eerste week van een reeks geeft niets — anders is "een streak" gewoon een
    andere naam voor "een bericht".
  - **Totaalstand zonder einddatum** (`Prijzenkast.tsx`): alle punten sinds het eerste
    bericht plus de prijzenkast (hoe vaak #1, #2, #3). Een prijs telt pas mee zodra de
    week is afgelopen — een voorsprong op donderdag is nog geen gewonnen week.
  - **Weekwinnaar-pop-up** (`WeekwinnaarPopup.tsx`): maandag tussen 00:00 en 11:58, dus
    in het laatste stuk van de week die om 11:59 afsluit. Weg te klikken; de keuze staat
    per collega en per week in localStorage, zodat hij maandag daarop vanzelf terugkomt.
    Hij hangt in `AppShell` en rendert via een portal, dus hij verschijnt ook als je die
    ochtend meteen naar de campagnes doorklikt — en hij blijft weg als er die week niets
    is vastgelegd.
  - **Eén ophaalactie voor beide tabbladen** (`lib/teamData.tsx`): ze kijken naar dezelfde
    rijen, dus een tweede fetch zou twee standen opleveren die na het vastleggen van een
    bericht uit elkaar lopen. Het peilmoment (`nu`) tikt daar elke minuut door, zodat de
    week vanzelf omslaat zonder herladen.
- **Prikbord** (`components/prikbord/`, `lib/prikbord.ts`): grafieken uit de chat die het
  team bewaart, met hun query erbij en een ververs-knop die dezelfde SQL opnieuw draait.
  Zo groeit het dashboard uit de vragen die er echt leven.
- **Vraagbibliotheek** op het chat-startscherm (`lib/vraagbibliotheek.ts`): de vragen die
  collega's het vaakst stelden, geaggregeerd en zonder namen — leermiddel, geen ranglijst.
- **Verantwoording onder elk antwoord** (query, rijen, duur, kopieerknop): vertrouwen in
  de cijfers is de voorwaarde om er beslissingen op te durven baseren.
- **"Zo lees je dit"**: data-gedreven werken struikelt vaker over onbegrip dan over onwil.

Nieuwe features die hierbij horen (weekbriefing, terugblik op vorige week, vergelijking
met vorige week, anomaliedetectie) passen in ditzelfde patroon: de sheet blijft de bron,
Supabase draagt wat het team zelf vastlegt.
