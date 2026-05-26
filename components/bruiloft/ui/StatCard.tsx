import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ArrowUpRight } from 'lucide-react'

import { cn } from '@/lib/utils'

interface StatCardProps {
  icon: LucideIcon
  label: string
  href?: string
  children: React.ReactNode
  className?: string
}

// Overzichtskaart op het dashboard. Witte kaart met dusty-rose icoonpil en
// (optioneel) een doorklik-pijl rechtsboven — Riley & Grey-stijl.
export function StatCard({ icon: Icon, label, href, children, className }: StatCardProps) {
  const inner = (
    <div
      className={cn(
        'group flex h-full flex-col rounded-lg border border-border bg-white p-6 shadow-sm transition-[box-shadow,border-color] duration-150 ease-out',
        href && 'hover:border-rose-300 hover:shadow-md',
        className
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <Icon className="h-5 w-5" />
        </div>
        {href ? (
          <ArrowUpRight className="h-5 w-5 text-gray-300 transition-colors group-hover:text-rose-600" />
        ) : null}
      </div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  )

  return href ? (
    <Link
      href={href}
      className="block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {inner}
    </Link>
  ) : (
    inner
  )
}
