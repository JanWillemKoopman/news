/**
 * Redactionele reviews, bewust gescheiden van de productfeed: de CSV bevat prijs,
 * voorraad en specs (die dagelijks van Coolblue komen), dit bestand bevat het oordeel
 * (dat alleen verandert als wij het herschrijven).
 *
 * De teksten zijn gebaseerd op de gepubliceerde fabrieksspecificaties en op punten die
 * in gepubliceerde reviews consistent terugkomen. Ze zijn NIET automatisch samengesteld
 * uit live review-data — zie `disclosure` onderaan, die ook in de UI getoond wordt.
 */
export type Review = {
  verdict: string;
  body: string[];
  bestFor: string;
  notFor: string;
};

export const REVIEWS: Record<string, Review> = {
  "CAM-001": {
    verdict: "De veiligste keuze als je fotografie en video allebei serieus neemt.",
    body: [
      "De A7 IV zit precies op het punt waar de meeste fotografen genoeg hebben aan wat ze krijgen. De 33 megapixel sensor is een duidelijke stap boven de 24 megapixel van de vorige generatie: je kunt fors bijsnijden zonder dat het zichtbaar wordt, terwijl de bestanden nog niet zo groot zijn dat je computer eronder bezwijkt.",
      "Waar deze camera echt afstand neemt van de concurrentie is de autofocus. De oogherkenning voor mensen, dieren en vogels is het referentiepunt waar andere merken zich aan meten, en in de praktijk betekent dat simpelweg dat je minder mislukte foto's hebt. Het real-time tracking-systeem laat een onderwerp zelden los, ook niet als het even achter iets langs beweegt.",
      "De belangrijkste beperking zit in video: 4K op 60 beelden per seconde kan alleen met een Super35-uitsnede, waardoor je effectief inzoomt en je groothoek kwijtraakt. Op 30 beelden per seconde gebruikt de camera wel de volledige sensorbreedte, met oversampling vanaf 7K. Voor wie vooral op 24 of 30p werkt is dat geen probleem; wie standaard op 60p filmt moet dit meewegen.",
    ],
    bestFor: "Bruiloftsfotografen, portretfotografen en hybride makers die één camera voor alles willen.",
    notFor: "Sportfotografen die de allersnelste burst nodig hebben, en wie strak op budget zit.",
  },

  "CAM-002": {
    verdict: "Voor de fotograaf die zijn camera wil bedienen zonder door menu's te hoeven.",
    body: [
      "Fujifilm maakte met de X-T5 een correctie op de vorige generatie: de X-T4 leunde richting video, de X-T5 kiest onmiskenbaar weer voor fotografie. Dat zie je aan de drie fysieke wielen op de bovenplaat voor sluitertijd, ISO en belichtingscompensatie, en aan het kantelscherm dat weer naar het klassieke driewegontwerp terugging in plaats van volledig uitklapbaar.",
      "De 40,2 megapixel APS-C-sensor is het opvallendste onderdeel. Die resolutie op een kleiner sensorformaat levert detail op dat veel full-frame camera's niet halen, maar er zit een voorwaarde aan: je hebt scherpe lenzen nodig om het te zien. Op oudere of goedkopere optiek betaal je voor resolutie die de lens niet kan leveren.",
      "De autofocus is met deze generatie duidelijk verbeterd en met onderwerpherkenning uitgebreid, maar bij snel en onvoorspelbaar bewegende onderwerpen blijft Fujifilm achter op Sony en Canon. Voor straat-, landschaps- en portretfotografie merk je daar weinig van; langs een voetbalveld wel.",
    ],
    bestFor: "Straat-, reis- en landschapsfotografen die van handmatige bediening houden.",
    notFor: "Wie veel sport of snelle actie fotografeert, of vooral video maakt.",
  },

  "CAM-003": {
    verdict: "De beste keuze wanneer je onderwerp niet stil wil zitten.",
    body: [
      "Op papier oogt 24,2 megapixel bescheiden naast de 33 of 40 van de concurrentie, maar dat is precies de afweging die Canon bewust maakte. Minder pixels betekent snellere uitlezing, en dat vertaalt zich naar tot 40 beelden per seconde met de elektronische sluiter en uitstekende prestaties bij weinig licht.",
      "De onderwerpherkenning is het sterkste punt. De camera onderscheidt mensen, dieren, vogels en voertuigen, en schakelt daar automatisch tussen zonder dat je een instelling hoeft te wijzigen. In de praktijk betekent dat: camera op het onderwerp richten en fotograferen, in plaats van eerst het juiste AF-gebied kiezen.",
      "Voor video is de R6 Mark II ongewoon compleet in deze prijsklasse: 4K op 60 beelden per seconde over de volledige sensorbreedte, oversampled vanaf 6K, zonder de opnamelimieten waar eerdere Canon-modellen last van hadden. Het voornaamste bezwaar is opslag: twee UHS-II SD-sleuven en geen CFexpress, wat bij lang doorschieten in RAW de buffer sneller vol laat lopen.",
    ],
    bestFor: "Sport-, dieren- en evenementenfotografen, en hybride makers die 4K60 zonder crop willen.",
    notFor: "Landschaps- en studiofotografen die maximale resolutie willen om in bij te snijden.",
  },

  "CAM-004": {
    verdict: "Technisch het meest vooruitstrevende model in deze prijsklasse.",
    body: [
      "De Z6 III kreeg als eerste camera een gedeeltelijk gestapelde sensor: een constructie die tot dan toe alleen in veel duurdere professionele modellen zat. Het praktische gevolg is een aanzienlijk snellere uitlezing, waardoor rolling shutter — het scheeftrekken van rechte lijnen bij snelle beweging of panning — grotendeels verdwijnt.",
      "De elektronische zoeker verdient een aparte vermelding. Met 5760k punten en een helderheid die ver boven het gebruikelijke ligt, is dit de prettigste zoeker in deze klasse, en het verschil is het duidelijkst in fel zonlicht waar andere zoekers vlak worden.",
      "Er staat een documenteerde afweging tegenover: die snellere sensorconstructie kost iets aan dynamisch bereik en ruisprestaties bij de laagste ISO-waarden vergeleken met de conventionele sensor in de Z6 II. In normale opnamesituaties is dat verschil klein, maar landschapsfotografen die zwaar in de schaduwen trekken kunnen het tegenkomen. Daar staat tegenover dat de Z6 III intern 6K RAW kan opnemen, wat op dit prijsniveau uitzonderlijk is.",
    ],
    bestFor: "Hybride makers en videografen die intern RAW willen, en fotografen die veel pannen.",
    notFor: "Wie het absolute maximum aan dynamisch bereik zoekt, of een lichte body wil.",
  },

  "CAM-005": {
    verdict: "Gebouwd voor wie de camera vooral op zichzelf richt.",
    body: [
      "De ZV-E10 II is geen algemene camera met een vlog-modus erbij, maar een camera waarvan het hele ontwerp uitgaat van iemand die zichzelf filmt. Het scherm klapt opzij open zodat je jezelf ziet met een microfoon op de hotshoe, er zit een gerichte driecapsule-microfoon met meegeleverde windkap in, en de Achtergrondscherpte-knop schakelt met één druk tussen scherpe en onscherpe achtergrond.",
      "De grootste verbetering ten opzichte van het eerste model is niet de sensor maar de accu: de overstap naar de grotere NP-FZ100 lost de belangrijkste klacht over de originele ZV-E10 op. Ook de sensor ging omhoog naar 26 megapixel met snellere uitlezing.",
      "Wat je niet krijgt is beeldstabilisatie in de body. De camera compenseert digitaal, en dat werkt redelijk voor lopende opnames, maar het kost beeldhoek en haalt het niet bij optische stabilisatie. Er zit ook geen zoeker in: bij fel zonlicht fotografeer je op het scherm, wat lastig kan zijn.",
    ],
    bestFor: "Vloggers, contentmakers en beginners die vooral video maken.",
    notFor: "Fotografen die een zoeker willen, en wie veel uit de hand op lange brandpunten werkt.",
  },

  "CAM-006": {
    verdict: "De videocamera van deze lijst — sinds de autofocus eindelijk klopt.",
    body: [
      "Panasonic hield jarenlang vast aan contrastdetectie-autofocus, en dat was consequent het grootste bezwaar tegen de S-serie: het systeem 'zocht' zichtbaar in video. Met de S5 II stapte het merk over op fasedetectie, en daarmee verdween die klacht. Wat overblijft is een camera waarvan de videomogelijkheden ver boven de prijsklasse uitsteken.",
      "De actieve koeling is daarbij het onderscheidende detail. Waar de meeste hybride camera's na tientallen minuten oververhitten en stoppen, kan de S5 II onbeperkt doorlopen. Voor wie interviews, presentaties of evenementen opneemt is dat geen luxe maar een voorwaarde.",
      "De beeldstabilisatie behoort tot de beste die er is, en de camera biedt 10-bit 4:2:2 intern en uitgebreide belichtingshulpmiddelen zonder meerprijs of software-ontgrendeling. De afwegingen zitten elders: de body is fors en zwaar, en het L-mount-lensaanbod is kleiner dan dat van Sony of Canon — al groeit dat door de samenwerking met Sigma en Leica gestaag.",
    ],
    bestFor: "Videografen, documentairemakers en iedereen die lange opnames maakt.",
    notFor: "Wie een lichte camera voor onderweg zoekt, of vooral snelle actie fotografeert.",
  },

  "CAM-007": {
    verdict: "De camera die je daadwerkelijk meeneemt — en dat is meer waard dan specs.",
    body: [
      "De X100-serie heeft een eigenaardige aantrekkingskracht: een vaste 23mm f/2 lens (35mm-equivalent), geen zoom, geen verwisselbare optiek. Precies die beperking maakt hem goed. Je stopt met nadenken over welke lens je meeneemt en gaat fotograferen, en omdat hij in een jaszak past heb je hem daadwerkelijk bij je.",
      "De VI is de eerste in de reeks met ingebouwde beeldstabilisatie, en dat is een grotere verandering dan het klinkt: in combinatie met de f/2-lens fotografeer je nu tot ver in de schemering uit de hand. Daarbij ging de sensor naar 40,2 megapixel, wat het gebrek aan zoom deels compenseert — je kunt fors bijsnijden en houdt bruikbare bestanden over.",
      "De hybride zoeker blijft uniek: met een hendel schakel je tussen een optische doorkijkzoeker en een elektronische. Er zit ook een ND-filter ingebouwd, handig om bij fel licht op f/2 te blijven fotograferen. Het grootste praktische bezwaar is niet technisch maar commercieel: de vraag overtreft het aanbod al sinds de introductie, waardoor levertijden lang kunnen zijn.",
    ],
    bestFor: "Straat-, reis- en documentairefotografen die compact willen werken.",
    notFor: "Wie zoom nodig heeft, of onderwerpen op afstand fotografeert.",
  },

  "CAM-008": {
    verdict: "De goedkoopste serieuze route naar full-frame — met duidelijke concessies.",
    body: [
      "Canon stopte in de R8 vrijwel dezelfde sensor en hetzelfde autofocussysteem als in de veel duurdere R6 Mark II, in een body van 461 gram. Op beeldkwaliteit en scherpstelling lever je dus nauwelijks in: dezelfde onderwerpherkenning, dezelfde 24,2 megapixel full-frame sensor, en 4K op 60 beelden per seconde zonder crop.",
      "Waar je wel op inlevert is de behuizing en alles eromheen. Er zit geen beeldstabilisatie in de body, dus je bent afhankelijk van gestabiliseerde lenzen. De accu is de kleinere LP-E17, wat betekent dat je op een lange dag reservebatterijen meeneemt. En er is één SD-kaartsleuf, dus geen directe back-up tijdens het fotograferen — bij betaald werk is dat een reëel risico.",
      "Wie die punten kan accepteren krijgt hier de meeste beeldkwaliteit per euro van deze lijst. Het is bovendien een van de lichtste full-frame camera's die er is, wat op reis zwaarder weegt dan het op papier lijkt.",
    ],
    bestFor: "Beginners die full-frame willen, reisfotografen en wie gewicht wil besparen.",
    notFor: "Professionals die een back-upsleuf nodig hebben, en wie ongestabiliseerde lenzen gebruikt.",
  },

  "CAM-009": {
    verdict: "De beste APS-C-camera van Sony, met techniek uit de duurdere modellen.",
    body: [
      "Het interessantste aan de A6700 is de toegevoegde AI-processor: dezelfde die Sony in zijn hogere full-frame modellen gebruikt. Die maakt de onderwerpherkenning merkbaar beter dan bij de vorige generatie, met herkenning van menselijke houding — de camera weet waar een hoofd zit ook als het oog niet zichtbaar is — en van dieren, vogels, insecten en voertuigen.",
      "Daarnaast kreeg deze generatie eindelijk beeldstabilisatie in de body, iets wat in de 6000-serie lang ontbrak. In combinatie met het compacte formaat en de goed uitgevoerde grip levert dat een camera op die je een hele dag meedraagt maar die zich niet als instapmodel gedraagt.",
      "De beperkingen zijn die van het formaat. Er is één SD-kaartsleuf, en de zoeker bleef op 2,36 miljoen punten steken — bruikbaar, maar duidelijk minder dan wat concurrenten in dit segment inmiddels bieden. Bij snelle beweging met de elektronische sluiter is rolling shutter zichtbaar.",
    ],
    bestFor: "Reis- en natuurfotografen, en makers die compact willen werken met goede autofocus.",
    notFor: "Wie een grote heldere zoeker wil, of dubbele kaartsleuven nodig heeft.",
  },

  "CAM-010": {
    verdict: "Klassieke bediening met moderne techniek — en dat is geen nostalgie alleen.",
    body: [
      "De Zf is duidelijk een eerbetoon aan Nikons FM2 uit de jaren tachtig, tot de messing wielen voor sluitertijd, ISO en belichtingscompensatie aan toe. Maar anders dan bij veel retro-camera's is het niet alleen vormgeving: binnenin zit dezelfde 24,5 megapixel full-frame sensor en dezelfde onderwerpherkenning als in Nikons moderne Z-modellen.",
      "Het technisch sterkste punt is de beeldstabilisatie. Nikon claimt tot 8 stops, en de stabilisatie werkt samen met de onderwerpherkenning door te stabiliseren op het punt waar het onderwerp zich bevindt in plaats van op het beeldmidden. In de praktijk betekent dat scherpe opnames uit de hand bij sluitertijden waar je dat niet zou verwachten.",
      "De bezwaren zijn ergonomisch. De grip is klein — mooi voor het silhouet, maar met een zware telelens erop wordt het ongemakkelijk. De camera is met 710 gram ook zwaarder dan hij oogt, doordat de behuizing van metaal is. En de tweede kaartsleuf is een microSD-slot in het accucompartiment, wat als volwaardige back-up beperkt bruikbaar is.",
    ],
    bestFor: "Fotografen die handmatig werken, straatfotografen en wie bij weinig licht uit de hand fotografeert.",
    notFor: "Wie zware telelenzen gebruikt, of een lichte camera zoekt.",
  },
};

export const REVIEW_DISCLOSURE =
  "Onze beoordeling is samengesteld op basis van de gepubliceerde specificaties van de " +
  "fabrikant en punten die in gepubliceerde reviews consistent terugkomen. We hebben deze " +
  "camera niet zelf getest. Beoordelingscijfers en review-aantallen in deze demo zijn " +
  "voorbeeldwaarden.";

export function getReview(id: string): Review | null {
  return REVIEWS[id] ?? null;
}
