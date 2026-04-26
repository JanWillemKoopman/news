/* ═══════════════════════════════════════════════════════════════
   James' Wonder-App — app.js
   Vanilla JS, no dependencies.
   Features: gepersonaliseerde naam · voortgang · favorieten ·
             foto's per wonder · kleurthema per categorie ·
             badges · dagelijkse streak · geluidseffecten

   HOW TO ADD A NEW WONDER:
   ─────────────────────────
   Add a new object to the `wonderLibrary` array below, following
   this template:

     {
       title: "De naam van het onderwerp",
       intro: "~150-200 woorden in 2-3 alinea's, gescheiden door \\n\\n",
       philosophyQuestion: "Een diepe vraag om samen over na te denken.",
       deepDive: "~250-350 woorden in 3-4 alinea's, de vraag in de titel beantwoordend."
     },

   Dat is alles! De app kiest automatisch een willekeurig wonder.
═══════════════════════════════════════════════════════════════ */

'use strict';

/* ── Wonder Library ────────────────────────────────────────────
   Each entry is one "wonder" James will discover.
   Language: Dutch | Level: Leesniveau B
──────────────────────────────────────────────────────────────── */
const wonderLibrary = [
  {
    title: "De Maanlanding 🌕",
    intro: "Op 20 juli 1969 zette een mens voor het allereerst voet op de maan. Die man heette Neil Armstrong. Op het moment dat zijn laars het maanoppervlak raakte, zei hij iets wat mensen nooit meer vergaten: \"Één kleine stap voor een mens, één reuzenstap voor de mensheid.\" Die woorden hoorden miljoenen mensen tegelijk op de radio en televisie.\n\nDe reis ernaartoe duurde vier dagen. De raket heette Saturn V en was groter dan een flatgebouw. De computer aan boord had minder rekenkracht dan een eenvoudige rekenmachine die je nu voor een paar euro koopt. Toch werkte alles precies zoals gepland — bijna dan. Onderweg ging er het een en ander mis, maar de astronauten losten elk probleem op.\n\nOp de maan was het compleet stil, er was geen lucht en de hemel was pikzwart — ook overdag. De aarde hing als een grote blauwe bol boven de horizon. Kun jij je voorstellen hoe dat eruitzag?",
    philosophyQuestion: "Als jij op de maan mocht staan en naar de aarde keek — wat zou je dan denken?",
    deepDive: "Hoe mensen op de maan kwamen, is eigenlijk een verhaal over onmogelijk hard werken én een beetje geluk. De Verenigde Staten en de Sovjet-Unie waren in die tijd verwikkeld in een wedstrijd: wie als eerste de ruimte in kon, wie als eerste een mens in een baan om de aarde bracht, en uiteindelijk — wie als eerste op de maan landde.\n\nPresident Kennedy beloofde in 1961 plechtig dat Amerika vóór het einde van dat decennium een mens op de maan zou zetten. Op dat moment wist NASA nog nauwelijks hoe dat moest. Toch lukte het. Meer dan 400.000 mensen werkten mee aan het Apollo-programma. Ingenieurs, wetenschappers, naaisters die de ruimtepakken maakten, mensen die de computers programmeerden.\n\nDe missie Apollo 11 vloog met drie mannen: Neil Armstrong, Buzz Aldrin en Michael Collins. Collins bleef in de capsule om de aarde orbiten terwijl Armstrong en Aldrin afdaalden in de maanlander. Ze liepen iets minder dan twee uur buiten, plantten een vlag en namen stenen mee terug.\n\nIn totaal hebben maar twaalf mensen ooit op de maan gelopen, allemaal Amerikanen, allemaal tussen 1969 en 1972. Daarna stopten de missies — en sindsdien is er geen mens meer geweest. Nu werken NASA en andere ruimtevaartorganisaties aan plannen om er opnieuw naartoe te gaan, misschien zelfs om er een basis te bouwen."
  },
  {
    title: "De Tweede Wereldoorlog 🕊️",
    intro: "Van 1940 tot 1945 was Nederland bezet door nazi-Duitsland. Dat betekende dat soldaten uit Duitsland ons land binnenwamen en de baas speelden. Mensen mochten niet meer zeggen wat ze dachten, niet meer doen wat ze wilden, en heel veel mensen werden weggehaald en vermoord — alleen omdat ze Joods waren, of omdat ze zich verzetten.\n\nDe oorlog begon eigenlijk al in 1939, toen Duitsland Polen binnenviel. Al snel werden meer landen aangevallen. Uiteindelijk vochten bijna de hele wereld mee: Amerika, Engeland, Rusland aan de ene kant, en Duitsland, Japan en Italië aan de andere kant. Het was de grootste en dodelijkste oorlog die ooit heeft plaatsgevonden. Meer dan 70 miljoen mensen kwamen om het leven.\n\nIn Nederland verstopten veel mensen zich of hielpen ze anderen om te overleven. Maar er waren ook mensen die meewerkt met de bezetter. Het was een tijd waarin je elke dag moeilijke keuzes moest maken.",
    philosophyQuestion: "Waarom denk jij dat het zo belangrijk is dat mensen vrijheid hebben?",
    deepDive: "Een dapper verhaal uit die tijd is dat van Anne Frank. Ze was een Joods meisje van dertien jaar dat met haar familie in Amsterdam woonde. Toen de situatie gevaarlijk werd, verborg de familie zich in een geheim achterhuis achter een boekenkast. Twee jaar lang leefden ze verstopt, zonder naar buiten te mogen. Anne schreef alles op in een dagboek. Ze beschreef haar angsten, haar dromen, haar hoop op een betere toekomst.\n\nHelaas werden ze in 1944 ontdekt en weggevoerd. Anne stierf in een concentratiekamp. Maar haar dagboek overleefde de oorlog. Het werd uitgegeven en is nu vertaald in meer dan zeventig talen. Miljoenen mensen over de hele wereld hebben het gelezen. Het laat zien hoe een gewoon meisje probeerde mens te blijven in een onmenselijke tijd.\n\nOp 8 mei 1945 capituleerde Duitsland. Voor Nederland was de bevrijding al op 5 mei — die dag vieren we elk jaar als Bevrijdingsdag. De dag ervoor, 4 mei, herdenken we alle slachtoffers van de oorlog met twee minuten stilte.\n\nDe les die mensen na de oorlog trokken: nooit meer. De Verenigde Naties werden opgericht om landen te laten praten in plaats van vechten. En de Europese samenwerking begon juist om ervoor te zorgen dat Frankrijk en Duitsland nooit meer oorlog met elkaar zouden voeren. Tot nu toe is dat gelukt."
  },
  {
    title: "De Rijkste Persoon op Aarde 💰",
    intro: "Stel je voor dat je elke seconde van de dag 1.000 euro verdiende. Dag en nacht, ook als je slaapt. Dan zou het nog jaren duren voordat je zo rijk was als de rijkste mensen op aarde. Hun vermogen is zo groot dat gewone getallen er niet meer bij passen — we praten over honderden miljarden euro's.\n\nDe rijkste persoon ter wereld wisselt regelmatig. Op dit moment staan namen als Elon Musk, Jeff Bezos en Bernard Arnault bovenaan. Elon Musk is de baas van Tesla (elektrische auto's), SpaceX (raketten) en het sociale netwerk X. Jeff Bezos begon Amazon vanuit zijn garage, met alleen de verkoop van boeken. Nu is Amazon één van de grootste bedrijven op aarde.\n\nMaar wat doe je eigenlijk met zóveel geld? Dat is een vraag waar slimme mensen het niet over eens zijn.",
    philosophyQuestion: "Wat zou jij doen als je meer geld had dan je ooit kon uitgeven?",
    deepDive: "De rijkste persoon op aarde heeft op dit moment genoeg geld om een eigen raket te kopen — en dat heeft Elon Musk ook echt gedaan. Zijn bedrijf SpaceX bouwt raketten die naar de ruimte vliegen en daarna gewoon landen om opnieuw gebruikt te worden. Dat was twintig jaar geleden ondenkbaar. Vroeger kon alleen een land als Amerika of Rusland raketten bouwen. Nu doet één persoon het.\n\nJeff Bezos heeft ook een raketbedrijf: Blue Origin. Hij vloog er zelf mee de ruimte in. Rijke mensen bouwen niet alleen raketten — ze kopen eilanden, jachten zo groot als voetbalvelden, en sommigen geven hun geld weg aan goede doelen. Bill Gates, de oprichter van Microsoft, heeft al meer dan 50 miljard dollar weggegeven aan ziektebestrijding en onderwijs.\n\nMaar zoveel rijkdom roept ook vragen op. Is het eerlijk dat een paar mensen zóveel hebben, terwijl miljoenen mensen moeite hebben om eten te kopen? Sommige mensen vinden dat rijken veel meer belasting zouden moeten betalen. Anderen vinden dat rijke ondernemers juist banen en innovatie creëren.\n\nEén ding is zeker: de lijst van rijkste mensen verandert voortdurend. Veel van de rijkste mensen van vandaag waren veertig jaar geleden gewoon studenten met een idee. Geld is dus ook een verhaal over timing, geluk en doorzettingsvermogen."
  },
  {
    title: "Het Diepste Gat op Aarde 🕳️",
    intro: "Kun je dwars door de aarde boren en aan de andere kant uitkomen? Wetenschappers hebben het geprobeerd. In Rusland boorden ze meer dan twintig jaar lang een gat in de grond — zo diep als 12 kilometer. Dat klinkt ver, maar vergeleken bij het middelpunt van de aarde is het nog maar een kleine kras.\n\nDe aarde heeft een straal van ruim 6.300 kilometer. Het diepste gat dat mensen ooit hebben gemaakt — de Kola Superdeep Borehole in Rusland — is slechts 12,2 kilometer diep. Stel je de aarde voor als een appel: dan hebben we nauwelijks door de schil geprikt.\n\nToch vertelde dat gat ons verbluffende dingen. Op die diepte troffen wetenschappers dingen aan die ze totaal niet verwacht hadden — en daarmee leerden we iets heel bijzonders over onze eigen planeet.",
    philosophyQuestion: "Wat denk jij dat er helemaal in het midden van de aarde zit?",
    deepDive: "Nee, we kunnen niet dwars door de wereld boren — en dat zal waarschijnlijk ook nooit lukken. De reden is simpel: hitte. Op 12 kilometer diepte was de temperatuur al meer dan 180 graden Celsius. Dat is heter dan een bakoven op de hoogste stand. De boorkoppen smolten en de rotsen werden zo zacht als klei. Het project moest stoppen.\n\nNaar het middelpunt van de aarde is het nog eens 6.300 kilometer verder. Daar is de temperatuur vergelijkbaar met het oppervlak van de zon: meer dan 5.000 graden Celsius. Geen enkel materiaal dat wij kennen kan dat overleven.\n\nMaar het bijzondere is wat ze wél ontdekten in dat gat. Op grote diepte vonden de wetenschappers iets totaal onverwacht: microscopisch kleine fossiele overblijfselen van ééncellige organismen — leven, op een plek waar niemand dat mogelijk achtte. Ook troffen ze water aan dat vastzat in mineralen, diep in de rots.\n\nWe weten wat er in het midden van de aarde zit dankzij aardbevingen. Als ergens op aarde een beving plaatsvindt, sturen de schokgolven door de hele planeet. Door te meten hoe snel die golven reizen en hoe ze afbuigen, hebben wetenschappers de binnenkant van de aarde in kaart gebracht. Er zit een vloeibare buitenkern van ijzer en nikkel, en een vaste binnenkern — een ijzeren bol zo groot als de maan, gloeiend heet en onder enorme druk."
  },
  {
    title: "Wat is een Europeaan? 🇪🇺",
    intro: "Als jij in Nederland woont, ben je Nederlander. Maar tegelijkertijd ben je ook iets anders: een Europeaan. Dat betekent dat je onderdeel bent van een groot samenwerkingsverband van landen dat de Europese Unie heet. Die club telt 27 landen, van Portugal in het westen tot Roemenië in het oosten, van Finland in het noorden tot Griekenland in het zuiden.\n\nEuropa als werelddeel bestaat al heel lang. Maar de Europese Unie is een recenter idee — opgericht na de Tweede Wereldoorlog, omdat landen besloten dat samenwerken beter is dan oorlog voeren. En dat werkte: er is al tachtig jaar geen oorlog meer tussen de landen van de EU.\n\nMaar wat betekent het nou eigenlijk om Europeaan te zijn? Waarom horen we bij die grote club, en wat hebben we eraan?",
    philosophyQuestion: "Als landen samenwerken, denk je dat dat de wereld beter of moeilijker maakt?",
    deepDive: "Een Europeaan zijn betekent in de eerste plaats dat je bepaalde rechten hebt die andere mensen niet hebben. Je mag vrij reizen, wonen en werken in alle 27 EU-landen — zonder visum, zonder gedoe. Een Nederlander kan zomaar naar Spanje verhuizen om daar te werken. Of naar Duitsland, of Italië. Dat is voor veel mensen in de wereld ondenkbaar.\n\nIn de meeste EU-landen betaal je met dezelfde munt: de euro. Dat maakt reizen en handel een stuk makkelijker. Je hoeft niet steeds geld te wisselen als je van land naar land gaat. De EU maakt ook regels die in alle landen gelden — over voedselveiligheid, milieu, en consumentenrechten. Als jij een speelgoed koopt, zijn daar veiligheidsregels voor die in heel Europa gelden.\n\nMaar de EU is niet altijd eenvoudig. Landen hebben soms heel verschillende meningen over wat er moet gebeuren. Het kost veel tijd om het ergens over eens te worden. En sommige landen vinden dat de EU te veel macht heeft — Groot-Brittannië besloot zelfs om te vertrekken, iets wat we Brexit noemen.\n\nNederland is een van de oprichtende landen van de EU. We profiteren enorm van de handel met andere Europese landen — meer dan de helft van alles wat Nederland verkoopt, gaat naar andere EU-landen. Europeaan zijn is dus niet alleen een gevoel, het is ook gewoon heel praktisch."
  },
  {
    title: "De Gulden 🪙",
    intro: "Voordat Nederland de euro had, betaalden mensen hier met de gulden. Dat was ons eigen Nederlandse geld, en het bestond al heel lang — al meer dan zeshonderd jaar. Papa en mama hebben er als kind mee gesnoept gekocht, en opa en oma betaalden er hun eerste huis mee.\n\nOp 1 januari 2002 verdween de gulden voor altijd. Die dag mochten mensen voor het eerst betalen met euro's. In winkels hingen rekenmachines zodat mensen snel konden omrekenen: één euro was 2,20 gulden. Het was wennen, maar binnen een paar weken was iedereen het gewend.\n\nDe gulden had prachtige munten en biljetten. Op de meeste stond het gezicht van de koningin — eerst Juliana, daarna Beatrix. Maar er waren ook biljetten met een merel, een roodborstje, of beroemde Nederlandse kunstenaars erop. Elk biljet was een klein kunstwerkje.",
    philosophyQuestion: "Stel dat elk land zijn eigen geld heeft — wat zijn de voor- en nadelen daarvan, denk je?",
    deepDive: "De gulden was bijzonder omdat hij zo'n lange geschiedenis had. De eerste gulden werd geslagen in de veertiende eeuw, en sindsdien is het geld door allerlei tijden meegegaan: oorlogen, crises, welvaart. Tijdens de Tweede Wereldoorlog maakten de Duitsers eigen nep-biljetten om de Nederlandse economie te verstoren. Na de oorlog moest al het geld worden omgewisseld om die valse biljetten eruit te halen.\n\nDe munten hadden ook hun eigen bijnamen. Het 5-centstuk heette een stuiver, het 10-centstuk een dubbeltje, het 25-centstuk een kwartje. Een rijksdaalder was 2,50 gulden. Die namen gebruiken mensen in Nederland soms nog steeds, ook nu we allang de euro hebben.\n\nEen brood kostte in de jaren negentig misschien twee gulden. Een zak chips een gulden. Met een tientje kon je flink wat snoep kopen. Nu kost datzelfde brood al snel drie euro — dat is bijna zeven gulden. Dat noemen we inflatie: geld wordt minder waard naarmate de tijd verstrijkt.\n\nSommige mensen missen de gulden nog. Ze vinden dat Nederland met de gulden meer controle had over zijn eigen economie. Anderen zijn blij met de euro, omdat reizen en handel veel eenvoudiger is geworden. En dan zijn er de verzamelaars: oude guldens en dubbeltjes zijn nu meer waard dan hun oorspronkelijke waarde, omdat ze zeldzaam zijn geworden."
  },
  {
    title: "De Wetenschapper 🔬",
    intro: "Stel je voor dat je elke dag naar je werk gaat met één taak: vragen stellen. Niet gewoon vragen, maar de moeilijkste vragen die er zijn. Waarom worden mensen ziek? Hoe oud is het heelal? Wat zit er in een atoom? Dat is wat wetenschappers doen — de hele dag, hun hele leven lang.\n\nEen wetenschapper is iemand die de wereld wil begrijpen. Ze doen experimenten, meten dingen, lezen wat andere wetenschappers hebben ontdekt, en proberen dan iets nieuws te bewijzen. Het bijzondere is: een wetenschapper mag het ook fout hebben. Als een experiment laat zien dat je idee niet klopt, is dat juist goed — want dan weet je iets wat je daarvoor niet wist.\n\nEr zijn heel veel soorten wetenschappers, en ze bestuderen bijna alles wat je maar kunt bedenken.",
    philosophyQuestion: "Als jij wetenschapper was, welke vraag zou jij dan als eerste willen beantwoorden?",
    deepDive: "Een bioloog bestudeert leven — van kleine bacteriën tot grote walvissen. Een astronoom kijkt naar sterren, planeten en zwarte gaten. Een scheikundige mengt stoffen en kijkt wat er gebeurt. Een psycholoog onderzoekt hoe mensen denken en voelen. Een paleontoloog graaft naar fossielen van dieren die miljoenen jaar geleden leefden. En zo zijn er nog honderden andere soorten.\n\nWat al die wetenschappers gemeen hebben, is de wetenschappelijke methode. Dat klinkt ingewikkeld, maar het is eigenlijk gewoon: je bedenkt een vraag, je doet een experiment, je meet het resultaat, en je trekt een conclusie. Dan publiceer je het, zodat andere wetenschappers het kunnen controleren en verbeteren. Wetenschap is dus een samenwerking over de hele wereld en door de tijd heen.\n\nAlbert Einstein was een beroemde wetenschapper die ontdekte dat tijd geen vaste maatstaf is. Hoe sneller je beweegt, hoe langzamer de tijd voor jou gaat. Dat klinkt als sciencefiction, maar het is echt bewezen — en het klopt zelfs voor de gps in een telefoon. Die moet er rekening mee houden, anders zou je navigatie een paar kilometer fout zitten.\n\nVeel van de dingen om je heen bestaan dankzij wetenschap: medicijnen, vliegtuigen, telefoons, vaccins. En de wetenschappers van nu werken aan de ontdekkingen die jouw toekomst vormgeven — van schone energie tot behandelingen voor ziekten die nu nog ongeneeslijk zijn."
  },
  {
    title: "Pokémon ⚡",
    intro: "Het begon met een kind dat graag insecten ving in de velden rondom zijn dorp in Japan. Dat kind heette Satoshi Tajiri, en hij groeide op in een tijd dat Japan snel veranderde — velden verdwenen, er kwamen gebouwen voor terug. Hij wilde andere kinderen laten voelen hoe leuk het was om beestjes te vangen, te ruilen en te verzamelen. Dus maakte hij er een spel van.\n\nIn 1996 verscheen Pokémon Rood en Pokémon Blauw voor de Game Boy in Japan. Spelers reisden door een wereld, vingen wilde Pokémon, trainden ze en vochten ermee. Het idee om twee versies uit te brengen — waarbij sommige Pokémon alleen in Rood zaten en andere alleen in Blauw — dwong kinderen om te ruilen met vrienden. Slim bedacht.\n\nWat volgde, was één van de grootste culturele explosies in de geschiedenis van entertainment.",
    philosophyQuestion: "Wat zou jouw eigen Pokémon zijn, en welk bijzonder vermogen zou hij hebben?",
    deepDive: "Hoe een verzameling Japanse monstertjes de wereld veroverde, is eigenlijk een verhaal over perfect timing. Pokémon verscheen precies op het moment dat de Game Boy populair was, kinderen overal ter wereld met elkaar verbonden raakten, en de ruilkaartjesmarkt explodeerde. Het spel, de tekenfilm, de kaartjes, de film — alles versterkte elkaar.\n\nDe naam Pokémon is een afkorting van Pocket Monsters — kleine monsters die je in je zak draagt. In de eerste spellen waren er 151 Pokémon. Nu, bijna dertig jaar later, zijn er meer dan 1.000. Elk jaar komen er nieuwe bij. De makers bedenken ze op basis van dieren, planten, mythologische wezens, en zelfs dingen als ijsjes of sleutelhangers.\n\nPikachu werd het gezicht van Pokémon, maar eigenlijk is hij niet eens de krachtigste. De echte starter-keuze waarmee spelers beginnen is tussen Bulbasaur, Charmander en Squirtle — en die discussie woedt nog steeds onder fans. Charmander is verreweg de populairste, maar kenners kiezen Bulbasaur.\n\nPokémon is vandaag de dag het meest winstgevende mediamerk ter wereld — meer dan Star Wars, meer dan Harry Potter, meer dan Marvel. Kaartjes zijn zoveel waard dat mensen ze als belegging kopen. Eén zeldzame Charizard-kaart werd verkocht voor meer dan 300.000 euro. Allemaal begonnen door een kind dat insecten ving."
  },
  {
    title: "De T-Rex 🦖",
    intro: "De Tyrannosaurus Rex leefde zo'n 66 miljoen jaar geleden, in een tijd dat mensen nog lang niet bestonden. Hij was één van de grootste roofdieren die ooit op het land heeft gelopen. Alleen al zijn kop was zo lang als een volwassen mens — vol met tanden zo groot als bananen, met een bijtkracht drie keer sterker dan die van een leeuw.\n\nEn toch heeft de T-Rex iets wat iedereen aan het lachen maakt: die belachelijk kleine armpjes. Ze waren maar zo'n 90 centimeter lang. Een T-Rex kon zijn eigen mond er niet mee aanraken. Wetenschappers krabbelen al tientallen jaren op hun hoofd: waarvoor dienden die armpjes eigenlijk?\n\nWas de T-Rex dus een echte superroofdier, of was hij meer een reusachtige kip met een groot hoofd en nutteloze armpjes?",
    philosophyQuestion: "Als jij zo'n krachtig dier was maar met één groot gebrek — wat zou jij doen om dat te verbergen of te compenseren?",
    deepDive: "Het korte antwoord: de T-Rex was absoluut gevaarlijk — waarschijnlijk een van de gevaarlijkste dieren die ooit hebben geleefd. Zijn kaakkracht was enorm: hij kon dwars door botten bijten. Wetenschappers hebben botten van andere dinosauriërs gevonden met T-Rex-tandafdrukken erin — en die botten waren half verteerd. Hij beet dus gewoon stukken vlees én bot eraf.\n\nMaar was hij een jager of een aaseter? Lang dachten sommige wetenschappers dat zo'n zwaar dier te traag was om actief te jagen. Recent onderzoek wijst uit dat hij waarschijnlijk beide deed: hij joeg op zieke of langzame prooi, maar nam ook graag een al-dood dier over van een ander. Slim, niet lui.\n\nDan die armpjes. De nieuwste theorie is verrassend: de kleine armen waren misschien juist een evolutionair voordeel. Omdat de T-Rex zo'n enorme kop had, zouden lange armen in de weg zitten bij het bijten — ze konden eraf gebeten worden. Korte, sterke armpjes dicht bij het lichaam waren veiliger. Sommige onderzoekers denken ook dat ze gebruikt werden om op te staan na het liggen.\n\nDus ja: de T-Rex was de echte koning van zijn tijd. Die armpjes waren misschien niet nutteloos — maar een beetje belachelijk blijven ze."
  },
  {
    title: "Zwarte Gaten 🕳️",
    intro: "Ergens in het heelal zijn er plekken waar de zwaartekracht zo sterk is, dat niets eruit kan ontsnappen — niet eens licht. Die plekken heten zwarte gaten. Ze zijn onzichtbaar, want er komt geen licht af. Toch weten wetenschappers dat ze bestaan, en zelfs hoe groot ze zijn.\n\nEen zwart gat ontstaat als een heel grote ster aan het einde van zijn leven explodeert en daarna instort op zichzelf. Alles wordt samengeperst in een piepklein punt, maar met een enorme massa. De zwaartekracht rondom dat punt is zo sterk dat zelfs licht — het snelste wat bestaat — er niet meer uit weg kan.\n\nIn 2019 maakten wetenschappers voor het allereerst een foto van een zwart gat. Het was een oranje-gloeiende ring van gas met een donker gat in het midden. Een mijlpaal die tientallen jaren aan voorbereiding kostte.",
    philosophyQuestion: "Als je in een zwart gat zou vallen en niet meer terug kon komen — zou je dan toch willen weten wat erin zit?",
    deepDive: "Zwarte gaten zijn de stofzuigers van de ruimte — maar dat is niet helemaal eerlijk. Ze zuigen niets actief op. Ze trekken dingen aan met zwaartekracht, net zoals de aarde jou aantrekt. Alleen is die aantrekkingskracht bij een zwart gat onvoorstelbaar veel sterker. Als je dicht genoeg bij een zwart gat komt — voorbij de zogeheten 'event horizon' — is er geen ontkomen meer aan.\n\nWat er met jou zou gebeuren als je in een zwart gat viel, is wetenschappelijk gezien fascinerend en griezelig tegelijk. Vanaf grote afstand zou iemand jou steeds langzamer zien bewegen, totdat je bevroren leek in de tijd — vlak voor de rand. Jij zelf zou niets bijzonders merken op het moment van overschrijden. Maar daarna zou de zwaartekracht aan je beginnen te trekken — zo ongelijk dat je hoofd sneller zou worden aangetrokken dan je voeten, totdat je letterlijk uitgerekt zou worden als spaghetti. Wetenschappers noemen dat ook echt 'spaghettificatie'.\n\nIn het midden van bijna elke grote melkweg zit een superzwaar zwart gat. Ook in het midden van onze eigen Melkweg — dat zwarte gat heet Sagittarius A* en is vier miljoen keer zo zwaar als onze zon. Toch hoeven we ons geen zorgen te maken: het is op veilige afstand, 26.000 lichtjaar van de aarde.\n\nHet mooiste aan zwarte gaten is misschien wel dit: we begrijpen ze nog steeds niet helemaal. De wetten van de natuur zoals we die kennen, houden op te werken in het midden van een zwart gat. Dat betekent dat er iets is wat we nog niet snappen — en dat is precies waarom wetenschappers er zo gefascineerd door zijn."
  },
  {
    title: "De Piramides 🔺",
    intro: "In de woestijn van Egypte staan bouwwerken die al meer dan 4.500 jaar overeind staan: de piramides. De grootste, de Grote Piramide van Giza, werd gebouwd voor farao Cheops. Hij is 146 meter hoog — lang het hoogste bouwwerk op aarde. En hij is opgebouwd uit meer dan 2 miljoen stenen blokken, elk gemiddeld zo zwaar als twee auto's.\n\nHoe bouwden mensen die enorme stenen bergen zonder hijskranen, zonder machines, zonder motoren? Met alleen menselijke spierkracht, touwen, houten sleeën en heel veel organisatie. En toch staan ze er nog. Na duizenden jaren, na aardbevingen, na stormen — de piramides staan nog altijd rechtop in de woestijn.\n\nHet raadsel van hoe ze precies gebouwd zijn, heeft wetenschappers eeuwenlang beziggehouden.",
    philosophyQuestion: "Als jij iets wilde bouwen dat nog over 4.000 jaar bestaat, wat zou dat dan zijn?",
    deepDive: "Hoe bouwden de oude Egyptenaren de piramides zonder moderne machines? Het antwoord is: met enorme aantallen mensen, slimme technieken, en jarenlange planning. Wetenschappers denken dat tienduizenden arbeiders werkten aan de bouw — niet als slaven, zoals lang werd gedacht, maar als betaalde werkers. Er zijn inscripties gevonden die ploegen arbeiders namen gaven als 'Vrienden van Cheops' en 'Drankmakers van Menkaure'. Ze kregen bier, brood en vlees.\n\nDe stenen werden waarschijnlijk op houten sleden getrokken over een laag vochtig zand. Dat zand werkte als smeermiddel — wrijving vermindert enorm als zand net vochtig genoeg is. Tekeningen in oude graven laten precies dit zien: een man die water giet voor de slee. Slimme oplossing.\n\nDe nauwkeurigheid waarmee de piramides zijn gebouwd, is verbijsterend. De basis van de Grote Piramide is zo perfect vierkant dat de vier hoeken maar een paar centimeter van elkaar afwijken — op een oppervlak zo groot als tien voetbalvelden. Hoe ze dat voor elkaar kregen zonder moderne meetinstrumenten, is nog steeds niet volledig verklaard.\n\nBinnen de piramides zitten gangen, kamers en geheime schachten. Sommige wijzen precies naar bepaalde sterren. De Egyptenaren geloofden dat de farao na zijn dood naar de sterren reisde — de piramide was zijn lanceerplatform naar het hiernamaals."
  },
  {
    title: "De Blauwe Vinvis 🐋",
    intro: "De blauwe vinvis is het grootste dier dat ooit op aarde heeft geleefd — groter dan welke dinosaurus dan ook. Hij kan 30 meter lang worden, zo lang als drie bussen achter elkaar. En hij weegt soms meer dan 150.000 kilogram — dat is het gewicht van dertig olifanten samen.\n\nZijn hart is zo groot als een kleine auto. De slagaders zijn zo wijd dat een kind erin zou kunnen kruipen. En zijn tong alleen al weegt meer dan een volwassen olifant. Het zijn cijfers die je hoofd doen tollen.\n\nEn toch leeft dit enorme dier van iets heel kleins: garnaalachtigen die krill heten, elk slechts een paar centimeter groot. Elke dag eet een blauwe vinvis zo'n vier ton krill.",
    philosophyQuestion: "Wat vind jij indrukwekkender: heel groot zijn of heel slim zijn?",
    deepDive: "Ja, je zou — in theorie — in de aderen van een blauwe vinvis kunnen zwemmen. De grootste bloedvaten zijn zo'n 30 centimeter in doorsnede. Maar dan zou je wel de stroomsnelheid van het bloed moeten overwinnen, want dat hart pompt met enorme kracht. Het hart slaat maar vijf tot zes keer per minuut, maar elke slag stuurt honderden liters bloed door het lichaam.\n\nDe blauwe vinvis is ook één van de luidste dieren op aarde. Zijn zang — een diepe, rommelende toon — kan worden gehoord op honderden kilometers afstand. Vóórdat mensen de oceanen vervuilden met scheepslawaai, konden blauwe vinvissen misschien wel de halve wereld over communiceren. Nu is dat geluid overal aanwezig in de oceaan, en het verstoort hun communicatie.\n\nIn de twintigste eeuw werden blauwe vinvissen massaal bejaagd voor hun traan (olie). Rond 1960 waren er nog maar een paar honderd exemplaren over, van een oorspronkelijke populatie van honderdduizenden. Sindsdien is de jacht verboden, en de populatie herstelt langzaam — maar er zijn nog steeds maar zo'n tien- tot vijftienduizend blauwe vinvissen op aarde.\n\nHet bijzondere is dat we dit dier, zo enorm als het is, nog steeds slecht kennen. Ze leven diep in de oceaan, zijn moeilijk te volgen, en hun gedrag is grotendeels een mysterie. Het grootste dier op aarde, en we weten er maar weinig van."
  },
  {
    title: "Vulkanen 🌋",
    intro: "Diep onder je voeten, kilometers ver naar beneden, is de aarde gloeiend heet. Het gesteente daar is zo warm dat het vloeibaar wordt — dat noemen we magma. En soms zoekt dat magma een weg omhoog, door barsten in de aardkorst, totdat het uitbarst aan het oppervlak. Op dat moment heet het lava en is een vulkaan geboren.\n\nEen vulkaanuitbarsting is één van de krachtigste verschijnselen op aarde. Lava stroomt met temperaturen van soms 1.200 graden Celsius, as wordt kilometers de lucht in geslingerd, en de knal van een grote uitbarsting kan honderden kilometers ver worden gehoord.\n\nMaar vulkanen zijn niet alleen vernietigers. Ze zijn ook bouwers — ze hebben eilanden gemaakt, vruchtbare grond gecreëerd, en zelfs meegevormd aan de atmosfeer van onze planeet.",
    philosophyQuestion: "Zou jij vlak bij een vulkaan willen wonen, wetend dat de grond er heel vruchtbaar is maar er ook gevaar is?",
    deepDive: "De aarde spuugt vuur en gesmolten steen omdat ze van binnen nog altijd enorm heet is — een overblijfsel van haar vorming, meer dan vier miljard jaar geleden. De buitenste laag van de aarde, de aardkorst, bestaat uit grote platen die langzaam bewegen. Op de plekken waar die platen uit elkaar drijven of over elkaar schuiven, ontstaan zwakke plekken — en daar komen vulkanen voor.\n\nEr zijn verschillende soorten vulkaanuitbarstingen. Sommige zijn relatief rustig: lava stroomt traag van de top omlaag, zoals op Hawaï. Andere zijn explosief en gevaarlijk: bij de uitbarsting van de Krakatau in 1883 was de knal te horen tot 5.000 kilometer ver, en de as verduisterde de zon maandenlang. De uitbarsting van de Tambora in 1815 was zo groot dat 1816 'het jaar zonder zomer' werd — wereldwijd mislukten oogsten.\n\nMaar vulkanen zijn ook levensgevers. Lava koelt af en wordt na verloop van tijd ongelooflijk vruchtbare grond. Gebieden rondom vulkanen zijn vaak de meest productieve landbouwgebieden op aarde. Dat is waarom mensen al duizenden jaren vlakbij vulkanen wonen — gevaarlijk, maar de grond is goud waard.\n\nOok op andere planeten zijn vulkanen. Op Mars staat Olympus Mons: de grootste vulkaan in ons zonnestelsel, drie keer zo hoog als de Mount Everest. En op Io, een maan van Jupiter, zijn vulkanen nog steeds actief en spuwen ze zwavel de ruimte in."
  },
  {
    title: "Lego 🧱",
    intro: "In een klein stadje in Denemarken woonde een timmerman die Ole Kirk Christiansen heette. Hij maakte houten speelgoed voor kinderen. Toen hout te duur werd, stapte hij over op plastic. En uit die overstap groeide iets wat hij nooit had kunnen bedenken: het populairste speelgoed ter wereld.\n\nIn 1949 maakte zijn bedrijf — Lego — de eerste plastic blokjes met nopjes. Ze pasten precies op elkaar. Je kon ze bouwen, afbreken en opnieuw bouwen. Geen einde aan de mogelijkheden. Het idee was simpel, maar de uitvoering was perfect: de nopjes van een Lego-steen van 1958 passen nog steeds op een steen van vandaag.\n\nVandaag de dag maakt Lego meer banden dan welk ander bedrijf op aarde — kleine Lego-bandjes voor minifiguurtjes. En elk jaar worden er zoveel stenen gemaakt dat er voor elke persoon op aarde 86 stuks zijn.",
    philosophyQuestion: "Als jij iets mocht uitvinden dat kinderen over de hele wereld blij maakte, wat zou dat dan zijn?",
    deepDive: "Hoe veränderde een Deense timmerman de wereld met plastic blokjes? Door één geniale eigenschap: compatibiliteit. Elke Lego-steen past op elke andere Lego-steen, ongeacht wanneer hij gemaakt is. Dat systeem werd gepatenteerd in 1958 en is sindsdien nooit veranderd. Het betekent dat je een doos van opa uit 1970 kunt mixen met een nieuwe set van vandaag. Dat is uniek in de wereld van speelgoed.\n\nDe naam Lego komt van de Deense woorden 'leg godt', wat 'speel goed' betekent. Puur toevallig betekent 'lego' in het Latijn ook 'ik bouw' of 'ik verbind'. Ole Kirk Christiansen ontdekte dat later — en was er heel blij mee.\n\nLego heeft ook moeilijke tijden gekend. Rond 2003 was het bedrijf bijna failliet — ze hadden te veel producten gemaakt, te ingewikkeld en te duur. Ze gingen terug naar de basis: simpele stenen, goede sets, kwaliteit boven kwantiteit. En het werkte. Vandaag is Lego één van de meest winstgevende speelgoedbedrijven ter wereld.\n\nEr zijn ook Lego-sets voor volwassenen: de Eiffeltoren, het Witte Huis, de Starship Enterprise. Sommige sets hebben meer dan 10.000 stukjes. Bouwen is niet alleen voor kinderen — het blijft een manier voor mensen van alle leeftijden om hun handen te gebruiken en iets te creëren."
  },
  {
    title: "Ridders en Kastelen 🏰",
    intro: "Stel je voor dat je woont in een huis met muren zo dik als een auto lang is, met een ophaalbrug over een gracht, en met wachters die dag en nacht de omgeving in de gaten houden. Dat was het leven in een middeleeuws kasteel — een wereld van stenige gangen, fakkels, en ridders in glanzend harnas.\n\nRidders waren de soldaten van de Middeleeuwen. Ze reden op paarden, droegen zware wapenrustingen en dienden een heer of koning. Om ridder te worden, begon je als page — een soort leerling — op je zevende. Op je veertiende werd je schildknaap, en pas op je eenentwintigste, als je bewezen had dat je het waard was, werd je officieel ridder geslagen.\n\nMaar hoe was het dagelijks leven in zo'n kasteel nou echt? Niet altijd zo romantisch als in sprookjes.",
    philosophyQuestion: "Zou jij liever leven in de Middeleeuwen of nu? Wat mis je dan, en wat zou juist beter zijn?",
    deepDive: "Het leven in een kasteel was rauw, koud en gevaarlijk — maar ook vol leven en kleur. De grote zaal was het hart van het kasteel: hier at iedereen samen, werd muziek gemaakt, en werden gasten ontvangen. Er waren geen aparte kamers voor privacy; je sliep, at en leefde samen met tientallen anderen.\n\nVerwaarming was er nauwelijks. Er was een open haard in de grote zaal, maar de rest van het kasteel was ijskoud. Mensen sliepen in wollen kleren, in bedden met dikke gordijnen eromheen om de warmte van hun eigen lichaam vast te houden. Hygiene was anders dan nu: een bad nam je misschien een paar keer per jaar, in een houten kuip.\n\nRidders zelf hadden een erecodex: de ridderlijkheid. Ze moesten dapper zijn, hun heer trouw, eerlijk en beschermend naar vrouwen en zwakken. In de praktijk was het leven van een ridder gevaarlijk — gevechten, toernooien, en lange veldtochten. Een harnas woog zo'n 25 kilogram. Alles doen met zo'n gewicht erop? Uitputtend.\n\nKastelen werden ook gebouwd als symbool van macht. Hoe groter en indrukwekkender, hoe meer ontzag bij het gewone volk. Veel kastelen in Nederland, België en Duitsland staan er nog steeds. Ze zijn nu musea of hotels — maar als je er doorheen loopt, kun je je nog steeds voorstellen hoe het was."
  },
  {
    title: "Het Internet 🌐",
    intro: "Elke keer dat je een filmpje kijkt, een bericht stuurt of een spel speelt, gebeurt er iets ongelooflijks: onzichtbare informatie raast met bijna de snelheid van het licht door kabels en door de lucht, soms duizenden kilometers ver, in een fractie van een seconde.\n\nHet internet bestaat eigenlijk uit een gigantisch netwerk van kabels — ook onder de oceaan. Die kabels zijn zo dun als een tuinslang, maar ze vervoeren elke dag meer informatie dan alle boeken in alle bibliotheken van de wereld bij elkaar. Vrijwel alles op je telefoon of computer werkt dankzij die kabels, ergens op de bodem van de zee.\n\nMaar hoe gaat dat precies in zijn werk? Hoe weet een filmpje van een kat in Japan de weg naar jouw scherm in Nederland?",
    philosophyQuestion: "Het internet verbindt mensen over de hele wereld — maar vind jij dat we daardoor dichter bij elkaar zijn of juist verder van de mensen naast ons?",
    deepDive: "Wanneer jij op een filmpje drukt, wordt dat filmpje niet in één stuk naar jou gestuurd. Het wordt eerst opgeknipt in duizenden kleine stukjes die 'pakketjes' heten. Elk pakketje reist zelfstandig op zoek naar de snelste route naar jouw apparaat — soms via Amerika, soms via Azië — en jouw telefoon of computer plakt ze aan de andere kant weer in de juiste volgorde terug in elkaar. Alles in een fractie van een seconde.\n\nDie pakketjes reizen via glasvezelkabels: dunne draden die lichtpulsen gebruiken om informatie te sturen. Licht is het snelste wat bestaat — 300.000 kilometer per seconde. Onder de Atlantische Oceaan liggen kabels van duizenden kilometers die Europa verbinden met Amerika. Ze worden bewaakt door speciale schepen, want een beschadigde kabel kan het internet voor hele landen platleggen.\n\nWi-Fi werkt anders: jouw router zet die signalen om in radiogolven die door de lucht reizen naar jouw telefoon. Het is hetzelfde principe als een radio, maar razendsnel en in twee richtingen tegelijk.\n\nHet internet werd uitgevonden in de jaren zestig door het Amerikaanse leger. Ze wilden een netwerk dat niet kapotging als een stad gebombardeerd werd — want pakketjes kunnen altijd een andere route nemen. Vandaag de dag gebruiken meer dan vijf miljard mensen datzelfde idee om kattenfilmpjes te kijken."
  },
  {
    title: "De Marianentrog 🌊",
    intro: "In de Stille Oceaan, niet ver van het eiland Guam, ligt de diepste plek op aarde: de Marianentrog. Het diepste punt heet de Challengerdiepte en ligt op bijna 11 kilometer onder het wateroppervlak. Als je de Mount Everest — de hoogste berg op aarde — op de bodem zou zetten, stak zijn top nog steeds meer dan een kilometer onder water.\n\nOp die diepte is alles anders. Het is pikdonker, want zonlicht dringt maar een paar honderd meter diep. De waterdruk is meer dan duizend keer zo hoog als aan het oppervlak — genoeg om een onbeschermde mens in een fractie van een seconde te vernietigen. De temperatuur is net boven het vriespunt.\n\nEn toch leven er dingen. Bizarre, ongrijpbare wezens die mensen eeuwenlang monsters noemden — en misschien hadden ze niet eens zo ongelijk.",
    philosophyQuestion: "We weten meer over de maan dan over de oceaanbodem — vind jij dat we meer geld moeten steken in de ruimte of in de diepzee?",
    deepDive: "De Marianentrog is inderdaad zo diep en donker dat er vreemde wezens leven — maar het zijn geen monsters in de klassieke zin. Het zijn dieren die perfect zijn aangepast aan een wereld zonder licht, zonder warmte, en met een verpletterende druk. Veel van hen maken hun eigen licht: bioluminescentie. In de eeuwige duisternis knipperen en gloeien ze om te communiceren of om prooi te lokken.\n\nVissen die er leven hebben soms transparante lichamen, enorme ogen om elk spoortje licht op te vangen, of juist helemaal geen ogen. Er zijn kreeftachtigen die giftige chemicaliën eten die elders dodelijk zijn. Er zijn bacteriën die gedijen zonder zuurstof. Het is een compleet andere wereld, met eigen spelregels.\n\nWe hebben de bodem van de Marianentrog pas een handvol keren bezocht. De eerste keer was in 1960, met een speciaal diepzeeboot die een stalen bol had met muren van 12 centimeter dik. De bemanning zag door het raampje een platvis wegzwemmen — leven op de diepste plek op aarde. In 2012 dook filmmaker James Cameron er in zijn eentje naartoe in een zelfgebouwde onderzeeër.\n\nHet treurige nieuws: zelfs op de bodem van de Marianentrog vinden onderzoekers plastic afval. Menselijk vuilnis heeft de diepste plek op aarde bereikt. Dat vertelt ons iets over hoeveel plastic we gebruiken — en wat we ermee doen."
  },
  {
    title: "Mars 🔴",
    intro: "Mars is onze buur in het zonnestelsel — de op drie na dichtste planeet bij de zon. Hij is kleiner dan de aarde, heeft een dunne atmosfeer, en zijn lucht bestaat voornamelijk uit koolstofdioxide. Op Mars is het gemiddeld min 60 graden Celsius. En toch dromen mensen ervan er naartoe te gaan.\n\nDe rode kleur van Mars komt door ijzeroxide — in gewone taal: roest. De hele planeet is letterlijk bedekt met roestig stof. Er zijn enorme kraters, diepe canyons — de Valles Marineris is tien keer zo lang als de Grand Canyon — en de grootste vulkaan in ons zonnestelsel, Olympus Mons.\n\nEr rijden nu robots op Mars: rovers die foto's maken, grond analyseren en wetenschappers op aarde informatie sturen. Een helikoptertje vloog er voor het eerst. Maar mensen? Die zijn er nog nooit geweest.",
    philosophyQuestion: "Als jij de kans had om als eerste mens op Mars te leven — maar je kon nooit meer terug naar de aarde — zou je dan gaan?",
    deepDive: "Gaan we later echt op vakantie naar Mars? Eerlijk gezegd: vakantie waarschijnlijk nog niet zo snel. Maar een permanente basis? Dat plannen verschillende landen en bedrijven voor de komende decennia.\n\nDe reis naar Mars duurt al snel zeven maanden — afhankelijk van de positie van de planeten. Onderweg word je blootgesteld aan straling, spierverlies door gewichtloosheid, en de psychologische druk van maandenlange isolatie. Als je aankomt, moet je alles zelf regelen: lucht, water, voedsel, warmte. Er is geen hulpdienst die even langskwam rijden.\n\nElon Musks bedrijf SpaceX werkt aan een raket die mensen naar Mars moet brengen: de Starship. Het plan is ambitieus — al in de jaren 2030 wil Musk een eerste menselijke missie. NASA werkt ook aan plannen. De vraag is niet meer óf mensen naar Mars gaan, maar wanneer.\n\nHet interessante is dat Mars vroeger misschien heel anders was. Miljarden jaren geleden was er vloeibaar water op het oppervlak — wetenschappers hebben gedroogde rivierbeddingen en aanwijzingen voor oceanen gevonden. Was er ooit leven op Mars? We weten het nog niet. Maar de rovers zoeken er actief naar. Als we ooit primitieve microben vinden — of zelfs fossielen van lang uitgestorven leven — is dat de grootste ontdekking in de menselijke geschiedenis."
  },
  {
    title: "Het Brein 🧠",
    intro: "In je hoofd zit een orgaan dat ongeveer 1,4 kilogram weegt, er uitziet als een walnoot, en meer berekeningen per seconde uitvoert dan de krachtigste computer op aarde. Het heet je hersenen, en het regelt alles: je bewegingen, je gevoelens, je herinneringen, je dromen — en zelfs je ademhaling als je slaapt.\n\nJe hersenen bestaan uit ongeveer 86 miljard zenuwcellen, ook wel neuronen genoemd. Die neuronen zijn verbonden met elkaar door ontelbaar veel verbindingen — meer dan alle sterren in onze Melkweg. Elke gedachte die je hebt, elk gevoel, is eigenlijk een elektrisch signaal dat razendsnel van neuron naar neuron springt.\n\nHet brein is zo complex dat wetenschappers na eeuwen van onderzoek nog steeds veel vragen hebben. Hoe werkt bewustzijn? Hoe ontstaan herinneringen? Wat gebeurt er als je slaapt?",
    philosophyQuestion: "Als je je hersenen kon uploaden naar een computer en daarin kon blijven leven — zou dat nog echt jij zijn?",
    deepDive: "Je brein regelt alles wat je doet, ook als je het niet merkt. Terwijl je dit leest, regelt je brein je ademhaling, je hartslag, je balans, de spijsvertering in je buik, en het verwerken van licht dat op je netvlies valt. Tegelijk begrijpt het taal, zoekt het betekenis, en slaat het informatie op. Alles tegelijk, zonder dat jij er iets voor hoeft te doen.\n\nSlaap is voor het brein geen rustpauze — het is juist een druk werkmoment. Terwijl jij slaapt, verwerkt je brein de indrukken van de dag, slaat het herinneringen op, en ruimt het afvalstoffen op. Wetenschappers denken dat het brein tijdens de slaap letterlijk wordt schoongespoeld met hersenvocht. Als je niet genoeg slaapt, hopen die afvalstoffen op — en dat is één reden waarom je je dan zo sloom voelt.\n\nEén van de grootste mysteries van het brein is bewustzijn: het feit dat jij weet dat jij bestaat. Wetenschappers kunnen meten welke hersendelen actief zijn, maar kunnen nog steeds niet verklaren waarom al die elektrische signalen samen het gevoel creëren van 'ik ben James en ik besta'. Dat probleem heeft zelfs een naam: het 'hard problem of consciousness'.\n\nJe brein verandert ook nog de hele tijd. Als kind is het bijzonder flexibel — nieuwe verbindingen worden voortdurend aangelegd. Elk nieuw iets dat je leert, elke nieuwe gewoonte die je opbouwt, verandert letterlijk de structuur van je hersenen. Wetenschappers noemen dat neuroplasticiteit. Jouw brein van vandaag is niet hetzelfde als het brein van gisteren."
  },
  {
    title: "Bijen 🐝",
    intro: "Een bij weegt een tiende van een gram. Hij heeft een hersenen zo groot als een sesamzaadje. En toch is de bij misschien wel het belangrijkste dier op aarde — zeker voor mensen. Zonder bijen zou een groot deel van ons voedsel verdwijnen.\n\nBijen zijn bestuivers. Ze vliegen van bloem naar bloem op zoek naar nectar, en onderweg nemen ze stuifmeel mee en deponeren het op de volgende bloem. Zo helpen ze planten zich voort te planten. Appels, aardbeien, amandelen, komkommers, zonnebloemen — ze bestaan allemaal dankzij de bij. Meer dan een derde van al ons voedsel hangt af van bestuiving door insecten, met de bij bovenaan.\n\nEen bijenkorf is ook een wonder van organisatie: tienduizenden bijen die samenwerken als één groot organisme, elk met een eigen taak.",
    philosophyQuestion: "Als bijen zouden uitsterven, wat zou jij doen om het voedseltekort dat dan ontstaat op te lossen?",
    deepDive: "Bijen zijn de belangrijkste dieren op aarde voor de menselijke voedselproductie — en dat is geen overdrijving. Einstein wordt soms geciteerd met de uitspraak dat de mensheid maar vier jaar zou overleven als bijen uitstierven. Hij heeft dat waarschijnlijk nooit echt gezegd, maar de gedachte klopt grotendeels. Zonder bijen geen bestuiving, zonder bestuiving geen vruchten en zaden, zonder vruchten geen voedsel voor mensen én voor de dieren die mensen eten.\n\nEen bijenvolk werkt als een superfunctie. De koningin legt tot 2.000 eieren per dag. Werksters bouwen raten van bijenwas, verzorgen de larven, bewaken de ingang en halen nectar. Darren — de mannetjes — hebben maar één taak: de koningin bevruchten. Zodra dat gedaan is, worden ze de korf uitgegooid. Het klinkt hard, maar zo werkt de natuur.\n\nBijen communiceren met dans. Als een verkenster een goede voedselbron heeft gevonden, voert ze een 'waggeldans' op in de korf. De richting van de dans geeft de richting van de bloemen aan, de duur geeft de afstand. Andere bijen 'lezen' de dans en vliegen er direct naartoe. Het is een taal — geen woorden, maar beweging.\n\nHet slechte nieuws: bijen staan wereldwijd onder druk. Pesticiden, verlies van bloemenrijke graslanden, ziektes en parasieten laten populaties slinken. Steden zijn soms veiliger voor bijen dan het platteland, omdat stadstuinen vol bloemen staan. Zelf een bijvriendelijke tuin aanleggen — of zelfs maar een bloempot met wilde bloemen — helpt al."
  },
  {
    title: "De Noordpool ❄️",
    intro: "Op het uiterste noorden van de aarde, precies op de plek waar alle lengtelijnen samenkomen, ligt de Noordpool. Er is geen land — alleen een enorme laag bevroren zeewater, een ijsvlakte zo groot als de Verenigde Staten. In de winter zakt de temperatuur tot min 40 graden Celsius of lager. In de zomer stijgt ze nauwelijks boven nul.\n\nHet bijzonderste aan de Noordpool is de zon. In de winter gaat de zon maandenlang helemaal niet op — de poolnacht. Alles is in duisternis gehuld, en soms verlicht het groene en roze flikkeren van het noorderlicht de hemel. In de zomer is het andersom: de middernachtzon. Wekenlang gaat de zon niet onder.\n\nIjsberen, walrussen, narwallen en zeehonden leven in en rond de Arctische Oceaan. Maar de Noordpool zelf is leeg — geen mens woont er permanent.",
    philosophyQuestion: "Als de Noordpool smelt en verdwijnt, wat verliezen we dan behalve ijs?",
    deepDive: "Op de Noordpool gaat de zon inderdaad soms maanden niet onder — en soms maanden niet op. Dat klinkt vreemd, maar het heeft alles te maken met hoe de aarde kantelt. De aardas staat scheef, met een hoek van 23,5 graden. In de zomer staat de Noordpool naar de zon gericht: de zon draait rond de horizon maar zakt er niet onder. In de winter staat de pool van de zon af gekeerd: geen zonlicht bereikt de pool gedurende maanden.\n\nHet noorderlicht, of aurora borealis, is een ander wonderlijk verschijnsel van de poolstreken. Het ontstaat als geladen deeltjes van de zon de aardatmosfeer binnendringen en botsen met luchtmoleculen. Die botsingen produceren licht — groen, rood, paars — dat golfachtig over de hemel trekt. Mensen reizen van over de hele wereld naar Noord-Noorwegen, IJsland of Canada om het te zien.\n\nMaar de Noordpool is ook een barometer voor klimaatverandering. Het Arctische ijs smelt in een tempo dat wetenschappers zorgen baart. In de zomer is er steeds minder zee-ijs. Ijsberen verliezen hun leefgebied. En het wegsmelten van het ijs heeft ook gevolgen voor de rest van de wereld: het beïnvloedt oceaanstromingen, zeespiegels, en weerpatronen ver buiten de poolstreken.\n\nVerschillende landen claimen ook rechten op de Noordpool, omdat er mogelijk enorme voorraden olie en gas onder de zeebodem liggen. Naarmate het ijs smelt, worden die bronnen bereikbaarder. Dat maakt de Arctische regio tegelijk een wetenschappelijke, ecologische én politieke hotspot."
  },
  {
    title: "Robots 🤖",
    intro: "Een robot is een machine die taken kan uitvoeren die normaal door mensen worden gedaan. Sommige robots zien eruit als armen — grote, stalen armen in autofabrieken die onderdelen lassen. Andere rijden rond als karretjes in magazijnen. En steeds vaker zien robots eruit als mensen: met een hoofd, een romp, benen en armen.\n\nRobots bestaan al langer dan je misschien denkt. De eerste industriële robots kwamen in de jaren zestig van de twintigste eeuw in fabrieken. Maar de robots van nu zijn veel geavanceerder. Ze kunnen lopen over ongelijk terrein, een glas water aangeven, gebaren herkennen, en zelfs gezichten lezen.\n\nDe grote vraag is: kunnen machines straks ook echt zelf nadenken? En wat betekent dat voor ons?",
    philosophyQuestion: "Als robots alles kunnen doen wat mensen doen — wat wil jij dan nog zelf doen?",
    deepDive: "Kunnen machines echt zelf nadenken en je kamer opruimen? Het antwoord is: ze doen het al deels — maar het is gecompliceerder dan het lijkt. Een robotstofzuiger rijdt al jaren zelfstandig door huiskamers en maakt schoon. Maar die doet dat op basis van sensoren en vaste regels, niet op basis van 'nadenken'.\n\nEchte kunstmatige intelligentie — AI — is iets anders. AI-systemen kunnen leren van voorbeelden, patronen herkennen, tekst schrijven, beelden maken, en beslissingen nemen. Ze 'denken' niet zoals mensen denken, maar ze kunnen indrukwekkende dingen. De AI die Go speelt, versloeg de beste menselijke speler ter wereld. AI-systemen diagnosticeren ziektes nauwkeuriger dan veel artsen op bepaalde gebieden.\n\nMaar een robot die je kamer opruimt zoals een mens dat doet — dingen weggooien die 'troep' zijn, beslissen wat 'orde' betekent, nieuwe situaties begrijpen — dat is verrassend moeilijk. Fysieke taken in een ongestructureerde omgeving zijn voor robots nog steeds lastig. Een kind van drie kan gemakkelijker een kamer opruimen dan de meeste huidige robots.\n\nWat wél zeker is: robots en AI gaan steeds meer taken overnemen. Vrachtwagenchauffeurs, kassamedewerkers, sommige artsen en advocaten — hun werk verandert door automatisering. Dat roept grote vragen op: wat gaan mensen dan doen? Welke banen blijven voor mensen? En wie is verantwoordelijk als een robot een fout maakt?"
  },
  {
    title: "Vliegtuigen ✈️",
    intro: "Een modern passagiersvliegtuig weegt zo'n 300.000 kilogram — zo zwaar als duizenden auto's tegelijk. En toch stijgt het moeiteloos op, klimt het tot 12 kilometer hoogte, en vliegt het urenlang met een snelheid van 900 kilometer per uur. Hoe blijft zo'n enorm, zwaar blok ijzer in de lucht hangen?\n\nHet antwoord zit in de vorm van de vleugels. Vliegtuigvleugels zijn niet plat — ze zijn gebogen: de bovenkant is langer dan de onderkant. Als lucht over de bovenkant van de vleugel stroomt, moet die lucht een langere weg afleggen en beweegt daardoor sneller. Snellere lucht heeft minder druk. Dat drukverschil trekt de vleugel omhoog — dat noemen we lift.\n\nHet principe heet de wet van Bernoulli, vernoemd naar een Zwitserse wiskundige. Zonder hem — of eerder: zonder de gebroeders Wright die dit in 1903 in de praktijk brachten — vlogen we nog met de trein.",
    philosophyQuestion: "Als vliegen gratis en schoon was, waar zou jij dan als eerste naartoe reizen?",
    deepDive: "Een vliegtuig blijft in de lucht dankzij vier krachten die voortdurend in balans zijn: lift (omhoog), zwaartekracht (omlaag), stuwkracht (vooruit) en weerstand (achteruit). Zolang de stuwkracht van de motoren groter is dan de weerstand, en de lift groter is dan de zwaartekracht, vliegt het toestel.\n\nDe motoren van een modern vliegtuig zijn straalmotoren. Ze zuigen enorme hoeveelheden lucht naar binnen, comprimeren die, mengen het met kerosine en steken het aan. De explosie stuwt het toestel vooruit. Eén straalmotorop een grote Boeing 747 levert meer vermogen dan duizend gewone auto-motoren samen.\n\nLanden is technisch gezien moeilijker dan opstijgen. Het vliegtuig moet precies op het juiste moment, op de juiste hoogte en snelheid, de landingsbaan raken — terwijl wind, regen of mist voor complicaties kunnen zorgen. Moderne vliegtuigen kunnen automatisch landen met behulp van computers en instrumenten, zelfs bij nul zicht.\n\nEen vliegtuig is ook een van de veiligste vormen van transport. De kans om te sterven in een vliegtuigongeluk is kleiner dan de kans om te sterven onderweg naar het vliegveld in een auto. Toch voelt vliegen voor veel mensen spannender — waarschijnlijk omdat je geen controle hebt. In een auto voel je tenminste dat jij rijdt."
  },
  {
    title: "Goud en Diamanten 💎",
    intro: "Goud is een gewoon metaal — het blinkt mooi, maar je kunt er geen huis van bouwen en het is niet eetbaar. Een diamant is gewoon koolstof, hetzelfde materiaal als potloodstift, maar dan anders gerangschikt. En toch zijn mensen door de eeuwen heen bereid geweest om er fortuinen voor te betalen, oorlogen over te voeren, en halve continenten te plunderen.\n\nWaarom zijn we zo dol op glimmende stenen en geel metaal? Het antwoord heeft te maken met zeldzaamheid, schoonheid, duurzaamheid — en met het feit dat we er gewoon met zijn allen hebben besloten dat ze waardevol zijn.\n\nDat klinkt simpel, maar het is eigenlijk heel diepzinnig. De waarde van goud en diamanten bestaat grotendeels in onze hoofden.",
    philosophyQuestion: "Als iedereen plotseling besloot dat stenen van het strand net zo waardevol waren als diamanten — zou goud dan nog iets waard zijn?",
    deepDive: "Goud en diamanten zijn bijzonder om verschillende redenen. Goud roest niet, vervaagt niet, en reageert nauwelijks met andere stoffen. Het is ook zeldzaam: al het goud dat ooit is gedolven past in een kubus van slechts 22 meter aan elke kant. Dat maakt het ideaal als ruilmiddel — het verliest zijn waarde niet door de tijd.\n\nDiamanten zijn de hardste natuurlijke stof op aarde. Ze zijn zo hard dat ze worden gebruikt om ander materiaal te snijden en te boren — meer dan 80% van alle gedolven diamanten gaat niet naar sieraden, maar naar industrie. De glinsterende stenen in ringen zijn eigenlijk de zeldzame uitzonderingen.\n\nDiamanten ontstaan diep in de aarde, onder extreme druk en hitte, honderden kilometers onder het oppervlak. Ze worden naar boven gebracht door vulkanische activiteit, in rotspijpen die kimberliet heten. De mijnbouw voor diamanten en goud heeft historisch gezien enorme schade aangericht — in Afrika werden hele bevolkingen uitgebuit, en zogenaamde 'bloeddiamanten' financierden decennialang burgeroorlogen.\n\nVandaag zijn er ook synthetische diamanten: in een laboratorium gemaakt, chemisch identiek aan echte, maar een fractie van de prijs. Veel juweliers zien ze als de toekomst. Anderen vinden dat de waarde zit in de geschiedenis en zeldzaamheid van een echte steen. Wiens gelijk is het? Dat hangt ervan af wat jij denkt dat waarde is."
  },
  {
    title: "De Romeinen 🏛️",
    intro: "Meer dan tweeduizend jaar geleden bouwden de Romeinen een rijk dat het grootste deel van Europa, Noord-Afrika en het Midden-Oosten omvatte. Ze waren niet alleen strijders — ze waren ook ingenieurs, architecten, wetgevers en organisatoren. En veel van wat zij bedachten, gebruiken we vandaag de dag nog steeds.\n\nDe Romeinen bouwden wegen die zo goed waren dat een deel er nog steeds ligt. Ze bouwden aquaducten — gigantische stenen bruggen die water van bergen naar steden transporteerden, soms over tientallen kilometers. Ze bedachten beton, koepels, rioleringstelsels en centrale verwarming. Ze legden de basis voor ons rechtssysteem.\n\nEn ja — ze hadden ook badkamers. Openbare badhuizen waren het sociale centrum van een Romeinse stad. Iedereen ging erheen: arm en rijk, mannen en vrouwen, jong en oud.",
    philosophyQuestion: "Als jij een beschaving mocht stichten die 2.000 jaar later nog bestaat, wat zou je als eerste bouwen of invoeren?",
    deepDive: "De Romeinen bedachten de eerste wegen en badkamers — maar dat is nog maar het begin van hun nalatenschap. De Romanistische wegen waren zo goed ontworpen dat ze eeuwenlang in gebruik bleven. Ze waren recht, goed gedraineerd, en verbonden het hele rijk met Rome als middelpunt. Vandaar het gezegde: alle wegen leiden naar Rome.\n\nHun waterbouwkundige prestaties waren indrukwekkend. Aquaducten transporteerden dagelijks miljoenen liters vers water naar steden. In Rome hadden inwoners toegang tot drinkwater via openbare fonteinen op elke straathoek. De stad had ook een rioleringssysteem, de Cloaca Maxima, dat delen van het afvalwater afvoerde — een enorme verbetering voor de volksgezondheid.\n\nDe badhuizen, thermae, waren niet alleen voor hygiene. Ze waren ontmoetingsplekken, vergelijkbaar met een modern sportcentrum gecombineerd met een café. Er waren warme en koude baden, zwembaden, sportruimtes en bibliotheken. Toegang was vaak goedkoop of gratis.\n\nMaar het Romeinse Rijk viel — langzaam, over honderden jaren, door een combinatie van invasies, interne conflicten, economische problemen en politieke chaos. In 476 na Christus viel de laatste westelijke Romeinse keizer. Toch leeft Rome voort in onze taal (veel Nederlandse woorden komen uit het Latijn), ons recht, onze architectuur, en onze kalender. Januari is vernoemd naar Janus, de Romeinse god van het begin."
  },
  {
    title: "Bliksem en Donder ⚡",
    intro: "Ergens boven de aarde brouwt een onweersbui zich samen. IJskristallen botsen in de wolk, laden zich op met elektriciteit, en op een gegeven moment is de spanning zo groot dat die moet ontladen. In een fractie van een seconde schiet er een enorm elektrisch vonk van de wolk naar de grond — of van wolk naar wolk. Dat noemen we bliksem.\n\nEen bliksemschicht is een elektrische stroom van zo'n 30.000 ampère — duizenden keren sterker dan het stopcontact in je huis. De temperatuur van een bliksemschicht is zo'n 30.000 graden Celsius, vijf keer heter dan het oppervlak van de zon. En het duurt maar een paar honderdste van een seconde.\n\nDonder is het geluid van diezelfde bliksem. De hitte van de bliksem laat de lucht razendsnel uitzetten — als een explosie. Die schokgolf hoor jij als een klap of een rollend gerommel.",
    philosophyQuestion: "Vroeger dachten mensen dat bliksem door goden werd gestuurd — hoe denk jij dat mensen vroeger de natuur probeerden te begrijpen?",
    deepDive: "De bliksemflits werkt als een gigantische elektrische vonk. In een onweersbui scheiden turbulente stromingen positieve en negatieve elektrische ladingen — zwaardere negatief geladen deeltjes zakken naar de onderkant van de wolk, lichtere positief geladen deeltjes stijgen naar de top. Tegelijk lokt de negatieve onderkant van de wolk een positieve lading aan op de grond eronder — in bomen, gebouwen, mensen. Als het verschil groot genoeg wordt, schiet er een vonk: de bliksem.\n\nDe reden dat je de donder later hoort dan je de bliksem ziet, is eenvoudig: licht reist veel sneller dan geluid. Licht legt in één seconde 300.000 kilometer af. Geluid slechts 340 meter. Door de seconden te tellen tussen de bliksemflits en de donderklap kun je berekenen hoe ver weg het onweer is: elke drie seconden is ongeveer één kilometer.\n\nIn de achttiende eeuw begreep de wetenschapper Benjamin Franklin als een van de eersten dat bliksem elektriciteit is — niet de toorn van goden. Hij bewees dit met een beroemd maar gevaarlijk experiment: hij vloog een vlieger op tijdens een onweer, met een sleutel aan het touw, en voelde de elektrische schok. Op basis hiervan vond hij de bliksemafleider uit — een metalen staaf bovenop een gebouw die de bliksem veilig naar de grond leidt.\n\nEr worden elke dag wereldwijd zo'n 8 miljoen blikseminslagen geregistreerd. Een bliksem slaat nooit twee keer op dezelfde plek in, zegt men — maar dat is een mythe. Hoge gebouwen en bomen worden juist regelmatig getroffen."
  },
  {
    title: "Mieren 🐜",
    intro: "Een mier weegt nauwelijks iets — minder dan een milligram. En toch kan hij vijftig keer zijn eigen gewicht dragen. Dat is alsof jij een kleine auto zou optillen. Mieren zijn krachtig, georganiseerd, en leven in kolonies van soms miljoenen individuen die samenwerken als één groot organisme.\n\nEr zijn meer dan 20.000 soorten mieren, en ze wonen op bijna elke plek op aarde — van tropische regenwouden tot woestijnen, van bergtoppen tot tuinen. De totale massa van alle mieren op aarde is ruwweg gelijk aan de totale massa van alle mensen. Ze zijn dus met heel, heel veel.\n\nMieren bouwen uitgebreide ondergrondse nesten met kamers voor voedselopslag, broedkamers voor de eitjes, en zelfs 'afvalruimtes'. Sommige soorten houden schimmels als landbouwgewas, andere houden bladluizen als 'koeien' voor hun honingdauw.",
    philosophyQuestion: "Mieren werken altijd voor de kolonie, nooit voor zichzelf alleen — denk jij dat mensen gelukkiger zouden zijn als we meer zo werkten?",
    deepDive: "Mieren zijn inderdaad het sterkste 'leger' ter wereld dat gewoon onder je voeten loopt — maar het zijn meer boeren en architecten dan soldaten. De meeste mieren zijn werksters die voedsel zoeken, nesten bouwen en larven verzorgen. Alleen een klein deel is soldaat.\n\nHet bijzondere aan mieren is hun communicatie. Ze praten niet met woorden, maar met chemicaliën die feromonen heten. Als een verkenster eten vindt, legt ze op de terugweg een feromoonspoor. Andere mieren volgen dat spoor en versterken het. Hoe meer mieren het volgen, hoe sterker het spoor — en hoe meer mieren er naartoe gaan. Als het voedsel op is, wordt het spoor niet meer versterkt en verdwijnt het.\n\nHet meest indrukwekkende mierenvolk zijn de bladsnijmieren in Zuid-Amerika. Ze knippen stukjes blad en dragen die naar hun nest — niet om op te eten, maar om er schimmels op te kweken. Die schimmels zijn hun voedsel. Ze zijn dus al miljoenen jaren geleden begonnen met landbouw, lang voordat mensen dat deden.\n\nLegerenieren — army ants — zijn de veroveraars onder de mieren. Ze trekken in kolonies van honderdduizenden door het oerwoud, eten alles op hun pad, en bouwen 's nachts levende bivakkampen van hun eigen lichamen, waarbij ze aan elkaar vasthaken. Ze bouwen geen permanent nest — ze zijn altijd in beweging. Een waarachtig rollend leger."
  },
  {
    title: "Vriendschap 🤝",
    intro: "Er is iets dat bijna iedereen kent: het warme gevoel als je je beste vriend ziet. Je hoeft niks te zeggen, niks te doen — het is er gewoon. Vriendschap is een van de oudste en belangrijkste dingen in het menselijk leven. Mensen die goede vrienden hebben, zijn gezonder, gelukkiger, en leven gemiddeld langer.\n\nDat is geen gevoel — het is bewezen door wetenschappers. Een van de langste studies naar menselijk geluk, die al tachtig jaar loopt aan Harvard University, laat zien dat de kwaliteit van je relaties de meest bepalende factor is voor je geluk en gezondheid op latere leeftijd. Niet geld, niet succes, niet een mooie baan — vrienden.\n\nMaar wat is vriendschap eigenlijk? Waarom voelt het zo anders dan een gewone kennis?",
    philosophyQuestion: "Waarom voelt het zo fijn om een beste vriend te hebben — en wat maakt iemand voor jou een échte vriend?",
    deepDive: "Vriendschap voelt fijn omdat het brein er letterlijk op reageert. Als je bij een goede vriend bent, maakt je lichaam oxytocine aan — een stof die soms het 'knuffelhormoon' wordt genoemd. Het geeft je een gevoel van veiligheid en verbinding. Stress vermindert. Pijn voelt minder erg. Je bent gewoon beter af.\n\nEchte vriendschap is gebaseerd op een paar simpele maar diepe dingen: wederzijds vertrouwen, eerlijkheid, en het gevoel dat de ander je ziet zoals je echt bent — niet hoe je wilt overkomen. Een beste vriend is iemand waarbij je niet hoeft te doen alsof. Dat is zeldzamer dan het lijkt.\n\nVriendschappen veranderen ook door de tijd. De vrienden die je hebt op de basisschool, zijn vaak niet dezelfde als op de middelbare school, en later als volwassene. Dat is normaal — mensen groeien, veranderen, en hun leven gaat andere kanten op. Echte vriendschappen kunnen ook een tijdje slapend zijn en daarna weer opbloeien, alsof er niks is veranderd.\n\nEr zijn ook vriendschappen tussen mensen die heel anders zijn. Soms is juist het verschil de reden waarom je iemand boeiend vindt. De filosoof Aristoteles schreef al meer dan 2.300 jaar geleden over drie soorten vriendschap: vriendschap gebaseerd op nut, op plezier, en op deugd. Die laatste — de vriendschap waarbij je het beste in elkaar naar boven haalt — is de diepste en zeldzaamste. En de mooiste."
  },
  {
    title: "De Eerste Auto 🚗",
    intro: "Meer dan honderd jaar lang was het paard het snelste vervoermiddel voor gewone mensen. En dan, in 1885, bouwt een Duitse ingenieur genaamd Karl Benz een rijtuig met een benzinemotor erop — geen paard nodig. Hij noemde het de Benz Patent-Motorwagen. Het was nauwelijks meer dan een fiets met drie wielen en een motor, maar het was de eerste echte auto.\n\nIn het begin wilde bijna niemand het ding. Het was lawaaiig, stonk, en brak voortdurend af. Paarden waren betrouwbaar, bekend, en iedereen kon ermee omgaan. Waarom zou je overstappen op zo'n onbetrouwbaar machine?\n\nTot zijn vrouw, Bertha Benz, besloot om het ding zelf te bewijzen. Zonder zijn medeweten nam ze de auto mee en reed — voor het allereerst in de geschiedenis — een lange rit van bijna 100 kilometer. Onderweg loste ze zelf de problemen op die opdoken.",
    philosophyQuestion: "De auto veranderde de wereld enorm — maar bracht hij meer goeds of meer problemen mee, denk jij?",
    deepDive: "Hoe mensen overstapten van paard-en-wagen naar ronkende motoren is eigenlijk een verhaal over het overwinnen van angst en gewoonte. De eerste auto's waren traag — 16 kilometer per uur maximaal — lawaaiig en gevaarlijk. In veel steden moesten ze voorafgegaan worden door een man te voet met een rode vlag, om mensen te waarschuwen. Echt.\n\nMaar de technologie verbeterde snel. Henry Ford bedacht in 1908 de lopende band: in plaats van één auto helemaal bouwen, werkte elke arbeider aan één klein onderdeel. Zo kon hij de Ford Model T in hoog tempo produceren en voor een lage prijs verkopen. Binnen een paar jaar had bijna elke gewone Amerikaan een auto. De wereld veranderde radicaal.\n\nMet de auto kwamen nieuwe wegen, nieuwe steden, nieuwe voorsteden. Mensen konden verder van hun werk wonen. Vakantie naar verre bestemmingen werd mogelijk. De economie groeide enorm. Maar er kwamen ook problemen: files, uitlaatgassen, verkeersongelukken, en steden die ontworpen werden rondom de auto in plaats van de mens.\n\nNu staat de auto opnieuw op een kruispunt. Elektrische auto's vervangen benzineauto's. Zelfrijdende auto's worden getest. Over twintig jaar ziet het verkeer er waarschijnlijk heel anders uit dan vandaag. Bertha Benz had geen idee wat ze in gang had gezet toen ze in 1888 in die gekke drie-wieler stapte."
  },
  {
    title: "De Chinese Muur 🏯",
    intro: "Stel je voor dat je een muur bouwt die zo lang is dat je er maanden over zou lopen. De Grote Muur van China is meer dan 21.000 kilometer lang — langer dan de afstand van de Noord- naar de Zuidpool. Hij loopt over bergen, door woestijnen, en langs rivierdalen. Het is het grootste bouwwerk dat mensen ooit hebben gemaakt.\n\nDe muur werd niet in één keer gebouwd. Verschillende Chinese keizers lieten hem in stukken optrekken, over een periode van meer dan duizend jaar. Het bekendste gedeelte, dat uit steen is opgebouwd, stamt voornamelijk uit de Ming-dynastie, zo'n 600 jaar geleden. Daarvoor bestonden er al aarden wallen op dezelfde routes.\n\nHet doel was verdediging: het buitenhouden van nomadische volkeren uit het noorden. Maar of het echt werkte?",
    philosophyQuestion: "Is het bouwen van een muur om jezelf te beschermen een teken van kracht of van angst, denk jij?",
    deepDive: "De Grote Muur van China is zo lang dat je hem vanuit de ruimte kunt zien — of toch niet? Dit is een van de hardnekkigste mythes ter wereld. Het klopt niet. De muur is wel lang, maar slechts vijf tot acht meter breed. Vanuit de ruimte — op de hoogte waarop astronauten de aarde orbiten — is hij met het blote oog vrijwel onzichtbaar. Chinese astronaut Yang Liwei bevestigde dit in 2003 na zijn vlucht: hij had de muur niet kunnen zien.\n\nDe bouw van de muur heeft een enorme menselijke prijs gehad. Honderdduizenden arbeiders, soldaten en gevangenen werkten eraan — velen stierven van uitputting, ziekte of koude. Er is een legende dat de lichamen van de doden in de muur zijn gemetseld. Dat is grotendeels mythe, maar het geeft aan hoe hard de omstandigheden waren.\n\nWerkte de muur? Deels. Het weerhield kleinere invallen, maar grote legers slaagden er meerdere keren in om erdoor te komen — via omwegen, corrupte bewakers, of simpelweg door er overheen te klimmen met ladders. De muur is nooit volledig af geweest, en veel secties werden slecht onderhouden.\n\nVandaag is de Grote Muur een van de populairste toeristische bestemmingen ter wereld. Ironisch genoeg trekt het juist buitenlanders aan in plaats van ze buiten te houden. En van de duizenden kilometers aan muur is slechts een fractie goed bewaard gebleven — de rest is vervallen, overgroeid, of opgebruikt als bouwmateriaal door boeren."
  },
  {
    title: "Dromen 💭",
    intro: "Elke nacht, als je ogen dichtgaan en je in slaap valt, begint er iets vreemds te gebeuren in je hoofd. Je geest reist naar een wereld die jijzelf maakt — een wereld met eigen regels, vreemde logica, en soms levensechte emoties. Je vliegt, rent, of staat plotseling ergens waar je nog nooit bent geweest. En als je wakker wordt, is het weg.\n\nDromen zijn al duizenden jaren een mysterie voor mensen. De oude Egyptenaren geloofden dat dromen boodschappen waren van de goden. De Grieken dachten dat dromen voorspellingen waren over de toekomst. Sigmund Freud, een beroemde psycholoog, dacht dat dromen de verborgen verlangens van het onderbewustzijn lieten zien.\n\nMaar wat zegt de moderne wetenschap? Waar gaat je geest naartoe als je ogen dichtgaan?",
    philosophyQuestion: "Als je kon kiezen welke dromen je had elke nacht — zou je dat willen, of juist niet?",
    deepDive: "Je geest gaat nergens 'naartoe' als je slaapt — maar je hersenen zijn juist heel actief. Dromen vinden voornamelijk plaats tijdens de REM-slaap: een fase waarbij je ogen snel bewegen achter je gesloten oogleden, je hartslag versnelt, en je hersenen bijna net zo actief zijn als wanneer je wakker bent. Je spieren zijn dan tijdelijk verlamd — anders zou je je dromen uitleven.\n\nWetenschappers denken dat dromen meerdere functies hebben. Eén theorie is dat het brein tijdens dromen ervaringen en gevoelens verwerkt — als een soort emotionele spijsvertering. Een nare dag verwerken door er 's nachts over te dromen. Een andere theorie is dat dromen helpen bij het opslaan van herinneringen: wat je die dag hebt geleerd, wordt 's nachts geconsolideerd.\n\nEr zijn ook lucide dromen: dromen waarbij je weet dat je droomt. Sommige mensen leren zichzelf dit, en kunnen dan bewust beslissingen nemen in hun dromen — vliegen, de omgeving veranderen, of situaties herspelen. Voor mensen die last hebben van nachtmerries kan dit een manier zijn om de controle terug te nemen.\n\nHet waarom van dromen is nog niet volledig verklaard. Waarom dromen we over mensen die we kennen, maar ook over vreemden? Waarom zijn dromen soms zo levensecht dat je wakker wordt met een gevoel dat het echt is gebeurd? En waarom vergeten mensen de meeste dromen direct na het wakker worden? Dromen blijven, ook voor wetenschappers, een beetje magisch."
  },
  {
    title: "Fossielen 🦴",
    intro: "Ergens onder je voeten, diep in de grond, kunnen botten liggen van dieren die tientallen of honderden miljoenen jaar geleden leefden. Door een bijzonder proces zijn die botten niet vergaan, maar veranderd in steen — fossielen. Ze zijn de dagboeken van de aarde, en ze vertellen ons alles over het leven dat hier ooit was.\n\nEen fossiel ontstaat pas als er aan de juiste omstandigheden is voldaan. Het dier moet snel bedekt worden na zijn dood — door zand, modder of as — zodat het niet wordt opgegeten of verrot. Dan trekt langzaam mineraalwater door de botten, vervangt de originele materialen molecuul voor molecuul, en na miljoenen jaren is het bot letterlijk steen geworden.\n\nDe meeste dieren laten nooit een fossiel na. De kans is enorm klein. Maar de fossielen die wél bewaard zijn gebleven, vertellen ons ongelooflijke verhalen.",
    philosophyQuestion: "Als jij een fossiel achterliet dat mensen over een miljoen jaar vonden — wat zou jij willen dat ze over jou te weten kwamen?",
    deepDive: "Een bot kan in een steen veranderen door een proces dat mineralisatie heet. Na de dood van een dier rotten de zachte delen weg, maar de harde botten kunnen bewaard blijven als ze snel genoeg bedekt worden door sediment — laagjes zand of modder. Grondwater sijpelt door het sediment en lost mineralen op, zoals silica of calciet. Die mineralen dringen langzaam de kleine poriën in het bot binnen en vervangen het originele materiaal. Na miljoenen jaren is het bot chemisch vervangen door steen, maar de vorm is perfect bewaard gebleven.\n\nWetenschappers die fossielen bestuderen heten paleontologen. Ze kunnen van een enkel fossiel ongelooflijk veel leren: wat het dier at (aan de tanden te zien), hoe het bewoog (aan de botten te zien), en zelfs ziektes die het had (aan de beschadigingen te zien). Sommige fossielen bevatten nog resten van zacht weefsel, huidafdrukken, of zelfs oeroud DNA.\n\nHet oudste fossiel dat we kennen is zo'n 3,7 miljard jaar oud — microscopisch kleine sporen van bacteriën in stenen in Groenland. De meest bekende fossielen zijn dinosauriërs, maar die zijn eigenlijk relatief jong: ze leefden 230 tot 66 miljoen jaar geleden. Trilobietenvarenslak-achtige zeedieren zijn al 500 miljoen jaar oud.\n\nEén van de bijzonderste ontdekkingen is die van bevroren mammoeten in Siberië — geen fossielen, maar gemummificeerde overblijfselen, soms met nog haar en vlees erop. Wetenschappers proberen nu het DNA van de mammoet te reconstrueren om het dier misschien ooit weer tot leven te wekken. De grens tussen paleontologie en science fiction wordt dunner."
  },
  {
    title: "Waarom is de lucht blauw? 🌤️",
    intro: "Kijk omhoog op een heldere dag. De lucht is blauw. Maar 's avonds, als de zon ondergaat, wordt diezelfde lucht oranje, roze en rood. En 's nachts is hij zwart. Hoe kan dezelfde lucht zoveel verschillende kleuren hebben?\n\nHet antwoord zit in het zonlicht — en in hoe dat licht reageert met de atmosfeer. Zonlicht lijkt wit, maar het is eigenlijk een mengsel van alle kleuren van de regenboog: rood, oranje, geel, groen, blauw en violet. Die kleuren zijn allemaal present, maar onzichtbaar — totdat er iets met het licht gebeurt.\n\nDat 'iets' zijn de kleine moleculen stikstof en zuurstof in de lucht om ons heen. En die doen iets bijzonders met blauw licht.",
    philosophyQuestion: "Stel dat de lucht groen was geweest — denk jij dat mensen de natuur dan anders hadden beleefd?",
    deepDive: "De lucht is blauw door een verschijnsel dat Rayleigh-verstrooiing heet. Zonlicht bestaat uit lichtgolven van verschillende lengtes — elke golflengte is een andere kleur. Blauw licht heeft een korte golflengte, rood licht een lange. Als licht door de atmosfeer reist, botsen de korte golven van blauw licht veel vaker met de kleine luchtmoleculen dan de lange golven van rood licht. Bij elke botsing wordt het blauwe licht in alle richtingen verstrooid. Uiteindelijk komt blauw licht van alle kanten van de hemel op je af — en dat zie jij als een blauwe hemel.\n\nMaar waarom is de zonsondergang dan oranje en rood? Als de zon laag aan de horizon staat, moet het licht een veel langere weg door de atmosfeer afleggen om jou te bereiken. Onderweg wordt bijna al het blauwe licht al verstrooid en verdwijnt het. Wat overblijft en jou bereikt, zijn de langere golven: oranje en rood. Vandaar de prachtige kleuren bij zonsopkomst en zonsondergang.\n\nEn waarom is de lucht op de maan zwart, ook overdag? Op de maan is er geen atmosfeer. Geen lucht, geen moleculen, geen verstrooiing. Het licht van de zon reist rechtdoor — er is niets om het te verstrooien. De hemel is dus pikzwart, zelfs als de zon schijnt. Astronauten kunnen overdag de sterren zien.\n\nOp Mars is de lucht roze-oranje, omdat er stofdeeltjes in de atmosfeer hangen die het licht op een andere manier verstrooien dan op aarde. Elke planeet met een atmosfeer heeft een eigen hemelkleur — en die kleur vertelt je iets over de samenstelling van die atmosfeer."
  },
  {
    title: "Geld 💵",
    intro: "Een briefje van vijftig euro is in wezen gewoon een stukje papier. Het kost een paar cent om te drukken. En toch kun je er eten, kleding en speelgoed mee kopen. Waarom doet iedereen alsof dat papiertje zoveel waard is?\n\nHet antwoord is vertrouwen. Geld heeft alleen waarde omdat iedereen er samen in gelooft. Als niemand meer bereid was om dat papiertje te accepteren, was het morgen niets meer waard. Dat is hoe geld werkt: het is een gezamenlijke afspraak.\n\nVóór geld ruilden mensen direct: jij geeft mij een kip, ik geef jou drie broden. Dat werkte, maar was onhandig. Wat als ik geen kip nodig heb? Geld loste dit op: een universeel ruilmiddel waar iedereen in gelooft.",
    philosophyQuestion: "Waarom hebben we afgesproken dat briefjes papier waarde hebben — en wat zou er gebeuren als iedereen tegelijk ophield dat te geloven?",
    deepDive: "We hebben afgesproken dat papieren briefjes waarde hebben omdat het praktischer is dan goud sjouwen of kippen ruilen. Maar het is wel degelijk een afspraak — en een kwetsbare. Landen hebben in de geschiedenis meerdere keren meegemaakt dat het vertrouwen in hun geld instortte. Dan drukten ze steeds meer geld, werd het minder waard, en kochten mensen liever brood dan geld hamsteren. Dat heet hyperinflatie. In Duitsland in 1923 hadden mensen kruiwagens vol geld nodig om een brood te kopen.\n\nHet systeem van geld heeft door de eeuwen heen vele vormen gehad. Vroeger waren schelpen, zout, en stenen met gaten er doorheen gewone betaalmiddelen. Goud en zilver werden populair omdat ze zeldzaam, duurzaam en deelbaar zijn. Papiergeld ontstond in China rond de negende eeuw. En nu is een groot deel van het geld in de wereld helemaal niet meer fysiek — het bestaat alleen als cijfers in een computer.\n\nBanken spelen een bijzondere rol in het geldsysteem. Als jij 100 euro op de bank zet, leent de bank dat geld grotendeels uit aan anderen — en heeft tegelijk jouw 100 euro 'staan'. Hoe kan dat? Omdat de bank erop wedt dat niet iedereen tegelijk zijn geld wil opnemen. Dat heet fractioneel reservebankieren. Het werkt — tot het niet meer werkt, en mensen in paniek massaal hun geld opnemen. Dat heet een bankrun.\n\nCryptovaluta zoals Bitcoin proberen geld te maken zonder centrale autoriteit — geen bank, geen overheid, alleen wiskundige berekeningen. Of dat de toekomst is of een experiment, is nog niet duidelijk. Maar het laat zien dat het idee van geld altijd in beweging is."
  },
  {
    title: "De Jungle 🌿",
    intro: "Er is een plek op aarde waar de regen nooit stopt, waar de lucht zo vochtig is dat je het kunt voelen plakken op je huid, en waar de bomen zo dicht op elkaar staan dat je de hemel soms niet kunt zien. Die plek heet het tropisch regenwoud — en mensen noemen het ook wel gewoon de jungle.\n\nHet Amazoneregenwoud in Zuid-Amerika is het grootste ter wereld. Het is zo groot dat Europa er bijna twee keer in past. Elke dag valt er regen, en elke dag groeit er iets nieuws. Het woud is zo vol leven dat wetenschappers schatten dat er nog miljoenen soorten dieren en planten zijn die nooit zijn ontdekt.\n\nDe kleuren zijn werkelijk overweldigend: helderblauwe vlinders zo groot als je hand, felgekleurde kikkers met giftige huid, rode en gele orchideeën die hoog in de bomen groeien. De jungle is de meest biodiverse plek op aarde.",
    philosophyQuestion: "Als je één dag in de jungle mocht leven zonder gevaar — wat zou je als eerste willen ontdekken?",
    deepDive: "In de jungle regent het inderdaad bijna altijd, maar het bijzondere is dat het regenwoud zelf ook regen maakt. De enorme hoeveelheid bomen ademen water uit — transpiratie heet dat. Die waterdamp stijgt op, vormt wolken, en valt terug als regen. Het Amazoneregenwoud maakt zo zijn eigen klimaat en reguleert zelfs het weer in gebieden ver buiten het woud.\n\nDe biodiversiteit is verbijsterend. Op één hectare Amazonewoud — een oppervlak van 100 bij 100 meter — kunnen meer boomsoorten voorkomen dan in heel Europa. In dezelfde ruimte leven honderden soorten vogels, duizenden soorten insecten, tientallen soorten reptielen. Wetenschappers ontdekken in het Amazonegebied nog steeds meerdere nieuwe soorten per week.\n\nVeel van onze medicijnen komen oorspronkelijk uit planten in het regenwoud. Aspirine is afgeleid van boomschors. Kinine, een medicijn tegen malaria, komt uit de kina-boom. En wetenschappers denken dat er nog honderden onontdekte medicijnen in het woud wachten — in planten die we nog niet hebben bestudeerd.\n\nHet trieste nieuws: het Amazoneregenwoud krimpt. Elke minuut wordt er een stuk woud ter grootte van een voetbalveld gekapt — voor landbouw, veeteelt, of houtwinning. Dat heeft gevolgen voor het klimaat van de hele aarde, want de jungle slaat enorme hoeveelheden CO2 op. Het behoud van de jungle is een van de belangrijkste milieuvraagstukken van onze tijd."
  },
  {
    title: "Tijdreizen ⏱️",
    intro: "Stel je voor dat je in een machine stapt, een jaar intikt, en je ogen opent in het verleden — of de toekomst. Je kunt dinosauriërs zien, de bouw van de piramides meemaken, of zien hoe de wereld er over duizend jaar uitziet. Tijdreizen is één van de grootste fantasieën van de mensheid.\n\nMaar is het ook mogelijk? Het antwoord is verrassender dan je misschien verwacht. Echte tijdreizen bestaan — deels. Einstein toonde aan dat tijd geen vaste maatstaf is. Hoe snel je beweegt en hoe sterk de zwaartekracht om je heen is, bepalen hoe snel de tijd voor jou gaat. Dat is geen theorie meer — het is bewezen.\n\nMaar reizen naar het verleden? Dat is een heel ander verhaal — en daar stuiten we op grote problemen.",
    philosophyQuestion: "Als je naar het verleden kon reizen en één ding kon veranderen — maar je wist niet wat de gevolgen zouden zijn — zou je het doen?",
    deepDive: "Is het echt mogelijk om naar het verleden of de toekomst te gaan? Naar de toekomst reizen: ja, in beperkte mate. Einstein bewees dat tijd langzamer gaat voor iemand die snel beweegt. Astronauten op het ISS zijn na een halfjaar in de ruimte een fractie van een seconde jonger dan ze zouden zijn als ze op aarde waren gebleven. Geen grote sprong, maar het bewijs dat tijdreizen fysisch echt is.\n\nAls je met bijna de lichtsnelheid zou reizen, zou het effect enorm worden. Stel je reist vijf jaar lang met 99% van de lichtsnelheid. Jij veroudert vijf jaar. Maar op aarde zijn er 35 jaar verstreken. Je bent als het ware vijf jaar naar de toekomst gereisd. Dit heet tijddilatatie. Het is bewezen, het werkt — maar een raket bouwen die zo snel gaat is vooralsnog onmogelijk.\n\nNaar het verleden reizen is een ander verhaal — en stuit op een fundamenteel probleem: de paradox. Stel je reist naar het verleden en voorkomt dat je ouders elkaar ontmoeten. Dan word jij nooit geboren. Dan kun je ook niet naar het verleden reizen. Dan ontmoeten je ouders elkaar wél. Dan word jij geboren... Dit soort logische lussen — paradoxen — zijn voor veel wetenschappers het bewijs dat tijdreizen naar het verleden onmogelijk is.\n\nEen andere theorie zegt: misschien als je naar het verleden reist, split de tijdlijn zich en ontstaat er een parallelle werkelijkheid. Jij verandert iets in een andere versie van het verleden, maar jouw eigen tijdlijn blijft intact. Dit zijn ideeën die nog ver buiten het bereik van de wetenschap liggen. Voor nu is tijdreizen naar de toekomst een bewezen fenomeen — en naar het verleden een geweldig verhaal."
  },
  {
    title: "Reuzeninktvissen 🦑",
    intro: "Zeelieden vertelden vroeger verhalen over een zeemonster zo groot dat het een schip kon omverslaan — ze noemden het de Kraken. Lange tijd dachten mensen dat het pure fantasie was. Tot wetenschappers de reuzeniinktvis ontdekten: een echt dier met ogen zo groot als basketballen, tentakels van tien meter lang, en een bek als een papegaai.\n\nDe reuzeninktvis — Architeuthis dux — is het grootste ongewervelde dier op aarde. Hij leeft diep in de oceaan, op plaatsen waar bijna nooit licht komt. Lange tijd was hij bijna een mythe: mensen vonden soms gewonde exemplaren op stranden, of resten in de magen van potvis walvissen. Maar levende exemplaren zien? Dat lukte lang niet.\n\nPas in 2004 maakten Japanse wetenschappers voor het allereerst foto's van een levende reuzeninktvis in zijn natuurlijke omgeving, op 900 meter diepte. Het was een historisch moment.",
    philosophyQuestion: "We weten meer over de oppervlakte van de maan dan over de diepzee — wat zegt dat over wat mensen belangrijk vinden?",
    deepDive: "Het mysterie van de reuzeninktvis is dat we er eigenlijk nog steeds weinig van weten. We weten dat hij bestaat — we hebben exemplaren gevonden, gefotografeerd en zelfs gefilmd. Maar hoe hij leeft, hoe hij jaagt, hoe hij zich voortplant — dat is grotendeels onbekend. Ze leven zo diep en zijn zo zeldzaam dat observatie enorm moeilijk is.\n\nHun ogen zijn het grootst van elk dier op aarde: tot 30 centimeter in doorsnede, zo groot als een grote pizza. Dat is geen toeval — op de dieptes waar ze leven, is vrijwel geen licht. Grote ogen vangen elk spoortje licht op. Ze kunnen waarschijnlijk zelfs de bioluminescentie — het eigen licht — van andere dieren waarnemen in de volslagen duisternis.\n\nDe reuzeninktvis heeft een aartsvijand: de potvis. In de magen van potvissen worden regelmatig resten van reuzeninktvis gevonden — en op de huid van potvissen zitten de littekens van de zuignappen van de inktvis, zo groot als borden. Dit zijn resten van gevechten op onvoorstelbare diepten, duizenden meters onder het oppervlak. Twee enorme dieren die om het leven vechten, zonder dat een mens het ooit heeft gezien.\n\nEr is ook een nog grotere soort ontdekt: de kolossale inktvis (Mesonychoteuthis hamiltoni), gevonden in de Zuidpoolzee. Hij kan zwaarder worden dan de reuzeninktvis, met ogen nog groter. Zijn tentakels hebben rotatiezuignappen met haken erop — alsof de natuur op het diepste punt van de oceaan zijn meest extreme ontwerpen bewaart."
  },
  {
    title: "Het ISS 🚀",
    intro: "Op dit moment, terwijl je dit leest, racet er op zo'n 400 kilometer boven je hoofd een huis door de ruimte. Het heet het Internationale Ruimtestation — ISS — en het is het grootste object dat mensen ooit in de ruimte hebben gebracht. Het is zo groot als een voetbalveld, weegt meer dan 400.000 kilogram, en reist met een snelheid van 28.000 kilometer per uur.\n\nDat is zo snel dat het ISS elke 90 minuten één keer rondom de aarde raast. De mensen aan boord zien daardoor zestien zonsopkomsten en zestien zonsondergangen per dag. Elke keer als je omhoog kijkt op de juiste plek en het juiste moment, kun je het zien als een heldere bewegende ster.\n\nAl meer dan twintig jaar is er onafgebroken een bemanning aan boord. Astronauten van Amerika, Rusland, Europa, Japan en Canada werken er samen — ook in tijden dat hun landen politieke problemen hebben.",
    philosophyQuestion: "Als jij zes maanden op het ISS moest leven, ver van iedereen die je kent — wat zou je het meest missen?",
    deepDive: "Het ISS raast inderdaad met 28.000 kilometer per uur rond de aarde — dat is zo snel dat het gewoon in een baan blijft cirkelen zonder verder weg te vliegen of terug te vallen. De zwaartekracht trekt het omlaag, maar de snelheid gooit het continu opzij. Die twee krachten houden het in een perfecte baan. Dat noemen we vrije val — de astronauten vallen continu, maar vallen ook continu naast de aarde mis.\n\nLeven op het ISS is indrukwekkend maar ook zwaar. Alles zweeft: water, kruimels, gereedschap. Als je drinkt, gebruik je een zakje met een rietje, anders drijven de druppels weg. Slapen doe je in een kleine cabine vastgebonden aan de muur. Sporten is verplicht — minstens twee uur per dag — omdat spieren en botten in gewichtloosheid snel verzwakken.\n\nHet ISS is ook een laboratorium. Wetenschappers doen er experimenten die op aarde onmogelijk zijn: hoe groeit een vlam in gewichtloosheid, hoe gedragen vloeistoffen zich zonder zwaartekracht, hoe reageert het menselijk lichaam op lange ruimtereizen. Die kennis is nodig voor toekomstige missies naar Mars.\n\nHet station is gebouwd door vijftien landen samen en werd in 1998 begonnen te bouwen. Het kostte meer dan 150 miljard dollar — het duurste bouwproject in de menselijke geschiedenis. Na 2030 wil NASA het gecontroleerd laten neerstorten in de oceaan. Maar de erfenis ervan — de kennis, de samenwerking, de beelden van de aarde vanuit de ruimte — blijft voor altijd."
  }
];

