/**
 * Redactionele inhoud van /vlogcameras: de rangschikking, de keuzehulp, de criteria en
 * de FAQ. Net als lib/reviews.ts bewust gescheiden van de productfeed — de feed verandert
 * mee met prijs en voorraad, een rangschikking alleen als wij hem herzien.
 *
 * De onderbouwing per plek verwijst naar de vlog-kolommen op het product (klapscherm,
 * stabilisatie, aansluitingen, opnameduur, gewicht) en naar lib/external-reviews.ts. Waar
 * een veld op een product leeg is, is dat omdat we het niet op de officiële productpagina
 * van de fabrikant konden staven; dan staat het hier ook niet als argument.
 */

export type VlogEntry = {
  id: string;
  /** Waarom deze camera op deze plek staat, en niet een plek hoger of lager. */
  why: string;
  /** Voor wie dit de juiste keuze is. */
  forWho: string;
  /** Voor wie juist niet. */
  notForWho: string;
  /** De concrete beperking die je accepteert als je dit toestel koopt. */
  tradeoff: string;
};

/**
 * De volgorde is de rangschikking. Gerangschikt op wat een vlogger dagelijks merkt:
 * eerst of het scherm naar voren klapt en of je een microfoon kwijt kunt, dan hoe lang
 * het toestel doorloopt, dan hoe zwaar het is. Beeldkwaliteit is bewust géén
 * doorslaggevend criterium: op deze tien toestellen is die goed genoeg, en het verschil
 * tussen een goede en een slechte vlog zit in geluid en stabiliteit.
 */
