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

// Vertaalt de legacy 'toegewezenAan'-enum (gebruikt door sjabloontaken en
// AI-suggesties, vóórdat er een echt gekoppeld lid is) naar leesbare tekst.
// Toont nooit "Partner 1"/"Partner 2" letterlijk — valt terug op de echte
// voornaam zodra die bekend is.
export function toegewezenAanLabel(
  value: ToegewezenAan,
  partner1Naam?: string,
  partner2Naam?: string
): string {
  if (value === 'partner 1') return partner1Naam || 'Partner 1'
  if (value === 'partner 2') return partner2Naam || 'Partner 2'
  if (value === 'getuige') return 'Getuige(n)'
  return value.charAt(0).toUpperCase() + value.slice(1)
}

// Vaste suggestielijst; bruidsparen kunnen bij het aanmaken/bewerken van een
// gast ook een eigen categorie of gasttype intypen (zie GuestForm).
export const GUEST_CATEGORIEEN: GuestCategorie[] = [
  'familie partner 1',
  'familie partner 2',
  'vrienden',
  "collega's",
  'overig',
]

// Standaard suggestielijst; bruidsparen kunnen hun eigen lijst uitbreiden,
// hernoemen of inkorten via wedding.gasttypeCategorieen (zie
// GastenTypeManageModal) — bijv. wanneer dag/avond niet past bij hun opzet.
export const GASTTYPES: Gasttype[] = ['daggast', 'avondgast', 'ceremonie']

export const RSVP_STATUSSEN: RsvpStatus[] = [
  'nog niet uitgenodigd',
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

// Categorieën die op dit moment daadwerkelijk gevuld zijn in tpw_businesses.
// De rest van TPW_CATEGORIEEN volgt later — uitbreiden is dan één regel hier,
// geldt meteen voor de filterchips én de AI-aanbevelingen op /bruiloft/ontdekken.
export const BESCHIKBARE_TPW_CATEGORIEEN: TpwCategorie[] = [
  'Trouwlocaties',
  'Weddingplanners',
  'Trouwambtenaren',
]

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

// Items (leveranciers, gasten) waarvan de categorie/type niet (meer) in de
// beheerde lijst staat, vallen terug op 'overig' bij weergave/telling —
// defensief tegen legacy/verwijderde categorieën.
export function categorieVoorWeergave(type: string, categorieen: string[]): string {
  return categorieen.includes(type) ? type : 'overig'
}

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