/* ── Category themes ────────────────────────────────────────────
   bg: background color of the content screen
   accent: used for category label + CSS variable
──────────────────────────────────────────────────────────────── */
const THEMES = {
  ruimte:       { bg: '#06061a', accent: '#7c6fff', label: '🚀 Ruimte'       },
  natuur:       { bg: '#061406', accent: '#4caf50', label: '🦕 Natuur'       },
  geschiedenis: { bg: '#1a0e00', accent: '#d4874a', label: '🏛️ Geschiedenis' },
  wetenschap:   { bg: '#001a1a', accent: '#00bcd4', label: '🔬 Wetenschap'   },
  wereld:       { bg: '#00101a', accent: '#42a5f5', label: '🌍 Wereld'       },
  technologie:  { bg: '#0e0020', accent: '#ab47bc', label: '💡 Technologie'  },
  menselijk:    { bg: '#1a0000', accent: '#ef5350', label: '🧠 Menselijk'    },
};

/* ── Wonder metadata: category + Unsplash photo ID ─────────────
   Volgorde komt overeen met wonderLibrary (index 0–37)
──────────────────────────────────────────────────────────────── */
const WONDER_META = [
  { category: 'ruimte',       emoji: '🌕', wiki: 'Apollo_11'                      }, // 1  Maanlanding
  { category: 'geschiedenis', emoji: '🕊️', wiki: 'World_War_II'                   }, // 2  WWII
  { category: 'wereld',       emoji: '💰', wiki: 'Elon_Musk'                       }, // 3  Rijkste persoon
  { category: 'wetenschap',   emoji: '🕳️', wiki: 'Kola_Superdeep_Borehole'        }, // 4  Diepste gat
  { category: 'wereld',       emoji: '🇪🇺', wiki: 'European_Union'                 }, // 5  Europeaan
  { category: 'geschiedenis', emoji: '🪙', wiki: 'Dutch_guilder'                   }, // 6  Gulden
  { category: 'wetenschap',   emoji: '🔬', wiki: 'Marie_Curie'                     }, // 7  Wetenschapper
  { category: 'technologie',  emoji: '⚡', wiki: 'Pikachu'                         }, // 8  Pokémon
  { category: 'natuur',       emoji: '🦖', wiki: 'Tyrannosaurus'                   }, // 9  T-Rex
  { category: 'ruimte',       emoji: '🌌', wiki: 'Black_hole'                      }, // 10 Zwarte gaten
  { category: 'geschiedenis', emoji: '🔺', wiki: 'Great_Pyramid_of_Giza'           }, // 11 Piramides
  { category: 'natuur',       emoji: '🐋', wiki: 'Blue_whale'                      }, // 12 Blauwe vinvis
  { category: 'wetenschap',   emoji: '🌋', wiki: 'Volcano'                         }, // 13 Vulkanen
  { category: 'technologie',  emoji: '🧱', wiki: 'Lego'                            }, // 14 Lego
  { category: 'geschiedenis', emoji: '🏰', wiki: 'Knight'                          }, // 15 Ridders en kastelen
  { category: 'technologie',  emoji: '🌐', wiki: 'Internet'                        }, // 16 Internet
  { category: 'natuur',       emoji: '🌊', wiki: 'Mariana_Trench'                  }, // 17 Marianentrog
  { category: 'ruimte',       emoji: '🔴', wiki: 'Mars'                            }, // 18 Mars
  { category: 'menselijk',    emoji: '🧠', wiki: 'Human_brain'                     }, // 19 Brein
  { category: 'natuur',       emoji: '🐝', wiki: 'Honey_bee'                       }, // 20 Bijen
  { category: 'wereld',       emoji: '❄️', wiki: 'Arctic'                          }, // 21 Noordpool
  { category: 'technologie',  emoji: '🤖', wiki: 'Robot'                           }, // 22 Robots
  { category: 'technologie',  emoji: '✈️', wiki: 'Airplane'                        }, // 23 Vliegtuigen
  { category: 'wereld',       emoji: '💎', wiki: 'Diamond'                         }, // 24 Goud en diamanten
  { category: 'geschiedenis', emoji: '🏛️', wiki: 'Ancient_Rome'                   }, // 25 Romeinen
  { category: 'wetenschap',   emoji: '🌩️', wiki: 'Lightning'                      }, // 26 Bliksem en donder
  { category: 'natuur',       emoji: '🐜', wiki: 'Ant'                             }, // 27 Mieren
  { category: 'menselijk',    emoji: '🤝', wiki: 'Friendship'                      }, // 28 Vriendschap
  { category: 'geschiedenis', emoji: '🚗', wiki: 'Benz_Patent-Motorwagen'          }, // 29 Eerste auto
  { category: 'geschiedenis', emoji: '🏯', wiki: 'Great_Wall_of_China'             }, // 30 Chinese muur
  { category: 'menselijk',    emoji: '💭', wiki: 'Dream'                           }, // 31 Dromen
  { category: 'natuur',       emoji: '🦴', wiki: 'Fossil'                          }, // 32 Fossielen
  { category: 'wetenschap',   emoji: '🌤️', wiki: 'Rayleigh_scattering'            }, // 33 Lucht blauw
  { category: 'wereld',       emoji: '💵', wiki: 'Money'                           }, // 34 Geld
  { category: 'natuur',       emoji: '🌿', wiki: 'Amazon_rainforest'               }, // 35 Jungle
  { category: 'wetenschap',   emoji: '⏱️', wiki: 'Time_travel'                    }, // 36 Tijdreizen
  { category: 'natuur',       emoji: '🦑', wiki: 'Giant_squid'                     }, // 37 Reuzeninktvissen
  { category: 'ruimte',       emoji: '🚀', wiki: 'International_Space_Station'     }, // 38 ISS
];

