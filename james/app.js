/* ═══════════════════════════════════════════════════════════════
   James' Wonder-App — Immersive Experience
   Vanilla JS · Canvas 2D starfield · GSAP animations
   No external JS dependencies beyond GSAP (loaded via CDN).
═══════════════════════════════════════════════════════════════ */
'use strict';

/* ─── Config ────────────────────────────────────────────── */
const CATEGORY_INFO = {
  space:      { emoji: '🚀', label: 'Ruimte' },
  animals:    { emoji: '🦁', label: 'Dieren' },
  history:    { emoji: '📜', label: 'Geschiedenis' },
  science:    { emoji: '🔬', label: 'Wetenschap' },
  technology: { emoji: '💡', label: 'Technologie' },
  nature:     { emoji: '🌿', label: 'Natuur' },
};

const CFG = {
  STAR_COUNT:      200,   // ambient starfield particles
  BURST_COUNT:     90,    // transition burst particles
  BURST_DURATION:  700,   // ms
  PHASE_1_DELAY:   150,   // ms after screen show
  PHASE_2_DELAY:   2800,  // ms after phase 1 (reading time)
};

/* ─── Wonder Library ────────────────────────────────────── */
const WONDERS = [
  {
    category: 'space',
    emoji: '🌕',
    label: 'Ruimte',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Aldrin_Apollo_11_original.jpg/600px-Aldrin_Apollo_11_original.jpg',
    title: 'De Maanlanding',
    intro: 'Op 20 juli 1969 zette een mens voor het eerst voet op de maan. Dat was Neil Armstrong. Hij deed één kleine stap — maar het was een reuzenstap voor alle mensen op aarde. Miljoenen mensen keken live op televisie toe. Iedereen was stil van spanning. Zou het lukken? Zouden ze veilig landen? En daarna: zouden ze ook weer terug kunnen komen? Het antwoord op al die vragen was ja. De lancering was eerder die maand geweest, op 16 juli 1969. Het ruimteschip heette Apollo 11, en er zaten drie mannen in: Neil Armstrong, Buzz Aldrin en Michael Collins. Collins bleef in de ruimtecapsule cirkelen om de maan, terwijl Armstrong en Aldrin in een kleiner landingsvoertuig afdaalden. Dat voertuig heette de Eagle — de Adelaar. Toen ze bijna landden, begon er een alarm te piepen. Niemand wist precies wat er mis was. De vluchtleiders op aarde beslisten in een paar tellen: doorgaan. En het ging goed.',
    question: 'Als jij op de maan mocht staan en naar de aarde keek — wat zou je dan denken?',
    deepdive: 'De reis naar de maan duurde vier dagen. De astronauten hadden niet eens een computer zo krachtig als jouw telefoon — en toch kwamen ze veilig terug. Er liepen maar 12 mensen op de maan. Nog niemand is er daarna naartoe gegaan. De eerste woorden op de maan waren: "De Adelaar is geland." Wat veel mensen niet weten: er staat een plaquette op de maan met de tekst "Hier kwamen mensen van de planeet Aarde voor het eerst voet op de Maan, juli 1969 na Chr. Wij kwamen in vrede voor alle mensen." De astronauten plantten ook een Amerikaanse vlag, maar die stond door de motorwind van de landing scheef. Op de maan is er geen wind, geen regen en geen erosie. De voetafdrukken van Armstrong en Aldrin liggen er vandaag de dag nog steeds, precies zoals ze ze achterlieten. Ze zullen er misschien miljoenen jaren blijven liggen.',
    quiz: { question: 'Hoeveel mensen liepen er ooit op de maan?', answers: [{ text: '12 mensen', correct: true }, { text: '3 mensen' }, { text: '50 mensen' }] },
  },
  {
    category: 'history',
    emoji: '🕊️',
    label: 'Geschiedenis',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Anne_Frank_House_2013_%281%29.jpg/600px-Anne_Frank_House_2013_%281%29.jpg',
    title: 'De Tweede Wereldoorlog',
    intro: 'Tussen 1940 en 1945 was Nederland bezet door een land dat Duitsland heette. Mensen mochten niet meer vrij zijn. Joden, mensen met een handicap en anderen werden opgepakt en weggevoerd. Heel veel mensen zijn in die tijd gestorven — meer dan zes miljoen Joodse mensen alleen al. Op 10 mei 1940 vielen de Duitse soldaten Nederland binnen. Na vijf dagen moest Nederland zich overgeven. Daarna begon een periode van vijf jaar bezetting. De Duitsers maakten allerlei strenge regels. Joodse mensen moesten een gele ster dragen. Ze mochten niet meer naar school, niet meer naar de bioscoop, en ook niet meer op de fiets. Mensen die zich verzetten, riskeerden hun leven. Toch waren er veel Nederlanders die hielpen — door Joodse gezinnen te verstoppen, nep-papieren te maken of informatie door te geven aan de geallieerden. Die mensen noemden we de verzetsstrijders.',
    question: 'Waarom denk jij dat het zo belangrijk is dat mensen vrijheid hebben?',
    deepdive: 'In Amsterdam verstopte een meisje van 13 jaar, Anne Frank, zich met haar familie twee jaar lang in een geheim huis achter een boekenkast. Ze schreef alles op in een dagboek. Dat dagboek kun je nu nog lezen. Op 5 mei 1945 was Nederland eindelijk vrij — dat vieren we elk jaar op Bevrijdingsdag. Anne Frank werd helaas ontdekt en stierf in een concentratiekamp. Haar dagboek overleefde wel, bewaard door haar vader Otto Frank, de enige van het gezin die de oorlog overleefde. Het dagboek is vertaald in meer dan 70 talen en is een van de meest gelezen boeken ter wereld. In Nederland staan veel monumenten om de slachtoffers te herdenken. Op 4 mei, de dag vóór Bevrijdingsdag, is er een nationale herdenking. Om 20:00 uur stopt heel Nederland met wat het doet — twee minuten stilte voor alle mensen die zijn gestorven.',
    quiz: { question: 'Op welke dag werd Nederland bevrijd van de bezetting?', answers: [{ text: '5 mei 1945', correct: true }, { text: '8 mei 1940' }, { text: '1 september 1939' }] },
  },
  {
    category: 'history',
    emoji: '💰',
    label: 'Economie',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Elon_Musk_Royal_Society_%28crop2%29.jpg/600px-Elon_Musk_Royal_Society_%28crop2%29.jpg',
    title: 'De Rijkste Persoon Ter Wereld',
    intro: 'Sommige mensen hebben zo veel geld dat je het bijna niet kunt tellen. De rijkste mensen ter wereld hebben meer geld dan hele landen. Maar hoe word je eigenlijk zo rijk? Bijna altijd begint het met een idee. Een simpel idee, vaak in een garage of een slaapkamer, dat uitgroeit tot iets gigantisch. Jeff Bezos begon in 1994 met verkopen van boeken via het internet vanuit zijn garage in Seattle. Niemand dacht dat het iets zou worden. Nu is Amazon het grootste online winkelplatform ter wereld, met meer dan 300 miljoen klanten. Elon Musk begon met een bedrijf dat online betalingen makkelijker maakte — dat werd later PayPal. Met het geld dat hij daarmee verdiende, startte hij Tesla (elektrische auto\'s) én SpaceX (raketten). Hij droomt ervan om mensen naar Mars te sturen. Mark Zuckerberg maakte op zijn zolderkamer een website voor zijn universiteit om vrienden te verbinden. Dat werd Facebook, nu Meta, met bijna drie miljard gebruikers.',
    question: 'Wat zou jij doen als je meer geld had dan je ooit kon uitgeven?',
    deepdive: 'Elon Musk heeft zoveel geld dat hij zijn eigen raketbedrijf heeft gebouwd. Jeff Bezos begon met het verkopen van boeken vanuit zijn garage — nu koopt bijna de hele wereld bij zijn bedrijf Amazon. Geld geeft je macht, maar heel veel rijke mensen zeggen dat vrienden en familie hen gelukkiger maken. Wat interessant is: veel van de rijkste mensen ter wereld geven ook enorme bedragen weg. Bill Gates, de oprichter van Microsoft, heeft meer dan 50 miljard dollar weggegeven aan goede doelen, vooral voor vaccins en gezondheidszorg in arme landen. Warren Buffett, een van de rijkste beleggers ter wereld, woont nog steeds in hetzelfde bescheiden huis als 60 jaar geleden. Hij zei ooit: "Ik wil rijkdom geven aan de samenleving, want die heeft mij ook groot gemaakt." Rijk zijn gaat dus niet alleen over wat je hebt — maar ook over wat je ermee doet.',
    quiz: { question: 'Waarmee begon Jeff Bezos zijn bedrijf Amazon?', answers: [{ text: 'Boeken verkopen', correct: true }, { text: 'Kleding verkopen' }, { text: "Auto's verkopen" }] },
  },
  {
    category: 'science',
    emoji: '🕳️',
    label: 'Wetenschap',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Kola_superdeep_borehole_site.jpg/600px-Kola_superdeep_borehole_site.jpg',
    title: 'De Diepste Boring op Aarde',
    intro: 'In Rusland boorden mensen een gat in de grond — zo diep als 12 kilometer. Dat is het diepste gat dat mensen ooit hebben gemaakt. Ze stopten pas toen het te heet werd. Het project begon in 1970, tijdens de Koude Oorlog. De Sovjet-Unie wilde bewijzen dat ze verder konden graven dan de Amerikanen. Wetenschappers wilden ook weten wat er diep in de aarde zit. Is de grond harder of zachter? Warmer of kouder? Zitten er lagen die je aan de oppervlakte niet kunt zien? Ze ontdekten dingen die niemand had verwacht. Op grote diepte vonden ze water — ingesloten in rotslagen, vastgezet onder enorme druk. Ze vonden ook microscopisch kleine gefossiliseerde organismen, levende wezentjes die al miljarden jaren geleden gestorven waren. Maar het grootste probleem bleef de hitte. Hoe dieper ze kwamen, hoe heter het werd. Het boorgereedschap smolt bijna.',
    question: 'Wat denk jij dat er helemaal in het midden van de aarde zit?',
    deepdive: 'Op 12 kilometer diepte was het meer dan 180 graden Celsius — heter dan een oven! De boring heet de Kola Superdeep Borehole. Het project duurde 24 jaar. En toch hadden ze maar een klein stukje van de aardkorst bereikt. Het middelpunt van de aarde is nog 6.000 kilometer verder. De aarde bestaat uit lagen: eerst de korst (waar wij op leven), dan de mantel van gesmolten gesteente, dan de buitenkern van vloeibaar ijzer en nikkel, en helemaal in het midden de binnenkern — een enorme ijzeren bol zo groot als de maan, onder zo veel druk dat het ijzer vast is ondanks de enorme hitte van wel 5.400 graden. Hoe weten wetenschappers dit als niemand er ooit geweest is? Via aardbevingen. Geluidsgolven van aardbevingen reizen door de aarde en buigen afhankelijk van het materiaal. Door die buigingen te meten kunnen wetenschappers precies zien wat er van binnen zit — net als een röntgenfoto, maar dan van de hele planeet.',
    quiz: { question: 'Hoe diep is het diepste gat dat mensen ooit hebben geboord?', answers: [{ text: '12 kilometer', correct: true }, { text: '5 kilometer' }, { text: '100 kilometer' }] },
  },
  {
    category: 'history',
    emoji: '🇪🇺',
    label: 'Europa',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Flag_of_Europe.svg/600px-Flag_of_Europe.svg.png',
    title: 'Wat Is Europa?',
    intro: 'Europa is niet alleen een werelddeel — het is ook een samenwerking van landen die de Europese Unie heet. Ze helpen elkaar en hebben samen afspraken gemaakt over handel, vrede en rechten van mensen. Maar hoe is de EU eigenlijk ontstaan? Na de Tweede Wereldoorlog lag Europa in puin. Miljoenen mensen waren gestorven. Steden waren verwoest. De leiders van de landen vroegen zich af: hoe zorgen we dat dit nooit meer gebeurt? Hun antwoord was samenwerking. Als landen van elkaar afhankelijk zijn — als ze handel met elkaar drijven, dezelfde regels hanteren en met elkaar praten — is de kans op oorlog kleiner. Begonnen met zes landen (Nederland, België, Luxemburg, Frankrijk, West-Duitsland en Italië), groeide de samenwerking langzaam uit. Eerst ging het alleen over staal en kolen. Later ook over andere producten, en uiteindelijk over alles: van voedselregels tot het milieu, van mensenrechten tot de munt.',
    question: 'Als landen samenwerken, denk je dat dat de wereld beter of moeilijker maakt?',
    deepdive: 'Er zijn 27 landen lid van de Europese Unie. In veel landen betaal je met dezelfde munt: de euro. Mensen mogen vrij van land naar land reizen zonder paspoort. Vroeger hadden al die landen vaker oorlog met elkaar — nu werken ze samen. De EU heeft ook een eigen vlag (blauwe achtergrond met gele sterren) en een eigen volkslied (de Ode an die Freude van Beethoven). Elk land heeft vertegenwoordigers in het Europees Parlement in Brussel en Straatsburg. Daar stemmen ze over nieuwe wetten die voor alle landen gelden. Sommige landen doen wél mee met de EU maar niet met de euro, zoals Zweden en Polen. Groot-Brittannië deed jarenlang mee maar verliet de EU in 2020 — dat heette de Brexit. Het liet zien dat meedoen aan de EU een keuze is, geen verplichting.',
    quiz: { question: 'Hoeveel landen zijn er lid van de Europese Unie?', answers: [{ text: '27 landen', correct: true }, { text: '15 landen' }, { text: '50 landen' }] },
  },
  {
    category: 'history',
    emoji: '🪙',
    label: 'Geschiedenis',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Nederlanden_Gulden.jpg/600px-Nederlanden_Gulden.jpg',
    title: 'De Nederlandse Gulden',
    intro: 'Voordat Nederland de euro had, betaalden mensen hier met de gulden. Dat was het Nederlandse geld. Op 1 januari 2002 verdween de gulden voor altijd en kwamen de eerste euro\'s en eurocenten in omloop. Miljoenen Nederlanders wisselden hun oude munten en biljetten in. In één nacht veranderde het geld van een heel land. De gulden bestond al heel lang: bijna 600 jaar lang was het de munt van Nederland. De oudste gulden dateert uit 1380. In al die eeuwen veranderde het uiterlijk regelmatig. Op de biljetten stonden beroemde Nederlanders: schrijver Spinoza, schilder Rembrandt en zeeheld Michiel de Ruyter. Op de munten stond het profiel van de Nederlandse koning of koningin. Kinderen die spaarpotjes hadden met guldens vonden het soms moeilijk dat hun gespaarde geld ineens minder waard leek — al was de omrekening eerlijk: één euro was gelijk aan 2,20371 gulden.',
    question: 'Stel dat elk land zijn eigen geld heeft — wat zijn de voor- en nadelen daarvan?',
    deepdive: 'Op een gulden stond het gezicht van koningin Beatrix. Er waren munten van 5 cent (stuiver), 10 cent (dubbeltje) en 25 cent (kwartje). Een brood kostte vroeger maar een paar gulden. Nu is het Nederlands geld de euro, gedeeld door inmiddels 20 landen. Sommige Nederlanders vonden het heel jammer dat de gulden verdween — ze voelden het als een stuk van hun identiteit dat verloren ging. Maar de euro heeft ook grote voordelen: als je naar Frankrijk, Duitsland of Spanje gaat, hoef je geen geld meer te wisselen. Bedrijven kunnen makkelijker handelen met andere EU-landen. En de prijs van spullen is makkelijker te vergelijken. Toch bewaren veel mensen thuis nog oude guldens als herinnering. Sommige zijn zelfs meer waard geworden als verzamelobject dan hun oorspronkelijke waarde.',
    quiz: { question: 'Wanneer verdween de gulden en kregen we de euro?', answers: [{ text: '1 januari 2002', correct: true }, { text: '1 januari 2000' }, { text: '1 januari 2010' }] },
  },
  {
    category: 'science',
    emoji: '🔬',
    label: 'Wetenschap',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Marie_Curie_c._1920s.jpg/600px-Marie_Curie_c._1920s.jpg',
    title: 'Wat Doet Een Wetenschapper?',
    intro: 'Wetenschappers stellen vragen over de wereld en zoeken antwoorden. Ze doen experimenten, schrijven alles op en delen hun ontdekkingen met anderen. Dankzij wetenschappers weten we zo ontzettend veel. Maar hoe werkt een wetenschapper eigenlijk? Het begint altijd met een vraag. Waarom valt een appel naar beneden? Hoe groeien cellen? Waarom is de lucht blauw? Daarna bedenk je een hypothese — een idee over het antwoord. Vervolgens doe je een experiment om te testen of je idee klopt. Als het klopt: geweldig. Als het niet klopt: ook geweldig, want je hebt iets nieuws geleerd. Isaac Newton zag een appel van een boom vallen en vroeg zich af waarom. Dat leidde tot zijn ontdekking van de zwaartekracht. Marie Curie onderzocht radioactieve straling — een onderwerp dat zo gevaarlijk was dat ze er uiteindelijk ziek van werd. Ze won twee Nobelprijzen, als eerste vrouw ooit.',
    question: 'Als jij wetenschapper was, welke vraag zou jij dan als eerste willen beantwoorden?',
    deepdive: 'Er zijn heel veel soorten wetenschappers. Een bioloog bestudeert dieren en planten. Een astronoom kijkt naar sterren en planeten. Albert Einstein ontdekte dat tijd sneller of langzamer kan gaan, afhankelijk van hoe snel je beweegt. Dat klinkt als magie — maar het is gewoon wetenschap! Einstein was als kind overigens niet de beste leerling. Hij was nieuwsgierig en eigenwijs, en leerde graag op zijn eigen manier. Zijn beroemdste formule is E=mc², wat betekent dat energie en massa hetzelfde zijn in een andere vorm. Dat idee ligt aan de basis van kernenergie en zelfs van het begrip van de oerknal. Wetenschap is ook niet altijd snel. Soms duurt een ontdekking tientallen jaren. De wetenschapper die DNA ontdekte, James Watson, werkte jarenlang samen met anderen voordat het grote geheim van het leven ontrafeld was. Wetenschap is geduldig zoeken — en soms plotseling een "Eureka!"-moment.',
    quiz: { question: 'Wat ontdekte Albert Einstein?', answers: [{ text: 'Dat tijd sneller of langzamer kan gaan', correct: true }, { text: 'Dat de aarde rond de zon draait' }, { text: 'Dat water uit H2O bestaat' }] },
  },
  {
    category: 'technology',
    emoji: '⚡',
    label: 'Technologie',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/English_Pokemon_V_Style_logo.svg/600px-English_Pokemon_V_Style_logo.svg.png',
    title: 'Pokémon — Hoe Begon Het?',
    intro: 'Pokémon begon in 1996 in Japan als een spel voor de Game Boy. De maker, Satoshi Tajiri, was als kind dol op insecten vangen in de natuur. Hij wilde dat gevoel — het zoeken, vangen en verzamelen — omzetten in een spel. Het resultaat: een van de meest succesvolle speelgoedfranchises aller tijden. Tajiri werkte vijf jaar aan het spel, samen met zijn jeugdvriend Ken Sugimori, die alle Pokémon tekende. Ze hadden nauwelijks geld. Het spel was bijna failliet voordat het uitkwam. Maar toen het in Japan verscheen, werd het meteen een gigantisch succes. Kinderen ruilden hun Game Boy-cartridges op het schoolplein. Er was een rode versie en een blauwe versie, met kleine verschillen — zodat je vrienden nodig had om alles te verzamelen. Die slimme truc zorgde ervoor dat iedereen het speelde. Al snel kwamen er speelkaarten, een tekenfilmserie en films.',
    question: 'Wat zou jouw eigen Pokémon zijn, en welk bijzonder vermogen zou hij hebben?',
    deepdive: 'De naam Pokémon komt van "Pocket Monsters" — kleine monsters die je in je zak draagt. In het eerste spel waren er 151 Pokémon. Nu zijn er meer dan 1.000! Pikachu werd het gezicht van Pokémon, maar de echte starter-keuze was tussen Bulbasaur, Charmander en Squirtle. De Pokémon-franchise is inmiddels de meest winstgevende entertainment-franchise ooit — rijker dan Star Wars, Marvel en Disney. Elk jaar komen er nieuwe spellen, films en kaarten uit. De kaarten zijn zo populair dat sommige zeldzame exemplaren tienduizenden euro\'s waard zijn. Een eerste editie Charizard-kaart in perfecte staat werd ooit verkocht voor meer dan 400.000 dollar. Pokémon GO, uitgebracht in 2016, liet spelers Pokémon vangen in de echte wereld via hun telefoon. Op de eerste dag was het de meest gedownloade app ter wereld. Het bracht mensen letterlijk naar buiten en bewoog ze meer — iets wat de makers vast niet hadden verwacht.',
    quiz: { question: 'Hoeveel Pokémon waren er in het allereerste Pokémon-spel?', answers: [{ text: '151', correct: true }, { text: '250' }, { text: '1000' }] },
  },
  {
    category: 'animals',
    emoji: '🐙',
    label: 'Dieren',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Octopus3.jpg/600px-Octopus3.jpg',
    title: 'De Octopus: Een Geniaal Dier',
    intro: 'Een octopus heeft drie harten, blauw bloed en negen hersenen! Elke arm heeft zijn eigen mini-brein dat zelfstandig besluiten kan nemen. Ze zijn zo slim dat ze potten kunnen openen, labyrinten kunnen oplossen en gezichten van mensen kunnen herkennen. Een octopus is eigenlijk een van de slimste dieren op aarde — al lijkt hij in niets op jou of op een hond of aap. Octopussen zijn weekdieren, verwant aan slakken en mosselen. Maar ergens in hun evolutie ontwikkelden ze een enorm brein. Ze hebben acht armen die elk honderden zuignappen bevatten — en die armen denken echt mee. Als je een arm wegsnijdt (wat in de natuur kan gebeuren), blijft die arm nog tijdelijk reageren op zijn omgeving. Elk van de acht armen kan onafhankelijk beslissingen nemen, terwijl het centrale brein de grote strategie bepaalt. Dat is alsof jij acht helpers hebt die elk hun eigen hoofd gebruiken.',
    question: 'Als jij negen hersenen had, wat zou je dan tegelijkertijd denken?',
    deepdive: 'Octopussen leven maar 1 tot 3 jaar, maar in die tijd leren ze ontzettend veel. Ze kunnen van kleur en textuur veranderen om zich te camoufleren — zelfs als ze kleurenblind zijn! Wetenschappers ontdekten dat octopussen dromen: ze veranderen van kleur terwijl ze slapen, waarschijnlijk omdat ze beelden in hun hoofd zien. Hoe ze kleuren kunnen nabootsen terwijl ze ze niet kunnen zien, is nog steeds een mysterie. Wetenschappers denken dat ze licht waarnemen via speciale cellen in hun huid zelf, los van hun ogen. Octopussen zijn ook meesters in ontsnappen. In gevangenschap vinden ze altijd een manier om hun tank te verlaten, door de kamer te wandelen en terug te sluipen voor de verzorger terugkomt. Sommige octopussen dragen zelfs kokosschelpen met zich mee als draagbaar huis — een van de weinige voorbeelden van gereedschapsgebruik buiten zoogdieren. En hun inkt, die ze spuiten om roofdieren te verwarren, bevat stoffen die de zintuigen van aanvallers tijdelijk uitschakelen.',
    quiz: { question: 'Hoeveel harten heeft een octopus?', answers: [{ text: 'Drie harten', correct: true }, { text: 'Twee harten' }, { text: 'Één hart' }] },
  },
  {
    category: 'space',
    emoji: '🪐',
    label: 'Ruimte',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Saturn_during_Equinox.jpg/600px-Saturn_during_Equinox.jpg',
    title: 'Saturnus en Zijn Ringen',
    intro: 'Saturnus is de zesde planeet van de zon en heeft prachtige ringen van ijs en rotsblokken. De planeet is zo licht dat hij zou kunnen drijven op water — als je een bad had dat groot genoeg was! Saturnus is een gasreus: er is geen vaste grond om op te landen. De planeet bestaat bijna volledig uit waterstof en helium, net als de zon. De ringen van Saturnus zijn misschien wel het mooiste schouwspel in ons zonnestelsel. Ze bestaan uit miljarden brokken ijs en steen, variërend van zo klein als een zandkorrel tot zo groot als een huis. Die ringen zijn verrassend dun: gemiddeld maar één kilometer dik, terwijl ze 280.000 kilometer breed zijn. Toch zijn ze van de aarde zichtbaar met een gewone verrekijker. Galileo Galilei zag ze in 1610 al, maar dacht dat Saturnus drie planeten waren. Pas later begrepen wetenschappers dat het ringen waren.',
    question: 'Als er leven bestond op een maan van Saturnus — hoe zou dat er dan uitzien?',
    deepdive: 'Saturnus heeft 146 bekende manen — meer dan welke andere planeet dan ook. Zijn grootste maan, Titan, heeft meren vol vloeibaar gas in plaats van water. Er is een atmosfeer van stikstof, net als op aarde. Sommige wetenschappers denken dat er misschien een primitieve vorm van leven mogelijk is op Titan, in de vloeibare gasmeren. Een andere maan, Enceladus, spuit enorme fonteinen van water de ruimte in vanuit een ondergrondse oceaan. Dat maakt Enceladus een van de meest veelbelovende plekken in ons zonnestelsel om naar leven te zoeken. De ruimtesonde Cassini onderzocht Saturnus en zijn manen van 2004 tot 2017. In 2017 stortte de sonde bewust in Saturnus, zodat hij geen bacteriën van de aarde zou overbrengen naar de manen. Een wetenschappelijk zelfopoffering voor de zuiverheid van toekomstig onderzoek.',
    quiz: { question: 'Hoeveel bekende manen heeft Saturnus?', answers: [{ text: '146 manen', correct: true }, { text: '12 manen' }, { text: '27 manen' }] },
  },
  {
    category: 'nature',
    emoji: '🌳',
    label: 'Natuur',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/24701-nature-natural-beauty.jpg/600px-24701-nature-natural-beauty.jpg',
    title: 'Bomen Praten Met Elkaar',
    intro: 'Bomen staan er stil bij, maar ze communiceren constant. Via een netwerk van schimmels in de grond sturen ze suikers en signalen naar elkaar — wetenschappers noemen dit het "Wood Wide Web". Dit klinkt als sciencefiction, maar het is bewezen wetenschap. Onder elk bos loopt een web van fijne schimmeldraden, dunner dan een mensenhaar, dat bomen letterlijk met elkaar verbindt. Bomen en schimmels werken samen: de boom geeft de schimmel suikers die hij met fotosynthese maakt. De schimmel geeft de boom water en mineralen terug. Maar het netwerk doet meer dan uitwisselen. Wetenschapper Suzanne Simard ontdekte in de jaren 90 dat bomen via dit netwerk ook berichten sturen. Ze spoot radioactief suiker in een berkenboom en zag hoe dat suiker via de schimmeldraden in een naburige spar belandde. De bomen deelden voedsel.',
    question: 'Als bomen konden praten, wat zouden ze dan het liefst aan ons vertellen?',
    deepdive: 'Moederbomen — de oudste, grootste bomen in een bos — herkennen hun eigen kinderen en sturen hen extra voedingsstoffen. Als een boom aangevallen wordt door insecten, stuurt hij via de schimmeldraden een waarschuwing naar zijn buren zodat ze zich kunnen verdedigen. Het bos is eigenlijk één groot levend netwerk. Bomen die gekapt worden, pompen soms hun laatste suikerreserves via het netwerk naar hun buren — alsof ze hun rijkdom weggeven voor ze sterven. Sommige wetenschappers noemen dit "altruïsme bij bomen". Of ze het echt bewust doen weten we niet, maar het effect is er wel. Bossen zonder dit schimmelnetwerk — bijvoorbeeld na een bosbrand — herstellen veel langzamer. Jonge boompjes die in zo\'n kaal gebied groeien hebben geen verbinding en moeten alles zelf doen. In gezonde bossen helpen de oudere bomen de jonge door ze langzaam op te nemen in het netwerk.',
    quiz: { question: 'Hoe noemen wetenschappers het netwerk waarmee bomen communiceren?', answers: [{ text: 'Wood Wide Web', correct: true }, { text: 'Boom Internet' }, { text: 'Groene Weg' }] },
  },
  {
    category: 'technology',
    emoji: '🌐',
    label: 'Technologie',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Submarine_cable_cross-section_3.svg/600px-Submarine_cable_cross-section_3.svg.png',
    title: 'Hoe Werkt Het Internet?',
    intro: 'Het internet is een enorm netwerk van computers die met elkaar praten. Als jij een filmpje bekijkt, reist die data in milliseconden van een computer ergens in de wereld naar jouw scherm. Maar hoe werkt dat precies? Stel: jij typt een adres in je browser, zoals youtube.com. Je computer stuurt een verzoek naar een server — een speciale computer die de website bewaart. Die server stuurt de data terug in kleine pakketjes. Die pakketjes reizen via kabels, soms dwars door oceanen heen. Er liggen meer dan 1,3 miljoen kilometer onderzeese kabels op de bodem van de zee. Die dunne kabels verbinden alle continenten met elkaar. De pakketjes komen aan bij jouw router thuis, die het signaal naar jouw apparaat stuurt. Dit alles gebeurt in minder dan een seconde. Het is eigenlijk een soort postkantoor dat miljarden brieven per seconde verwerkt, elk kleiner dan een duimnagel.',
    question: 'Stel je voor dat het internet één dag uitvalt — wat zou er dan op de wereld veranderen?',
    deepdive: 'Het internet werd uitgevonden door het Amerikaanse leger in de jaren \'60 als ARPANET. De bedoeling was een netwerk te maken dat zou blijven werken, zelfs als een deel ervan werd aangevallen. De eerste boodschap ooit op het internet was "lo" — het systeem crashte voor het woord "login" compleet was! Elke dag worden er meer dan 300 miljard e-mails verstuurd. Naast e-mail en video\'s draaien ook banken, ziekenhuizen, verkeerslichten en waterleidingen op het internet of erop aansluitende netwerken. Als het internet één dag volledig uitviel, zouden vluchten worden geannuleerd, geldautomaten stoppen, en supermarkten hun voorraden niet meer kunnen bijhouden. Een dag zonder internet zou de wereldeconomie naar schatting honderden miljarden euro\'s kosten. Toch is het internet ook kwetsbaar: die onderzeese kabels kunnen beschadigd raken door aardbevingen of ankers van schepen. In 2006 beschadigde een aardbeving bij Taiwan twee grote kabels — en grote delen van Azië hadden dagenlang minder snel internet.',
    quiz: { question: 'Wat was de eerste boodschap ooit verstuurd op het internet?', answers: [{ text: '"lo"', correct: true }, { text: '"hello"' }, { text: '"start"' }] },
  },
  {
    category: 'animals',
    emoji: '🐋',
    label: 'Dieren',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Anim1754_-_Flickr_-_NOAA_Photo_Library.jpg/600px-Anim1754_-_Flickr_-_NOAA_Photo_Library.jpg',
    title: 'De Blauwe Vinvis: Het Grootste Dier Ooit',
    intro: 'De blauwe vinvis is het grootste dier dat ooit op aarde heeft geleefd — groter dan welke dinosaurus dan ook. Zijn hart is zo groot als een auto, en zijn bloedvaten zijn zo wijd dat een klein kind erdoorheen zou kunnen kruipen. Toch begint elk blauw vinvisje ter wereld als een babydier van "maar" zeven meter lang en 2.700 kilo bij de geboorte. Een pasgeboren blauw vinviskalf drinkt elke dag meer dan 400 liter moedermelk. Het groeit zo snel dat het elke dag 90 kilo aankomt — je ziet het bijna voor je ogen groeien. Blauwe vinvissen leven in alle oceanen van de wereld. Ze migreren enorme afstanden: in de zomer zwemmen ze naar koudere wateren om te eten, in de winter naar warmere wateren om jongen te krijgen. In hun eentje zwemmen ze honderden kilometers per week.',
    question: 'Hoe denk jij dat het voelt om zo groot te zijn dat niemand je kan negeren?',
    deepdive: 'Een blauwe vinvis kan tot 33 meter lang worden en 200.000 kilo wegen. Zijn tong weegt al meer dan een olifant. Het geluid dat ze maken is het luidst van elk dier op aarde — je kunt het op 800 kilometer afstand horen onder water. Toch zijn het stille, vredige dieren die leven van kleine garnaalachtigen die krill heten. Een blauwe vinvis eet elke dag tot 40 miljoen krill-diertjes — samen zo\'n 3.600 kilo. Ze filteren het water door enorme baleenplaten in hun bek, als een gigantische zeef. In de twintigste eeuw werden blauwe vinvissen bijna uitgestorven door de walvisjacht. Op het dieptepunt waren er nog maar een paar honderd. Nu, dankzij wereldwijde bescherming, zijn er weer zo\'n 10.000 tot 25.000 exemplaren — maar ze staan nog steeds op de lijst van bedreigde diersoorten. Wetenschappers volgen ze met satellietzenders om te begrijpen hoe ze leven en hoe we ze kunnen beschermen.',
    quiz: { question: 'Hoe lang kan een blauwe vinvis worden?', answers: [{ text: '33 meter', correct: true }, { text: '15 meter' }, { text: '50 meter' }] },
  },
  {
    category: 'science',
    emoji: '⚛️',
    label: 'Wetenschap',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Hydrogen_atom.svg/600px-Hydrogen_atom.svg.png',
    title: 'Wat Is Een Atoom?',
    intro: 'Alles om je heen — de lucht, jouw lichaam, dit scherm, de stoel waarop je zit — bestaat uit ontzettend kleine deeltjes die atomen heten. Ze zijn zo klein dat je er miljarden in een stofkorreltje kunt stoppen. Hoe klein is een atoom precies? Als jij zo groot was als de aarde, dan zou een atoom voor jou zo groot zijn als een knikker. Ze zijn onvoorstelbaar klein. Toch is een atoom zelf niet het kleinste wat er bestaat. Elk atoom bestaat uit nog kleinere deeltjes: protonen en neutronen in de kern, en elektronen die eromheen bewegen. En protonen en neutronen bestaan op hun beurt weer uit nog kleinere deeltjes: quarks. Er zijn zes soorten quarks, met namen als "up", "down", "charm" en "strange". Wetenschappers zijn er nog steeds niet zeker van of quarks zelf ook weer uit kleinere deeltjes bestaan. Het lijkt alsof de wereld kleiner en kleiner wordt, hoe verder je inzoomt.',
    question: 'Als jij het allerkleinste deeltje ter wereld was, waar zou je dan zijn?',
    deepdive: 'Atomen bestaan voor het grootste deel uit leegte! De kern in het midden is klein en de elektronen die eromheen bewegen zijn enorm ver weg. Als een atoom zo groot was als een voetbalstadion, zou de kern ter grootte van een erwt in het midden liggen. Al die leegte betekent dat jijzelf ook voor het overgrote deel uit leegte bestaat. Als je alle leegte uit alle atomen in alle mensen op aarde zou halen, zou de hele mensheid in een suikerklontje passen. De energie die atomen bij elkaar houdt, is gigantisch. Dat is precies de energie die vrijkomt bij een kernbom of in een kerncentrale: door atoomkernen te splitsen of samen te voegen komt er enorme hoeveelheid energie vrij. Dezelfde energie die de zon laat branden, is kernenergie — maar dan op een schaal die wij mensen ons nauwelijks voor kunnen stellen.',
    quiz: { question: 'Waaruit bestaat een atoom voor het grootste deel?', answers: [{ text: 'Leegte', correct: true }, { text: 'Water' }, { text: 'Energie' }] },
  },
  {
    category: 'nature',
    emoji: '🌋',
    label: 'Natuur',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Pahoeoe_fountain_original.jpg/600px-Pahoeoe_fountain_original.jpg',
    title: 'Vulkanen en Het Vuur van de Aarde',
    intro: 'Vulkanen zijn openingen in de aardkorst waardoor gesmolten steen — magma — naar buiten komt. Ze zijn gevaarlijk, maar ze hebben ook nieuw land en vruchtbare grond gecreëerd. Zonder vulkanen had het leven op aarde er heel anders uitgezien. Vulkanen zijn er in veel soorten. Sommige spuiten rustig lava uit, als een trage rivier van vuur die langzaam naar de zee stroomt. Andere exploderen met enorme kracht: de beroemde uitbarsting van de Vesuvius in het jaar 79 na Christus bedolf de Romeinse stad Pompeii onder een laag as en steen in slechts een paar uur. De stad werd zo goed geconserveerd dat we vandaag nog precies kunnen zien hoe mensen er leefden — hun huizen, hun schilderijen, zelfs hun maaltijden. Wanneer een vulkaan uitbarst, spuit hij niet alleen lava. Hij gooit ook as, gas en rotsblokken de lucht in. Bij grote uitbarstingen kan de as de zon blokkeren voor maanden, waardoor het kouder wordt op aarde.',
    question: 'Als de aarde een levend wezen was, zouden vulkanen dan zijn ademhaling zijn?',
    deepdive: 'Hawaii is volledig door vulkanen gemaakt! Het eiland bestaat uit gestolde lava die miljoenen jaren geleden uitstroomde vanuit de zeebodem. De grootste vulkaan op aarde is de Mauna Loa — gemeten vanaf de zeebodem is hij groter dan de Mount Everest. Op dit moment zijn er zo\'n 1.500 actieve vulkanen op aarde. De gevaarlijkste vulkaan ter wereld staat misschien niet waar je denkt: het is de Yellowstone supervulkaan in de Verenigde Staten. Die heeft al 640.000 jaar niet uitgebarsten, maar als hij dat ooit deed, zou het een wereldwijde catastrofe zijn. Gelukkig houden wetenschappers hem nauwlettend in de gaten. Vulkanen zijn ook op andere planeten gevonden. De Olympus Mons op Mars is de grootste vulkaan in het zonnestelsel — drie keer zo hoog als de Mount Everest en zo breed als heel Nederland. Op de maan Io van Jupiter zijn voortdurend vulkanen actief, wat het meest vulkanisch actieve object in ons zonnestelsel maakt.',
    quiz: { question: 'Hoeveel actieve vulkanen zijn er op dit moment op aarde?', answers: [{ text: 'Ongeveer 1.500', correct: true }, { text: 'Ongeveer 100' }, { text: 'Ongeveer 10.000' }] },
  },
  {
    category: 'history',
    emoji: '🧱',
    label: 'Berlijn',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Berlinermauer.jpg/600px-Berlinermauer.jpg',
    title: 'De Berlijnse Muur',
    intro: 'Op 13 augustus 1961 werden de mensen van Berlijn wakker in een stad die ineens in tweeën was gesneden. Soldaten hadden \'s nachts prikkeldraad gespannen dwars door straten, langs tuinen en midden door families heen. Daarna kwamen de betonblokken. De Berlijnse Muur was geboren. Berlijn was na de Tweede Wereldoorlog verdeeld tussen de geallieerde landen: het westen van de stad was vrij, het oosten werd gecontroleerd door de Sovjet-Unie. Steeds meer mensen vluchtten vanuit het arme, strenge Oost-Berlijn naar het rijke West-Berlijn — soms wel duizend mensen per dag. Om dat te stoppen bouwde de Oost-Duitse regering de muur. Van de ene op de andere dag konden mensen hun familie aan de andere kant niet meer zien. Sommige mensen werden midden in hun straat afgesneden van hun eigen huis.',
    question: 'Hoe zou jij je voelen als er morgen een muur voor je huis stond en je je vrienden niet meer mocht zien?',
    deepdive: 'De Berlijnse Muur was uiteindelijk 155 kilometer lang en had meer dan 300 waaktorentjes. Meer dan 100 mensen stierven bij pogingen om over de muur te klimmen. Sommigen groeven tunnels, anderen bouwden luchtballonnen van gordijnstof, een man vloog er zelfs overheen in een zelfgemaakt vliegtuigje. De muur stond 28 jaar. Kinderen die in 1961 geboren werden kenden niets anders dan een verdeelde stad. Toen de muur in 1989 viel, huilden mensen van geluk op straat. Stukken van de muur werden meegenomen als souvenir. Vandaag kun je in Berlijn nog stukken van de originele muur zien staan — als herinnering dat vrijheid nooit vanzelfsprekend is.',
    quiz: { question: 'In welk jaar werd de Berlijnse Muur gebouwd?', answers: [{ text: '1961', correct: true }, { text: '1945' }, { text: '1975' }] },
  },
  {
    category: 'history',
    emoji: '🚧',
    label: 'Berlijn',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Checkpoint_charlie_2004.jpg/600px-Checkpoint_charlie_2004.jpg',
    title: 'Checkpoint Charlie',
    intro: 'Midden in het hart van Berlijn lag een klein wachtershuisje in de straat — maar dit was geen gewoon wachtershuisje. Dit was Checkpoint Charlie, het beroemdste grensovergangspunt ter wereld. Het was de enige plek in de Berlijnse Muur waar buitenlanders en diplomaten van West naar Oost mochten. Aan de westkant stond een Amerikaans bordje: "Je verlaat nu de Amerikaanse sector." Aan de oostkant stonden gewapende soldaten klaar die elk voertuig doorzochten. Mensen werden onder auto\'s gekeken met spiegels, koffers werden opengemaakt, soms werden passagiers urenlang vastgehouden. Checkpoint Charlie was ook het toneel van een van de gevaarlijkste momenten van de Koude Oorlog: in 1961 stonden er Amerikaans en Sovjet-tanks oog in oog, motoren aan, klaar voor de strijd. Gelukkig reden ze na een tijdje allebei achteruit.',
    question: 'Stel je voor dat je elke dag langs gewapende soldaten moet om naar school te gaan — hoe zou dat voelen?',
    deepdive: 'De naam "Charlie" komt niet van een persoon, maar gewoon van de letter C in het NATO-alfabet: Alpha, Bravo, Charlie. Er waren ook Checkpoint Alpha en Bravo, maar Charlie werd het bekendst. Spionnen werden hier geruild — gevangen genomen agenten van het westen werden uitgewisseld tegen agenten van het oosten. Die uitwisselingen vonden altijd \'s nachts plaats, in stilte, op een brug. Vandaag staat er een replica van het wachtershuisje als toeristische attractie. Meer dan drie miljoen mensen bezoeken de plek elk jaar. Het originele huisje staat in een museum. Checkpoint Charlie herinnert ons eraan dat er ooit een tijd was dat mensen niet vrij over straat mochten lopen in hun eigen stad.',
    quiz: { question: 'Wat mocht er door Checkpoint Charlie?', answers: [{ text: 'Buitenlanders en diplomaten', correct: true }, { text: 'Alleen spionnen' }, { text: 'Iedereen' }] },
  },
  {
    category: 'history',
    emoji: '🎉',
    label: 'Berlijn',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Der_Fall_der_Mauer.jpg/600px-Der_Fall_der_Mauer.jpg',
    title: 'De Nacht dat de Muur Viel',
    intro: 'Op 9 november 1989 gebeurde iets wat niemand voor mogelijk had gehouden. Een Oost-Duitse woordvoerder las tijdens een persconferentie op televisie voor dat de grenzen opengesteld zouden worden. Een journalist vroeg: "Wanneer?" De man keek in zijn papieren en zei: "Onmiddellijk, zonder vertraging." Dat was niet de bedoeling — het was een vergissing, de beslissing was nog niet officieel. Maar het was al te laat. Het nieuws verspreidde zich als een lopend vuur. Duizenden Oost-Berlijners trokken naar de muur. De grensposten werden overspoeld. De soldaten, die geen orders kregen, wisten niet wat ze moesten doen. Uiteindelijk lieten ze de mensen door. Huilende families omhelsden elkaar voor het eerst in jaren. Op de muur klommen mensen en sloegen er stukken uit met hamers.',
    question: 'Als jij die avond in Berlijn was geweest, wat zou jij gedaan hebben?',
    deepdive: 'Die nacht dansten mensen op de Berlijnse Muur. Vreemden omhelsden elkaar. Champagne werd gedronken op straat. Oost- en West-Berlijners reden in oude Trabant-autootjes toeterend door de stad. Het was een feest dat de hele wereld live op televisie zag. De val van de muur luidde het einde in van de Koude Oorlog. Binnen een jaar, op 3 oktober 1990, was Duitsland officieel herenigd — voor het eerst in 45 jaar één land. De dag van de hereniging wordt elk jaar gevierd als nationale feestdag: de Dag van de Duitse Eenheid. Van de muur zelf is bijna niets meer over. Een dunne lijn van keien in het wegdek geeft aan waar hij ooit stond. Je kunt hem door heel Berlijn volgen — dwars door straten, pleinen en zelfs door gebouwen heen.',
    quiz: { question: 'Op welke datum viel de Berlijnse Muur?', answers: [{ text: '9 november 1989', correct: true }, { text: '3 oktober 1990' }, { text: '13 augustus 1961' }] },
  },
  {
    category: 'history',
    emoji: '🏛️',
    label: 'Berlijn',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Brandenburg_Gate_2004.jpg/600px-Brandenburg_Gate_2004.jpg',
    title: 'De Brandenburger Tor',
    intro: 'Midden in Berlijn staat een enorme poort van steen — de Brandenburger Tor. Hij is meer dan 200 jaar oud en heeft alles meegemaakt: keizers, oorlogen, dictators, een gedeelde stad en uiteindelijk hereniging. De poort werd gebouwd in 1791, in opdracht van de Pruisische koning. Hij was bedoeld als symbool van vrede — en bovenop staat een beeld van een godin op een wagen getrokken door vier paarden, de Quadriga genaamd. Napoleon veroverde Berlijn in 1806 en nam de Quadriga mee naar Parijs als oorlogsbuit. Na zijn nederlaag in 1814 brachten de Pruisen het beeld triomfantelijk terug. Tijdens de Tweede Wereldoorlog werd de poort zwaar beschadigd door bombardementen. En toen de Berlijnse Muur werd gebouwd, stond de Brandenburger Tor exact op de grens — bereikbaar voor niemand, gevangen tussen twee werelden.',
    question: 'Als een poort een symbool van jouw leven was, wat zou er dan op de top staan?',
    deepdive: 'Na de val van de muur in 1989 werd de Brandenburger Tor het middelpunt van de grootste viering die Berlijn ooit zag. Honderdduizenden mensen stroomden samen bij de poort om de hereniging te vieren. Sindsdien is het dé plek in Berlijn voor historische momenten: presidenten houden er toespraken, oud en nieuwfeesten worden er gevierd en marathons passeren eronder. In 1987 sprak de Amerikaanse president Ronald Reagan voor de poort de beroemde woorden: "Mr. Gorbachev, tear down this wall!" — "Haal deze muur neer!" Twee jaar later was de muur inderdaad weg. De Brandenburger Tor is het enige overgebleven stadspoort van Berlijn van de oorspronkelijke veertien. Hij staat er als stille getuige van alles wat de stad heeft doorgemaakt.',
    quiz: { question: 'In welk jaar werd de Brandenburger Tor gebouwd?', answers: [{ text: '1791', correct: true }, { text: '1871' }, { text: '1945' }] },
  },
  {
    category: 'history',
    emoji: '🐻',
    label: 'Berlijn',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/B%C3%A4renbrunnen_K%C3%B6llnischer_Park_-_Berlin.jpg/600px-B%C3%A4renbrunnen_K%C3%B6llnischer_Park_-_Berlin.jpg',
    title: 'Berlijn en de Beer',
    intro: 'Berlijn heeft een bijzonder stadswapen: een zwarte beer op een witte achtergrond. De beer staat overal in de stad — op borden, bruggen, in standbeelden en op souvenirs. Maar waarom een beer? De legende zegt dat de stad is gesticht door Albrecht de Beer, een markgraaf die in de twaalfde eeuw over het gebied heerste. Zijn naam betekent letterlijk "de beer", en zo kreeg de stad zijn symbool. Maar misschien is het gewoon een woordgrap: "Berlijn" klinkt een beetje als het woord voor beer in het Duits — "Bär". Hoe dan ook, de beer is al meer dan 700 jaar het symbool van Berlijn. In 2001 begon een kunstproject dat de beer wereldberoemd maakte: honderden levensgrote berenbeelden werden door kunstenaars beschilderd en door de hele stad geplaatst. Elke beer was anders, kleurrijk en creatief. Toeristen van overal kwamen kijken.',
    question: 'Als jij een dier mocht kiezen als symbool voor jouw stad of dorp, welk dier zou dat zijn en waarom?',
    deepdive: 'Het kunstproject met de beschilderde beren heette "The Buddy Bears" en was zo\'n succes dat het de wereld over reisde — naar Parijs, Tokyo, New York en tientallen andere steden. Het idee was simpel: berendecoraties zetten de wereld op zijn kop. De opbrengst van de verkoop ging naar goede doelen. Inmiddels zijn er meer dan 140 landen die meededen. Vandaag de dag staat er bij de Brandenburger Tor altijd een grote beer als welkomstgeschenk voor bezoekers. De beer van Berlijn is zo geliefd dat hij zelfs zijn eigen verjaardag heeft: op 28 oktober viert Berlijn elk jaar de geboortedag van de stad, en de beer staat centraal. Berlijn is trots op zijn beer — net zoals een voetbalclub trots is op zijn mascotte.',
    quiz: { question: 'Hoe heet het symbool (dier) van de stad Berlijn?', answers: [{ text: 'De beer', correct: true }, { text: 'De adelaar' }, { text: 'De wolf' }] },
  },
  {
    category: 'history',
    emoji: '✈️',
    label: 'Berlijn',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/C-47s_at_Tempelhof_Airport_Berlin_1948.jpg/600px-C-47s_at_Tempelhof_Airport_Berlin_1948.jpg',
    title: 'De Berlijnse Luchtbrug',
    intro: 'In 1948 deed de Sovjet-Unie iets heel gevaarlijks: ze blokkeerden alle wegen, spoorwegen en kanalen naar West-Berlijn. Twee miljoen mensen zaten ineens opgesloten in hun eigen stad, zonder eten, zonder brandstof, zonder medicijnen. De bedoeling was duidelijk: verhonger de stad totdat ze zich overgeeft. Maar het westen liet zich niet kisten. Amerika en Groot-Brittannië besloten iets wat niemand voor mogelijk hield: ze zouden de hele stad bevoorraden vanuit de lucht. Dag en nacht, elke dag, landden vliegtuigen op de vliegvelden van West-Berlijn. Op het hoogtepunt landde er elke drie minuten een toestel. Ze brachten bloem, kolen, medicijnen — alles wat een stad nodig heeft om te overleven. De Russen dachten dat het nooit zou lukken. Ze hadden het mis.',
    question: 'Als jij besliste of je een gevaarlijke missie zou uitvoeren om vreemden te helpen, wat zou je dan doen?',
    deepdive: 'De luchtbrug duurde 15 maanden — van juni 1948 tot september 1949. In totaal werden er meer dan 200.000 vluchten gemaakt en meer dan 2 miljoen ton aan goederen ingevlogen. De piloten werden helden. Een van hen, Gail Halvorsen, begon snoepjes uit zijn vliegtuig te gooien aan kleine kinderen die bij het vliegveld stonden te kijken. Hij bond de snoepjes vast aan kleine parachutjes van zakdoeken. Al snel deden andere piloten mee. Kinderen noemden hem "de rozijnenomber". Uiteindelijk gaven de Russen toe en heftten ze de blokkade op. West-Berlijn was vrij. De luchtbrug liet de wereld zien dat je een stad kunt redden met moed, organisatie en heel veel vliegtuigen.',
    quiz: { question: 'Hoe lang duurde de Berlijnse Luchtbrug?', answers: [{ text: '15 maanden', correct: true }, { text: '3 maanden' }, { text: '5 jaar' }] },
  },
  {
    category: 'history',
    emoji: '🏅',
    label: 'Berlijn',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Jesse_Owens2.jpg/600px-Jesse_Owens2.jpg',
    title: 'Jesse Owens in Berlijn',
    intro: 'In 1936 organiseerde Adolf Hitler de Olympische Spelen in Berlijn. Hij wilde de wereld laten zien dat blonde, blauwe-ogige Duitsers de beste mensen ter wereld waren. Maar toen verscheen een jonge Amerikaanse atleet genaamd Jesse Owens — en hij verpestte Hitlers plannen volledig. Owens was Afrikaans-Amerikaans, opgegroeid in armoede in Alabama. Op de Olympische Spelen van Berlijn won hij vier gouden medailles: op de 100 meter, de 200 meter, de verspringen en de estafette. Vier keer de beste ter wereld, in de stad van een man die dacht dat mensen zoals hij minderwaardig waren. Het stadion, gevuld met honderdduizend mensen, explodeerde van enthousiasme. De menigte riep zijn naam: "Yesse! Yesse!" Hitler verliet boos het stadion.',
    question: 'Hoe denk jij dat Jesse Owens zich voelde toen hij zijn eerste gouden medaille won, in die stad, voor die menigte?',
    deepdive: 'Jesse Owens had tijdens de Spelen ook een onverwachte vriend: de Duitse atleet Luz Long, zijn grootste concurrent op het verspringen. Long gaf Owens stiekem een tip waardoor hij zich kon plaatsen voor de finale. Ze omhelsden elkaar openlijk voor de ogen van Hitler — een zwarte Amerikaan en een blonde Duitser, vrienden. Long verloor de finale van Owens en feliciteerde hem als eerste. "Je kunt je leven lang zoeken naar een vriend als Luz Long", schreef Owens later. Terug in Amerika werd Owens niet als held ontvangen door president Roosevelt — de president nodigde de witte atleten wel uit naar het Witte Huis, maar Owens niet. Het duurde decennia voor Amerika zijn eigen held volledig erkende.',
    quiz: { question: 'Hoeveel gouden medailles won Jesse Owens op de Olympische Spelen van 1936?', answers: [{ text: '4', correct: true }, { text: '2' }, { text: '1' }] },
  },
  {
    category: 'technology',
    emoji: '📡',
    label: 'Berlijn',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Fernsehturm_Berlin_2006.jpg/600px-Fernsehturm_Berlin_2006.jpg',
    title: 'De Fernsehturm: Toren van Berlijn',
    intro: 'Midden in Berlijn prik je hem niet te missen: een naald van 368 meter hoog met een zilveren bol halverwege — de Fernsehturm, de televisietoren. Hij is het hoogste gebouw van Duitsland en zichtbaar vanuit bijna heel Berlijn. De toren werd gebouwd door Oost-Duitsland en geopend in 1969. Het was een statement aan de wereld: kijk hoe modern en krachtig de communistische staat is. Maar de toren werd snel een mikpunt van grappen. Wanneer de zon op de metalen bol schijnt, verschijnt er een spiegelend kruis van licht. De gelovige West-Berlijners noemden dit spottend "de wraak van de paus" — want de atheïstische Oost-Duitse regering had kerken verboden, maar kon het kruis op haar eigen trots niet vermijden. De bouwers probeerden het te verhelpen met een andere coating, maar het kruis bleef.',
    question: 'Als jij een toren mocht bouwen die jouw stad aan de wereld laat zien, hoe zou die er dan uitzien?',
    deepdive: 'De Fernsehturm heeft een draaiend restaurant in de bol, op 207 meter hoogte. In precies 30 minuten draait het restaurant een volle ronde — terwijl je eet, verandert langzaam het uitzicht over de hele stad. Meer dan een miljoen mensen bezoeken de toren elk jaar. Bij helder weer kun je vanuit de toren tot 80 kilometer ver kijken. De toren zond oorspronkelijk televisieprogramma\'s uit voor heel Oost-Duitsland. Na de hereniging in 1990 bleef hij gewoon draaien — nu als toeristische attractie én als zendmast voor radio en televisie. De Berlijnse bijnamen voor de toren zijn talrijk: "de telespargel" (de televisie-asperge), "de Vadertje Walter" (naar de toenmalige Oost-Duitse leider), en altijd met een knipoog naar dat kruis.',
    quiz: { question: 'Hoe hoog is de Fernsehturm in Berlijn?', answers: [{ text: '368 meter', correct: true }, { text: '200 meter' }, { text: '500 meter' }] },
  },
  {
    category: 'history',
    emoji: '🕵️',
    label: 'Berlijn',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Stasi_Zentrale.jpg/600px-Stasi_Zentrale.jpg',
    title: 'De Stasi: De Geheime Politie',
    intro: 'In Oost-Duitsland was er een organisatie die iedereen angst inboezemde: de Stasi, de geheime politie. Ze hielden bijna elke burger in de gaten. Niet met camera\'s of computers zoals nu, maar met mensen — duizenden informanten die hun buren, vrienden, zelfs familieleden bespioneerden en alles doorgaven aan de Stasi. Op het hoogtepunt had de Stasi 91.000 medewerkers in dienst en meer dan 175.000 informanten. In een land van 16 miljoen mensen betekende dat: één spion op elke 63 inwoners. Ze lazen brieven open, luisterden telefoongesprekken af en plakten brieven zo zorgvuldig terug dat niemand het merkte. Ze hielden dossiers bij over miljoenen burgers. Als iemand een grapje maakte over de regering, kon hij de volgende dag zijn baan kwijt zijn of erger.',
    question: 'Hoe zou jij je gedragen als je wist dat iemand altijd meekeek en meeluisterde?',
    deepdive: 'De Stasi had een bizarre methode om mensen te volgen: ze bewaarden de geur van verdachten. Agenten namen stiekem stoelen waarop mensen hadden gezeten mee en sloten die op in glazen potten. Als ze iemand later wilden herkennen, lieten ze honden aan de pot snuffelen. Er zijn nog steeds duizenden van die potten bewaard in het Stasi-museum in Berlijn. Na de val van de muur probeerden Stasi-medewerkers snel hun dossiers te vernietigen. Ze verscheurden miljoenen pagina\'s. Maar burgers stormden de kantoren binnen voordat alles vernietigd was. Nu werken honderden mensen eraan om die papiersnippers — letterlijk miljoenen — met de hand terug in elkaar te puzzelen. Sommige Oost-Duitsers ontdekten pas tientallen jaren later dat hun eigen broer of vriendin hen had bespioneerd.',
    quiz: { question: 'Hoeveel informanten had de Stasi op het hoogtepunt?', answers: [{ text: 'Meer dan 175.000', correct: true }, { text: 'Ongeveer 500' }, { text: 'Meer dan 1 miljoen' }] },
  },
  {
    category: 'technology',
    emoji: '🚗',
    label: 'Berlijn',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Trabant601.jpg/600px-Trabant601.jpg',
    title: 'De Trabant: Auto van het Volk',
    intro: 'In Oost-Duitsland reed bijna iedereen in hetzelfde autootje: de Trabant, of kortweg de "Trabi". Het was een kleine, ronkende auto met een carrosserie van geperst plastic en een tweetaktmotor die een enorme wolk blauwe rook uitspuugde. Je kon de Trabi al van verre horen — en ruiken. Maar voor Oost-Duitsers was de Trabi meer dan een auto: het was een statussymbool. Als je een Trabi wilde kopen, moest je je naam op een wachtlijst zetten. Hoe lang duurde het wachten? Gemiddeld dertien jaar. Je reserveerde de auto nog voor je kind geboren was, en tegen de tijd dat hij geleverd werd, was je kind al op de middelbare school. Na de val van de muur in 1989 reden honderden Oost-Duitsers in hun Trabi naar het westen — de wachtrijen bij benzinestations waren enorm.',
    question: 'Als jij 13 jaar moest wachten op iets wat je echt wou, zou je dan doorzetten of opgeven?',
    deepdive: 'De Trabant werd voor het eerst gebouwd in 1957 en nauwelijks veranderd in de 30 jaar daarna. Terwijl westerse auto\'s steeds veiliger, sneller en comfortabeler werden, bleef de Trabi precies hetzelfde. De motor was zo eenvoudig dat eigenaren hem zelf konden repareren met basale gereedschappen — wat ook nodig was, want onderdelen waren schaars. Na de hereniging werden er massaal Trabis gedumpt: mensen lieten ze gewoon op straat achter en stapten over op westerse auto\'s. Maar de Trabi is nooit echt verdwenen. Vandaag de dag zijn er Trabi-fans over de hele wereld die de autootjes restaureren en verzamelen. In Berlijn kun je toeristische rondritten boeken in een Trabant. Het stinkende, knetterende autootje is een geliefde herinnering aan een rare tijd geworden.',
    quiz: { question: 'Hoe lang moest je gemiddeld wachten op een nieuwe Trabant?', answers: [{ text: '13 jaar', correct: true }, { text: '2 jaar' }, { text: '6 maanden' }] },
  },
];

