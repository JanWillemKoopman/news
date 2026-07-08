// Genereert een realistische Nederlandse set standaardtaken bij het aanmaken
// van de bruiloft. Deadlines worden berekend t.o.v. de trouwdatum; het
// tijdsblok-label volgt automatisch uit deriveTijdsblok.

import { addDays, addMonths, deriveTijdsblok, toISODate } from './timeblocks'
import type { Prioriteit, TaskInput, ToegewezenAan, VoortgangCategorie, VoortgangStatus, Wedding } from './types'

type Offset = { maanden: number } | { dagen: number }

export type TemplateFase =
  | '12 maanden van tevoren'
  | '9–10 maanden van tevoren'
  | '6 maanden van tevoren'
  | '4–5 maanden van tevoren'
  | '3 maanden van tevoren'
  | '1–2 maanden van tevoren'
  | 'Laatste weken'
  | 'Laatste week'
  | 'Na de bruiloft'

export const TEMPLATE_FASE_VOLGORDE: TemplateFase[] = [
  '12 maanden van tevoren',
  '9–10 maanden van tevoren',
  '6 maanden van tevoren',
  '4–5 maanden van tevoren',
  '3 maanden van tevoren',
  '1–2 maanden van tevoren',
  'Laatste weken',
  'Laatste week',
  'Na de bruiloft',
]

export interface TemplateTask {
  titel: string
  omschrijving: string
  offset: Offset
  prioriteit: Prioriteit
  toegewezenAan: ToegewezenAan
  fase: TemplateFase
}

