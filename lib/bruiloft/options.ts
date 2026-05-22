// Keuzelijsten voor formulieren, afgeleid van de types. Eén bron van waarheid.

import type {
  BudgetCategorie,
  Gasttype,
  GuestCategorie,
  Prioriteit,
  Rol,
  RsvpStatus,
  TaskStatus,
  ToegewezenAan,
  VendorStatus,
  VendorType,
} from './types'

export const GUEST_CATEGORIEEN: GuestCategorie[] = [
  'familie partner 1',
  'familie partner 2',
  'vrienden',
  "collega's",
  'overig',
]

export const GASTTYPES: Gasttype[] = ['daggast', 'avondgast']

export const RSVP_STATUSSEN: RsvpStatus[] = [
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

export const DRAAIBOEK_ROLLEN: Rol[] = [
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

export const BUDGET_CATEGORIEEN: BudgetCategorie[] = [
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
