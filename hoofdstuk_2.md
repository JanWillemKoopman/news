# Hoofdstuk 2 — De geschiedenis en renaissance van MMM

> **Deel I — Het fundament: waarom Media Mix Modeling?**
> Moeilijkheidsgraad: Beginner · Voorkennis: hoofdstuk 1

---

## Waar dit hoofdstuk over gaat

Wie een nieuwe methode leert, is geneigd te denken dat die methode ook nieuw *is*. Bij Media Mix Modeling is het tegenovergestelde waar. De kernideeën — dat reclame na-ijlt, dat de tiende euro minder oplevert dan de eerste, dat je omzet moet ontleden in bijdragen — zijn ouder dan de meeste lezers van dit boek. Ze zijn bedacht in een tijd van ponskaarten en televisiereclame, lang voor het internet.

En toch beleeft MMM juist nú, in de tweede helft van de jaren twintig van deze eeuw, zijn grootste bloei ooit. Bedrijven die het vak twintig jaar geleden hadden afgeschreven, bouwen er inmiddels hele meetafdelingen omheen. Waarom keert een methode uit het tijdperk van de televisiezuil terug in een wereld van smartphones en kunstmatige intelligentie?

Dit hoofdstuk beantwoordt die vraag door de geschiedenis in vier bewegingen te vertellen. Eerst de klassieke periode, waarin MMM in de econometrie werd geboren en groot werd bij de grote merkenfabrikanten. Dan de digitale gouden eeuw, waarin de belofte van perfecte meetbaarheid MMM bijna deed vergeten. Vervolgens de privacy-omwenteling, die die belofte hardhandig ontmaskerde. En ten slotte de renaissance, waarin nieuwe wiskunde en open software MMM toegankelijker maakten dan ooit.

De geschiedenis is hier geen bijzaak of decoratie. Ze verklaart de terminologie die je dagelijks zult gebruiken, ze verklaart de valkuilen die het vak al decennia teisteren, en — het meest praktisch — ze levert je de argumenten waarmee je een klant of directie uitlegt waarom MMM geen ouderwetse noodgreep is, maar het antwoord op een structureel probleem dat niet meer weggaat.

**Na dit hoofdstuk kun je:**

- de historische ontwikkeling van MMM schetsen, van de econometrie van de jaren zestig tot de open-sourceframeworks van vandaag;
- uitleggen waarom de digitale attributiebelofte is vastgelopen, en welke krachten daaraan ten grondslag liggen;
- de impact van privacywetgeving en het einde van de third-party cookie op marketingmeting benoemen;
- de rol van de grote hedendaagse spelers — Google, Meta, de open-sourcegemeenschap — in de MMM-renaissance plaatsen.

---

## 2.1 Van econometrie tot marketing science (1960–2000)

### Wortels in de econometrie

Media Mix Modeling is geen uitvinding van de marketingwereld maar een toepassing van de **econometrie** — de tak van de economie die statistische methoden gebruikt om economische verbanden te kwantificeren. De econometrie ontwikkelde in de eerste helft van de twintigste eeuw het gereedschap waarmee je uit historische data een verband tussen oorzaak en gevolg probeert te schatten: de regressieanalyse. Toen dat gereedschap eenmaal bestond, was de stap naar marketing klein. Als je de vraag naar boter kunt modelleren als functie van prijs en inkomen, waarom dan niet de verkoop van een merk als functie van reclame-inzet?

De eerste serieuze marketingtoepassingen ontstonden in de jaren zestig. Bedrijven die enorme bedragen aan televisiereclame besteedden — zeepfabrikanten, voedingsmiddelenconcerns, tabaksmerken — hadden een dringende reden om te willen weten of dat geld iets deed. Zij hadden bovendien wat het model nodig heeft: lange reeksen verkoopdata en een reclamebudget dat door de tijd heen varieerde. In die combinatie van grote budgetten en meetbare verkoop werd MMM geboren.

### Adstock: de ontdekking dat reclame na-ijlt

