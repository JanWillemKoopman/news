'use client'

import { Lock, WifiOff, CloudOff } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import * as React from 'react'
import * as Sentry from '@sentry/nextjs'

import { canView } from '@/lib/bruiloft/permissions'
import { ScrollContainerContext } from '@/lib/bruiloft/scroll-context'
import { cn } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { Button, EmptyState, Skeleton, ToastProvider } from '@/components/bruiloft/ui'
import { AICoach } from './ai/AICoach'
import { InstallPrompt } from './InstallPrompt'
import { Landing } from './Landing'
import { PullToRefresh } from './PullToRefresh'
import { PageTracker } from '@/components/admin/PageTracker'
import { MobileNav } from './MobileNav'
import { WeddingCreate } from './WeddingCreate'
import { moduleForPath } from './nav'
import { ProfielNudge } from './ProfielNudge'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'
import { WeddingPicker } from './WeddingPicker'
import { WeddingSettingsForm } from './WeddingSettingsForm'

interface WeddingShellProps {
  children: React.ReactNode
  fontClassName?: string
}

export function WeddingShell({ children, fontClassName }: WeddingShellProps) {
  return (
    <ToastProvider>
      <PageTracker />
      <ShellInner fontClassName={fontClassName}>{children}</ShellInner>
    </ToastProvider>
  )
}

