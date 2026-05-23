import { create } from 'zustand'

import {
  ALL_EDIT_PERMISSIONS,
  EMPTY_PERMISSIONS,
  type Level,
  type Module,
  type PermissionMap,
  type WeddingRole,
} from '@/lib/bruiloft/permissions'
import { repository } from '@/lib/bruiloft/repositoryInstance'
import { generateTemplateTasks } from '@/lib/bruiloft/templateTasks'
import { deriveTijdsblok } from '@/lib/bruiloft/timeblocks'
import { createClient } from '@/lib/supabase/client'
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
  WebsiteContent,
  WebsiteContentInput,
} from '@/lib/bruiloft/types'

// Create-input zonder de velden die de store zelf invult.
type NewGuest = Omit<GuestInput, 'weddingId'>
type NewTask = Omit<TaskInput, 'weddingId' | 'tijdsblok'>
type NewVendor = Omit<VendorInput, 'weddingId'>
type NewBudgetItem = Omit<BudgetItemInput, 'weddingId'>
type NewScheduleItem = Omit<ScheduleItemInput, 'weddingId'>
type NewTable = Omit<TableInput, 'weddingId'>

interface CurrentUser {
  id: string
  email: string
  displayName: string
  appRole: 'member' | 'platform_admin'
}

interface BruiloftState {
  hydrated: boolean
  currentUser: CurrentUser | null
  role: WeddingRole | null
  permissions: PermissionMap
  wedding: Wedding | null
  guests: Guest[]
  tasks: Task[]
  vendors: Vendor[]
  budgetItems: BudgetItem[]
  scheduleItems: ScheduleItem[]
  tables: Table[]
  websiteContent: WebsiteContent | null
}

interface BruiloftActions {
  init: () => Promise<void>
  signOut: () => Promise<void>

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

  saveWebsiteContent: (patch: Partial<WebsiteContentInput>) => Promise<void>
  ensureRsvpCodes: () => Promise<void>
}

// Bepaalt de rol + effectieve rechten-matrix van de gebruiker voor één bruiloft.
async function loadPermissions(
  supabase: ReturnType<typeof createClient>,
  weddingId: string,
  userId: string,
  appRole: 'member' | 'platform_admin'
): Promise<{ role: WeddingRole | null; permissions: PermissionMap }> {
  const { data: member } = await supabase
    .from('wedding_members')
    .select('role')
    .eq('wedding_id', weddingId)
    .eq('user_id', userId)
    .maybeSingle()
  const role = (member?.role as WeddingRole | null) ?? null

  if (role === 'owner') {
    return { role, permissions: ALL_EDIT_PERMISSIONS }
  }

  const permissions: PermissionMap = { ...EMPTY_PERMISSIONS }
  if (role) {
    const { data: rows } = await supabase
      .from('wedding_role_permissions')
      .select('module, level')
      .eq('wedding_id', weddingId)
      .eq('role', role)
    for (const r of rows ?? []) {
      permissions[r.module as Module] = r.level as Level
    }
  }
  // Platform-admin mag overal meekijken (support), maar niet bewerken.
  if (appRole === 'platform_admin') {
    for (const m of Object.keys(permissions) as Module[]) {
      if (permissions[m] === 'none') permissions[m] = 'view'
    }
  }
  return { role, permissions }
}

export const useBruiloftStore = create<BruiloftState & BruiloftActions>()(
  (set, get) => ({
    hydrated: false,
    currentUser: null,
    role: null,
    permissions: EMPTY_PERMISSIONS,
    wedding: null,
    guests: [],
    tasks: [],
    vendors: [],
    budgetItems: [],
    scheduleItems: [],
    tables: [],
    websiteContent: null,

    init: async () => {
      if (get().hydrated) return
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        set({ hydrated: true, currentUser: null, wedding: null })
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('email, display_name, app_role')
        .eq('id', user.id)
        .maybeSingle()

      const currentUser: CurrentUser = {
        id: user.id,
        email: profile?.email ?? user.email ?? '',
        displayName: profile?.display_name ?? '',
        appRole: (profile?.app_role as CurrentUser['appRole']) ?? 'member',
      }

      const wedding = await repository.getActiveWedding()
      if (!wedding) {
        set({
          hydrated: true,
          currentUser,
          wedding: null,
          role: null,
          permissions: EMPTY_PERMISSIONS,
        })
        return
      }

      const { role, permissions } = await loadPermissions(
        supabase,
        wedding.id,
        user.id,
        currentUser.appRole
      )

      const [guests, tasks, vendors, budgetItems, scheduleItems, tables, websiteContent] =
        await Promise.all([
          repository.listGuests(wedding.id),
          repository.listTasks(wedding.id),
          repository.listVendors(wedding.id),
          repository.listBudgetItems(wedding.id),
          repository.listScheduleItems(wedding.id),
          repository.listTables(wedding.id),
          repository.getWebsiteContent(wedding.id),
        ])
      set({
        hydrated: true,
        currentUser,
        wedding,
        role,
        permissions,
        guests,
        tasks,
        vendors,
        budgetItems,
        scheduleItems,
        tables,
        websiteContent,
      })
    },

    signOut: async () => {
      await createClient().auth.signOut()
      set({
        hydrated: false,
        currentUser: null,
        role: null,
        permissions: EMPTY_PERMISSIONS,
        wedding: null,
        guests: [],
        tasks: [],
        vendors: [],
        budgetItems: [],
        scheduleItems: [],
        tables: [],
        websiteContent: null,
      })
    },

    setupWedding: async (input) => {
      const wedding = await repository.createWedding(input)
      const tasks = await repository.createTasks(generateTemplateTasks(wedding))
      set({
        wedding,
        role: 'owner',
        permissions: ALL_EDIT_PERMISSIONS,
        tasks,
        guests: [],
        vendors: [],
        budgetItems: [],
        scheduleItems: [],
        tables: [],
        websiteContent: null,
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

    // --- WebsiteContent ----------------------------------------------------

    saveWebsiteContent: async (patch) => {
      const wedding = get().wedding
      if (!wedding) return
      const content = await repository.saveWebsiteContent(wedding.id, patch)
      set({ websiteContent: content })
    },

    // Geef elke gast zonder code een persoonlijke RSVP-code.
    ensureRsvpCodes: async () => {
      const zonderCode = get().guests.filter((g) => !g.rsvpCode)
      if (zonderCode.length === 0) return
      const bestaand = new Set(get().guests.map((g) => g.rsvpCode).filter(Boolean))
      const nieuw = new Map<ID, string>()
      for (const g of zonderCode) {
        let code = ''
        do {
          code = Math.random().toString(36).slice(2, 8).toUpperCase()
        } while (bestaand.has(code) || code.length < 6)
        bestaand.add(code)
        nieuw.set(g.id, code)
        await repository.updateGuest(g.id, { rsvpCode: code })
      }
      set({
        guests: get().guests.map((g) =>
          nieuw.has(g.id) ? { ...g, rsvpCode: nieuw.get(g.id) } : g
        ),
      })
    },
  })
)