De belangrijkste conceptuele doorbraak uit deze periode is verbonden aan de Britse onderzoeker **Simon Broadbent**, die in de jaren zeventig en tachtig het begrip **adstock** populariseerde. Het idee is even simpel als fundamenteel: het effect van reclame verdwijnt niet op het moment dat de commercial is afgelopen. Een kijker die vandaag een advertentie ziet, draagt die indruk mee — vervaagd maar aanwezig — de volgende week, en de week daarna. Het "voorraadje" reclame-effect dat op enig moment in het hoofd van de consument aanwezig is, bouwt op met nieuwe blootstelling en slijt weg zonder. Broadbent noemde dat voorraadje *advertising stock*, samengetrokken tot *adstock*.

Deze ene gedachte scheidt MMM van een naïeve regressie. Zonder adstock zou je de reclame van deze week alleen koppelen aan de verkoop van deze week — en daarmee stelselmatig het effect onderschatten van kanalen die traag werken, zoals televisie. We komen in hoofdstuk 17 uitgebreid terug op de wiskunde van adstock; hier telt vooral dat het begrip meer dan veertig jaar oud is en nog altijd de kern van elk media mix model vormt.

### Verzadiging en de vorm van het effect

Een tweede inzicht uit de klassieke periode is dat het verband tussen reclame en verkoop niet recht is. De eerste reclame-euro's bereiken de meest ontvankelijke consumenten en leveren veel op; naarmate je meer uitgeeft, bereik je dezelfde mensen vaker en spreek je een steeds minder geïnteresseerd publiek aan. Het effect *verzadigt* — in het Engels *saturation*, ook wel de wet van de afnemende meeropbrengst (*diminishing returns*). Grafisch: een curve die eerst stijgt en dan afbuigt. Ook dit begrip, dat we in hoofdstuk 17 formaliseren, stamt uit deze vroege decennia.

Met adstock en verzadiging had het vak zijn twee kenmerkende bouwstenen. Een media mix model uit 1985 en een uit 2025 delen deze fundamenten; wat sindsdien veranderde, is de manier waarop de parameters worden geschat, niet het onderliggende beeld van hoe reclame werkt.

### De CPG-industrie maakt MMM groot

Wat MMM in de jaren tachtig en negentig tot een volwassen discipline maakte, was de omarming door de **consumer packaged goods**-industrie (CPG, in het Nederlands: verpakte consumentengoederen) — de sector van wasmiddelen, frisdranken, tandpasta en soep. Concerns als Procter & Gamble en Unilever waren voor MMM ideaal. Ze gaven gigantische bedragen uit aan reclame, verkochten via supermarkten die met scannerkassa's nauwkeurige verkoopdata genereerden, en beschikten over marktonderzoeksbureaus die deze data leverden. In deze omgeving werd MMM een vast onderdeel van de jaarlijkse marketingcyclus: gespecialiseerde bureaus bouwden de modellen, en de uitkomsten voedden de budgetbeslissingen.

Het was ook duur, traag en ondoorzichtig specialistenwerk. Een model bouwen kostte maanden, de methoden zaten opgesloten in de hoofden en de software van een handvol consultants, en de klant kreeg een rapport zonder veel zicht op wat eronder zat. Dat model — kostbaar, exclusief, gesloten — is precies wat de digitale revolutie leek te gaan wegvagen.

---

## 2.2 De digitale gouden eeuw van tracking (2000–2018)

### De belofte van perfecte meetbaarheid

Rond de eeuwwisseling brak een nieuw tijdperk aan dat de logica van MMM op zijn kop leek te zetten. Het internet maakte iets mogelijk dat in de wereld van televisie en print ondenkbaar was: je kon een individuele gebruiker *volgen*. Een klik op een banner liet een spoor na. Datzelfde spoor kon je doortrekken tot aan de aankoop. Voor het eerst leek de vraag die MMM met moeite en onzekerheid benaderde — wat leverde deze advertentie op? — rechtstreeks en exact beantwoordbaar.

