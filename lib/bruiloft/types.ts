// Datamodel voor de bruiloftplanner.
// Strak gehouden omdat dit later de basis vormt voor databasetabellen.
// Alles hangt onder één Wedding; elke deel-entiteit draagt een weddingId,
// zodat meerdere bruiloften naast elkaar kunnen bestaan.

export type ID = string
export type ISODate = string // 'YYYY-MM-DD'
export type ISODateTime = string // volledige ISO timestamp

// --- Wedding ---------------------------------------------------------------

// 'niet_van_toepassing' = het bruidspaar heeft expliciet aangegeven dit niet
// nodig te hebben (bijv. geen videograaf) — anders dan een ontbrekende key,
// die "nog niet gevraagd/onbekend" betekent.
export type VoortgangStatus = 'geboekt' | 'bezig' | 'te_doen' | 'niet_van_toepassing'

export type VoortgangCategorie =
  | 'locatie'
  | 'fotograaf'
  | 'videograaf'
  | 'catering'
  | 'dj_of_band'
  | 'trouwambtenaar'
  | 'trouwkleding'
  | 'bloemist'

export type CeremonieType = 'gemeentelijk' | 'religieus' | 'symbolisch'

// Voortgang van het kaart-voor-kaart samenstellen van de takenlijst.
// Gedeeld per bruiloft (database), zodat partners elkaars keuzes zien.
export interface TakenVoorstellenState {
  beslist: Record<string, 'toegevoegd' | 'overgeslagen'> // per taaktitel
  afgerond: boolean
}

export interface Wedding {
  id: ID
  partner1Naam: string
  partner2Naam: string
  trouwdatum: ISODate
  locatie: string // trouwlocatie/venue (kan nog onbekend zijn)
  woonplaats: string // woonplaats bruidspaar — geografisch ankerpunt voor personalisatie
  provincie: string // provincie bruidspaar — regio-anker voor leveranciersmatching ('' = onbekend)
  totaalBudget: number // in euro
  aantalDaggasten: number // geschat
  aantalAvondgasten: number // geschat
  ceremonietype: CeremonieType | null
  geregeldeZaken: Partial<Record<VoortgangCategorie, VoortgangStatus>>
  takenVoorstellen: TakenVoorstellenState
  // Zelf te beheren lijst budgetcategorieën (aanvullen/verwijderen), los van
  // de vaste suggestielijst in de UI.
  budgetCategorieen: string[]
  // Zelf te beheren lijst leverancierscategorieën (aanvullen/verwijderen), los van
  // de vaste suggestielijst in de UI.
  vendorCategorieen: string[]
  // Zelf te beheren lijst gasttypes (dag/avond/ceremonie/...), los van de
  // vaste suggestielijst in de UI. Vervangt de aanname dat elke gast per
  // definitie een dag- of avondgast is.
  gasttypeCategorieen: string[]
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export type WeddingInput = Omit<Wedding, 'id' | 'createdAt' | 'updatedAt'>

// --- Guest -----------------------------------------------------------------

// Vrije tekst: bruidsparen kunnen bij het toevoegen/bewerken van een gast ook
// zelf een categorie of gasttype intypen (net als bij budgetcategorieën en
// leverancierstypes), naast de vaste suggestielijst in de UI.
export type GuestCategorie = string

export type Gasttype = string

export type RsvpStatus =
  | 'nog niet uitgenodigd'
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
  email: string // optioneel; voor RSVP-uitnodiging per e-mail
  telefoon: string // optioneel; voor RSVP-uitnodiging per WhatsApp
  tafelId?: ID // tafelschikking
  stoelIndex?: number // vaste plek aan de tafel (0-gebaseerd); leeg = automatisch
  rsvpCode?: string // persoonlijke code voor de publieke RSVP
}

export type GuestInput = Omit<Guest, 'id'>

// Patch voor gast-updates. tafelId/stoelIndex mogen expliciet `null` zijn om de
// koppeling of de vaste plek te wissen; `undefined` laat het veld ongemoeid.
export type GuestPatch = Partial<Omit<GuestInput, 'tafelId' | 'stoelIndex'>> & {
  tafelId?: ID | null
  stoelIndex?: number | null
}

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

export type VendorType = string

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
  adres: string
  // Coördinaten voor de kaartweergave; null zolang adres nog niet (succesvol)
  // gegeocodeerd is (of leeg is).
  latitude?: number | null
  longitude?: number | null
  budgetItemId?: ID
  // Herkomst uit de globale directory (public.suppliers); leeg bij handmatige invoer.
  supplierId?: ID
  // Herkomst uit tpw_businesses; leeg bij handmatige invoer of suppliers-koppeling.
  tpwBusinessId?: ID
}

export type VendorInput = Omit<Vendor, 'id'>

// Geschiedenis van offerte-/contactaanvragen aan een leverancier. Append-only
// log, los van vendor.status (dat blijft de door de gebruiker gestuurde
// pipeline-stap); dit maakt zichtbaar wannéér en wát er verstuurd is.
export type VendorContactType = 'offerte' | 'contact'

export interface VendorContactRequest {
  id: ID
  weddingId: ID
  vendorId: ID
  type: VendorContactType
  onderwerp: string
  bericht: string
  verzondenNaar: string
  verzondenDoor?: ID
  createdAt: ISODateTime
}

// --- Berichten (Berichtencentrum) -------------------------------------------

