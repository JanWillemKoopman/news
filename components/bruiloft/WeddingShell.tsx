'use client'

import { Lock, Sparkles, WifiOff, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import * as React from 'react'

import { canView } from '@/lib/bruiloft/permissions'
import { cn } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { Button, EmptyState, Skeleton, ToastProvider } from '@/components/bruiloft/ui'
import { ClaimAccountModal } from './ClaimAccountModal'
import { Landing } from './Landing'
import { MobileNav } from './MobileNav'
import { moduleForPath } from './nav'
import { Sidebar } from './Sidebar'
import { ThemeProvider, useTheme } from './ThemeProvider'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'

interface WeddingShellProps {
  children: React.ReactNode
  fontClassName?: string
}

export function WeddingShell({ children, fontClassName }: WeddingShellProps) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ShellInner fontClassName={fontClassName}>{children}</ShellInner>
      </ToastProvider>
    </ThemeProvider>
  )
}

function ShellInner({ children, fontClassName }: WeddingShellProps) {
  const { theme } = useTheme()
  const pathname = usePathname()
  const hydrated = useBruiloftStore((s) => s.hydrated)
  const error = useBruiloftStore((s) => s.error)
  const wedding = useBruiloftStore((s) => s.wedding)
  const permissions = useBruiloftStore((s) => s.permissions)
  const isAnonymous = useBruiloftStore((s) => s.isAnonymous)
  const claimRequested = useBruiloftStore((s) => s.claimRequested)
  const init = useBruiloftStore((s) => s.init)
  const retryInit = useBruiloftStore((s) => s.retryInit)
  const [retrying, setRetrying] = React.useState(false)
  const [claimOpen, setClaimOpen] = React.useState(false)
  const [bannerHidden, setBannerHidden] = React.useState(false)

  React.useEffect(() => {
    void init()
  }, [init])

  const allowed = canView(permissions, moduleForPath(pathname))

  const wrapperClass = cn(
    'wedding min-h-screen bg-background text-foreground antialiased',
    theme === 'dark' && 'dark',
    fontClassName
  )

  // Voor de eerste hydratatie: skeleton-shell (voorkomt flits van inhoud).
  if (!hydrated) {
    return (
      <div className={cn(wrapperClass, 'flex')} aria-busy="true" suppressHydrationWarning>
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/40 p-4 md:flex">
          <Skeleton className="h-9 w-40" />
          <div className="mt-8 flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        </aside>
        <div className="flex-1 px-4 py-6 md:px-8">
          <Skeleton className="h-8 w-48" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="mt-6 h-64 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  // Laden mislukt: toon een nette foutmelding met de mogelijkheid het opnieuw te
  // proberen, in plaats van eindeloos het skelet te tonen.
  if (error) {
    return (
      <div className={cn(wrapperClass, 'flex min-h-screen flex-col items-center justify-center px-4')} suppressHydrationWarning>
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <WifiOff className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-center font-serif text-2xl text-foreground">Er ging iets mis</h1>
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

  const showGuestBanner = isAnonymous && !claimRequested && !bannerHidden

  return (
    <div className={cn(wrapperClass, 'flex')} suppressHydrationWarning>
      <a
        href="#hoofdinhoud"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-md"
      >
        Naar inhoud
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {showGuestBanner ? (
          <div className="flex items-center justify-between gap-3 border-b border-primary/20 bg-primary/10 px-4 py-2.5 text-sm md:px-8">
            <span className="flex items-center gap-2 text-foreground">
              <Sparkles className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">
                Jullie plan staat alleen op dit apparaat — sla het op om het overal te kunnen openen.
              </span>
            </span>
            <div className="flex shrink-0 items-center gap-1">
              <Button size="sm" onClick={() => setClaimOpen(true)}>
                Account opslaan
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Verbergen"
                onClick={() => setBannerHidden(true)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur md:px-8">
          <span className="font-serif text-lg text-foreground md:hidden">Ons Trouwplan</span>
          <div className="ml-auto flex items-center gap-1">
            {isAnonymous && !claimRequested && bannerHidden ? (
              <Button size="sm" onClick={() => setClaimOpen(true)} className="mr-1">
                Account opslaan
              </Button>
            ) : null}
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <main
          id="hoofdinhoud"
          tabIndex={-1}
          className="flex-1 px-4 pb-24 pt-6 focus:outline-none md:px-8 md:pb-10"
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
        <MobileNav />
      </div>
      <ClaimAccountModal open={claimOpen} onOpenChange={setClaimOpen} />
    </div>
  )
}
