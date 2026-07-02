import {
  Activity,
  Armchair,
  Cake,
  CalendarClock,
  Camera,
  CarFront,
  ClipboardList,
  Flower2,
  Gift,
  Globe,
  Laugh,
  LayoutDashboard,
  ListChecks,
  Mail,
  MapPin,
  Mic2,
  Music,
  PartyPopper,
  Search,
  Settings,
  ShieldCheck,
  Shirt,
  Sparkles,
  Star,
  Store,
  UtensilsCrossed,
  Users,
  Video,
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
const mijnLeveranciers: NavItem = { label: 'Mijn leveranciers', href: '/bruiloft/leveranciers', icon: Store, module: 'leveranciers' }
const leverancierZoeken: NavItem = { label: 'Ontdekken', href: '/bruiloft/ontdekken', icon: Search, module: 'leveranciers' }
const draaiboek: NavItem = { label: 'Draaiboek', href: '/bruiloft/draaiboek', icon: CalendarClock, module: 'draaiboek' }
const gasten: NavItem = { label: 'Gastenlijst', href: '/bruiloft/gasten', icon: Users, module: 'gasten' }
const tafels: NavItem = { label: 'Tafelschikking', href: '/bruiloft/tafels', icon: Armchair, module: 'tafels' }
const website: NavItem = { label: 'Trouwwebsite', href: '/bruiloft/website', icon: Globe, module: 'website' }
const cadeaulijst: NavItem = { label: 'Cadeaulijst', href: '/bruiloft/cadeaulijst', icon: Gift, module: 'registry' }
const fotomuur: NavItem = { label: 'Fotomuur', href: '/bruiloft/fotomuur', icon: Camera, module: 'website' }
const leden: NavItem = { label: 'Samen plannen', href: '/bruiloft/beheer/leden', icon: ShieldCheck, module: 'beheer' }
const account: NavItem = { label: 'Account', href: '/bruiloft/account', icon: Settings, module: 'dashboard' }
const aiPlanner: NavItem = { label: 'AI-assistent', href: '/bruiloft/ai-wedding-planner', icon: Sparkles, module: 'dashboard' }
const activiteit: NavItem = { label: 'Activiteit', href: '/bruiloft/activiteit', icon: Activity, module: 'dashboard' }

// Directory-categorieën — elk een eigen pagina onder /bruiloft/ontdekken/[slug].
const catTrouwlocaties: NavItem = { label: 'Trouwlocaties', href: '/bruiloft/ontdekken/trouwlocaties', icon: MapPin, module: 'leveranciers' }
const catWeddingplanners: NavItem = { label: 'Weddingplanners', href: '/bruiloft/ontdekken/weddingplanners', icon: Star, module: 'leveranciers' }
const catTrouwambtenaren: NavItem = { label: 'Trouwambtenaren', href: '/bruiloft/ontdekken/trouwambtenaren', icon: Mic2, module: 'leveranciers' }
const catTrouwjurken: NavItem = { label: 'Trouwjurken', href: '/bruiloft/ontdekken/trouwjurken', icon: Shirt, module: 'leveranciers' }
const catTrouwpakken: NavItem = { label: 'Trouwpakken', href: '/bruiloft/ontdekken/trouwpakken', icon: Shirt, module: 'leveranciers' }
const catBruidsmakeup: NavItem = { label: 'Bruidsmakeup', href: '/bruiloft/ontdekken/bruidsmakeup', icon: Sparkles, module: 'leveranciers' }
const catBruidskapsels: NavItem = { label: 'Bruidskapsels', href: '/bruiloft/ontdekken/bruidskapsels', icon: Sparkles, module: 'leveranciers' }
const catTrouwringen: NavItem = { label: 'Trouwringen', href: '/bruiloft/ontdekken/trouwringen', icon: Star, module: 'leveranciers' }
const catTrouwfotografen: NavItem = { label: 'Trouwfotografen', href: '/bruiloft/ontdekken/trouwfotografen', icon: Camera, module: 'leveranciers' }
const catVideografen: NavItem = { label: 'Videografen', href: '/bruiloft/ontdekken/videografen', icon: Video, module: 'leveranciers' }
const catPhotobooths: NavItem = { label: 'Photobooths', href: '/bruiloft/ontdekken/photobooths', icon: Laugh, module: 'leveranciers' }
const catBruidstaart: NavItem = { label: 'Bruidstaart', href: '/bruiloft/ontdekken/bruidstaart', icon: Cake, module: 'leveranciers' }
const catCatering: NavItem = { label: 'Catering', href: '/bruiloft/ontdekken/catering', icon: UtensilsCrossed, module: 'leveranciers' }
const catDecoratie: NavItem = { label: 'Decoratie', href: '/bruiloft/ontdekken/decoratie', icon: PartyPopper, module: 'leveranciers' }
const catBloemen: NavItem = { label: 'Bloemen', href: '/bruiloft/ontdekken/bloemen', icon: Flower2, module: 'leveranciers' }
const catMuziek: NavItem = { label: 'Muziek', href: '/bruiloft/ontdekken/muziek', icon: Music, module: 'leveranciers' }
const catTrouwvervoer: NavItem = { label: 'Trouwvervoer', href: '/bruiloft/ontdekken/trouwvervoer', icon: CarFront, module: 'leveranciers' }
const catEntertainment: NavItem = { label: 'Entertainment', href: '/bruiloft/ontdekken/entertainment', icon: PartyPopper, module: 'leveranciers' }
const catTrouwkaarten: NavItem = { label: 'Trouwkaarten', href: '/bruiloft/ontdekken/trouwkaarten', icon: Mail, module: 'leveranciers' }
const catBedankjes: NavItem = { label: 'Bedankjes', href: '/bruiloft/ontdekken/bedankjes', icon: Gift, module: 'leveranciers' }

export const DIRECTORY_CATEGORIE_ITEMS: NavItem[] = [
  catTrouwlocaties,
  catWeddingplanners,
  catTrouwambtenaren,
  catTrouwjurken,
  catTrouwpakken,
  catBruidsmakeup,
  catBruidskapsels,
  catTrouwringen,
  catTrouwfotografen,
  catVideografen,
  catPhotobooths,
  catBruidstaart,
  catCatering,
  catDecoratie,
  catBloemen,
  catMuziek,
  catTrouwvervoer,
  catEntertainment,
  catTrouwkaarten,
  catBedankjes,
]

// Platte lijst (voor lookups en actief-detectie).
export const NAV_ITEMS: NavItem[] = [
  dashboard,
  aiPlanner,
  activiteit,
  taken,
  budget,
  mijnLeveranciers,
  leverancierZoeken,
  ...DIRECTORY_CATEGORIE_ITEMS,
  draaiboek,
  gasten,
  tafels,
  website,
  cadeaulijst,
  fotomuur,
  leden,
  account,
]

// Top-niveau secties (horizontaal in de donkere header, à la Riley & Grey).
export interface NavGroup {
  label: string
  items: NavItem[]
}

export interface NavSection {
  key: string
  label: string
  icon: LucideIcon
  href: string
  items: NavItem[] // platte lijst (lookups, actief-detectie, mobiel)
  module: Module
  groups?: NavGroup[] // indien gezet: zijbalk toont deze subkoppen i.p.v. één sectielabel
}

export const NAV_SECTIONS: NavSection[] = [
  {
    key: 'thuis',
    label: 'Thuis',
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
    items: [taken, budget, draaiboek],
    module: 'taken',
  },
  {
    key: 'leveranciers',
    label: 'Leveranciers',
    icon: Store,
    href: '/bruiloft/leveranciers',
    items: [mijnLeveranciers, leverancierZoeken, ...DIRECTORY_CATEGORIE_ITEMS],
    module: 'leveranciers',
    groups: [
      { label: 'Leveranciers', items: [mijnLeveranciers, leverancierZoeken] },
    ],
  },
  {
    key: 'gasten',
    label: 'Gasten',
    icon: Users,
    href: '/bruiloft/gasten',
    items: [gasten, tafels],
    module: 'gasten',
  },
  {
    key: 'trouwpagina',
    label: 'Trouwpagina',
    icon: Globe,
    href: '/bruiloft/website',
    items: [website, cadeaulijst, fotomuur],
    module: 'website',
  },
]

// Hoofditems in de mobiele onderbalk; de rest zit achter "Meer".
export const MOBILE_PRIMARY: NavItem[] = [dashboard, taken, gasten, budget]

export function isActive(pathname: string, href: string): boolean {
  if (href === '/bruiloft') return pathname === '/bruiloft'
  return pathname === href || pathname.startsWith(href + '/')
}

// Welke module hoort bij het huidige pad (voor de route-guard).
export function moduleForPath(pathname: string): Module {
  const match = NAV_ITEMS.find((i) => i.href !== '/bruiloft' && isActive(pathname, i.href))
  return match ? match.module : 'dashboard'
}

// Welke top-sectie is actief op basis van het huidige pad. Default: thuis.
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

// Top-secties die voor de gebruiker zichtbaar zijn (filtert ook lege secties
// en lege subgroepen).
export function visibleSections(permissions: PermissionMap): NavSection[] {
  return NAV_SECTIONS.map((s) => ({
    ...s,
    items: visibleItems(s.items, permissions),
    groups: s.groups
      ?.map((g) => ({ ...g, items: visibleItems(g.items, permissions) }))
      .filter((g) => g.items.length > 0),
  })).filter((s) => s.items.length > 0)
}
