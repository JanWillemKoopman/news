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
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm data-[state=open]:animate-overlay-in" />
        <Dialog.Content
          className={cn(
            'fixed z-50 flex max-h-[90dvh] flex-col overflow-hidden border border-border bg-card text-card-foreground shadow-xl focus:outline-none',
            // Mobiel: bottom-sheet. Desktop: gecentreerde dialog.
            'inset-x-0 bottom-0 rounded-t-2xl data-[state=open]:animate-sheet-in',
            'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100vw-2rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:data-[state=open]:animate-dialog-in',
            className
          )}
        >
          <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-border sm:hidden" aria-hidden />
          <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
            <div>
              <Dialog.Title className="font-serif text-xl text-foreground">
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
          <div className="overflow-y-auto px-6 py-5">{children}</div>
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
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  bevestigLabel = 'Verwijderen',
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description={description}>
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
