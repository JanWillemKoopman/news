# Selligent-export aansluiten (Kanalen → Selligent)

Het tabblad **Selligent** leest één bestand uit Azure Blob Storage:

```
output/autoline/users_customers_dashboard.csv
```

Een `;`-gescheiden CSV van ongeveer 36 MB met zo'n 169.000 rijen, die Selligent elke
ochtend verst neerzet. Het dashboard haalt hem **rechtstreeks** op. Er komt geen Supabase
aan te pas, er wordt geen kopie bewaard en er staat geen sync-job tussen.

## Wat je in Vercel moet zetten

Open het Vercel-project → **Settings → Environment Variables** en voeg één van de twee
toe. Zet hem voor **Production, Preview en Development**, en deploy daarna opnieuw —
omgevingsvariabelen worden bij de build ingelezen, dus zonder nieuwe deploy ziet de app ze
niet.

### Optie 1 (aanbevolen): een SAS-URL

```
SELLIGENT_BLOB_URL=https://<account>.blob.core.windows.net/output/autoline/users_customers_dashboard.csv?sp=r&st=…&se=…&sig=…
```

Zo maak je hem in Azure: **Storage account → Containers → output** → klik door naar
`autoline/users_customers_dashboard.csv` → tabblad **Generate SAS** → zet Permissions op
alleen **Read**, kies een einddatum, en kopieer de **Blob SAS URL**.

Dit is de veilige variant, om drie redenen: het token geeft alleen leesrecht, het geldt
alleen voor dit ene bestand, en het verloopt. Zet een herinnering voor de einddatum — als
hij verlopen is, meldt het tabblad dat met zoveel woorden.

### Optie 2: de connection string

```
SELLIGENT_AZURE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=…;AccountKey=…;EndpointSuffix=core.windows.net
```

Te vinden onder **Storage account → Access keys → Connection string**. Dit is dezelfde
string die in het analyse-notebook staat, dus overnemen kan onverkort.

Weet wel wat je in handen geeft: deze sleutel geeft **lees- en schrijfrecht op het hele
storage-account**, alle containers, inclusief verwijderen. Het dashboard gebruikt hem
alleen om te lezen, maar de sleutel zelf is niet beperkt. Is hij ooit in een chat, een
notebook of een screenshot beland, roteer hem dan in Azure (**Access keys → Rotate key**)
en zet de nieuwe in Vercel.

Optioneel, alleen bij deze variant, om een ander bestand te lezen:

```
SELLIGENT_BLOB_CONTAINER=output
SELLIGENT_BLOB_PAD=autoline/users_customers_dashboard.csv
```

Staan beide variabelen gezet, dan wint de SAS-URL.

## Als het tabblad een fout toont

De foutmelding op het tabblad is de eerste plek om te kijken: hij noemt het
storage-account, het pad waar is gekeken en de code die Azure teruggaf. Die code komt uit
de koptekst `x-ms-error-code` en niet uit het antwoordlichaam — op een `HEAD` stuurt Azure
geen lichaam mee, dus anders staat er alleen "HTTP 404" en weet je nog niets.

| Wat er staat | Wat het betekent |
|---|---|
| `ContainerNotFound` | Het storage-account in de connection string heeft geen container met deze naam. Bijna altijd: de string is van een **ander storage-account** dan waar de export op staat. Vergelijk `AccountName` met het account dat in het analyse-notebook staat. |
| `BlobNotFound` | Account en container kloppen, het bestand staat niet op dit pad. Blobnamen zijn hoofdlettergevoelig. Staat de export ergens anders, zet dan `SELLIGENT_BLOB_PAD`. |
| `AuthenticationFailed` | De sleutel is afgewezen — meestal is hij in Azure geroteerd en staat de oude nog in Vercel. |
| `InvalidAuthenticationInfo` | De connection string is onvolledig geplakt; hij hoort te eindigen op `EndpointSuffix=core.windows.net`. |
| `AuthorizationFailure` | Het SAS-token is verlopen of geldt niet voor dit pad. |
| `niet bereikbaar op …` | De hostnaam bestaat niet. Eindigt hij niet op `.core.windows.net`, dan is de connection string halverwege afgekapt bij het plakken. |

