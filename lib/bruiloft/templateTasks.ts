// Genereert een realistische Nederlandse set standaardtaken bij het aanmaken
// van de bruiloft. Deadlines worden berekend t.o.v. de trouwdatum; het
// tijdsblok-label volgt automatisch uit deriveTijdsblok.

import { addDays, addMonths, deriveTijdsblok, toISODate } from './timeblocks'
import type { Prioriteit, TaskInput, ToegewezenAan, Wedding } from './types'

type Offset = { maanden: number } | { dagen: number }

interface TemplateTask {
  titel: string
  omschrijving: string
  offset: Offset
  prioriteit: Prioriteit
  toegewezenAan: ToegewezenAan
}

const TEMPLATE_TASKS: TemplateTask[] = [
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
    }
  })
}
