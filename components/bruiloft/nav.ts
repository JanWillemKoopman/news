import {
  Armchair,
  CalendarClock,
  Globe,
  LayoutDashboard,
  ListChecks,
  ShieldCheck,
  Store,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

import { canView, type Module, type PermissionMap } from '@/lib/bruiloft/permissions'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  module: Module
}

const dashboard: NavItem = { label: 'Dashboard', href: '/bruiloft', icon: LayoutDashboard, module: 'dashboard' }
const taken: NavItem = { label: 'Taken', href: '/bruiloft/taken', icon: ListChecks, module: 'taken' }
const budget: NavItem = { label: 'Budget', href: '/bruiloft/budget', icon: Wallet, module: 'budget' }
const leveranciers: NavItem = { label: 'Leveranciers', href: '/bruiloft/leveranciers', icon: Store, module: 'leveranciers' }
const gasten: NavItem = { label: 'Gasten', href: '/bruiloft/gasten', icon: Users, module: 'gasten' }
const website: NavItem = { label: 'Website', href: '/bruiloft/website', icon: Globe, module: 'website' }
const draaiboek: NavItem = { label: 'Draaiboek', href: '/bruiloft/draaiboek', icon: CalendarClock, module: 'draaiboek' }
const tafels: NavItem = { label: 'Tafels', href: '/bruiloft/tafels', icon: Armchair, module: 'tafels' }
const leden: NavItem = { label: 'Leden & rechten', href: '/bruiloft/beheer/leden', icon: ShieldCheck, module: 'beheer' }

// Platte lijst (voor lookups en actief-detectie).
export const NAV_ITEMS: NavItem[] = [
  dashboard,
  taken,
  budget,
  leveranciers,
  gasten,
  website,
  draaiboek,
  tafels,
  leden,
]

// Gegroepeerde navigatie voor de zijbalk. Een groep zonder label staat los bovenaan.
export const NAV_GROUPS: { label: string | null; items: NavItem[] }[] = [
  { label: null, items: [dashboard] },
  { label: 'Plannen', items: [taken, budget, leveranciers] },
  { label: 'Gasten', items: [gasten, website] },
  { label: 'De dag zelf', items: [draaiboek, tafels] },
  { label: 'Beheer', items: [leden] },
]

// Hoofditems in de mobiele onderbalk; de rest zit achter "Meer".
export const MOBILE_PRIMARY: NavItem[] = [dashboard, gasten, taken, budget]

export function isActive(pathname: string, href: string): boolean {
  if (href === '/bruiloft') return pathname === '/bruiloft'
  return pathname === href || pathname.startsWith(href + '/')
}

// Welke module hoort bij het huidige pad (voor de route-guard).
export function moduleForPath(pathname: string): Module {
  const match = NAV_ITEMS.find((i) => i.href !== '/bruiloft' && isActive(pathname, i.href))
  return match ? match.module : 'dashboard'
}

// Filtert items/groepen op zichtbaarheid volgens de rechten-matrix.
export function visibleItems(items: NavItem[], permissions: PermissionMap): NavItem[] {
  return items.filter((i) => canView(permissions, i.module))
}

export function visibleGroups(
  permissions: PermissionMap
): { label: string | null; items: NavItem[] }[] {
  return NAV_GROUPS.map((g) => ({ ...g, items: visibleItems(g.items, permissions) })).filter(
    (g) => g.items.length > 0
  )
}
