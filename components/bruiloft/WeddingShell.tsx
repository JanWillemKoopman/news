'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { ToastProvider } from '@/components/bruiloft/ui'
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

  // Voor de eerste hydratatie: rustige laadstaat (voorkomt flits van inhoud).
  if (!hydrated) {
    return (
      <div className={cn(wrapperClass, 'flex items-center justify-center')}>
        <p className="animate-pulse text-muted-foreground">Even laden…</p>
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
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur md:px-8">
          <span className="font-serif text-lg text-foreground md:hidden">Ons Trouwplan</span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10">{children}</main>
        <MobileNav />
      </div>
    </div>
  )
}
