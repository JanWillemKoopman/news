// De opslaglaag: de enige grens waarmee de app praat.
// Componenten praten NOOIT direct met localStorage, alleen met deze interface.
// Alle methodes zijn async (Promise) zodat een latere ApiWeddingRepository
// exact dezelfde interface kan implementeren zonder dat de app verandert.

import type {
  BudgetItem,
  BudgetItemInput,
  Guest,
  GuestInput,
  ID,
  Task,
  TaskInput,
  Vendor,
  VendorInput,
  Wedding,
  WeddingInput,
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
}