Let op bij het plakken in Vercel: geen aanhalingstekens eromheen, de hele string inclusief
de `==` aan het eind van de sleutel, en de variabele aanzetten voor Production, Preview én
Development. Omgevingsvariabelen worden bij de build ingelezen, dus een wijziging vraagt
een nieuwe deploy.

## Hoe het werkt

| | |
|---|---|
| `lib/selligent/verbinding.ts` | Het ophalen bij Azure, inclusief het ondertekenen met de accountsleutel (HMAC, zoals de Azure-SDK doet). Er zit bewust géén `@azure/storage-blob` in: die levert een paar megabyte bundle voor dit ene stukje rekenwerk. |
| `lib/selligent/tabel.ts` | De 36 MB ombouwen naar een woordenboek-gecodeerde tabel in het geheugen: per kolom de verschillende waarden één keer, en per rij alleen de index daarin. Dat is wat filteren op elke kolom binnen milliseconden houdt. |
| `lib/selligent/bron.ts` | Die tabel bewaren tussen verzoeken, met de ETag-vergelijking en het slot op gelijktijdig opbouwen. |
| `lib/selligent/stand.ts` | De filters, de metric (contacten) en de maandreeks. |
| `lib/selligent/datacheck.ts` | Het kolomoverzicht onderaan de pagina, afgeleid uit dezelfde tabel. |
| `lib/selligent/weergave.ts` | Het enige wat met een waarde gebeurt vóór hij op het scherm komt: witruimte zichtbaar maken. Zie "De data blijft ruw". |
| `app/api/selligent/route.ts` | De filtercontrols plus het kolomoverzicht. Eén keer per paginabezoek. |
| `app/api/selligent/stand/route.ts` | De metric en de grafiek voor één filterselectie. Bij elke filterwijziging. |
| `components/selligent/` | Het tabblad: `SelligentPaneel` (de pagina), `SelligentFilters`, `SelligentGrafiek`, `SelligentKolommen`. |

### De data blijft ruw

Er gaat **geen enkele bewerking** overheen. `B` en `Benzine` blijven twee verschillende
brandstoffen, `BWG` en `AM_PKW` blijven tussen de merken staan, `OPTOUT` blijft een reeks
codes, en spaties worden niet weggehaald: een waarde van één spatie is een waarde en geen
lege cel. Wie hier ooit een opschoonlaag overheen wil leggen: dat is uitdrukkelijk niet
gevraagd, en het dashboard hoort te tonen wat er in het bestand staat.

Twee dingen gebeuren er wél, en allebei om een reden die niets met opschonen te maken
heeft:

1. **Het type wordt op de getrimde tekst bepaald.** Anders is `" 3/02/2021"` geen datum en
   krijgt die kolom geen van/tot-filter. De waarde zelf blijft onaangeroerd; alleen de
   vraag "wat voor soort waarde is dit" wordt op de getrimde tekst beantwoord.
2. **Witruimte wordt zichtbaar gemaakt op het scherm** (`lib/selligent/weergave.ts`): een
   waarde met een spatie aan de rand komt tussen aanhalingstekens te staan, dus `" "` en
   `"Golf "` naast `Golf`. Zonder dat is de spatie-waarde in `VDUVEHICLES_FUEL_TYPE` (11
   rijen) een lege regel in de keuzelijst en zijn de vier `VDUVEHICLES_MODEL`-waarden met
   een spatie niet van hun buur te onderscheiden. Filteren gaat altijd over de echte
   waarde; dit is uitsluitend weergave, en het maakt de rommel juist zíchtbaar in plaats
   van hem weg te poetsen.

### Eén kolom staat er niet: geslacht

`GENDER` wordt overgeslagen — geen filter, niet in het kolomoverzicht, niet in een
antwoord van de API. Dat gebeurt met opzet in `bouwTabel` (`VERBORGEN_KOLOMMEN` in
`lib/selligent/tabel.ts`) en niet pas in de weergave: zo komt de kolom helemaal niet in
het geheugen en kan hij dus nergens per ongeluk opduiken. Verdwijnt hij uit de export
zelf, dan verandert er niets en mag die regel weg.

### Wat de pagina doet