export const VLOG_TOP10: VlogEntry[] = [
  {
    id: "CAM-005",
    why: "Het enige toestel in deze lijst dat álle vier de basisdingen goed doet: een scherm dat volledig opzij klapt, een microfooningang, een koptelefoonaansluiting om mee te luisteren en een accu die volgens Sony 130 minuten video haalt. Daar komt de beste autofocus van deze lijst bij (759 fasedetectiepunten), en omdat het een systeemcamera is kun je later een lichtsterkere lens kopen zonder van camera te wisselen. Geen enkel ander model hier combineert dat.",
    forWho:
      "Wie regelmatig video maakt en niet elk half jaar wil upgraden. Vooral sterk voor praten voor de camera, aan tafel of op statief.",
    notForWho:
      "Wie vooral al lopend filmt. Zonder stabilisatie in de body ben je aangewezen op de elektronische variant, en die kost beeldhoek.",
    tradeoff:
      "Geen stabilisatie in de body. Voor wandelende opnames heb je een gestabiliseerde lens of een gimbal nodig.",
  },
  {
    id: "CAM-011",
    why: "De enige met een echte mechanische gimbal, en dat is geen detail: alle andere toestellen hier corrigeren beweging digitaal, wat neerkomt op inzoomen en gladstrijken. De Pocket 3 houdt de lens fysiek stil. Met 179 gram is hij bovendien minder dan de helft van de lichtste systeemcamera hier, en het scherm draait mee zodat staand filmen (9:16) niet achteraf hoeft te worden bijgesneden. Staat op twee en niet op één omdat er geen microfooningang op zit.",
    forWho:
      "Wie lopend, reizend of met één hand filmt, en wie vooral staande video voor telefoons maakt.",
    notForWho:
      "Wie een bedrade microfoon wil gebruiken of later andere lenzen wil kunnen kiezen.",
    tradeoff:
      "Geen 3.5mm-microfooningang op het toestel. Voor beter geluid ben je aangewezen op DJI's eigen draadloze microfoons.",
  },
  {
    id: "CAM-015",
    why: "De enige camera in deze top 10 met stabilisatie in de body (7 stops sensor-shift) én een koptelefoonaansluiting. Die combinatie betekent dat je uit de hand kunt filmen zonder gimbal en tegelijk hoort wat je opneemt — de twee dingen die vlogs het vaakst onbruikbaar maken. Staat op drie in plaats van hoger omdat Trusted Reviews hem na 20 minuten 4K/60p zag afslaan op temperatuur.",
    forWho:
      "Wie al met statief, microfoon en lampen op pad gaat en een camera wil die daarop aansluit. Ook sterk als je net zoveel fotografeert als filmt.",
    notForWho: "Wie in één ruk lange interviews of evenementen wil opnemen zonder koeling.",
    tradeoff:
      "Loopt bij 4K 60p warm en kan afslaan. Voor lange opnames heb je de optionele koelventilator nodig — een extra aankoop.",
  },
  {
    id: "CAM-014",
    why: "De goedkoopste route naar een systeemcamera met zoeker die ook serieus video maakt. 375 gram, een scherm dat volledig naar voren klapt, een microfooningang en Canons Dual Pixel CMOS AF II met 651 zones die je gezicht vasthoudt zonder dat je iets instelt. De 4K komt uit een 6K-uitlezing en is daardoor scherper dan de resolutie doet vermoeden. Cameralabs mat er 1 uur en 13 minuten 4K op één accu mee, zonder oververhitting.",
    forWho:
      "Beginners die met een echte camera willen beginnen en later lenzen willen kunnen wisselen. Ook prettig als je afwisselend fotografeert.",
    notForWho: "Wie lopend filmt of zijn geluid tijdens de opname wil kunnen controleren.",
    tradeoff:
      "Clips stoppen na 60 minuten en er is geen koptelefoonaansluiting. Je hoort pas achteraf of je microfoon het deed.",
  },
  {
    id: "CAM-009",
    why: "Dezelfde sensor en autofocus als de ZV-E10 II, maar dan mét stabilisatie in de body (5 assen, circa 5 stops), een zoeker en beide audio-aansluitingen. Dat maakt hem de sterkste keuze van deze lijst als je net zoveel fotografeert als filmt. Staat onder de ZV-E10 II omdat hij zwaarder is, geen speciale vlogfuncties heeft en volgens Trusted Reviews rond de 30 minuten kan afslaan in de zwaardere 4K-modi.",
    forWho:
      "Hybride makers: wie foto's en video even serieus neemt en één camera voor allebei wil.",
    notForWho: "Wie alleen video maakt — dan betaal je voor fotofuncties die je niet gebruikt.",
    tradeoff:
      "Geen actieve koeling. Reken op circa een half uur voordat het toestel er bij zware 4K-instellingen mee kan stoppen.",
  },
  {
    id: "CAM-013",
    why: "De enige full-frame camera hier, en met 483 gram lichter dan de meeste APS-C-modellen. De 12,1 megapixel sensor is een bewuste keuze: grotere pixels vangen meer licht, en 4K is niet meer dan 8 megapixel. In donkere ruimtes waar de rest van deze lijst zichtbaar ruist, filmt dit toestel gewoon door. Niet hoger omdat oververhitting hier het duidelijkst is gemeten: Trusted Reviews kwam op 25 minuten 4K/60p, Cameralabs op 52 minuten 4K 50p.",
    forWho:
      "Wie 's avonds, binnen of in slecht verlichte ruimtes filmt en de beste beeldkwaliteit van deze lijst wil.",
    notForWho: "Wie ook fotografeert — 12 megapixel laat weinig ruimte om bij te snijden.",
    tradeoff:
      "Slaat bij lang filmen af op temperatuur, en er is geen zoeker. In fel zonlicht zie je je scherm slecht.",
  },
  {
    id: "CAM-016",
    why: "Met 405 gram inclusief accu de lichtste systeemcamera van deze lijst, met een volledig uitklapbaar scherm en een microfooningang bovenop. Precies de basis die je nodig hebt, zonder meer. Staat op zeven en niet hoger omdat er drie dingen ontbreken die de modellen erboven wel hebben: stabilisatie, een koptelefoonaansluiting en 4K boven de 30 beelden per seconde.",
    forWho:
      "Wie een lichte camera met verwisselbare lenzen wil en het bij 4K 30p kan laten.",
    notForWho: "Wie slow motion in 4K wil, of zijn geluid wil kunnen meeluisteren.",
    tradeoff:
      "Geen stabilisatie in de body en geen koptelefoonaansluiting. 4K gaat niet verder dan 30 beelden per seconde.",
  },
  {
    id: "CAM-012",
    why: "De beste autofocus die je in een broekzakformaat krijgt, met een gerichte driecapsule-microfoon en windkap in de doos en een microfooningang voor als dat niet genoeg is. 292 gram inclusief accu. Staat op acht omdat Sony bij deze generatie de optische stabilisatie schrapte — Trusted Reviews noemt dat onbegrijpelijk — en omdat de accu het na circa 45 minuten video laat afweten.",
    forWho: "Wie een camera wil die altijd mee kan en vooral zittend of stilstaand filmt.",
    notForWho: "Wie lopend filmt, of langer dan drie kwartier achter elkaar opneemt.",
    tradeoff:
      "Alleen elektronische stabilisatie, en circa 45 minuten accuduur. Reservevoeding is geen luxe.",
  },
  {
    id: "CAM-018",
    why: "Waterdicht tot tien meter zonder losse behuizing en met HyperSmooth 6.0 de sterkste digitale stabilisatie die er is — beeld uit de hand ziet er uit als gimbalwerk. Ruim 90 minuten 4K 30p op één accu, en GP-Log voor wie de kleuren achteraf wil corrigeren. Staat laag omdat hij op de twee vlogbasics faalt: er is geen microfooningang en geen scherm dat naar je toe klapt.",
    forWho:
      "Wie filmt op de fiets, in het water of op plekken waar een systeemcamera niet heen kan.",
    notForWho: "Wie praat voor de camera. Kadreren op het kleine frontscherm blijft gokwerk.",
    tradeoff:
      "Geen microfooningang zonder de Media Mod of de Pro 3.5mm-adapter — een extra aankoop bovenop de camera.",
  },
  {
    id: "CAM-017",
    why: "Het eenvoudigste toestel hier: 211 gram, een uitklapbaar standaardje zodat hij zelf rechtop op tafel staat, een scherm dat 180 graden omhoog kantelt en — verrassend op dit formaat — een 3.5mm-microfooningang. De reviewers zijn het hier het minst eens: Cameralabs noemt hem Highly Recommended omdat hij vanaf nul voor videomakers is ontworpen, Trusted Reviews vindt dat hij een telefoon niet vervangt. Beide oordelen staan hieronder met bron.",
    forWho:
      "Wie vanaf een vaste plek praat — aan een bureau, aan tafel — en zo min mogelijk knoppen wil.",
    notForWho:
      "Wie beweegt of snel wisselende onderwerpen filmt. De contrastdetectie-autofocus is de traagste van deze lijst.",
    tradeoff:
      "Alleen digitale stabilisatie die fors in het beeld snijdt, en een scherm van 2 inch waarop nauwkeurig kadreren niet lukt.",
  },
];

