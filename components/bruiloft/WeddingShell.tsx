'use client'

import { Lock, WifiOff } from 'lucide-react'
import { usePathname } from 'next/navigation'
import * as React from 'react'

import { canView } from '@/lib/bruiloft/permissions'
import { cn } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { Button, EmptyState, Skeleton, ToastProvider } from '@/components/bruiloft/ui'
import { Landing } from './Landing'
import { MobileNav } from './MobileNav'
import { moduleForPath } from './nav'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'

interface WeddingShellProps {
  children: React.ReactNode
  fontClassName?: string
}

export function WeddingShell({ children, fontClassName }: WeddingShellProps) {
  return (
    <ToastProvider>
      <ShellInner fontClassName={fontClassName}>{children}</ShellInner>
    </ToastProvider>
  )
}

function ShellInner({ children, fontClassName }: WeddingShellProps) {
  const pathname = usePathname()
  const hydrated = useBruiloftStore((s) => s.hydrated)
  const error = useBruiloftStore((s) => s.error)
  const wedding = useBruiloftStore((s) => s.wedding)
  const permissions = useBruiloftStore((s) => s.permissions)
  const init = useBruiloftStore((s) => s.init)
  const retryInit = useBruiloftStore((s) => s.retryInit)
  const [retrying, setRetrying] = React.useState(false)

  React.useEffect(() => {
    void init()
  }, [init])

  const allowed = canView(permissions, moduleForPath(pathname))

  const wrapperClass = cn(
    'wedding min-h-screen bg-white text-foreground antialiased',
    fontClassName
  )

  // Eerste hydratatie: skeleton-shell die exact dezelfde structuur volgt als
  // de echte shell (donkere top-balk, lichte sub-zijbalk, content-canvas).
  // Voorkomt visuele flikkering tussen skeleton en de daadwerkelijke layout.
  if (!hydrated) {
    return (
      <div className={wrapperClass} aria-busy="true" suppressHydrationWarning>
        <div className="h-16 w-full bg-rhino-800" />
        <div className="flex min-h-[calc(100vh-4rem)]">
          <aside className="hidden w-64 shrink-0 flex-col border-r border-[#2a3250] bg-[#365473] p-4 md:flex">
            <Skeleton className="h-4 w-24" />
            <div className="mt-4 flex flex-col gap-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          </aside>
          <div className="flex-1 bg-[#f3f4f6] px-4 py-6 md:px-8">
            <Skeleton className="h-8 w-48" />
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-lg" />
              ))}
            </div>
            <Skeleton className="mt-6 h-64 w-full rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  // Laden mislukt: toon een nette foutmelding met retry.
  if (error) {
    return (
      <div
        className={cn(wrapperClass, 'flex min-h-screen flex-col items-center justify-center px-4')}
        suppressHydrationWarning
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <WifiOff className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-center font-serif text-3xl text-foreground">Er ging iets mis</h1>
        <p className="mt-2 max-w-sm text-center text-muted-foreground">{error}</p>
        <Button
          className="mt-6"
          loading={retrying}
          onClick={async () => {
            setRetrying(true)
            try {
              await retryInit()
            } finally {
              setRetrying(false)
            }
          }}
        >
          Opnieuw proberen
        </Button>
      </div>
    )
  }

  // Nog geen bruiloft ingesteld: landing + onboarding-wizard, zonder app-shell.
  if (!wedding) {
    return (
      <div className={wrapperClass} suppressHydrationWarning>
        <Landing />
      </div>
    )
  }

  return (
    <div className={wrapperClass} suppressHydrationWarning>
      <a
        href="#hoofdinhoud"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-rose-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-md"
      >
        Naar inhoud
      </a>
      <TopNav />
      <div className="flex min-h-[calc(100vh-4rem)]">
        <Sidebar />
        <main
          id="hoofdinhoud"
          tabIndex={-1}
          className="flex-1 bg-[#f3f4f6] px-4 pb-24 pt-6 focus:outline-none md:px-8 md:pb-10"
        >
          {allowed ? (
            children
          ) : (
            <EmptyState
              icon={Lock}
              titel="Geen toegang"
              beschrijving="Je hebt geen rechten om dit onderdeel te bekijken. Vraag de eigenaar van de bruiloft om toegang."
            />
          )}
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
