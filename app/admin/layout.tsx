import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { Activity, BarChart2, Bug, CalendarHeart, LayoutDashboard, Store, Users } from 'lucide-react'
import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Admin · Ons Trouwplan' }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/inloggen')

  // Lees de eigen profielrij — RLS staat dit altijd toe (id = auth.uid()).
  // Geen admin-client nodig en geen afhankelijkheid van service-role key.
  const { data: profile } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.app_role !== 'platform_admin') redirect('/bruiloft')

  return (
    <div className="flex min-h-dvh bg-gray-50 text-gray-900">
      {/* Zijbalk (desktop) */}
      <aside className="hidden w-56 shrink-0 border-r border-gray-200 bg-white md:flex flex-col">
        <div className="px-5 py-5 border-b border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Admin</p>
          <p className="text-sm font-semibold text-gray-800 mt-0.5">Ons Trouwplan</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-300">Cockpit</p>
          <NavItem href="/admin" icon={<LayoutDashboard className="h-4 w-4" />} label="Overzicht" />
          <NavItem href="/admin/gebruikers" icon={<Users className="h-4 w-4" />} label="Gebruikers" />
          <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-300">Analytics</p>
          <NavItem href="/admin/bruiloften" icon={<CalendarHeart className="h-4 w-4" />} label="Bruiloften" />
          <NavItem href="/admin/gebruik" icon={<Activity className="h-4 w-4" />} label="App Gebruik" />
          <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-300">Content</p>
          <NavItem href="/admin/leveranciers" icon={<Store className="h-4 w-4" />} label="Leveranciers" />
          <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-300">Technisch</p>
          <NavItem href="/admin/bugs" icon={<Bug className="h-4 w-4" />} label="Bugs & Fouten" />
        </nav>
        <div className="px-5 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 truncate">{user.email}</p>
          <Link href="/bruiloft" className="text-xs text-blue-600 hover:underline mt-0.5 block">
            ← Terug naar app
          </Link>
        </div>
      </aside>

      {/* Mobile topbalk */}
      <div className="fixed top-0 inset-x-0 z-10 flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-3 md:hidden overflow-x-auto">
        <p className="font-semibold text-sm shrink-0">Admin</p>
        <div className="flex gap-3 ml-auto shrink-0">
          <Link href="/admin" className="text-xs text-gray-600 whitespace-nowrap">Overzicht</Link>
          <Link href="/admin/gebruikers" className="text-xs text-gray-600 whitespace-nowrap">Gebruikers</Link>
          <Link href="/admin/bruiloften" className="text-xs text-gray-600 whitespace-nowrap">Bruiloften</Link>
          <Link href="/admin/gebruik" className="text-xs text-gray-600 whitespace-nowrap">Gebruik</Link>
          <Link href="/admin/leveranciers" className="text-xs text-gray-600 whitespace-nowrap">Leveranciers</Link>
          <Link href="/admin/bugs" className="text-xs text-gray-600 whitespace-nowrap">Bugs</Link>
          <Link href="/bruiloft" className="text-xs text-blue-600 whitespace-nowrap">← App</Link>
        </div>
      </div>

      {/* Inhoud */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="mx-auto max-w-5xl px-4 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}

function NavItem({
  href,
  icon,
  label,
}: {
  href: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
    >
      {icon}
      {label}
    </Link>
  )
}