/** Modellen die je vaak in dit soort lijstjes ziet en waarom ze hier niet staan. */
export const NOT_SELECTED = [
  {
    model: "Panasonic Lumix G100D",
    reason:
      "Op papier een vlogcamera, maar de autofocus werkt op contrastdetectie en de opnameduur in 4K is kort. De Nikon Z30 en Canon EOS R50 doen in dezelfde klasse hetzelfde beter.",
  },
  {
    model: "Een telefoon",
    reason:
      "Voor veel vloggers een prima startpunt. Het verschil zit niet in de beeldkwaliteit bij daglicht, maar in geluid: op geen enkele telefoon sluit je zonder adapter een bedrade microfoon aan, en dat is het eerste wat kijkers opvalt.",
  },
];

export type VloggerProfile = {
  slug: string;
  label: string;
  /** Korte omschrijving van de situatie, zodat de bezoeker zichzelf herkent. */
  situation: string;
  /** Wat in deze situatie het zwaarst weegt. */
  decisive: string;
  pickId: string;
  pickReason: string;
  alternativeId: string;
  alternativeReason: string;
};

/**
 * De keuzehulp filtert niet, hij legt uit. Filteren levert een lijst op waarvan de
 * bezoeker niet weet waarom die zo is; deze vijf profielen benoemen eerst wat in die
 * situatie doorslaggevend is en pas daarna welk toestel dat het beste doet.
 */
