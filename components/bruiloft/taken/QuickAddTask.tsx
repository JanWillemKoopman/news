'use client'

import { Plus } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { ISODate } from '@/lib/bruiloft/types'

interface QuickAddTaskProps {
  defaultDeadline: ISODate
  onOpenForm: (deadline: ISODate) => void
  className?: string
}

export function QuickAddTask({ defaultDeadline, onOpenForm, className }: QuickAddTaskProps) {
  return (
    // Alleen op apparaten mét hover (muis/trackpad) pas zichtbaar bij hover
    // over de maandgroep of bij toetsenbordfocus — tien keer dezelfde regel op
    // één scherm is ruis. Op touch bestaat hover niet, dus daar blijft hij staan.
    <button
      type="button"
      onClick={() => onOpenForm(defaultDeadline)}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-opacity hover:bg-accent/40 hover:text-foreground',
        '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:focus-visible:opacity-100 [@media(hover:hover)]:group-hover/maand:opacity-100',
        className
      )}
    >
      <Plus className="h-4 w-4 shrink-0" />
      Taak toevoegen
    </button>
  )
}
