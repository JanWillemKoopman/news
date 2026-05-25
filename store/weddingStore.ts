import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WeddingTask, BudgetItem, Guest, Vendor, WeddingInfo, BudgetCategory } from '@/types/wedding'
import { ARRANGED_OPTIONS, BUDGET_CATEGORY_LABELS } from '@/types/wedding'

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

const DEFAULT_TASKS: WeddingTask[] = [
  { id: 'dt1', monthsBefore: 12, title: 'Stel het totaalbudget vast', category: 'financieel', completed: false, isDefault: true },
  { id: 'dt2', monthsBefore: 12, title: 'Kies een definitieve trouwdatum', category: 'planning', completed: false, isDefault: true },
  { id: 'dt3', monthsBefore: 12, title: 'Bepaal de omvang van de bruiloft', category: 'planning', completed: false, isDefault: true },
  { id: 'dt4', monthsBefore: 12, title: 'Begin de gastenlijst samen te stellen', category: 'gasten', completed: false, isDefault: true },
  { id: 'dt5', monthsBefore: 12, title: 'Boek de trouwlocatie', category: 'locatie', completed: false, isDefault: true },
  { id: 'dt6', monthsBefore: 9, title: 'Boek de trouwfotograaf', category: 'leveranciers', completed: false, isDefault: true },
  { id: 'dt7', monthsBefore: 9, title: 'Kies het trouwthema en kleurenschema', category: 'planning', completed: false, isDefault: true },
  { id: 'dt8', monthsBefore: 9, title: 'Start zoeken naar trouwjurk of pak', category: 'kleding', completed: false, isDefault: true },
  { id: 'dt9', monthsBefore: 9, title: 'Kies en boek de catering', category: 'leveranciers', completed: false, isDefault: true },
  { id: 'dt10', monthsBefore: 9, title: 'Bespreek de bloemdecoratie', category: 'leveranciers', completed: false, isDefault: true },
  { id: 'dt11', monthsBefore: 6, title: 'Verstuur save-the-date kaarten', category: 'gasten', completed: false, isDefault: true },
  { id: 'dt12', monthsBefore: 6, title: 'Boek de DJ of live band', category: 'leveranciers', completed: false, isDefault: true },
  { id: 'dt13', monthsBefore: 6, title: 'Reserveer de huwelijksnacht accommodatie', category: 'planning', completed: false, isDefault: true },
  { id: 'dt14', monthsBefore: 6, title: 'Boek de visagiste en kapper', category: 'leveranciers', completed: false, isDefault: true },
  { id: 'dt15', monthsBefore: 6, title: 'Bestel het trouwgebak', category: 'catering', completed: false, isDefault: true },
  { id: 'dt16', monthsBefore: 3, title: 'Stuur formele uitnodigingen', category: 'gasten', completed: false, isDefault: true },
  { id: 'dt17', monthsBefore: 3, title: 'Koop de trouwringen', category: 'planning', completed: false, isDefault: true },
  { id: 'dt18', monthsBefore: 3, title: 'Plan de huwelijksreis', category: 'planning', completed: false, isDefault: true },
  { id: 'dt19', monthsBefore: 3, title: 'Stel het ceremonieprogramma op', category: 'planning', completed: false, isDefault: true },
  { id: 'dt20', monthsBefore: 1, title: 'Bevestig alle leveranciers', category: 'leveranciers', completed: false, isDefault: true },
  { id: 'dt21', monthsBefore: 1, title: 'Maak de zitplaatsindeling', category: 'gasten', completed: false, isDefault: true },
  { id: 'dt22', monthsBefore: 1, title: 'Bereid speeches voor', category: 'planning', completed: false, isDefault: true },
  { id: 'dt23', monthsBefore: 1, title: 'Regel het vervoer voor gasten', category: 'planning', completed: false, isDefault: true },
  { id: 'dt24', monthsBefore: 0, title: 'Bevestig de tijdlijn met alle leveranciers', category: 'leveranciers', completed: false, isDefault: true },
  { id: 'dt25', monthsBefore: 0, title: 'Pak de koffers voor de huwelijksreis', category: 'planning', completed: false, isDefault: true },
]

export type ActiveTab = 'budget' | 'taken' | 'gasten' | 'leveranciers'

export type SetupStepKey = 'guests' | 'budgetSplit' | 'team' | 'arranged'

export type SetupSteps = Record<SetupStepKey, boolean>

interface WeddingStore {
  hasCompletedOnboarding: boolean
  wedding: WeddingInfo
  budgetItems: BudgetItem[]
  tasks: WeddingTask[]
  guests: Guest[]
  vendors: Vendor[]
  userEmail: string | null
  userName: string | null
  isRegistered: boolean
  totalActionsCount: number
  activeTab: ActiveTab
  showRegistrationModal: boolean
  setupSteps: SetupSteps
  setupDismissed: boolean

  completeOnboarding: (info: Partial<WeddingInfo>) => void
  resetPlanner: () => void
  updateWedding: (info: Partial<WeddingInfo>) => void

  applyBudgetSplit: (items: { category: BudgetCategory; estimated: number }[]) => void
  applyArranged: (ids: string[]) => void
  markSetupStep: (key: SetupStepKey) => void
  dismissSetup: () => void

  addBudgetItem: (item: Omit<BudgetItem, 'id'>) => void
  updateBudgetItem: (id: string, updates: Partial<BudgetItem>) => void
  removeBudgetItem: (id: string) => void

  toggleTask: (id: string) => void
  addTask: (task: Omit<WeddingTask, 'id' | 'isDefault'>) => void

  addGuest: (guest: Omit<Guest, 'id'>) => void
  updateGuest: (id: string, updates: Partial<Guest>) => void
  removeGuest: (id: string) => void

