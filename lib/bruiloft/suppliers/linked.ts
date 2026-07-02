// Koppeling tussen de globale directory en de persoonlijke leverancierslijst:
// is deze supplier al toegevoegd? Puur en store-vrij, net als match.ts.

import type { Vendor } from '../types'
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
