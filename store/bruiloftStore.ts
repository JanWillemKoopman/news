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
  websiteFotoFromRow,
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
import { createClient, createRawClient } from '@/lib/supabase/client'
import { uploadWeddingMedia, deleteWeddingMedia } from '@/lib/supabase/storage'
import type {
  ActivityEntry,
  BudgetItem,
  BudgetItemInput,
  FaqItem,
  GallerijFoto,
  Guest,
  GuestInput,
  ID,
  RegistryContribution,
  RegistryItem,
  RegistryItemInput,
  RegistryReservation,
  RegistrySettings,
  RegistrySettingsInput,
  WeddingThema,
  WeddingLettertype,
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
  WebsiteFoto,
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
  avatarUrl?: string
  emailHerinneringen: boolean
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
  websiteFotos: WebsiteFoto[]
  activity: ActivityEntry[]
  taskComments: TaskComment[]
  members: WeddingMember[]
  activitySeenAt: string | null // wanneer de feed voor het laatst bekeken is
  registryItems: RegistryItem[]
  registrySettings: RegistrySettings | null
  registryReservations: RegistryReservation[]
  registryContributions: RegistryContribution[]
  registryLoaded: boolean
  // UI: of de "Onze gegevens"-modal open is. App-breed te openen vanuit hero,
  // profielkaart, accountmenu en de profiel-nudge.
  weddingSettingsOpen: boolean
  // UI: of het AI-coach-paneel open is. Te openen vanuit de topbalk en de
  // moment-nudge; het paneel zelf staat in WeddingShell.
  aiCoachOpen: boolean
  // UI: of de keuzescreen getoond moet worden (meerdere bruiloften, geen
  // opgeslagen voorkeur). Wordt gereset zodra de gebruiker een keuze maakt.
  pickingWedding: boolean
  // UI: of het aanmaak-scherm voor een (extra) trouwplan geforceerd open staat.
  // Wordt gezet vanuit het accountmenu en gereset zodra het plan is aangemaakt
  // of de gebruiker annuleert.
  creatingWedding: boolean
}

interface BruiloftActions {
  init: () => Promise<void>
  retryInit: () => Promise<void>
  signOut: () => Promise<void>
  switchWedding: (id: ID) => Promise<void>
  selectWedding: (id: ID) => Promise<void>
  startNewWedding: () => void
  cancelNewWedding: () => void
  deleteActiveWedding: () => Promise<void>
  startRealtime: (weddingId: ID) => void
  stopRealtime: () => void

  setupWedding: (input: WeddingInput) => Promise<void>
  updateWedding: (patch: Partial<WeddingInput>) => Promise<void>
  openWeddingSettings: () => void
  closeWeddingSettings: () => void
  openAICoach: () => void
  closeAICoach: () => void

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
  addAITaken: (taken: NewTask[]) => Promise<void>

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
  checkSlugAvailable: (slug: string) => Promise<boolean>
  uploadHeaderFoto: (file: File) => Promise<string>
  uploadSectieFoto: (sectieKey: string, file: File) => Promise<string>
  saveWebsiteFoto: (url: string, bijschrift: string) => Promise<void>
  deleteWebsiteFoto: (id: ID, publicUrl: string) => Promise<void>
  updateFaq: (faq: FaqItem[]) => Promise<void>
  updateGallerij: (gallerij: GallerijFoto[]) => Promise<void>
  ensureRsvpCodes: () => Promise<void>

  addTaskComment: (taskId: ID, body: string) => Promise<void>
  deleteTaskComment: (id: ID) => Promise<void>
  markActivitySeen: () => void

  loadMembers: () => Promise<void>
  updateProfile: (patch: { displayName?: string; email?: string; avatarUrl?: string | null; emailHerinneringen?: boolean }) => Promise<void>
  uploadAvatar: (file: File) => Promise<string>