export const TEMPLATE_TASKS: TemplateTask[] = [
  // ~12 maanden voor
  {
    titel: 'Budget en globale gastenlijst bepalen',
    omschrijving: 'Bepaal samen het totaalbudget en een eerste schatting van het aantal gasten.',
    offset: { maanden: -12 },
    prioriteit: 'hoog',
    toegewezenAan: 'samen',
    fase: '12 maanden van tevoren',
  },
  {
    titel: 'Trouwlocatie zoeken en boeken',
    omschrijving: 'Vergelijk locaties, plan bezichtigingen en leg de favoriet vast.',
    offset: { maanden: -12 },
    prioriteit: 'hoog',
    toegewezenAan: 'samen',
    fase: '12 maanden van tevoren',
  },
  {
    titel: 'Ondertrouw en ceremonie bij de gemeente regelen',
    omschrijving: 'Maak een afspraak voor de melding voorgenomen huwelijk en kies de trouwambtenaar.',
    offset: { maanden: -12 },
    prioriteit: 'hoog',
    toegewezenAan: 'samen',
    fase: '12 maanden van tevoren',
  },
  {
    titel: 'Verloving aankondigen aan familie en vrienden',
    omschrijving: 'Verspreid het nieuws persoonlijk bij naaste familie voordat het breder gedeeld wordt.',
    offset: { maanden: -12 },
    prioriteit: 'midden',
    toegewezenAan: 'samen',
    fase: '12 maanden van tevoren',
  },
  {
    titel: 'Stijl en sfeer bepalen (moodboard)',
    omschrijving: 'Verzamel inspiratie op Pinterest of in een fysiek moodboard om de rode draad vast te leggen.',
    offset: { maanden: -12 },
    prioriteit: 'midden',
    toegewezenAan: 'samen',
    fase: '12 maanden van tevoren',
  },

  // ~9–10 maanden voor
  {
    titel: 'Save-the-dates ontwerpen',
    omschrijving: 'Ontwerp en bestel save-the-dates met datum, locatie en website-link.',
    offset: { maanden: -10 },
    prioriteit: 'midden',
    toegewezenAan: 'samen',
    fase: '9–10 maanden van tevoren',
  },
  {
    titel: 'Getuigen vragen',
    omschrijving: 'Vraag 2 tot 4 getuigen die jullie willen ondersteunen bij de ceremonie.',
    offset: { maanden: -10 },
    prioriteit: 'hoog',
    toegewezenAan: 'samen',
    fase: '9–10 maanden van tevoren',
  },
  {
    titel: 'Fotograaf vastleggen',
    omschrijving: "Bekijk portfolio's, vraag offertes op en boek de fotograaf.",
    offset: { maanden: -9 },
    prioriteit: 'hoog',
    toegewezenAan: 'samen',
    fase: '9–10 maanden van tevoren',
  },
  {
    titel: 'Catering kiezen en boeken',
    omschrijving: 'Kies een cateraar die past bij de stijl en het budget, en reserveer.',
    offset: { maanden: -9 },
    prioriteit: 'hoog',
    toegewezenAan: 'samen',
    fase: '9–10 maanden van tevoren',
  },
  {
    titel: 'Muziek of DJ boeken',
    omschrijving: 'Boek een DJ of band voor de ceremonie en het feest.',
    offset: { maanden: -9 },
    prioriteit: 'midden',
    toegewezenAan: 'partner 1',
    fase: '9–10 maanden van tevoren',
  },
  {
    titel: 'Save-the-dates versturen',
    omschrijving: 'Verstuur naar alle daggasten, zeker bij een bruiloft in het hoogseizoen of buitenland.',
    offset: { maanden: -9 },
    prioriteit: 'midden',
    toegewezenAan: 'samen',
    fase: '9–10 maanden van tevoren',
  },
  {
    titel: 'Trouwambtenaar (Babs) regelen',
    omschrijving: 'Kies tussen een gemeente-ambtenaar of een eigen Babs uit jullie kring.',
    offset: { maanden: -9 },
    prioriteit: 'hoog',
    toegewezenAan: 'samen',
    fase: '9–10 maanden van tevoren',
  },
  {
    titel: 'Videograaf zoeken en boeken',
    omschrijving: 'Vergelijk stijlen (cinematic, documentair) en boek tijdig — populaire data zijn snel vol.',
    offset: { maanden: -9 },
    prioriteit: 'midden',
    toegewezenAan: 'samen',
    fase: '9–10 maanden van tevoren',
  },
  {
    titel: 'Trouwwebsite opzetten',
    omschrijving: 'Zet een trouwwebsite op met de datum, route, dagindeling en RSVP, en deel de link op de save-the-dates.',
    offset: { maanden: -9 },
    prioriteit: 'midden',
    toegewezenAan: 'samen',
    fase: '9–10 maanden van tevoren',
  },

  // ~6 maanden voor
  {
    titel: 'Trouwringen uitzoeken',
    omschrijving: 'Bezoek een juwelier en kies (en bestel) de ringen op tijd.',
    offset: { maanden: -6 },
    prioriteit: 'midden',
    toegewezenAan: 'samen',
    fase: '6 maanden van tevoren',
  },
  {
    titel: 'Trouwkleding partner 1 uitzoeken',
    omschrijving: 'Maak pasafspraken en kies de outfit; houd rekening met levertijd.',
    offset: { maanden: -6 },
    prioriteit: 'midden',
    toegewezenAan: 'partner 1',
    fase: '6 maanden van tevoren',
  },
  {
    titel: 'Trouwkleding partner 2 uitzoeken',
    omschrijving: 'Maak pasafspraken en kies de outfit; houd rekening met levertijd.',
    offset: { maanden: -6 },
    prioriteit: 'midden',
    toegewezenAan: 'partner 2',
    fase: '6 maanden van tevoren',
  },
  {
    titel: 'Uitnodigingen ontwerpen',
    omschrijving: 'Ontwerp de uitnodigingen en bepaal de stijl van het drukwerk.',
    offset: { maanden: -6 },
    prioriteit: 'midden',
    toegewezenAan: 'partner 2',
    fase: '6 maanden van tevoren',
  },
  {
    titel: 'Bloemist regelen',
    omschrijving: 'Bespreek het bruidsboeket, corsages en de bloemdecoratie.',
    offset: { maanden: -6 },
    prioriteit: 'midden',
    toegewezenAan: 'samen',
    fase: '6 maanden van tevoren',
  },
  {
    titel: 'Vervoer voor de trouwdag boeken',
    omschrijving: 'Regel trouwauto of ander vervoer voor het paar en eventueel gasten.',
    offset: { maanden: -6 },
    prioriteit: 'laag',
    toegewezenAan: 'partner 1',
    fase: '6 maanden van tevoren',
  },
  {
    titel: 'Make-up artist en kapper boeken',
    omschrijving: 'Plan ook een proefsessie ~6 weken voor de bruiloft.',
    offset: { maanden: -6 },
    prioriteit: 'midden',
    toegewezenAan: 'partner 1',
    fase: '6 maanden van tevoren',
  },
  {
    titel: 'Huwelijkse voorwaarden bij notaris regelen',
    omschrijving: 'Beslis of jullie afwijken van de wettelijke standaard (beperkte gemeenschap van goederen); zo ja, regel het op tijd bij een notaris — het moet vóór de trouwdag rond zijn.',
    offset: { maanden: -6 },
    prioriteit: 'midden',
    toegewezenAan: 'samen',
    fase: '6 maanden van tevoren',
  },
  {
    titel: 'Huwelijksreis boeken',
    omschrijving: 'Boek bestemming en accommodatie en controleer of de paspoorten lang genoeg geldig zijn (en eventuele visa).',
    offset: { maanden: -6 },
    prioriteit: 'midden',
    toegewezenAan: 'samen',
    fase: '6 maanden van tevoren',
  },
  {
    titel: 'Verlof aanvragen bij werkgever(s)',
    omschrijving: 'Vraag op tijd vrij voor de trouwdag én de huwelijksreis, voordat de planning bij het werk volloopt.',
    offset: { maanden: -6 },
    prioriteit: 'midden',
    toegewezenAan: 'samen',
    fase: '6 maanden van tevoren',
  },
  {
    titel: 'Loveshoot plannen',
    omschrijving: 'Optioneel: een fotoshoot vooraf levert beeld op voor de website, uitnodigingen en bedankkaartjes.',
    offset: { maanden: -6 },
    prioriteit: 'laag',
    toegewezenAan: 'samen',
    fase: '6 maanden van tevoren',
  },

  // ~4–5 maanden voor
  {
    titel: 'Strijkers of pianist voor ceremonie boeken',
    omschrijving: 'Optioneel: extra muzikale invulling tijdens de ceremonie.',
    offset: { maanden: -5 },
    prioriteit: 'laag',
    toegewezenAan: 'samen',
    fase: '4–5 maanden van tevoren',
  },
  {
    titel: 'Hotelblok regelen voor uitgenodigde gasten',
    omschrijving: 'Reserveer kamers met groepskorting bij hotels in de buurt van de locatie.',
    offset: { maanden: -5 },
    prioriteit: 'laag',
    toegewezenAan: 'samen',
    fase: '4–5 maanden van tevoren',
  },
  {
    titel: 'Vervoer voor het bruidspaar regelen',
    omschrijving: 'Trouwauto, oldtimer of taxi: leg het op tijd vast.',
    offset: { maanden: -4 },
    prioriteit: 'midden',
    toegewezenAan: 'samen',
    fase: '4–5 maanden van tevoren',
  },
  {
    titel: 'Bruidstaart proeverij plannen',
    omschrijving: 'Bezoek 1-2 banketbakkers voor proeven en ontwerp.',
    offset: { maanden: -4 },
    prioriteit: 'midden',
    toegewezenAan: 'samen',
    fase: '4–5 maanden van tevoren',
  },
  {
    titel: 'Cadeaulijst of huwelijksbijdrage opstellen',
    omschrijving: 'Stel een cadeau- of bijdragelijst samen en verwijs ernaar op de website of bij de uitnodiging.',
    offset: { maanden: -4 },
    prioriteit: 'laag',
    toegewezenAan: 'samen',
    fase: '4–5 maanden van tevoren',
  },

  // ~3 maanden voor
  {
    titel: 'Uitnodigingen versturen',
    omschrijving: 'Verstuur de uitnodigingen en vraag om een reactie (RSVP).',
    offset: { maanden: -3 },
    prioriteit: 'hoog',
    toegewezenAan: 'samen',
    fase: '3 maanden van tevoren',
  },
  {
    titel: 'Bruidstaart bestellen',
    omschrijving: 'Kies smaak en ontwerp en bestel de taart bij een banketbakker.',
    offset: { maanden: -3 },
    prioriteit: 'midden',
    toegewezenAan: 'partner 2',
    fase: '3 maanden van tevoren',
  },
  {
    titel: 'Programma van de dag opstellen',
    omschrijving: 'Werk het draaiboek op hoofdlijnen uit: ceremonie, diner en feest.',
    offset: { maanden: -3 },
    prioriteit: 'midden',
    toegewezenAan: 'samen',
    fase: '3 maanden van tevoren',
  },
  {
    titel: 'Proefdiner of menukeuze met de catering',
    omschrijving: 'Proef het menu en leg de definitieve gerechten vast.',
    offset: { maanden: -3 },
    prioriteit: 'laag',
    toegewezenAan: 'samen',
    fase: '3 maanden van tevoren',
  },
  {
    titel: 'Ceremoniemeester briefen',
    omschrijving: 'Stel een ceremoniemeester aan en bespreek het draaiboek tijdig.',
    offset: { maanden: -3 },
    prioriteit: 'hoog',
    toegewezenAan: 'samen',
    fase: '3 maanden van tevoren',
  },
  {
    titel: 'Vrijgezellenfeest organiseren (partner 1)',
    omschrijving: 'Vrienden of getuige plannen dit; communiceer wensen en grenzen.',
    offset: { maanden: -3 },
    prioriteit: 'midden',
    toegewezenAan: 'getuige',
    fase: '3 maanden van tevoren',
  },
  {
    titel: 'Vrijgezellenfeest organiseren (partner 2)',
    omschrijving: 'Vrienden of getuige plannen dit; communiceer wensen en grenzen.',
    offset: { maanden: -3 },
    prioriteit: 'midden',
    toegewezenAan: 'getuige',
    fase: '3 maanden van tevoren',
  },
  {
    titel: 'Eerste dans uitkiezen',
    omschrijving: 'Kies het lied; overweeg een paar danslessen voor extra zelfvertrouwen.',
    offset: { maanden: -3 },
    prioriteit: 'midden',
    toegewezenAan: 'samen',
    fase: '3 maanden van tevoren',
  },
  {
    titel: 'Fotobooth of polaroid-station regelen',
    omschrijving: 'Voor extra plezier en blijvende herinneringen voor de gasten.',
    offset: { maanden: -3 },
    prioriteit: 'laag',
    toegewezenAan: 'samen',
    fase: '3 maanden van tevoren',
  },
  {
    titel: 'Vervoer voor gasten organiseren',
    omschrijving: 'Pendelbus of taxi-tip: communiceer dit via de website.',
    offset: { maanden: -3 },
    prioriteit: 'laag',
    toegewezenAan: 'samen',
    fase: '3 maanden van tevoren',
  },

  // ~1–2 maanden voor
  {
    titel: "RSVP's verzamelen en definitieve gastenlijst maken",
    omschrijving: 'Bel achterblijvers na en maak de gastenlijst definitief.',
    offset: { maanden: -1 },
    prioriteit: 'hoog',
    toegewezenAan: 'samen',
    fase: '1–2 maanden van tevoren',
  },
  {
    titel: 'Definitieve aantallen doorgeven aan de catering',
    omschrijving: 'Geef het exacte aantal dag- en avondgasten en dieetwensen door.',
    offset: { maanden: -1 },
    prioriteit: 'hoog',
    toegewezenAan: 'partner 1',
    fase: '1–2 maanden van tevoren',
  },
  {
    titel: 'Alle leveranciers en tijden bevestigen',
    omschrijving: 'Bevestig aankomsttijden en details met elke geboekte leverancier.',
    offset: { maanden: -1 },
    prioriteit: 'hoog',
    toegewezenAan: 'samen',
    fase: '1–2 maanden van tevoren',
  },
  {
    titel: 'Naamskeuze bij de gemeente vastleggen',
    omschrijving: 'Beslis of je achternaam wijzigt en regel dit officieel bij de ondertrouw.',
    offset: { maanden: -3 },
    prioriteit: 'midden',
    toegewezenAan: 'samen',
    fase: '1–2 maanden van tevoren',
  },
  {
    titel: 'Geloften schrijven',
    omschrijving: 'Schrijf jullie persoonlijke beloften aan elkaar voor de ceremonie.',
    offset: { maanden: -1 },
    prioriteit: 'hoog',
    toegewezenAan: 'samen',
    fase: '1–2 maanden van tevoren',
  },
  {
    titel: 'Danslessen volgen',
    omschrijving: 'Optioneel maar populair: 3-5 lessen geven veel extra rust op de dag zelf.',
    offset: { maanden: -2 },
    prioriteit: 'laag',
    toegewezenAan: 'samen',
    fase: '1–2 maanden van tevoren',
  },
  {
    titel: 'Ringen graveren laten',
    omschrijving: 'Plan de gravering in zodat de ringen op tijd terug zijn.',
    offset: { maanden: -2 },
    prioriteit: 'midden',
    toegewezenAan: 'samen',
    fase: '1–2 maanden van tevoren',
  },
  {
    titel: 'Weersback-up bedenken',
    omschrijving: 'Bij een buitenceremonie: stel een plan B op met overdekte ruimte.',
    offset: { maanden: -2 },
    prioriteit: 'midden',
    toegewezenAan: 'samen',
    fase: '1–2 maanden van tevoren',
  },
  {
    titel: 'Dag-na brunch beslissen',
    omschrijving: 'Kleine brunch of borrel met intimi om na te genieten.',
    offset: { maanden: -2 },
    prioriteit: 'laag',
    toegewezenAan: 'samen',
    fase: '1–2 maanden van tevoren',
  },
  {
    titel: 'Tafeldecoratie en bloemstukken afstemmen',
    omschrijving: 'Bespreek met de bloemist hoe de tafels eruit komen te zien.',
    offset: { maanden: -2 },
    prioriteit: 'midden',
    toegewezenAan: 'samen',
    fase: '1–2 maanden van tevoren',
  },
  {
    titel: 'Kinderopvang tijdens diner regelen',
    omschrijving: 'Oppas of kinderhoek, afhankelijk van het aantal kinderen.',
    offset: { maanden: -2 },
    prioriteit: 'laag',
    toegewezenAan: 'samen',
    fase: '1–2 maanden van tevoren',
  },
  {
    titel: 'Parkeerregeling met locatie afstemmen',
    omschrijving: 'Controleer of er voldoende parkeerplaatsen zijn en communiceer dit.',
    offset: { maanden: -1 },
    prioriteit: 'laag',
    toegewezenAan: 'samen',
    fase: '1–2 maanden van tevoren',
  },
  {
    titel: 'Bedankkaartjes voorbereiden',
    omschrijving: 'Ontwerp alvast de bedankkaartjes zodat ze snel verstuurd kunnen na de dag.',
    offset: { maanden: -1 },
    prioriteit: 'laag',
    toegewezenAan: 'samen',
    fase: '1–2 maanden van tevoren',
  },
  {
    titel: 'Gastenboek of alternatief regelen',
    omschrijving: 'Klassiek boek, polaroid-muur of audio-gastenboek — kies een vorm die bij jullie past.',
    offset: { maanden: -1 },
    prioriteit: 'laag',
    toegewezenAan: 'samen',
    fase: '1–2 maanden van tevoren',
  },
  {
    titel: 'Trial kapsel en make-up',
    omschrijving: "Proefsessie ~4-6 weken voor de bruiloft, foto's maken.",
    offset: { dagen: -42 },
    prioriteit: 'midden',
    toegewezenAan: 'partner 1',
    fase: '1–2 maanden van tevoren',
  },
  {
    titel: 'Bedankjes voor gasten samenstellen',
    omschrijving: 'Klein presentje of zelfgemaakt iets; reken op het aantal daggasten.',
    offset: { dagen: -30 },
    prioriteit: 'laag',
    toegewezenAan: 'samen',
    fase: '1–2 maanden van tevoren',
  },

  // Laatste weken
  {
    titel: 'Menukaarten en plaatskaartjes laten drukken',
    omschrijving: 'Voeg eventueel dieetwensen-iconen toe.',
    offset: { dagen: -21 },
    prioriteit: 'midden',
    toegewezenAan: 'samen',
    fase: 'Laatste weken',
  },
  {
    titel: 'Ceremonieboekjes maken',
    omschrijving: 'Met het programma, namen van getuigen en eventuele teksten of liedjes.',
    offset: { dagen: -21 },
    prioriteit: 'laag',
    toegewezenAan: 'samen',
    fase: 'Laatste weken',
  },
  {
    titel: 'Welkomstbord en bewegwijzering ontwerpen',
    omschrijving: 'Helpt gasten op de locatie de weg te vinden.',
    offset: { dagen: -21 },
    prioriteit: 'laag',
    toegewezenAan: 'samen',
    fase: 'Laatste weken',
  },
  {
    titel: 'Definitief aantal gasten doorgeven aan catering',
    omschrijving: 'Inclusief dieetwensen — laatste deadline van de cateraar respecteren.',
    offset: { dagen: -14 },
    prioriteit: 'hoog',
    toegewezenAan: 'samen',
    fase: 'Laatste weken',
  },
  {
    titel: 'Tafelschikking definitief maken',
    omschrijving: 'Met aanwezigheid en relaties tussen gasten in het achterhoofd.',
    offset: { dagen: -14 },
    prioriteit: 'midden',
    toegewezenAan: 'samen',
    fase: 'Laatste weken',
  },
  {
    titel: 'Muziekverzoeken verzamelen voor DJ',
    omschrijving: 'Stuur een spotify-link of formulier rond naar de gasten.',
    offset: { dagen: -14 },
    prioriteit: 'laag',
    toegewezenAan: 'samen',
    fase: 'Laatste weken',
  },
  {
    titel: 'Speeches afstemmen met spreker(s)',
    omschrijving: 'Maak afspraken met getuige, ouders en eventuele anderen die het woord voeren.',
    offset: { dagen: -10 },
    prioriteit: 'midden',
    toegewezenAan: 'samen',
    fase: 'Laatste weken',
  },

  // Laatste week
  {
    titel: 'Definitief tijdschema voor de trouwdag maken',
    omschrijving: 'Stel een gedetailleerd minuut-tot-minuut schema op en deel het met betrokkenen.',
    offset: { dagen: -6 },
    prioriteit: 'hoog',
    toegewezenAan: 'samen',
    fase: 'Laatste week',
  },
  {
    titel: 'Betalingen en fooien klaarleggen',
    omschrijving: 'Leg eventuele restbetalingen en fooienenveloppen klaar voor de getuige.',
    offset: { dagen: -4 },
    prioriteit: 'midden',
    toegewezenAan: 'getuige',
    fase: 'Laatste week',
  },
  {
    titel: 'Kapperafspraak in de laatste week',
    omschrijving: 'Eventueel knippen of bijkleuren ~3 dagen voor de dag.',
    offset: { dagen: -4 },
    prioriteit: 'laag',
    toegewezenAan: 'samen',
    fase: 'Laatste week',
  },
  {
    titel: 'Noodtasje voor de trouwdag inpakken',
    omschrijving: 'Denk aan pleisters, naaisetje, reservemake-up en wat te drinken.',
    offset: { dagen: -3 },
    prioriteit: 'laag',
    toegewezenAan: 'samen',
    fase: 'Laatste week',
  },
  {
    titel: 'Nagelafspraak (manicure / pedicure)',
    omschrijving: 'Laat polish minimaal 2 dagen voor de bruiloft zetten.',
    offset: { dagen: -3 },
    prioriteit: 'laag',
    toegewezenAan: 'partner 1',
    fase: 'Laatste week',
  },
  {
    titel: 'Repetitie ceremonie',
    omschrijving: 'Loop het programma door met getuigen en Babs voor extra rust.',
    offset: { dagen: -2 },
    prioriteit: 'midden',
    toegewezenAan: 'samen',
    fase: 'Laatste week',
  },
  {
    titel: 'Trouwringen ophalen',
    omschrijving: 'Geef ze in beheer bij een getuige als jullie elkaar de avond ervoor niet zien.',
    offset: { dagen: -2 },
    prioriteit: 'hoog',
    toegewezenAan: 'samen',
    fase: 'Laatste week',
  },
  {
    titel: 'Koffer voor huwelijksreis pakken',
    omschrijving: 'Inclusief paspoorten, visa en boekingsbevestigingen.',
    offset: { dagen: -2 },
    prioriteit: 'midden',
    toegewezenAan: 'samen',
    fase: 'Laatste week',
  },
  {
    titel: 'Decoratie en bedankjes afleveren bij locatie',
    omschrijving: 'Lever spullen op tijd af zodat de locatie kan opbouwen.',
    offset: { dagen: -1 },
    prioriteit: 'midden',
    toegewezenAan: 'getuige',
    fase: 'Laatste week',
  },
  {
    titel: 'Brief aan partner schrijven',
    omschrijving: 'Traditie: een handgeschreven brief om \'s ochtends voor de ceremonie te lezen.',
    offset: { dagen: -1 },
    prioriteit: 'laag',
    toegewezenAan: 'samen',
    fase: 'Laatste week',
  },

  // Na de bruiloft
  {
    titel: 'Achtergelaten spullen ophalen',
    omschrijving: 'Decoratie, leeggoed en gehuurde items terugbrengen of laten ophalen.',
    offset: { dagen: 3 },
    prioriteit: 'laag',
    toegewezenAan: 'getuige',
    fase: 'Na de bruiloft',
  },
  {
    titel: 'Trouwkleding stomen / laten reinigen',
    omschrijving: 'Snel naar de stomerij voor de beste vlekverwijdering.',
    offset: { dagen: 7 },
    prioriteit: 'midden',
    toegewezenAan: 'partner 1',
    fase: 'Na de bruiloft',
  },
  {
    titel: 'Bedankkaarten versturen',
    omschrijving: 'Idealiter binnen 6 weken na de bruiloft.',
    offset: { dagen: 21 },
    prioriteit: 'midden',
    toegewezenAan: 'samen',
    fase: 'Na de bruiloft',
  },
  {
    titel: 'Foto- en videogalerij downloaden en delen',
    omschrijving: 'Verzamel het materiaal, kies favorieten en deel een selectie.',
    offset: { dagen: 30 },
    prioriteit: 'laag',
    toegewezenAan: 'samen',
    fase: 'Na de bruiloft',
  },
]

