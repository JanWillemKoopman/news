'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, X, ArrowRight, ListChecks, Users, Store, Wallet, CalendarClock } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'

export interface GlobalSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface SearchResult {
  id: string
  label: string
  category: string
  href: string
  icon: React.ElementType
}

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType; href: string }> = {
  tasks: { label: 'Taken', icon: ListChecks, href: '/bruiloft/taken' },
  guests: { label: 'Gasten', icon: Users, href: '/bruiloft/gasten' },
  vendors: { label: 'Leveranciers', icon: Store, href: '/bruiloft/leveranciers' },
  budgetItems: { label: 'Budget', icon: Wallet, href: '/bruiloft/budget' },
  scheduleItems: { label: 'Draaiboek', icon: CalendarClock, href: '/bruiloft/draaiboek' },
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const router = useRouter()
  const [query, setQuery] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)
  const overlayRef = React.useRef<HTMLDivElement>(null)

  const tasks = useBruiloftStore((s) => s.tasks)
  const guests = useBruiloftStore((s) => s.guests)
  const vendors = useBruiloftStore((s) => s.vendors)
  const budgetItems = useBruiloftStore((s) => s.budgetItems)
  const scheduleItems = useBruiloftStore((s) => s.scheduleItems)

  // Focus input when opened
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
    }
  }, [open])

  // Escape key to close
  React.useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onOpenChange])

  const results = React.useMemo<Record<string, SearchResult[]>>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return {}

    const out: Record<string, SearchResult[]> = {}
    let total = 0

    const add = (category: string, items: SearchResult[]) => {
      const remaining = 20 - total
      if (remaining <= 0) return
      const slice = items.slice(0, Math.min(5, remaining))
      if (slice.length > 0) {
        out[category] = slice
        total += slice.length
      }
    }

    const taskResults = tasks
      .filter((t) => t.titel?.toLowerCase().includes(q))
      .slice(0, 5)
      .map((t) => ({
        id: t.id,
        label: t.titel,
        category: 'tasks',
        href: '/bruiloft/taken',
        icon: ListChecks,
      }))
    add('tasks', taskResults)

    const guestResults = guests
      .filter((g) => `${g.voornaam} ${g.achternaam}`.toLowerCase().includes(q))
      .slice(0, 5)
      .map((g) => ({
        id: g.id,
        label: `${g.voornaam} ${g.achternaam}`.trim(),
        category: 'guests',
        href: '/bruiloft/gasten',
        icon: Users,
      }))
    add('guests', guestResults)

    const vendorResults = vendors
      .filter((v) => v.naam?.toLowerCase().includes(q))
      .slice(0, 5)
      .map((v) => ({
        id: v.id,
        label: v.naam,
        category: 'vendors',
        href: '/bruiloft/leveranciers',
        icon: Store,
      }))
    add('vendors', vendorResults)

    const budgetResults = budgetItems
      .filter((b) => b.omschrijving?.toLowerCase().includes(q))
      .slice(0, 5)
      .map((b) => ({
        id: b.id,
        label: b.omschrijving,
        category: 'budgetItems',
        href: '/bruiloft/budget',
        icon: Wallet,
      }))
    add('budgetItems', budgetResults)

    const scheduleResults = scheduleItems
      .filter((s) => s.titel?.toLowerCase().includes(q))
      .slice(0, 5)
      .map((s) => ({
        id: s.id,
        label: s.titel,
        category: 'scheduleItems',
        href: '/bruiloft/draaiboek',
        icon: CalendarClock,
      }))
    add('scheduleItems', scheduleResults)

    return out
  }, [query, tasks, guests, vendors, budgetItems, scheduleItems])

  const hasResults = Object.values(results).some((r) => r.length > 0)
  const trimmed = query.trim()

  const handleNavigate = () => {
    onOpenChange(false)
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/40 z-50"
        onClick={() => onOpenChange(false)}
        aria-hidden
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Globaal zoeken"
        className="fixed top-[10%] sm:top-[20%] left-1/2 -translate-x-1/2 w-full max-w-[calc(100vw-2rem)] sm:max-w-lg bg-background border border-border rounded-xl shadow-xl z-50 overflow-hidden"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoeken…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Zoekopdracht wissen"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {!trimmed && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Typ om te zoeken…
            </p>
          )}

          {trimmed && !hasResults && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Geen resultaten voor &lsquo;{trimmed}&rsquo;
            </p>
          )}

          {trimmed && hasResults && (
            <ul className="py-2">
              {Object.entries(results).map(([category, items]) => {
                const meta = CATEGORY_META[category]
                if (!meta || items.length === 0) return null
                const Icon = meta.icon
                return (
                  <li key={category}>
                    {/* Category header */}
                    <div className="flex items-center gap-2 px-4 py-1.5">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {meta.label}
                      </span>
                    </div>

                    {/* Items */}
                    <ul>
                      {items.map((item) => (
                        <li key={item.id}>
                          <Link
                            href={item.href}
                            onClick={handleNavigate}
                            className={cn(
                              'group flex items-center gap-3 px-4 py-2 text-sm transition-colors',
                              'hover:bg-accent hover:text-accent-foreground',
                              'focus-visible:outline-none focus-visible:bg-accent'
                            )}
                          >
                            <span className="flex-1 truncate">{item.label}</span>
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}

export function useGlobalSearch() {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return { open, setOpen }
}