/* ─── API ────────────────────────────────────────────────── */
const API = {
  me:               '/api/auth/me',
  login:            '/api/auth/login',
  register:         '/api/auth/register',
  logout:           '/api/auth/logout',
  securityQuestion: '/api/auth/security-question',
  resetPassword:    '/api/auth/reset-password',
  wonder:           '/api/progress/wonder',
  wonderReset:      '/api/progress/wonder/reset',
  quiz:             '/api/progress/quiz',
};

/* ─── State ─────────────────────────────────────────────── */
let currentWonder    = null;
let lastWonder       = null;
let activeCategory   = null;
let completedWonders = [];
let quizQuestions    = [];
let currentQuizQ     = 0;
let currentUser      = null;
let serverReadSet    = new Set();  // from server; authoritative when logged in
let serverQuizCount  = 0;
let serverStreak     = 0;
let forgotUsername   = '';
let authMode         = 'login';

const LS_WONDER_COUNT = 'jw_wonder_count';
const LS_QUIZ_COUNT   = 'jw_quiz_count';
const LS_READ_SET     = 'jw_read_set';
const LS_STREAK       = 'jw_streak';
const LS_LAST_ACTIVE  = 'jw_last_active';

function getWonderCount() { return parseInt(localStorage.getItem(LS_WONDER_COUNT) || '0', 10); }
function getQuizCount()   { return currentUser ? serverQuizCount : parseInt(localStorage.getItem(LS_QUIZ_COUNT) || '0', 10); }
function setWonderCount(n){ localStorage.setItem(LS_WONDER_COUNT, String(n)); }
function setQuizCount(n)  { if (!currentUser) localStorage.setItem(LS_QUIZ_COUNT, String(n)); else serverQuizCount = n; }

