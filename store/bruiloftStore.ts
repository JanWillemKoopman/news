import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { create } from 'zustand'

import {
  activityFromRow,
  budgetItemFromRow,
  guestFromRow,
  scheduleItemFromRow,
  tableFromRow,
  taskCommentFromRow,
  taskFromRow,
  vendorFromRow,
  weddingFromRow,
  websiteContentFromRow,
} from '@/lib/bruiloft/mappers'
import {
  ALL_EDIT_PERMISSIONS,
  EMPTY_PERMISSIONS,
  type Level,
  type Module,
  type PermissionMap,
  type WeddingRole,
} from '@/lib/bruiloft/permissions'
import { repository } from '@/lib/bruiloft/repositoryInstance'
import {
  generateTemplateTasks,
  TEMPLATE_TASKS,
  type TemplateTask,
} from '@/lib/bruiloft/templateTasks'
import { addDays, addMonths, deriveTijdsblok, toISODate } from '@/lib/bruiloft/timeblocks'
import { createClient } from '@/lib/supabase/client'
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
  WeddingInput,
  WeddingMember,
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
  error: string | null
  currentUser: CurrentUser | null
  role: WeddingRole | null
  permissions: PermissionMap
  wedding: Wedding | null
  weddings: Wedding[]
  activeWeddingId: ID | null
  guests: Guest[]
  tasks: Task[]
  vendors: Vendor[]
  budgetItems: BudgetItem[]
  scheduleItems: ScheduleItem[]
  tables: Table[]
  websiteContent: WebsiteContent | null
  activity: ActivityEntry[]
  taskComments: TaskComment[]
  members: WeddingMember[]
  activitySeenAt: string | null // wanneer de feed voor het laatst bekeken is
}

interface BruiloftActions {
  init: () => Promise<void>
  retryInit: () => Promise<void>
  completeOnboarding: (input: WeddingInput, auth: { email: string; password: string; displayName: string }) => Promise<void>
  signOut: () => Promise<void>
  switchWedding: (id: ID) => Promise<void>
  deleteActiveWedding: () => Promise<void>
  startRealtime: (weddingId: ID) => void
  stopRealtime: () => void

  setupWedding: (input: WeddingInput) => Promise<void>
  updateWedding: (patch: Partial<WeddingInput>) => Promise<void>

  addGuest: (data: NewGuest) => Promise<void>
  updateGuest: (id: ID, patch: Partial<GuestInput>) => Promise<void>
  deleteGuest: (id: ID) => Promise<void>

  addTask: (data: NewTask) => Promise<void>
  updateTask: (id: ID, patch: Partial<Omit<TaskInput, 'weddingId'>>) => Promise<void>
  deleteTask: (id: ID) => Promise<void>
  bulkUpdateTasks: (
    ids: ID[],
    patch: Partial<Omit<TaskInput, 'weddingId'>> & { deadlineShiftDays?: number }
  ) => Promise<void>
  bulkDeleteTasks: (ids: ID[]) => Promise<void>
  toggleSubtaak: (taskId: ID, subtaakId: string) => Promise<void>
  addTemplateMissing: (titels: string[]) => Promise<void>

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

  addTaskComment: (taskId: ID, body: string) => Promise<void>
  deleteTaskComment: (id: ID) => Promise<void>
  markActivitySeen: () => void

  loadMembers: () => Promise<void>
}

// Onthoudt welke bruiloft actief is (voor wie er meerdere beheert).
const ACTIVE_KEY = 'bruiloft-active-wedding'
function readActive(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY)
  } catch {
    return null
  }
}
function writeActive(id: string | null) {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id)
    else localStorage.removeItem(ACTIVE_KEY)
  } catch {
    // localStorage niet beschikbaar; negeren.
  }
}

// Onthoudt per bruiloft wanneer de feed voor het laatst bekeken is (voor de
// 'nieuw'-badge). Per gebruiker/apparaat — hoeft niet te syncen.
const SEEN_PREFIX = 'bruiloft-activity-seen:'
function readSeen(weddingId: string): string | null {
  try {
    return localStorage.getItem(SEEN_PREFIX + weddingId)
  } catch {
    return null
  }
}
function writeSeen(weddingId: string, iso: string) {
  try {
    localStorage.setItem(SEEN_PREFIX + weddingId, iso)
  } catch {
    // localStorage niet beschikbaar; negeren.
  }
}

