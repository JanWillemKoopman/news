// Actieve routebegeleiding: leidt het koppel stap voor stap naar de trouwdag.
// Net als derived.ts is alles PUUR en wordt het bij het LEZEN berekend; er
// wordt nooit teruggeschreven en er is geen afhankelijkheid op de store. Zo
// blijft de begeleiding voorspelbaar en eenvoudig te testen.

import { gastTellingen, taakTellingen } from './derived'
import { afspraakRelatief, dagenTot, dagLabel, formatDatumNL } from './format'
import { deriveTijdsblok, toISODate, TIJDSBLOK_VOLGORDE } from './timeblocks'
import type {
  BudgetItem,
  Guest,
  Task,
  Tijdsblok,
  Vendor,
  Wedding,
} from './types'

// --- Types -----------------------------------------------------------------

export type Urgentie = 'kritiek' | 'binnenkort' | 'normaal'
export type NextStepBron = 'taak' | 'nudge'

export interface NextStep {
  id: string // stabiel: `taak-${taskId}` of `nudge-${key}`
  titel: string
  omschrijving: string
  href: string
  urgentie: Urgentie
  bron: NextStepBron
  taskId?: string // aanwezig bij bron === 'taak' → maakt inline "afronden" mogelijk
}

export interface FaseVoortgang {
  tijdsblok: Tijdsblok
  totaal: number
  klaar: number
  percentage: number // 0..100, 0 als totaal === 0
  isHuidig: boolean
}

export interface RouteVoortgang {
  fases: FaseVoortgang[] // in TIJDSBLOK_VOLGORDE-volgorde
  huidigeFase: Tijdsblok
  overallPercentage: number // klaar / totaal over alle taken, 0 zonder taken
}

export interface GuidanceInput {
  wedding: Wedding
  tasks: Task[]
  vendors: Vendor[]
  budgetItems: BudgetItem[]
  guests: Guest[]
  vandaag?: Date // injecteerbaar voor tests; standaard new Date()
}

export interface Guidance {
  huidigeFase: Tijdsblok
  route: RouteVoortgang
  stappen: NextStep[]
}

// --- Huidige fase ----------------------------------------------------------

// In welke fase van de route zit het koppel vandaag? We behandelen "vandaag"
// als een deadline t.o.v. de trouwdatum en hergebruiken zo exact dezelfde
// indeling als waarmee taken hun tijdsblok kregen. Een trouwdatum in het
// verleden geeft automatisch 'na de bruiloft'.
export function huidigeFase(wedding: Wedding, vandaag?: Date): Tijdsblok {
  return deriveTijdsblok(toISODate(vandaag ?? new Date()), wedding.trouwdatum)
}

// --- Routevoortgang --------------------------------------------------------

export function routeVoortgang(
  tasks: Task[],
  wedding: Wedding,
  vandaag?: Date
): RouteVoortgang {
  const fase = huidigeFase(wedding, vandaag)

  // Alle fasen vooraf op nul zetten zodat lege fasen toch renderen.
  const map = new Map<Tijdsblok, { totaal: number; klaar: number }>()
  for (const tb of TIJDSBLOK_VOLGORDE) map.set(tb, { totaal: 0, klaar: 0 })

  for (const t of tasks) {
    const bucket = map.get(t.tijdsblok)
    if (!bucket) continue
    bucket.totaal++
    if (t.status === 'klaar') bucket.klaar++
  }

  const fases: FaseVoortgang[] = TIJDSBLOK_VOLGORDE.map((tb) => {
    const { totaal, klaar } = map.get(tb)!
    return {
      tijdsblok: tb,
      totaal,
      klaar,
      percentage: totaal === 0 ? 0 : Math.round((klaar / totaal) * 100),
      isHuidig: tb === fase,
    }
  })

  const tel = taakTellingen(tasks)
  const overallPercentage = tel.totaal === 0 ? 0 : Math.round((tel.klaar / tel.totaal) * 100)

  return { fases, huidigeFase: fase, overallPercentage }
}

