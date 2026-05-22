import {
  Armchair,
  CalendarClock,
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

// De vijf hoofdsecties van de bruiloftplanner.
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/bruiloft', icon: LayoutDashboard },
  { label: 'Gasten', href: '/bruiloft/gasten', icon: Users },
  { label: 'Taken', href: '/bruiloft/taken', icon: ListChecks },
  { label: 'Draaiboek', href: '/bruiloft/draaiboek', icon: CalendarClock },
  { label: 'Tafels', href: '/bruiloft/tafels', icon: Armchair },
  { label: 'Leveranciers', href: '/bruiloft/leveranciers', icon: Store },
  { label: 'Budget', href: '/bruiloft/budget', icon: Wallet },
]

export function isActive(pathname: string, href: string): boolean {
  if (href === '/bruiloft') return pathname === '/bruiloft'
  return pathname === href || pathname.startsWith(href + '/')
}
