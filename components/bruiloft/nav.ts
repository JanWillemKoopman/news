import {
  Armchair,
  CalendarClock,
  Globe,
  LayoutDashboard,
  ListChecks,
  Store,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

const dashboard: NavItem = { label: 'Dashboard', href: '/bruiloft', icon: LayoutDashboard }
const taken: NavItem = { label: 'Taken', href: '/bruiloft/taken', icon: ListChecks }
const budget: NavItem = { label: 'Budget', href: '/bruiloft/budget', icon: Wallet }
const leveranciers: NavItem = { label: 'Leveranciers', href: '/bruiloft/leveranciers', icon: Store }
const gasten: NavItem = { label: 'Gasten', href: '/bruiloft/gasten', icon: Users }
const website: NavItem = { label: 'Website', href: '/bruiloft/website', icon: Globe }
const draaiboek: NavItem = { label: 'Draaiboek', href: '/bruiloft/draaiboek', icon: CalendarClock }
const tafels: NavItem = { label: 'Tafels', href: '/bruiloft/tafels', icon: Armchair }

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
]

// Gegroepeerde navigatie voor de zijbalk. Een groep zonder label staat los bovenaan.
export const NAV_GROUPS: { label: string | null; items: NavItem[] }[] = [
  { label: null, items: [dashboard] },
  { label: 'Plannen', items: [taken, budget, leveranciers] },
  { label: 'Gasten', items: [gasten, website] },
  { label: 'De dag zelf', items: [draaiboek, tafels] },
]

// Hoofditems in de mobiele onderbalk; de rest zit achter "Meer".
export const MOBILE_PRIMARY: NavItem[] = [dashboard, gasten, taken, budget]

export function isActive(pathname: string, href: string): boolean {
  if (href === '/bruiloft') return pathname === '/bruiloft'
  return pathname === href || pathname.startsWith(href + '/')
}
