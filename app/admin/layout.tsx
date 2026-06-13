import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { LayoutDashboard, Users, Bug } from 'lucide-react'
import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'
import { createRawAdminClient } from '@/lib/supabase/admin'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = { title: 'Admin · Ons Trouwplan' }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createRawAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .single()

  if (profile?.app_role !== 'platform_admin') redirect('/bruiloft')

  return (
    <html lang="nl">
      <body className={`${inter.className} min-h-dvh bg-gray-50 text-gray-900 antialiased`}>
        <div className="flex min-h-dvh">
          <aside className="hidden w-56 shrink-0 border-r border-gray-200 bg-white md:flex flex-col">
            <div className="px-5 py-5 border-b border-gray-100">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Admin</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">Ons Trouwplan</p>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              <NavItem href="/admin" icon={<LayoutDashboard className="h-4 w-4" />} label="Overzicht" />
              <NavItem href="/admin/gebruikers" icon={<Users className="h-4 w-4" />} label="Gebruikers" />
              <NavItem href="/admin/bugs" icon={<Bug className="h-4 w-4" />} label="Bugs & Fouten" />
            </nav>
            <div className="px-5 py-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
              <Link href="/bruiloft" className="text-xs text-blue-600 hover:underline mt-0.5 block">
                ← Terug naar app
              </Link>
            </div>
          </aside>

          {/* Mobile header */}
          <div className="fixed top-0 inset-x-0 z-10 flex items-center gap-4 bg-white border-b border-gray-200 px-4 py-3 md:hidden">
            <p className="font-semibold text-sm">Admin</p>
            <div className="flex gap-4 ml-auto">
              <Link href="/admin" className="text-xs text-gray-600">Overzicht</Link>
              <Link href="/admin/gebruikers" className="text-xs text-gray-600">Gebruikers</Link>
              <Link href="/admin/bugs" className="text-xs text-gray-600">Bugs</Link>
            </div>
          </div>

          <main className="flex-1 overflow-auto pt-14 md:pt-0">
            <div className="mx-auto max-w-5xl px-4 py-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
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
