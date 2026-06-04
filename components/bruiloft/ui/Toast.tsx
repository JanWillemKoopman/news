'use client'

import * as React from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

import { cn } from '@/lib/utils'

type ToastVariant = 'default' | 'success' | 'error'

interface ToastAction {
  label: string
  onClick: () => void
}

interface ToastItem {
  id: number
  title: string
  description?: string
  variant: ToastVariant
  action?: ToastAction
}

interface ToastInput {
  title: string
  description?: string
  variant?: ToastVariant
  /** Optionele actieknop, bijv. "Ongedaan maken". */
  action?: ToastAction
  /** Zichtbaarheidsduur in ms. Default 3800; gebruik langer voor undo-acties. */
  duration?: number
}

interface ToastContextValue {
  toast: (input: ToastInput) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([])
  const idRef = React.useRef(0)

  const remove = React.useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id))
  }, [])

  const toast = React.useCallback(
    ({ title, description, variant = 'default', action, duration = 3800 }: ToastInput) => {
      const id = ++idRef.current
      setItems((list) => [...list, { id, title, description, variant, action }])
      setTimeout(() => remove(id), duration)
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
        className="wedding pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 p-4 sm:bottom-4 sm:left-auto sm:right-4 sm:items-end"
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
      ? 'text-emerald-600'
      : item.variant === 'error'
        ? 'text-red-600'
        : 'text-rose-600'
  return (
    <div className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-border bg-white p-3.5 text-card-foreground shadow-lg animate-slide-up">
      <span className={cn('mt-0.5 shrink-0', tone)}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{item.title}</p>
        {item.description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
        ) : null}
        {item.action ? (
          <button
            type="button"
            onClick={() => {
              item.action?.onClick()
              onClose()
            }}
            className="mt-1.5 text-xs font-semibold text-rose-600 underline-offset-2 hover:underline"
          >
            {item.action.label}
          </button>
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
