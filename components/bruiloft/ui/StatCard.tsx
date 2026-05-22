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

// Overzichtskaart (o.a. op het dashboard). Klikt door naar een module als
// er een href is meegegeven.
export function StatCard({ icon: Icon, label, href, children, className }: StatCardProps) {
  const inner = (
    <div
      className={cn(
        'group flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-all',
        href && 'hover:-translate-y-0.5 hover:shadow-md',
        className
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        {href ? (
          <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
        ) : null}
      </div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  )

  return href ? (
    <Link href={href} className="block h-full">
      {inner}
    </Link>
  ) : (
    inner
  )
}