// --- Nudges ----------------------------------------------------------------

// Slimme signalen, afgeleid van de stand van zaken. Elke regel levert hooguit
// één NextStep. Als array gehouden zodat de set eenvoudig uit te breiden en te
// testen is.
export interface NudgeRegel {
  key: string
  geldt: (input: GuidanceInput) => boolean
  maak: (input: GuidanceInput) => NextStep
}

function heeftGeboekt(vendors: Vendor[], type: Vendor['type']): boolean {
  return vendors.some((v) => v.type === type && v.status === 'geboekt')
}

export const NUDGE_REGELS: NudgeRegel[] = [
  {
    key: 'boek-locatie',
    geldt: ({ vendors, wedding }) =>
      !heeftGeboekt(vendors, 'locatie') && dagenTot(wedding.trouwdatum) > 90,
    maak: () => ({
      id: 'nudge-boek-locatie',
      titel: 'Boek jullie trouwlocatie',
      omschrijving: 'De locatie bepaalt datum, sfeer en budget — leg dit als eerste vast.',
      href: '/bruiloft/leveranciers',
      urgentie: 'binnenkort',
      bron: 'nudge',
    }),
  },
  {
    key: 'verdeel-budget',
    geldt: ({ budgetItems, wedding }) =>
      budgetItems.length === 0 && wedding.totaalBudget > 0,
    maak: () => ({
      id: 'nudge-verdeel-budget',
      titel: 'Verdeel jullie budget',
      omschrijving: 'Verdeel het totaalbudget over de categorieën, zodat je grip houdt.',
      href: '/bruiloft/budget',
      urgentie: 'binnenkort',
      bron: 'nudge',
    }),
  },
  {
    key: 'boek-catering',
    geldt: ({ vendors, wedding }) =>
      !heeftGeboekt(vendors, 'catering') && dagenTot(wedding.trouwdatum) > 60,
    maak: () => ({
      id: 'nudge-boek-catering',
      titel: 'Regel de catering',
      omschrijving: 'Vraag offertes op en leg het eten en drinken voor jullie dag vast.',
      href: '/bruiloft/leveranciers',
      urgentie: 'normaal',
      bron: 'nudge',
    }),
  },
  {
    key: 'start-gastenlijst',
    geldt: ({ guests, wedding }) =>
      guests.length === 0 && dagenTot(wedding.trouwdatum) > 30,
    maak: () => ({
      id: 'nudge-start-gastenlijst',
      titel: 'Begin met de gastenlijst',
      omschrijving: 'Een eerste gastenlijst maakt het budget en de locatiekeuze concreet.',
      href: '/bruiloft/gasten',
      urgentie: 'normaal',
      bron: 'nudge',
    }),
  },
  {
    key: 'rsvp-herinnering',
    geldt: ({ guests, wedding }) => {
      const dagen = dagenTot(wedding.trouwdatum)
      return gastTellingen(guests).geenReactie > 0 && dagen >= 0 && dagen <= 60
    },
    maak: ({ guests }) => {
      const open = gastTellingen(guests).geenReactie
      return {
        id: 'nudge-rsvp-herinnering',
        titel: 'Stuur RSVP-herinneringen',
        omschrijving: `${open} ${open === 1 ? 'gast heeft' : 'gasten hebben'} nog niet gereageerd. Stuur een herinnering.`,
        href: '/bruiloft/gasten',
        urgentie: 'binnenkort',
        bron: 'nudge',
      }
    },
  },
  {
    key: 'bevestig-aantallen',
    geldt: ({ guests, wedding }) => {
      const dagen = dagenTot(wedding.trouwdatum)
      return dagen >= 0 && dagen <= 30 && gastTellingen(guests).bevestigd > 0
    },
    maak: () => ({
      id: 'nudge-bevestig-aantallen',
      titel: 'Geef definitieve aantallen door',
      omschrijving: 'Bevestig de aantallen bij de catering en locatie nu de dag dichtbij komt.',
      href: '/bruiloft/leveranciers',
      urgentie: 'binnenkort',
      bron: 'nudge',
    }),
  },
]