  // --- Registry (Cadeaulijst) ---
  loadRegistry: () => Promise<void>
  saveRegistrySettings: (patch: Partial<RegistrySettingsInput>) => Promise<void>
  addRegistryItem: (data: Omit<RegistryItemInput, 'weddingId'>) => Promise<RegistryItem>
  updateRegistryItem: (id: ID, patch: Partial<RegistryItemInput>) => Promise<void>
  deleteRegistryItem: (id: ID) => Promise<void>
  reorderRegistryItems: (orderedIds: ID[]) => Promise<void>
  confirmContributionReceipt: (contributionId: ID) => Promise<void>
  uploadRegistryItemImage: (file: File) => Promise<string>
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
  // Platform-admin heeft volledige rechten op alle bruiloften.
  if (appRole === 'platform_admin') {
    return { role: role ?? 'owner', permissions: ALL_EDIT_PERMISSIONS }
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
    websiteFotos: [],
    activity: [],
    taskComments: [],
    members: [],
    activitySeenAt: null,
    registryItems: [],
    registrySettings: null,
    registryReservations: [],
    registryContributions: [],
    registryLoaded: false,
    weddingSettingsOpen: false,
    aiCoachOpen: false,
    pickingWedding: false,
    creatingWedding: false,

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

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, display_name, app_role, avatar_url, email_herinneringen')
        .eq('id', user.id)
        .maybeSingle()
      if (profileError) {
        console.error('[store] profile query failed:', profileError.message)
      }

      const currentUser: CurrentUser = {
        id: user.id,
        email: profile?.email ?? user.email ?? '',
        displayName: profile?.display_name ?? '',
        appRole: (profile?.app_role as CurrentUser['appRole']) ?? 'member',
        avatarUrl: profile?.avatar_url ?? undefined,
        emailHerinneringen: profile?.email_herinneringen ?? true,
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

      // Kies de onthouden actieve bruiloft. Als er meerdere zijn en geen
      // opgeslagen voorkeur, toon het keuzescreen.
      const stored = readActive()
      const match = weddings.find((w) => w.id === stored)
      if (!match && weddings.length > 1) {
        set({
          hydrated: true,
          error: null,
          currentUser,
          weddings,
          wedding: null,
          activeWeddingId: null,
          role: null,
          permissions: EMPTY_PERMISSIONS,
          pickingWedding: true,
        })
        return
      }
      const wedding = match ?? weddings[0]
      writeActive(wedding.id)

      const { role, permissions } = await loadPermissions(
        supabase,
        wedding.id,
        user.id,
        currentUser.appRole
      )

      // De bruiloft en rechten zijn al geladen; de losse datalijsten hieronder
      // mogen het laden van het dashboard niet blokkeren. Faalt één lijst
      // tijdelijk (netwerkhik, 5xx op één tabel), dan tonen we die slice leeg in
      // plaats van het hele trouwplan onbruikbaar te maken met het foutscherm.
      // Een echt verbroken verbinding faalt al eerder op listWeddings hierboven.
      const safe = async <T,>(label: string, p: Promise<T>, fallback: T): Promise<T> => {
        try {
          return await p
        } catch (e) {
          console.error(`[store] init: ${label} laden mislukt`, e)
          return fallback
        }
      }

      const [
        guests,
        tasks,
        vendors,
        budgetItems,
        scheduleItems,
        tables,
        websiteContent,
        websiteFotos,
        activity,
        taskComments,
        members,
      ] = await Promise.all([
        safe('gasten', repository.listGuests(wedding.id), []),
        safe('taken', repository.listTasks(wedding.id), []),
        safe('leveranciers', repository.listVendors(wedding.id), []),
        safe('budget', repository.listBudgetItems(wedding.id), []),
        safe('draaiboek', repository.listScheduleItems(wedding.id), []),
        safe('tafels', repository.listTables(wedding.id), []),
        safe('website-inhoud', repository.getWebsiteContent(wedding.id), null),
        safe('website-foto’s', repository.listWebsiteFotos(wedding.id), []),
        safe('activiteit', repository.listActivity(wedding.id, 50), []),
        safe('opmerkingen', repository.listTaskComments(wedding.id), []),
        safe('leden', repository.listMembers(wedding.id), []),
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
        websiteFotos,
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
        pickingWedding: false,
        creatingWedding: false,
        guests: [],
        tasks: [],
        vendors: [],
        budgetItems: [],
        scheduleItems: [],
        tables: [],
        websiteContent: null,
        websiteFotos: [],
        activity: [],
        taskComments: [],
        members: [],
        activitySeenAt: null,
        registryItems: [],
        registrySettings: null,
        registryReservations: [],
        registryContributions: [],
        registryLoaded: false,
      })
    },

    // Wissel naar een andere bruiloft waar je lid van bent.
    switchWedding: async (id) => {
      if (id === get().activeWeddingId) return
      get().stopRealtime()
      writeActive(id)
      set({ hydrated: false, pickingWedding: false, creatingWedding: false })
      await get().init()
    },

    // Sla een keuze op vanuit het keuzescreen (eerste keer meerdere bruiloften).
    selectWedding: async (id) => {
      get().stopRealtime()
      writeActive(id)
      set({ hydrated: false, pickingWedding: false, creatingWedding: false })
      await get().init()
    },

    // Open het aanmaak-scherm voor een (extra) trouwplan, ook als er al een
    // actieve bruiloft is. Te gebruiken vanuit het accountmenu. We stoppen de
    // realtime-stream van de huidige bruiloft zodat die straks geen wijzigingen
    // in de verkeerde store-slices schrijft.
    startNewWedding: () => {
      get().stopRealtime()
      set({ creatingWedding: true })
    },
    cancelNewWedding: () => {
      set({ creatingWedding: false })
      // Herstel de realtime-stream voor de nog actieve bruiloft (gestopt bij
      // startNewWedding) zodat live updates blijven werken na annuleren.
      const active = get().activeWeddingId
      if (active) get().startRealtime(active)
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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'website_fotos', filter: wf }, (p) =>
          set({ websiteFotos: applyList(get().websiteFotos, p, (r) => websiteFotoFromRow(r as unknown as Parameters<typeof websiteFotoFromRow>[0])) })
        )
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
      // Alleen taken die volgens de wizard al geregeld/bezig zijn worden direct
      // aangemaakt; de rest wordt kaart voor kaart voorgesteld via
      // "Takenlijst samenstellen" (TakenSamenstellen) op de takenpagina.
      const voorafGeregeld = generateTemplateTasks(wedding).filter((t) => t.status !== 'open')
      const tasks =
        voorafGeregeld.length > 0
          ? await repository.createTasks(voorafGeregeld).catch(() => [])
          : []
      const members = await repository.listMembers(wedding.id).catch(() => [])
      writeActive(wedding.id)
      const seen = new Date().toISOString()
      writeSeen(wedding.id, seen)
      set({
        wedding,
        weddings: [...get().weddings, wedding],
        activeWeddingId: wedding.id,
        pickingWedding: false,
        creatingWedding: false,
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
      // Live updates voor de zojuist aangemaakte bruiloft.
      get().startRealtime(wedding.id)
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

    openWeddingSettings: () => set({ weddingSettingsOpen: true }),
    closeWeddingSettings: () => set({ weddingSettingsOpen: false }),

    openAICoach: () => set({ aiCoachOpen: true }),
    closeAICoach: () => set({ aiCoachOpen: false }),

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

    addAITaken: async (taken) => {
      const wedding = get().wedding
      if (!wedding || taken.length === 0) return
      const inputs: TaskInput[] = taken.map((t) => ({
        ...t,
        weddingId: wedding.id,
        tijdsblok: deriveTijdsblok(t.deadline, wedding.trouwdatum),
      }))
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

    checkSlugAvailable: async (slug) => {
      return repository.checkSlugAvailable(slug)
    },

    uploadHeaderFoto: async (file) => {
      const wedding = get().wedding
      if (!wedding) throw new Error('Geen actieve bruiloft')
      const supabase = createClient()
      const url = await uploadWeddingMedia(supabase, wedding.id, file, 'header')
      await get().saveWebsiteContent({ headerFotoUrl: url })
      return url
    },

    uploadSectieFoto: async (sectieKey, file) => {
      const { wedding, websiteContent } = get()
      if (!wedding) throw new Error('Geen actieve bruiloft')
      const supabase = createClient()
      const url = await uploadWeddingMedia(supabase, wedding.id, file, 'sectie-fotos')
      const config = { ...(websiteContent?.sectiesConfig ?? {}) }
      config[sectieKey] = { ...(config[sectieKey] ?? { zichtbaar: true, naam: sectieKey }), fotoUrl: url }
      await get().saveWebsiteContent({ sectiesConfig: config })
      return url
    },

    saveWebsiteFoto: async (url, bijschrift) => {
      const wedding = get().wedding
      if (!wedding) return
      const volgorde = get().websiteFotos.length
      const foto = await repository.createWebsiteFoto(wedding.id, url, bijschrift, volgorde)
      set({ websiteFotos: [...get().websiteFotos, foto] })
    },

    deleteWebsiteFoto: async (id, publicUrl) => {
      const supabase = createClient()
      await repository.deleteWebsiteFoto(id)
      await deleteWeddingMedia(supabase, publicUrl).catch(() => undefined)
      set({ websiteFotos: get().websiteFotos.filter((f) => f.id !== id) })
    },

    updateFaq: async (faq) => {
      await get().saveWebsiteContent({ faq })
    },

    updateGallerij: async (gallerij) => {
      await get().saveWebsiteContent({ gallerij })
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

    updateProfile: async (patch) => {
      const res = await fetch('/api/profiel', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'Opslaan mislukt')
      }
      const user = get().currentUser
      if (!user) return
      set({
        currentUser: {
          ...user,
          ...(patch.displayName !== undefined && { displayName: patch.displayName }),
          ...(patch.email !== undefined && { email: patch.email }),
          ...(patch.avatarUrl !== undefined && { avatarUrl: patch.avatarUrl ?? undefined }),
          ...(patch.emailHerinneringen !== undefined && { emailHerinneringen: patch.emailHerinneringen }),
        },
      })
      // Herlaad leden zodat naam/avatar direct bijgewerkt zijn bij taken.
      await get().loadMembers()
    },

    uploadAvatar: async (file) => {
      const user = get().currentUser
      if (!user) throw new Error('Niet ingelogd')
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${user.id}.${ext}`
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (error) throw error
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${data.publicUrl}?t=${Date.now()}`
      await get().updateProfile({ avatarUrl: url })
      return url
    },

    // --- Registry (Cadeaulijst) --------------------------------------------

    loadRegistry: async () => {
      const wedding = get().wedding
      if (!wedding) return
      const rawSupabase = createRawClient()

      const [itemsRes, settingsRes, reservationsRes, contributionsRes] = await Promise.all([
        rawSupabase
          .from('registry_items')
          .select('*')
          .eq('wedding_id', wedding.id)
          .order('sort_order', { ascending: true }),
        rawSupabase
          .from('registry_settings')
          .select('*')
          .eq('wedding_id', wedding.id)
          .maybeSingle(),
        rawSupabase
          .from('registry_reservations')
          .select('*, registry_items!inner(wedding_id)')
          .eq('registry_items.wedding_id', wedding.id),
        rawSupabase
          .from('registry_contributions')
          .select('*, registry_items!inner(wedding_id)')
          .eq('registry_items.wedding_id', wedding.id)
          .order('contributed_at', { ascending: false }),
      ])

      const mapItem = (r: Record<string, unknown>): RegistryItem => ({
        id: r.id as string,
        weddingId: r.wedding_id as string,
        type: r.type as RegistryItem['type'],
        title: r.title as string,
        description: (r.description as string) ?? '',
        imageUrl: (r.image_url as string) ?? '',
        shopUrl: (r.shop_url as string) ?? '',
        targetAmount: r.target_amount as number | null,
        suggestedAmounts: (r.suggested_amounts as number[]) ?? [],
        paymentLink: (r.payment_link as string) ?? '',
        sortOrder: r.sort_order as number,
        isVisible: r.is_visible as boolean,
        createdAt: r.created_at as string,
        updatedAt: r.updated_at as string,
      })

      const mapSettings = (r: Record<string, unknown>): RegistrySettings => ({
        id: r.id as string,
        weddingId: r.wedding_id as string,
        isEnabled: r.is_enabled as boolean,
        password: (r.password as string) ?? '',
        introText: (r.intro_text as string) ?? '',
        bankAccountIban: (r.bank_account_iban as string) ?? '',
        bankAccountName: (r.bank_account_name as string) ?? '',
        thema: ((r.thema as string) ?? 'klassiek') as WeddingThema,
        kleurAccent: (r.kleur_accent as string) ?? '#a75573',
        kopLettertype: ((r.kop_lettertype as string) ?? 'cormorant') as WeddingLettertype,
        createdAt: r.created_at as string,
        updatedAt: r.updated_at as string,
      })

      const mapReservation = (r: Record<string, unknown>): RegistryReservation => ({
        id: r.id as string,
        itemId: r.item_id as string,
        cancelToken: r.cancel_token as string,
        guestName: r.guest_name as string,
        guestEmail: r.guest_email as string,
        message: (r.message as string) ?? '',
        reservedAt: r.reserved_at as string,
      })

      const mapContribution = (r: Record<string, unknown>): RegistryContribution => ({
        id: r.id as string,
        itemId: r.item_id as string,
        guestName: r.guest_name as string,
        guestEmail: r.guest_email as string,
        amount: r.amount as number,
        message: (r.message as string) ?? '',
        paymentStatus: r.payment_status as RegistryContribution['paymentStatus'],
        paymentMethod: r.payment_method as RegistryContribution['paymentMethod'],
        paymentReference: (r.payment_reference as string) ?? '',
        confirmedAt: (r.confirmed_at as string) ?? null,
        contributedAt: r.contributed_at as string,
      })

      set({
        registryItems: (itemsRes.data ?? []).map((r) => mapItem(r as unknown as Record<string, unknown>)),
        registrySettings: settingsRes.data ? mapSettings(settingsRes.data as unknown as Record<string, unknown>) : null,
        registryReservations: (reservationsRes.data ?? []).map((r) => mapReservation(r as unknown as Record<string, unknown>)),
        registryContributions: (contributionsRes.data ?? []).map((r) => mapContribution(r as unknown as Record<string, unknown>)),
        registryLoaded: true,
      })
    },

    saveRegistrySettings: async (patch) => {
      const wedding = get().wedding
      if (!wedding) return

      const res = await fetch('/api/registry/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weddingId: wedding.id, ...patch }),
      })
      if (!res.ok) throw new Error('Instellingen opslaan mislukt')
      const r = await res.json()
      set({
        registrySettings: {
          id: r.id as string,
          weddingId: r.weddingId as string,
          isEnabled: r.isEnabled as boolean,
          password: r.password as string,
          introText: (r.introText as string) ?? '',
          bankAccountIban: (r.bankAccountIban as string) ?? '',
          bankAccountName: (r.bankAccountName as string) ?? '',
          thema: ((r.thema as string) ?? 'klassiek') as import('@/lib/bruiloft/types').WeddingThema,
          kleurAccent: (r.kleurAccent as string) ?? '#a75573',
          kopLettertype: ((r.kopLettertype as string) ?? 'cormorant') as import('@/lib/bruiloft/types').WeddingLettertype,
          createdAt: r.createdAt as string,
          updatedAt: r.updatedAt as string,
        },
      })
    },

    addRegistryItem: async (data) => {
      const wedding = get().wedding
      if (!wedding) throw new Error('Geen actieve bruiloft')
      const rawSupabase = createRawClient()
      const nextOrder = get().registryItems.length
      const { data: row, error } = await rawSupabase
        .from('registry_items')
        .insert({
          wedding_id: wedding.id,
          type: data.type,
          title: data.title,
          description: data.description || null,
          image_url: data.imageUrl || null,
          shop_url: data.shopUrl || null,
          target_amount: data.targetAmount ?? null,
          suggested_amounts: data.suggestedAmounts.length ? data.suggestedAmounts : null,
          payment_link: data.paymentLink || null,
          sort_order: nextOrder,
          is_visible: data.isVisible ?? true,
        })
        .select()
        .single()
      if (error) throw error
      const r = row as unknown as Record<string, unknown>
      const item: RegistryItem = {
        id: r.id as string,
        weddingId: r.wedding_id as string,
        type: r.type as RegistryItem['type'],
        title: r.title as string,
        description: (r.description as string) ?? '',
        imageUrl: (r.image_url as string) ?? '',
        shopUrl: (r.shop_url as string) ?? '',
        targetAmount: r.target_amount as number | null,
        suggestedAmounts: (r.suggested_amounts as number[]) ?? [],
        paymentLink: (r.payment_link as string) ?? '',
        sortOrder: r.sort_order as number,
        isVisible: r.is_visible as boolean,
        createdAt: r.created_at as string,
        updatedAt: r.updated_at as string,
      }
      set({ registryItems: [...get().registryItems, item] })
      return item
    },

    updateRegistryItem: async (id, patch) => {
      const rawSupabase = createRawClient()
      const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (patch.title !== undefined) dbPatch.title = patch.title
      if (patch.description !== undefined) dbPatch.description = patch.description || null
      if (patch.imageUrl !== undefined) dbPatch.image_url = patch.imageUrl || null
      if (patch.shopUrl !== undefined) dbPatch.shop_url = patch.shopUrl || null
      if (patch.targetAmount !== undefined) dbPatch.target_amount = patch.targetAmount ?? null
      if (patch.suggestedAmounts !== undefined) dbPatch.suggested_amounts = patch.suggestedAmounts.length ? patch.suggestedAmounts : null
      if (patch.paymentLink !== undefined) dbPatch.payment_link = patch.paymentLink || null
      if (patch.sortOrder !== undefined) dbPatch.sort_order = patch.sortOrder
      if (patch.isVisible !== undefined) dbPatch.is_visible = patch.isVisible
      const { data: row, error } = await rawSupabase
        .from('registry_items')
        .update(dbPatch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      const r = row as unknown as Record<string, unknown>
      const item: RegistryItem = {
        id: r.id as string,
        weddingId: r.wedding_id as string,
        type: r.type as RegistryItem['type'],
        title: r.title as string,
        description: (r.description as string) ?? '',
        imageUrl: (r.image_url as string) ?? '',
        shopUrl: (r.shop_url as string) ?? '',
        targetAmount: r.target_amount as number | null,
        suggestedAmounts: (r.suggested_amounts as number[]) ?? [],
        paymentLink: (r.payment_link as string) ?? '',
        sortOrder: r.sort_order as number,
        isVisible: r.is_visible as boolean,
        createdAt: r.created_at as string,
        updatedAt: r.updated_at as string,
      }
      set({ registryItems: get().registryItems.map((x) => (x.id === id ? item : x)) })
    },

    deleteRegistryItem: async (id) => {
      const rawSupabase = createRawClient()
      const prev = get().registryItems
      set({ registryItems: prev.filter((x) => x.id !== id) })
      const { error } = await rawSupabase.from('registry_items').delete().eq('id', id)
      if (error) {
        set({ registryItems: prev })
        throw error
      }
    },

    reorderRegistryItems: async (orderedIds) => {
      const rawSupabase = createRawClient()
      const prev = get().registryItems
      // Optimistic: update sort_order locally
      const updated = prev.map((item) => {
        const idx = orderedIds.indexOf(item.id)
        return idx !== -1 ? { ...item, sortOrder: idx } : item
      })
      set({ registryItems: updated.sort((a, b) => a.sortOrder - b.sortOrder) })
      try {
        await Promise.all(
          orderedIds.map((id, idx) =>
            rawSupabase.from('registry_items').update({ sort_order: idx }).eq('id', id)
          )
        )
      } catch (e) {
        set({ registryItems: prev })
        throw e
      }
    },

    confirmContributionReceipt: async (contributionId) => {
      const res = await fetch('/api/registry/confirm-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contribution_id: contributionId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'Bevestigen mislukt')
      }
      const now = new Date().toISOString()
      set({
        registryContributions: get().registryContributions.map((c) =>
          c.id === contributionId
            ? { ...c, paymentStatus: 'confirmed', confirmedAt: now }
            : c
        ),
      })
    },

    uploadRegistryItemImage: async (file) => {
      const wedding = get().wedding
      if (!wedding) throw new Error('Geen actieve bruiloft')
      const supabase = createClient()
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const naam = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const pad = `${wedding.id}/${naam}`
      const { error } = await supabase.storage
        .from('registry-images')
        .upload(pad, file, { upsert: false, contentType: file.type })
      if (error) throw error
      const { data } = supabase.storage.from('registry-images').getPublicUrl(pad)
      return data.publicUrl
    },
  })
)
