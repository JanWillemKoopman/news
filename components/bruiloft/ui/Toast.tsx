'use client'

import * as React from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useTheme } from '@/components/bruiloft/ThemeProvider'

type ToastVariant = 'default' | 'success' | 'error'

interface ToastItem {
  id: number
  title: string
  description?: string
  variant: ToastVariant
}

interface ToastInput {
  title: string
  description?: string
  variant?: ToastVariant
}

interface ToastContextValue {
  toast: (input: ToastInput) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()
  const [items, setItems] = React.useState<ToastItem[]>([])
  const idRef = React.useRef(0)

  const remove = React.useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id))
  }, [])

  const toast = React.useCallback(
    ({ title, description, variant = 'default' }: ToastInput) => {
      const id = ++idRef.current
      setItems((list) => [...list, { id, title, description, variant }])
      window.setTimeout(() => remove(id), 3800)
    },
    [remove]
  )

  const value = React.useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className={cn(
          'wedding pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:bottom-4 sm:left-auto sm:right-4 sm:items-end',
          theme === 'dark' && 'dark'
        )}
      >
        {items.map((t) => (
          <ToastCard key={t.id} item={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const Icon =
    item.variant === 'success' ? CheckCircle2 : item.variant === 'error' ? AlertCircle : Info
  const tone =
    item.variant === 'success'
      ? 'text-emerald-600 dark:text-emerald-400'
      : item.variant === 'error'
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-primary'
  return (
    <div className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-border bg-card p-3.5 text-card-foreground shadow-lg animate-slide-up">
      <span className={cn('mt-0.5 shrink-0', tone)}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{item.title}</p>
        {item.description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Melding sluiten"
        className="-m-1 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast moet binnen ToastProvider gebruikt worden')
  return ctx
}