/* ── Badges ─────────────────────────────────────────────────────
   check(seenCount, favCount) → boolean
──────────────────────────────────────────────────────────────── */
const BADGES = [
  { id: 'first',    icon: '⭐', name: 'Eerste Stap',          desc: 'Je eerste wonder ontdekt!',  check: (s)    => s >= 1  },
  { id: 'explorer', icon: '🌟', name: 'Echte Ontdekker',      desc: '10 wonderen ontdekt!',       check: (s)    => s >= 10 },
  { id: 'expert',   icon: '🏆', name: 'Wonder-Expert',        desc: '25 wonderen ontdekt!',       check: (s)    => s >= 25 },
  { id: 'master',   icon: '👑', name: 'Meester der Wonderen', desc: 'Alle 38 wonderen ontdekt!',  check: (s)    => s >= 38 },
  { id: 'fav1',     icon: '❤️', name: 'Eerste Favoriet',      desc: 'Je eerste wonder bewaard!',  check: (s, f) => f >= 1  },
  { id: 'fav5',     icon: '💝', name: 'Favorietenspaarder',   desc: '5 favorieten verzameld!',    check: (s, f) => f >= 5  },
];

/* ── Storage keys ──────────────────────────────────────────────
──────────────────────────────────────────────────────────────── */
const KEY_INDEX  = 'james_wonder_index';
const KEY_NAME   = 'james_name';
const KEY_SEEN   = 'james_seen';
const KEY_FAVS   = 'james_favorites';
const KEY_BADGES = 'james_badges';