  addVendor: (vendor: Omit<Vendor, 'id'>) => void
  updateVendor: (id: string, updates: Partial<Vendor>) => void
  removeVendor: (id: string) => void

  register: (email: string, name: string) => void
  setActiveTab: (tab: ActiveTab) => void
  setShowRegistrationModal: (show: boolean) => void
}

const initialState = {
  hasCompletedOnboarding: false,
  wedding: {
    date: null,
    partner1: '',
    partner2: '',
    budget: null,
    guestEstimate: null,
    style: null,
    ceremonyMasters: [],
    witnesses: [],
  } as WeddingInfo,
  budgetItems: [] as BudgetItem[],
  tasks: DEFAULT_TASKS,
  guests: [] as Guest[],
  vendors: [] as Vendor[],
  userEmail: null,
  userName: null,
  isRegistered: false,
  totalActionsCount: 0,
  activeTab: 'taken' as ActiveTab,
  showRegistrationModal: false,
  setupSteps: { guests: false, budgetSplit: false, team: false, arranged: false } as SetupSteps,
  setupDismissed: false,
}

export const useWeddingStore = create<WeddingStore>()(
  persist(
    (set) => ({
      ...initialState,

      completeOnboarding: (info) =>
        set((s) => ({ hasCompletedOnboarding: true, wedding: { ...s.wedding, ...info } })),

      resetPlanner: () => set({ ...initialState, tasks: DEFAULT_TASKS }),

      updateWedding: (info) =>
        set((s) => ({ wedding: { ...s.wedding, ...info } })),

      applyBudgetSplit: (items) =>
        set((s) => {
          const manual = s.budgetItems.filter((b) => !b.auto)
          const auto: BudgetItem[] = items
            .filter((i) => i.estimated > 0)
            .map((i) => ({
              id: uid(),
              category: i.category,
              name: BUDGET_CATEGORY_LABELS[i.category],
              estimated: i.estimated,
              actual: null,
              paid: false,
              auto: true,
            }))
          return {
            budgetItems: [...manual, ...auto],
            setupSteps: { ...s.setupSteps, budgetSplit: true },
            totalActionsCount: s.totalActionsCount + 1,
          }
        }),

      applyArranged: (ids) =>
        set((s) => {
          const opts = ARRANGED_OPTIONS.filter((o) => ids.includes(o.id))
          const taskIds = new Set(opts.map((o) => o.taskId))
          const tasks = s.tasks.map((t) => (taskIds.has(t.id) ? { ...t, completed: true } : t))
          const newVendors: Vendor[] = []
          for (const o of opts) {
            if (!o.vendorCategory || !o.vendorName) continue
            const exists = s.vendors.some(
              (v) => v.name === o.vendorName && v.category === o.vendorCategory
            )
            if (exists) continue
            newVendors.push({
              id: uid(),
              category: o.vendorCategory,
              name: o.vendorName,
              status: 'geboekt',
              price: null,
              notes: 'Toegevoegd via setup',
            })
          }
          return {
            tasks,
            vendors: [...s.vendors, ...newVendors],
            setupSteps: { ...s.setupSteps, arranged: true },
            totalActionsCount: s.totalActionsCount + 1,
          }
        }),

      markSetupStep: (key) =>
        set((s) => ({ setupSteps: { ...s.setupSteps, [key]: true } })),

      dismissSetup: () => set({ setupDismissed: true }),

      addBudgetItem: (item) =>
        set((s) => ({
          budgetItems: [...s.budgetItems, { ...item, id: uid() }],
          totalActionsCount: s.totalActionsCount + 1,
        })),

      updateBudgetItem: (id, updates) =>
        set((s) => ({
          budgetItems: s.budgetItems.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        })),

      removeBudgetItem: (id) =>
        set((s) => ({ budgetItems: s.budgetItems.filter((b) => b.id !== id) })),

      toggleTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
          totalActionsCount: s.totalActionsCount + 1,
        })),

      addTask: (task) =>
        set((s) => ({
          tasks: [...s.tasks, { ...task, id: uid(), isDefault: false }],
          totalActionsCount: s.totalActionsCount + 1,
        })),

      addGuest: (guest) =>
        set((s) => ({
          guests: [...s.guests, { ...guest, id: uid() }],
          totalActionsCount: s.totalActionsCount + 1,
        })),

      updateGuest: (id, updates) =>
        set((s) => ({
          guests: s.guests.map((g) => (g.id === id ? { ...g, ...updates } : g)),
        })),

      removeGuest: (id) =>
        set((s) => ({ guests: s.guests.filter((g) => g.id !== id) })),

      addVendor: (vendor) =>
        set((s) => ({
          vendors: [...s.vendors, { ...vendor, id: uid() }],
          totalActionsCount: s.totalActionsCount + 1,
        })),

      updateVendor: (id, updates) =>
        set((s) => ({
          vendors: s.vendors.map((v) => (v.id === id ? { ...v, ...updates } : v)),
        })),

      removeVendor: (id) =>
        set((s) => ({ vendors: s.vendors.filter((v) => v.id !== id) })),

      register: (email, name) =>
        set({ userEmail: email, userName: name, isRegistered: true, showRegistrationModal: false }),

      setActiveTab: (tab) => set({ activeTab: tab }),

      setShowRegistrationModal: (show) => set({ showRegistrationModal: show }),
    }),
    {
      name: 'wedding-planner-v1',
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<WeddingStore>
        return {
          ...current,
          ...p,
          wedding: { ...current.wedding, ...(p.wedding ?? {}) },
          setupSteps: { ...current.setupSteps, ...(p.setupSteps ?? {}) },
        }
      },
    }
  )
)