- **Een filter op elke kolom** (25 sinds `GENDER` eruit is). De soort control volgt uit de
  data en staat nergens met de hand ingevuld: tot 1.000 verschillende waarden een
  aanvinklijst (vanaf dertien opties met een zoekveld erin), een datumkolom van/tot, en
  daarboven een zoekveld op een stuk van de waarde. Meerdere waarden binnen één filter is
  "of", meerdere filters samen is "en".
- **Drie metrics naast elkaar: Contacten, E-mailadressen en Auto's.** Het aantal verschillende `ID`'s en
  het aantal verschillende `VDUVEHICLES_VEHICLE_ID`'s binnen de selectie — allebei níét het
  aantal rijen. Een rij is een contact mét een voertuig: 169.290 rijen op 137.424 contacten
  met 108.470 auto's. Het aantal rijen staat als kleine regel onder de metric en niet als
  derde tegel; het is de teller van het bestand, geen cijfer waarop je stuurt. Ontbreekt een
  kolom, dan valt de pagina terug (`CUSTOMER_ID`, het kenteken) en zegt in beeld welke kolom
  ze telde.
  - **E-mailadressen** telt de verschillende waarden in `MAIL`. Bij de tegel staat dat de
    adressen alleen geteld en nooit getoond worden, en dat is letterlijk zo: alleen dit
    aantal gaat over de lijn. Er staat **niet** dat ze gehasht of geanonimiseerd zijn, want
    dat zijn ze niet — in de CSV op Azure staan ze gewoon leesbaar. Wil je dat het wél waar
    is, dan moet dat bij de bron gebeuren (gehasht aanleveren, of de kolom uit de export
    halen); de pagina blijft dan gewoon werken en telt dan hashes.
  - **`MAIL` heeft geen filter in de balk**, op verzoek. Het staat als metric in beeld; een
    zoekveld waarin je een adres intypt om te zien of het bestaat, is iets anders dan een
    dashboard en hoort in Selligent zelf.
- **Een rij opt-in-tegels**, één per booleaanse kolom, met een schakelaar **True / False /
  Onbekend** erboven. Welke kolommen dat zijn staat nergens opgesomd — het zijn de kolommen
  die als booleaans uit de data komen, dus een nieuwe voorkeur in de export levert vanzelf
  een tegel op. Elke tegel is tegelijk het filter dat erbij hoort: klikken filtert op de
  getoonde stand en de hele pagina rekent mee.
  - **Drie standen die elkaar uitsluiten.** `True` is wie zich aanmeldde, `False` wie
    bewust nee zei, en `Onbekend` wie nooit iets invulde — bij deze export vaak de grootste
    groep (`PREFERENCES_VELOO`: 27 True, 8.004 False, 129.393 Onbekend). Dat zijn drie
    verschillende doelgroepen: je mailt niet naar `False`, maar `Onbekend` is juist waar een
    opt-in-campagne begint. Een contact staat in meerdere rijen zodra het meerdere auto's
    heeft, en telt daarom in de stérkste stand die het ergens heeft (True > False > leeg).
    Zo geldt altijd `waar + onwaar + onbekend === contacten`, en een test legt dat vast.
  - **Eén noemer voor alle tegels.** Er stond eerst het aandeel van de contacten die in die
    kolom iets hadden ingevuld ("48% van 50.054" bij een teller van 24.273), en dat was niet
    te plaatsen naast een bestand van 137.424 contacten. Nu is het overal hetzelfde getal
    eronder, dus de tegels zijn onderling te vergelijken.
  - **Het filter gebruikt de ruwe waarden uit het bestand**, die de server per tegel
    meestuurt — niet een verzonnen `"True"`. Sinds de data onbewerkt is kunnen `"true"` en
    `"True "` aparte waarden zijn, en dan zou een tegel van 24.273 een filter van 24.270
    opleveren.