/* ── State ─────────────────────────────────────────────────────
──────────────────────────────────────────────────────────────── */
let currentWonder      = null;
let currentWonderIndex = 0;

/* ── Storage helpers ───────────────────────────────────────────
──────────────────────────────────────────────────────────────── */
function loadNextIndex() {
  const saved = parseInt(localStorage.getItem(KEY_INDEX) || '0', 10);
  return isNaN(saved) ? 0 : saved % wonderLibrary.length;
}
function saveIndex(i)  { localStorage.setItem(KEY_INDEX, String(i)); }

function getName()     { return localStorage.getItem(KEY_NAME) || ''; }
function saveName(n)   { localStorage.setItem(KEY_NAME, n.trim()); }

function getSeen()     { return JSON.parse(localStorage.getItem(KEY_SEEN)  || '[]'); }
function markSeen(i)   {
  const s = getSeen();
  if (!s.includes(i)) { s.push(i); localStorage.setItem(KEY_SEEN, JSON.stringify(s)); }
}

function getFavs()     { return JSON.parse(localStorage.getItem(KEY_FAVS)  || '[]'); }
function toggleFav(i)  {
  const f = getFavs();
  const pos = f.indexOf(i);
  if (pos === -1) f.push(i); else f.splice(pos, 1);
  localStorage.setItem(KEY_FAVS, JSON.stringify(f));
}
function isFav(i)      { return getFavs().includes(i); }

