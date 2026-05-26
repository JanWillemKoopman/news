// Datamodel voor de bruiloftplanner.
// Strak gehouden omdat dit later de basis vormt voor databasetabellen.
// Alles hangt onder één Wedding; elke deel-entiteit draagt een weddingId,
// zodat meerdere bruiloften naast elkaar kunnen bestaan.

import type { ThemeConfig } from './theme'

export type ID = string
export type ISODate = string // 'YYYY-MM-DD'
export type ISODateTime = string // volledige ISO timestamp

// --- Wedding ---------------------------------------------------------------

export interface Wedding {
  id: ID
  partner1Naam: string
  partner2Naam: string
  trouwdatum: ISODate
  locatie: string
  totaalBudget: number // in euro
  aantalDaggasten: number // geschat
  aantalAvondgasten: number // geschat
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export type WeddingInput = Omit<Wedding, 'id' | 'createdAt' | 'updatedAt'>

// --- Guest -----------------------------------------------------------------

export type GuestCategorie =
  | 'familie partner 1'
  | 'familie partner 2'
  | 'vrienden'
  | "collega's"
  | 'overig'

export type Gasttype = 'daggast' | 'avondgast'

export type RsvpStatus =
  | 'uitgenodigd'
  | 'bevestigd'
  | 'afgemeld'
  | 'geen reactie'

export interface Guest {
  id: ID
  weddingId: ID
  voornaam: string
  achternaam: string
  categorie: GuestCategorie
  gasttype: Gasttype
  rsvpStatus: RsvpStatus
  dieetwensen: string
  heeftPartner: boolean
  partnerNaam: string // optioneel; leeg als geen partner
  aantalKinderen: number
  adres: string
  notitie: string
  tafelId?: ID // tafelschikking
  rsvpCode?: string // persoonlijke code voor de publieke RSVP
}

export type GuestInput = Omit<Guest, 'id'>

// --- Task ------------------------------------------------------------------

export type TaskStatus = 'open' | 'bezig' | 'klaar'
export type Prioriteit = 'laag' | 'midden' | 'hoog'
export type ToegewezenAan =
  | 'partner 1'
  | 'partner 2'
  | 'samen'
  | 'getuige'
  | 'overig'

// Afgeleid label op basis van de trouwdatum.
export type Tijdsblok =
  | '12 maanden voor'
  | '9 maanden voor'
  | '6 maanden voor'
  | '3 maanden voor'
  | '1 maand voor'
  | 'laatste week'
  | 'trouwweek'
  | 'na de bruiloft'

export interface Task {
  id: ID
  weddingId: ID
  titel: string
  omschrijving: string
  deadline: ISODate
  tijdsblok: Tijdsblok
  status: TaskStatus
  prioriteit: Prioriteit
  toegewezenAan: ToegewezenAan
  vendorId?: ID
  budgetItemId?: ID
}

export type TaskInput = Omit<Task, 'id'>

// --- Vendor ----------------------------------------------------------------

export type VendorType =
  | 'locatie'
  | 'catering'
  | 'fotograaf'
  | 'videograaf'
  | 'dj of band'
  | 'bloemist'
  | 'kleding'
  | 'vervoer'
  | 'taart'
  | 'overig'

export type VendorStatus =
  | 'te bezoeken'
  | 'bezocht'
  | 'offerte aangevraagd'
  | 'geboekt'
  | 'afgewezen'

export interface Vendor {
  id: ID
  weddingId: ID
  naam: string
  type: VendorType
  status: VendorStatus
  contactpersoon: string
  telefoon: string
  email: string
  website: string
  geoffreerdBedrag: number // in euro
  notitie: string
  budgetItemId?: ID
}

export type VendorInput = Omit<Vendor, 'id'>

// --- BudgetItem ------------------------------------------------------------

export type BudgetCategorie =
  | 'locatie'
  | 'catering'
  | 'kleding'
  | 'fotografie en video'
  | 'muziek'
  | 'bloemen en decoratie'
  | 'vervoer'
  | 'taart'
  | 'uitnodigingen en drukwerk'
  | 'ringen'
  | 'overig'

export interface PaymentTerm {
  id: ID
  bedrag: number // in euro
  vervaldatum: ISODate
  betaald: boolean
}

export interface BudgetItem {
  id: ID
  weddingId: ID
  categorie: BudgetCategorie
  omschrijving: string
  geschatBedrag: number
  geoffreerdBedrag: number
  betaaldBedrag: number
  vendorId?: ID
  betaaltermijnen: PaymentTerm[]
}

export type BudgetItemInput = Omit<BudgetItem, 'id'>

// --- ScheduleItem (trouwdag-draaiboek) -------------------------------------

// Rollen waarop een draaiboekonderdeel betrekking heeft (voor filteren/export).
export type Rol =
  | 'bruidspaar'
  | 'ceremoniemeester'
  | 'fotograaf'
  | 'videograaf'
  | 'dj of band'
  | 'catering'
  | 'locatie'
  | 'vervoer'
  | 'gasten'
  | 'overig'

export interface ScheduleItem {
  id: ID
  weddingId: ID
  tijd: string // 'HH:MM'
  titel: string
  omschrijving: string
  locatie: string
  betrokkenen: Rol[]
}

export type ScheduleItemInput = Omit<ScheduleItem, 'id'>

// --- Table (tafelschikking) ------------------------------------------------

export type TafelVorm = 'rond' | 'vierkant' | 'langwerpig'

export interface Table {
  id: ID
  weddingId: ID
  naam: string
  vorm: TafelVorm
  capaciteit: number
}

export type TableInput = Omit<Table, 'id'>

// --- WebsiteContent (publieke trouwwebsite) --------------------------------

export interface WebsiteContent {
  id: ID
  weddingId: ID
  welkomsttekst: string
  dresscode: string
  cadeaulijst: string
  hotels: string
  routebeschrijving: string
  contact: string
  theme: ThemeConfig | null
}

export type WebsiteContentInput = Omit<WebsiteContent, 'id'>

// --- Activiteit & opmerkingen (samen plannen) ------------------------------

// De modules die in de feed verschijnen (mapt op de rechten-matrix).
export type ActivityModule =
  | 'taken'
  | 'gasten'
  | 'leveranciers'
  | 'budget'
  | 'draaiboek'
  | 'tafels'

export type ActivityAction = 'insert' | 'update' | 'delete'

export interface ActivityEntry {
  id: ID
  weddingId: ID
  module: ActivityModule
  entityType: string // brontabel (tasks, guests, ...)
  entityId?: ID
  action: ActivityAction
  actorId?: ID
  actorName: string // snapshot ten tijde van de wijziging
  label: string // best-effort titel/naam van de gewijzigde rij
  createdAt: ISODateTime
}

export interface TaskComment {
  id: ID
  weddingId: ID
  taskId: ID
  authorId?: ID
  authorName: string // snapshot
  body: string
  createdAt: ISODateTime
}

// De client levert alleen deze velden; auteur wordt server-side ingevuld.
export interface TaskCommentInput {
  weddingId: ID
  taskId: ID
  body: string
}

// --- Opslag-envelope -------------------------------------------------------

export interface WeddingDatabase {
  version: number
  weddings: Wedding[]
  guests: Guest[]
  tasks: Task[]
  vendors: Vendor[]
  budgetItems: BudgetItem[]
  scheduleItems: ScheduleItem[]
  tables: Table[]
  websiteContents: WebsiteContent[]
}