// Eén generieke tabel voor het berichtencentrum: inkomende systeem-/AI-
// berichten aan de gebruiker, uitgaande communicatie naar leveranciers
// (offerte/contact) én inkomende reacties van leveranciers daarop
// ('leverancier_reactie', geplaatst via de token-link in de e-mail).
export type MessageDirection = 'inbound' | 'outbound'
export type MessageType =
  | 'systeem'
  | 'leverancier_offerte'
  | 'leverancier_contact'
  | 'leverancier_reactie'
  | 'leverancier_vervolg'
export type MessageAfzenderType = 'systeem' | 'gebruiker' | 'leverancier'
export type MessageStatus = 'concept' | 'verzonden'

// Actieknop bij een bericht (opgeslagen in messages.metadata.acties): brengt
// de lezer direct naar de plek in de app waar de actie hoort. Alleen interne
// paden ('/bruiloft/...') — de UI negeert al het andere.
export interface MessageActie {
  label: string
  href: string
}

// Standaard afwijzingsgrond die een leverancier met één klik kan geven op de
// publieke reactiepagina (alleen bij offerteaanvragen). Opgeslagen in
// messages.metadata.afwijzingsGrond op het reactiebericht; de leesbare zin
// staat gewoon in `inhoud` (zinnen boven badges). De leverancier-pipeline
// (vendor.status) wijzigt hier bewust NIET automatisch door — die blijft
// gebruikergestuurd; het bericht linkt naar de leverancier zodat de gebruiker
// de status zelf in één klik kan bijwerken.
export type AfwijzingsGrond = 'geen_beschikbaarheid' | 'buiten_werkgebied' | 'past_niet_bij_aanbod'

export interface Message {
  id: ID
  weddingId: ID
  direction: MessageDirection
  type: MessageType
  vendorId?: ID
  onderwerp: string
  inhoud: string
  afzenderNaam: string
  afzenderType: MessageAfzenderType
  verzondenDoor?: ID
  status: MessageStatus
  metadata?: Record<string, unknown>
  // Bij een leveranciersreactie/-vervolgbericht: het uitgaande bericht waarmee
  // het gesprek begon (de thread-root, niet per se het vorige bericht).
  parentMessageId?: ID
  // Archiveren/verwijderen: zacht en herstelbaar, gedeeld voor de hele
  // bruiloft (geen per-gebruiker staat zoals MessageRead hieronder).
  archivedAt?: ISODateTime
  deletedAt?: ISODateTime
  createdAt: ISODateTime
}

// Leesstatus per gebruiker (een bruiloft heeft vaak meerdere leden, dus
// "gelezen" is niet gedeeld zoals bij VendorContactRequest).
export interface MessageRead {
  messageId: ID
  userId: ID
  readAt: ISODateTime
}

// --- BudgetItem ------------------------------------------------------------

// Categorie is vrije tekst (bruidsparen beheren hun eigen lijst); dit is de
// vaste standaardset die als uitgangspunt dient (richtverdeling, sjablonen).
export type StandaardBudgetCategorie =
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

export type BudgetCategorie = string

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
  | 'bruid'
  | 'bruidegom'
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
  eindtijd: string // 'HH:MM', leeg string indien niet ingevuld
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
  // Plek op de plattegrond (wereldeenheden); null/undefined = nog niet geplaatst.
  posX?: number | null
  posY?: number | null
  rotatie?: number // graden, stappen van 45
}

export type TableInput = Omit<Table, 'id'>

// --- WebsiteContent (publieke trouwwebsite) --------------------------------

export type WeddingThema =
  | 'klassiek'
  | 'modern'
  | 'romantisch'
  | 'rustiek'
  | 'minimalistisch'
  | 'botanisch'
  | 'gala'
  | 'artdeco'
  | 'couture'
export type WeddingLettertype =
  | 'cormorant'
  | 'playfair'
  | 'lora'
  | 'dancing-script'
  | 'eb-garamond'
  | 'great-vibes'
  // Website v3: uitgebreide fontbibliotheek (zie lib/bruiloft/websiteTheme.ts).
  | 'italiana'
  | 'marcellus'
  | 'libre-baskerville'
  | 'josefin-sans'
  | 'bodoni-moda'
  | 'parisienne'

export interface SectieConfig {
  zichtbaar: boolean
  naam: string
  volgorde?: number
  fotoUrl?: string
  uitlijning?: 'links' | 'midden' | 'rechts'
  achtergrondKleur?: string          // hex of 'transparant'
  tekstKleur?: 'licht' | 'donker'   // auto-contrast override
  inhoud?: string                    // vrije tekst voor secties als programma
  countdownDatum?: string            // ISO-datum specifiek voor countdown-sectie
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
  // Website v3: design-tokens; null = afleiden uit thema/kleurAccent/
  // kopLettertype (zie lib/bruiloft/websiteTheme.ts).
  theme: import('./websiteTheme').ThemeTokens | null
  // Website v3 fase 3: site-breed wachtwoord. Het gehashte wachtwoord zelf
  // (site_password) zit bewust NIET in dit domeintype — dat wordt alleen
  // server-side gezet via POST /api/trouwen/settings (zie
  // store/bruiloftStore.ts saveSitePassword), nooit via deze directe
  // client-upsert-laag.
  sitePasswordEnabled: boolean
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
  thema: WeddingThema
  kleurAccent: string
  kopLettertype: WeddingLettertype
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
  thema: WeddingThema
  kleurAccent: string
  kopLettertype: WeddingLettertype
  headerFotoUrl: string
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
  websitePages: import('./websiteBlocks').WebsitePage[]
}
