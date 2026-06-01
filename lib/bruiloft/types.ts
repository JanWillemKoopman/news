// Datamodel voor de bruiloftplanner.
// Strak gehouden omdat dit later de basis vormt voor databasetabellen.
// Alles hangt onder één Wedding; elke deel-entiteit draagt een weddingId,
// zodat meerdere bruiloften naast elkaar kunnen bestaan.

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

// Eén niveau diep; opgeslagen als jsonb-array op tasks.subtaken.
export interface Subtaak {
  id: ID
  titel: string
  klaar: boolean
}

export interface Task {
  id: ID
  weddingId: ID
  titel: string
  omschrijving: string
  deadline: ISODate
  tijdsblok: Tijdsblok
  status: TaskStatus
  prioriteit: Prioriteit
  // Legacy-veld: blijft bestaan voor backwards-compat. UI toont 'assignees' bij voorkeur,
  // en valt terug op deze tekst-enum als assignees nog leeg is (oude taken).
  toegewezenAan: ToegewezenAan
  // Lijst van wedding-member user_ids. Lege array = nog niemand toegewezen.
  assignees: ID[]
  subtaken: Subtaak[]
  // Optionele handmatige sortering binnen tijdsblok/dag.
  volgorde?: number
  vendorId?: ID
  budgetItemId?: ID
}

export type TaskInput = Omit<Task, 'id'>

// --- WeddingMember ---------------------------------------------------------
// Snapshot uit de list_wedding_members RPC; wordt door de store ingeladen
// voor de assignee-picker en AvatarStack.

export interface WeddingMember {
  userId: ID
  email: string
  displayName: string
  role: WeddingRoleSnapshot
  avatarUrl?: string
}

// Lokale alias zodat types.ts geen import op permissions.ts hoeft (cycle-vrij).
// Houd in sync met WeddingRole in lib/bruiloft/permissions.ts.
export type WeddingRoleSnapshot = 'owner' | 'planner' | 'helper' | 'viewer'

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

export type WeddingThema = 'klassiek' | 'modern' | 'romantisch' | 'rustiek' | 'minimalistisch' | 'botanisch'
export type WeddingLettertype = 'cormorant' | 'playfair' | 'lora' | 'dancing-script' | 'eb-garamond' | 'great-vibes'

export interface SectieConfig {
  zichtbaar: boolean
  naam: string
  volgorde?: number
  fotoUrl?: string
  uitlijning?: 'links' | 'midden' | 'rechts'
}

export interface FaqItem {
  id: string
  vraag: string
  antwoord: string
}

export interface GallerijFoto {
  id: string
  url: string
  bijschrift: string
}

export interface WebsiteContent {
  id: ID
  weddingId: ID
  // Bestaande tekstvelden
  welkomsttekst: string
  dresscode: string
  cadeaulijst: string
  hotels: string
  routebeschrijving: string
  contact: string
  // Nieuwe velden
  slug: string | null
  websiteGepubliceerd: boolean
  thema: WeddingThema
  kleurAccent: string
  kopLettertype: WeddingLettertype
  headerFotoUrl: string
  headerOverlay: number
  sectiesConfig: Record<string, SectieConfig>
  faq: FaqItem[]
  gallerij: GallerijFoto[]
}

export type WebsiteContentInput = Omit<WebsiteContent, 'id'>

export interface WebsiteFoto {
  id: ID
  weddingId: ID
  url: string
  bijschrift: string
  volgorde: number
}

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

// --- Registry (Cadeaulijst) ------------------------------------------------

export type RegistryItemType = 'gift' | 'fund'
export type RegistryPaymentStatus = 'pending' | 'confirmed' | 'cancelled'
export type RegistryPaymentMethod = 'bank_transfer' | 'payment_link'

export interface RegistryItem {
  id: ID
  weddingId: ID
  type: RegistryItemType
  title: string
  description: string
  imageUrl: string
  shopUrl: string
  targetAmount: number | null   // cents, fund only
  suggestedAmounts: number[]    // cents
  paymentLink: string
  sortOrder: number
  isVisible: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export type RegistryItemInput = Omit<RegistryItem, 'id' | 'createdAt' | 'updatedAt'>

export interface RegistryReservation {
  id: ID
  itemId: ID
  cancelToken: string
  guestName: string
  guestEmail: string
  message: string
  reservedAt: ISODateTime
}

export interface RegistryContribution {
  id: ID
  itemId: ID
  guestName: string
  guestEmail: string
  amount: number             // cents
  message: string
  paymentStatus: RegistryPaymentStatus
  paymentMethod: RegistryPaymentMethod
  paymentReference: string
  confirmedAt: ISODateTime | null
  contributedAt: ISODateTime
}

export interface RegistrySettings {
  id: ID
  weddingId: ID
  isEnabled: boolean
  password: string
  introText: string
  bankAccountIban: string
  bankAccountName: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export type RegistrySettingsInput = Omit<RegistrySettings, 'id' | 'createdAt' | 'updatedAt'>

// Public view of a registry item (shown on guest page)
export interface PublicRegistryItem {
  id: ID
  type: RegistryItemType
  title: string
  description: string
  imageUrl: string
  shopUrl: string
  targetAmount: number | null
  suggestedAmounts: number[]
  paymentLink: string
  sortOrder: number
  isReserved: boolean
  totalConfirmed: number  // cents
  totalPending: number    // cents
  contributorCount: number
}

export interface PublicRegistryData {
  enabled: boolean
  passwordRequired: boolean
  introText: string
  bankAccountIban: string
  bankAccountName: string
  weddingId: ID
  partner1Naam: string
  partner2Naam: string
  trouwdatum: string | null
  items: PublicRegistryItem[]
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