// --- Volgende stappen ------------------------------------------------------

const URGENTIE_RANG: Record<Urgentie, number> = {
  kritiek: 0,
  binnenkort: 1,
  normaal: 2,
}

function urgentieVoorTaak(dagen: number): Urgentie {
  if (dagen < 0) return 'kritiek'
  if (dagen <= 14) return 'binnenkort'
  return 'normaal'
}

// De volledige, geordende lijst met volgende stappen (taken + nudges). De UI
// kapt zelf af op de eerste paar.
export function volgendeStappen(input: GuidanceInput): NextStep[] {
  const { tasks, wedding, vandaag } = input
  const fase = huidigeFase(wedding, vandaag)
  const huidigIdx = TIJDSBLOK_VOLGORDE.indexOf(fase)

  // 1. Taakstappen: gefaseerd zodat ~60 geseede taken niet overweldigen.
  const taakStappen: { step: NextStep; deadline: string }[] = []
  for (const t of tasks) {
    if (t.status === 'klaar') continue
    const dagen = dagenTot(t.deadline)
    const teLaat = dagen < 0
    const faseIdx = TIJDSBLOK_VOLGORDE.indexOf(t.tijdsblok)
    const binnenFase = faseIdx >= huidigIdx && faseIdx <= huidigIdx + 1
    if (!teLaat && t.prioriteit !== 'hoog' && !binnenFase) continue

    taakStappen.push({
      deadline: t.deadline,
      step: {
        id: `taak-${t.id}`,
        titel: t.titel,
        omschrijving: dagLabel(dagen),
        href: '/bruiloft/taken',
        urgentie: urgentieVoorTaak(dagen),
        bron: 'taak',
        taskId: t.id,
      },
    })
  }

  // 2. Komende afspraken bij leveranciers (bezichtiging/proeverij/gesprek):
  // binnen een week is dat concreet genoeg om op het dashboard te staan.
  const afspraakStappen: { step: NextStep; deadline: string }[] = []
  for (const v of input.vendors) {
    if (!v.afspraakDatum) continue
    const dagen = dagenTot(v.afspraakDatum)
    if (dagen < 0 || dagen > 7) continue
    afspraakStappen.push({
      deadline: v.afspraakDatum,
      step: {
        id: `afspraak-${v.id}`,
        titel: `Afspraak bij ${v.naam}`,
        omschrijving: `${formatDatumNL(v.afspraakDatum)}${v.afspraakTijd ? ` om ${v.afspraakTijd}` : ''} · ${afspraakRelatief(dagen)}`,
        href: '/bruiloft/leveranciers',
        urgentie: dagen <= 1 ? 'binnenkort' : 'normaal',
        bron: 'nudge',
      },
    })
  }

  // 3. Nudges.
  const nudgeStappen = NUDGE_REGELS.filter((r) => r.geldt(input)).map((r) => ({
    deadline: '', // nudges hebben geen deadline; sorteren op urgentie
    step: r.maak(input),
  }))

  // 4. Combineren en sorteren: urgentie eerst, daarbinnen op datum.
  return [...taakStappen, ...afspraakStappen, ...nudgeStappen]
    .sort((a, b) => {
      const u = URGENTIE_RANG[a.step.urgentie] - URGENTIE_RANG[b.step.urgentie]
      if (u !== 0) return u
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline)
      // taken (met deadline) vóór nudges (zonder) binnen dezelfde urgentie
      if (a.deadline && !b.deadline) return -1
      if (!a.deadline && b.deadline) return 1
      return 0
    })
    .map((x) => x.step)
}

// --- Aggregaat voor het dashboard ------------------------------------------

export function berekenGuidance(input: GuidanceInput): Guidance {
  return {
    huidigeFase: huidigeFase(input.wedding, input.vandaag),
    route: routeVoortgang(input.tasks, input.wedding, input.vandaag),
    stappen: volgendeStappen(input),
  }
}
