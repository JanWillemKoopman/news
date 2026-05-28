// localStorage-implementatie van de WeddingRepository.
// Alles wordt als één JSON-envelope onder één sleutel bewaard. SSR-veilig:
// op de server (geen window) gedraagt de repo zich als een lege opslag.
// Later vervangbaar door een ApiWeddingRepository met dezelfde interface.

import type { WeddingRepository } from './repository'
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
  TaskInput,
  Vendor,
  VendorInput,
  Wedding,
  WeddingDatabase,
  WeddingInput,
  WeddingMember,
  WebsiteContent,
  WebsiteContentInput,
} from './types'

const STORAGE_KEY = 'bruiloft-planner-v1'
const DB_VERSION = 1

function emptyDb(): WeddingDatabase {
  return {
    version: DB_VERSION,
    weddings: [],
    guests: [],
    tasks: [],
    vendors: [],
    budgetItems: [],
    scheduleItems: [],
    tables: [],
    websiteContents: [],
  }
}

function uuid(): ID {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  // Fallback voor omgevingen zonder crypto.randomUUID.
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function now(): string {
  return new Date().toISOString()
}

export class LocalStorageWeddingRepository implements WeddingRepository {
  private read(): WeddingDatabase {
    if (typeof window === 'undefined') return emptyDb()
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return emptyDb()
      const parsed = JSON.parse(raw) as Partial<WeddingDatabase>
      // Defensief samenvoegen zodat ontbrekende collecties nooit crashen.
      return { ...emptyDb(), ...parsed } as WeddingDatabase
    } catch {
      return emptyDb()
    }
  }

  private write(db: WeddingDatabase): void {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  }

  // --- Wedding -------------------------------------------------------------

  async listWeddings(): Promise<Wedding[]> {
    return this.read().weddings
  }

  async getWedding(id: ID): Promise<Wedding | null> {
    return this.read().weddings.find((w) => w.id === id) ?? null
  }

  async getActiveWedding(): Promise<Wedding | null> {
    // V1: de eerste (en enige) bruiloft is de actieve.
    return this.read().weddings[0] ?? null
  }

  async createWedding(input: WeddingInput): Promise<Wedding> {
    const db = this.read()
    const wedding: Wedding = {
      ...input,
      id: uuid(),
      createdAt: now(),
      updatedAt: now(),
    }
    db.weddings.push(wedding)
    this.write(db)
    return wedding
  }

  async updateWedding(id: ID, patch: Partial<WeddingInput>): Promise<Wedding> {
    const db = this.read()
    const index = db.weddings.findIndex((w) => w.id === id)
    if (index === -1) throw new Error(`Wedding ${id} niet gevonden`)
    const updated: Wedding = { ...db.weddings[index], ...patch, updatedAt: now() }
    db.weddings[index] = updated
    this.write(db)
    return updated
  }

  async deleteWedding(id: ID): Promise<void> {
    const db = this.read()
    db.weddings = db.weddings.filter((w) => w.id !== id)
    db.guests = db.guests.filter((g) => g.weddingId !== id)
    db.tasks = db.tasks.filter((t) => t.weddingId !== id)
    db.vendors = db.vendors.filter((v) => v.weddingId !== id)
    db.budgetItems = db.budgetItems.filter((b) => b.weddingId !== id)
    db.scheduleItems = db.scheduleItems.filter((s) => s.weddingId !== id)
    db.tables = db.tables.filter((t) => t.weddingId !== id)
    db.websiteContents = db.websiteContents.filter((w) => w.weddingId !== id)
    this.write(db)
  }

  // --- Guests --------------------------------------------------------------

  async listGuests(weddingId: ID): Promise<Guest[]> {
    return this.read().guests.filter((g) => g.weddingId === weddingId)
  }

  async createGuest(input: GuestInput): Promise<Guest> {
    const db = this.read()
    const guest: Guest = { ...input, id: uuid() }
    db.guests.push(guest)
    this.write(db)
    return guest
  }

  async updateGuest(id: ID, patch: Partial<GuestInput>): Promise<Guest> {
    const db = this.read()
    const index = db.guests.findIndex((g) => g.id === id)
    if (index === -1) throw new Error(`Guest ${id} niet gevonden`)
    const updated: Guest = { ...db.guests[index], ...patch }
    db.guests[index] = updated
    this.write(db)
    return updated
  }

  async deleteGuest(id: ID): Promise<void> {
    const db = this.read()
    db.guests = db.guests.filter((g) => g.id !== id)
    this.write(db)
  }

  // --- Tasks ---------------------------------------------------------------

  async listTasks(weddingId: ID): Promise<Task[]> {
    return this.read().tasks.filter((t) => t.weddingId === weddingId)
  }

  async createTask(input: TaskInput): Promise<Task> {
    const db = this.read()
    const task: Task = { ...input, id: uuid() }
    db.tasks.push(task)
    this.write(db)
    return task
  }

  async createTasks(inputs: TaskInput[]): Promise<Task[]> {
    const db = this.read()
    const tasks: Task[] = inputs.map((input) => ({ ...input, id: uuid() }))
    db.tasks.push(...tasks)
    this.write(db)
    return tasks
  }

  async updateTask(id: ID, patch: Partial<TaskInput>): Promise<Task> {
    const db = this.read()
    const index = db.tasks.findIndex((t) => t.id === id)
    if (index === -1) throw new Error(`Task ${id} niet gevonden`)
    const updated: Task = { ...db.tasks[index], ...patch }
    db.tasks[index] = updated
    this.write(db)
    return updated
  }

  async deleteTask(id: ID): Promise<void> {
    const db = this.read()
    db.tasks = db.tasks.filter((t) => t.id !== id)
    this.write(db)
  }

  // --- Vendors -------------------------------------------------------------

  async listVendors(weddingId: ID): Promise<Vendor[]> {
    return this.read().vendors.filter((v) => v.weddingId === weddingId)
  }

  async createVendor(input: VendorInput): Promise<Vendor> {
    const db = this.read()
    const vendor: Vendor = { ...input, id: uuid() }
    db.vendors.push(vendor)
    this.write(db)
    return vendor
  }

  async updateVendor(id: ID, patch: Partial<VendorInput>): Promise<Vendor> {
    const db = this.read()
    const index = db.vendors.findIndex((v) => v.id === id)
    if (index === -1) throw new Error(`Vendor ${id} niet gevonden`)
    const updated: Vendor = { ...db.vendors[index], ...patch }
    db.vendors[index] = updated
    this.write(db)
    return updated
  }

  async deleteVendor(id: ID): Promise<void> {
    const db = this.read()
    db.vendors = db.vendors.filter((v) => v.id !== id)
    // Ontkoppel taken die naar deze leverancier verwezen.
    db.tasks = db.tasks.map((t) =>
      t.vendorId === id ? { ...t, vendorId: undefined } : t
    )
    db.budgetItems = db.budgetItems.map((b) =>
      b.vendorId === id ? { ...b, vendorId: undefined } : b
    )
    this.write(db)
  }

  // --- BudgetItems ---------------------------------------------------------

  async listBudgetItems(weddingId: ID): Promise<BudgetItem[]> {
    return this.read().budgetItems.filter((b) => b.weddingId === weddingId)
  }

  async createBudgetItem(input: BudgetItemInput): Promise<BudgetItem> {
    const db = this.read()
    const item: BudgetItem = { ...input, id: uuid() }
    db.budgetItems.push(item)
    this.write(db)
    return item
  }

  async updateBudgetItem(
    id: ID,
    patch: Partial<BudgetItemInput>
  ): Promise<BudgetItem> {
    const db = this.read()
    const index = db.budgetItems.findIndex((b) => b.id === id)
    if (index === -1) throw new Error(`BudgetItem ${id} niet gevonden`)
    const updated: BudgetItem = { ...db.budgetItems[index], ...patch }
    db.budgetItems[index] = updated
    this.write(db)
    return updated
  }

  async deleteBudgetItem(id: ID): Promise<void> {
    const db = this.read()
    db.budgetItems = db.budgetItems.filter((b) => b.id !== id)
    // Ontkoppel taken/leveranciers die naar dit budgetitem verwezen.
    db.tasks = db.tasks.map((t) =>
      t.budgetItemId === id ? { ...t, budgetItemId: undefined } : t
    )
    db.vendors = db.vendors.map((v) =>
      v.budgetItemId === id ? { ...v, budgetItemId: undefined } : v
    )
    this.write(db)
  }

  // --- ScheduleItems -------------------------------------------------------

  async listScheduleItems(weddingId: ID): Promise<ScheduleItem[]> {
    return this.read().scheduleItems.filter((s) => s.weddingId === weddingId)
  }

  async createScheduleItem(input: ScheduleItemInput): Promise<ScheduleItem> {
    const db = this.read()
    const item: ScheduleItem = { ...input, id: uuid() }
    db.scheduleItems.push(item)
    this.write(db)
    return item
  }

  async updateScheduleItem(
    id: ID,
    patch: Partial<ScheduleItemInput>
  ): Promise<ScheduleItem> {
    const db = this.read()
    const index = db.scheduleItems.findIndex((s) => s.id === id)
    if (index === -1) throw new Error(`ScheduleItem ${id} niet gevonden`)
    const updated: ScheduleItem = { ...db.scheduleItems[index], ...patch }
    db.scheduleItems[index] = updated
    this.write(db)
    return updated
  }

  async deleteScheduleItem(id: ID): Promise<void> {
    const db = this.read()
    db.scheduleItems = db.scheduleItems.filter((s) => s.id !== id)
    this.write(db)
  }

  // --- Tables --------------------------------------------------------------

  async listTables(weddingId: ID): Promise<Table[]> {
    return this.read().tables.filter((t) => t.weddingId === weddingId)
  }

  async createTable(input: TableInput): Promise<Table> {
    const db = this.read()
    const table: Table = { ...input, id: uuid() }
    db.tables.push(table)
    this.write(db)
    return table
  }

  async updateTable(id: ID, patch: Partial<TableInput>): Promise<Table> {
    const db = this.read()
    const index = db.tables.findIndex((t) => t.id === id)
    if (index === -1) throw new Error(`Table ${id} niet gevonden`)
    const updated: Table = { ...db.tables[index], ...patch }
    db.tables[index] = updated
    this.write(db)
    return updated
  }

  async deleteTable(id: ID): Promise<void> {
    const db = this.read()
    db.tables = db.tables.filter((t) => t.id !== id)
    // Maak gasten aan deze tafel weer onverdeeld.
    db.guests = db.guests.map((g) =>
      g.tafelId === id ? { ...g, tafelId: undefined } : g
    )
    this.write(db)
  }

  // --- WebsiteContent ------------------------------------------------------

  async getWebsiteContent(weddingId: ID): Promise<WebsiteContent | null> {
    return this.read().websiteContents.find((w) => w.weddingId === weddingId) ?? null
  }

  async saveWebsiteContent(
    weddingId: ID,
    patch: Partial<WebsiteContentInput>
  ): Promise<WebsiteContent> {
    const db = this.read()
    const index = db.websiteContents.findIndex((w) => w.weddingId === weddingId)
    if (index === -1) {
      const content: WebsiteContent = {
        id: uuid(),
        weddingId,
        welkomsttekst: '',
        dresscode: '',
        cadeaulijst: '',
        hotels: '',
        routebeschrijving: '',
        contact: '',
        ...patch,
      }
      db.websiteContents.push(content)
      this.write(db)
      return content
    }
    const updated: WebsiteContent = { ...db.websiteContents[index], ...patch }
    db.websiteContents[index] = updated
    this.write(db)
    return updated
  }

  // --- Activity & opmerkingen ----------------------------------------------
  // Activiteit wordt door DB-triggers gevuld; localStorage kent geen equivalent.
  async listActivity(): Promise<ActivityEntry[]> {
    return []
  }

  async listTaskComments(): Promise<TaskComment[]> {
    return []
  }

  async createTaskComment(): Promise<TaskComment> {
    throw new Error('Opmerkingen worden niet ondersteund in de localStorage-opslag')
  }

  async deleteTaskComment(): Promise<void> {
    // Geen opslag; niets te doen.
  }

  async listMembers(): Promise<WeddingMember[]> {
    // localStorage kent geen leden — solo-modus. UI valt terug op toegewezenAan.
    return []
  }
}