- **"Contacten toegevoegd in Selligent per maand"** en **"Auto's toegevoegd in Selligent per
  maand"**, allebei als lijn en allebei op `CREATED_DT`. Per contact respectievelijk per
  auto en niet per rij, uit dezelfde doorloop als de metrics — zo kan de som van een grafiek
  niet afwijken van het cijfer erboven.
  - De autografiek stond eerst op `VDUVEHICLES_DELIVERY_DT`, de afleverdatum. Dat
    antwoordt op een andere vraag dan de titel stelt: een auto die in 2018 is afgeleverd
    aan een contact dat in 2025 is aangemaakt, kwam in 2025 in Selligent. Die vraag is nu
    een eigen grafiek (hieronder) in plaats van een andere lezing van deze.
- **"Afgeleverde auto's per maand"** (`VDUVEHICLES_DELIVERY_DT`), als derde grafiek.
  Dezelfde auto's, op de datum van de auto zelf in plaats van die van zijn contact — het
  cijfer waar een servicecampagne op rust. Beide reeksen tellen op tot hetzelfde aantal
  auto's; alleen de verdeling over de maanden verschilt, en een test legt dat vast.
  - **Let op de plaatshouders in deze kolom.** 46.074 van de 108.470 auto's staan op
    1 januari 1900, en nog eens 2.278 hebben helemaal geen leesbare datum. De grafiek opent
    op de laatste drie kalenderjaren, dus die 1900-groep is dan niet in beeld — en daarom
    staat er onder elke grafiek hoeveel er buiten het getoonde bereik vallen, met de knoppen
    ernaast om het erbij te halen. Zonder die regel toont deze grafiek een fractie van de
    auto's en ziet hij eruit alsof hij over alle auto's gaat.
  - **Drie bereiken per grafiek**: vanaf twee jaar terug (de stand waarop hij opent), vanaf
    tien jaar terug, en de volledige reeks. Die grenzen staan relatief in `KORTE_BEREIKEN`
    (`SelligentGrafiek.tsx`) en niet als vaste jaartallen: "de laatste drie kalenderjaren"
    blijft kloppen, terwijl een hardgecodeerde 2024 over een paar jaar een willekeurig
    verleden venster is dat niemand meer heeft gekozen. Een bereik dat vóór de eerste maand
    van de reeks begint verdwijnt vanzelf.
- **Een merkbalk bovenaan**, horizontaal en altijd zichtbaar: alle merken uit
  `VDUVEHICLES_BRAND` naast elkaar, standaard allemaal aan, los uit te zetten. Er is geen
  aparte "alles"-stand: alles aan betekent geen filter op die kolom, en zodra je er een
  uitzet wordt het filter wat er overblijft — dezelfde ene filterwaarde, alleen anders
  getekend. "Geen merk" (`LEEG_OPTIE`) staat er als eigen knop bij, want 58.235 rijen hebben
  geen merkwaarde; zonder die knop zou één merk uitzetten stilzwijgend ook alle contacten
  zonder auto wegfilteren. De logo's komen uit de bestaande set (`getBrandLogo`); wat die
  niet kent (`BWG`, `AM_PKW`, …) blijft tekst. Merk staat daarom níét ook in het filterraster:
  twee controls op dezelfde waarde zijn twee plekken om te kijken.
- **De filterbalk staat bovenaan en dicht**, en de controls staan onder kopjes die uit de
  kolomnamen zelf komen: **Algemeen**, **Voorkeuren** (`PREFERENCES`) en **Voertuig**
  (`VDUVEHICLES`), elk als een eigen omlijnd blok met een streep onder de kop. Die indeling
  staat nergens met de hand opgesomd — kolommen die hetzelfde voorvoegsel delen krijgen
  vanaf drie stuks een eigen blok (`groepeerVelden` in `lib/selligent/stand.ts`), dus een
  nieuwe `PREFERENCES_`-kolom schuift vanzelf bij de andere voorkeuren aan. De Nederlandse
  koppen komen uit `GROEP_NAMEN` in `SelligentFilters.tsx` met het voorvoegsel er grijs
  achter; een voorvoegsel dat daar niet in staat draagt gewoon zichzelf als kop, dus die
  lijst is een verfraaiing en nooit een voorwaarde. Vijfentwintig controls uitgeklapt vullen het
  halve scherm en duwen de cijfers onder de vouw; bovenaan omdat filteren het eerste is wat
  je doet. Dichtgeklapt blijft staan wát er aanstaat — de chips met de actieve filters.
  Rechts ernaast staan de versheid van het bestand, **Reset filters** en **Opnieuw
  ophalen**. Reset filters staat er altijd — uitgeschakeld als er niets aanstaat, anders
  met het aantal erbij — en zet álle filters terug, dus ook de merkbalk. Dat laatste is de
  reden dat hij het aantal van de hele pagina meekrijgt en niet zelf telt: merk zit niet in
  zijn eigen veldenlijst, en een knop die doodstaat terwijl er in de merkbalk iets uitstaat
  laat je zonder enige manier om dat terug te zetten. Het pad, de
  grootte en het rijaantal staan in het kolomoverzicht onderaan; die hoorden niet als eigen
  blok bovenaan de pagina, waar ze ruimte innamen van de cijfers waarvoor je komt.

