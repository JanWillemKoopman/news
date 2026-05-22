'use client'

import * as React from 'react'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'bruiloft-thema'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

// useLayoutEffect op de client (geen flits), useEffect op de server (geen warning).
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Standaard light; de werkelijke voorkeur wordt vóór de eerste paint gezet.
  const [theme, setThemeState] = React.useState<Theme>('light')

  useIsomorphicLayoutEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null
      if (stored === 'dark' || stored === 'light') setThemeState(stored)
    } catch {
      // localStorage niet beschikbaar; blijf op light.
    }
  }, [])

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // negeren
    }
  }, [])

  const toggleTheme = React.useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  const value = React.useMemo(
    () => ({ theme, toggleTheme, setTheme }),
    [theme, toggleTheme, setTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme moet binnen ThemeProvider gebruikt worden')
  return ctx
}