function getStreak() {
  if (currentUser) return serverStreak;
  return parseInt(localStorage.getItem(LS_STREAK) || '0', 10);
}

function updateGuestStreak() {
  const today = new Date().toISOString().slice(0, 10);
  const last  = localStorage.getItem(LS_LAST_ACTIVE) || '';
  if (last === today) return parseInt(localStorage.getItem(LS_STREAK) || '0', 10);
  const yest = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const s = last === yest ? (parseInt(localStorage.getItem(LS_STREAK) || '0', 10) + 1) : 1;
  localStorage.setItem(LS_STREAK, String(s));
  localStorage.setItem(LS_LAST_ACTIVE, today);
  return s;
}

function updateStreakDisplay(animate) {
  const n = getStreak();
  const wrap = document.getElementById('streak-wrap');
  if (!wrap) return;
  if (n < 1) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'flex';
  document.getElementById('streak-num').textContent = n;
  document.getElementById('streak-plural').textContent = n === 1 ? '' : 'en';
  if (animate && typeof gsap !== 'undefined') {
    gsap.fromTo('#streak-wrap', { scale: 1.25 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
  }
}

function getReadSet() {
  if (currentUser) return serverReadSet;
  try { return new Set(JSON.parse(localStorage.getItem(LS_READ_SET) || '[]')); } catch { return new Set(); }
}

function markWonderRead(w) {
  if (currentUser) {
    serverReadSet.add(w.title);
    fetch(API.wonder, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include',
      body: JSON.stringify({ title: w.title }) })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.streak != null) {
          const prev = serverStreak; serverStreak = data.streak;
          updateStreakDisplay(serverStreak > prev);
        }
      })
      .catch(() => {});
  } else {
    const s = getReadSet(); s.add(w.title);
    localStorage.setItem(LS_READ_SET, JSON.stringify([...s]));
    const prev = getStreak();
    const next = updateGuestStreak();
    updateStreakDisplay(next > prev);
  }
}