/* ── DOM References ────────────────────────────────────────────
──────────────────────────────────────────────────────────────── */
const screenName       = document.getElementById('screen-name');
const screenHome       = document.getElementById('screen-home');
const screenTransition = document.getElementById('screen-transition');
const screenContent    = document.getElementById('screen-content');
const screenFavorites  = document.getElementById('screen-favorites');

const nameInput        = document.getElementById('name-input');
const btnNameSubmit    = document.getElementById('btn-name-submit');
const homeGreeting     = document.getElementById('home-greeting');
const homeProgress     = document.getElementById('home-progress');
const btnSettings      = document.getElementById('btn-settings');
const btnShowFavorites = document.getElementById('btn-show-favorites');
const favoritesList    = document.getElementById('favorites-list');
const btnFavoritesBack = document.getElementById('btn-favorites-back');

const btnWonder        = document.getElementById('btn-wonder');
const canvas           = document.getElementById('canvas-particles');
const zoomOverlay      = document.getElementById('zoom-overlay');
const phase1El         = document.getElementById('phase-1');
const phase2El         = document.getElementById('phase-2');
const phase3El         = document.getElementById('phase-3');
const contentTitle     = document.getElementById('content-title');
const contentIntro     = document.getElementById('content-intro');
const contentPhilosophy= document.getElementById('content-philosophy');
const contentDeepdive  = document.getElementById('content-deepdive');
const btnFavorite      = document.getElementById('btn-favorite');
const btnLeesveder     = document.getElementById('btn-lees-verder');
const btnOpnieuw       = document.getElementById('btn-opnieuw');