### De cache, en waarom dat geen opslag is

Zonder cache zou elke klik op een filter 36 MB downloaden en tien seconden duren. Daarom
blijft de omgebouwde tabel in het geheugen van de serverless instance staan, en kost een
filterwijziging alleen nog het filteren. Elk verzoek doet eerst een `HEAD` op het blob —
één verzoek, een paar honderd bytes — en vergelijkt de **ETag** die Azure teruggeeft met
die van de bewaarde tabel. Gelijk betekent byte-voor-byte hetzelfde bestand; anders wordt
de tabel opnieuw opgebouwd. Een verse export is dus bij het eerstvolgende verzoek binnen,
zonder dat iemand iets hoeft te verversen.

Wat bewaard wordt is geen bestand: het is de gecodeerde tabel in het werkgeheugen van één
instance. Hij verdwijnt als die wordt opgeruimd, overleeft geen deploy, en is van buiten
niet te lezen. Het is een versnelling, geen opslag, en de blob blijft de enige bron van
waarheid. De knop **Opnieuw ophalen** slaat de vergelijking over (`?vers=1`).

### Gemeten op het echte bestand

| | |
|---|---|
| Ophalen | 7,4 s |
| Ombouwen naar de tabel | 2,0 s |
| Geheugen van de tabel | 99 MB (296 MB piek tijdens het ombouwen) |
| Filteren, tellen en groeperen | 11–41 ms, ook met alle filters tegelijk aan |
| Antwoord met de filtercontrols | 11,6 kB |
| Antwoord met de metrics en de drie grafieken | 77,4 kB |

## Persoonsgegevens

De export bevat gegevens over personen. Het tabblad is zo gebouwd dat er **geen enkele
waarde uit een identificerende kolom de browser bereikt** — er gaan alleen aantallen en
categorieën over de lijn. Dat komt uit drie dingen die los van elkaar werken:

1. **Filteren gebeurt op de server.** De rijen zelf verlaten de server nooit; de browser
   stuurt een filter en krijgt een aantal terug.
2. **De vorm van de filtercontrol.** Een kolom krijgt alleen een optielijst als er weinig
   verschillende waarden in staan. Mailadres (125.359), kenteken (108.480) en de id's
   komen daar ruim boven en krijgen dus een zoekveld in plaats van een lijst. Dat is geen
   aparte controle die iemand kan vergeten aan te zetten, maar een gevolg van het feit dat
   honderdduizend opties geen keuzelijst is.
3. **Een naamregel in het kolomoverzicht.** Dat blok toont per kolom juist de
   meestvoorkomende waarden, en daar is cardinaliteit alleen niet genoeg. Kolommen waarvan
   de naam naar een persoon of voertuig verwijst (`mail`, `plate`/`kenteken`, `naam`,
   `adres`, `postcode`, `telefoon`, `geboorte`, `iban`, …) laten daar nooit waarden zien,
   hoe weinig verschillende er ook in staan.
4. **Geslacht staat er helemaal niet in** — zie hierboven.

Wil iemand later individuele rijen kunnen inzien, dan is dat een aparte beslissing met een
eigen slot — `BEPERKTE_SECTIES_TOEGESTANE_EMAILS` in `components/Sidebar.tsx` is het
patroon dat het dashboard daarvoor al heeft.

## Dat de kolommen kunnen veranderen is uitgangspunt, geen uitzondering