De technische drager van deze belofte was de **cookie**: een klein tekstbestandje dat een website in de browser van de bezoeker plaatst om hem te herkennen. In het bijzonder de **third-party cookie** — een cookie geplaatst door een andere partij dan de bezochte website, bijvoorbeeld een advertentienetwerk — maakte het mogelijk gebruikers te volgen *over verschillende websites heen*. Daarmee ontstond de infrastructuur voor gerichte advertenties en voor het toerekenen van conversies aan de advertenties die eraan voorafgingen.

### Attributie verdringt het model

Op deze infrastructuur groeide de discipline van de **attributie** (*attribution*): het toewijzen van een conversie aan de contactmomenten die eraan voorafgingen. In zijn eenvoudigste vorm — **last-click-attributie** — kreeg de laatste advertentie waarop iemand klikte vóór de aankoop de volledige eer. Later kwamen verfijndere verdeelregels, maar het principe bleef: volg de gebruiker, en verdeel de conversie over zijn digitale voetsporen.

Voor marketeers voelde dit als een bevrijding, en de aantrekkingskracht was enorm. Attributie was *snel* (de cijfers stonden de volgende ochtend in het dashboard), *goedkoop* (het zat ingebakken in de advertentieplatforms zelf), en *gedetailleerd* tot op het niveau van de individuele advertentie of het zoekwoord. Afgezet tegen een MMM dat maanden duurde, tonnen kostte en met brede onzekerheidsmarges kwam, leek de keuze simpel. Waarom een verband schátten uit geaggregeerde data, als je het rechtstreeks kon *meten* per klik? In veel organisaties verdween MMM naar de achtergrond of helemaal uit beeld. Het gold als de dure, trage voorloper van iets beters.

### Waarom de belofte altijd al gebrekkig was

De belofte was verleidelijk, maar ze bevatte vanaf het begin scheuren die pas later voluit zichtbaar werden. Drie ervan zijn fundamenteel en verdienen het om nu al benoemd te worden, want ze verklaren waarom de terugkeer van MMM geen modegril is maar een correctie.

De eerste scheur is het **view-through-probleem**. Tracking ziet clicks, maar veel reclame werkt zónder click. Iemand ziet een videoadvertentie, klikt niet, maar zoekt drie dagen later het merk op en koopt. Attributie op basis van clicks mist dit effect volledig, of schrijft het toe aan het verkeerde kanaal. Juist het merkopbouwende deel van reclame — het deel dat vraag *creëert* in plaats van oogst — is grotendeels klikloos, en dus grotendeels onzichtbaar voor tracking.

De tweede scheur is het **offline-probleem**. Een groot deel van de economie speelt zich af buiten het bereik van de cookie. Winkelverkopen, telefonische bestellingen, mond-tot-mondreclame, de invloed van een billboard of een televisiecommercial: het laat geen digitaal spoor na. Voor een pure webwinkel is dat een beperking; voor een retailer, een autofabrikant of een dienstverlener met fysieke vestigingen mist tracking daarmee de kern van de business.

De derde en diepste scheur is dat attributie *routes* beschrijft maar geen *oorzaken* meet — het onderscheid dat we in hoofdstuk 1 introduceerden en in hoofdstuk 3 volledig uitwerken. Dat een klant via een bepaald digitaal pad binnenkwam, betekent niet dat dat pad de aankoop *veroorzaakte*. Deze scheur is de gevaarlijkste, want hij is onzichtbaar zolang je hem niet zoekt: het dashboard toont keurige, precieze getallen, en niets aan die getallen verraadt dat ze de verkeerde vraag beantwoorden.

Lange tijd bleven deze scheuren grotendeels onopgemerkt, of werden ze weggewuifd als randgevallen. Zolang de tracking-infrastructuur intact was, kón je immers geloven in de belofte van perfecte meetbaarheid. Dat geloof kwam ten einde toen die infrastructuur zelf begon af te brokkelen — niet door een technisch defect, maar door een maatschappelijke omslag.

