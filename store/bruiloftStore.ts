import { create } from 'zustand'

import { LocalStorageWeddingRepository } from '@/lib/bruiloft/localStorageRepository'
import type { WeddingRepository } from '@/lib/bruiloft/repository'
import { generateTemplateTasks } from '@/lib/bruiloft/templateTasks'
import { deriveTijdsblok } from '@/lib/bruiloft/timeblocks'
import type {
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
  TaskInput,
  Vendor,
  VendorInput,
  Wedding,
  WeddingInput,
} from '@/lib/bruiloft/types'

// Eén plek waar de implementatie van de opslaglaag gekozen wordt.
// Later: vervang door new ApiWeddingRepository() — verder verandert er niets.
const repository: WeddingRepository = new LocalStorageWeddingRepository()

// Create-input zonder de velden die de store zelf invult.
type NewGuest = Omit<GuestInput, 'weddingId'>
type NewTask = Omit<TaskInput, 'weddingId' | 'tijdsblok'>
type NewVendor = Omit<VendorInput, 'weddingId'>
type NewBudgetItem = Omit<BudgetItemInput, 'weddingId'>
type NewScheduleItem = Omit<ScheduleItemInput, 'weddingId'>
type NewTable = Omit<TableInput, 'weddingId'>

interface BruiloftState {
  hydrated: boolean
  wedding: Wedding | null
  guests: Guest[]
  tasks: Task[]
  vendors: Vendor[]
  budgetItems: BudgetItem[]
  scheduleItems: ScheduleItem[]
  tables: Table[]
}

interface BruiloftActions {
  init: () => Promise<void>

  setupWedding: (input: WeddingInput) => Promise<void>
  updateWedding: (patch: Partial<WeddingInput>) => Promise<void>

  addGuest: (data: NewGuest) => Promise<void>
  updateGuest: (id: ID, patch: Partial<GuestInput>) => Promise<void>
  deleteGuest: (id: ID) => Promise<void>

  addTask: (data: NewTask) => Promise<void>
  updateTask: (id: ID, patch: Partial<Omit<TaskInput, 'weddingId'>>) => Promise<void>
  deleteTask: (id: ID) => Promise<void>

  addVendor: (data: NewVendor) => Promise<void>
  updateVendor: (id: ID, patch: Partial<VendorInput>) => Promise<void>
  deleteVendor: (id: ID) => Promise<void>

  addBudgetItem: (data: NewBudgetItem) => Promise<void>
  updateBudgetItem: (id: ID, patch: Partial<BudgetItemInput>) => Promise<void>
  deleteBudgetItem: (id: ID) => Promise<void>

  addScheduleItem: (data: NewScheduleItem) => Promise<void>
  updateScheduleItem: (id: ID, patch: Partial<ScheduleItemInput>) => Promise<void>
  deleteScheduleItem: (id: ID) => Promise<void>

  addTable: (data: NewTable) => Promise<void>
  updateTable: (id: ID, patch: Partial<TableInput>) => Promise<void>
  deleteTable: (id: ID) => Promise<void>
}

