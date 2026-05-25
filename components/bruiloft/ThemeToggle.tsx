'use client'

import { Moon, Sun } from 'lucide-react'

import { Button } from '@/components/bruiloft/ui'
import { useTheme } from './ThemeProvider'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      aria-label={isDark ? 'Schakel naar licht thema' : 'Schakel naar donker thema'}
      title={isDark ? 'Licht thema' : 'Donker thema'}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  )
}