---

## 2.3 De privacy-omwenteling: GDPR, ATT en het einde van de third-party cookie

### Een structurele kentering, geen incident

Vanaf het midden van de jaren tien kwam het volgen van individuen onder toenemende druk te staan — juridisch, technisch en maatschappelijk. Wat losse gebeurtenissen leken, vormde samen één beweging: het tijdperk waarin je consumenten stilzwijgend over het hele web kon volgen, liep ten einde. Voor de marketingmeting die volledig op dat volgen was gebouwd, was dit geen tegenslag maar een aardverschuiving. We lopen de drie krachten langs.

### GDPR/AVG: toestemming wordt de norm

In 2018 werd de **General Data Protection Regulation** (GDPR) van kracht, in Nederland bekend als de **Algemene Verordening Gegevensbescherming** (AVG). Deze Europese wet stelt strenge eisen aan het verwerken van persoonsgegevens en vereist in veel gevallen expliciete, geïnformeerde **toestemming** (*consent*) van de betrokkene. De zichtbaarste gevolgen zijn de cookiebanners die sindsdien elke website openen.

De gevolgen voor de meting zijn ingrijpend. Een substantieel deel van de bezoekers weigert tracking of negeert de banner, en verdwijnt daarmee uit de data. Erger voor de analist: dat verdwijnen gebeurt niet willekeurig. Wie tracking weigert, verschilt vaak systematisch van wie toestemt — in leeftijd, in techniekgebruik, in koopgedrag. De data die overblijft is dus niet alleen kleiner maar ook *scheef*, en die scheefheid is grotendeels onzichtbaar. Je meet niet langer de markt, maar het deel van de markt dat zich liet meten.

### Apple's App Tracking Transparency: het mobiele slot

Een tweede klap kwam in 2021 van Apple, met **App Tracking Transparency** (ATT). Voortaan moest elke app op de iPhone expliciet toestemming vragen voordat hij de gebruiker over andere apps en websites heen mocht volgen. De overgrote meerderheid van de gebruikers weigerde. In één klap verloren de grote advertentieplatforms een groot deel van hun zicht op wat er ná de klik gebeurde op mobiele apparaten — precies waar een groeiend deel van het mediagebruik plaatsvindt. Voor platforms die op dit volgen waren gebouwd, was de impact op de meetbaarheid direct en groot.

### Het einde van de third-party cookie

De derde kracht is de geleidelijke afschaffing van de **third-party cookie** in de webbrowsers zelf. Browsers als Safari en Firefox blokkeerden deze cookies al langer standaard; de aankondiging dat ook Chrome — verreweg de meestgebruikte browser — zou volgen, betekende het einde van het cookie-tijdperk zoals de advertentiewereld dat kende. De precieze tijdlijn is herhaaldelijk verschoven en het onderwerp blijft in beweging, maar de richting staat vast en is onomkeerbaar: cross-site tracking via third-party cookies verdwijnt als betrouwbaar fundament.

Voor de lezer die dit aan een klant uitlegt, is juist die richting de kern van de boodschap. Of de laatste cookie nu volgend jaar of over drie jaar sneuvelt, is voor een meetstrategie niet doorslaggevend. Doorslaggevend is dat je geen meetsysteem meer moet bouwen op een fundament dat aan het verdwijnen is. En dat is precies het argument dat MMM terugbracht: een methode die nooit op individuele tracking heeft geleund, staat plotseling op de stevigste grond die er is.

---

## 2.4 De beperkingen van GA4 en platform-attributie

### Van meetbelofte naar meetlacunes

De privacy-omwenteling raakte niet alleen de exotische hoeken van de advertentietechnologie, maar ook de gereedschappen waar vrijwel elke marketeer dagelijks mee werkt: het webanalysepakket en de dashboards van de advertentieplatforms zelf. Omdat data-analisten hun uitkomsten voortdurend tegen deze bronnen zullen moeten afzetten, is het essentieel om precies te begrijpen waarom ze onvolledig zijn. Wie dat niet scherp heeft, verliest het onvermijdelijke gesprek waarin een klant zijn platformdashboard naast jouw modeluitkomst legt en vraagt waarom ze niet overeenkomen.

