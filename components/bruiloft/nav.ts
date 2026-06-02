import {
  Armchair,
  CalendarClock,
  ClipboardList,
  Gift,
  Globe,
  LayoutDashboard,
  ListChecks,
  Settings,
  ShieldCheck,
  Sparkles,
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

// Individuele items.
const dashboard: NavItem = { label: 'Overzicht', href: '/bruiloft', icon: LayoutDashboard, module: 'dashboard' }
const taken: NavItem = { label: 'Taken', href: '/bruiloft/taken', icon: ListChecks, module: 'taken' }
const budget: NavItem = { label: 'Budget', href: '/bruiloft/budget', icon: Wallet, module: 'budget' }
const leveranciers: NavItem = { label: 'Leveranciers', href: '/bruiloft/leveranciers', icon: Store, module: 'leveranciers' }
const draaiboek: NavItem = { label: 'Draaiboek', href: '/bruiloft/draaiboek', icon: CalendarClock, module: 'draaiboek' }
const gasten: NavItem = { label: 'Gastenlijst', href: '/bruiloft/gasten', icon: Users, module: 'gasten' }
const tafels: NavItem = { label: 'Tafelschikking', href: '/bruiloft/tafels', icon: Armchair, module: 'tafels' }
const website: NavItem = { label: 'Website', href: '/bruiloft/website', icon: Globe, module: 'website' }
const cadeaulijst: NavItem = { label: 'Cadeaulijst', href: '/bruiloft/cadeaulijst', icon: Gift, module: 'registry' }
const leden: NavItem = { label: 'Leden & rechten', href: '/bruiloft/beheer/leden', icon: ShieldCheck, module: 'beheer' }
const account: NavItem = { label: 'Account', href: '/bruiloft/account', icon: Settings, module: 'dashboard' }
const aiPlanner: NavItem = { label: 'AI Wedding Planner', href: '/bruiloft/ai-wedding-planner', icon: Sparkles, module: 'dashboard' }

// Platte lijst (voor lookups en actief-detectie).
export const NAV_ITEMS: NavItem[] = [
  dashboard,
  aiPlanner,
  taken,
  budget,
  leveranciers,
  draaiboek,
  gasten,
  tafels,
  website,
  cadeaulijst,
  leden,
  account,
]

// Top-niveau secties (horizontaal in de donkere header, à la Riley & Grey).
// Elke sectie heeft (optioneel) een sub-navigatie die in de linker zijbalk
// verschijnt zodra de sectie actief is.
export interface NavSection {
  key: string
  label: string
  icon: LucideIcon
  // Het pad dat geopend wordt als je op de top-knop klikt — meestal het
  // eerste sub-item van de sectie.
  href: string
  items: NavItem[]
  module: Module // welke module bepaalt zichtbaarheid in de top-balk
}

export const NAV_SECTIONS: NavSection[] = [
  {
    key: 'overzicht',
    label: 'Overzicht',
    icon: LayoutDashboard,
    href: '/bruiloft',
    items: [dashboard, aiPlanner],
    module: 'dashboard',
  },
  {
    key: 'plannen',
    label: 'Plannen',
    icon: ClipboardList,
    href: '/bruiloft/taken',
    items: [taken, budget, leveranciers, draaiboek],
    module: 'taken',
  },
  {
    key: 'gasten',
    label: 'Gastenbeheer',
    icon: Users,
    href: '/bruiloft/gasten',
    items: [gasten, tafels],
    module: 'gasten',
  },
  {
    key: 'website',
    label: 'Website',
    icon: Globe,
    href: '/bruiloft/website',
    items: [website],
    module: 'website',
  },
  {
    key: 'cadeaulijst',
    label: 'Cadeaulijst',
    icon: Gift,
    href: '/bruiloft/cadeaulijst',
    items: [cadeaulijst],
    module: 'registry',
  },
  {
    key: 'beheer',
    label: 'Beheer',
    icon: ShieldCheck,
    href: '/bruiloft/beheer/leden',
    items: [leden],
    module: 'beheer',
  },
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

// Welke top-sectie is actief op basis van het huidige pad. Default: overzicht.
export function activeSection(pathname: string): NavSection {
  for (const section of NAV_SECTIONS) {
    if (section.items.some((i) => isActive(pathname, i.href))) return section
  }
  return NAV_SECTIONS[0]
}

// Filtert items op zichtbaarheid volgens de rechten-matrix.
export function visibleItems(items: NavItem[], permissions: PermissionMap): NavItem[] {
  return items.filter((i) => canView(permissions, i.module))
}

// Top-secties die voor de gebruiker zichtbaar zijn (filtert ook lege secties).
export function visibleSections(permissions: PermissionMap): NavSection[] {
  return NAV_SECTIONS.map((s) => ({
    ...s,
    items: visibleItems(s.items, permissions),
  })).filter((s) => s.items.length > 0)
}