// --- Realtime ---------------------------------------------------------------
let realtimeChannel: RealtimeChannel | null = null

type Identified = { id: string }
type Change = RealtimePostgresChangesPayload<Record<string, unknown>>

// Werk een lijst-slice bij op basis van een realtime-wijziging (idempotent op id;
// dedupt zo ook de echo van onze eigen optimistische updates).
function applyList<T extends Identified>(
  current: T[],
  payload: Change,
  fromRow: (row: Record<string, unknown>) => T
): T[] {
  if (payload.eventType === 'DELETE') {
    const id = (payload.old as { id?: string }).id
    return id ? current.filter((x) => x.id !== id) : current
  }
  const item = fromRow(payload.new as Record<string, unknown>)
  const i = current.findIndex((x) => x.id === item.id)
  if (i === -1) return [...current, item]
  const next = current.slice()
  next[i] = item
  return next
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
    error: null,
    currentUser: null,
    role: null,
    permissions: EMPTY_PERMISSIONS,
    wedding: null,
    weddings: [],
    activeWeddingId: null,
    guests: [],
    tasks: [],
    vendors: [],
    budgetItems: [],
    scheduleItems: [],
    tables: [],
    websiteContent: null,
    activity: [],
    taskComments: [],
    members: [],
    activitySeenAt: null,

    init: async () => {
      if (get().hydrated) return
      try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        set({
          hydrated: true,
          error: null,
          currentUser: null,
          wedding: null,
          weddings: [],
          activeWeddingId: null,
        })
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

      const weddings = await repository.listWeddings()
      if (weddings.length === 0) {
        set({
          hydrated: true,
          error: null,
          currentUser,
          weddings: [],
          activeWeddingId: null,
          wedding: null,
          role: null,
          permissions: EMPTY_PERMISSIONS,
          activity: [],
          taskComments: [],
          members: [],
          activitySeenAt: null,
        })
        return
      }

      // Kies de onthouden actieve bruiloft, anders de eerste.
      const stored = readActive()
      const wedding = weddings.find((w) => w.id === stored) ?? weddings[0]
      writeActive(wedding.id)

      const { role, permissions } = await loadPermissions(
        supabase,
        wedding.id,
        user.id,
        currentUser.appRole
      )

      const [
        guests,
        tasks,
        vendors,
        budgetItems,
        scheduleItems,
        tables,
        websiteContent,
        activity,
        taskComments,
        members,
      ] = await Promise.all([
        repository.listGuests(wedding.id),
        repository.listTasks(wedding.id),
        repository.listVendors(wedding.id),
        repository.listBudgetItems(wedding.id),
        repository.listScheduleItems(wedding.id),
        repository.listTables(wedding.id),
        repository.getWebsiteContent(wedding.id),
        repository.listActivity(wedding.id, 50),
        repository.listTaskComments(wedding.id),
        repository.listMembers(wedding.id),
      ])
      set({
        hydrated: true,
        error: null,
        currentUser,
        weddings,
        activeWeddingId: wedding.id,
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
        activity,
        taskComments,
        members,
        activitySeenAt: readSeen(wedding.id),
      })
      get().startRealtime(wedding.id)
      } catch {
        set({
          hydrated: true,
          error: 'We konden jullie trouwplan niet laden. Controleer je internetverbinding en probeer het opnieuw.',
        })
      }
    },

    retryInit: async () => {
      set({ hydrated: false, error: null })
      await get().init()
    },

    // Maak een nieuw account aan en koppel daar direct de bruiloft aan.
    completeOnboarding: async (input, auth) => {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email: auth.email,
        password: auth.password,
        options: { data: { display_name: auth.displayName } },
      })
      if (error) throw error
      if (!data.session) {
        // E-mailbevestiging staat aan: gebruiker moet eerst bevestigen.
        throw new Error('confirm-email')
      }
      set({ hydrated: false })
      await get().init()
      await get().setupWedding(input)
    },

    signOut: async () => {
      get().stopRealtime()
      await createClient().auth.signOut()
      writeActive(null)
      set({
        hydrated: false,
        error: null,
        currentUser: null,
        role: null,
        permissions: EMPTY_PERMISSIONS,
        wedding: null,
        weddings: [],
        activeWeddingId: null,
        guests: [],
        tasks: [],
        vendors: [],
        budgetItems: [],
        scheduleItems: [],
        tables: [],
        websiteContent: null,
        activity: [],
        taskComments: [],
        members: [],
        activitySeenAt: null,
      })
    },

    // Wissel naar een andere bruiloft waar je lid van bent.
    switchWedding: async (id) => {
      if (id === get().activeWeddingId) return
      get().stopRealtime()
      writeActive(id)
      set({ hydrated: false })
      await get().init()
    },

    // Verwijder de actieve bruiloft (owner). Alle bijbehorende data verdwijnt mee.
    deleteActiveWedding: async () => {
      const current = get().wedding
      if (!current) return
      get().stopRealtime()
      await repository.deleteWedding(current.id)
      writeActive(null) // init kiest de eerstvolgende, of toont onboarding
      set({ hydrated: false })
      await get().init()
    },

    // Abonneer op live wijzigingen binnen deze bruiloft (RLS bepaalt wat binnenkomt).
    startRealtime: (weddingId) => {
      const supabase = createClient()
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel)
        realtimeChannel = null
      }
      const wf = `wedding_id=eq.${weddingId}`
      realtimeChannel = supabase
        .channel(`wedding:${weddingId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'guests', filter: wf }, (p) =>
          set({ guests: applyList(get().guests, p, (r) => guestFromRow(r as unknown as Parameters<typeof guestFromRow>[0])) })
        )
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: wf }, (p) =>
          set({ tasks: applyList(get().tasks, p, (r) => taskFromRow(r as unknown as Parameters<typeof taskFromRow>[0])) })
        )
        .on('postgres_changes', { event: '*', schema: 'public', table: 'vendors', filter: wf }, (p) =>
          set({ vendors: applyList(get().vendors, p, (r) => vendorFromRow(r as unknown as Parameters<typeof vendorFromRow>[0])) })
        )
        .on('postgres_changes', { event: '*', schema: 'public', table: 'budget_items', filter: wf }, (p) =>
          set({ budgetItems: applyList(get().budgetItems, p, (r) => budgetItemFromRow(r as unknown as Parameters<typeof budgetItemFromRow>[0])) })
        )
        .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule_items', filter: wf }, (p) =>
          set({ scheduleItems: applyList(get().scheduleItems, p, (r) => scheduleItemFromRow(r as unknown as Parameters<typeof scheduleItemFromRow>[0])) })
        )
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tables', filter: wf }, (p) =>
          set({ tables: applyList(get().tables, p, (r) => tableFromRow(r as unknown as Parameters<typeof tableFromRow>[0])) })
        )
        .on('postgres_changes', { event: '*', schema: 'public', table: 'website_content', filter: wf }, (p) => {
          if (p.eventType === 'DELETE') set({ websiteContent: null })
          else set({ websiteContent: websiteContentFromRow(p.new as unknown as Parameters<typeof websiteContentFromRow>[0]) })
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'wedding_activity', filter: wf }, (p) =>
          set({ activity: applyList(get().activity, p, (r) => activityFromRow(r as unknown as Parameters<typeof activityFromRow>[0])) })
        )
        .on('postgres_changes', { event: '*', schema: 'public', table: 'task_comments', filter: wf }, (p) =>
          set({ taskComments: applyList(get().taskComments, p, (r) => taskCommentFromRow(r as unknown as Parameters<typeof taskCommentFromRow>[0])) })
        )
        .on('postgres_changes', { event: '*', schema: 'public', table: 'weddings', filter: `id=eq.${weddingId}` }, (p) => {
          if (p.eventType !== 'UPDATE') return
          const w = weddingFromRow(p.new as unknown as Parameters<typeof weddingFromRow>[0])
          set({ wedding: w, weddings: get().weddings.map((x) => (x.id === w.id ? w : x)) })
        })
        .subscribe()
    },

    stopRealtime: () => {
      if (realtimeChannel) {
        createClient().removeChannel(realtimeChannel)
        realtimeChannel = null
      }
    },

    setupWedding: async (input) => {
      const wedding = await repository.createWedding(input)
      const tasks = await repository.createTasks(generateTemplateTasks(wedding))
      const members = await repository.listMembers(wedding.id).catch(() => [])
      writeActive(wedding.id)
      // De sjabloontaken genereren activiteit; markeer die meteen als gezien zodat
      // de maker niet met een 'nieuw'-badge voor zijn eigen setup begint.
      const seen = new Date().toISOString()
      writeSeen(wedding.id, seen)
      set({
        wedding,
        weddings: [...get().weddings, wedding],
        activeWeddingId: wedding.id,
        role: 'owner',
        permissions: ALL_EDIT_PERMISSIONS,
        tasks,
        guests: [],
        vendors: [],
        budgetItems: [],
        scheduleItems: [],
        tables: [],
        websiteContent: null,
        activity: [],
        taskComments: [],
        members,
        activitySeenAt: seen,
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
      // Optimistic: voeg tijdelijk een rij toe; vervang na server-respons door de
      // canonieke versie (zelfde id volgt later via realtime echo).
      const tempId = `tmp-${Math.random().toString(36).slice(2)}`
      const tijdsblok = deriveTijdsblok(data.deadline, wedding.trouwdatum)
      const optimistic: Task = {
        id: tempId,
        weddingId: wedding.id,
        titel: data.titel,
        omschrijving: data.omschrijving,
        deadline: data.deadline,
        tijdsblok,
        status: data.status,
        prioriteit: data.prioriteit,
        toegewezenAan: data.toegewezenAan,
        assignees: data.assignees,
        subtaken: data.subtaken,
        volgorde: data.volgorde,
        vendorId: data.vendorId,
        budgetItemId: data.budgetItemId,
      }
      set({ tasks: [...get().tasks, optimistic] })
      try {
        const task = await repository.createTask({
          ...data,
          weddingId: wedding.id,
          tijdsblok,
        })
        set({ tasks: get().tasks.map((t) => (t.id === tempId ? task : t)) })
      } catch (e) {
        set({ tasks: get().tasks.filter((t) => t.id !== tempId) })
        throw e
      }
    },

    updateTask: async (id, patch) => {
      const wedding = get().wedding
      const prev = get().tasks
      const idx = prev.findIndex((t) => t.id === id)
      if (idx === -1) return
      // Tijdsblok mee laten lopen met een gewijzigde deadline.
      const localPatch: Partial<Task> =
        patch.deadline && wedding
          ? { ...patch, tijdsblok: deriveTijdsblok(patch.deadline, wedding.trouwdatum) }
          : (patch as Partial<Task>)
      const optimistic: Task = { ...prev[idx], ...localPatch }
      set({ tasks: prev.map((t) => (t.id === id ? optimistic : t)) })
      try {
        const merged: Partial<TaskInput> =
          patch.deadline && wedding
            ? { ...patch, tijdsblok: deriveTijdsblok(patch.deadline, wedding.trouwdatum) }
            : patch
        const task = await repository.updateTask(id, merged)
        set({ tasks: get().tasks.map((t) => (t.id === id ? task : t)) })
      } catch (e) {
        set({ tasks: get().tasks.map((t) => (t.id === id ? prev[idx] : t)) })
        throw e
      }
    },

    deleteTask: async (id) => {
      const prev = get().tasks
      const snapshot = prev.find((t) => t.id === id)
      if (!snapshot) return
      set({ tasks: prev.filter((t) => t.id !== id) })
      try {
        await repository.deleteTask(id)
      } catch (e) {
        set({ tasks: [...get().tasks, snapshot] })
        throw e
      }
    },

    bulkUpdateTasks: async (ids, patch) => {
      const wedding = get().wedding
      if (!wedding) return
      const idSet = new Set(ids)
      const before = get().tasks
      // Optimistic in één set-call.
      const optimistic = before.map((t) => {
        if (!idSet.has(t.id)) return t
        const next: Task = { ...t, ...(patch as Partial<Task>) }
        if (patch.deadlineShiftDays) {
          const nieuwDate = addDays(t.deadline, patch.deadlineShiftDays)
          next.deadline = toISODate(nieuwDate)
          next.tijdsblok = deriveTijdsblok(next.deadline, wedding.trouwdatum)
        } else if (patch.deadline) {
          next.tijdsblok = deriveTijdsblok(patch.deadline, wedding.trouwdatum)
        }
        return next
      })
      set({ tasks: optimistic })

      try {
        const cleanPatch: Partial<TaskInput> = { ...patch }
        delete (cleanPatch as { deadlineShiftDays?: number }).deadlineShiftDays
        await Promise.all(
          ids.map(async (id) => {
            const orig = before.find((t) => t.id === id)
            if (!orig) return
            let perTaskPatch: Partial<TaskInput> = { ...cleanPatch }
            if (patch.deadlineShiftDays) {
              const nieuwDate = addDays(orig.deadline, patch.deadlineShiftDays)
              const newDeadline = toISODate(nieuwDate)
              perTaskPatch = {
                ...perTaskPatch,
                deadline: newDeadline,
                tijdsblok: deriveTijdsblok(newDeadline, wedding.trouwdatum),
              }
            } else if (patch.deadline) {
              perTaskPatch.tijdsblok = deriveTijdsblok(patch.deadline, wedding.trouwdatum)
            }
            await repository.updateTask(id, perTaskPatch)
          })
        )
      } catch (e) {
        set({ tasks: before })
        throw e
      }
    },

    bulkDeleteTasks: async (ids) => {
      const before = get().tasks
      const idSet = new Set(ids)
      set({ tasks: before.filter((t) => !idSet.has(t.id)) })
      try {
        await Promise.all(ids.map((id) => repository.deleteTask(id)))
      } catch (e) {
        set({ tasks: before })
        throw e
      }
    },

    toggleSubtaak: async (taskId, subtaakId) => {
      const task = get().tasks.find((t) => t.id === taskId)
      if (!task) return
      const subtaken = task.subtaken.map((s) =>
        s.id === subtaakId ? { ...s, klaar: !s.klaar } : s
      )
      await get().updateTask(taskId, { subtaken })
    },

    // Bulk-toevoegen van ontbrekende sjabloontaken (titel-match).
    addTemplateMissing: async (titels) => {
      const wedding = get().wedding
      if (!wedding) return
      const set_ = new Set(titels)
      const templates: TemplateTask[] = TEMPLATE_TASKS.filter((t) => set_.has(t.titel))
      if (templates.length === 0) return
      const inputs: TaskInput[] = templates.map((t) => {
        const deadlineDate =
          'maanden' in t.offset
            ? addMonths(wedding.trouwdatum, t.offset.maanden)
            : addDays(wedding.trouwdatum, t.offset.dagen)
        const deadline = toISODate(deadlineDate)
        return {
          weddingId: wedding.id,
          titel: t.titel,
          omschrijving: t.omschrijving,
          deadline,
          tijdsblok: deriveTijdsblok(deadline, wedding.trouwdatum),
          status: 'open',
          prioriteit: t.prioriteit,
          toegewezenAan: t.toegewezenAan,
          assignees: [],
          subtaken: [],
        }
      })
      const created = await repository.createTasks(inputs)
      set({ tasks: [...get().tasks, ...created] })
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

    // --- Opmerkingen & activiteit ------------------------------------------

    addTaskComment: async (taskId, body) => {
      const wedding = get().wedding
      const tekst = body.trim()
      if (!wedding || !tekst) return
      const comment = await repository.createTaskComment({
        weddingId: wedding.id,
        taskId,
        body: tekst,
      })
      // Idempotent: realtime-echo met hetzelfde id vervangt deze rij later.
      set({ taskComments: [...get().taskComments, comment] })
    },

    deleteTaskComment: async (id) => {
      await repository.deleteTaskComment(id)
      set({ taskComments: get().taskComments.filter((c) => c.id !== id) })
    },

    // Markeer de feed als gezien (zet de 'nieuw'-badge op nul).
    markActivitySeen: () => {
      const wedding = get().wedding
      if (!wedding) return
      const seen = new Date().toISOString()
      writeSeen(wedding.id, seen)
      set({ activitySeenAt: seen })
    },

    // Herlaad de ledenlijst (na uitnodigen/verwijderen van een lid).
    loadMembers: async () => {
      const wedding = get().wedding
      if (!wedding) return
      const members = await repository.listMembers(wedding.id)
      set({ members })
    },
  })
)