### GA4 en de grenzen van webanalyse

**Google Analytics 4** (GA4) is het meest gebruikte webanalysepakket ter wereld en voor veel organisaties de standaardbron voor "wat er op de website gebeurt". Het is een waardevol instrument, maar als meetlat voor marketingeffectiviteit kent het structurele beperkingen die de analist moet kennen.

Het begint bij **consent-verlies**: bezoekers die tracking weigeren, worden niet of slechts gedeeltelijk gemeten. Om de gaten die daardoor ontstaan te vullen, gebruiken moderne analysepakketten **gemodelleerde conversies** (*modelled conversions*) — geschatte, ingevulde waarden op basis van statistische modellen. Dat is een verdedigbare oplossing, maar het betekent dat een deel van de cijfers in het dashboard geen tellingen zijn maar schattingen, met hun eigen onzekerheid die nergens zichtbaar is. Daar komt **cross-device-verlies** bij: iemand die 's middags op zijn telefoon oriënteert en 's avonds op de laptop koopt, wordt makkelijk als twee losse personen geteld. En ten slotte blijft webanalyse per definitie blind voor alles wat buiten de website gebeurt — de winkelverkoop, de telefonische bestelling, het effect van een radiospot.

De praktische consequentie, en meteen een terugkerend thema in dit boek: **GA4-conversies en MMM-contributies zijn niet hetzelfde en tellen niet tot hetzelfde totaal op.** Ze meten verschillende dingen met verschillende methoden. Een van je eerste taken in bijna elk traject is uitleggen waarom dat zo is, zonder dat het klinkt als een uitvlucht.

### Het probleem van de eigen scorekaart

De diepste beperking van platform-attributie is niet technisch maar structureel, en ze verdient een eigen benaming omdat je haar zo vaak zult tegenkomen: platforms **beoordelen hun eigen huiswerk** (*grading your own homework*). Meta meet en rapporteert de effectiviteit van Meta-advertenties. Google meet en rapporteert de effectiviteit van Google-advertenties. Elk platform doet dat met zijn eigen definities, zijn eigen attributievensters en — onvermijdelijk — zijn eigen commerciële belang bij een gunstige uitkomst. Dit is geen beschuldiging van kwade trouw; het is een structureel gegeven dat je moet meewegen bij elke platform-gerapporteerde ROAS.

De zichtbaarste symptomen van dit mechanisme zijn tweeledig. Het eerste is **dubbeltelling**: wanneer meerdere platforms dezelfde conversie claimen, telt de som van alle platform-gerapporteerde conversies vaak op tot meer dan de werkelijke omzet — soms fors meer. Een euro omzet die door drie kanalen wordt opgeëist, verschijnt als drie euro succes. Het tweede symptoom is de structurele **overschatting** van kanalen die vraag *oogsten* in plaats van *creëren*, zoals we in hoofdstuk 3 volledig zullen ontleden.

Dit brengt ons bij de kern van waarom MMM terugkeerde. Zolang elk platform zijn eigen prestaties meet, ontbreekt er iets essentieels: een **onafhankelijke, overkoepelende meetlaag** die de platforms buiten hen om beoordeelt en de effecten optelt tot een geheel dat mét de werkelijke omzet klopt. MMM is bij uitstek die laag. Het kijkt van bovenaf naar de totale omzet, kent geen belang bij welk kanaal wint, en dwingt de bijdragen om samen op te tellen tot wat er werkelijk is verkocht. In een wereld van gefragmenteerde, eigenbelang-gedreven platformmeting is dat overkoepelende, onafhankelijke perspectief geen luxe meer maar een noodzaak.

---

## 2.5 De MMM-renaissance (2018–nu)

### Waarom uitgerekend nu

