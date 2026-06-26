// Koppeling tussen de globale directory en de persoonlijke leverancierslijst:
// is deze supplier al toegevoegd? Puur en store-vrij, net als match.ts.

import type { Vendor } from '../types'
import type { MatchBadge } from './match'
import type { Supplier } from './types'

// Voor de legacy-fallback: vendors die vóór de supplier_id-koppeling zijn
// toegevoegd, herkennen we aan dezelfde (genormaliseerde) website.
export function normaliseerWebsite(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '')
}

export function isToegevoegd(supplier: Supplier, vendors: Vendor[]): boolean {
  if (vendors.some((v) => v.supplierId === supplier.id)) return true
  if (vendors.some((v) => v.tpwBusinessId === supplier.id)) return true
  const site = normaliseerWebsite(supplier.website)
  if (!site) return false
  return vendors.some((v) => v.website && normaliseerWebsite(v.website) === site)
}

// Eén plek voor de badge-kleuren (gebruikt door kaarten, detail en dashboard).
export const BADGE_STIJL: Record<MatchBadge, string> = {
  'binnen budget': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  'net erboven': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  'in jullie plaats': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  'in jullie regio': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  'past bij gezelschap': 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  'boek dit binnenkort': 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
}
