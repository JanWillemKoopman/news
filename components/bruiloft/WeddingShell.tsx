'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { Skeleton, ToastProvider } from '@/components/bruiloft/ui'
import { MobileNav } from './MobileNav'
import { Sidebar } from './Sidebar'
import { ThemeProvider, useTheme } from './ThemeProvider'
import { ThemeToggle } from './ThemeToggle'
import { WelcomeScreen } from './WelcomeScreen'

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
  const hydrated = useBruiloftStore((s) => s.hydrated)
  const wedding = useBruiloftStore((s) => s.wedding)
  const init = useBruiloftStore((s) => s.init)

  React.useEffect(() => {
    void init()
  }, [init])

  const wrapperClass = cn(
    'wedding min-h-screen bg-background text-foreground antialiased',
    theme === 'dark' && 'dark',
    fontClassName
  )

  // Voor de eerste hydratatie: skeleton-shell (voorkomt flits van inhoud).
  if (!hydrated) {
    return (
      <div className={cn(wrapperClass, 'flex')} aria-busy="true">
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

  // Nog geen bruiloft ingesteld: welkomstscherm zonder navigatie.
  if (!wedding) {
    return (
      <div className={wrapperClass}>
        <div className="flex justify-end p-4">
          <ThemeToggle />
        </div>
        <WelcomeScreen />
      </div>
    )
  }

  return (
    <div className={cn(wrapperClass, 'flex')}>
      <a
        href="#hoofdinhoud"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-md"
      >
        Naar inhoud
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur md:px-8">
          <span className="font-serif text-lg text-foreground md:hidden">Ons Trouwplan</span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <main
          id="hoofdinhoud"
          tabIndex={-1}
          className="flex-1 px-4 pb-24 pt-6 focus:outline-none md:px-8 md:pb-10"
        >
          {children}
        </main>
        <MobileNav />
      </div>
    </div>
  )
}