export const VLOGGER_PROFILES: VloggerProfile[] = [
  {
    slug: "praten",
    label: "Ik praat voor de camera",
    situation:
      "Je zit of staat stil: aan een bureau, aan tafel, of voor een achtergrond. De camera beweegt niet mee.",
    decisive:
      "Stabilisatie doet er nauwelijks toe — je beweegt immers niet. Wat wél telt is geluid en scherpstelling: een microfooningang, een koptelefoonaansluiting om te horen wat je opneemt, en autofocus die je gezicht vasthoudt als je naar voren leunt.",
    pickId: "CAM-005",
    pickReason:
      "Heeft alle drie: microfooningang, koptelefoonaansluiting en de beste autofocus van deze lijst. Dat het toestel geen stabilisatie in de body heeft, merk je in deze situatie niet.",
    alternativeId: "CAM-014",
    alternativeReason:
      "Dezelfde opzet met een zoeker erbij, maar zonder koptelefoonaansluiting: je hoort pas achteraf of je microfoon het deed.",
  },
  {
    slug: "reizen",
    label: "Ik film onderweg",
    situation:
      "Je filmt lopend, uit de hand, vaak met één hand, en wat je meeneemt moet in een jaszak of een kleine tas passen.",
    decisive:
      "Stabilisatie en gewicht bepalen alles. Digitale stabilisatie strijkt beweging glad door in te zoomen, wat beeldhoek kost; een mechanische gimbal houdt de lens fysiek stil en kost niets.",
    pickId: "CAM-011",
    pickReason:
      "De enige met een echte mechanische gimbal, en met 179 gram minder dan de helft van de lichtste systeemcamera hier. Het scherm draait mee, dus staande video hoeft achteraf niet bijgesneden.",
    alternativeId: "CAM-016",
    alternativeReason:
      "Als je wél lenzen wilt kunnen wisselen: met 405 gram de lichtste systeemcamera hier — maar zonder stabilisatie in de body, dus reken op een gestabiliseerde lens.",
  },
  {
    slug: "spullen",
    label: "Ik ga met veel spullen op pad",
    situation:
      "Statief, losse microfoon, lampjes, misschien een tweede lens. De camera is één onderdeel van een set die je toch al meesleept.",
    decisive:
      "Aansluitingen en veelzijdigheid. Je wilt een microfoon én een koptelefoon kwijt kunnen, verwisselbare lenzen, en stabilisatie in de body zodat je niet ook nog een gimbal hoeft mee te nemen.",
    pickId: "CAM-015",
    pickReason:
      "De enige hier met stabilisatie in de body (7 stops) én een koptelefoonaansluiting. Daarmee vervangt hij je gimbal en je gok over het geluid in één keer.",
    alternativeId: "CAM-009",
    alternativeReason:
      "Zelfde aansluitingen en ook stabilisatie in de body, plus een zoeker. Kies deze als je net zoveel fotografeert als filmt.",
  },
  {
    slug: "budget",
    label: "Ik wil zo min mogelijk uitgeven",
    situation: "Je begint, en je wilt weten wat je minimaal nodig hebt voordat je meer uitgeeft.",
    decisive:
      "Niet de sensor maar de microfooningang. Een camera zonder microfooningang zit voor vloggen op een dood spoor, hoe goed het beeld ook is — en juist die ingang is wat de goedkoopste modellen het vaakst missen.",
    pickId: "CAM-017",
    pickReason:
      "Het eenvoudigste toestel hier, en toch met een 3.5mm-microfooningang en een scherm dat naar je toe kantelt. Genoeg om te beginnen als je vanaf een vaste plek praat.",
    alternativeId: "CAM-016",
    alternativeReason:
      "Als je meteen met verwisselbare lenzen wilt beginnen: dezelfde vlogbasis, maar dan als systeemcamera die je jaren kunt uitbouwen.",
  },
  {
    slug: "beginner",
    label: "Ik begin net",
    situation:
      "Je hebt nog geen camera en wilt er niet in verdwalen. Aanzetten en filmen, met ruimte om later meer te leren.",
    decisive:
      "Dat het toestel goede beslissingen voor je neemt. Betrouwbare gezichtsherkenning, een scherm dat je jezelf laat zien, en een systeem dat meegroeit zodat je niet over een jaar opnieuw begint.",
    pickId: "CAM-014",
    pickReason:
      "Autofocus die je gezicht vasthoudt zonder instellingen, een zoeker voor fel zonlicht, en een lensvatting waar je jarenlang op vooruit kunt.",
    alternativeId: "CAM-011",
    alternativeReason:
      "Wil je helemaal niet aan instellingen denken: aanzetten, gimbal doet de rest. Je levert er verwisselbare lenzen en een microfooningang voor in.",
  },
];

