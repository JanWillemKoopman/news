// De opslaglaag: de enige grens waarmee de app praat.
// Componenten praten NOOIT direct met localStorage, alleen met deze interface.
// Alle methodes zijn async (Promise) zodat een latere ApiWeddingRepository
// exact dezelfde interface kan implementeren zonder dat de app verandert.

import type {
  ActivityEntry,
  AdresShare,
  AgendaShare,
  BudgetItem,
  BudgetItemDocument,
  BudgetItemDocumentInput,
  BudgetItemInput,
  DraaiboekShare,
  Guest,
  GuestInput,
  GuestPatch,
  ID,
  Message,
  MessageRead,
  MoodBoardItem,
  MoodBoardItemInput,
  ScheduleItem,
  ScheduleItemInput,
  Table,
  TableInput,
  Task,
  TaskComment,
  TaskCommentInput,
  TaskInput,
  Vendor,
  VendorContactRequest,
  VendorDocument,
  VendorDocumentInput,
  VendorInput,
  Wedding,
  WeddingInput,
  WeddingMember,
  WebsiteContent,
  WebsiteContentInput,
  WebsiteFoto,
} from './types'
import type { WebsitePage, WebsitePageInput } from './websiteBlocks'

export interface WeddingRepository {
  // Wedding. V1 plant één bruiloft, maar de interface is meervoud-klaar.
  listWeddings(): Promise<Wedding[]>
  getWedding(id: ID): Promise<Wedding | null>
  getActiveWedding(): Promise<Wedding | null>
  createWedding(input: WeddingInput): Promise<Wedding>
  updateWedding(id: ID, patch: Partial<WeddingInput>): Promise<Wedding>
  deleteWedding(id: ID): Promise<void>

  // Guests
  listGuests(weddingId: ID): Promise<Guest[]>
  createGuest(input: GuestInput): Promise<Guest>
  createGuests(inputs: GuestInput[]): Promise<Guest[]> // bulk voor import
  updateGuest(id: ID, patch: GuestPatch): Promise<Guest>
  deleteGuest(id: ID): Promise<void>

  // Tasks
  listTasks(weddingId: ID): Promise<Task[]>
  createTask(input: TaskInput): Promise<Task>
  createTasks(inputs: TaskInput[]): Promise<Task[]> // bulk voor sjabloontaken
  updateTask(id: ID, patch: Partial<TaskInput>): Promise<Task>
  deleteTask(id: ID): Promise<void>

  // Vendors
  listVendors(weddingId: ID): Promise<Vendor[]>
  createVendor(input: VendorInput): Promise<Vendor>
  updateVendor(id: ID, patch: Partial<VendorInput>): Promise<Vendor>
  deleteVendor(id: ID): Promise<void>

  // Contact-/offertegeschiedenis per leverancier (append-only; wordt server-side
  // ingevuld door de /api/leveranciers/contact-route, hier alleen leesbaar).
  listVendorContactRequests(weddingId: ID): Promise<VendorContactRequest[]>

  // Documentenkluis per leverancier (metadata; het bestand zelf staat in de
  // private storage-bucket, zie lib/supabase/storage.ts). Geen update: een
  // document vervang je door verwijderen + opnieuw uploaden.
  listVendorDocuments(weddingId: ID): Promise<VendorDocument[]>
  createVendorDocument(input: VendorDocumentInput): Promise<VendorDocument>
  deleteVendorDocument(id: ID): Promise<void>

  // Draaiboek delen via publieke link (één per bruiloft; null = delen uit).
  // De publieke leeskant loopt via de anon-RPC get_public_draaiboek, niet
  // via deze repository.
  getDraaiboekShare(weddingId: ID): Promise<DraaiboekShare | null>
  createDraaiboekShare(weddingId: ID): Promise<DraaiboekShare>
  deleteDraaiboekShare(weddingId: ID): Promise<void>

  // Agenda-koppeling (ICS-abonnement); de leeskant is /api/agenda/[token].
  getAgendaShare(weddingId: ID): Promise<AgendaShare | null>
  createAgendaShare(weddingId: ID): Promise<AgendaShare>
  deleteAgendaShare(weddingId: ID): Promise<void>

  // Adreslink (adressen verzamelen); de publieke kant is /adres/[token].
  getAdresShare(weddingId: ID): Promise<AdresShare | null>
  createAdresShare(weddingId: ID): Promise<AdresShare>
  deleteAdresShare(weddingId: ID): Promise<void>

