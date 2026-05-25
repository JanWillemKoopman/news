export type WeddingStyle = 'intiem' | 'klassiek' | 'modern' | 'feest'

export const WEDDING_STYLE_LABELS: Record<WeddingStyle, { label: string; hint: string }> = {
  intiem: { label: 'Klein & intiem', hint: 'Dichtbij, ingetogen' },
  klassiek: { label: 'Klassiek & elegant', hint: 'Tijdloos en stijlvol' },
  modern: { label: 'Modern & strak', hint: 'Strak en eigentijds' },
  feest: { label: 'Groots feest', hint: 'Uitbundig en groot' },
}

export interface WeddingInfo {
  date: string | null
  partner1: string
  partner2: string
  budget: number | null
  guestEstimate: number | null
  style: WeddingStyle | null
  ceremonyMasters: string[]
  witnesses: string[]
}

export type BudgetCategory =
  | 'locatie'
  | 'catering'
  | 'fotografie'
  | 'kleding'
  | 'bloemen'
  | 'muziek'
  | 'transport'
  | 'overig'

export const BUDGET_CATEGORY_LABELS: Record<BudgetCategory, string> = {
  locatie: 'Locatie',
  catering: 'Catering',
  fotografie: 'Fotografie',
  kleding: 'Kleding',
  bloemen: 'Bloemen & Decoratie',
  muziek: 'Muziek & Entertainment',
  transport: 'Transport',
  overig: 'Overig',
}

export interface BudgetItem {
  id: string
  category: BudgetCategory
  name: string
  estimated: number
  actual: number | null
  paid: boolean
  auto?: boolean
}

export const BUDGET_SPLIT: Record<BudgetCategory, number> = {
  locatie: 0.25,
  catering: 0.25,
  fotografie: 0.1,
  kleding: 0.1,
  muziek: 0.1,
  bloemen: 0.08,
  transport: 0.05,
  overig: 0.07,
}

export interface WeddingTask {
  id: string
  monthsBefore: number
  title: string
  category: string
  completed: boolean
  isDefault: boolean
}

export interface Guest {
  id: string
  name: string
  plusOne: boolean
  rsvp: 'pending' | 'confirmed' | 'declined'
  dietary?: string
}

export interface Vendor {
  id: string
  category: string
  name: string
  status: 'zoekend' | 'contact' | 'geboekt'
  price: number | null
  notes: string
}

export interface ArrangedOption {
  id: string
  label: string
  taskId: string
  vendorCategory?: string
  vendorName?: string
}

export const ARRANGED_OPTIONS: ArrangedOption[] = [
  { id: 'locatie', label: 'Trouwlocatie geboekt', taskId: 'dt5', vendorCategory: 'Locatie', vendorName: 'Trouwlocatie' },
  { id: 'catering', label: 'Catering geregeld', taskId: 'dt9', vendorCategory: 'Catering', vendorName: 'Catering' },
  { id: 'fotograaf', label: 'Fotograaf geboekt', taskId: 'dt6', vendorCategory: 'Fotografie & Video', vendorName: 'Fotograaf' },
  { id: 'muziek', label: 'DJ of band geboekt', taskId: 'dt12', vendorCategory: 'Muziek & DJ', vendorName: 'DJ / Band' },
  { id: 'kleding', label: 'Trouwjurk of pak gevonden', taskId: 'dt8' },
  { id: 'visagie', label: 'Visagiste & kapper geboekt', taskId: 'dt14', vendorCategory: 'Visagiste & Kapper', vendorName: 'Visagiste & kapper' },
  { id: 'savedate', label: 'Save-the-dates verstuurd', taskId: 'dt11' },
  { id: 'ringen', label: 'Trouwringen gekocht', taskId: 'dt17' },
]
