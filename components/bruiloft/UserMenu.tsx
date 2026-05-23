'use client'

import { ChevronDown, LogOut, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import { ROLE_LABELS } from '@/lib/bruiloft/permissions'
import { cn } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'

// Accountmenu in de header: naam, rol, beheer-link (owner) en uitloggen.
export function UserMenu() {
  const router = useRouter()
  const currentUser = useBruiloftStore((s) => s.currentUser)
  const role = useBruiloftStore((s) => s.role)
  const signOut = useBruiloftStore((s) => s.signOut)
  const [open, setOpen] = React.useState(false)

  if (!currentUser) return null

  const initials = (currentUser.displayName || currentUser.email || '?')
    .slice(0, 1)
    .toUpperCase()

  async function onSignOut() {
    setOpen(false)
    await signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
          {initials}
        </span>
        <span className="hidden max-w-[12ch] truncate font-medium text-foreground sm:inline">
          {currentUser.displayName || currentUser.email}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" aria-hidden onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 z-50 mt-2 w-60 rounded-xl border border-border bg-card p-1.5 shadow-lg"
          >
            <div className="px-2.5 py-2">
              <p className="truncate text-sm font-medium text-foreground">
                {currentUser.displayName || 'Account'}
              </p>
              <p className="truncate text-xs text-muted-foreground">{currentUser.email}</p>
              {role ? (
                <span className="mt-1.5 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  {ROLE_LABELS[role]}
                </span>
              ) : null}
            </div>

            <div className="my-1 h-px bg-border" />

            {role === 'owner' ? (
              <Link
                href="/bruiloft/beheer/leden"
                role="menuitem"
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-accent'
                )}
              >
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                Leden &amp; rechten
              </Link>
            ) : null}

            <button
              type="button"
              role="menuitem"
              onClick={onSignOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-accent"
            >
              <LogOut className="h-4 w-4 text-muted-foreground" />
              Uitloggen
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
