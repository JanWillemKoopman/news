// Keuzelijsten voor formulieren, afgeleid van de types. Eén bron van waarheid.

import type {
  Gasttype,
  GuestCategorie,
  Prioriteit,
  Rol,
  RsvpStatus,
  StandaardBudgetCategorie,
  TafelVorm,
  TaskStatus,
  ToegewezenAan,
  VendorStatus,
  VendorType,
} from './types'

// Vertaalt een categorie-waarde (zoals opgeslagen in DB) naar een leesbaar label.
// Vervangt "partner 1/2" door de werkelijke namen van het bruidspaar indien beschikbaar.
export function categorieLabelVoor(
  c: string,
  partner1Naam?: string,
  partner2Naam?: string
): string {
  if (c === 'familie partner 1') return `Familie van ${partner1Naam || 'partner 1'}`
  if (c === 'familie partner 2') return `Familie van ${partner2Naam || 'partner 2'}`
  return c.charAt(0).toUpperCase() + c.slice(1)
}

export const GUEST_CATEGORIEEN: GuestCategorie[] = [
  'familie partner 1',
  'familie partner 2',
  'vrienden',
  "collega's",
  'overig',
]

export const GASTTYPES: Gasttype[] = ['daggast', 'avondgast']

export const RSVP_STATUSSEN: RsvpStatus[] = [
  'niet verzonden',
  'uitgenodigd',
  'bevestigd',
  'afgemeld',
  'geen reactie',
]

export const TASK_STATUSSEN: TaskStatus[] = ['open', 'bezig', 'klaar']

export const PRIORITEITEN: Prioriteit[] = ['laag', 'midden', 'hoog']

export const TOEGEWEZEN_AAN: ToegewezenAan[] = [
  'partner 1',
  'partner 2',
  'samen',
  'getuige',
  'overig',
]

export const TPW_CATEGORIEEN = [
  'Trouwlocaties',
  'Weddingplanners',
  'Trouwambtenaren',
  'Trouwjurken',
  'Trouwpakken',
  'Bruidsmakeup',
  'Bruidskapsels',
  'Trouwringen',
  'Trouwfotografen',
  'Videografen',
  'Photobooths',
  'Bruidstaart',
  'Catering',
  'Decoratie',
  'Bloemen',
  'Muziek',
  'Trouwvervoer',
  'Entertainment',
  'Trouwkaarten',
  'Bedankjes',
] as const

export type TpwCategorie = (typeof TPW_CATEGORIEEN)[number]

// Omzetting van TPW-categorienaam naar URL-slug (lowercase).
export function tpwCategorieNaarSlug(categorie: TpwCategorie): string {
  return categorie.toLowerCase()
}

// Omzetting van URL-slug terug naar TPW-categorienaam.
export function slugNaarTpwCategorie(slug: string): TpwCategorie | undefined {
  return TPW_CATEGORIEEN.find((c) => c.toLowerCase() === slug.toLowerCase())
}

export const VENDOR_TYPES: VendorType[] = [
  'locatie',
  'catering',
  'fotograaf',
  'videograaf',
  'dj of band',
  'bloemist',
  'kleding',
  'vervoer',
  'taart',
  'overig',
]

export const VENDOR_STATUSSEN: VendorStatus[] = [
  'te bezoeken',
  'bezocht',
  'offerte aangevraagd',
  'geboekt',
  'afgewezen',
]

export const TAFEL_VORMEN: TafelVorm[] = ['rond', 'vierkant', 'langwerpig']

export const DRAAIBOEK_ROLLEN: Rol[] = [
  'bruid',
  'bruidegom',
  'bruidspaar',
  'ceremoniemeester',
  'fotograaf',
  'videograaf',
  'dj of band',
  'catering',
  'locatie',
  'vervoer',
  'gasten',
  'overig',
]

// Standaard suggestielijst; bruidsparen kunnen hun eigen lijst uitbreiden of
// inkorten via wedding.budgetCategorieen (zie BudgetCategoryManageModal).
export const BUDGET_CATEGORIEEN: StandaardBudgetCategorie[] = [
  'locatie',
  'catering',
  'kleding',
  'fotografie en video',
  'muziek',
  'bloemen en decoratie',
  'vervoer',
  'taart',
  'uitnodigingen en drukwerk',
  'ringen',
  'overig',
]