function updateProgressBar() {
  const total = WONDERS.length;
  const done  = getReadSet().size;
  const pct   = Math.round((done / total) * 100);
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-text').textContent = done + ' / ' + total;
  document.getElementById('progress-bar').setAttribute('aria-valuenow', done);
}

function updateCategoryStats() {
  const read = getReadSet();
  ['space','animals','history','science','technology','nature'].forEach(cat => {
    const total = WONDERS.filter(w => w.category === cat).length;
    const done  = WONDERS.filter(w => w.category === cat && read.has(w.title)).length;
    const el    = document.getElementById('stat-' + cat);
    if (el) el.querySelector('span').textContent = done + '/' + total;
    if (el) el.classList.toggle('cat-stat-done', done === total && total > 0);
  });
}

function updateCategoryPills() {
  const read = getReadSet();
  document.querySelectorAll('.world-pill').forEach(pill => {
    const cat   = pill.dataset.category;
    const info  = CATEGORY_INFO[cat];
    const total = WONDERS.filter(w => w.category === cat).length;
    const done  = WONDERS.filter(w => w.category === cat && read.has(w.title)).length;
    if (done >= total) {
      pill.style.display = 'none';
      if (activeCategory === cat) activeCategory = null;
    } else {
      pill.style.display = '';
      pill.textContent = `${info.emoji} ${info.label} ${done}/${total}`;
    }
  });
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ─── DOM References ────────────────────────────────────── */
const screenAuth       = document.getElementById('screen-auth');
const screenHero       = document.getElementById('screen-hero');
const screenTransition = document.getElementById('screen-transition');
const screenWonder     = document.getElementById('screen-wonder');
const screenQuiz       = document.getElementById('screen-quiz');
const btnWonder        = document.getElementById('btn-wonder');
const btnContinue      = document.getElementById('btn-lees-verder');
const btnNew           = document.getElementById('btn-opnieuw');
const btnHome          = document.getElementById('btn-home');
const canvasBurst      = document.getElementById('canvas-burst');
const portalFlash      = document.getElementById('portal-flash');
const bgCanvas         = document.getElementById('bg-canvas');
const phase1           = document.getElementById('phase-1');
const phase2           = document.getElementById('phase-2');
const phase3           = document.getElementById('phase-3');
const elTitle          = document.getElementById('content-title');
const elIntro          = document.getElementById('content-intro');
const elQuestion       = document.getElementById('content-philosophy');
const elDeepdive       = document.getElementById('content-deepdive');
const elEmoji          = document.getElementById('wonder-emoji');
const elCategoryTag    = document.getElementById('wonder-category-tag');
const elPhoto          = document.getElementById('wonder-photo');
const elPhotoWrap      = document.getElementById('wonder-photo-wrap');
const wonderScroll     = document.getElementById('wonder-scroll');
const elQuizNum        = document.getElementById('quiz-q-num');
const elQuizQuestion   = document.getElementById('quiz-question');
const elQuizAnswers    = document.getElementById('quiz-answers');
const elQuizCard       = document.getElementById('quiz-card');
const quizDoneOverlay  = document.getElementById('quiz-done');
const btnQuizDone      = document.getElementById('btn-quiz-done');
const quizScoreWrap    = document.getElementById('quiz-score-wrap');
const elQuizScoreNum   = document.getElementById('quiz-score-num');

/* ─── Starfield ─────────────────────────────────────────── */
function initStarfield() {
  const ctx = bgCanvas.getContext('2d');
  let W, H, stars, raf;

  const COLORS = [
    null, null, null,           // mostly white
    'hsl(260,60%,90%)',         // purple tint
    'hsl(190,70%,90%)',         // teal tint
    'hsl(30,80%,90%)',          // gold tint
  ];

  function resize() {
    W = bgCanvas.width  = window.innerWidth;
    H = bgCanvas.height = window.innerHeight;
    stars = Array.from({ length: CFG.STAR_COUNT }, () => ({
      x:      Math.random() * W,
      y:      Math.random() * H,
      r:      0.25 + Math.random() * 1.6,
      speed:  0.04 + Math.random() * 0.1,
      phase:  Math.random() * Math.PI * 2,
      color:  COLORS[Math.floor(Math.random() * COLORS.length)] || '#ffffff',
    }));
  }

  let tick = 0;
  function draw() {
    raf = requestAnimationFrame(draw);
    tick++;
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const alpha = 0.2 + 0.7 * (0.5 + 0.5 * Math.sin(tick * s.speed + s.phase));
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  resize();
  draw();
  window.addEventListener('resize', resize, { passive: true });
}

/* ─── Black Hole Transition ─────────────────────────────── */
function runBurst(onComplete) {
  const ctx = canvasBurst.getContext('2d');
  const W   = canvasBurst.width  = window.innerWidth;
  const H   = canvasBurst.height = window.innerHeight;
  const cx  = W / 2, cy = H / 2;
  const DURATION = CFG.BURST_DURATION; // 700ms

  // Particles spiral inward toward center (black hole suck-in)
  const COUNT = 120;
  const particles = Array.from({ length: COUNT }, (_, i) => {
    const angle  = (i / COUNT) * Math.PI * 2 + Math.random() * 0.3;
    const dist   = 80 + Math.random() * Math.max(W, H) * 0.6;
    return {
      x:     cx + Math.cos(angle) * dist,
      y:     cy + Math.sin(angle) * dist,
      angle: angle + Math.PI,           // points toward center
      dist:  dist,
      speed: 0.04 + Math.random() * 0.05,
      r:     0.8 + Math.random() * 2.2,
      color: ['#a78bfa','#7c3aed','#06b6d4','#67e8f9','#fff'][Math.floor(Math.random() * 5)],
    };
  });

  const start = performance.now();

  function frame(now) {
    const t = Math.min((now - start) / DURATION, 1);
    ctx.clearRect(0, 0, W, H);

    // Dark radial overlay that expands from center
    const holeR = t * Math.max(W, H) * 0.55;
    const grad  = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(holeR, 1));
    grad.addColorStop(0,   'rgba(0,0,0,'   + Math.min(t * 2, 1) + ')');
    grad.addColorStop(0.45,'rgba(4,2,12,'  + Math.min(t * 1.4, 0.95) + ')');
    grad.addColorStop(1,   'rgba(4,2,12,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Event horizon glow ring
    const ringR = Math.max(holeR * 0.18, 2);
    const ring  = ctx.createRadialGradient(cx, cy, ringR * 0.6, cx, cy, ringR * 1.8);
    ring.addColorStop(0,   'rgba(124,58,237,0)');
    ring.addColorStop(0.4, 'rgba(124,58,237,' + (0.6 * t) + ')');
    ring.addColorStop(0.7, 'rgba(6,182,212,'  + (0.4 * t) + ')');
    ring.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = ring;
    ctx.beginPath();
    ctx.arc(cx, cy, ringR * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Spiral particles sucked in
    for (const p of particles) {
      p.dist  = Math.max(0, p.dist - p.dist * p.speed * (1 + t * 3));
      p.angle += 0.07 * (1 + t * 2);
      const px = cx + Math.cos(p.angle) * p.dist;
      const py = cy + Math.sin(p.angle) * p.dist;
      const alpha = (1 - t) * (p.dist / 200);
      if (alpha < 0.01) continue;
      ctx.globalAlpha = Math.min(alpha, 0.85);
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.arc(px, py, p.r * (1 - t * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, W, H);
      onComplete();
    }
  }

  requestAnimationFrame(frame);
}

/* ─── Screen Management ─────────────────────────────────── */
function showScreen(el) {
  [screenAuth, screenHero, screenTransition, screenWonder, screenQuiz].forEach(s => s.classList.remove('active'));
  el.classList.add('active');
}

/* ─── Quiz ──────────────────────────────────────────────── */
function updateQuizScoreDisplay() {
  const count = getQuizCount();
  elQuizScoreNum.textContent = count;
  quizScoreWrap.style.display = count > 0 ? 'flex' : 'none';
}

function startQuiz() {
  const sources = completedWonders.length >= 3
    ? completedWonders.slice(-3)
    : [...completedWonders, ...shuffle(WONDERS.filter(w => !completedWonders.includes(w)))].slice(0, 3);
  quizQuestions = sources.map(w => w.quiz);
  currentQuizQ  = 0;
  quizDoneOverlay.hidden = true;
  showScreen(screenQuiz);
  renderQuestion(0);
}

function renderQuestion(index) {
  elQuizNum.textContent = index + 1;
  const q = quizQuestions[index];
  elQuizQuestion.textContent = q.question;
  elQuizAnswers.innerHTML = '';
  shuffle(q.answers).forEach(ans => {
    const btn = document.createElement('button');
    btn.className    = 'quiz-answer-btn';
    btn.textContent  = ans.text;
    btn.addEventListener('click', () => handleAnswer(btn, !!ans.correct));
    elQuizAnswers.appendChild(btn);
  });
}

function handleAnswer(btn, isCorrect) {
  if (btn.disabled) return;
  if (isCorrect) {
    btn.classList.add('correct');
    elQuizAnswers.querySelectorAll('.quiz-answer-btn').forEach(b => { b.disabled = true; });
    setTimeout(advanceQuiz, 900);
  } else {
    btn.classList.add('wrong');
    setTimeout(() => btn.classList.remove('wrong'), 650);
  }
}

function advanceQuiz() {
  currentQuizQ++;
  if (currentQuizQ < 3) {
    elQuizCard.classList.add('quiz-slide-out');
    elQuizCard.addEventListener('animationend', () => {
      elQuizCard.classList.remove('quiz-slide-out');
      renderQuestion(currentQuizQ);
      elQuizCard.classList.add('quiz-slide-in');
      elQuizCard.addEventListener('animationend', () => elQuizCard.classList.remove('quiz-slide-in'), { once: true });
    }, { once: true });
  } else {
    completeQuiz();
  }
}

function completeQuiz() {
  const newCount = getQuizCount() + 1;
  setQuizCount(newCount);
  if (currentUser) {
    fetch(API.quiz, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include',
      body: JSON.stringify({ score: 3 }) }).catch(() => {});
  }
  updateQuizScoreDisplay();
  quizDoneOverlay.hidden = false;
  if (typeof gsap !== 'undefined') {
    gsap.fromTo('.quiz-done-card',
      { scale: 0.55, opacity: 0, y: 40 },
      { scale: 1, opacity: 1, y: 0, duration: 0.65, ease: 'elastic.out(1, 0.6)' }
    );
  }
}

/* ─── Phase Reveal ──────────────────────────────────────── */
function enterPhase(el) {
  el.classList.remove('hidden', 'entering');
  // Force reflow so animation replays
  void el.offsetWidth;
  el.classList.add('entering');
  el.addEventListener('animationend', () => el.classList.remove('entering'), { once: true });
}

/* ─── Wonder Selection ──────────────────────────────────── */
function pickWonder(category) {
  const read = getReadSet();
  const base = category ? WONDERS.filter(w => w.category === category) : WONDERS;
  // Prefer unread; fall back to all if everything in this category is read
  let pool = base.filter(w => !read.has(w.title));
  if (pool.length === 0) pool = base.length > 0 ? base : WONDERS;
  // Avoid immediate repeat
  let filtered = pool.filter(w => w !== lastWonder);
  if (filtered.length === 0) filtered = pool;
  const pick = filtered[Math.floor(Math.random() * filtered.length)];
  lastWonder    = pick;
  currentWonder = pick;
}

/* ─── Main Flow ─────────────────────────────────────────── */
function startDiscovery(category) {
  pickWonder(category);

  // Button press tactile feedback via GSAP
  const core = btnWonder.querySelector('.cosmos-core');
  if (typeof gsap !== 'undefined' && core) {
    gsap.to(core, {
      scale: 0.86,
      duration: 0.1,
      ease: 'power2.in',
      onComplete() {
        gsap.to(core, { scale: 1, duration: 0.5, ease: 'elastic.out(1.3,0.5)' });
      },
    });
  }

  showScreen(screenTransition);

  runBurst(() => {
    portalFlash.classList.remove('flash-go');
    void portalFlash.offsetWidth;
    portalFlash.classList.add('flash-go');
    setTimeout(() => {
      portalFlash.classList.remove('flash-go');
      revealWonder();
    }, 650);
  });
}

function revealWonder() {
  // Set category theme
  screenWonder.className = `screen cat-${currentWonder.category}`;

  // Populate content
  elTitle.textContent       = currentWonder.title;
  elIntro.textContent       = currentWonder.intro;
  elQuestion.textContent    = currentWonder.question;
  elDeepdive.textContent    = currentWonder.deepdive;
  elEmoji.textContent       = currentWonder.emoji;
  elCategoryTag.textContent = currentWonder.label;

  // Foto preloaden
  elPhotoWrap.classList.remove('photo-loaded', 'photo-error');
  elPhoto.classList.remove('photo-visible');
  elPhoto.src = '';
  const preloader = new Image();
  preloader.onload = () => {
    elPhoto.src = currentWonder.image;
    elPhoto.classList.add('photo-visible');
    elPhotoWrap.classList.add('photo-loaded');
  };
  preloader.onerror = () => elPhotoWrap.classList.add('photo-error');
  preloader.src = currentWonder.image;

  // Reset phases
  [phase1, phase2, phase3].forEach(p => {
    p.classList.remove('entering');
    p.classList.add('hidden');
  });
  wonderScroll.scrollTop = 0;

  markWonderRead(currentWonder);
  updateProgressBar();
  updateCategoryStats();
  updateCategoryPills();

  showScreen(screenWonder);

  setTimeout(() => enterPhase(phase1),                            CFG.PHASE_1_DELAY);
  setTimeout(() => enterPhase(phase2), CFG.PHASE_1_DELAY + CFG.PHASE_2_DELAY);
}

function showPhase3() {
  enterPhase(phase3);
  setTimeout(() => phase3.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
}

function goHome() {
  if (typeof gsap !== 'undefined') {
    gsap.to(screenWonder, {
      opacity: 0,
      y: 16,
      duration: 0.3,
      ease: 'power2.in',
      onComplete() {
        gsap.set(screenWonder, { clearProps: 'all' });
        showScreen(screenHero);
      },
    });
  } else {
    showScreen(screenHero);
  }
}

/* ─── Touch Ripple Easter Egg ───────────────────────────── */
function spawnRipple(x, y) {
  const el = document.createElement('div');
  el.style.cssText = [
    'position:fixed',
    `left:${x}px`,
    `top:${y}px`,
    'width:2px',
    'height:2px',
    'border-radius:50%',
    'background:radial-gradient(circle,rgba(124,58,237,0.55),transparent 70%)',
    'pointer-events:none',
    'z-index:999',
    'transform:translate(-50%,-50%)',
    'animation:ripple-expand 0.7s ease-out forwards',
  ].join(';');
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 750);
}

/* ─── Events ────────────────────────────────────────────── */
btnWonder.addEventListener('click', () => startDiscovery(activeCategory));
btnHome.addEventListener('click', goHome);
btnContinue.addEventListener('click', showPhase3);
btnNew.addEventListener('click', () => {
  completedWonders.push(currentWonder);
  if (completedWonders.length > 3) completedWonders.shift();
  const newCount = getWonderCount() + 1;
  if (newCount >= 3) {
    setWonderCount(0);
    startQuiz();
  } else {
    setWonderCount(newCount);
    startDiscovery(activeCategory);
  }
});
btnQuizDone.addEventListener('click', () => {
  quizDoneOverlay.hidden = true;
  startDiscovery(activeCategory);
});

// Prevent navigating away from quiz with hardware back button
history.pushState(null, '', location.href);
window.addEventListener('popstate', () => {
  if (screenQuiz.classList.contains('active')) {
    history.pushState(null, '', location.href);
  }
});

// Category pills
document.querySelectorAll('.world-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    const cat = pill.dataset.category;
    if (activeCategory === cat) {
      activeCategory = null;
      pill.classList.remove('pill-active');
    } else {
      document.querySelectorAll('.world-pill').forEach(p => p.classList.remove('pill-active'));
      activeCategory = cat;
      pill.classList.add('pill-active');
    }
  });

  // Long-press (600ms) → immediately launch that category
  let pressTimer;
  pill.addEventListener('pointerdown', () => {
    pressTimer = setTimeout(() => startDiscovery(pill.dataset.category), 600);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev =>
    pill.addEventListener(ev, () => clearTimeout(pressTimer))
  );
});

// Tap ripple on wonder screen (anywhere not a button)
screenWonder.addEventListener('pointerdown', e => {
  if (!e.target.closest('button')) spawnRipple(e.clientX, e.clientY);
}, { passive: true });

/* ─── Hero Entry Animation ──────────────────────────────── */
function animateHeroIn() {
  if (typeof gsap === 'undefined') return;
  gsap.timeline({ defaults: { ease: 'expo.out' } })
    .from('.hero-badge',      { y: 22, opacity: 0, duration: 0.7, delay: 0.15 })
    .from('.hero-title',      { y: 32, opacity: 0, duration: 0.8              }, '-=0.45')
    .from('.hero-sub',        { y: 22, opacity: 0, duration: 0.7              }, '-=0.55')
    .from('.btn-cosmos-wrap', { scale: 0.78, opacity: 0, duration: 1.0, ease: 'elastic.out(1,0.6)' }, '-=0.5')
    .from('.worlds-label',    { y: 16, opacity: 0, duration: 0.6              }, '-=0.4')
    .from('.worlds-scroll',   { y: 16, opacity: 0, duration: 0.6              }, '-=0.55')
    .from('.hero-scroll-hint',{ opacity: 0, duration: 0.5                     }, '-=0.3');
}

/* ─── Auth ───────────────────────────────────────────────── */
const authUsernameEl       = document.getElementById('auth-username');
const authPasswordEl       = document.getElementById('auth-password');
const authSubmitBtn        = document.getElementById('auth-submit-btn');
const authToggleBtn        = document.getElementById('auth-toggle-btn');
const authForgotBtn        = document.getElementById('auth-forgot-btn');
const authErrorEl          = document.getElementById('auth-error');
const authSubEl            = document.getElementById('auth-sub');
const authRegisterFields   = document.getElementById('auth-register-fields');
const authSecurityQuestion = document.getElementById('auth-security-question');
const authSecurityAnswer   = document.getElementById('auth-security-answer');
const btnLogout            = document.getElementById('btn-logout');

function setAuthError(msg) { authErrorEl.textContent = msg; authErrorEl.style.display = msg ? 'block' : 'none'; }

function setAuthMode(mode) {
  authMode = mode;
  setAuthError('');
  const isLogin   = mode === 'login',  isReg = mode === 'register';
  const isForgotU = mode === 'forgot-username', isForgotA = mode === 'forgot-answer';
  authUsernameEl.style.display   = isForgotA ? 'none' : '';
  authPasswordEl.style.display   = isForgotU ? 'none' : '';
  authRegisterFields.style.display = (isReg||isForgotA) ? 'flex' : 'none';
  authSecurityQuestion.style.display = isForgotA ? 'none' : '';
  authForgotBtn.style.display    = isLogin ? '' : 'none';
  authToggleBtn.style.display    = (isForgotU||isForgotA) ? 'none' : '';
  document.getElementById('auth-guest-btn').style.display = (isForgotU||isForgotA) ? 'none' : '';
  if (isLogin)   { authSubEl.textContent='Log in om je voortgang bij te houden'; authSubmitBtn.textContent='Inloggen'; authToggleBtn.innerHTML='Nog geen account? <span>Registreer je hier</span>'; }
  if (isReg)     { authSubEl.textContent='Maak een account aan'; authSubmitBtn.textContent='Account aanmaken'; authToggleBtn.innerHTML='Al een account? <span>Log hier in</span>'; authSecurityAnswer.placeholder='jouw antwoord'; }
  if (isForgotU) { authSubEl.textContent='Vul je gebruikersnaam in'; authSubmitBtn.textContent='Beveiligingsvraag ophalen'; }
  if (isForgotA) { authSubEl.textContent=`Beveiligingsvraag voor "${forgotUsername}"`; authSubmitBtn.textContent='Wachtwoord opnieuw instellen'; authPasswordEl.placeholder='nieuw wachtwoord'; authSecurityAnswer.placeholder='jouw antwoord op de beveiligingsvraag'; }
}

async function submitAuth() {
  authSubmitBtn.disabled = true; setAuthError('');
  try {
    if (authMode==='login')            await doLogin();
    else if (authMode==='register')    await doRegister();
    else if (authMode==='forgot-username') await doForgotUsername();
    else if (authMode==='forgot-answer')   await doForgotAnswer();
  } catch(_) { setAuthError('Kan de server niet bereiken.'); }
  finally { authSubmitBtn.disabled = false; }
}

async function doLogin() {
  const username=authUsernameEl.value.trim(), password=authPasswordEl.value;
  if (!username||!password) { setAuthError('Vul alle velden in.'); return; }
  const res = await fetch(API.login,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({username,password})});
  const data = await res.json();
  if (!res.ok) { setAuthError(data.error||'Onjuiste gegevens.'); return; }
  await loadUserAndEnter();
}