export type Criterion = {
  title: string;
  body: string;
};

/** Waarom de kolommen in de vergelijkingstabel de kolommen zijn die er staan. */
export const CRITERIA: Criterion[] = [
  {
    title: "Een scherm dat naar voren klapt",
    body: "Zonder klapscherm film je jezelf blind. Je weet niet of je hoofd in beeld staat, of je scherp bent, of dat je halverwege uit het kader gelopen bent — dat zie je pas thuis, als opnieuw opnemen geen optie meer is. Het is het enige punt op deze lijst waar geen enkele workaround voor bestaat. Let ook op het type: een scherm dat volledig opzij klapt blijft vrij van je microfoon op de hotshoe, een scherm dat over de bovenkant kantelt niet.",
  },
  {
    title: "Een microfoon-ingang",
    body: "Kijkers vergeven korrelig beeld en zappen weg bij slecht geluid. De ingebouwde microfoon van een camera zit altijd op de camera en dus op een meter of twee afstand van je mond, met alle ruimtegalm en verkeersgeluid daartussen. Een microfoon van dertig euro op je kraag doet meer voor je video dan duizend euro extra camera. Een toestel zonder 3.5mm-ingang dwingt je in het systeem van die fabrikant of in een adapter.",
  },
  {
    title: "Opnameduur en oververhitting",
    body: "Camera's die 4K opnemen worden warm, en veel modellen schakelen zichzelf uit voordat je klaar bent. Daarnaast hanteren sommige fabrikanten een harde limiet per clip — de Canon EOS R50 knipt na 60 minuten. Voor een vlog van acht minuten maakt dat niets uit; voor een interview, een presentatie of een livestream is het het verschil tussen bruikbaar en onbruikbaar. Fabrikanten publiceren dit vrijwel nooit, dus komt het uit reviews waarin het gemeten is.",
  },
  {
    title: "Gewicht, met accu",
    body: "Een camera die je niet meeneemt maakt geen video's. Let op dat fabrikanten graag het gewicht zónder accu en kaart noemen; dat scheelt tachtig tot honderd gram. Alle gewichten in de tabel hieronder zijn inclusief accu. Op een uitgestoken arm is het verschil tussen 179 en 491 gram binnen een minuut voelbaar.",
  },
  {
    title: "En waarom megapixels hier niet in staan",
    body: "4K-video is 8,3 megapixel. Elke camera in deze lijst heeft er meer dan het dubbele, dus de resolutie van de sensor is voor video nooit de beperkende factor — hij bepaalt alleen hoe fors je een foto kunt bijsnijden. De Sony ZV-E1 heeft de laagste resolutie van deze tien (12,1 MP) en levert het beste beeld bij weinig licht, precies omdat grotere pixels meer licht opvangen. Wie op megapixels vergelijkt, vergelijkt het verkeerde getal.",
  },
];

export type FaqItem = {
  question: string;
  answer: string;
};

