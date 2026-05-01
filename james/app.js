/* ═══════════════════════════════════════════════════════════════
   PSV Fan Challenge — Immersive Experience
   Vanilla JS · Canvas 2D starfield · GSAP animations
   No external JS dependencies beyond GSAP (loaded via CDN).
═══════════════════════════════════════════════════════════════ */
'use strict';

/* ─── Config ────────────────────────────────────────────── */
const CATEGORY_INFO = {
  legendes:     { emoji: '🌟', label: 'Legendes' },
  prijzen:      { emoji: '🏆', label: 'Prijzen' },
  geschiedenis: { emoji: '📜', label: 'Geschiedenis' },
  stadion:      { emoji: '🏟️', label: 'Stadion' },
  records:      { emoji: '📊', label: 'Records' },
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
  /* ── LEGENDES ──────────────────────────────────────── */
  {
    category: 'legendes',
    emoji: '🌟',
    label: 'Legendes',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/PSV_Eindhoven.svg/600px-PSV_Eindhoven.svg.png',
    title: 'Willy van der Kuijlen — De Schicht van het Zuiden',
    intro: 'Willy van der Kuijlen is de absolute topscorer aller tijden van PSV. In zijn carrière bij de club scoorde hij 308 Eredivisie-goals in 373 officiële wedstrijden — een record dat tot op de dag van vandaag staat. Van 1964 tot 1980 was hij het hart en de ziel van PSV, en werd hij door fans en tegenstanders gevreesd vanwege zijn explosieve snelheid en onnavolgbare schietkracht. Zijn bijnaam "De Schicht van het Zuiden" was dan ook volledig verdiend. Van der Kuijlen won met PSV liefst twaalf Eredivisie-titels. Hij was een man die in elke wedstrijd het verschil kon maken, die tegenstanders in hun hemd zette met een versnelling of een onverwacht schot. Ondanks zijn indrukwekkende statistieken speelde hij nooit een WK — iets wat tot op heden een pijnlijk gemis is in zijn glorieuze carrière.',
    question: 'Waarom worden sommige spelers echte legendes, terwijl anderen met evenveel talent worden vergeten?',
    deepdive: 'Van der Kuijlen scoorde zo veel dat hij in sommige seizoenen meer dan 30 competitiedoelpunten maakte. Hij speelde zijn hele topcarrière bij PSV — een zeldzame loyaliteit in een tijd dat spelers steeds vaker naar het buitenland trokken. Zijn record van 308 Eredivisie-goals voor één club staat nog altijd en zal vermoedelijk nooit worden gebroken. PSV eerde hem later met een standbeeld buiten het Philips Stadion. Als je ooit langs het stadion loopt, kijk dan goed: daar staat hij, in brons gegoten, voor eeuwig klaar om te schieten.',
    quiz: [
      { question: 'Hoeveel Eredivisie-goals scoorde Willy van der Kuijlen voor PSV?', answers: [{ text: '308 goals', correct: true }, { text: '200 goals' }, { text: '150 goals' }] },
      { question: 'Welke bijnaam had Willy van der Kuijlen?', answers: [{ text: '"De Schicht van het Zuiden"', correct: true }, { text: '"De Tornado van Brabant"' }, { text: '"De Vos van Eindhoven"' }] },
      { question: 'Hoeveel Eredivisie-titels won Van der Kuijlen met PSV?', answers: [{ text: '12 titels', correct: true }, { text: '5 titels' }, { text: '20 titels' }] },
    ],
  },
  {
    category: 'legendes',
    emoji: '⚡',
    label: 'Legendes',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Ruud_van_Nistelrooy.jpg/600px-Ruud_van_Nistelrooy.jpg',
    title: 'Ruud van Nistelrooy — De Killer van de Eredivisie',
    intro: 'Ruud van Nistelrooy is misschien wel de meest klinische doelpuntenmaker die PSV ooit heeft gehad. In slechts 67 Eredivisie-wedstrijden scoorde hij 62 keer — een buitengewone verhouding die hem snel in de kijker speelde van de grootste clubs ter wereld. PSV haalde hem in 1998 op nadat hij zijn kruisband had gescheurd bij Den Haag. Velen dachten dat zijn carrière al voorbij was voor ze begon. Maar Van Nistelrooy bewees het tegendeel. Na een pijnlijk revalidatietraject pakte hij door met een honger die misschien werd aangewakkerd door al die verloren maanden. Zijn goals waren zelden geflatteerd: hij was koelbloedig, raak en efficiënt. In 2001 vertrok hij naar Manchester United voor 19 miljoen euro — op dat moment een recordbedrag voor een Nederlandse speler.',
    question: 'Is een speler die PSV verlaat voor een groot buitenlands avontuur een held of een verrader van de club?',
    deepdive: 'Bij Manchester United scoorde Van Nistelrooy in zijn eerste vier seizoenen maar liefst 95 Premier League-goals. Hij won de Gouden Schoen als beste speler van Europa in 2002. Later speelde hij nog voor Real Madrid, Hamburg en Málaga. In 2023 keerde hij terug bij PSV — maar nu als hoofdcoach. Onder zijn leiding werd PSV in 2023 voor de 24e keer landskampioen. Van Nistelrooy is daarmee zowel als speler als als coach een groot PSV-icoon.',
    quiz: [
      { question: 'Hoeveel Eredivisie-goals scoorde Van Nistelrooy in 67 wedstrijden voor PSV?', answers: [{ text: '62 goals', correct: true }, { text: '40 goals' }, { text: '80 goals' }] },
      { question: 'Voor welke club vertrok Van Nistelrooy in 2001?', answers: [{ text: 'Manchester United', correct: true }, { text: 'Real Madrid' }, { text: 'Barcelona' }] },
      { question: 'In welke rol keerde Van Nistelrooy in 2022 terug bij PSV?', answers: [{ text: 'Als hoofdcoach', correct: true }, { text: 'Als technisch directeur' }, { text: 'Als assistent-trainer' }] },
    ],
  },
  {
    category: 'legendes',
    emoji: '🇧🇷',
    label: 'Legendes',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Rom%C3%A1rio_de_Souza_Faria.jpg/600px-Rom%C3%A1rio_de_Souza_Faria.jpg',
    title: 'Romário — De Braziliaanse Tovenaar',
    intro: 'In 1988 arriveerde een jonge Braziliaan in Eindhoven die het Nederlandse voetbal voorgoed zou veranderen. Romário de Souza Faria was 22 jaar oud, klein van stuk, ongelooflijk snel en een doelpuntenmachine van het hoogste niveau. In zijn eerste periodes bij PSV (1988–1993) scoorde hij in totaal 165 goals voor de club — inclusief een seizoen waarin hij met PSV zowel de Eredivisie als de Europacup I won. Romário had een manier van bewegen die verdedigers gek maakte: hij leek traag, en dan opeens — weg. Zijn schijnbewegingen waren legendarisch. Buiten het veld had hij een reputatie als moeilijke persoonlijkheid, maar op het veld was hij puur magie. PSV-fans herinneren hem als een van de beste spelers die ooit het rood-wit droeg.',
    question: 'Wat maakt een buitenlandse ster écht onderdeel van een Nederlandse club?',
    deepdive: 'Romário won later de Wereldbeker met Brazilië in 1994, waarbij hij topscorer was en als beste speler van het toernooi werd uitgeroepen. Na zijn periode bij PSV speelde hij voor Barcelona, Flamengo en vele andere clubs. Hij scoorde in zijn loopbaan meer dan 1000 officiële goals — al is dat aantal controversieel. Wat zeker is: voor PSV was hij onbetaalbaar. Hij hielp de club aan twee landstitels en was medeverantwoordelijk voor de glorieperiode van de late jaren tachtig.',
    quiz: [
      { question: 'Hoeveel goals scoorde Romário in totaal voor PSV?', answers: [{ text: '165 goals', correct: true }, { text: '80 goals' }, { text: '220 goals' }] },
      { question: 'Uit welk land komt Romário?', answers: [{ text: 'Brazilië', correct: true }, { text: 'Argentinië' }, { text: 'Uruguay' }] },
      { question: 'In welk jaar kwam Romário voor het eerst bij PSV?', answers: [{ text: '1988', correct: true }, { text: '1985' }, { text: '1992' }] },
    ],
  },
  {
    category: 'legendes',
    emoji: '👑',
    label: 'Legendes',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Ronaldo_com_a_camisa_do_Brasil_%281994%29.jpg/600px-Ronaldo_com_a_camisa_do_Brasil_%281994%29.jpg',
    title: 'Ronaldo R9 — The Phenomenon bij PSV',
    intro: 'Lang voor hij de wereld veroverde, speelde Ronaldo Luís Nazário de Lima — beter bekend als "The Phenomenon" of simpelweg R9 — één enkel seizoen bij PSV. Het was 1994. Hij was 17 jaar oud. En hij scoorde 35 goals in 37 wedstrijden. Voor PSV was dit seizoen een onverwacht geschenk: ze hadden de jonge Braziliaan voor 6 miljoen dollar gekocht van Cruzeiro, en niemand kon bevroeden dat ze in handen hadden wat later misschien wel de beste voetballer aller tijden zou worden. Ronaldo was explosief, technisch fenomenaal en had een killerinstinct voor doel. Na één seizoen in Eindhoven vertrok hij naar Barcelona voor bijna het drievoudige. PSV had geen keus — het aanbod was te groot.',
    question: 'Als je weet dat iemand de allerbeste ter wereld gaat worden — herken je dat al als hij zeventien jaar oud is?',
    deepdive: 'Na PSV speelde Ronaldo voor Barcelona, Inter Milan en Real Madrid. Hij won twee Wereldbekers met Brazilië (1994 en 2002) en werd driemaal verkozen tot beste speler ter wereld (FIFA World Player of the Year). Zijn knieoperaties en blessures maakten zijn verhaal extra schrijnend — maar ook extra indrukwekkend. PSV mag zich eeuwig gelukkig prijzen dat het één seizoen lang van zijn talent mocht genieten. Wie hem in 1994/95 in het Philips Stadion heeft zien spelen, praat er vandaag de dag nog over.',
    quiz: [
      { question: 'Hoeveel goals scoorde Ronaldo in zijn enige PSV-seizoen (1994/95)?', answers: [{ text: '35 goals', correct: true }, { text: '20 goals' }, { text: '50 goals' }] },
      { question: 'Hoe oud was Ronaldo toen hij bij PSV speelde?', answers: [{ text: '17-18 jaar', correct: true }, { text: '22 jaar' }, { text: '25 jaar' }] },
      { question: 'Naar welke club vertrok Ronaldo na zijn seizoen bij PSV?', answers: [{ text: 'Barcelona', correct: true }, { text: 'Real Madrid' }, { text: 'Juventus' }] },
    ],
  },
  {
    category: 'legendes',
    emoji: '🏆',
    label: 'Legendes',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Philip_Cocu_Euro_2000.jpg/600px-Philip_Cocu_Euro_2000.jpg',
    title: 'Philip Cocu — Mr. PSV',
    intro: 'Als er één speler is die synoniem staat aan PSV-succes, is het Philip Cocu. In twee periodes (1995–1998 en 2000–2007) won hij maar liefst zeven Eredivisie-titels met de club — meer dan welke andere speler ooit. Cocu was geen luidruchtige ster, maar een stille kracht. Een middenvelder die overzicht had, de juiste pass gaf op het juiste moment, en nooit de snelste of de sterkste hoefde te zijn. Zijn voetbalgevoel en zijn leiderschap maakten het verschil. In totaal speelde hij 370 officiële wedstrijden voor PSV. Daartussenin speelde hij ook voor Barcelona, waarmee hij in 1999 de Champions League won, en voor Fenerbahçe en Villarreal. Maar hij keerde altijd terug naar Eindhoven.',
    question: 'Wat is belangrijker voor een voetballer: persoonlijke glorie of teamtitels?',
    deepdive: 'Na zijn spelerscarrière werd Cocu trainer. Hij coachte PSV van 2013 tot 2018 en won daarin meerdere Eredivisie-titels. Later trainde hij Derby County in Engeland, maar dat avontuur liep minder goed af. In Nederland wordt hij nog altijd gezien als een van de grootste PSV-figuren aller tijden — als speler én als coach. Zijn rustige stijl en tactisch inzicht maakten hem tot een gewaardeerde trainer, ook al leverde zijn buitenlandse avontuur minder succes op.',
    quiz: [
      { question: 'Hoeveel Eredivisie-titels won Philip Cocu met PSV?', answers: [{ text: '7 titels', correct: true }, { text: '3 titels' }, { text: '10 titels' }] },
      { question: 'Hoeveel officiële wedstrijden speelde Cocu voor PSV?', answers: [{ text: '370 wedstrijden', correct: true }, { text: '200 wedstrijden' }, { text: '500 wedstrijden' }] },
      { question: 'Met welke buitenlandse club won Cocu de Champions League in 1999?', answers: [{ text: 'Barcelona', correct: true }, { text: 'Real Madrid' }, { text: 'Juventus' }] },
    ],
  },
  {
    category: 'legendes',
    emoji: '🇧🇪',
    label: 'Legendes',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/PSV_Eindhoven.svg/600px-PSV_Eindhoven.svg.png',
    title: 'Luc Nilis — De Belgische Spitsenlegende',
    intro: 'Van 1994 tot 2000 was Luc Nilis de gevreesde spits van PSV. De Belgische aanvaller scoorde in zes seizoenen 154 goals in 219 wedstrijden — een ongelofelijke productiviteit. Nilis was niet groot, niet bijzonder snel, maar hij had een uitzonderlijk positioneringsgevoel en een technisch vermogen dat hem in staat stelde om goals te maken uit bijna niks. In elke wedstrijd lette hij op de ruimtes die anderen niet zagen. PSV betaalde destijds een recordbedrag voor een Belgische speler — en het was elke cent waard. Met PSV won Nilis meerdere Eredivisie-titels. Hij was een van de best betaalde en meest productieve spelers in de Eredivisie van de late jaren negentig.',
    question: 'Luc Nilis speelde nooit een WK terwijl hij zo goed was — hoe kan zoiets in het voetbal bestaan?',
    deepdive: 'In 2000 vertrok Nilis naar Aston Villa in de Premier League — een droomtransfer. Maar in zijn tweede wedstrijd voor de club brak hij zijn been op ernstige wijze na een botsing met de doelman. De blessure was zo erg dat hij nooit meer profvoetbal speelde. Het was een van de tragischste carrière-eindes in de voetbalgeschiedenis. In België en Nederland wordt Nilis herinnerd als een van de beste aanvallers die zijn generatie voortbracht — iemand die nooit het volle podium kreeg dat hij verdiende.',
    quiz: [
      { question: 'Hoeveel goals scoorde Luc Nilis voor PSV?', answers: [{ text: '154 goals', correct: true }, { text: '80 goals' }, { text: '220 goals' }] },
      { question: 'Uit welk land komt Luc Nilis?', answers: [{ text: 'België', correct: true }, { text: 'Nederland' }, { text: 'Brazilië' }] },
      { question: 'Bij welke Engelse club eindigde zijn carrière vroegtijdig door een zware blessure?', answers: [{ text: 'Aston Villa', correct: true }, { text: 'Chelsea' }, { text: 'Manchester City' }] },
    ],
  },
  {
    category: 'legendes',
    emoji: '💪',
    label: 'Legendes',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Mark_van_Bommel.jpg/600px-Mark_van_Bommel.jpg',
    title: 'Mark van Bommel — Captain Fantastic',
    intro: 'Weinig PSV-spelers straalden zoveel leiderschap uit als Mark van Bommel. In twee periodes (2000–2005 en 2011–2012) was hij de onbetwiste aanvoerder van het team, de speler die ploeggenoten meesleepte en tegenstanders intimideerde. Van Bommel was geen technische tovenaar, maar een complete middenvelder: sterk in de duels, slim in positie, scherp in zijn passes en onvermoeibaar in zijn inzet. Met PSV won hij vier Eredivisie-titels. In 2005 won hij zijn eerste grote prijs buiten Eindhoven: hij won de Champions League met Barcelona. Daarna volgden periodes bij Bayern München, AC Milan en Manchester City, voor hij terugkeerde naar het Philips Stadion voor een laatste avontuur.',
    question: 'Maakt een echte aanvoerder een team beter, of laat hij alleen zien hoe goed hijzelf is?',
    deepdive: 'Na zijn spelerscarrière werd Van Bommel trainer. Hij coachte PSV in 2018-2019, maar zijn periode eindigde eerder dan verwacht. Daarna werd hij bondscoach van het Australische nationale elftal en later van het Nederlandse elftal (2023). Als bondscoach van Oranje leidde hij het team door de kwalificatiecampagne voor het EK. Van Bommel staat bekend om zijn directe stijl van coachen — net zo direct als hij op het veld was.',
    quiz: [
      { question: 'Hoeveel Eredivisie-titels won Mark van Bommel met PSV?', answers: [{ text: '4 titels', correct: true }, { text: '2 titels' }, { text: '7 titels' }] },
      { question: 'Met welke club won Van Bommel de Champions League?', answers: [{ text: 'Barcelona', correct: true }, { text: 'Bayern München' }, { text: 'AC Milan' }] },
      { question: 'Welke nationale ploeg coachte Van Bommel na PSV als bondscoach?', answers: [{ text: 'Australië én later Nederland', correct: true }, { text: 'Alleen Nederland' }, { text: 'België' }] },
    ],
  },
  {
    category: 'legendes',
    emoji: '🎓',
    label: 'Legendes',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Guus_Hiddink.jpg/600px-Guus_Hiddink.jpg',
    title: 'Guus Hiddink — De Coach die Alles Won',
    intro: 'Er zijn spelers die legendarisch zijn, maar Guus Hiddink is de coach die PSV zijn grootste prijs ooit bezorgde. In 1988 leidde hij de club naar de Europacup I — de voornaamste voetbalprijs van Europa. Hiddink was een tacticus met een uitzonderlijk gevoel voor hoe hij zijn spelers moest motiveren en positioneren. Hij bouwde een team dat aanvallend, snel en moeilijk te bespelen was. In Stuttgart sloeg PSV toe door Benfica op strafschoppen te verslaan. Het was Hiddinks meesterwerk als coach. Hij bleef na 1988 nog enkele jaren bij PSV, waarna hij zijn carrière uitbouwde op internationaal niveau.',
    question: 'Wat maakt een trainer groter dan welke ster-speler ook?',
    deepdive: 'Na PSV coachte Hiddink het Nederlands elftal (WK 1998, halve finale), Real Madrid, Valencia, en leidde hij Zuid-Korea naar de halve finale van het WK 2002 — een van de grootste verrassingen in WK-geschiedenis. Ook coachte hij Australië, Rusland en Turkije. Hiddink staat bekend om zijn vermogen om teams die als underdog worden beschouwd toch tot grote prestaties te inspireren. In 2006 werd hij verkozen tot de op drie na grootste Nederlander in een televisieprogramma — voor een coach een unieke eer.',
    quiz: [
      { question: 'Welke Europese prijs won Hiddink als PSV-coach in 1988?', answers: [{ text: 'De Europacup I', correct: true }, { text: 'De UEFA Cup' }, { text: 'De Champions League' }] },
      { question: 'Welk land coachte Hiddink naar de halve finale van het WK in 2002?', answers: [{ text: 'Zuid-Korea', correct: true }, { text: 'Australië' }, { text: 'Nederland' }] },
      { question: 'Bij welke club was Hiddink coach na PSV (in de jaren \'90)?', answers: [{ text: 'Het Nederlands elftal', correct: true }, { text: 'Ajax' }, { text: 'Manchester United' }] },
    ],
  },

  /* ── PRIJZEN ────────────────────────────────────────── */
  {
    category: 'prijzen',
    emoji: '🏆',
    label: 'Prijzen',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Philips_Stadion.jpg/600px-Philips_Stadion.jpg',
    title: 'Europacup I 1988 — De Mooiste Avond',
    intro: 'Op 25 mei 1988 speelde PSV de meest bijzondere wedstrijd in zijn clubgeschiedenis. In de Neckarstadion in Stuttgart nam het het op tegen het Portugese Benfica in de finale van de Europacup I — het belangrijkste Europese clubtoernooi, tegenwoordig de Champions League. Na 90 minuten en verlengingen stond het 0-0. Alles hing af van een strafschoppenserie. De zenuwen van de PSV-supporters, zowel in het stadion als thuis voor de televisie, waren tot het uiterste gespannen. PSV-doelman Hans van Breukelen stopte de beslissende strafschop van Benfica-speler Antonio Veloso. PSV was kampioen van Europa. Het was een moment dat generaties van PSV-fans met zich meedragen — een avond die nooit zal worden vergeten.',
    question: 'Stel je was erbij in Stuttgart — hoe zou jij je gevoeld hebben na die laatste gestopte penalty?',
    deepdive: 'PSV was in het seizoen 1987/88 de enige club ter wereld die zowel de nationale competitie als de Europacup I won. Ronald Koeman nam zijn beroemde huppelende aanloop voor een van de PSV-penalties — het beeld is iconisch geworden. Hans van Breukelen groeide uit tot held van de avond. De dag erna werden de spelers ingehaald in Eindhoven door tienduizenden juichende fans. De 25e mei wordt nog steeds herdacht als de grootste dag in de PSV-clubhistorie.',
    quiz: [
      { question: 'Welke club versloeg PSV in de finale van de Europacup I in 1988?', answers: [{ text: 'Benfica', correct: true }, { text: 'AC Milan' }, { text: 'Real Madrid' }] },
      { question: 'Welke PSV-keeper was de held van de strafschoppenserie in 1988?', answers: [{ text: 'Hans van Breukelen', correct: true }, { text: 'Ronald Waterreus' }, { text: 'Patrick Lodewijks' }] },
      { question: 'In welke stad werd de Europacup I-finale van 1988 gespeeld?', answers: [{ text: 'Stuttgart', correct: true }, { text: 'Parijs' }, { text: 'Milaan' }] },
    ],
  },
  {
    category: 'prijzen',
    emoji: '🥇',
    label: 'Prijzen',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/UEFA_Cup_trophy.jpg/600px-UEFA_Cup_trophy.jpg',
    title: 'UEFA Cup 1978 — De Eerste Europese Prijs',
    intro: 'Tien jaar voor de gloriedag in Stuttgart pakte PSV al zijn eerste Europese prijs. In 1978 won de club de UEFA Cup door in de finale het Franse Bastia over twee wedstrijden te verslaan. De eerste wedstrijd in Corsica eindigde doelpuntloos: 0-0. Thuis in Eindhoven maakte PSV er drie, en Bastia scoorde niet. Een totaalscore van 3-0 bracht PSV de Europa-prijs. Het was voor Nederland een historisch moment: PSV werd de eerste Nederlandse club die een Europese hoofdprijs won. Willy van der Kuijlen was in die periode nog actief en speelde een sleutelrol in de Europese campagne die uitmondde in het trofee-feest.',
    question: 'Is een Europese prijs winnen moeilijker dan een landstitel, of juist makkelijker?',
    deepdive: 'De UEFA Cup bestond pas een paar jaar toen PSV hem won — het was een relatief nieuw toernooi. Later zou PSV ook de Europacup I winnen (1988), waarmee ze de enige Nederlandse club werden die twee verschillende Europese hoofdprijzen op hun naam hebben staan. De trofee van 1978 staat permanent tentoongesteld in het clubmuseum van PSV. Het was het begin van een Europese reputatie die PSV ver buiten Nederland bekendheid gaf.',
    quiz: [
      { question: 'Welke club verloor de UEFA Cup-finale van 1978 van PSV?', answers: [{ text: 'Bastia', correct: true }, { text: 'Juventus' }, { text: 'Ajax' }] },
      { question: 'Wat was de totaalscore van de UEFA Cup-finale van 1978?', answers: [{ text: '3-0 voor PSV', correct: true }, { text: '5-1 voor PSV' }, { text: '2-2 gelijkspel' }] },
      { question: 'Uit welk land komt het tegenstaan Bastia?', answers: [{ text: 'Frankrijk', correct: true }, { text: 'Italië' }, { text: 'Spanje' }] },
    ],
  },
  {
    category: 'prijzen',
    emoji: '🏅',
    label: 'Prijzen',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Eredivisie_Logo.png/600px-Eredivisie_Logo.png',
    title: 'De 24 Eredivisie-titels — Recordkampioen',
    intro: 'PSV Eindhoven is samen met Ajax de meest succesvolle club in de Nederlandse voetbalgeschiedenis als het gaat om landstitels. Met 24 Eredivisie-kampioenschappen staat de club in de absolute top. De eerste titel werd gewonnen in 1929 — nog voor de Eredivisie officieel bestond als profcompetitie. De meest recente titel werd veroverd in het seizoen 2022/23, onder leiding van trainer Ruud van Nistelrooy. PSV won in sommige tijdperken titels in series: vier op rij van 1986 tot 1989, en daarna zes op rij van 2000 tot 2003 onder Dick Advocaat. De consistentie over meer dan negentig jaar is een bewijs van de kracht van de club.',
    question: 'Is 24 titels winnen een kwestie van superieure kwaliteit, of ook van geluk en gunstige omstandigheden?',
    deepdive: 'In sommige seizoenen was PSV zo dominant dat er nauwelijks twijfel was over de uitkomst van de competitie. Maar er waren ook kampioenschappen die pas op de laatste speeldag werden beslist. De titel van 2006/07, voor de tweede keer onder Frank Arnesen en trainer Guus Hiddink, werd gewonnen met een punt voorsprong op Ajax. PSV en Ajax staan allebei op 24 titels — de vraag is wie er als eerste 25 haalt.',
    quiz: [
      { question: 'Hoeveel Eredivisie-titels heeft PSV gewonnen?', answers: [{ text: '24 titels', correct: true }, { text: '18 titels' }, { text: '30 titels' }] },
      { question: 'In welk jaar behaalde PSV zijn meest recente kampioenschap (2022/23)?', answers: [{ text: '2023', correct: true }, { text: '2019' }, { text: '2021' }] },
      { question: 'Hoeveel titels op rij won PSV onder trainer Dick Advocaat (2000–2003)?', answers: [{ text: '4 titels op rij', correct: true }, { text: '2 titels op rij' }, { text: '6 titels op rij' }] },
    ],
  },
  {
    category: 'prijzen',
    emoji: '⭐',
    label: 'Prijzen',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/UEFA_Champions_League_logo_2.svg/600px-UEFA_Champions_League_logo_2.svg.png',
    title: 'Champions League 2004/05 — De Halve Finale',
    intro: 'In het seizoen 2004/05 schreef PSV een van de mooiste Europese verhalen in zijn recente geschiedenis. Onder coach Guus Hiddink bereikte de club de halve finale van de Champions League — het hoogste Europese clubtoernooi. In de kwartfinale schakelde PSV het sterke Olympique Lyon uit na een dramatische wedstrijd. In de halve finale was uiteindelijk titelverdediger AC Milan te sterk, maar het feit dat PSV zover was gekomen in de zwaarste competitie ter wereld, bewees dat Eindhoven op het allerhoogste niveau kon meedraaien. Het avontuur eindigde, maar de herinneringen bleven.',
    question: 'Is een halve finale bereiken in de Champions League een succes, of smaakt het altijd naar meer?',
    deepdive: 'De kwartfinale tegen Lyon was bijzonder: PSV verloor thuis maar won uit en ging door op doelsaldo. Keeper Ronald Waterreus, die eigenlijk reservekeeper was, speelde cruciale wedstrijden. In de halve finale scoorde Shevchenko de beslissende treffer voor Milan. Dat AC Milan uiteindelijk de Champions League won, maakte PSV\'s prestatie nog glansrijker — ze waren zo dicht bij de finale van het toernooi dat uiteindelijk door de beste club van Europa werd gewonnen.',
    quiz: [
      { question: 'Welke club elimineerde PSV in de halve finale van de Champions League 2005?', answers: [{ text: 'AC Milan', correct: true }, { text: 'Chelsea' }, { text: 'Liverpool' }] },
      { question: 'Welke Franse club versloeg PSV bijna in de kwartfinale van de CL 2005?', answers: [{ text: 'Olympique Lyon', correct: true }, { text: 'Paris Saint-Germain' }, { text: 'Olympique Marseille' }] },
      { question: 'Wie was de coach van PSV in het seizoen 2004/05?', answers: [{ text: 'Guus Hiddink', correct: true }, { text: 'Dick Advocaat' }, { text: 'Frank Arnesen' }] },
    ],
  },
  {
    category: 'prijzen',
    emoji: '🥈',
    label: 'Prijzen',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/PSV_Eindhoven.svg/600px-PSV_Eindhoven.svg.png',
    title: 'De KNVB Beker — Negen Keer Nationale Kop',
    intro: 'Naast zijn Eredivisie-successen won PSV ook negen keer de KNVB Beker — het nationale bekerkampioenschap. De beker is bijzonder omdat elk niveau van het Nederlandse voetbal meedoet: amateurs, tweedeklassers en Eredivisie-clubs spelen allemaal in hetzelfde toernooi. Dat maakt het ook onvoorspelbaar en spannend. PSV won zijn eerste beker in 1950. De meest recente bekerwinst dateert van 2012, toen PSV in een dramatische finale de trofee veroverde. Bekerwinst voelt voor veel PSV-fans anders dan een landstitel — intenser, gespannener, want de finale kan onverwacht verloren worden door één slechte dag.',
    question: 'Een bekersysteem geeft underdogs een echte kans. Vind je dat mooi of maakt het de competitie minder eerlijk?',
    deepdive: 'De KNVB Beker-finales worden gespeeld op een neutrale locatie: De Kuip in Rotterdam of de Johan Cruyff ArenA in Amsterdam. De sfeer in zo\'n finale is uniek — beide sets fans reizen af naar dezelfde stad, en de tribune is een zee van kleuren. PSV\'s negen bekerwinsten plaatsen het in de Europese middenmoot qua bekerrecord. In Nederland is Feyenoord recordhouder met dertien bekerwinsten, gevolgd door Ajax met twintig.',
    quiz: [
      { question: 'Hoe vaak won PSV de KNVB Beker?', answers: [{ text: '9 keer', correct: true }, { text: '5 keer' }, { text: '15 keer' }] },
      { question: 'In welk jaar won PSV zijn eerste KNVB Beker?', answers: [{ text: '1950', correct: true }, { text: '1929' }, { text: '1965' }] },
      { question: 'Waar worden KNVB Beker-finales gespeeld?', answers: [{ text: 'Op een neutrale locatie (De Kuip of Johan Cruyff ArenA)', correct: true }, { text: 'Altijd in Eindhoven' }, { text: 'Altijd in Amsterdam' }] },
    ],
  },

  /* ── GESCHIEDENIS ───────────────────────────────────── */
  {
    category: 'geschiedenis',
    emoji: '📜',
    label: 'Geschiedenis',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/PSV_Eindhoven.svg/600px-PSV_Eindhoven.svg.png',
    title: 'PSV Opgericht in 1913 door Philips',
    intro: 'PSV Eindhoven bestaat al meer dan 110 jaar. De club werd op 31 augustus 1913 opgericht door het bedrijf Philips als een sportvereniging voor zijn medewerkers. De naam zegt het al: Philips Sport Vereniging. Philips was in die tijd het snelst groeiende bedrijf van Nederland. De directie wilde zijn arbeiders gezond en actief houden en richtte een sportclub op voor voetbal, atletiek en andere sporten. Voetbal groeide al snel uit tot de populairste tak. In de beginjaren speelden PSV-teams op grasvelden in de directe omgeving van de fabriek. Niemand kon bevroeden dat dit kleine clubje ooit zou uitgroeien tot een van de meest succesvolle voetbalclubs van Europa.',
    question: 'Wat betekent het voor een club dat die al meer dan een eeuw bestaat en door een bedrijf werd opgericht?',
    deepdive: 'Philips groeide uit tot een multinational met vestigingen overal ter wereld, maar de band met PSV bleef sterk. Decennialang financierde Philips de club en stond het zijn naam aan het stadion af: het Philips Stadion. Pas in de jaren tachtig en negentig werd PSV geleidelijk meer onafhankelijk van zijn oprichter. De club heeft nooit faillissement gehad, is nooit gefuseerd met een andere club en speelt al meer dan zeventig jaar op het hoogste Nederlandse niveau. Een bijzondere continuteit in de wereld van het profvoetbal.',
    quiz: [
      { question: 'Wanneer werd PSV Eindhoven opgericht?', answers: [{ text: '31 augustus 1913', correct: true }, { text: '1 januari 1920' }, { text: '15 mei 1900' }] },
      { question: 'Door wie werd PSV opgericht?', answers: [{ text: 'Het bedrijf Philips', correct: true }, { text: 'Lokale sporters' }, { text: 'De gemeente Eindhoven' }] },
      { question: 'Wat staat de "P" in PSV voor?', answers: [{ text: 'Philips', correct: true }, { text: 'Professioneel' }, { text: 'Pioniers' }] },
    ],
  },
  {
    category: 'geschiedenis',
    emoji: '🎨',
    label: 'Geschiedenis',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/PSV_Eindhoven.svg/600px-PSV_Eindhoven.svg.png',
    title: 'De Tricolore — Rood, Wit en Lichtblauw',
    intro: 'PSV staat bekend om zijn rood-wit gestreept shirt, maar officieel heeft de club drie kleuren: rood, wit en lichtblauw. Die combinatie heet de "tricolore". Het lichtblauw is minder zichtbaar in het dagelijkse shirt, maar het zit verweven in het clubwapen en in een aantal historische uitshirts. De kleuren verwijzen naar de Nederlandse vlag (rood-wit-blauw), met een lichtere, meer PSV-eigen variant van het blauw. Het rood-wit gestreept thuis-shirt is al decennialang hetzelfde — een iconisch beeld in het Nederlandse voetbal. Supporters herkennen de PSV-kleuren wereldwijd.',
    question: 'Kleuren geven een club haar identiteit. Welke kleur past het beste bij PSV en waarom?',
    deepdive: 'Het clubwapen van PSV toont een adelaar met uitgespreide vleugels, omgeven door de drie clubkleuren. De keuze voor rood-wit als dominante combinatie in het shirt was in de beginjaren van de club al gemaakt en is sindsdien nooit drastisch veranderd. Sommige uitshirts hebben in de loop der jaren blauw of andere kleuren gebruikt, maar het rood-wit thuisshirt is heilig. PSV-supporters die het shirt dragen, voelen zich verbonden met meer dan een eeuw clubgeschiedenis.',
    quiz: [
      { question: 'Welke drie kleuren heeft PSV officieel?', answers: [{ text: 'Rood, wit en lichtblauw', correct: true }, { text: 'Rood, wit en zwart' }, { text: 'Rood, oranje en wit' }] },
      { question: 'Hoe heet de drie-kleurencombinatie van PSV officieel?', answers: [{ text: 'Tricolore', correct: true }, { text: 'Tricot' }, { text: 'Driekleur' }] },
      { question: 'Welk dier staat er in het PSV-clubwapen?', answers: [{ text: 'Een adelaar', correct: true }, { text: 'Een leeuw' }, { text: 'Een stier' }] },
    ],
  },
  {
    category: 'geschiedenis',
    emoji: '🏙️',
    label: 'Geschiedenis',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Eindhoven_luchtfoto.jpg/600px-Eindhoven_luchtfoto.jpg',
    title: 'PSV en Eindhoven — Een Onlosmakelijke Band',
    intro: 'PSV en de stad Eindhoven zijn onlosmakelijk met elkaar verbonden. De club groeide op met de stad: van een bescheiden industrieplaats naar de technologiehoofdstad van Nederland. Waar Philips groeide, groeide PSV mee. Eindhoven heeft vandaag de dag ruim 240.000 inwoners en is de vijfde stad van Nederland. Toch heeft het een voetbalclub die in Europa meekan met de groten der aarde. PSV is de trots van Brabant — supporters komen niet alleen uit Eindhoven maar uit de hele regio: uit Tilburg, Den Bosch, Breda en ver daarbuiten. De club is meer dan een sportclub: het is een identiteitssymbool voor een heel landsdeel.',
    question: 'Kan een voetbalclub een hele stad iets geven wat een bedrijf of een politicus niet kan?',
    deepdive: 'Eindhoven is de thuisstad van bedrijven als ASML, NXP en van design-evenementen als Dutch Design Week. Maar als er één ding is dat de stad internationaal bekendheid geeft buiten de technologiewereld, is het PSV. Wanneer de club in de Champions League speelt, kijkt de wereld even naar een middelgrote Brabantse stad. Die trots is niet te kopen — die ontstaat organisch, over generaties van supporters die week in week uit het rood-wit dragen.',
    quiz: [
      { question: 'Hoeveel inwoners heeft Eindhoven ongeveer?', answers: [{ text: 'Ruim 240.000', correct: true }, { text: '1 miljoen' }, { text: '80.000' }] },
      { question: 'Hoe staat Eindhoven in Nederland bekend?', answers: [{ text: 'Als technologiehoofdstad', correct: true }, { text: 'Als havenstad' }, { text: 'Als studentenstad nummer 1' }] },
      { question: 'In welke provincie ligt Eindhoven?', answers: [{ text: 'Noord-Brabant', correct: true }, { text: 'Limburg' }, { text: 'Gelderland' }] },
    ],
  },
  {
    category: 'geschiedenis',
    emoji: '🌱',
    label: 'Geschiedenis',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/PSV_Eindhoven.svg/600px-PSV_Eindhoven.svg.png',
    title: 'PSV Academie — Kraamkamer van Toptalent',
    intro: 'De PSV Academie geldt als een van de beste jeugdopleidingen in Nederland. Van de honderden talenten die er door de jaren heen zijn gevormd, groeide een indrukwekkend aantal uit tot topprofessionals. Arjen Robben begon als kleine, flinke buitenspeler op de velden van De Herdgang. Memphis Depay tekende op zijn twaalfde een contract bij PSV en groeide uit tot de beste PSV-speler van zijn generatie. Cody Gakpo werd in de academie gevormd en scoorde vervolgens voor PSV en het Nederlands elftal op het WK 2022, waarna hij voor een recordbedrag naar Liverpool vertrok. De academie is het bewijs dat PSV niet alleen talent koopt, maar ook zelf creëert.',
    question: 'Wat is waardevoller voor een club: zelf talent opleiden, of grote sterren kopen?',
    deepdive: 'De PSV Academie werkt met meer dan 250 jonge talenten verdeeld over alle leeftijdsgroepen. De scouting is internationaal, maar de nadruk ligt op Brabants en Nederlands talent. Spelers krijgen op de academie niet alleen voetbaltraining, maar ook begeleiding op school en in hun persoonlijke ontwikkeling. PSV investeert jaarlijks miljoenen euro\'s in de opleiding, wetende dat een succes als Cody Gakpo — die voor 45 miljoen euro werd verkocht — de investering meervoudig terugverdient.',
    quiz: [
      { question: 'Welke topspeler werd opgeleid bij de PSV Academie?', answers: [{ text: 'Arjen Robben', correct: true }, { text: 'Johan Cruijff' }, { text: 'Marco van Basten' }] },
      { question: 'Voor welk bedrag werd PSV-academieproduct Cody Gakpo verkocht?', answers: [{ text: 'Ongeveer 45 miljoen euro', correct: true }, { text: '5 miljoen euro' }, { text: '100 miljoen euro' }] },
      { question: 'Naar welke Engelse club vertrok Cody Gakpo in januari 2023?', answers: [{ text: 'Liverpool', correct: true }, { text: 'Manchester City' }, { text: 'Arsenal' }] },
    ],
  },
  {
    category: 'geschiedenis',
    emoji: '⚔️',
    label: 'Geschiedenis',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/PSV_Eindhoven.svg/600px-PSV_Eindhoven.svg.png',
    title: 'PSV vs Ajax — De Eeuwige Rivaliteit',
    intro: 'In Nederland is er maar één club die PSV echt bedreigt als het gaat om de landstitel: Ajax. De twee clubs domineren de Eredivisie al meer dan vijftig jaar. Wedstrijden tussen PSV en Ajax — "De Topper" — zijn altijd beladen, emotioneel en van nationaal belang. Beide clubs staan op 24 Eredivisie-titels. In Europees verband presteerden beide clubs historisch hoog: Ajax won de Champions League viermaal (1971, 1972, 1973 en 1995), PSV de Europacup I eenmaal (1988). Het debat over wie de "ware" grootste club van Nederland is, wordt overal gevoerd — in kroegen, op tribunes, op schoolpleinen.',
    question: 'Rivaliteit in sport: maakt het je als supporter beter of juist slechter?',
    deepdive: 'PSV en Ajax kwamen in de strijd om de titel regelmatig tegenover elkaar te staan op de laatste speeldag van het seizoen. In 2018 won PSV de titel van Ajax op het nippertje. In 2022 draaide het om: Ajax pakte de titel, gevolgd door PSV. De volgorde op de ranglijst bepaalt telkens opnieuw wie het afgelopen seizoen de beste club van Nederland was — maar de eeuwige strijd gaat gewoon door.',
    quiz: [
      { question: 'Hoeveel Eredivisie-titels heeft Ajax gewonnen?', answers: [{ text: 'Evenveel als PSV: 24', correct: true }, { text: 'Meer: 36' }, { text: 'Minder: 18' }] },
      { question: 'Hoeveel keer won Ajax de Champions League (of Europacup I)?', answers: [{ text: '4 keer', correct: true }, { text: '1 keer' }, { text: '7 keer' }] },
      { question: 'Hoe wordt de wedstrijd PSV vs Ajax officieel in het voetbal aangeduid?', answers: [{ text: 'De Topper', correct: true }, { text: 'De Klassiekers van het Zuiden' }, { text: 'Het Noord-Zuidderby' }] },
    ],
  },

  /* ── STADION ────────────────────────────────────────── */
  {
    category: 'stadion',
    emoji: '🏟️',
    label: 'Stadion',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Philips_Stadion.jpg/600px-Philips_Stadion.jpg',
    title: 'Het Philips Stadion — Thuis van PSV',
    intro: 'Het Philips Stadion in Eindhoven is het thuis van PSV. Met een capaciteit van 35.000 toeschouwers is het een van de grotere voetbalstadia van Nederland. Het stadion staat midden in de stad, op slechts tien minuten loopafstand van het Centraal Station, waardoor het uniek toegankelijk is voor fans uit heel het land. De eerste versie van het stadion werd in 1913 geopend — hetzelfde jaar dat PSV werd opgericht. Sindsdien is het meermaals verbouwd en uitgebreid. Het moderne Philips Stadion heeft moderne faciliteiten, comfortabele stoelen en een sfeer die tijdens thuiswedstrijden onmiskenbaar is. Elke thuiswedstrijd is nagenoeg uitverkocht.',
    question: 'Wat maakt een stadion meer dan alleen een plek om voetbal te kijken?',
    deepdive: 'Het Philips Stadion heeft ook een clubmuseum, een restaurant en kamers voor zakelijke gasten. PSV organiseert er niet alleen voetbalwedstrijden maar ook concerten en evenementen. De naam "Philips Stadion" is al tientallen jaren dezelfde — terwijl veel andere Nederlandse clubs hun stadion omdoopten voor sponsorgeld (zoals de Grolsch Veste of de Heineken ArenA). Het is een blijk van trots en stabiliteit die PSV-fans waarderen.',
    quiz: [
      { question: 'Hoeveel toeschouwers passen er in het Philips Stadion?', answers: [{ text: '35.000', correct: true }, { text: '60.000' }, { text: '20.000' }] },
      { question: 'In welk jaar werd het Philips Stadion voor het eerst geopend?', answers: [{ text: '1913', correct: true }, { text: '1950' }, { text: '1975' }] },
      { question: 'Hoe ver is het Philips Stadion verwijderd van het Centraal Station van Eindhoven?', answers: [{ text: 'Ongeveer 10 minuten lopen', correct: true }, { text: '30 minuten lopen' }, { text: 'Aan de rand van de stad' }] },
    ],
  },
  {
    category: 'stadion',
    emoji: '🔥',
    label: 'Stadion',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Philips_Stadion.jpg/600px-Philips_Stadion.jpg',
    title: 'Vak P — De Ziel van het Stadion',
    intro: 'Vak P is het hart van het Philips Stadion en de thuis van de meest gepassioneerde PSV-supporters. Het vak staat achter het doel en is het epicentrum van het lawaai, de spreekkoren en de sfeer. Hier staan de ultras — de fans die vroeg aanwezig zijn, de hele wedstrijd zingen en met tifos en spandoeken een visuele muur creëren. Op speciale avonden, zoals Champions League-wedstrijden, is het stadion versierd met rood-wit doeken over de hele tribune. Het is een spektakel dat bezoekers nooit vergeten. PSV-fans staan bekend als trouw, luid en loyaal — ook als het even minder gaat.',
    question: 'Wat maakt supporters zo onmisbaar voor een voetbalwedstrijd — meer nog dan de spelers?',
    deepdive: 'De naam "Vak P" verwijst simpelweg naar de sectieletter, maar het is een begrip geworden in het Nederlandse voetbal. Vak P organiseert ook buiten het stadion activiteiten: travellertrips, acties voor goede doelen en contact met andere supportersgroepen in Europa. Bij Europese uitwedstrijden reizen honderden PSV-fans mee en maken overal ter wereld een indruk. PSV heeft in de Europa League en Champions League supporters-awards gewonnen voor sfeer en organisatie.',
    quiz: [
      { question: 'Waar in het Philips Stadion staat Vak P?', answers: [{ text: 'Achter het doel', correct: true }, { text: 'Op de hoofdtribune' }, { text: 'In het uitvak' }] },
      { question: 'Hoe worden de meest fanatieke fans in het Nederlandse voetbal ook wel aangeduid?', answers: [{ text: 'Ultras', correct: true }, { text: 'Hooligans' }, { text: 'Harde kern' }] },
      { question: 'Welke kleuren domineren het Philips Stadion tijdens een PSV-thuiswedstrijd?', answers: [{ text: 'Rood en wit', correct: true }, { text: 'Oranje en zwart' }, { text: 'Blauw en wit' }] },
    ],
  },
  {
    category: 'stadion',
    emoji: '🏋️',
    label: 'Stadion',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/PSV_Eindhoven.svg/600px-PSV_Eindhoven.svg.png',
    title: 'De Herdgang — Waar Kampioenen Worden Gemaakt',
    intro: 'Buiten het schijnwerpers van het Philips Stadion traint PSV dagelijks op De Herdgang — een state-of-the-art trainingscomplex aan de rand van Eindhoven. Hier, ver van de camera\'s en het spektakel van wedstrijddagen, worden kampioenen gevormd. De Herdgang heeft meerdere grasmat- en kunstgrasvelden, een modern medisch centrum, een hotelaccommodatie voor internationals en geavanceerde technologische analysefaciliteiten. Spelers van het eerste elftal en de jeugdacademie trainen er samen. De rust en de professionaliteit van De Herdgang zijn een groot onderdeel van het PSV-DNA.',
    question: 'Hoe belangrijk is dagelijkse training voor het bereiken van de absolute top in een sport?',
    deepdive: 'PSV heeft de afgelopen jaren tientallen miljoenen euro\'s geïnvesteerd in De Herdgang. Nieuwe velden, betere technologie, een nieuw medisch centrum — de ambities zijn duidelijk. Op De Herdgang werken niet alleen trainers en spelers, maar ook data-analisten, sportpsychologen en conditiecoaches. Het is een kleine stad op zich, gewijd aan één doel: PSV zo goed mogelijk maken. Bezoekers die op een open dag De Herdgang bezoeken, zijn altijd onder de indruk van de professionaliteit.',
    quiz: [
      { question: 'Hoe heet het officiële trainingscomplex van PSV?', answers: [{ text: 'De Herdgang', correct: true }, { text: 'Het Sportveld' }, { text: 'PSV Campus' }] },
      { question: 'Wat is er naast trainingsvelden te vinden op De Herdgang?', answers: [{ text: 'Een medisch centrum en hotelaccommodatie', correct: true }, { text: 'Alleen grasvelden' }, { text: 'Een museum' }] },
      { question: 'Waar ligt De Herdgang?', answers: [{ text: 'Aan de rand van Eindhoven', correct: true }, { text: 'In Amsterdam' }, { text: 'Vlak naast het Philips Stadion' }] },
    ],
  },

  /* ── RECORDS ────────────────────────────────────────── */
  {
    category: 'records',
    emoji: '📊',
    label: 'Records',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Eredivisie_Logo.png/600px-Eredivisie_Logo.png',
    title: 'PSV\'s Doelpuntenrecord — 116 Goals in Één Seizoen',
    intro: 'In het seizoen 1987/88 bereikte PSV een indrukwekkend record dat tot op heden stand houdt: de club scoorde 116 doelpunten in één Eredivisie-seizoen. Dat zijn gemiddeld ruim drie goals per wedstrijd. In datzelfde seizoen won PSV ook de Europacup I — het was een jaar van totale dominantie. De aanvalsdrang van dat PSV-elftal was ongekend: Romário aan de kant, een gevaarlijk middenveld, een rechtstreeks en aanvallend spelconcept onder coach Guus Hiddink. Verdedigers in de Eredivisie hadden gewoonweg geen antwoord op de combinatie van snelheid, techniek en scoringsdrift.',
    question: 'Is aanvallend voetbal met veel doelpunten altijd beter dan defensief voetbal met weinig goals?',
    deepdive: 'Willy van der Kuijlen, die in zijn carrière 308 Eredivisie-goals scoorde, staat nog steeds als topscorer aller tijden van PSV in de Eredivisie. Zijn record zal vermoedelijk nooit worden gebroken. De 116 goals uit 1987/88 zijn een bewijs van de aanvalskracht van dat specifieke PSV-elftal. Ter vergelijking: een doorsnee Eredivisie-team scoort 50 tot 60 goals per seizoen. PSV scoorde dus bijna het dubbele van wat als normaal geldt.',
    quiz: [
      { question: 'Hoeveel Eredivisie-doelpunten scoorde PSV in het recordseizoen 1987/88?', answers: [{ text: '116 goals', correct: true }, { text: '80 goals' }, { text: '50 goals' }] },
      { question: 'Wie is de topscorer aller tijden van PSV in de Eredivisie?', answers: [{ text: 'Willy van der Kuijlen', correct: true }, { text: 'Ruud van Nistelrooy' }, { text: 'Romário' }] },
      { question: 'In welk seizoen scoorde PSV het record aantal doelpunten in de Eredivisie?', answers: [{ text: '1987/88', correct: true }, { text: '2000/01' }, { text: '2022/23' }] },
    ],
  },
  {
    category: 'records',
    emoji: '🌍',
    label: 'Records',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/UEFA_Champions_League_logo_2.svg/600px-UEFA_Champions_League_logo_2.svg.png',
    title: 'PSV in Europa — Twee Prijzen, Eén Club',
    intro: 'PSV is de enige Nederlandse club die twee verschillende Europese hoofdprijzen heeft gewonnen: de UEFA Cup in 1978 en de Europacup I in 1988. Geen andere Nederlandse club heeft dat gepresteerd. Ajax won de Champions League viermaal, maar nooit de UEFA Cup. Feyenoord won de UEFA Cup in 2002, maar nooit de Europacup I. PSV combineerde beide — een unicum in de Nederlandse voetbalgeschiedenis. Daarmee staat PSV in het rijtje van Europese topclubs die zowel het hoogste als het tweede Europese toernooi hebben gewonnen.',
    question: 'Betekent succes in Europa meer dan nationaal succes voor de reputatie van een club?',
    deepdive: 'PSV speelde zijn eerste Europese wedstrijd in de jaren zestig. Sindsdien namen ze deel aan honderden Europese duels. In de Champions League bereikten ze de halve finale in 2005. PSV won ook meerdere voorronden van de Champions League van clubs als Arsenal en Manchester United, wat de internationale reputatie van Eindhoven versterkte. De twee Europese trofeeën staan permanent tentoongesteld in het clubmuseum van PSV.',
    quiz: [{ question: 'Welke twee Europese hoofdprijzen won PSV?', answers: [{ text: 'De UEFA Cup (1978) en de Europacup I (1988)', correct: true }, { text: 'De Champions League en de UEFA Cup' }, { text: 'De Europa League en de Conference League' }] },
      { question: 'Welke andere grote Nederlandse club won de UEFA Cup, maar nooit de Europacup I?', answers: [{ text: 'Feyenoord', correct: true }, { text: 'Ajax' }, { text: 'AZ Alkmaar' }] },
      { question: 'Wanneer speelde PSV zijn eerste Europese wedstrijd?', answers: [{ text: 'In de jaren zestig', correct: true }, { text: 'In 1978' }, { text: 'In 1950' }] },
    ],
  },
  {
    category: 'records',
    emoji: '🌐',
    label: 'Records',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Soccerball.svg/600px-Soccerball.svg.png',
    title: 'PSV Internationals — Trots van Oranje',
    intro: 'PSV heeft door de jaren heen een indrukwekkend aantal internationals aan het Nederlands elftal geleverd. Spelers als Ruud van Nistelrooy, Philip Cocu, Mark van Bommel, Memphis Depay, Cody Gakpo en Denzel Dumfries speelden grote toernooien terwijl ze in dienst waren van PSV. Op het WK 1998 in Frankrijk bereikte het Nederlandse elftal — gecoacht door oud-PSV-coach Guus Hiddink — de halve finale. In de Nederlandse selectie zaten meerdere PSV-spelers die een hoofdrol speelden. PSV is daarmee een van de belangrijkste leveranciers van nationaal voetbaltalent in de Nederlandse geschiedenis.',
    question: 'Is het een eer of een last voor een club als veel spelers bij het nationale team spelen?',
    deepdive: 'Op het EK 2021 werd PSV-verdediger Denzel Dumfries een nationale held door beslissende goals te scoren in de groepsfase. Op het WK 2022 in Qatar scoorde Cody Gakpo drie doelpunten voor Nederland en vertrok daarna rechtstreeks naar Liverpool. In 2023 werd oud-PSV-icoon Mark van Bommel bondscoach van het Nederlands elftal. PSV en het nationale team zijn al meer dan een halve eeuw nauw met elkaar verweven.',
    quiz: [
      { question: 'Welke PSV-coach leidde ook het Nederlands elftal naar de WK-halve finale in 1998?', answers: [{ text: 'Guus Hiddink', correct: true }, { text: 'Dick Advocaat' }, { text: 'Louis van Gaal' }] },
      { question: 'Welke PSV-speler scoorde drie WK-doelpunten in 2022 en vertrok daarna naar Liverpool?', answers: [{ text: 'Cody Gakpo', correct: true }, { text: 'Memphis Depay' }, { text: 'Donyell Malen' }] },
      { question: 'Welke PSV-verdediger werd een EK-held voor Nederland in 2021?', answers: [{ text: 'Denzel Dumfries', correct: true }, { text: 'Matthijs de Ligt' }, { text: 'Virgil van Dijk' }] },
    ],
  },
  {
    category: 'records',
    emoji: '🌟',
    label: 'Records',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Philips_Stadion.jpg/600px-Philips_Stadion.jpg',
    title: 'Het Dubbele Kampioenschap van 1988',
    intro: 'Het seizoen 1987/88 was het beste seizoen in de PSV-clubgeschiedenis. PSV won de Eredivisie én de Europacup I in hetzelfde jaar — een combinatie die geen enkele andere Nederlandse club ooit heeft herhaald. Op het veld was PSV dat jaar ongekend sterk: Romário scoorde voor het plezier, Guus Hiddink had een systeem gebouwd dat aanvallend en moeilijk te stoppen was, en het hele team functioneerde als een geoliede machine. De Eredivisie werd gewonnen met 116 doelpunten in één seizoen. De Europacup I werd gewonnen op strafschoppen in Stuttgart. Het was een perfecte storm van talent, tactiek en geloof.',
    question: 'Kan een club ooit echt het perfecte seizoen spelen, of is er altijd ruimte voor nog meer?',
    deepdive: 'Romário en zijn aanvalsspeelstijl, gecombineerd met de tactische rust van Hiddink en de agressiviteit van de middenvelders, maakten dat PSV in 1987/88 bijna onverslaanbaar was. Hans van Breukelen speelde een foutloos EK en was dat jaar een van de beste keepers van Europa. Ronald Koeman nam zijn beroemde penalty in Stuttgart. Het was een elftal dat precies op het juiste moment alles klikte. Meer dan 35 jaar later spreekt iedereen in Eindhoven er nog steeds over.',
    quiz: [
      { question: 'Welke twee prijzen won PSV in het historische seizoen 1987/88?', answers: [{ text: 'Eredivisie én Europacup I', correct: true }, { text: 'Eredivisie én KNVB Beker' }, { text: 'Europacup I én UEFA Cup' }] },
      { question: 'Wie was de coach van PSV in het kampioensseizoen 1987/88?', answers: [{ text: 'Guus Hiddink', correct: true }, { text: 'Rinus Michels' }, { text: 'Johan Cruyff' }] },
      { question: 'Welke Braziliaanse topspeler was onderdeel van het kampioensteam van 1988?', answers: [{ text: 'Romário', correct: true }, { text: 'Ronaldo' }, { text: 'Kaká' }] },
    ],
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
let currentWonder      = null;
let lastWonder         = null;
let activeCategory     = null;
let quizQuestions      = [];
let currentQuizQ       = 0;
let quizFirstAttempts  = [];   // true = first attempt correct
let quizReturnFn       = null; // what to do after quiz completes
let currentUser        = null;
let serverReadSet      = new Set();
let serverQuizCount    = 0;
let serverStreak       = 0;
let serverPoints       = 0;
let serverDailyCount   = 0;
let forgotUsername     = '';
let authMode           = 'login';

const LS_QUIZ_COUNT  = 'psv_quiz_count';
const LS_READ_SET    = 'psv_read_set';
const LS_STREAK      = 'psv_streak';
const LS_LAST_ACTIVE = 'psv_last_active';
const LS_POINTS      = 'psv_points';
const LS_DAILY_DATE  = 'psv_daily_date';
const LS_DAILY_COUNT = 'psv_daily_count';

const DAILY_LIMIT = 10;

const LEVELS = [
  { min: 0,    title: 'Nieuwe Fan',          icon: '⚽' },
  { min: 50,   title: 'PSV-supporter',       icon: '🔴' },
  { min: 150,  title: 'Boer',                icon: '🏟️' },
  { min: 300,  title: 'PSV-kenner',          icon: '🌟' },
  { min: 500,  title: 'Eindhovense Trots',   icon: '🦁' },
  { min: 750,  title: 'Kampioen-kenner',     icon: '🏆' },
  { min: 1000, title: 'PSV-legende',         icon: '👑' },
  { min: 1500, title: 'God van het Philips', icon: '⭐' },
];

function getLevel(pts) {
  let lvl = LEVELS[0];
  for (const l of LEVELS) { if (pts >= l.min) lvl = l; }
  return lvl;
}

function getQuizCount() { return currentUser ? serverQuizCount : parseInt(localStorage.getItem(LS_QUIZ_COUNT) || '0', 10); }
function setQuizCount(n){ if (!currentUser) localStorage.setItem(LS_QUIZ_COUNT, String(n)); else serverQuizCount = n; }
function getPoints()    { return currentUser ? serverPoints : parseInt(localStorage.getItem(LS_POINTS) || '0', 10); }
function addPoints(n)   {
  const before = getPoints();
  if (currentUser) { serverPoints += n; }
  else { localStorage.setItem(LS_POINTS, String(before + n)); }
  const after = getPoints();
  if (getLevel(after).min !== getLevel(before).min) {
    showLevelUpBanner(getLevel(after));
    playLevelUp();
  }
  updatePointsDisplay(true);
  updateLevelDisplay();
}
function updatePointsDisplay(animate) {
  const el = document.getElementById('points-num');
  if (!el) return;
  const target = getPoints();
  if (animate && typeof gsap !== 'undefined') {
    const obj = { n: parseInt(el.textContent || '0', 10) };
    gsap.to(obj, {
      n: target, duration: 0.85, ease: 'power2.out',
      onUpdate() { el.textContent = Math.round(obj.n); },
      onComplete() { el.textContent = target; },
    });
    gsap.fromTo('#hero-points-wrap', { scale: 1.2 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
  } else {
    el.textContent = target;
  }
}

function updateLevelDisplay() {
  const lvl = getLevel(getPoints());
  const iconEl  = document.getElementById('hero-level-icon');
  const titleEl = document.getElementById('hero-level-title');
  if (iconEl)  iconEl.textContent  = lvl.icon;
  if (titleEl) titleEl.textContent = lvl.title;
}

function showLevelUpBanner(lvl) {
  const el = document.getElementById('level-up-banner');
  if (!el) return;
  el.querySelector('.lub-icon').textContent  = lvl.icon;
  el.querySelector('.lub-title').textContent = lvl.title;
  el.classList.remove('lub-hide');
  if (typeof gsap !== 'undefined') {
    gsap.fromTo(el, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'elastic.out(1, 0.6)' });
    gsap.to(el, { opacity: 0, y: -30, duration: 0.4, delay: 2.5, onComplete() { el.classList.add('lub-hide'); gsap.set(el, { clearProps: 'all' }); } });
  } else {
    setTimeout(() => el.classList.add('lub-hide'), 3000);
  }
}

function getDailyCount() {
  if (currentUser) return serverDailyCount;
  const today = new Date().toISOString().slice(0, 10);
  if (localStorage.getItem(LS_DAILY_DATE) !== today) return 0;
  return parseInt(localStorage.getItem(LS_DAILY_COUNT) || '0', 10);
}

function incrementGuestDailyCount() {
  const today = new Date().toISOString().slice(0, 10);
  const prev = getDailyCount();
  localStorage.setItem(LS_DAILY_DATE, today);
  localStorage.setItem(LS_DAILY_COUNT, String(prev + 1));
}

function updateDailyBar() {
  const done = getDailyCount();
  const pct  = Math.min(Math.round((done / DAILY_LIMIT) * 100), 100);
  const fill = document.getElementById('daily-fill');
  const text = document.getElementById('daily-text');
  const bar  = document.getElementById('daily-bar');
  if (fill) fill.style.width = pct + '%';
  if (text) text.textContent = done + ' / ' + DAILY_LIMIT;
  if (bar)  bar.setAttribute('aria-valuenow', done);
  const atLimit = done >= DAILY_LIMIT;
  if (btnWonder) {
    btnWonder.disabled = atLimit;
    btnWonder.classList.toggle('btn-cosmos--disabled', atLimit);
    const hint = btnWonder.querySelector('.cosmos-hint');
    if (hint) hint.textContent = atLimit ? 'morgen weer' : 'tik hier';
  }
}

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
        if (data && data.daily_count != null) {
          serverDailyCount = data.daily_count;
          updateDailyBar();
        }
      })
      .catch(() => {});
  } else {
    const s = getReadSet(); s.add(w.title);
    localStorage.setItem(LS_READ_SET, JSON.stringify([...s]));
    const prev = getStreak();
    const next = updateGuestStreak();
    updateStreakDisplay(next > prev);
    incrementGuestDailyCount();
    updateDailyBar();
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
  ['legendes','prijzen','geschiedenis','stadion','records'].forEach(cat => {
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

/* ─── Audio ─────────────────────────────────────────────── */
let _audioCtx = null;
function _ac() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}
function _tone(freq, type, dur, vol, t) {
  const ctx = _ac(), osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = type; osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, t); gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.start(t); osc.stop(t + dur + 0.05);
}
function playCorrect() {
  const t = _ac().currentTime;
  _tone(523, 'sine', 0.12, 0.3, t); _tone(784, 'sine', 0.2, 0.3, t + 0.1);
}
function playWrong() {
  _tone(140, 'sawtooth', 0.22, 0.12, _ac().currentTime);
}
function playLevelUp() {
  const t = _ac().currentTime;
  [523, 659, 784, 1047].forEach((f, i) => _tone(f, 'sine', 0.28, 0.35, t + i * 0.13));
}
function playWhoosh() {
  const ctx = _ac(), n = Math.floor(ctx.sampleRate * 0.35);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = 'bandpass'; filt.Q.value = 0.4;
  filt.frequency.setValueAtTime(150, ctx.currentTime);
  filt.frequency.linearRampToValueAtTime(4500, ctx.currentTime + 0.35);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.35, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
  src.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
  src.start();
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

/* ─── Starfield ─────────────────────────────────────────── */
function initStarfield() {
  const ctx = bgCanvas.getContext('2d');
  let W, H, stars, raf;

  const COLORS = [
    null, null, null,           // mostly white
    'hsl(350,80%,80%)',         // PSV red tint
    'hsl(38,90%,82%)',          // gold tint
    'hsl(0,0%,96%)',            // pure white
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
      color: ['#D50032','#FF1A47','#ffffff','#FFD166','#ff6680'][Math.floor(Math.random() * 5)],
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
    grad.addColorStop(0.45,'rgba(9,0,4,'   + Math.min(t * 1.4, 0.95) + ')');
    grad.addColorStop(1,   'rgba(9,0,4,0)');
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
  // quiz-score-wrap removed from UI; kept as no-op to avoid reference errors
}

function startQuiz(wonder, returnFn) {
  quizQuestions     = wonder.quiz;          // array of 3 question objects
  currentQuizQ      = 0;
  quizFirstAttempts = [null, null, null];   // null = not yet answered
  quizReturnFn      = returnFn || null;
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
    playCorrect();
    if (quizFirstAttempts[currentQuizQ] === null) quizFirstAttempts[currentQuizQ] = true;
    btn.classList.add('correct');
    elQuizAnswers.querySelectorAll('.quiz-answer-btn').forEach(b => { b.disabled = true; });
    setTimeout(advanceQuiz, 900);
  } else {
    playWrong();
    if (quizFirstAttempts[currentQuizQ] === null) quizFirstAttempts[currentQuizQ] = false;
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
  setQuizCount(getQuizCount() + 1);

  const correct = quizFirstAttempts.filter(Boolean).length;
  const bonus   = quizFirstAttempts.every(Boolean) ? 20 : 0;
  const earned  = correct * 10 + bonus;

  addPoints(earned);

  if (currentUser) {
    fetch(API.quiz, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include',
      body: JSON.stringify({ score: correct, points: earned }) })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && data.total_points != null) serverPoints = data.total_points; })
      .catch(() => {});
  }

  // Show reward overlay
  document.getElementById('qdpe-num').textContent    = '+' + earned;
  document.getElementById('qdpe-total').textContent  = getPoints();
  const breakdown = document.getElementById('quiz-done-breakdown');
  const parts = [];
  if (correct > 0) parts.push(`${correct} × 10 punten`);
  if (bonus > 0)   parts.push(`🎯 bonuspunten: +${bonus}`);
  breakdown.textContent = parts.join('  •  ');

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
  playWhoosh();
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
btnWonder.addEventListener('click', () => {
  if (getDailyCount() >= DAILY_LIMIT) return;
  startDiscovery(activeCategory);
});
btnHome.addEventListener('click', () => startQuiz(currentWonder, goHome));
btnContinue.addEventListener('click', showPhase3);
btnNew.addEventListener('click', () => startQuiz(currentWonder, () => startDiscovery(activeCategory)));
btnQuizDone.addEventListener('click', () => {
  quizDoneOverlay.hidden = true;
  updatePointsDisplay(false);
  if (quizReturnFn) quizReturnFn();
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
  if (isLogin)   { authSubEl.textContent='Log in om je PSV-voortgang bij te houden'; authSubmitBtn.textContent='Inloggen'; authToggleBtn.innerHTML='Nog geen account? <span>Registreer je hier</span>'; }
  if (isReg)     { authSubEl.textContent='Maak een PSV Fan Challenge account aan'; authSubmitBtn.textContent='Account aanmaken'; authToggleBtn.innerHTML='Al een account? <span>Log hier in</span>'; authSecurityAnswer.placeholder='jouw antwoord'; }
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
  if (heroGreeting) heroGreeting.textContent = currentUser ? `Hé ${currentUser.username}!` : 'Welkom!';
  btnLogout.textContent = currentUser ? 'Uitloggen' : '← Inloggen';
  updatePointsDisplay(false);
  updateLevelDisplay();
  updateProgressBar(); updateStreakDisplay(false);
  updateDailyBar();
  showScreen(screenHero); animateHeroIn();
}

async function loadUserAndEnter() {
  try {
    const res = await fetch(API.me,{credentials:'include'});
    if (!res.ok) { showScreen(screenAuth); return; }
    const data = await res.json();
    currentUser       = {id:data.id, username:data.username};
    serverReadSet     = new Set(data.seen_titles||[]);
    serverQuizCount   = data.quiz_count||0;
    serverStreak      = data.streak||0;
    serverPoints      = data.total_points||0;
    serverDailyCount  = data.daily_count||0;
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
  currentUser=null; serverReadSet=new Set(); serverQuizCount=0; serverStreak=0; serverPoints=0; serverDailyCount=0;
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
