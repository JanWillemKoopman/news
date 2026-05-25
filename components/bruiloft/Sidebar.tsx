'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Heart } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { isActive, visibleGroups } from './nav'

// Vaste zijbalk op desktop. Logische groepen; de actieve sectie krijgt een
// subtiele tint + accent-tekst en een linker-indicator (i.p.v. volle vulling).
// Items worden gefilterd op de rechten van de ingelogde gebruiker.
export function Sidebar() {
  const pathname = usePathname()
  const permissions = useBruiloftStore((s) => s.permissions)
  const groups = visibleGroups(permissions)
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/40 px-3 py-6 md:flex">
      <Link
        href="/bruiloft"
        className="mb-8 flex items-center gap-2.5 rounded-lg px-3 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
          <Heart className="h-5 w-5" />
        </span>
        <span className="font-serif text-lg text-foreground">Ons Trouwplan</span>
      </Link>

      <nav className="flex flex-col gap-6">
        {groups.map((group, i) => (
          <div key={group.label ?? `groep-${i}`} className="flex flex-col gap-1">
            {group.label ? (
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.label}
              </p>
            ) : null}
            {group.items.map((item) => {
              const active = isActive(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    active
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  {active ? (
                    <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" aria-hidden />
                  ) : null}
                  <item.icon className="h-[18px] w-[18px]" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}