Rond 2018 kwamen twee bewegingen samen. Aan de ene kant maakte de privacy-omwenteling het oude tracking-fundament onbetrouwbaar en creëerde ze een dringende behoefte aan een meetmethode die zonder persoonsgegevens werkt. Aan de andere kant hadden nieuwe wiskunde en nieuwe software de klassieke bezwaren tegen MMM — traag, duur, gesloten — grotendeels weggenomen. De vraag naar MMM steeg dus precies op het moment dat het aanbod ervan drastisch toegankelijker werd. Uit die samenloop ontstond de renaissance.

### De privacy-eigenschap wordt een verkoopargument

De belangrijkste inhoudelijke reden voor de terugkeer is dat de grootste beperking van MMM plotseling zijn grootste kracht werd. MMM werkt op **geaggregeerde data** — weektotalen van omzet en media-inzet — en heeft geen enkel persoonsgegeven nodig. In het tijdperk van perfecte tracking gold dat als een gebrek: waarom genoegen nemen met totalen als je individuen kon volgen? In het privacy-tijdperk is het een doorslaggevend voordeel. Een methode die geen cookies, geen gebruikers-ID's en geen toestemming vereist, heeft geen last van consent-verlies, van ATT of van het einde van de third-party cookie. Terwijl de op tracking gebouwde meting afbrokkelde, bleef MMM staan alsof er niets gebeurde — want de grond waarop het staat, is nooit verschoven.

Daar komt de **full-funnel- en omnichannel-dekking** bij. Omdat MMM van bovenaf naar de totale omzet kijkt, ziet het online én offline, betaald én organisch, merkopbouw én activatie in één samenhangend beeld. Juist de blinde vlekken van tracking — de televisiecommercial, de winkelverkoop, het klikloze merkeffect — vallen binnen het bereik van MMM.

### Nieuwe wiskunde: de Bayesiaanse wending

De tweede motor van de renaissance is methodologisch. De klassieke MMM's leunden op traditionele regressie, die bij de typische MMM-situatie — weinig datapunten, veel kanalen, sterk samen bewegende media-inzet — instabiele en moeilijk te verdedigen uitkomsten gaf. De opkomst van praktisch toepasbare **Bayesiaanse methoden** veranderde dat. De Bayesiaanse aanpak, die we in deel IV vanaf de grond opbouwen, laat toe om domeinkennis expliciet in het model te brengen via **priors**, en levert bij elke uitkomst een volledige onzekerheidsmarge in plaats van een kaal getal. Voor een probleem dat van nature data-arm en kennis-rijk is, bleek dit precies de juiste taal. De rekenkracht en de algoritmen om zulke modellen binnen redelijke tijd te schatten kwamen in dezelfde periode breed beschikbaar.

### Open source democratiseert het vak

De derde motor is misschien wel de meest ingrijpende: MMM ging **open source**. Waar de methode decennialang opgesloten zat in de software en de hoofden van gespecialiseerde bureaus, verschenen er vanaf ongeveer 2020 vrij beschikbare frameworks die iedereen kon inzien, gebruiken en aanpassen. Drie ervan bepalen het huidige landschap en zul je regelmatig tegenkomen:

| Framework | Herkomst | Karakter |
|---|---|---|
| **Robyn** | Meta (Facebook) | Semi-geautomatiseerd, gebaseerd op traditionele regressie met evolutionaire optimalisatie |
| **LightweightMMM / Meridian** | Google | Bayesiaans; Meridian is de nieuwere, geo-gerichte opvolger |
| **PyMC-Marketing** | PyMC-gemeenschap | Bayesiaans, gebouwd op de PyMC-bibliotheek; maximale flexibiliteit en transparantie |

Deze frameworks deden voor MMM wat open source vaker doet: ze haalden de methode weg bij een handvol specialisten en legden haar in handen van een brede gemeenschap van analisten. De prijs — vroeger een drempel van tonnen — daalde, de doorlooptijd kromp van maanden naar weken, en de methoden werden inzichtelijk in plaats van geheim.