export const VLOG_FAQ: FaqItem[] = [
  {
    question: "Heb ik een full-frame camera nodig om te vloggen?",
    answer:
      "Nee. Full-frame helpt op één punt: bij weinig licht. Een grotere sensor vangt meer licht op, dus binnen of 's avonds houd je een schoner beeld. Bij daglicht ziet niemand het verschil tussen full-frame en APS-C in een video van 1080p of 4K op een telefoonscherm. Bovendien kosten full-frame lenzen meer en wegen ze meer, en juist bij vloggen wil je een brede lens — waarvoor je op APS-C goedkoper uit bent. Alleen de Sony ZV-E1 in deze lijst is full-frame; de negen andere zijn dat niet, en die staan er niet zomaar in.",
  },
  {
    question: "Wat is oververhitting precies, en overkomt het mij ook?",
    answer:
      "Een camera die 4K opneemt verwerkt continu enorm veel data in een klein, dichtgesloten huis. Wordt de sensor te warm, dan stopt de camera de opname en moet hij afkoelen — bij de meeste toestellen zonder waarschuwing vooraf. Hoe eerder dat gebeurt hangt af van de resolutie, het aantal beelden per seconde en de temperatuur om je heen: op een terras in de zon gaat het sneller dan binnen. Merk je het? Bij vlogs van vijf tot tien minuten vrijwel nooit. Neem je interviews, presentaties of lessen op, dan wel. In de tabel hierboven staat per camera of reviewers het gemeten hebben, met hoeveel minuten en bij welke instelling.",
  },
  {
    question: "Waarom klinkt mijn audio slecht terwijl mijn beeld goed is?",
    answer:
      "Omdat je de microfoon van de camera gebruikt, en die zit op de camera. Op anderhalve meter afstand vangt hij alles op wat tussen jou en het toestel zit: galm van de muren, het verkeer buiten, de koelkast. Je oren filteren dat weg terwijl je opneemt, een microfoon niet. De oplossing is niet een betere camera maar een microfoon dichter bij je mond: een dasspeldmicrofoon van dertig euro in de 3.5mm-ingang lost negentig procent op. Wil je zekerheid, kies dan een camera met koptelefoonaansluiting — dan hoor je tijdens de opname of het goed gaat, in plaats van erna.",
  },
  {
    question: "Heb ik een gimbal nodig?",
    answer:
      "Alleen als je filmt terwijl je loopt. Zit of sta je stil, dan voegt een gimbal niets toe en heb je vooral een extra ding om op te laden en mee te zeulen. Loop je wel, dan zijn er drie routes: een camera met stabilisatie in de body (in deze lijst de Fujifilm X-S20, Sony A6700 en Sony ZV-E1), een losse gimbal onder je camera, of een toestel met een ingebouwde gimbal zoals de DJI Osmo Pocket 3. Digitale stabilisatie is de vierde optie en de goedkoopste, maar die zoomt in om ruimte te maken voor de correctie — je verliest beeldhoek, precies waar je die bij zelfopnames het hardst nodig hebt.",
  },
  {
    question: "Wat koop ik het eerst als ik geld overhoud?",
    answer:
      "Een microfoon, daarna licht, en pas daarna een betere camera of lens. Die volgorde is bijna altijd dezelfde, omdat kijkers slecht geluid binnen enkele seconden afstraffen en donker beeld bijna net zo snel. Een goedkope camera met een fatsoenlijke microfoon en een lamp ziet er beter uit dan een dure camera zonder allebei.",
  },
  {
    question: "Waarom staan er geen prijzen bij een deel van deze camera's?",
    answer:
      "Omdat we ze niet uit een geverifieerde winkelfeed hebben. De prijzen die je op deze site ziet horen uit de feed van de winkel te komen; waar die er nog niet is, laten we het bedrag liever leeg dan dat we een getal tonen dat niemand gecontroleerd heeft. Klik door naar de winkel voor de actuele prijs.",
  },
];

export const VLOG_DISCLOSURE =
  "Deze rangschikking is samengesteld op basis van de gepubliceerde specificaties van de " +
  "fabrikanten en van metingen en conclusies uit gepubliceerde reviews, met bronvermelding " +
  "per camera. We hebben deze camera's niet zelf getest. Specificaties die we niet op de " +
  "officiële productpagina van de fabrikant konden staven, staan als “—” in de " +
  "tabel: dat betekent “niet geverifieerd” en niet “nee”.";
