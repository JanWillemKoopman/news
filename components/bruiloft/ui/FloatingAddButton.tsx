'use client'

import * as React from 'react'
import { Plus, X } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface SpeedDialAction {
  label: string
  icon: React.ElementType
  onClick: () => void
}

interface FloatingAddButtonProps {
  label: string
  onClick: () => void
  visible: boolean
  actions?: SpeedDialAction[]
}

export function FloatingAddButton({ label, onClick, visible, actions }: FloatingAddButtonProps) {
  const [speedDialOpen, setSpeedDialOpen] = React.useState(false)
  const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const didLongPress = React.useRef(false)

  const startLongPress = () => {
    didLongPress.current = false
    if (!actions?.length) return
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true
      setSpeedDialOpen(true)
      if ('vibrate' in navigator) navigator.vibrate(20)
    }, 500)
  }

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handlePointerUp = () => {
    cancelLongPress()
    if (!didLongPress.current) {
      if (speedDialOpen) {
        setSpeedDialOpen(false)
      } else {
        onClick()
      }
    }
  }

  // Close speed-dial on outside click
  React.useEffect(() => {
    if (!speedDialOpen) return
    const handler = (e: PointerEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-speeddial]')) {
        setSpeedDialOpen(false)
      }
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [speedDialOpen])

  return (
    <div
      data-speeddial
      className={cn(
        'group fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 flex flex-col items-end md:bottom-6 md:right-6',
        'transition-[opacity,transform] duration-300 ease-out',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
      )}
    >
      {/* Speed-dial actions */}
      {actions && actions.length > 0 && speedDialOpen && (
        <div className="mb-3 flex flex-col items-end gap-2">
          {actions.map((action, i) => {
            const Icon = action.icon
            return (
              <div
                key={i}
                className="flex items-center gap-2"
                style={{
                  animation: `speed-dial-in 200ms ${i * 50}ms both ease-out`,
                }}
              >
                <span className="rounded-md bg-rhino-800 px-2.5 py-1.5 text-sm font-medium text-white shadow-md">
                  {action.label}
                </span>
                <button
                  type="button"
                  onClick={() => { setSpeedDialOpen(false); action.onClick() }}
                  aria-label={action.label}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-foreground shadow-md ring-1 ring-border active:scale-95"
                >
                  <Icon className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex items-center">
        {/* Label op desktop bij hover (alleen als geen speed-dial open) */}
        {!speedDialOpen && (
          <span className="pointer-events-none mr-3 hidden whitespace-nowrap rounded-md bg-rhino-800 px-2.5 py-1.5 text-sm font-medium text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 md:block">
            {label}
          </span>
        )}
        <button
          type="button"
          aria-label={speedDialOpen ? 'Sluiten' : label}
          aria-expanded={speedDialOpen || undefined}
          onPointerDown={startLongPress}
          onPointerUp={handlePointerUp}
          onPointerLeave={cancelLongPress}
          onPointerCancel={cancelLongPress}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-600/85 text-white shadow-md backdrop-blur-sm transition-[transform,background-color,opacity] duration-150 ease-out hover:bg-rose-500 hover:opacity-100 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 md:h-14 md:w-14 md:bg-rose-600 md:shadow-lg md:backdrop-blur-none md:hover:scale-105"
        >
          {speedDialOpen ? (
            <X className="h-5 w-5 md:h-6 md:w-6" />
          ) : (
            <Plus className="h-5 w-5 md:h-6 md:w-6" />
          )}
        </button>
      </div>
    </div>
  )
}