const wonderHero        = document.getElementById('wonder-hero');
const categoryLabel     = document.getElementById('category-label');
const homeProgressBar   = document.getElementById('home-progress-bar');
const flashOverlay      = document.getElementById('flash-overlay');
const canvasBg          = document.getElementById('canvas-bg');
const badgeOverlay     = document.getElementById('badge-overlay');
const badgeIcon        = document.getElementById('badge-icon');
const badgeName        = document.getElementById('badge-name');
const badgeDesc        = document.getElementById('badge-desc');
const btnBadgeOk       = document.getElementById('btn-badge-ok');

/* ── Starfield background canvas ───────────────────────────── */
(function initStarfield() {
  const ctx = canvasBg.getContext('2d');
  let W, H, stars, shooters;

  function resize() {
    W = canvasBg.width  = window.innerWidth;
    H = canvasBg.height = window.innerHeight;
  }

  function mkStars() {
    stars = Array.from({ length: 110 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.4 + 0.3,
      a: Math.random(),
      da: (Math.random() - 0.5) * 0.008,
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,
    }));
    shooters = [];
  }

  function mkShooter() {
    return {
      x: Math.random() * W,
      y: Math.random() * H * 0.5,
      vx: 6 + Math.random() * 6,
      vy: 2 + Math.random() * 3,
      len: 80 + Math.random() * 80,
      a: 1,
    };
  }

  resize();
  mkStars();
  window.addEventListener('resize', () => { resize(); mkStars(); });

  let frame = 0;
  function draw() {
    requestAnimationFrame(draw);
    ctx.clearRect(0, 0, W, H);

    // Stars
    stars.forEach(s => {
      s.x  = (s.x + s.vx + W) % W;
      s.y  = (s.y + s.vy + H) % H;
      s.a  = Math.max(0.05, Math.min(1, s.a + s.da));
      if (s.a <= 0.05 || s.a >= 1) s.da *= -1;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${s.a.toFixed(2)})`;
      ctx.fill();
    });

    // Shooting stars
    if (frame % 210 === 0 && Math.random() < 0.6) shooters.push(mkShooter());
    shooters = shooters.filter(s => s.a > 0.02);
    shooters.forEach(s => {
      ctx.save();
      const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.len, s.y - s.len * 0.4);
      grad.addColorStop(0, `rgba(255,255,255,${s.a.toFixed(2)})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.len, s.y - s.len * 0.4);
      ctx.stroke();
      ctx.restore();
      s.x += s.vx; s.y += s.vy; s.a -= 0.03;
    });

    frame++;
  }
  draw();
})();

