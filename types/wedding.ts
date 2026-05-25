export interface WeddingInfo {
  date: string | null
  partner1: string
  partner2: string
  budget: number | null
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