async function doRegister() {
  const username=authUsernameEl.value.trim(), password=authPasswordEl.value;
  const question=authSecurityQuestion.value, answer=authSecurityAnswer.value.trim();
  if (!username||!password||!question||!answer) { setAuthError('Vul alle velden in.'); return; }
  const res = await fetch(API.register,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({username,password,security_question:question,security_answer:answer})});
  const data = await res.json();
  if (!res.ok) { setAuthError(data.error||'Er ging iets mis.'); return; }
  await loadUserAndEnter();
}

async function doForgotUsername() {
  const username=authUsernameEl.value.trim();
  if (!username) { setAuthError('Vul je gebruikersnaam in.'); return; }
  const res = await fetch(`${API.securityQuestion}?username=${encodeURIComponent(username)}`);
  const data = await res.json();
  if (!res.ok) { setAuthError(data.error||'Gebruiker niet gevonden.'); return; }
  forgotUsername=username; authSubEl.textContent=data.question; setAuthMode('forgot-answer');
}

async function doForgotAnswer() {
  const answer=authSecurityAnswer.value.trim(), newPass=authPasswordEl.value;
  if (!answer||!newPass) { setAuthError('Vul het antwoord en een nieuw wachtwoord in.'); return; }
  const res = await fetch(API.resetPassword,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:forgotUsername,security_answer:answer,new_password:newPass})});
  const data = await res.json();
  if (!res.ok) { setAuthError(data.error||'Antwoord onjuist.'); return; }
  authPasswordEl.value=''; authSecurityAnswer.value='';
  authSubEl.textContent='Wachtwoord opnieuw ingesteld! Log nu in.'; setAuthMode('login');
}

