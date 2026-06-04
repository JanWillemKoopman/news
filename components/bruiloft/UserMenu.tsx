'use client'

import { Activity, Check, ChevronDown, Heart, LogOut, Settings2, ShieldCheck, UserCog } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import { ROLE_LABELS } from '@/lib/bruiloft/permissions'
import { cn } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'

interface UserMenuProps {
  variant?: 'light' | 'dark'
  compact?: boolean
}

// Accountmenu in de header — twee varianten: 'light' (op een lichte balk) en
// 'dark' (op de donkere navy-balk uit Riley & Grey-stijl). Het dropdown-panel
// blijft in beide varianten een licht popover.
export function UserMenu({ variant = 'light', compact = false }: UserMenuProps) {
  const router = useRouter()
  const currentUser = useBruiloftStore((s) => s.currentUser)
  const role = useBruiloftStore((s) => s.role)
  const weddings = useBruiloftStore((s) => s.weddings)
  const activeWeddingId = useBruiloftStore((s) => s.activeWeddingId)
  const switchWedding = useBruiloftStore((s) => s.switchWedding)
  const openWeddingSettings = useBruiloftStore((s) => s.openWeddingSettings)
  const signOut = useBruiloftStore((s) => s.signOut)
  const [open, setOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const el = menuRef.current
    if (!el) return

    const focusable = () =>
      Array.from(
        el.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]')
      )

    // Focus eerste item zodra het menu opent.
    focusable()[0]?.focus()

    function onKeyDown(e: KeyboardEvent) {
      const items = focusable()
      const idx = items.indexOf(document.activeElement as HTMLElement)
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        items[(idx + 1) % items.length]?.focus()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        items[(idx - 1 + items.length) % items.length]?.focus()
      } else if (e.key === 'Tab') {
        // Houd focus binnen het menu.
        e.preventDefault()
        const next = e.shiftKey
          ? items[(idx - 1 + items.length) % items.length]
          : items[(idx + 1) % items.length]
        next?.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  if (!currentUser) return null

  const displayLabel = currentUser.displayName || currentUser.email || 'Account'
  const initials = (currentUser.displayName || currentUser.email || '?').slice(0, 1).toUpperCase()
  const dark = variant === 'dark'
  const [avatarError, setAvatarError] = React.useState(false)

  async function onSignOut() {
    setOpen(false)
    await signOut()
    router.push('/login')
    router.refresh()
  }

  async function onSwitch(id: string) {
    setOpen(false)
    await switchWedding(id)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Accountmenu openen"
        className={cn(
          'flex items-center gap-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          dark
            ? 'px-1.5 py-1 text-white hover:bg-rhino-700 focus-visible:ring-white/60 focus-visible:ring-offset-rhino-800'
            : 'px-2 py-1.5 text-sm hover:bg-accent focus-visible:ring-ring focus-visible:ring-offset-background'
        )}
      >
        {currentUser.avatarUrl && !avatarError ? (
          <Image
            src={currentUser.avatarUrl}
            alt={displayLabel}
            width={32}
            height={32}
            onError={() => setAvatarError(true)}
            className={cn(
              'h-8 w-8 rounded-full object-cover ring-2',
              dark ? 'ring-rhino-700' : 'ring-transparent'
            )}
          />
        ) : (
          <span
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ring-2',
              dark ? 'bg-white text-rhino-800 ring-rhino-700' : 'bg-rose-600 text-white ring-transparent'
            )}
          >
            {initials}
          </span>
        )}
        <ChevronDown
          className={cn('h-4 w-4', dark ? 'text-rhino-200' : 'text-muted-foreground')}
          aria-hidden
        />
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" aria-hidden onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
            role="menu"
            aria-label="Accountmenu"
            className="absolute right-0 z-50 mt-2 w-64 rounded-lg border border-border bg-white p-1.5 shadow-lg"
          >
            <div className="px-2.5 py-2">
              <p className="truncate text-sm font-medium text-foreground">{displayLabel}</p>
              {currentUser.email ? (
                <p className="truncate text-xs text-muted-foreground">{currentUser.email}</p>
              ) : null}
              {role ? (
                <span className="mt-1.5 inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                  {ROLE_LABELS[role]}
                </span>
              ) : null}
            </div>

            {weddings.length > 1 ? (
              <>
                <div className="my-1 h-px bg-border" />
                <p className="px-2.5 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Wissel van bruiloft
                </p>
                {weddings.map((w) => {
                  const active = w.id === activeWeddingId
                  return (
                    <button
                      key={w.id}
                      type="button"
                      role="menuitem"
                      onClick={() => onSwitch(w.id)}
                      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-gray-50"
                    >
                      <Heart className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">
                        {w.partner1Naam} &amp; {w.partner2Naam}
                      </span>
                      {active ? <Check className="h-4 w-4 shrink-0 text-rose-600" /> : null}
                    </button>
                  )
                })}
              </>
            ) : null}

            <div className="my-1 h-px bg-border" />

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                openWeddingSettings()
              }}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-gray-50"
            >
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              Bruiloft-gegevens
            </button>

            {role === 'owner' ? (
              <Link
                href="/bruiloft/beheer/leden"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-gray-50"
              >
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                Leden &amp; rechten
              </Link>
            ) : null}

            <Link
              href="/bruiloft/activiteit"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-gray-50"
            >
              <Activity className="h-4 w-4 text-muted-foreground" />
              Recente activiteit
            </Link>

            <Link
              href="/bruiloft/account"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-gray-50"
            >
              <UserCog className="h-4 w-4 text-muted-foreground" />
              Account
            </Link>

            <button
              type="button"
              role="menuitem"
              onClick={onSignOut}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-gray-50"
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