// Mapping van voortgangscategorie → template-taaktitels die als 'klaar' worden
// aangemaakt als de gebruiker aangeeft dat ze dit al hebben geregeld.
const VOORTGANG_TAAK_MAPPING: Record<VoortgangCategorie, string[]> = {
  locatie: ['Trouwlocatie zoeken en boeken'],
  fotograaf: ['Fotograaf vastleggen'],
  videograaf: ['Videograaf zoeken en boeken'],
  catering: ['Catering kiezen en boeken'],
  dj_of_band: ['Muziek of DJ boeken'],
  trouwambtenaar: ['Trouwambtenaar (Babs) regelen', 'Ondertrouw en ceremonie bij de gemeente regelen'],
  trouwkleding: ['Trouwkleding partner 1 uitzoeken', 'Trouwkleding partner 2 uitzoeken'],
  bloemist: ['Bloemist regelen'],
}

// Bij een symbolische ceremonie is er geen wettelijk traject: deze
// gemeente-taken vervallen dan.
const GEMEENTE_TAKEN = [
  'Ondertrouw en ceremonie bij de gemeente regelen',
  'Naamskeuze bij de gemeente vastleggen',
]

// Heeft het bruidspaar deze taak expliciet als "niet nodig" gemarkeerd in de
// wizard, of vervalt hij door het gekozen ceremonietype? Dan hoort hij niet
// in de takenlijst en niet in de voorstellen.
function taakNietVanToepassing(titel: string, wedding: Wedding): boolean {
  if (wedding.ceremonietype === 'symbolisch' && GEMEENTE_TAKEN.includes(titel)) {
    return true
  }
  const geregeldeZaken = wedding.geregeldeZaken ?? {}
  for (const [cat, status] of Object.entries(geregeldeZaken) as [VoortgangCategorie, VoortgangStatus][]) {
    if (status === 'niet_van_toepassing' && VOORTGANG_TAAK_MAPPING[cat]?.includes(titel)) {
      return true
    }
  }
  return false
}

