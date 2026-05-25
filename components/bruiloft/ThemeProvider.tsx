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

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

// Houd de document-achtergrond (en browserbalk) gelijk aan het thema, zodat er
// geen wit lek ontstaat bij overscroll of in donkere modus.
function syncDocumentTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  const color = theme === 'dark' ? '#201f1e' : '#F0EEE6'
  document.documentElement.style.backgroundColor = color
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Lees de voorkeur al bij de eerste render (client), zodat er geen flits van
  // het lichte thema is voor wie donker heeft gekozen.
  const [theme, setThemeState] = React.useState<Theme>(readStoredTheme)

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next)
    syncDocumentTheme(next)
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