export const useBruiloftStore = create<BruiloftState & BruiloftActions>()(
  (set, get) => ({
    hydrated: false,
    wedding: null,
    guests: [],
    tasks: [],
    vendors: [],
    budgetItems: [],
    scheduleItems: [],
    tables: [],

    init: async () => {
      if (get().hydrated) return
      const wedding = await repository.getActiveWedding()
      if (!wedding) {
        set({ hydrated: true, wedding: null })
        return
      }
      const [guests, tasks, vendors, budgetItems, scheduleItems, tables] =
        await Promise.all([
          repository.listGuests(wedding.id),
          repository.listTasks(wedding.id),
          repository.listVendors(wedding.id),
          repository.listBudgetItems(wedding.id),
          repository.listScheduleItems(wedding.id),
          repository.listTables(wedding.id),
        ])
      set({
        hydrated: true,
        wedding,
        guests,
        tasks,
        vendors,
        budgetItems,
        scheduleItems,
        tables,
      })
    },

    setupWedding: async (input) => {
      const wedding = await repository.createWedding(input)
      const tasks = await repository.createTasks(generateTemplateTasks(wedding))
      set({
        wedding,
        tasks,
        guests: [],
        vendors: [],
        budgetItems: [],
        scheduleItems: [],
        tables: [],
      })
    },

    updateWedding: async (patch) => {
      const current = get().wedding
      if (!current) return
      const wedding = await repository.updateWedding(current.id, patch)
      set({ wedding })
      // Trouwdatum gewijzigd? Tijdsblokken van taken herberekenen.
      if (patch.trouwdatum) {
        const tasks = get().tasks
        await Promise.all(
          tasks.map((t) =>
            repository.updateTask(t.id, {
              tijdsblok: deriveTijdsblok(t.deadline, wedding.trouwdatum),
            })
          )
        )
        set({
          tasks: get().tasks.map((t) => ({
            ...t,
            tijdsblok: deriveTijdsblok(t.deadline, wedding.trouwdatum),
          })),
        })
      }
    },

    // --- Guests ------------------------------------------------------------

    addGuest: async (data) => {
      const wedding = get().wedding
      if (!wedding) return
      const guest = await repository.createGuest({ ...data, weddingId: wedding.id })
      set({ guests: [...get().guests, guest] })
    },

    updateGuest: async (id, patch) => {
      const guest = await repository.updateGuest(id, patch)
      set({ guests: get().guests.map((g) => (g.id === id ? guest : g)) })
    },

    deleteGuest: async (id) => {
      await repository.deleteGuest(id)
      set({ guests: get().guests.filter((g) => g.id !== id) })
    },

    // --- Tasks -------------------------------------------------------------

    addTask: async (data) => {
      const wedding = get().wedding
      if (!wedding) return
      const task = await repository.createTask({
        ...data,
        weddingId: wedding.id,
        tijdsblok: deriveTijdsblok(data.deadline, wedding.trouwdatum),
      })
      set({ tasks: [...get().tasks, task] })
    },

    updateTask: async (id, patch) => {
      const wedding = get().wedding
      // Tijdsblok mee laten lopen met een gewijzigde deadline.
      const merged: Partial<TaskInput> =
        patch.deadline && wedding
          ? { ...patch, tijdsblok: deriveTijdsblok(patch.deadline, wedding.trouwdatum) }
          : patch
      const task = await repository.updateTask(id, merged)
      set({ tasks: get().tasks.map((t) => (t.id === id ? task : t)) })
    },

    deleteTask: async (id) => {
      await repository.deleteTask(id)
      set({ tasks: get().tasks.filter((t) => t.id !== id) })
    },

    // --- Vendors -----------------------------------------------------------

    addVendor: async (data) => {
      const wedding = get().wedding
      if (!wedding) return
      const vendor = await repository.createVendor({ ...data, weddingId: wedding.id })
      set({ vendors: [...get().vendors, vendor] })
    },

    updateVendor: async (id, patch) => {
      const vendor = await repository.updateVendor(id, patch)
      set({ vendors: get().vendors.map((v) => (v.id === id ? vendor : v)) })
    },

    deleteVendor: async (id) => {
      await repository.deleteVendor(id)
      // Taken/budgetitems kunnen ontkoppeld zijn in de opslag; opnieuw inladen
      // zou kunnen, maar lokaal bijwerken houdt het snel en loop-vrij.
      set({
        vendors: get().vendors.filter((v) => v.id !== id),
        tasks: get().tasks.map((t) =>
          t.vendorId === id ? { ...t, vendorId: undefined } : t
        ),
        budgetItems: get().budgetItems.map((b) =>
          b.vendorId === id ? { ...b, vendorId: undefined } : b
        ),
      })
    },

    // --- BudgetItems -------------------------------------------------------

    addBudgetItem: async (data) => {
      const wedding = get().wedding
      if (!wedding) return
      const item = await repository.createBudgetItem({ ...data, weddingId: wedding.id })
      set({ budgetItems: [...get().budgetItems, item] })
    },

    updateBudgetItem: async (id, patch) => {
      const item = await repository.updateBudgetItem(id, patch)
      set({ budgetItems: get().budgetItems.map((b) => (b.id === id ? item : b)) })
    },

    deleteBudgetItem: async (id) => {
      await repository.deleteBudgetItem(id)
      set({
        budgetItems: get().budgetItems.filter((b) => b.id !== id),
        tasks: get().tasks.map((t) =>
          t.budgetItemId === id ? { ...t, budgetItemId: undefined } : t
        ),
        vendors: get().vendors.map((v) =>
          v.budgetItemId === id ? { ...v, budgetItemId: undefined } : v
        ),
      })
    },

    // --- ScheduleItems -----------------------------------------------------

    addScheduleItem: async (data) => {
      const wedding = get().wedding
      if (!wedding) return
      const item = await repository.createScheduleItem({ ...data, weddingId: wedding.id })
      set({ scheduleItems: [...get().scheduleItems, item] })
    },

    updateScheduleItem: async (id, patch) => {
      const item = await repository.updateScheduleItem(id, patch)
      set({ scheduleItems: get().scheduleItems.map((s) => (s.id === id ? item : s)) })
    },

    deleteScheduleItem: async (id) => {
      await repository.deleteScheduleItem(id)
      set({ scheduleItems: get().scheduleItems.filter((s) => s.id !== id) })
    },

    // --- Tables ------------------------------------------------------------

    addTable: async (data) => {
      const wedding = get().wedding
      if (!wedding) return
      const table = await repository.createTable({ ...data, weddingId: wedding.id })
      set({ tables: [...get().tables, table] })
    },

    updateTable: async (id, patch) => {
      const table = await repository.updateTable(id, patch)
      set({ tables: get().tables.map((t) => (t.id === id ? table : t)) })
    },

    deleteTable: async (id) => {
      await repository.deleteTable(id)
      set({
        tables: get().tables.filter((t) => t.id !== id),
        guests: get().guests.map((g) =>
          g.tafelId === id ? { ...g, tafelId: undefined } : g
        ),
      })
    },
  })
)
