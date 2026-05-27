// Genereert een realistische Nederlandse set standaardtaken bij het aanmaken
// van de bruiloft. Deadlines worden berekend t.o.v. de trouwdatum; het
// tijdsblok-label volgt automatisch uit deriveTijdsblok.

import { addDays, addMonths, deriveTijdsblok, toISODate } from './timeblocks'
import type { Prioriteit, TaskInput, ToegewezenAan, Wedding } from './types'

type Offset = { maanden: number } | { dagen: number }

export interface TemplateTask {
  titel: string
  omschrijving: string
  offset: Offset
  prioriteit: Prioriteit
  toegewezenAan: ToegewezenAan
}

export const TEMPLATE_TASKS: TemplateTask[] = [
  // ~12 maanden voor
  {
    titel: 'Budget en globale gastenlijst bepalen',
    omschrijving: 'Bepaal samen het totaalbudget en een eerste schatting van het aantal gasten.',
    offset: { maanden: -12 },
    prioriteit: 'hoog',
    toegewezenAan: 'samen',
  },
  {
    titel: 'Trouwlocatie zoeken en boeken',
    omschrijving: 'Vergelijk locaties, plan bezichtigingen en leg de favoriet vast.',
    offset: { maanden: -12 },
    prioriteit: 'hoog',
    toegewezenAan: 'samen',
  },
  {
    titel: 'Ondertrouw en ceremonie bij de gemeente regelen',
    omschrijving: 'Maak een afspraak voor de melding voorgenomen huwelijk en kies de trouwambtenaar.',
    offset: { maanden: -12 },
    prioriteit: 'hoog',
    toegewezenAan: 'samen',
  },
  // ~9 maanden voor
  {
    titel: 'Fotograaf vastleggen',
    omschrijving: 'Bekijk portfolio’s, vraag offertes op en boek de fotograaf.',
    offset: { maanden: -9 },
    prioriteit: 'hoog',
    toegewezenAan: 'samen',
  },
  {
    titel: 'Catering kiezen en boeken',
    omschrijving: 'Kies een cateraar die past bij de stijl en het budget, en reserveer.',
    offset: { maanden: -9 },
    prioriteit: 'hoog',
    toegewezenAan: 'samen',
  },
  {
    titel: 'Muziek of DJ boeken',
    omschrijving: 'Boek een DJ of band voor de ceremonie en het feest.',
    offset: { maanden: -9 },
    prioriteit: 'midden',
    toegewezenAan: 'partner 1',
  },
  // ~6 maanden voor
  {
    titel: 'Trouwringen uitzoeken',
    omschrijving: 'Bezoek een juwelier en kies (en bestel) de ringen op tijd.',
    offset: { maanden: -6 },
    prioriteit: 'midden',
    toegewezenAan: 'samen',
  },
  {
    titel: 'Trouwkleding partner 1 uitzoeken',
    omschrijving: 'Maak pasafspraken en kies de outfit; houd rekening met levertijd.',
    offset: { maanden: -6 },
    prioriteit: 'midden',
    toegewezenAan: 'partner 1',
  },
  {
    titel: 'Trouwkleding partner 2 uitzoeken',
    omschrijving: 'Maak pasafspraken en kies de outfit; houd rekening met levertijd.',
    offset: { maanden: -6 },
    prioriteit: 'midden',
    toegewezenAan: 'partner 2',
  },
  {
    titel: 'Uitnodigingen ontwerpen',
    omschrijving: 'Ontwerp de uitnodigingen en bepaal de stijl van het drukwerk.',
    offset: { maanden: -6 },
    prioriteit: 'midden',
    toegewezenAan: 'partner 2',
  },
  {
    titel: 'Bloemist regelen',
    omschrijving: 'Bespreek het bruidsboeket, corsages en de bloemdecoratie.',
    offset: { maanden: -6 },
    prioriteit: 'midden',
    toegewezenAan: 'samen',
  },
  {
    titel: 'Vervoer voor de trouwdag boeken',
    omschrijving: 'Regel trouwauto of ander vervoer voor het paar en eventueel gasten.',
    offset: { maanden: -6 },
    prioriteit: 'laag',
    toegewezenAan: 'partner 1',
  },
  // ~3 maanden voor
  {
    titel: 'Uitnodigingen versturen',
    omschrijving: 'Verstuur de uitnodigingen en vraag om een reactie (RSVP).',
    offset: { maanden: -3 },
    prioriteit: 'hoog',
    toegewezenAan: 'samen',
  },
  {
    titel: 'Bruidstaart bestellen',
    omschrijving: 'Kies smaak en ontwerp en bestel de taart bij een banketbakker.',
    offset: { maanden: -3 },
    prioriteit: 'midden',
    toegewezenAan: 'partner 2',
  },
  {
    titel: 'Programma van de dag opstellen',
    omschrijving: 'Werk het draaiboek op hoofdlijnen uit: ceremonie, diner en feest.',
    offset: { maanden: -3 },
    prioriteit: 'midden',
    toegewezenAan: 'samen',
  },
  {
    titel: 'Proefdiner of menukeuze met de catering',
    omschrijving: 'Proef het menu en leg de definitieve gerechten vast.',
    offset: { maanden: -3 },
    prioriteit: 'laag',
    toegewezenAan: 'samen',
  },
  // ~1 maand voor
  {
    titel: 'RSVP’s verzamelen en definitieve gastenlijst maken',
    omschrijving: 'Bel achterblijvers na en maak de gastenlijst definitief.',
    offset: { maanden: -1 },
    prioriteit: 'hoog',
    toegewezenAan: 'samen',
  },
  {
    titel: 'Definitieve aantallen doorgeven aan de catering',
    omschrijving: 'Geef het exacte aantal dag- en avondgasten en dieetwensen door.',
    offset: { maanden: -1 },
    prioriteit: 'hoog',
    toegewezenAan: 'partner 1',
  },
  {
    titel: 'Alle leveranciers en tijden bevestigen',
    omschrijving: 'Bevestig aankomsttijden en details met elke geboekte leverancier.',
    offset: { maanden: -1 },
    prioriteit: 'hoog',
    toegewezenAan: 'samen',
  },
  // laatste week
  {
    titel: 'Definitief tijdschema voor de trouwdag maken',
    omschrijving: 'Stel een gedetailleerd minuut-tot-minuut schema op en deel het met betrokkenen.',
    offset: { dagen: -6 },
    prioriteit: 'hoog',
    toegewezenAan: 'samen',
  },
  {
    titel: 'Betalingen en fooien klaarleggen',
    omschrijving: 'Leg eventuele restbetalingen en fooienenveloppen klaar voor de getuige.',
    offset: { dagen: -4 },
    prioriteit: 'midden',
    toegewezenAan: 'getuige',
  },
  {
    titel: 'Noodtasje voor de trouwdag inpakken',
    omschrijving: 'Denk aan pleisters, naaisetje, reservemake-up en wat te drinken.',
    offset: { dagen: -3 },
    prioriteit: 'laag',
    toegewezenAan: 'samen',
  },

  // --- Aanvullende taken (uitbreiding) ----------------------------------

  // Pré-verloving / direct na verloving (12+ mnd)
  { titel: 'Verloving aankondigen aan familie en vrienden', omschrijving: 'Verspreid het nieuws persoonlijk bij naaste familie voordat het breder gedeeld wordt.', offset: { maanden: -12 }, prioriteit: 'midden', toegewezenAan: 'samen' },
  { titel: 'Stijl en sfeer bepalen (moodboard)', omschrijving: 'Verzamel inspiratie op Pinterest of in een fysiek moodboard om de rode draad vast te leggen.', offset: { maanden: -12 }, prioriteit: 'midden', toegewezenAan: 'samen' },
  { titel: 'Save-the-dates ontwerpen', omschrijving: 'Ontwerp en bestel save-the-dates met datum, locatie en website-link.', offset: { maanden: -10 }, prioriteit: 'midden', toegewezenAan: 'samen' },
  { titel: 'Save-the-dates versturen', omschrijving: 'Verstuur naar alle daggasten, zeker bij een bruiloft in het hoogseizoen of buitenland.', offset: { maanden: -9 }, prioriteit: 'midden', toegewezenAan: 'samen' },

  // Officiële zaken
  { titel: 'Getuigen vragen', omschrijving: 'Vraag 2 tot 4 getuigen die jullie willen ondersteunen bij de ceremonie.', offset: { maanden: -10 }, prioriteit: 'hoog', toegewezenAan: 'samen' },
  { titel: 'Trouwambtenaar (Babs) regelen', omschrijving: 'Kies tussen een gemeente-ambtenaar of een eigen Babs uit jullie kring.', offset: { maanden: -9 }, prioriteit: 'hoog', toegewezenAan: 'samen' },
  { titel: 'Naamskeuze bij de gemeente vastleggen', omschrijving: 'Beslis of je achternaam wijzigt en regel dit officieel bij de ondertrouw.', offset: { maanden: -3 }, prioriteit: 'midden', toegewezenAan: 'samen' },

  // Vendors uitgebreid
  { titel: 'Videograaf zoeken en boeken', omschrijving: 'Vergelijk stijlen (cinematic, documentair) en boek tijdig — populaire data zijn snel vol.', offset: { maanden: -9 }, prioriteit: 'midden', toegewezenAan: 'samen' },
  { titel: 'Make-up artist en kapper boeken', omschrijving: 'Plan ook een proefsessie ~6 weken voor de bruiloft.', offset: { maanden: -6 }, prioriteit: 'midden', toegewezenAan: 'partner 1' },
  { titel: 'Ceremoniemeester briefen', omschrijving: 'Stel een ceremoniemeester aan en bespreek het draaiboek tijdig.', offset: { maanden: -3 }, prioriteit: 'hoog', toegewezenAan: 'samen' },
  { titel: 'Vervoer voor het bruidspaar regelen', omschrijving: 'Trouwauto, oldtimer of taxi: leg het op tijd vast.', offset: { maanden: -4 }, prioriteit: 'midden', toegewezenAan: 'samen' },
  { titel: 'Fotobooth of polaroid-station regelen', omschrijving: 'Voor extra plezier en blijvende herinneringen voor de gasten.', offset: { maanden: -3 }, prioriteit: 'laag', toegewezenAan: 'samen' },
  { titel: 'Bruidstaart proeverij plannen', omschrijving: 'Bezoek 1-2 banketbakkers voor proeven en ontwerp.', offset: { maanden: -4 }, prioriteit: 'midden', toegewezenAan: 'samen' },
  { titel: 'Strijkers of pianist voor ceremonie boeken', omschrijving: 'Optioneel: extra muzikale invulling tijdens de ceremonie.', offset: { maanden: -5 }, prioriteit: 'laag', toegewezenAan: 'samen' },

  // Persoonlijk
  { titel: 'Vrijgezellenfeest organiseren (partner 1)', omschrijving: 'Vrienden of getuige plannen dit; communiceer wensen en grenzen.', offset: { maanden: -3 }, prioriteit: 'midden', toegewezenAan: 'getuige' },
  { titel: 'Vrijgezellenfeest organiseren (partner 2)', omschrijving: 'Vrienden of getuige plannen dit; communiceer wensen en grenzen.', offset: { maanden: -3 }, prioriteit: 'midden', toegewezenAan: 'getuige' },
  { titel: 'Geloften schrijven', omschrijving: 'Schrijf jullie persoonlijke beloften aan elkaar voor de ceremonie.', offset: { maanden: -1 }, prioriteit: 'hoog', toegewezenAan: 'samen' },
  { titel: 'Eerste dans uitkiezen', omschrijving: 'Kies het lied; overweeg een paar danslessen voor extra zelfvertrouwen.', offset: { maanden: -3 }, prioriteit: 'midden', toegewezenAan: 'samen' },
  { titel: 'Danslessen volgen', omschrijving: 'Optioneel maar populair: 3-5 lessen geven veel extra rust op de dag zelf.', offset: { maanden: -2 }, prioriteit: 'laag', toegewezenAan: 'samen' },
  { titel: 'Ringen graveren laten', omschrijving: 'Plan de gravering in zodat de ringen op tijd terug zijn.', offset: { maanden: -2 }, prioriteit: 'midden', toegewezenAan: 'samen' },
  { titel: 'Trial kapsel en make-up', omschrijving: 'Proefsessie ~4-6 weken voor de bruiloft, foto’s maken.', offset: { dagen: -42 }, prioriteit: 'midden', toegewezenAan: 'partner 1' },

  // Logistiek
  { titel: 'Hotelblok regelen voor uitgenodigde gasten', omschrijving: 'Reserveer kamers met groepskorting bij hotels in de buurt van de locatie.', offset: { maanden: -5 }, prioriteit: 'laag', toegewezenAan: 'samen' },
  { titel: 'Vervoer voor gasten organiseren', omschrijving: 'Pendelbus of taxi-tip: communiceer dit via de website.', offset: { maanden: -3 }, prioriteit: 'laag', toegewezenAan: 'samen' },
  { titel: 'Kinderopvang tijdens diner regelen', omschrijving: 'Oppas of kinderhoek, afhankelijk van het aantal kinderen.', offset: { maanden: -2 }, prioriteit: 'laag', toegewezenAan: 'samen' },
  { titel: 'Parkeerregeling met locatie afstemmen', omschrijving: 'Controleer of er voldoende parkeerplaatsen zijn en communiceer dit.', offset: { maanden: -1 }, prioriteit: 'laag', toegewezenAan: 'samen' },
  { titel: 'Weersback-up bedenken', omschrijving: 'Bij een buitenceremonie: stel een plan B op met overdekte ruimte.', offset: { maanden: -2 }, prioriteit: 'midden', toegewezenAan: 'samen' },
  { titel: 'Dag-na brunch beslissen', omschrijving: 'Kleine brunch of borrel met intimi om na te genieten.', offset: { maanden: -2 }, prioriteit: 'laag', toegewezenAan: 'samen' },

  // Drukwerk
  { titel: 'Bedankkaartjes voorbereiden', omschrijving: 'Ontwerp alvast de bedankkaartjes zodat ze snel verstuurd kunnen na de dag.', offset: { maanden: -1 }, prioriteit: 'laag', toegewezenAan: 'samen' },
  { titel: 'Menukaarten en plaatskaartjes laten drukken', omschrijving: 'Voeg eventueel dieetwensen-iconen toe.', offset: { dagen: -21 }, prioriteit: 'midden', toegewezenAan: 'samen' },
  { titel: 'Ceremonieboekjes maken', omschrijving: 'Met het programma, namen van getuigen en eventuele teksten of liedjes.', offset: { dagen: -21 }, prioriteit: 'laag', toegewezenAan: 'samen' },
  { titel: 'Welkomstbord en bewegwijzering ontwerpen', omschrijving: 'Helpt gasten op de locatie de weg te vinden.', offset: { dagen: -21 }, prioriteit: 'laag', toegewezenAan: 'samen' },

  // Decoratie / gunsten
  { titel: 'Bedankjes voor gasten samenstellen', omschrijving: 'Klein presentje of zelfgemaakt iets; reken op het aantal daggasten.', offset: { dagen: -30 }, prioriteit: 'laag', toegewezenAan: 'samen' },
  { titel: 'Tafeldecoratie en bloemstukken afstemmen', omschrijving: 'Bespreek met de bloemist hoe de tafels eruit komen te zien.', offset: { maanden: -2 }, prioriteit: 'midden', toegewezenAan: 'samen' },
  { titel: 'Gastenboek of alternatief regelen', omschrijving: 'Klassiek boek, polaroid-muur of audio-gastenboek — kies een vorm die bij jullie past.', offset: { maanden: -1 }, prioriteit: 'laag', toegewezenAan: 'samen' },

  // Coördinatie / 1 maand
  { titel: 'Definitief aantal gasten doorgeven aan catering', omschrijving: 'Inclusief dieetwensen — laatste deadline van de cateraar respecteren.', offset: { dagen: -14 }, prioriteit: 'hoog', toegewezenAan: 'samen' },
  { titel: 'Tafelschikking definitief maken', omschrijving: 'Met aanwezigheid en relaties tussen gasten in het achterhoofd.', offset: { dagen: -14 }, prioriteit: 'midden', toegewezenAan: 'samen' },
  { titel: 'Speeches afstemmen met spreker(s)', omschrijving: 'Maak afspraken met getuige, ouders en eventuele anderen die het woord voeren.', offset: { dagen: -10 }, prioriteit: 'midden', toegewezenAan: 'samen' },
  { titel: 'Muziekverzoeken verzamelen voor DJ', omschrijving: 'Stuur een spotify-link of formulier rond naar de gasten.', offset: { dagen: -14 }, prioriteit: 'laag', toegewezenAan: 'samen' },

  // Laatste week
  { titel: 'Nagelafspraak (manicure / pedicure)', omschrijving: 'Laat polish minimaal 2 dagen voor de bruiloft zetten.', offset: { dagen: -3 }, prioriteit: 'laag', toegewezenAan: 'partner 1' },
  { titel: 'Kapperafspraak in de laatste week', omschrijving: 'Eventueel knippen of bijkleuren ~3 dagen voor de dag.', offset: { dagen: -4 }, prioriteit: 'laag', toegewezenAan: 'samen' },
  { titel: 'Repetitie ceremonie', omschrijving: 'Loop het programma door met getuigen en Babs voor extra rust.', offset: { dagen: -2 }, prioriteit: 'midden', toegewezenAan: 'samen' },
  { titel: 'Decoratie en bedankjes afleveren bij locatie', omschrijving: 'Lever spullen op tijd af zodat de locatie kan opbouwen.', offset: { dagen: -1 }, prioriteit: 'midden', toegewezenAan: 'getuige' },
  { titel: 'Trouwringen ophalen', omschrijving: 'Geef ze in beheer bij een getuige als jullie elkaar de avond ervoor niet zien.', offset: { dagen: -2 }, prioriteit: 'hoog', toegewezenAan: 'samen' },
  { titel: 'Brief aan partner schrijven', omschrijving: 'Traditie: een handgeschreven brief om \'s ochtends voor de ceremonie te lezen.', offset: { dagen: -1 }, prioriteit: 'laag', toegewezenAan: 'samen' },
  { titel: 'Koffer voor huwelijksreis pakken', omschrijving: 'Inclusief paspoorten, visa en boekingsbevestigingen.', offset: { dagen: -2 }, prioriteit: 'midden', toegewezenAan: 'samen' },

  // Na de bruiloft
  { titel: 'Trouwkleding stomen / laten reinigen', omschrijving: 'Snel naar de stomerij voor de beste vlekverwijdering.', offset: { dagen: 7 }, prioriteit: 'midden', toegewezenAan: 'partner 1' },
  { titel: 'Bedankkaarten versturen', omschrijving: 'Idealiter binnen 6 weken na de bruiloft.', offset: { dagen: 21 }, prioriteit: 'midden', toegewezenAan: 'samen' },
  { titel: 'Foto- en videogalerij downloaden en delen', omschrijving: 'Verzamel het materiaal, kies favorieten en deel een selectie.', offset: { dagen: 30 }, prioriteit: 'laag', toegewezenAan: 'samen' },
  { titel: 'Achtergelaten spullen ophalen', omschrijving: 'Decoratie, leeggoed en gehuurde items terugbrengen of laten ophalen.', offset: { dagen: 3 }, prioriteit: 'laag', toegewezenAan: 'getuige' },
]

export function generateTemplateTasks(wedding: Wedding): TaskInput[] {
  return TEMPLATE_TASKS.map((t) => {
    const deadlineDate =
      'maanden' in t.offset
        ? addMonths(wedding.trouwdatum, t.offset.maanden)
        : addDays(wedding.trouwdatum, t.offset.dagen)
    const deadline = toISODate(deadlineDate)
    return {
      weddingId: wedding.id,
      titel: t.titel,
      omschrijving: t.omschrijving,
      deadline,
      tijdsblok: deriveTijdsblok(deadline, wedding.trouwdatum),
      status: 'open',
      prioriteit: t.prioriteit,
      toegewezenAan: t.toegewezenAan,
      assignees: [],
      subtaken: [],
    }
  })
}