function ShellInner({ children, fontClassName }: WeddingShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  // Bewust via "Terug naar home" hier? Dan tonen we de landing i.p.v. door te
  // sturen naar stap 2. Synchroon uit de URL gelezen zodat de redirect-check
  // meteen de juiste waarde heeft (geen flits van de landing).
  const [showHomeLanding] = React.useState(
    () =>
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('home') === '1'
  )
  const hydrated = useBruiloftStore((s) => s.hydrated)
  const error = useBruiloftStore((s) => s.error)
  const wedding = useBruiloftStore((s) => s.wedding)
  const currentUser = useBruiloftStore((s) => s.currentUser)
  const permissions = useBruiloftStore((s) => s.permissions)
  const pickingWedding = useBruiloftStore((s) => s.pickingWedding)
  const creatingWedding = useBruiloftStore((s) => s.creatingWedding)
  const init = useBruiloftStore((s) => s.init)
  const retryInit = useBruiloftStore((s) => s.retryInit)
  const stopRealtime = useBruiloftStore((s) => s.stopRealtime)
  const weddingSettingsOpen = useBruiloftStore((s) => s.weddingSettingsOpen)
  const closeWeddingSettings = useBruiloftStore((s) => s.closeWeddingSettings)
  const [retrying, setRetrying] = React.useState(false)
  const [isOnline, setIsOnline] = React.useState(
    () => typeof window !== 'undefined' ? navigator.onLine : true
  )

  React.useEffect(() => {
    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  React.useEffect(() => {
    void init()
    return () => stopRealtime()
  }, [init, stopRealtime])

  // Service worker registratie (punt 21/24)
  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Registratie mislukt (bijv. zonder HTTPS) — negeer.
      })
    }
  }, [])

  // Koppel de ingelogde gebruiker aan Sentry zodat alerts tonen wie de fout tegenkwam
  React.useEffect(() => {
    if (currentUser) {
      Sentry.setUser({ id: currentUser.id, email: currentUser.email, username: currentUser.displayName })
    } else {
      Sentry.setUser(null)
    }
  }, [currentUser])

  // Ingelogd, maar nog geen trouwplan: doorsturen naar stap 2 (trouwplan
  // opstellen) op /aanmelden. Tenzij de gebruiker bewust via "Terug naar home"
  // de landing wil bekijken (dan kan hij daar uitloggen of een plan starten).
  const redirectToSetup =
    hydrated &&
    !error &&
    !pickingWedding &&
    !creatingWedding &&
    !wedding &&
    !!currentUser &&
    !showHomeLanding

  React.useEffect(() => {
    if (redirectToSetup) router.replace('/aanmelden')
  }, [redirectToSetup, router])

  const isAccountPage = pathname === '/bruiloft/account'
  const allowed = isAccountPage || canView(permissions, moduleForPath(pathname))

  const wrapperClass = cn(
    'wedding min-h-dvh bg-background text-foreground antialiased',
    fontClassName
  )

  // Eerste hydratatie: skeleton-shell die exact dezelfde structuur volgt als
  // de echte shell (donkere top-balk, lichte sub-zijbalk, content-canvas).
  // Voorkomt visuele flikkering tussen skeleton en de daadwerkelijke layout.
  if (!hydrated) {
    return (
      <div className={cn(wrapperClass, 'flex flex-col')} aria-busy="true" suppressHydrationWarning>
        <div className="h-16 w-full shrink-0 bg-rhino-800" />
        <div className="flex flex-1 overflow-hidden">
          <aside className="hidden w-64 shrink-0 flex-col border-r border-header-border bg-header-active p-4 md:flex">
            <Skeleton className="h-4 w-24" />
            <div className="mt-4 flex flex-col gap-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          </aside>
          <div className="flex-1 bg-muted px-4 py-6 md:px-8">
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
        className={cn(wrapperClass, 'flex min-h-dvh flex-col items-center justify-center px-4')}
        suppressHydrationWarning
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <WifiOff className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-center text-3xl text-foreground">Er ging iets mis</h1>
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

  // Ingelogd, meerdere bruiloften, geen opgeslagen voorkeur: toon keuzescreen.
  if (pickingWedding && currentUser) {
    return (
      <div className={wrapperClass} suppressHydrationWarning>
        <WeddingPicker />
      </div>
    )
  }

  // Ingelogd en bewust een extra trouwplan aanmaken (via accountmenu):
  // toon het compacte aanmaak-scherm.
  if (currentUser && creatingWedding) {
    return (
      <div className={cn(wrapperClass, 'flex min-h-dvh flex-col')} suppressHydrationWarning>
        <WeddingCreate existing />
      </div>
    )
  }

  // Geen actieve bruiloft. Ingelogde gebruikers zonder plan sturen we door naar
  // stap 2; tijdens dat doorsturen tonen we niets (voorkomt een flits van de
  // landing). Uitgelogde bezoekers — en wie bewust "Terug naar home" koos —
  // krijgen de marketing-landing. Die toont voor ingelogde bezoekers een
  // accountmenu rechtsboven (naar dashboard / uitloggen).
  if (!wedding) {
    if (redirectToSetup) {
      return <div className={wrapperClass} aria-busy="true" suppressHydrationWarning />
    }
    return (
      <div className={wrapperClass} suppressHydrationWarning>
        <Landing />
      </div>
    )
  }

  return (
    <ScrollContainerContext.Provider value={scrollContainerRef}>
    <div
      className={cn('wedding h-dvh flex flex-col overflow-hidden bg-background text-foreground antialiased', fontClassName)}
      suppressHydrationWarning
    >
      <a
        href="#hoofdinhoud"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-rose-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-md"
      >
        Naar inhoud
      </a>
      {/* TopNav buiten het scroll-gebied op desktop (altijd zichtbaar) */}
      <div className="hidden md:block">
        <TopNav />
      </div>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div ref={scrollContainerRef} className="min-w-0 flex-1 overflow-y-auto">
          {/* TopNav binnen het scroll-gebied op mobiel (scrollt mee met inhoud) */}
          <div className="md:hidden">
            <TopNav />
          </div>
          {/* Offline banner (punt 14) */}
          {!isOnline && (
            <div className="sticky top-0 z-30 flex items-center gap-2 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
              <CloudOff className="h-4 w-4 shrink-0" />
              <span>Je bent offline — wijzigingen worden niet opgeslagen</span>
            </div>
          )}
          <main
            id="hoofdinhoud"
            tabIndex={-1}
            className="bg-muted px-4 pb-6 pt-6 focus:outline-none md:px-8 md:pb-10"
          >
            <PullToRefresh>
              {allowed ? (
                children
              ) : (
                <EmptyState
                  icon={Lock}
                  titel="Geen toegang"
                  beschrijving="Je hebt geen rechten om dit onderdeel te bekijken. Vraag de eigenaar van de bruiloft om toegang."
                />
              )}
            </PullToRefresh>
          </main>
        </div>
      </div>
      <MobileNav />

      {/* App-brede profielgegevens-modal + nudge (overal te openen). */}
      <WeddingSettingsForm
        open={weddingSettingsOpen}
        onOpenChange={(o) => {
          if (!o) closeWeddingSettings()
        }}
        wedding={wedding}
      />
      <ProfielNudge />
      <InstallPrompt />
      {/* App-brede AI-coach: zijpaneel op desktop, bottom sheet op mobiel. */}
      <AICoach />
    </div>
    </ScrollContainerContext.Provider>
  )
}