function statusVoorTaak(
  titel: string,
  wedding: Wedding
): 'open' | 'bezig' | 'klaar' {
  const geregeldeZaken = wedding.geregeldeZaken ?? {}

  // Leveranciers-checklist uit de wizard
  for (const [cat, status] of Object.entries(geregeldeZaken) as [VoortgangCategorie, VoortgangStatus][]) {
    if (VOORTGANG_TAAK_MAPPING[cat]?.includes(titel)) {
      if (status === 'geboekt') return 'klaar'
      if (status === 'bezig') return 'bezig'
    }
  }

  // Budget én gastenlijst ingevuld → de eerste planningstaken zijn gedaan
  if (titel === 'Budget en globale gastenlijst bepalen') {
    const heeftBudget = (wedding.totaalBudget ?? 0) > 0
    const heeftGasten = (wedding.aantalDaggasten ?? 0) > 0 || (wedding.aantalAvondgasten ?? 0) > 0
    if (heeftBudget && heeftGasten) return 'klaar'
    if (heeftBudget || heeftGasten) return 'bezig'
  }

  return 'open'
}

// Vervangt "partner 1" / "partner 2" door de echte voornamen in taakteksten.
function vervangPartnerNamen(tekst: string, p1: string, p2: string): string {
  let result = tekst
  if (p1) result = result.replace(/\bpartner 1\b/gi, p1)
  if (p2) result = result.replace(/\bpartner 2\b/gi, p2)
  return result
}