function enterHero() {
  const heroGreeting = document.getElementById('hero-greeting');
  if (heroGreeting) heroGreeting.textContent = currentUser ? `Hé ${currentUser.username}!` : 'Hé James!';
  btnLogout.textContent = currentUser ? 'Uitloggen' : '← Inloggen';
  updateProgressBar(); updateCategoryStats(); updateCategoryPills(); updateQuizScoreDisplay(); updateStreakDisplay(false);
  showScreen(screenHero); animateHeroIn();
}

async function loadUserAndEnter() {
  try {
    const res = await fetch(API.me,{credentials:'include'});
    if (!res.ok) { showScreen(screenAuth); return; }
    const data = await res.json();
    currentUser     = {id:data.id, username:data.username};
    serverReadSet   = new Set(data.seen_titles||[]);
    serverQuizCount = data.quiz_count||0;
    serverStreak    = data.streak||0;
    enterHero();
  } catch(_) {
    showScreen(screenAuth);
    setAuthError('Server niet bereikbaar. Je kunt doorgaan als gast ↓');
  }
}

async function logout() {
  if (currentUser) {
    await fetch(API.logout,{method:'POST',credentials:'include'}).catch(()=>{});
  }
  currentUser=null; serverReadSet=new Set(); serverQuizCount=0; serverStreak=0;
  authUsernameEl.value=''; authPasswordEl.value=''; setAuthError('');
  setAuthMode('login'); showScreen(screenAuth);
}

authSubmitBtn.addEventListener('click', submitAuth);
authToggleBtn.addEventListener('click', ()=>setAuthMode(authMode==='login'?'register':'login'));
authForgotBtn.addEventListener('click', ()=>setAuthMode('forgot-username'));
document.getElementById('auth-guest-btn').addEventListener('click', ()=>{ currentUser=null; enterHero(); });
[authUsernameEl,authPasswordEl,authSecurityAnswer].forEach(el=>el.addEventListener('keydown',e=>{if(e.key==='Enter')submitAuth();}));
btnLogout.addEventListener('click', logout);

/* ─── Init ──────────────────────────────────────────────── */
initStarfield();
loadUserAndEnter();
