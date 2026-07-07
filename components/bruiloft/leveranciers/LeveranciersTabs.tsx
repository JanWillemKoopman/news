'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Compass, Store } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'

const TABS = [
  { href: '/bruiloft/ontdekken', label: 'Ontdekken', icon: Compass },
  { href: '/bruiloft/leveranciers', label: 'Mijn lijst', icon: Store },
] as const

// Segmentschakelaar tussen de twee leveranciersweergaven. Beide routes blijven
// bestaan (deep links), maar presenteren zich als één sectie met tabs.
export function LeveranciersTabs() {
  const pathname = usePathname()
  const aantal = useBruiloftStore((s) => s.vendors.length)

  return (
    <div className="mb-6 flex rounded-lg border border-border bg-card p-1 sm:inline-flex">
      {TABS.map((tab) => {
        const actief = pathname === tab.href || pathname.startsWith(tab.href + '/')
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={actief ? 'page' : undefined}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors sm:flex-none',
              // Neutrale actieve stijl (kaart+schaduw), consistent met het
              // tab-idioom van CadeaulijstShell — rose blijft gereserveerd
              // voor "dit vraagt aandacht", niet voor "hier sta je nu".
              actief
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.href === '/bruiloft/leveranciers' && aantal > 0 ? (
              <span className="rounded-full bg-foreground/[0.08] px-1.5 text-xs tabular-nums">
                {aantal}
              </span>
            ) : null}
          </Link>
        )
      })}
    </div>
  )
}