// Sjabloonvoorstel met fase-metadata: de fase en of die fase eigenlijk al
// voorbij is (natuurlijke deadline vóór vandaag). Extra velden gaan niet mee
// de database in (taskToRow kent ze niet) — ze sturen alleen de
// samenstel-flow: verstreken fases worden gebundeld voorgelegd i.p.v. kaart
// voor kaart.
export type TemplateTaskVoorstel = TaskInput & { fase: TemplateFase; verstreken: boolean }

export function generateTemplateTasks(wedding: Wedding): TemplateTaskVoorstel[] {
  const p1 = wedding.partner1Naam ?? ''
  const p2 = wedding.partner2Naam ?? ''
  // Gun een vers stel een rustige aanloop: taken vóór de bruiloft krijgen
  // minimaal drie weken vanaf vandaag, zodat een nieuw account niet meteen
  // start met "deadline morgen!"-paniek. Taken ná de bruiloft blijven staan.
  const minimumDeadline = addDays(new Date(), 21)
  // Zonder (geldige) trouwdatum valt er niets t.o.v. de trouwdag te rekenen:
  // taken krijgen dan geen deadline i.p.v. een ongeldige 'NaN-NaN-NaN'-datum
  // die de database weigert.
  const heeftTrouwdatum = !Number.isNaN(new Date(wedding.trouwdatum).getTime())
  // Middernacht vandaag: een taak die vandaag "moet" is niet verstreken.
  const vandaag = new Date()
  vandaag.setHours(0, 0, 0, 0)
  return TEMPLATE_TASKS.filter((t) => !taakNietVanToepassing(t.titel, wedding)).map((t) => {
    let deadline = ''
    let verstreken = false
    if (heeftTrouwdatum) {
      let deadlineDate =
        'maanden' in t.offset
          ? addMonths(wedding.trouwdatum, t.offset.maanden)
          : addDays(wedding.trouwdatum, t.offset.dagen)
      const naBruiloft = 'dagen' in t.offset && t.offset.dagen > 0
      // Natuurlijke deadline al voorbij = deze fase is eigenlijk gepasseerd.
      verstreken = !naBruiloft && deadlineDate < vandaag
      if (!naBruiloft && deadlineDate < minimumDeadline) {
        const trouwdag = new Date(wedding.trouwdatum)
        deadlineDate = minimumDeadline < trouwdag ? minimumDeadline : trouwdag
      }
      deadline = toISODate(deadlineDate)
    }
    return {
      fase: t.fase,
      verstreken,
      weddingId: wedding.id,
      titel: vervangPartnerNamen(t.titel, p1, p2),
      omschrijving: vervangPartnerNamen(t.omschrijving, p1, p2),
      deadline,
      tijdsblok: deriveTijdsblok(deadline, wedding.trouwdatum),
      status: statusVoorTaak(t.titel, wedding),
      prioriteit: t.prioriteit,
      toegewezenAan: t.toegewezenAan,
      assignees: [],
      subtaken: [],
    }
  })
}