### Waar dit boek in het landschap staat

Dit boek gebruikt **PyMC** als gereedschap, en die keuze is didactisch. De semi-geautomatiseerde frameworks kunnen sneller een resultaat opleveren, maar ze verbergen daarbij precies de keuzes die een specialist moet begrijpen en verdedigen. Door in PyMC te bouwen, zie je elke aanname, elke prior en elke structuurkeuze expliciet voor je — en dat is de kennis die overdraagbaar is naar elk ander framework. Wie begrijpt wat er in PyMC gebeurt, kan een Robyn- of Meridian-model lezen en beoordelen; andersom geldt dat veel minder. We diepen deze afweging uit in hoofdstuk 16; hier volstaat dat we bewust kiezen voor begrijpen-door-zelfbouwen boven de snelste route naar een getal.

---

## 2.6 Wat we van de geschiedenis leren voor de praktijk

De geschiedenis van MMM is niet alleen een verhaal over methoden, maar ook over terugkerende patronen die je in je eigen werk zult herkennen. Drie lessen verdienen het om expliciet meegenomen te worden naar de rest van dit boek.

De eerste les is dat **elk meetparadigma zichzelf overschat**. De klassieke MMM-bureaus presenteerden hun modellen met meer stelligheid dan de brede onzekerheidsmarges rechtvaardigden. De digitale attributie beloofde perfecte meetbaarheid en leverde een precies ogend maar structureel vertekend beeld. Er is geen reden om aan te nemen dat MMM immuun is voor dezelfde valkuil. De verdediging tegen deze overschatting loopt als een rode draad door dit boek: onzekerheid eerlijk rapporteren, aannames expliciet maken, en de uitkomsten toetsen in plaats van verkondigen.

De tweede les volgt daaruit: **triangulatie wint van elke enkele methode**. Geen van de drie lenzen uit hoofdstuk 1 — attributie, experimenten, MMM — bezit de volledige waarheid. De geschiedenis toont wat er gebeurt wanneer een organisatie zich volledig aan één methode uitlevert: eerst aan MMM, waarna de digitale belofte het wegvaagde, en toen aan tracking, waarna de privacy-omwenteling dat fundament ondergroef. De volwassen praktijk verankert MMM daarom in experimenten en houdt platformdata in beeld voor de tactiek. Dat MMM opnieuw centraal staat, betekent niet dat het de andere lenzen overbodig maakt — het betekent dat het de coördinerende laag is die de andere lenzen op hun plaats houdt.

De derde les is de meest praktische. **De klassieke MMM-valkuilen zijn niet verdwenen — ze zijn alleen minder zichtbaar geworden.** Overfitting, verkeerd gekozen controlevariabelen, het verwarren van correlatie met causaliteit: het zijn dezelfde problemen die de econometristen van de jaren zeventig al kenden. Moderne software maakt het gemakkelijker dan ooit om een model te laten draaien, maar het maakt het niet gemakkelijker om een *goed* model te bouwen. Sterker nog: de toegankelijkheid vergroot het risico dat iemand een model produceert dat overtuigend oogt en toch misleidt, juist omdat de gereedschappen de onderliggende keuzes verbergen. Dat is precies waarom dit boek de volgorde aanhoudt die het aanhoudt — eerst de marketing, de data en de causaliteit, dan pas de code.

Daarmee is de cirkel van het fundament nog niet rond. We hebben nu gezien *wat* MMM is (hoofdstuk 1) en *waar het vandaan komt en waarom het terugkeerde* (dit hoofdstuk). De diepste reden voor het bestaan van MMM hebben we echter nog slechts aangestipt: het onderscheid tussen wat een advertentieplatform claimt en wat een marketinginspanning werkelijk *veroorzaakt*. Dat onderscheid — het probleem van de **incrementaliteit** — is zo centraal dat het een eigen hoofdstuk verdient. Daarmee gaan we in hoofdstuk 3 verder.
