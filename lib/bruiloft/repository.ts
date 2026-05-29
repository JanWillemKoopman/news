// De opslaglaag: de enige grens waarmee de app praat.
// Componenten praten NOOIT direct met localStorage, alleen met deze interface.
// Alle methodes zijn async (Promise) zodat een latere ApiWeddingRepository
// exact dezelfde interface kan implementeren zonder dat de app verandert.

import type {
  ActivityEntry,
  BudgetItem,
  BudgetItemInput,
  Guest,
  GuestInput,
  ID,
  ScheduleItem,
  ScheduleItemInput,
  Table,
  TableInput,
  Task,
  TaskComment,
  TaskCommentInput,
  TaskInput,
  Vendor,
  VendorInput,
  Wedding,
  WeddingInput,
  WeddingMember,
  WebsiteContent,
  WebsiteContentInput,
  WebsiteFoto,
} from './types'

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
  updateGuest(id: ID, patch: Partial<GuestInput>): Promise<Guest>
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

  // BudgetItems
  listBudgetItems(weddingId: ID): Promise<BudgetItem[]>
  createBudgetItem(input: BudgetItemInput): Promise<BudgetItem>
  updateBudgetItem(id: ID, patch: Partial<BudgetItemInput>): Promise<BudgetItem>
  deleteBudgetItem(id: ID): Promise<void>

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
