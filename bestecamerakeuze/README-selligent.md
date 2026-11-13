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

## Hoe het werkt

| | |
|---|---|
| `lib/selligent/verbinding.ts` | Het ophalen bij Azure, inclusief het ondertekenen met de accountsleutel (HMAC, zoals de Azure-SDK doet). Er zit bewust géén `@azure/storage-blob` in: die levert een paar megabyte bundle voor dit ene stukje rekenwerk. |
| `lib/selligent/datacheck.ts` | De 36 MB regel voor regel doorlopen en terugbrengen tot een paar kilobyte: rijaantal, en per kolom het type, de vulgraad, het aantal verschillende waarden en de verdeling. De rijen worden nooit samen in het geheugen gezet. |
| `app/api/selligent/route.ts` | De route eromheen: inlogcontrole, `maxDuration = 60`, en de cache hieronder. |
| `components/kanalen/SelligentPaneel.tsx` | Het tabblad zelf. |

### De cache, en waarom dat geen opslag is

36 MB bij elk paginabezoek downloaden is tien seconden wachten per collega per keer, en
Azure rekent uitgaand verkeer af. Daarom doet de route eerst een `HEAD` op het blob —
één verzoek, een paar honderd bytes — en vergelijkt de **ETag** die Azure teruggeeft met
die van de vorige doorrekening. Gelijk betekent byte-voor-byte hetzelfde bestand, en dus
hetzelfde antwoord; dan gaat de bewaarde doorrekening terug zonder download.

Wat bewaard wordt is alleen dat geaggregeerde antwoord: geen mailadressen, geen kentekens,
geen rijen. Het leeft in het geheugen van de serverless instance en verdwijnt als die
wordt opgeruimd. De blob blijft de enige bron; een nieuwe export verandert de ETag en is
bij het eerstvolgende bezoek binnen. De knop **Opnieuw ophalen** slaat de vergelijking
over (`?vers=1`).

## Persoonsgegevens

De export bevat gegevens over personen. Het tabblad is daarom zo gebouwd dat er **geen
enkele waarde uit een identificerende kolom de browser bereikt**. Twee sloten, los van
elkaar, in `lib/selligent/datacheck.ts`:

1. **Op naam.** Kolommen waarvan de naam naar een persoon of voertuig verwijst (`mail`,
   `plate`/`kenteken`, `gender`/`geslacht`, `naam`, `adres`, `postcode`, `telefoon`,
   `geboorte`, `iban`, …) leveren nooit waarden — ook niet als er maar drie verschillende
   in staan.
2. **Op cardinaliteit.** Voorbeeldwaarden komen alleen mee bij een kolom met weinig
   verschillende waarden. Een kolom met 125.000 verschillende waarden is per definitie een
   identificerend veld en levert alleen een aantal.

Wat er wél doorkomt zijn aantallen en verdelingen van categorieën. Dat is wat dit tabblad
voor alle collega's open laat staan. Wil iemand later individuele rijen kunnen inzien, dan
is dat een aparte beslissing met een eigen slot — `BEPERKTE_SECTIES_TOEGESTANE_EMAILS` in
`components/Sidebar.tsx` is het patroon dat het dashboard daarvoor al heeft.

## Dat de kolommen kunnen veranderen is uitgangspunt, geen uitzondering

Nergens in de code staat een lijst met verwachte kolommen. De datacheck leest de koprij en
beschrijft wat ze daar vindt. Dat is met opzet: `MAIL` en `GENDER` gaan uit de export
omdat het persoonsgegevens zijn, en een tabblad dat daarop crasht of stilletjes nullen
toont is erger dan een tabblad dat gewoon een kolom minder laat zien. Nieuwe kolommen
verschijnen om dezelfde reden vanzelf. Er is een test die dit vastlegt
(`lib/selligent/datacheck.test.ts`).

## Wat er in de data opvalt

Met opzet nog geen grafieken: de export is rommeliger dan hij lijkt, en dat hoort eerst op
tafel te liggen. Wat de eerste doorrekening liet zien (13 november 2026, 169.290 rijen):

- **Een rij is geen klant.** 169.290 rijen tegen 130.211 verschillende `CUSTOMER_ID` en
  108.481 verschillende kentekens: het is klant × voertuig. Zonder dedupe telt elk cijfer
  te hoog.
- **`OPTOUT` is geen ja/nee** maar een reeks getallen — `0`, `9`, `10`, `77`, `1`, `911`,
  `-2` — en 154.249 van de rijen zijn leeg. Wat die codes betekenen moet uit Selligent
  komen voordat er een opt-outcijfer op gebouwd wordt.
- **`VDUVEHICLES_FUEL_TYPE` mengt codes en labels**: `B`, `D`, `E`, `H` naast `Diesel`,
  `Elektriciteit`, `Hybride Benzine`. Twee schrijfwijzen voor dezelfde brandstof.
- **`VDUVEHICLES_BRAND` bevat ook codes**: `BWG` (10.770 rijen), `AM_PKW` (6.754),
  `AM_BWG`. En 58.235 rijen hebben helemaal geen merk.
- **Datums staan dag-eerst** (`3/02/2021 6:00:22`). `new Date()` leest dat als 2 maart; de
  parser in `datacheck.ts` doet het goed en heeft daar een test voor.
- **`CREATED_DT` loopt van 1986 tot 2026**, met 81.203 rijen in 2025 alleen — dat ziet
  eruit als een migratie en niet als aanwas.
