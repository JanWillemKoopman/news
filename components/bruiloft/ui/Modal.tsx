'use client'

import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from './Button'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: ModalProps) {
  const [mobileStyle, setMobileStyle] = React.useState<React.CSSProperties>({})

  // Swipe-to-dismiss state (punt 9)
  const swipeStartY = React.useRef(0)
  const [swipeY, setSwipeY] = React.useState(0)

  React.useEffect(() => {
    if (!open) { setSwipeY(0); return }
    const vv = window.visualViewport
    if (!vv) return

    const update = () => {
      if (window.innerWidth >= 640) return
      const bottom = Math.max(0, window.innerHeight - vv.offsetTop - vv.height)
      setMobileStyle({
        bottom,
        maxHeight: `${vv.height * 0.95}px`,
      })
    }

    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      setMobileStyle({})
    }
  }, [open])

  // Touch handlers for drag handle (punt 9)
  const onHandleTouchStart = (e: React.TouchEvent) => {
    swipeStartY.current = e.touches[0].clientY
  }
  const onHandleTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - swipeStartY.current
    if (delta > 0) setSwipeY(delta)
  }
  const onHandleTouchEnd = () => {
    if (swipeY > 80) {
      setSwipeY(0)
      onOpenChange(false)
    } else {
      setSwipeY(0)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-[3px] data-[state=open]:animate-overlay-in" />
        <Dialog.Content
          style={{
            ...mobileStyle,
            transform: swipeY > 0 ? `translateY(${swipeY}px)` : undefined,
            transition: swipeY === 0 ? 'transform 200ms ease' : undefined,
          }}
          className={cn(
            'fixed z-50 flex max-h-[90dvh] flex-col overflow-hidden border border-border bg-card text-card-foreground shadow-xl focus:outline-none',
            // Mobiel: bottom-sheet. Desktop: gecentreerde dialog.
            'inset-x-0 bottom-0 rounded-t-2xl data-[state=open]:animate-sheet-in',
            'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100vw-2rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:data-[state=open]:animate-dialog-in',
            className
          )}
        >
          {/* Drag handle — touch target voor swipe-to-dismiss (punt 9) */}
          <div
            aria-hidden
            className="-my-3 mx-auto flex w-full justify-center py-3 sm:hidden"
            onTouchStart={onHandleTouchStart}
            onTouchMove={onHandleTouchMove}
            onTouchEnd={onHandleTouchEnd}
          >
            <div className="h-1.5 w-10 rounded-full bg-border" />
          </div>
          <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
            <div>
              <Dialog.Title className="text-xl text-foreground">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Sluiten">
                <X className="h-5 w-5" />
              </Button>
            </Dialog.Close>
          </div>
          <div className="overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:py-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  bevestigLabel?: string
  onConfirm: () => void
  children?: React.ReactNode
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  bevestigLabel = 'Verwijderen',
  onConfirm,
  children,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description={description}>
      {children}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Annuleren
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            onConfirm()
            onOpenChange(false)
          }}
        >
          {bevestigLabel}
        </Button>
      </div>
    </Modal>
  )
}