/* ── Screen flash ──────────────────────────────────────────── */
function flashScreen() {
  flashOverlay.classList.add('active');
  setTimeout(() => flashOverlay.classList.remove('active'), 80);
}

/* ── Utility: render multi-paragraph text ──────────────────── */
function renderParagraphs(containerEl, text) {
  containerEl.innerHTML = text
    .split('\n\n')
    .filter(p => p.trim().length > 0)
    .map(p => `<p>${p.trim()}</p>`)
    .join('');
}

/* ── Wikipedia thumbnail loader (with localStorage cache) ──── */
async function loadWikiThumb(wikiTitle) {
  const key    = 'james_wiki_' + wikiTitle;
  const cached = localStorage.getItem(key);
  if (cached) return cached;
  try {
    const url  = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&pithumbsize=700&titles=${encodeURIComponent(wikiTitle)}&origin=*`;
    const res  = await fetch(url);
    const data = await res.json();
    const page = Object.values(data.query.pages)[0];
    const src  = page.thumbnail?.source || null;
    if (src) localStorage.setItem(key, src);
    return src;
  } catch { return null; }
}

/* ── Apply per-category colour theme ───────────────────────── */
function applyTheme(category) {
  const theme = THEMES[category] || THEMES.wetenschap;
  document.documentElement.style.setProperty('--theme-bg',     theme.bg);
  document.documentElement.style.setProperty('--theme-accent', theme.accent);
}

/* ── Badge helpers ──────────────────────────────────────────── */
function getEarnedBadgeIds() {
  return JSON.parse(localStorage.getItem(KEY_BADGES) || '[]');
}

let badgeQueue = [];

function checkAndAwardBadges() {
  const seenCount = getSeen().length;
  const favCount  = getFavs().length;
  const earned    = getEarnedBadgeIds();
  const fresh     = [];

  BADGES.forEach(b => {
    if (!earned.includes(b.id) && b.check(seenCount, favCount)) {
      earned.push(b.id);
      fresh.push(b);
    }
  });

  if (fresh.length > 0) {
    localStorage.setItem(KEY_BADGES, JSON.stringify(earned));
    badgeQueue = badgeQueue.concat(fresh);
    if (badgeQueue.length === fresh.length) showNextBadge();
  }
}

function showNextBadge() {
  if (badgeQueue.length === 0) return;
  const b = badgeQueue[0];
  badgeIcon.textContent = b.icon;
  badgeName.textContent = b.name;
  badgeDesc.textContent = b.desc;
  badgeOverlay.classList.remove('hidden');
  playSound('fanfare');
}

/* ── Web Audio sound effects ────────────────────────────────── */
function playSound(type) {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    if (type === 'whoosh') {
      const osc = ctx.createOscillator();
      osc.connect(gain);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'pling') {
      const osc = ctx.createOscillator();
      osc.connect(gain);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(); osc.stop(ctx.currentTime + 0.5);
    } else if (type === 'fanfare') {
      [523, 659, 784, 1047].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g   = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
        g.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.1 + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.45);
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.5);
      });
    }
  } catch (e) { /* audio not available */ }
}

/* ── Utility: show / hide screens ──────────────────────────── */
function showScreen(el) {
  [screenName, screenHome, screenTransition, screenContent, screenFavorites].forEach(s => {
    s.classList.remove('active');
  });
  el.classList.add('active');
}

/* ── Update home screen with personalized info ─────────────── */
function updateHomeScreen() {
  const name = getName();
  homeGreeting.textContent = name ? `Hé ${name}! 👋` : 'Hé! 👋';

  const seen    = getSeen();
  const total   = wonderLibrary.length;
  const pct     = seen.length > 0 ? (seen.length / total) * 100 : 0;

  homeProgress.textContent = seen.length > 0
    ? `Je hebt al ${seen.length} van de ${total} wonderen ontdekt! 🎉`
    : '';
  homeProgressBar.style.width = `${pct}%`;

  btnShowFavorites.classList.toggle('hidden', getFavs().length === 0);
}

/* ── Show favorites screen ─────────────────────────────────── */
function showFavoritesScreen() {
  const favs = getFavs();
  favoritesList.innerHTML = favs.map(i => {
    const w = wonderLibrary[i];
    return `<button class="fav-item" data-index="${i}">${w.title}</button>`;
  }).join('');
  favoritesList.querySelectorAll('.fav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      launchWonder(parseInt(btn.dataset.index, 10));
    });
  });
  showScreen(screenFavorites);
}

/* ── Launch a specific wonder (from favorites or normal flow) ─ */
function launchWonder(specificIndex) {
  const index = specificIndex !== undefined ? specificIndex : loadNextIndex();
  currentWonderIndex = index;
  currentWonder = wonderLibrary[index];
  if (specificIndex === undefined) saveIndex((index + 1) % wonderLibrary.length);
  markSeen(index);
  checkAndAwardBadges();
  playSound('whoosh');
  showScreen(screenTransition);
  runParticleExplosion(700, () => {
    zoomOverlay.classList.add('zooming');
    zoomOverlay.addEventListener('animationend', () => {
      zoomOverlay.classList.remove('zooming');
      showPhase1();
    }, { once: true });
  });
}

/* ── Utility: animate a phase in ──────────────────────────── */
function enterPhase(el) {
  el.classList.remove('hidden');
  el.classList.add('entering');
  el.addEventListener('animationend', () => el.classList.remove('entering'), { once: true });
}

/* ── Utility: button tactile shake ────────────────────────── */
function shakeButton(btn) {
  btn.classList.remove('btn-shake');
  // Force reflow so the class removal is applied before re-adding
  void btn.offsetWidth;
  btn.classList.add('btn-shake');
  btn.addEventListener('animationend', () => btn.classList.remove('btn-shake'), { once: true });
}

/* ── Pick a Wonder (kept for compatibility, now via launchWonder) */
function selectWonder() { /* intentionally empty — see launchWonder */ }

/* ── Canvas Particle Explosion ─────────────────────────────── */
function runParticleExplosion(durationMs, onComplete) {
  const ctx = canvas.getContext('2d');
  canvas.width  = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  const cx     = canvas.width  / 2;
  const cy     = canvas.height / 2;
  const start  = performance.now();
  const colors = [
    '#ff4444', '#ff6b00', '#ffcc00', '#ffffff',
    '#ff2222', '#ffaaaa', '#ff88ff', '#88ccff', '#aaffaa',
  ];

  const particles = Array.from({ length: 160 }, (_, i) => {
    const angle  = Math.random() * Math.PI * 2;
    const speed  = 2 + Math.random() * 13;
    const isStar = i < 20; // first 20 are star-shaped
    return {
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: isStar ? 4 + Math.random() * 5 : 1.5 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      decay: 0.009 + Math.random() * 0.016,
      isStar,
      rot: Math.random() * Math.PI,
      rotV: (Math.random() - 0.5) * 0.2,
    };
  });

  function drawStar(ctx, x, y, r, rot) {
    const spikes = 5;
    const inner  = r * 0.4;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const a   = rot + (i * Math.PI) / spikes;
      const len = i % 2 === 0 ? r : inner;
      i === 0 ? ctx.moveTo(x + Math.cos(a) * len, y + Math.sin(a) * len)
              : ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    }
    ctx.closePath();
    ctx.fill();
  }

  function frame(now) {
    const progress = Math.min((now - start) / durationMs, 1);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += 0.14;
      p.vx *= 0.99;
      p.rot += p.rotV;
      p.alpha = Math.max(0, p.alpha - p.decay);

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle   = p.color;

      if (p.isStar) {
        drawStar(ctx, p.x, p.y, p.radius, p.rot);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.globalAlpha = 1;

    if (progress < 1) requestAnimationFrame(frame);
    else { ctx.clearRect(0, 0, canvas.width, canvas.height); onComplete(); }
  }

  requestAnimationFrame(frame);
}

/* ── Main Flow: Button Click → Transition ──────────────────── */
function startTransition() {
  btnWonder.classList.add('pressed');
  flashScreen();
  setTimeout(() => btnWonder.classList.remove('pressed'), 180);
  launchWonder();
}

/* ── Phase 1: Title + Intro ────────────────────────────────── */
function showPhase1() {
  const meta = WONDER_META[currentWonderIndex];

  // Reset photo state, show emoji immediately as placeholder
  wonderHero.classList.remove('has-photo');
  wonderHero.style.backgroundImage    = '';
  wonderHero.style.backgroundSize     = '';
  wonderHero.style.backgroundPosition = '';

  if (meta) {
    applyTheme(meta.category);
    const theme = THEMES[meta.category] || THEMES.wetenschap;
    categoryLabel.textContent = theme.label;
    categoryLabel.style.color = theme.accent;
    wonderHero.innerHTML      = `<span class="hero-emoji">${meta.emoji}</span>`;

    // Asynchronously load the Wikipedia photo
    if (meta.wiki) {
      loadWikiThumb(meta.wiki).then(src => {
        if (!src) return;
        const img  = new Image();
        img.onload = () => {
          wonderHero.style.backgroundImage    = `url(${src})`;
          wonderHero.style.backgroundSize     = 'cover';
          wonderHero.style.backgroundPosition = 'center';
          wonderHero.innerHTML = '';
          wonderHero.classList.add('has-photo');
        };
        img.src = src;
      });
    }
  } else {
    categoryLabel.textContent = '';
    wonderHero.innerHTML      = '<span class="hero-emoji">✨</span>';
  }

  contentTitle.textContent      = currentWonder.title;
  contentPhilosophy.textContent = currentWonder.philosophyQuestion;
  renderParagraphs(contentIntro,    currentWonder.intro);
  renderParagraphs(contentDeepdive, currentWonder.deepDive);
  updateFavoriteButton();

  phase1El.classList.add('hidden');
  phase2El.classList.add('hidden');
  phase3El.classList.add('hidden');

  showScreen(screenContent);

  setTimeout(() => {
    enterPhase(phase1El);
    setTimeout(showPhase2, 2800);
  }, 200);
}

/* ── Update the heart button state ─────────────────────────── */
function updateFavoriteButton() {
  const fav = isFav(currentWonderIndex);
  btnFavorite.textContent = fav ? '❤️ Favoriet!' : '♡ Bewaar als favoriet';
  btnFavorite.classList.toggle('is-favorite', fav);
}

/* ── Phase 2: Philosophy Question ──────────────────────────── */
function showPhase2() {
  enterPhase(phase2El);
  shakeButton(btnLeesveder);
}

/* ── Phase 3: Deep Dive ────────────────────────────────────── */
function showPhase3() {
  shakeButton(btnLeesveder);
  // Brief delay for the shake to complete before hiding the button
  setTimeout(() => {
    enterPhase(phase3El);
    // Scroll smoothly to the new content
    phase3El.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 200);
}

/* ── Reset to Home ─────────────────────────────────────────── */
function resetToHome() {
  shakeButton(btnOpnieuw);
  setTimeout(() => {
    updateHomeScreen();
    showScreen(screenHome);
    document.querySelector('.content-scroll').scrollTop = 0;
  }, 200);
}

/* ── Name screen: submit ───────────────────────────────────── */
function submitName() {
  const val = nameInput.value.trim();
  if (!val) return;
  saveName(val);
  updateHomeScreen();
  showScreen(screenHome);
}

/* ── Event Listeners ───────────────────────────────────────── */
btnWonder.addEventListener('click', startTransition);
btnLeesveder.addEventListener('click', showPhase3);
btnOpnieuw.addEventListener('click', resetToHome);

btnFavorite.addEventListener('click', () => {
  toggleFav(currentWonderIndex);
  updateFavoriteButton();
  updateHomeScreen();
  checkAndAwardBadges();
  playSound('pling');
});

btnBadgeOk.addEventListener('click', () => {
  badgeOverlay.classList.add('hidden');
  badgeQueue.shift();
  if (badgeQueue.length > 0) showNextBadge();
});

btnNameSubmit.addEventListener('click', submitName);
nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitName(); });

btnSettings.addEventListener('click', () => {
  nameInput.value = getName();
  showScreen(screenName);
});

btnShowFavorites.addEventListener('click', showFavoritesScreen);
btnFavoritesBack.addEventListener('click', () => {
  updateHomeScreen();
  showScreen(screenHome);
});

/* ── Initial State ─────────────────────────────────────────── */
if (!getName()) {
  showScreen(screenName);
} else {
  updateHomeScreen();
  showScreen(screenHome);
}
