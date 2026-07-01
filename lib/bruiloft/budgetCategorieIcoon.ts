import {
  Cake,
  Camera,
  CarFront,
  Flower2,
  Gem,
  Mail,
  MapPin,
  Music,
  Shirt,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

import type { BudgetCategorie } from './types'

// Eén herkenbaar icoon per budgetcategorie (categorie-cards, detailweergave).
export const BUDGET_CATEGORIE_ICOON: Record<BudgetCategorie, LucideIcon> = {
  locatie: MapPin,
  catering: UtensilsCrossed,
  kleding: Shirt,
  'fotografie en video': Camera,
  muziek: Music,
  'bloemen en decoratie': Flower2,
  vervoer: CarFront,
  taart: Cake,
  'uitnodigingen en drukwerk': Mail,
  ringen: Gem,
  overig: Wallet,
}

export function getBudgetCategorieIcoon(categorie: string): LucideIcon {
  return BUDGET_CATEGORIE_ICOON[categorie as BudgetCategorie] ?? Wallet
}