  // Moodboard: één plat, geordend bord per bruiloft.
  listMoodBoardItems(weddingId: ID): Promise<MoodBoardItem[]>
  createMoodBoardItem(weddingId: ID, input: MoodBoardItemInput, volgorde: number): Promise<MoodBoardItem>
  updateMoodBoardItem(id: ID, patch: Partial<Pick<MoodBoardItem, 'categorie' | 'titel'>>): Promise<MoodBoardItem>
  deleteMoodBoardItem(id: ID): Promise<void>
  // Bulk-herordenen na een drag: elke rij krijgt zijn nieuwe volgorde.
  reorderMoodBoardItems(updates: { id: ID; volgorde: number }[]): Promise<void>

  // Berichtencentrum (Postvak IN / Verzonden / Archief / Verwijderd). Inserts
  // gebeuren server-side (welkomst-trigger, /api/leveranciers/contact-route,
  // /api/berichten/[id]/reply-route); hier alleen lezen + leesstatus en
  // archief-/verwijderstaat bijwerken (die laatste is gedeeld per bruiloft,
  // geen per-gebruiker staat zoals leesstatus).
  listMessages(weddingId: ID): Promise<Message[]>
  listMessageReads(weddingId: ID): Promise<MessageRead[]>
  markMessageRead(messageId: ID): Promise<MessageRead>
  archiveMessage(messageId: ID): Promise<Message>
  unarchiveMessage(messageId: ID): Promise<Message>
  trashMessage(messageId: ID): Promise<Message>
  restoreMessage(messageId: ID): Promise<Message>

  // BudgetItems
  listBudgetItems(weddingId: ID): Promise<BudgetItem[]>
  createBudgetItem(input: BudgetItemInput): Promise<BudgetItem>
  createBudgetItems(inputs: BudgetItemInput[]): Promise<BudgetItem[]>
  updateBudgetItem(id: ID, patch: Partial<BudgetItemInput>): Promise<BudgetItem>
  deleteBudgetItem(id: ID): Promise<void>

  // Documentenkluis per budgetpost (metadata; het bestand zelf staat in de
  // private storage-bucket, zie lib/supabase/storage.ts). Geen update: een
  // document vervang je door verwijderen + opnieuw uploaden.
  listBudgetItemDocuments(weddingId: ID): Promise<BudgetItemDocument[]>
  createBudgetItemDocument(input: BudgetItemDocumentInput): Promise<BudgetItemDocument>
  deleteBudgetItemDocument(id: ID): Promise<void>

  // ScheduleItems (trouwdag-draaiboek)
  listScheduleItems(weddingId: ID): Promise<ScheduleItem[]>
  createScheduleItem(input: ScheduleItemInput): Promise<ScheduleItem>
  updateScheduleItem(id: ID, patch: Partial<ScheduleItemInput>): Promise<ScheduleItem>
  deleteScheduleItem(id: ID): Promise<void>

  // Tables (tafelschikking)
  listTables(weddingId: ID): Promise<Table[]>
  createTable(input: TableInput): Promise<Table>
  updateTable(id: ID, patch: Partial<TableInput>): Promise<Table>
  deleteTable(id: ID): Promise<void>

  // WebsiteContent (publieke trouwwebsite) — één per bruiloft (upsert).
  getWebsiteContent(weddingId: ID): Promise<WebsiteContent | null>
  saveWebsiteContent(
    weddingId: ID,
    patch: Partial<WebsiteContentInput>
  ): Promise<WebsiteContent>
  checkSlugAvailable(slug: string): Promise<boolean>

  // Website-pagina's (website v3: blokkenmodel, zie websiteBlocks.ts).
  listWebsitePages(weddingId: ID): Promise<WebsitePage[]>
  createWebsitePage(input: WebsitePageInput): Promise<WebsitePage>
  updateWebsitePage(id: ID, patch: Partial<WebsitePageInput>): Promise<WebsitePage>
  deleteWebsitePage(id: ID): Promise<void>

  // Website-foto's (gallerij).
  listWebsiteFotos(weddingId: ID): Promise<WebsiteFoto[]>
  createWebsiteFoto(weddingId: ID, url: string, bijschrift: string, volgorde: number): Promise<WebsiteFoto>
  updateWebsiteFoto(id: ID, patch: { bijschrift?: string; volgorde?: number }): Promise<WebsiteFoto>
  deleteWebsiteFoto(id: ID): Promise<void>

  // Activiteitenfeed (read-only; gevuld door DB-triggers).
  listActivity(weddingId: ID, limit?: number): Promise<ActivityEntry[]>

  // Opmerkingen op taken.
  listTaskComments(weddingId: ID): Promise<TaskComment[]>
  createTaskComment(input: TaskCommentInput): Promise<TaskComment>
  deleteTaskComment(id: ID): Promise<void>

  // Leden van de bruiloft (voor assignee-picker en avatars).
  listMembers(weddingId: ID): Promise<WeddingMember[]>
}