Nergens in de code staat een lijst met verwachte kolommen. `bouwTabel` leest de koprij en
bouwt zijn kolommen op wat ze daar vindt; de filterbalk en het kolomoverzicht volgen
daaruit. Dat is met opzet: `MAIL` en `GENDER` gaan uit de export
omdat het persoonsgegevens zijn, en een tabblad dat daarop crasht of stilletjes nullen
toont is erger dan een tabblad dat gewoon een kolom minder laat zien. Nieuwe kolommen
verschijnen om dezelfde reden vanzelf. Er is een test die dit vastlegt
(`lib/selligent/tabel.test.ts`, `lib/selligent/stand.test.ts`). Hetzelfde geldt voor een
filter op een kolom die niet meer bestaat: dat wordt genegeerd in plaats van alles weg te
filteren, zodat een bewaarde selectie nooit een leeg scherm oplevert.

Twee kolommen zijn wél bij naam bekend, en met opzet maar op één plek: welke kolom
"contacten" telt (`CONTACT_KOLOMMEN`) en welke de grafiek tekent (`CREATIE_KOLOMMEN`), in
`lib/selligent/stand.ts`. Allebei met een terugval, en de pagina zegt in beeld welke kolom
ze gebruikte.

## Wat er in de data opvalt

De export is rommeliger dan hij lijkt. Dit staat hier omdat het bepaalt wat je met de
cijfers op deze pagina kunt, en wat nog niet. Wat de doorrekening liet zien (13 november
2026, 169.290 rijen):

- **Een rij is geen klant.** 169.290 rijen tegen 130.211 verschillende `CUSTOMER_ID` en
  108.481 verschillende kentekens: het is klant × voertuig. Zonder dedupe telt elk cijfer
  te hoog.
- **`OPTOUT` is geen ja/nee** maar een reeks getallen — `0`, `9`, `10`, `77`, `1`, `911`,
  `-2` — en 154.249 van de rijen zijn leeg. Wat die codes betekenen moet uit Selligent
  komen voordat er een opt-outcijfer op gebouwd wordt.
- **`VDUVEHICLES_FUEL_TYPE` mengt codes en labels**: `B`, `D`, `E`, `H` naast `Diesel`,
  `Elektriciteit`, `Hybride Benzine`. Twee schrijfwijzen voor dezelfde brandstof, en
  daarnaast één waarde die uit een spatie bestaat (11 rijen).
- **`VDUVEHICLES_BRAND` bevat ook codes**: `BWG` (10.770 rijen), `AM_PKW` (6.754),
  `AM_BWG`. En 58.235 rijen hebben helemaal geen merk.
- **Datums staan dag-eerst** (`3/02/2021 6:00:22`). `new Date()` leest dat als 2 maart; de
  parser in `datacheck.ts` doet het goed en heeft daar een test voor.
- **`CREATED_DT` loopt van 1986 tot 2026**, met 81.203 rijen in 2025 alleen — dat ziet
  eruit als een migratie en niet als aanwas.
- **Eén maand is een migratie, niet aanwas.** Juni 2025 levert 35.601 contacten op; de
  maand erna 10.648 en de rest van het jaar een paar duizend. Van de 484 maanden zitten er
  bovendien maar een paar duizend contacten vóór 2015. Daarom opent de grafiek op de
  laatste tien jaar en zit er een knop voor een logaritmische as: zonder die twee is
  driekwart van de breedte een vlakke lijn langs de nul.
- **285 contacten hebben geen leesbare creatiedatum.** Die staan in geen enkele maand en
  worden onder de grafiek apart gemeld, zodat de som van de grafiek navraagbaar blijft:
  137.139 in de maanden + 285 = 137.424 contacten.
- **`ID` en `CUSTOMER_ID` zijn niet hetzelfde aantal**: 137.424 tegen 130.210, en
  `CUSTOMER_ID` mist in 4% van de rijen. Sinds nu telt de metric (en de grafiek) unieke
  `CUSTOMER_ID`'s, op verzoek van marketing; rijen zonder `CUSTOMER_ID` tellen dus niet
  mee als contact. Staat de kolom niet in de export, dan valt hij terug op `ID`. Het
  scherm zegt welke kolom is geteld.
